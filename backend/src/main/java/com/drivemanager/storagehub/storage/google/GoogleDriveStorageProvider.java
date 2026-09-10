package com.drivemanager.storagehub.storage.google;

import com.drivemanager.storagehub.storage.StorageProvider;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.util.Map;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

public class GoogleDriveStorageProvider implements StorageProvider {

    private final RestClient restClient;
    private final boolean configured;
    private final ObjectMapper json = new ObjectMapper();

    public GoogleDriveStorageProvider(RestClient restClient, boolean configured) {
        this.restClient = restClient;
        this.configured = configured;
    }

    @Override
    public String providerName() {
        return "GOOGLE";
    }

    @Override
    public boolean isConfigured() {
        return configured;
    }

    @Override
    public FileUploadResult uploadStream(String accessToken, String filename, String mimeType, InputStream contentStream, long sizeBytes) {
        if (!configured) {
            throw new IllegalStateException("Google storage is not configured");
        }
        // Google Drive multipart upload
        try {
            var response = restClient.post()
                    .uri("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,md5Checksum")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .contentType(MediaType.parseMediaType("multipart/related; boundary=\"foo_bar_baz\""))
                    .body(outputStream -> {
                        String metadataPart = "--foo_bar_baz\r\n"
                                + "Content-Type: application/json; charset=UTF-8\r\n\r\n"
                                + json.writeValueAsString(Map.of("name", filename, "mimeType", mimeType)) + "\r\n"
                                + "--foo_bar_baz\r\n"
                                + "Content-Type: " + mimeType + "\r\n\r\n";
                        outputStream.write(metadataPart.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                        contentStream.transferTo(outputStream);
                        outputStream.write("\r\n--foo_bar_baz--".getBytes(java.nio.charset.StandardCharsets.UTF_8));
                    })
                    .retrieve()
                    .body(DriveFileResponse.class);

            if (response == null || response.id() == null) {
                throw new IllegalStateException("Failed to upload file to Google Drive");
            }
            long returnedSize = response.size() != null ? Long.parseLong(response.size()) : sizeBytes;
            return new FileUploadResult(response.id(), response.name() != null ? response.name() : filename,
                    response.mimeType() != null ? response.mimeType() : mimeType, returnedSize, response.md5Checksum());
        } catch (Exception ex) {
            throw new IllegalStateException("Error communicating with Google Drive: " + ex.getMessage(), ex);
        }
    }

    @Override
    public FileMetadata getFileMetadata(String accessToken, String driveFileId) {
        if (!configured) {
            throw new IllegalStateException("Google storage is not configured");
        }
        try {
            var response = restClient.get()
                    .uri("https://www.googleapis.com/drive/v3/files/{id}?fields=id,name,mimeType,size,md5Checksum", driveFileId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(DriveFileResponse.class);

            if (response == null || response.id() == null) {
                throw new IllegalArgumentException("Google Drive file not found: " + driveFileId);
            }
            long size = response.size() != null ? Long.parseLong(response.size()) : 0L;
            return new FileMetadata(response.id(), response.name(), response.mimeType(), size, response.md5Checksum());
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unable to retrieve file metadata from Google Drive: " + ex.getMessage(), ex);
        }
    }

    @Override
    public InputStream downloadStream(String accessToken, String driveFileId, Long startByte, Long endByte) {
        if (!configured) {
            throw new IllegalStateException("Google storage is not configured");
        }
        try {
            var spec = restClient.get()
                    .uri("https://www.googleapis.com/drive/v3/files/{id}?alt=media", driveFileId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);

            if (startByte != null) {
                String range = "bytes=" + startByte + "-" + (endByte != null ? endByte : "");
                spec.header(HttpHeaders.RANGE, range);
            }

            var entity = spec.retrieve().toEntity(InputStreamResource.class);
            if (entity.getBody() == null) {
                throw new IllegalStateException("Empty response body from Google Drive download");
            }
            return entity.getBody().getInputStream();
        } catch (Exception ex) {
            throw new IllegalStateException("Error downloading file from Google Drive: " + ex.getMessage(), ex);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DriveFileResponse(String id, String name, String mimeType, String size, String md5Checksum) {}
}
