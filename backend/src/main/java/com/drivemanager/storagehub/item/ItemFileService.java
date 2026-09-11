package com.drivemanager.storagehub.item;

import com.drivemanager.storagehub.auth.AuthService;
import com.drivemanager.storagehub.storage.StorageProvider;
import com.drivemanager.storagehub.storage.connection.StorageConnection;
import com.drivemanager.storagehub.storage.connection.StorageConnectionRepository;
import com.drivemanager.storagehub.storage.connection.StorageOAuthService;
import com.drivemanager.storagehub.user.ApplicationUser;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import java.io.InputStream;
import java.util.UUID;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@Service
public class ItemFileService {

    public static final long MAX_FILE_SIZE = 5L * 1024 * 1024 * 1024L; // 5 GB
    private static final Pattern RANGE_PATTERN = Pattern.compile("^bytes=(\\d+)-(\\d*)$");

    private final ItemRepository items;
    private final FileContentRepository fileContents;
    private final StorageConnectionRepository connections;
    private final StorageOAuthService oauthService;
    private final AuthService auth;
    private final ObjectProvider<StorageProvider> storageProvider;
    private final ApplicationUserRepository users;
    private final com.drivemanager.storagehub.sharing.SharingService sharingService;
    private final Semaphore uploadSemaphore = new Semaphore(5);

    public ItemFileService(ItemRepository items,
                           FileContentRepository fileContents,
                           StorageConnectionRepository connections,
                           StorageOAuthService oauthService,
                           AuthService auth,
                           ObjectProvider<StorageProvider> storageProvider,
                           ApplicationUserRepository users,
                           com.drivemanager.storagehub.sharing.SharingService sharingService) {
        this.items = items;
        this.fileContents = fileContents;
        this.connections = connections;
        this.oauthService = oauthService;
        this.auth = auth;
        this.storageProvider = storageProvider;
        this.users = users;
        this.sharingService = sharingService;
    }

