package com.drivemanager.storagehub.drive;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.net.URI;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class HttpGoogleDriveClient implements GoogleDriveClient {

    private static final Logger log = LoggerFactory.getLogger(HttpGoogleDriveClient.class);
    private static final String DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
    private static final String UPLOAD_API_BASE = "https://www.googleapis.com/upload/drive/v3";
    private static final String FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
    private static final String FILE_FIELDS = "id,name,mimeType,size,parents,modifiedTime,createdTime,thumbnailLink,webViewLink,webContentLink,iconLink,trashed,shared,owners(displayName,emailAddress),capabilities(canEdit,canComment,canShare,canCopy,canDelete,canTrash,canRename,canAddChildren)";
    private static final String LIST_FIELDS = "nextPageToken,files(" + FILE_FIELDS + ")";

    private final RestClient restClient;
    private final ObjectMapper json;

    public HttpGoogleDriveClient(RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
        this.restClient = restClientBuilder != null ? restClientBuilder.build() : RestClient.create();
        this.json = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public HttpGoogleDriveClient() {
        this(RestClient.builder(), new ObjectMapper());
    }

    @Override
    public DriveDtos.DriveFileListResponse listFiles(String accessToken, String parentId, String pageToken, int pageSize) {
        int size = Math.max(1, Math.min(pageSize > 0 ? pageSize : 50, 100));
        String query;
        if ("all".equalsIgnoreCase(parentId)) {
            query = "trashed = false";
        } else if ("sharedWithMe".equalsIgnoreCase(parentId)) {
            query = "sharedWithMe = true and trashed = false";
        } else {
            String parent = (parentId == null || parentId.isBlank() || "root".equalsIgnoreCase(parentId)) ? "root" : parentId.trim();
            query = "'" + escapeQuery(parent) + "' in parents and trashed = false";
        }

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(DRIVE_API_BASE + "/files")
                .queryParam("q", query)
                .queryParam("pageSize", size)
                .queryParam("fields", LIST_FIELDS)
                .queryParam("supportsAllDrives", true)
                .queryParam("includeItemsFromAllDrives", true);

        if ("sharedWithMe".equalsIgnoreCase(parentId)) {
            builder.queryParam("orderBy", "sharedWithMeTime desc");
        } else {
            builder.queryParam("orderBy", "folder,modifiedTime desc,name");
        }

        if (pageToken != null && !pageToken.isBlank()) {
            builder.queryParam("pageToken", pageToken);
        }

        URI uri = builder.build().toUri();
        log.debug("Listing Drive files: uri={}", uri);

        try {
            RawFileListResponse resp = restClient.get()
                    .uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(RawFileListResponse.class);

            if (resp == null || resp.files == null) {
                return new DriveDtos.DriveFileListResponse(List.of(), null);
            }

            List<DriveDtos.DriveFileDto> list = resp.files.stream()
                    .map(this::mapToFileDto)
                    .sorted((a, b) -> {
                        if (a.isFolder() != b.isFolder()) {
                            return a.isFolder() ? -1 : 1;
                        }
                        return 0;
                    })
                    .toList();
            return new DriveDtos.DriveFileListResponse(list, resp.nextPageToken);
        } catch (RestClientResponseException ex) {
            log.error("Google Drive API listFiles failed: uri={} status={} body={}", uri, ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new IllegalStateException("Lỗi Google Drive API (" + ex.getStatusCode().value() + "): " + ex.getResponseBodyAsString(), ex);
        }
    }

    @Override
    public DriveDtos.DriveFileListResponse searchFiles(String accessToken, String query, String parentId, String pageToken, int pageSize) {
        int size = Math.max(1, Math.min(pageSize > 0 ? pageSize : 50, 100));
        StringBuilder qBuilder = new StringBuilder();
        qBuilder.append("trashed = false and name contains '").append(escapeQuery(query.trim())).append("'");

        if (parentId != null && !parentId.isBlank() && !"root".equalsIgnoreCase(parentId) && !"all".equalsIgnoreCase(parentId) && !"sharedWithMe".equalsIgnoreCase(parentId)) {
            qBuilder.append(" and '").append(escapeQuery(parentId.trim())).append("' in parents");
        } else if ("sharedWithMe".equalsIgnoreCase(parentId)) {
            qBuilder.append(" and sharedWithMe = true");
        }

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(DRIVE_API_BASE + "/files")
                .queryParam("q", qBuilder.toString())
                .queryParam("pageSize", size)
                .queryParam("fields", LIST_FIELDS)
                .queryParam("supportsAllDrives", true)
                .queryParam("includeItemsFromAllDrives", true);

        if ("sharedWithMe".equalsIgnoreCase(parentId)) {
            builder.queryParam("orderBy", "sharedWithMeTime desc");
        } else {
            builder.queryParam("orderBy", "folder,modifiedTime desc");
        }

        if (pageToken != null && !pageToken.isBlank()) {
            builder.queryParam("pageToken", pageToken);
        }

        URI uri = builder.build().toUri();
        log.debug("Searching Drive files: uri={}", uri);

        try {
            RawFileListResponse resp = restClient.get()
                    .uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(RawFileListResponse.class);

            if (resp == null || resp.files == null) {
                return new DriveDtos.DriveFileListResponse(List.of(), null);
            }

            List<DriveDtos.DriveFileDto> list = resp.files.stream()
                    .map(this::mapToFileDto)
                    .sorted((a, b) -> {
                        if (a.isFolder() != b.isFolder()) {
                            return a.isFolder() ? -1 : 1;
                        }
                        return 0;
                    })
                    .toList();
            return new DriveDtos.DriveFileListResponse(list, resp.nextPageToken);
        } catch (RestClientResponseException ex) {
            log.error("Google Drive API searchFiles failed: uri={} status={} body={}", uri, ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new IllegalStateException("Lỗi Google Drive API (" + ex.getStatusCode().value() + "): " + ex.getResponseBodyAsString(), ex);
        }
    }

    @Override
    public DriveDtos.DriveFileDto getFile(String accessToken, String fileId) {
        URI uri = UriComponentsBuilder.fromHttpUrl(DRIVE_API_BASE + "/files/" + fileId)
                .queryParam("fields", FILE_FIELDS)
                .queryParam("supportsAllDrives", true)
                .build().toUri();

        try {
            RawFileItem raw = restClient.get()
                    .uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(RawFileItem.class);

            if (raw == null || raw.id == null) {
                throw new IllegalArgumentException("Google Drive file not found: " + fileId);
            }
            return mapToFileDto(raw);
        } catch (RestClientResponseException ex) {
            log.error("Google Drive API getFile failed: fileId={} status={} body={}", fileId, ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new IllegalStateException("Lỗi Google Drive API (" + ex.getStatusCode().value() + "): " + ex.getResponseBodyAsString(), ex);
        }
    }

    @Override
    public InputStream downloadStream(String accessToken, String fileId, Long startByte, Long endByte) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(DRIVE_API_BASE + "/files/" + fileId)
                .queryParam("alt", "media")
                .queryParam("supportsAllDrives", true);

        var spec = restClient.get()
                .uri(builder.build().toUri())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);

        if (startByte != null) {
            String range = "bytes=" + startByte + "-" + (endByte != null ? endByte : "");
            spec.header(HttpHeaders.RANGE, range);
        }

        var entity = spec.retrieve().toEntity(InputStreamResource.class);
        if (entity.getBody() == null) {
            throw new IllegalStateException("Empty response body from Google Drive download");
        }
        try {
            return entity.getBody().getInputStream();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to open download stream from Google Drive", e);
        }
    }

    @Override
    public InputStream exportDocumentStream(String accessToken, String fileId, String exportMimeType) {
        URI uri = UriComponentsBuilder.fromHttpUrl(DRIVE_API_BASE + "/files/" + fileId + "/export")
                .queryParam("mimeType", exportMimeType)
                .queryParam("supportsAllDrives", true)
                .build().toUri();

        var entity = restClient.get()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .toEntity(InputStreamResource.class);

        if (entity.getBody() == null) {
            throw new IllegalStateException("Empty response body from Google Drive document export");
        }
        try {
            return entity.getBody().getInputStream();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to open exported stream from Google Drive", e);
        }
    }

    @Override
    public DriveDtos.DriveFileDto uploadResumable(String accessToken, String filename, String mimeType,
                                                  String parentId, InputStream contentStream, long sizeBytes) {
        try {
            String targetParent = (parentId == null || parentId.isBlank() || "root".equalsIgnoreCase(parentId)
                    || "all".equalsIgnoreCase(parentId) || "sharedWithMe".equalsIgnoreCase(parentId)) ? "root" : parentId.trim();
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("name", filename);
            metadata.put("mimeType", mimeType);
            metadata.put("parents", List.of(targetParent));

            String initUrl = UPLOAD_API_BASE + "/files?uploadType=resumable&supportsAllDrives=true&fields=" + FILE_FIELDS;
            var initSpec = restClient.post()
                    .uri(initUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header("X-Upload-Content-Type", mimeType)
                    .contentType(MediaType.APPLICATION_JSON);

            if (sizeBytes > 0) {
                initSpec.header("X-Upload-Content-Length", String.valueOf(sizeBytes));
            }

            var initResponse = initSpec
                    .body(json.writeValueAsString(metadata))
                    .retrieve()
                    .toBodilessEntity();

            String uploadUrl = initResponse.getHeaders().getFirst(HttpHeaders.LOCATION);
            if (uploadUrl == null || uploadUrl.isBlank()) {
                throw new IllegalStateException("Google Drive did not return resumable upload session location");
            }

            var putSpec = restClient.put()
                    .uri(uploadUrl)
                    .contentType(MediaType.parseMediaType(mimeType));

            if (sizeBytes > 0) {
                putSpec.header(HttpHeaders.CONTENT_LENGTH, String.valueOf(sizeBytes));
            }

            RawFileItem uploaded = putSpec
                    .body(outputStream -> contentStream.transferTo(outputStream))
                    .retrieve()
                    .body(RawFileItem.class);

            if (uploaded == null || uploaded.id == null) {
                throw new IllegalStateException("Google Drive did not return file metadata after upload");
            }

            log.info("Google Drive resumable upload completed: fileId={} name={} size={}", uploaded.id, uploaded.name, uploaded.size);
            return mapToFileDto(uploaded);
        } catch (RestClientResponseException ex) {
            log.error("Google Drive API upload failed: status={} body={}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new IllegalStateException("Lỗi tải tệp lên Google Drive (" + ex.getStatusCode().value() + "): " + ex.getResponseBodyAsString(), ex);
        } catch (Exception ex) {
            log.error("Google Drive upload error: {}", ex.getMessage(), ex);
            throw new IllegalStateException("Error during Google Drive resumable upload: " + ex.getMessage(), ex);
        }
    }

    @Override
    public DriveDtos.DriveFileDto createFolder(String accessToken, String name, String parentId) {
        String targetParent = (parentId == null || parentId.isBlank() || "root".equalsIgnoreCase(parentId)
                || "all".equalsIgnoreCase(parentId) || "sharedWithMe".equalsIgnoreCase(parentId)) ? "root" : parentId.trim();
        Map<String, Object> body = Map.of(
                "name", name.trim(),
                "mimeType", FOLDER_MIME_TYPE,
                "parents", List.of(targetParent)
        );

        URI uri = UriComponentsBuilder.fromHttpUrl(DRIVE_API_BASE + "/files")
                .queryParam("supportsAllDrives", true)
                .queryParam("fields", FILE_FIELDS)
                .build().toUri();

        RawFileItem created = restClient.post()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(RawFileItem.class);

        if (created == null || created.id == null) {
            throw new IllegalStateException("Failed to create folder on Google Drive");
        }
        return mapToFileDto(created);
    }

    @Override
    public DriveDtos.DriveFileDto renameFile(String accessToken, String fileId, String newName) {
        URI uri = UriComponentsBuilder.fromHttpUrl(DRIVE_API_BASE + "/files/" + fileId)
                .queryParam("supportsAllDrives", true)
                .queryParam("fields", FILE_FIELDS)
                .build().toUri();

        RawFileItem updated = restClient.patch()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", newName.trim()))
                .retrieve()
                .body(RawFileItem.class);

        if (updated == null || updated.id == null) {
            throw new IllegalStateException("Failed to rename file on Google Drive");
        }
        return mapToFileDto(updated);
    }

    @Override
    public DriveDtos.DriveFileDto moveFile(String accessToken, String fileId, String newParentId, String oldParentId) {
        String targetNewParent = (newParentId == null || newParentId.isBlank() || "root".equalsIgnoreCase(newParentId)
                || "all".equalsIgnoreCase(newParentId) || "sharedWithMe".equalsIgnoreCase(newParentId)) ? "root" : newParentId.trim();

        String removeParents = oldParentId;
        if (removeParents == null || removeParents.isBlank()) {
            DriveDtos.DriveFileDto current = getFile(accessToken, fileId);
            if (current.parents() != null && !current.parents().isEmpty()) {
                removeParents = String.join(",", current.parents());
            }
        }

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(DRIVE_API_BASE + "/files/" + fileId)
                .queryParam("addParents", targetNewParent)
                .queryParam("enforceSingleParent", true)
                .queryParam("supportsAllDrives", true)
                .queryParam("fields", FILE_FIELDS);

        if (removeParents != null && !removeParents.isBlank()) {
            builder.queryParam("removeParents", removeParents.trim());
        }

        RawFileItem moved = restClient.patch()
                .uri(builder.build().toUri())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(RawFileItem.class);

        if (moved == null || moved.id == null) {
            throw new IllegalStateException("Failed to move file on Google Drive");
        }
        return mapToFileDto(moved);
    }

    @Override
    public DriveDtos.DriveFileDto copyFile(String accessToken, String fileId, String newName, String destinationFolderId) {
        Map<String, Object> body = new HashMap<>();
        if (newName != null && !newName.isBlank()) {
            body.put("name", newName.trim());
        }
        if (destinationFolderId != null && !destinationFolderId.isBlank()) {
            body.put("parents", List.of(destinationFolderId.trim()));
        }

        URI uri = UriComponentsBuilder.fromHttpUrl(DRIVE_API_BASE + "/files/" + fileId + "/copy")
                .queryParam("supportsAllDrives", true)
                .queryParam("fields", FILE_FIELDS)
                .build().toUri();

        RawFileItem copied = restClient.post()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(RawFileItem.class);

        if (copied == null || copied.id == null) {
            throw new IllegalStateException("Failed to copy file on Google Drive");
        }
        return mapToFileDto(copied);
    }

    @Override
    public DriveDtos.DriveFileDto trashFile(String accessToken, String fileId, boolean trashed) {
        URI uri = UriComponentsBuilder.fromHttpUrl(DRIVE_API_BASE + "/files/" + fileId)
                .queryParam("supportsAllDrives", true)
                .queryParam("fields", FILE_FIELDS)
                .build().toUri();

        RawFileItem updated = restClient.patch()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("trashed", trashed))
                .retrieve()
                .body(RawFileItem.class);

        if (updated == null || updated.id == null) {
            throw new IllegalStateException("Failed to update trash state on Google Drive");
        }
        return mapToFileDto(updated);
    }

    @Override
    public void deleteFilePermanent(String accessToken, String fileId) {
        URI uri = UriComponentsBuilder.fromHttpUrl(DRIVE_API_BASE + "/files/" + fileId)
                .queryParam("supportsAllDrives", true)
                .build().toUri();

        restClient.delete()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .toBodilessEntity();
        log.info("Permanently deleted file {} on Google Drive", fileId);
    }

    @Override
    public List<DriveDtos.PermissionDto> listPermissions(String accessToken, String fileId) {
        URI uri = UriComponentsBuilder.fromHttpUrl(DRIVE_API_BASE + "/files/" + fileId + "/permissions")
                .queryParam("supportsAllDrives", true)
                .queryParam("fields", "permissions(id,type,role,emailAddress,displayName,photoLink)")
                .build().toUri();

        RawPermissionsList resp = restClient.get()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(RawPermissionsList.class);

        if (resp == null || resp.permissions == null) {
            return List.of();
        }
        return resp.permissions.stream().map(p -> new DriveDtos.PermissionDto(
                p.id, p.type, p.role, p.emailAddress, p.displayName, p.photoLink
        )).toList();
    }

    @Override
    public DriveDtos.PermissionDto createPermission(String accessToken, String fileId, String role,
                                                    String type, String emailAddress, Boolean sendNotificationEmail) {
        Map<String, Object> body = new HashMap<>();
        body.put("role", role);
        body.put("type", type);
        if (emailAddress != null && !emailAddress.isBlank()) {
            body.put("emailAddress", emailAddress.trim());
        }

        boolean sendNotification = Boolean.TRUE.equals(sendNotificationEmail);

        URI uri = UriComponentsBuilder.fromHttpUrl(DRIVE_API_BASE + "/files/" + fileId + "/permissions")
                .queryParam("supportsAllDrives", true)
                .queryParam("sendNotificationEmail", sendNotification)
                .queryParam("fields", "id,type,role,emailAddress,displayName,photoLink")
                .build().toUri();

        RawPermission created = restClient.post()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(RawPermission.class);

        if (created == null || created.id == null) {
            throw new IllegalStateException("Failed to create permission on Google Drive");
        }
        return new DriveDtos.PermissionDto(
                created.id, created.type, created.role, created.emailAddress, created.displayName, created.photoLink
        );
    }

    @Override
    public void deletePermission(String accessToken, String fileId, String permissionId) {
        URI uri = UriComponentsBuilder.fromHttpUrl(DRIVE_API_BASE + "/files/" + fileId + "/permissions/" + permissionId)
                .queryParam("supportsAllDrives", true)
                .build().toUri();

        restClient.delete()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .toBodilessEntity();
        log.info("Deleted permission {} on Google Drive file {}", permissionId, fileId);
    }

    private DriveDtos.DriveFileDto mapToFileDto(RawFileItem item) {
        long size = 0L;
        if (item.size != null && !item.size.isBlank()) {
            try {
                size = Long.parseLong(item.size);
            } catch (NumberFormatException ignored) {}
        }
        boolean isFolder = FOLDER_MIME_TYPE.equals(item.mimeType);
        boolean trashed = Boolean.TRUE.equals(item.trashed);
        boolean shared = Boolean.TRUE.equals(item.shared);

        List<String> owners = (item.owners != null)
                ? item.owners.stream().map(o -> {
                    if (o.displayName != null && o.emailAddress != null && !o.displayName.equalsIgnoreCase(o.emailAddress)) {
                        return o.displayName + " (" + o.emailAddress + ")";
                    }
                    return o.displayName != null ? o.displayName : o.emailAddress;
                }).filter(Objects::nonNull).toList()
                : List.of();

        DriveDtos.DriveCapabilitiesDto caps;
        if (item.capabilities != null) {
            caps = new DriveDtos.DriveCapabilitiesDto(
                    item.capabilities.canEdit != null ? item.capabilities.canEdit : true,
                    item.capabilities.canComment != null ? item.capabilities.canComment : true,
                    item.capabilities.canShare != null ? item.capabilities.canShare : true,
                    item.capabilities.canCopy != null ? item.capabilities.canCopy : true,
                    item.capabilities.canDelete != null ? item.capabilities.canDelete : true,
                    item.capabilities.canTrash != null ? item.capabilities.canTrash : true,
                    item.capabilities.canRename != null ? item.capabilities.canRename : true,
                    item.capabilities.canAddChildren != null ? item.capabilities.canAddChildren : true
            );
        } else {
            caps = DriveDtos.DriveCapabilitiesDto.defaultCapabilities();
        }

        return new DriveDtos.DriveFileDto(
                item.id,
                item.name != null ? item.name : "Untitled",
                item.mimeType != null ? item.mimeType : "application/octet-stream",
                size,
                item.parents != null ? item.parents : List.of(),
                item.modifiedTime,
                item.createdTime,
                item.thumbnailLink,
                item.webViewLink,
                item.webContentLink,
                item.iconLink,
                isFolder,
                trashed,
                shared,
                owners,
                caps
        );
    }

    private static String escapeQuery(String val) {
        if (val == null) return "";
        return val.replace("\\", "\\\\").replace("'", "\\'");
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class RawFileListResponse {
        public String nextPageToken;
        public List<RawFileItem> files;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class RawFileItem {
        public String id;
        public String name;
        public String mimeType;
        public String size;
        public List<String> parents;
        public String modifiedTime;
        public String createdTime;
        public String thumbnailLink;
        public String webViewLink;
        public String webContentLink;
        public String iconLink;
        public Boolean trashed;
        public Boolean shared;
        public List<RawOwner> owners;
        public RawCapabilities capabilities;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class RawOwner {
        public String displayName;
        public String emailAddress;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class RawCapabilities {
        public Boolean canEdit;
        public Boolean canComment;
        public Boolean canShare;
        public Boolean canCopy;
        public Boolean canDelete;
        public Boolean canTrash;
        public Boolean canRename;
        public Boolean canAddChildren;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class RawPermissionsList {
        public List<RawPermission> permissions;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class RawPermission {
        public String id;
        public String type;
        public String role;
        public String emailAddress;
        public String displayName;
        public String photoLink;
    }
}
