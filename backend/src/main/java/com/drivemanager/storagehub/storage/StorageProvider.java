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

    record FileUploadResult(String driveFileId, String filename, String mimeType, long sizeBytes, String md5Checksum) {}
    record FileMetadata(String driveFileId, String filename, String mimeType, long sizeBytes, String md5Checksum) {}
}