    @Transactional
    public ItemDtos.ItemResponse upload(String principal, UUID connectionId, MultipartFile file,
                                        String customName, String description) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Upload file must not be empty");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds 5GB limit");
        }
        UUID userId = auth.currentUser(principal).id();
        StorageConnection connection = connections.findByIdAndOwnerId(connectionId, userId)
                .orElseThrow(ItemNotFoundException::new);
        if (!"CONNECTED".equals(connection.getStatus())) {
            throw new IllegalStateException("Storage connection is not connected");
        }

        boolean acquired;
        try {
            acquired = uploadSemaphore.tryAcquire(10, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new UploadCapacityExceededException();
        }
        if (!acquired) {
            throw new UploadCapacityExceededException();
        }

        try {
            String token = oauthService.getFreshAccessToken(principal, connectionId);
            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "untitled";
            String itemName = (customName != null && !customName.strip().isEmpty()) ? customName.strip() : originalFilename;
            String mimeType = file.getContentType() != null && !file.getContentType().isBlank()
                    ? file.getContentType()
                    : "application/octet-stream";

            Item.Type itemType = determineType(mimeType);
            StorageProvider.FileUploadResult result;
            try (InputStream in = file.getInputStream()) {
                result = provider().uploadStream(token, itemName, mimeType, in, file.getSize());
            } catch (Exception ex) {
                throw new IllegalStateException("Failed to stream upload to storage: " + ex.getMessage(), ex);
            }

            Item item = Item.file(userId, itemName, description, itemType, connectionId,
                    result.driveFileId(), originalFilename, mimeType, result.sizeBytes(), result.md5Checksum());
            items.save(item);
            return ItemService.response(item);
        } finally {
            uploadSemaphore.release();
        }
    }

    @Transactional
    public ItemDtos.ItemResponse importExisting(String principal, ItemDtos.ImportFileRequest request) {
        UUID userId = auth.currentUser(principal).id();
        StorageConnection connection = connections.findByIdAndOwnerId(request.connectionId(), userId)
                .orElseThrow(ItemNotFoundException::new);
        if (!"CONNECTED".equals(connection.getStatus())) {
            throw new IllegalStateException("Storage connection is not connected");
        }

        String token = oauthService.getFreshAccessToken(principal, request.connectionId());
        StorageProvider.FileMetadata meta = provider().getFileMetadata(token, request.driveFileId());

        String itemName = (request.name() != null && !request.name().strip().isEmpty())
                ? request.name().strip()
                : (meta.filename() != null ? meta.filename() : "Imported file");
        String mimeType = meta.mimeType() != null ? meta.mimeType() : "application/octet-stream";
        Item.Type itemType = determineType(mimeType);

        Item item = Item.file(userId, itemName, request.description(), itemType, request.connectionId(),
                meta.driveFileId(), meta.filename() != null ? meta.filename() : itemName,
                mimeType, meta.sizeBytes(), meta.md5Checksum());
        items.save(item);
        return ItemService.response(item);
    }

    @Transactional(readOnly = true)
    public ResponseEntity<StreamingResponseBody> download(String principal, UUID itemId, String rangeHeader) {
        UUID userId = auth.currentUser(principal).id();
        Item item = items.findByIdAndDeletedAtIsNull(itemId).orElseThrow(ItemNotFoundException::new);
        FileContent fc = item.getFile();
        if (fc == null) {
            throw new ItemNotFoundException();
        }

        // Authorization check: owner or will be checked via sharing in BE-008
        if (!item.getOwnerId().equals(userId) && !hasSharedViewAccess(item, userId)) {
            throw new ItemNotFoundException();
        }

        StorageConnection connection = connections.findById(fc.getStorageConnectionId())
                .orElseThrow(ItemNotFoundException::new);
        ApplicationUser owner = users.findById(item.getOwnerId())
                .orElseThrow(ItemNotFoundException::new);
        String token = oauthService.getFreshAccessToken(owner.getNormalizedEmail(), connection.getId());

        long totalSize = fc.getSizeBytes();
        Long start = null;
        Long end = null;
        boolean isRange = false;

        if (rangeHeader != null && rangeHeader.startsWith("bytes=") && totalSize > 0) {
            Matcher m = RANGE_PATTERN.matcher(rangeHeader.trim());
            if (!m.matches()) {
                return invalidRange(totalSize);
            }
            try {
                start = Long.parseLong(m.group(1));
                String endStr = m.group(2);
                if (endStr != null && !endStr.isBlank()) {
                    end = Long.parseLong(endStr);
                } else {
                    end = totalSize - 1;
                }
                if (start > end || start >= totalSize) {
                    return invalidRange(totalSize);
                }
                if (end >= totalSize) {
                    end = totalSize - 1;
                }
                isRange = true;
            } catch (NumberFormatException ex) {
                return invalidRange(totalSize);
            }
        }

        final Long reqStart = start;
        final Long reqEnd = end;
        final long contentLength = isRange ? (end - start + 1) : totalSize;

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.ACCEPT_RANGES, "bytes");
        headers.setContentType(MediaType.parseMediaType(fc.getMimeType()));
        headers.setContentLength(contentLength);
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fc.getOriginalFilename().replace("\"", "\\\"") + "\"");

        if (isRange) {
            headers.set(HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + totalSize);
        }

        HttpStatus status = isRange ? HttpStatus.PARTIAL_CONTENT : HttpStatus.OK;
        StreamingResponseBody body = outputStream -> {
            try (InputStream in = provider().downloadStream(token, fc.getStorageFileId(), reqStart, reqEnd)) {
                in.transferTo(outputStream);
            }
        };

        return new ResponseEntity<>(body, headers, status);
    }

    private boolean hasSharedViewAccess(Item item, UUID userId) {
        return sharingService.hasViewAccess(item.getId(), userId);
    }

    private static ResponseEntity<StreamingResponseBody> invalidRange(long totalSize) {
        return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                .header(HttpHeaders.CONTENT_RANGE, "bytes */" + totalSize).build();
    }

    private StorageProvider provider() {
        StorageProvider p = storageProvider.getIfAvailable();
        if (p == null) {
            throw new IllegalStateException("Storage provider is not available");
        }
        return p;
    }

    private static Item.Type determineType(String mimeType) {
        if (mimeType == null) return Item.Type.FILE;
        if (mimeType.startsWith("image/")) return Item.Type.IMAGE;
        if (mimeType.startsWith("video/")) return Item.Type.VIDEO;
        if (mimeType.startsWith("audio/")) return Item.Type.AUDIO;
        if (mimeType.equals("application/pdf") || mimeType.equals("application/msword")
                || mimeType.contains("officedocument") || mimeType.contains("ms-excel") || mimeType.contains("ms-powerpoint")) return Item.Type.DOCUMENT;
        if (mimeType.equals("application/zip") || mimeType.equals("application/x-7z-compressed")
                || mimeType.equals("application/x-rar-compressed") || mimeType.equals("application/gzip")) return Item.Type.ARCHIVE;
        return Item.Type.FILE;
    }
}
