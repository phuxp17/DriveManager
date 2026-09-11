package com.drivemanager.storagehub.storage;

import java.io.InputStream;

/**
 * Storage provider port isolating external storage SDKs/APIs from core application logic.
 */
public interface StorageProvider {
    String providerName();
    boolean isConfigured();

    FileUploadResult uploadStream(String accessToken, String filename, String mimeType, InputStream contentStream, long sizeBytes);
    FileMetadata getFileMetadata(String accessToken, String driveFileId);
    InputStream downloadStream(String accessToken, String driveFileId, Long startByte, Long endByte);
    StorageQuota getStorageQuota(String accessToken);
    DriveFileList listFiles(String accessToken, String pageToken, int pageSize);

    record FileUploadResult(String driveFileId, String filename, String mimeType, long sizeBytes, String md5Checksum) {}
    record FileMetadata(String driveFileId, String filename, String mimeType, long sizeBytes, String md5Checksum) {}
    record StorageQuota(Long limitBytes, Long usageBytes, Long usageInDriveBytes) {}
    record DriveFileItem(String id, String name, String mimeType, Long size, String md5Checksum, String webViewLink, boolean trashed) {}
    record DriveFileList(java.util.List<DriveFileItem> files, String nextPageToken) {}
}
