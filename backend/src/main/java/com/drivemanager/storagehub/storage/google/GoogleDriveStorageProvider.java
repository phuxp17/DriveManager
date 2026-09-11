package com.drivemanager.storagehub.storage.google;

import com.drivemanager.storagehub.storage.StorageProvider;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.net.URI;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

public class GoogleDriveStorageProvider implements StorageProvider {

    private static final Logger log = LoggerFactory.getLogger(GoogleDriveStorageProvider.class);

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
        try {
            // Initiate Resumable Upload session for Google Drive (supports large files up to GBs)
            var initSpec = restClient.post()
                    .uri("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,md5Checksum")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header("X-Upload-Content-Type", mimeType)
                    .contentType(MediaType.APPLICATION_JSON);

            if (sizeBytes > 0) {
                initSpec.header("X-Upload-Content-Length", String.valueOf(sizeBytes));
            }

            var initResponse = initSpec
                    .body(json.writeValueAsString(Map.of("name", filename, "mimeType", mimeType)))
                    .retrieve()
                    .toBodilessEntity();

            String uploadUrl = initResponse.getHeaders().getFirst(HttpHeaders.LOCATION);
            if (uploadUrl == null || uploadUrl.isBlank()) {
                throw new IllegalStateException("Google Drive did not return resumable upload location");
            }

            // Stream file contents directly to upload URL
            var putSpec = restClient.put()
                    .uri(uploadUrl)
                    .contentType(MediaType.parseMediaType(mimeType));

            if (sizeBytes > 0) {
                putSpec.header(HttpHeaders.CONTENT_LENGTH, String.valueOf(sizeBytes));
            }

            var response = putSpec
                    .body(outputStream -> contentStream.transferTo(outputStream))
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

    @Override
    public StorageQuota getStorageQuota(String accessToken) {
        if (!configured) {
            throw new IllegalStateException("Google storage is not configured");
        }
        try {
            var response = restClient.get()
                    .uri("https://www.googleapis.com/drive/v3/about?fields=storageQuota")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(AboutResponse.class);

            if (response == null || response.storageQuota() == null) {
                return new StorageQuota(null, 0L, 0L);
            }
            StorageQuotaResponse q = response.storageQuota();
            Long limit = (q.limit() != null && !q.limit().isBlank()) ? Long.parseLong(q.limit()) : null;
            Long usage = (q.usage() != null && !q.usage().isBlank()) ? Long.parseLong(q.usage()) : 0L;
            Long usageInDrive = (q.usageInDrive() != null && !q.usageInDrive().isBlank()) ? Long.parseLong(q.usageInDrive()) : 0L;
            return new StorageQuota(limit, usage, usageInDrive);
        } catch (Exception ex) {
            throw new IllegalStateException("Error fetching Google Drive storage quota: " + ex.getMessage(), ex);
        }
    }

    @Override
    public DriveFileList listFiles(String accessToken, String pageToken, int pageSize) {
        if (!configured) {
            throw new IllegalStateException("Google storage is not configured");
        }
        try {
            int size = Math.max(1, Math.min(pageSize, 100));
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("https://www.googleapis.com/drive/v3/files")
                    .queryParam("pageSize", size)
                    .queryParam("supportsAllDrives", true)
                    .queryParam("includeItemsFromAllDrives", true)
                    .queryParam("fields", "nextPageToken,files(id,name,mimeType,size,md5Checksum,webViewLink,trashed)")
                    .queryParam("q", "trashed = false and mimeType != 'application/vnd.google-apps.folder'");

            if (pageToken != null && !pageToken.isBlank()) {
                builder.queryParam("pageToken", pageToken);
            }

            URI uri = builder.build().toUri();

            var response = restClient.get()
                    .uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(DriveFileListResponse.class);

            if (response == null || response.files() == null) {
                return new DriveFileList(java.util.List.of(), null);
            }

            java.util.List<DriveFileItem> items = response.files().stream().map(f -> {
                long fSize = (f.size() != null && !f.size().isBlank()) ? Long.parseLong(f.size()) : 0L;
                boolean trashed = Boolean.TRUE.equals(f.trashed());
                return new DriveFileItem(f.id(), f.name(), f.mimeType(), fSize, f.md5Checksum(), f.webViewLink(), trashed);
            }).toList();

            return new DriveFileList(items, response.nextPageToken());
        } catch (Exception ex) {
            throw new IllegalStateException("Error listing files from Google Drive: " + ex.getMessage(), ex);
        }
    }

    @Override
    public void deleteFile(String accessToken, String driveFileId) {
        if (!configured || driveFileId == null || driveFileId.isBlank()) {
            return;
        }
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl("https://www.googleapis.com/drive/v3/files/" + driveFileId)
                    .queryParam("supportsAllDrives", true)
                    .build().toUri();

            restClient.delete()
                    .uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Successfully deleted file {} permanently from Google Drive", driveFileId);
        } catch (Exception ex) {
            log.warn("Could not delete file {} from Google Drive (proceeding anyway): {}", driveFileId, ex.getMessage());
        }
    }

    @Override
    public void trashFile(String accessToken, String driveFileId, boolean trashed) {
        if (!configured || driveFileId == null || driveFileId.isBlank()) {
            return;
        }
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl("https://www.googleapis.com/drive/v3/files/" + driveFileId)
                    .queryParam("supportsAllDrives", true)
                    .build().toUri();

            restClient.patch()
                    .uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("trashed", trashed))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Successfully updated trashed={} for file {} on Google Drive", trashed, driveFileId);
        } catch (Exception ex) {
            log.warn("Could not update trashed={} for file {} on Google Drive (proceeding anyway): {}", trashed, driveFileId, ex.getMessage());
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DriveFileResponse(String id, String name, String mimeType, String size, String md5Checksum) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AboutResponse(StorageQuotaResponse storageQuota) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record StorageQuotaResponse(String limit, String usage, String usageInDrive) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DriveFileListResponse(String nextPageToken, java.util.List<DriveFileItemResponse> files) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DriveFileItemResponse(String id, String name, String mimeType, String size, String md5Checksum, String webViewLink, Boolean trashed) {}
}
