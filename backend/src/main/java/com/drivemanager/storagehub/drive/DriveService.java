package com.drivemanager.storagehub.drive;

import com.drivemanager.storagehub.storage.connection.StorageConnection;
import com.drivemanager.storagehub.storage.connection.StorageConnectionRepository;
import com.drivemanager.storagehub.storage.connection.StorageOAuthService;
import com.drivemanager.storagehub.user.ApplicationUser;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import java.io.InputStream;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DriveService {

    private static final Logger log = LoggerFactory.getLogger(DriveService.class);
    private static final Pattern RANGE_PATTERN = Pattern.compile("^bytes=(\\d+)-(\\d*)$");
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024 * 1024L; // 5 GB

    private final GoogleDriveClient driveClient;
    private final StorageOAuthService oauthService;
    private final StorageConnectionRepository connections;
    private final ApplicationUserRepository users;

    public DriveService(GoogleDriveClient driveClient,
                        StorageOAuthService oauthService,
                        StorageConnectionRepository connections,
                        ApplicationUserRepository users) {
        this.driveClient = driveClient;
        this.oauthService = oauthService;
        this.connections = connections;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public DriveDtos.DriveFileListResponse listFiles(String principal, UUID connectionId, String parentId, String pageToken, int pageSize) {
        String token = getAccessToken(principal, connectionId);
        return driveClient.listFiles(token, parentId, pageToken, pageSize);
    }

    @Transactional(readOnly = true)
    public DriveDtos.DriveFileListResponse searchFiles(String principal, UUID connectionId, String query, String parentId, String pageToken, int pageSize) {
        String token = getAccessToken(principal, connectionId);
        return driveClient.searchFiles(token, query, parentId, pageToken, pageSize);
    }

    @Transactional(readOnly = true)
    public DriveDtos.DriveFileDto getFile(String principal, UUID connectionId, String fileId) {
        String token = getAccessToken(principal, connectionId);
        return driveClient.getFile(token, fileId);
    }

    @Transactional(readOnly = true)
    public DriveDtos.DownloadResult downloadFile(String principal, UUID connectionId, String fileId, String rangeHeader, String exportFormat) {
        String token = getAccessToken(principal, connectionId);
        DriveDtos.DriveFileDto meta = driveClient.getFile(token, fileId);
        String mimeType = meta.mimeType() != null ? meta.mimeType() : "application/octet-stream";

        // Handle Google Workspace documents export
        if (mimeType.startsWith("application/vnd.google-apps.")) {
            return resolveGoogleDocExport(token, meta, exportFormat);
        }

        // Regular binary download with Range header support
        long totalSize = meta.size() != null ? meta.size() : 0L;
        Long start = null;
        Long end = null;
        boolean isPartial = false;

        if (rangeHeader != null && rangeHeader.startsWith("bytes=") && totalSize > 0) {
            Matcher m = RANGE_PATTERN.matcher(rangeHeader.trim());
            if (m.matches()) {
                try {
                    start = Long.parseLong(m.group(1));
                    String endStr = m.group(2);
                    if (endStr != null && !endStr.isBlank()) {
                        end = Long.parseLong(endStr);
                    } else {
                        end = totalSize - 1;
                    }
                    if (start <= end && start < totalSize) {
                        if (end >= totalSize) {
                            end = totalSize - 1;
                        }
                        isPartial = true;
                    } else {
                        start = null;
                        end = null;
                    }
                } catch (NumberFormatException ignored) {}
            }
        }

        Long contentLength = isPartial ? (end - start + 1) : (totalSize > 0 ? totalSize : null);
        InputStream stream = driveClient.downloadStream(token, fileId, start, end);
        String filename = meta.name() != null ? meta.name() : "download";

        return new DriveDtos.DownloadResult(
                stream, filename, mimeType, contentLength, isPartial, start, end, totalSize
        );
    }

    @Transactional
    public DriveDtos.DriveFileDto uploadFile(String principal, UUID connectionId, MultipartFile file, String parentId, String customName) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file cannot be empty");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds limit of 5GB");
        }

        String token = getAccessToken(principal, connectionId);
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "untitled";
        String finalName = (customName != null && !customName.strip().isEmpty()) ? customName.strip() : originalFilename;
        String mimeType = (file.getContentType() != null && !file.getContentType().isBlank())
                ? file.getContentType()
                : "application/octet-stream";

        try (InputStream in = file.getInputStream()) {
            return driveClient.uploadResumable(token, finalName, mimeType, parentId, in, file.getSize());
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to upload file to Google Drive: " + ex.getMessage(), ex);
        }
    }

    @Transactional
    public DriveDtos.DriveFileDto createFolder(String principal, UUID connectionId, String name, String parentId) {
        String token = getAccessToken(principal, connectionId);
        return driveClient.createFolder(token, name, parentId);
    }

    @Transactional
    public DriveDtos.DriveFileDto renameFile(String principal, UUID connectionId, String fileId, String newName) {
        String token = getAccessToken(principal, connectionId);
        return driveClient.renameFile(token, fileId, newName);
    }

    @Transactional
    public DriveDtos.DriveFileDto moveFile(String principal, UUID connectionId, String fileId, String newParentId, String oldParentId) {
        String token = getAccessToken(principal, connectionId);
        return driveClient.moveFile(token, fileId, newParentId, oldParentId);
    }

    @Transactional
    public DriveDtos.DriveFileDto copyFile(String principal, UUID connectionId, String fileId, String newName, String destinationFolderId) {
        String token = getAccessToken(principal, connectionId);
        return driveClient.copyFile(token, fileId, newName, destinationFolderId);
    }

    @Transactional
    public DriveDtos.DriveFileDto trashFile(String principal, UUID connectionId, String fileId, boolean trashed) {
        String token = getAccessToken(principal, connectionId);
        return driveClient.trashFile(token, fileId, trashed);
    }

    @Transactional
    public void deleteFilePermanent(String principal, UUID connectionId, String fileId) {
        String token = getAccessToken(principal, connectionId);
        driveClient.deleteFilePermanent(token, fileId);
    }

    @Transactional(readOnly = true)
    public List<DriveDtos.PermissionDto> listPermissions(String principal, UUID connectionId, String fileId) {
        String token = getAccessToken(principal, connectionId);
        return driveClient.listPermissions(token, fileId);
    }

    @Transactional
    public DriveDtos.PermissionDto createPermission(String principal, UUID connectionId, String fileId, DriveDtos.CreatePermissionRequest req) {
        String token = getAccessToken(principal, connectionId);
        return driveClient.createPermission(token, fileId, req.role(), req.type(), req.emailAddress(), req.sendNotificationEmail());
    }

    @Transactional
    public void deletePermission(String principal, UUID connectionId, String fileId, String permissionId) {
        String token = getAccessToken(principal, connectionId);
        driveClient.deletePermission(token, fileId, permissionId);
    }

    private String getAccessToken(String principal, UUID connectionId) {
        ApplicationUser user = users.findByNormalizedEmail(principal)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + principal));
        StorageConnection connection = connections.findByIdAndOwnerId(connectionId, user.getId())
                .orElseThrow(() -> new NoSuchElementException("Storage connection not found: " + connectionId));

        if (!"CONNECTED".equals(connection.getStatus())) {
            throw new IllegalStateException("Google Drive connection is not in CONNECTED status");
        }
        return oauthService.getFreshAccessToken(principal, connectionId);
    }

    private DriveDtos.DownloadResult resolveGoogleDocExport(String token, DriveDtos.DriveFileDto meta, String exportFormat) {
        String mimeType = meta.mimeType();
        String exportMimeType;
        String extension;
        String baseName = meta.name() != null ? meta.name() : "document";

        if (mimeType.contains("document")) {
            if ("docx".equalsIgnoreCase(exportFormat)) {
                exportMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                extension = ".docx";
            } else {
                exportMimeType = "application/pdf";
                extension = ".pdf";
            }
        } else if (mimeType.contains("spreadsheet")) {
            if ("pdf".equalsIgnoreCase(exportFormat)) {
                exportMimeType = "application/pdf";
                extension = ".pdf";
            } else {
                exportMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                extension = ".xlsx";
            }
        } else if (mimeType.contains("presentation")) {
            if ("pdf".equalsIgnoreCase(exportFormat)) {
                exportMimeType = "application/pdf";
                extension = ".pdf";
            } else {
                exportMimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
                extension = ".pptx";
            }
        } else if (mimeType.contains("drawing")) {
            exportMimeType = "image/png";
            extension = ".png";
        } else {
            exportMimeType = "application/pdf";
            extension = ".pdf";
        }

        String finalName = baseName.endsWith(extension) ? baseName : (baseName + extension);
        InputStream stream = driveClient.exportDocumentStream(token, meta.id(), exportMimeType);

        return new DriveDtos.DownloadResult(
                stream, finalName, exportMimeType, null, false, null, null, null
        );
    }
}
