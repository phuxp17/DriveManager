package com.drivemanager.storagehub.drive;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import java.io.InputStream;
import java.util.List;

public class DriveDtos {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DriveCapabilitiesDto(
            Boolean canEdit,
            Boolean canComment,
            Boolean canShare,
            Boolean canCopy,
            Boolean canDelete,
            Boolean canTrash,
            Boolean canRename,
            Boolean canAddChildren
    ) {
        public static DriveCapabilitiesDto defaultCapabilities() {
            return new DriveCapabilitiesDto(true, true, true, true, true, true, true, true);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DriveFileDto(
            String id,
            String name,
            String mimeType,
            Long size,
            List<String> parents,
            String modifiedTime,
            String createdTime,
            String thumbnailLink,
            String webViewLink,
            String webContentLink,
            String iconLink,
            boolean isFolder,
            boolean trashed,
            boolean shared,
            List<String> owners,
            DriveCapabilitiesDto capabilities
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DriveFileListResponse(
            List<DriveFileDto> files,
            String nextPageToken
    ) {}

    public record CreateFolderRequest(
            @NotBlank(message = "Folder name is required") String name,
            String parentId
    ) {}

    public record RenameFileRequest(
            @NotBlank(message = "New name is required") String name
    ) {}

    public record MoveFileRequest(
            @NotBlank(message = "Destination folder ID is required") String newParentId,
            String oldParentId
    ) {}

    public record CopyFileRequest(
            String name,
            String destinationFolderId
    ) {}

    public record TrashRequest(
            boolean trashed
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PermissionDto(
            String id,
            String type,
            String role,
            String emailAddress,
            String displayName,
            String photoLink
    ) {}

    public record CreatePermissionRequest(
            @NotBlank(message = "Role is required (reader, commenter, writer)") String role,
            @NotBlank(message = "Type is required (user, anyone)") String type,
            String emailAddress,
            Boolean sendNotificationEmail
    ) {}

    public record DownloadResult(
            InputStream stream,
            String filename,
            String mimeType,
            Long contentLength,
            boolean isPartial,
            Long startByte,
            Long endByte,
            Long totalSize
    ) implements java.io.Closeable {
        @Override
        public void close() throws java.io.IOException {
            if (stream != null) {
                stream.close();
            }
        }
    }
}
