package com.drivemanager.storagehub.storage.google;

import com.drivemanager.storagehub.item.FileContent;
import com.drivemanager.storagehub.item.FileContentRepository;
import com.drivemanager.storagehub.item.Item;
import com.drivemanager.storagehub.item.ItemRepository;
import com.drivemanager.storagehub.storage.StorageProvider;
import com.drivemanager.storagehub.storage.connection.StorageConnection;
import com.drivemanager.storagehub.storage.connection.StorageConnectionRepository;
import com.drivemanager.storagehub.storage.connection.StorageOAuthService;
import com.drivemanager.storagehub.user.ApplicationUser;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoogleDriveSyncService {

    private static final Logger log = LoggerFactory.getLogger(GoogleDriveSyncService.class);

    private final StorageConnectionRepository connections;
    private final StorageOAuthService oauthService;
    private final ObjectProvider<StorageProvider> storageProvider;
    private final ItemRepository items;
    private final FileContentRepository fileContents;
    private final ApplicationUserRepository users;

    public GoogleDriveSyncService(StorageConnectionRepository connections,
                                  StorageOAuthService oauthService,
                                  ObjectProvider<StorageProvider> storageProvider,
                                  ItemRepository items,
                                  FileContentRepository fileContents,
                                  ApplicationUserRepository users) {
        this.connections = connections;
        this.oauthService = oauthService;
        this.storageProvider = storageProvider;
        this.items = items;
        this.fileContents = fileContents;
        this.users = users;
    }

    public record SyncResult(int newItems, int updatedItems, int totalItems) {}

    @Transactional
    public SyncResult syncConnection(UUID connectionId) {
        StorageConnection connection = connections.findById(connectionId)
                .orElseThrow(() -> new NoSuchElementException("Storage connection not found: " + connectionId));

        if (!"CONNECTED".equals(connection.getStatus())) {
            throw new IllegalStateException("Storage connection is not connected");
        }

        ApplicationUser owner = users.findById(connection.getOwnerId())
                .orElseThrow(() -> new NoSuchElementException("Owner not found for connection: " + connectionId));

        StorageProvider provider = storageProvider.getIfAvailable();
        if (provider == null || !provider.isConfigured()) {
            throw new IllegalStateException("Google Storage provider is not available or configured");
        }

        String token = oauthService.getFreshAccessToken(owner.getNormalizedEmail(), connection.getId());

        // 1. Fetch & update storage quota
        try {
            StorageProvider.StorageQuota quota = provider.getStorageQuota(token);
            if (quota != null) {
                connection.updateQuota(quota.limitBytes(), quota.usageBytes(), quota.usageInDriveBytes());
                log.info("Updated quota for connection {}: total={}, used={}, inDrive={}",
                        connectionId, quota.limitBytes(), quota.usageBytes(), quota.usageInDriveBytes());
            }
        } catch (Exception ex) {
            log.warn("Failed to fetch storage quota for connection {}: {}", connectionId, ex.getMessage());
        }

        // 2. Scan & sync files from Google Drive
        int newItems = 0;
        int updatedItems = 0;
        int totalScanned = 0;
        String pageToken = null;
        java.util.Set<String> activeDriveFileIds = new java.util.HashSet<>();
        boolean scanSucceeded = false;

        do {
            StorageProvider.DriveFileList fileList;
            try {
                fileList = provider.listFiles(token, pageToken, 100);
            } catch (Exception ex) {
                log.error("Failed to list files from Google Drive for connection {}: {}", connectionId, ex.getMessage());
                break;
            }

            if (fileList == null || fileList.files() == null) {
                break;
            }
            scanSucceeded = true;

            for (StorageProvider.DriveFileItem fileItem : fileList.files()) {
                var existingFc = fileContents.findByStorageConnectionIdAndStorageFileId(connection.getId(), fileItem.id());
                if (fileItem.trashed()) {
                    if (existingFc.isPresent()) {
                        Item existingItem = existingFc.get().getItem();
                        if (existingItem.getDeletedAt() == null) {
                            existingItem.trash(connection.getOwnerId());
                            items.save(existingItem);
                            updatedItems++;
                        }
                    }
                    continue;
                }

                totalScanned++;
                activeDriveFileIds.add(fileItem.id());

                if (existingFc.isPresent()) {
                    FileContent fc = existingFc.get();
                    Item existingItem = fc.getItem();
                    boolean modified = false;
                    if (existingItem.getDeletedAt() != null) {
                        existingItem.restore();
                        modified = true;
                    }
                    if (fileItem.name() != null && !fileItem.name().equals(existingItem.getName())) {
                        existingItem.updateMetadata(fileItem.name(), existingItem.getDescription());
                        modified = true;
                    }
                    if (modified) {
                        items.save(existingItem);
                        updatedItems++;
                    }
                } else {
                    String itemName = (fileItem.name() != null && !fileItem.name().isBlank()) ? fileItem.name() : "Untitled";
                    String mimeType = (fileItem.mimeType() != null && !fileItem.mimeType().isBlank()) ? fileItem.mimeType() : "application/octet-stream";
                    Item.Type itemType = determineType(mimeType);
                    long size = fileItem.size() != null ? fileItem.size() : 0L;

                    Item newItem = Item.file(connection.getOwnerId(), itemName, null, itemType, connection.getId(),
                            fileItem.id(), itemName, mimeType, size, fileItem.md5Checksum());
                    items.save(newItem);
                    newItems++;
                }
            }

            pageToken = fileList.nextPageToken();
        } while (pageToken != null && !pageToken.isBlank());

        // If the scan succeeded, mark items no longer existing on Google Drive as trashed in our database
        if (scanSucceeded) {
            List<FileContent> existingForConnection = fileContents.findByStorageConnectionId(connection.getId());
            for (FileContent fc : existingForConnection) {
                if (!activeDriveFileIds.contains(fc.getStorageFileId())) {
                    Item itm = fc.getItem();
                    if (itm.getDeletedAt() == null) {
                        itm.trash(connection.getOwnerId());
                        items.save(itm);
                        updatedItems++;
                    }
                }
            }
        }

        connection.markSynced();
        connections.save(connection);

        log.info("Completed sync for connection {}: new={}, updated={}, totalScanned={}",
                connectionId, newItems, updatedItems, totalScanned);

        return new SyncResult(newItems, updatedItems, totalScanned);
    }

    @Async
    public void syncConnectionAsync(UUID connectionId) {
        try {
            syncConnection(connectionId);
        } catch (Exception ex) {
            log.warn("Asynchronous Google Drive sync failed for connection {}: {}", connectionId, ex.getMessage());
        }
    }

    @Transactional
    public SyncResult syncAllUserConnections(String principal) {
        ApplicationUser user = users.findByNormalizedEmail(principal)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + principal));

        List<StorageConnection> userConnections = connections.findByOwnerIdOrderByUpdatedAtDesc(user.getId());
        int totalNew = 0;
        int totalUpdated = 0;
        int totalScanned = 0;

        for (StorageConnection conn : userConnections) {
            if ("CONNECTED".equals(conn.getStatus())) {
                try {
                    SyncResult res = syncConnection(conn.getId());
                    totalNew += res.newItems();
                    totalUpdated += res.updatedItems();
                    totalScanned += res.totalItems();
                } catch (Exception ex) {
                    log.error("Failed to sync connection {} for user {}: {}", conn.getId(), principal, ex.getMessage());
                }
            }
        }

        return new SyncResult(totalNew, totalUpdated, totalScanned);
    }

    @Scheduled(fixedDelayString = "${storage.sync.fixed-delay-ms:900000}")
    public void scheduledAutoSync() {
        log.debug("Running scheduled Google Drive auto-sync");
        List<StorageConnection> activeConnections = connections.findByStatus("CONNECTED");
        for (StorageConnection conn : activeConnections) {
            try {
                syncConnection(conn.getId());
            } catch (Exception ex) {
                log.warn("Scheduled sync failed for connection {}: {}", conn.getId(), ex.getMessage());
            }
        }
    }

    private static Item.Type determineType(String mimeType) {
        if (mimeType == null) return Item.Type.FILE;
        if (mimeType.startsWith("image/")) return Item.Type.IMAGE;
        if (mimeType.startsWith("video/")) return Item.Type.VIDEO;
        if (mimeType.startsWith("audio/")) return Item.Type.AUDIO;
        if (mimeType.equals("application/pdf") || mimeType.equals("application/msword")
                || mimeType.contains("officedocument") || mimeType.contains("ms-excel") || mimeType.contains("ms-powerpoint")
                || mimeType.contains("google-apps.document") || mimeType.contains("google-apps.spreadsheet")
                || mimeType.contains("google-apps.presentation") || mimeType.contains("google-apps.form")) return Item.Type.DOCUMENT;
        if (mimeType.equals("application/zip") || mimeType.equals("application/x-7z-compressed")
                || mimeType.equals("application/x-rar-compressed") || mimeType.equals("application/gzip")) return Item.Type.ARCHIVE;
        return Item.Type.FILE;
    }
}
