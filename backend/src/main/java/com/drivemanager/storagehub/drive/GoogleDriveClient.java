package com.drivemanager.storagehub.drive;

import java.io.InputStream;
import java.util.List;

public interface GoogleDriveClient {

    DriveDtos.DriveFileListResponse listFiles(String accessToken, String parentId, String pageToken, int pageSize);

    DriveDtos.DriveFileListResponse searchFiles(String accessToken, String query, String parentId, String pageToken, int pageSize);

    DriveDtos.DriveFileDto getFile(String accessToken, String fileId);

    InputStream downloadStream(String accessToken, String fileId, Long startByte, Long endByte);

    InputStream exportDocumentStream(String accessToken, String fileId, String exportMimeType);

    DriveDtos.DriveFileDto uploadResumable(String accessToken, String filename, String mimeType, String parentId, InputStream contentStream, long sizeBytes);

    DriveDtos.DriveFileDto createFolder(String accessToken, String name, String parentId);

    DriveDtos.DriveFileDto renameFile(String accessToken, String fileId, String newName);

    DriveDtos.DriveFileDto moveFile(String accessToken, String fileId, String newParentId, String oldParentId);

    DriveDtos.DriveFileDto copyFile(String accessToken, String fileId, String newName, String destinationFolderId);

    DriveDtos.DriveFileDto trashFile(String accessToken, String fileId, boolean trashed);

    void deleteFilePermanent(String accessToken, String fileId);

    List<DriveDtos.PermissionDto> listPermissions(String accessToken, String fileId);

    DriveDtos.PermissionDto createPermission(String accessToken, String fileId, String role, String type, String emailAddress, Boolean sendNotificationEmail);

    void deletePermission(String accessToken, String fileId, String permissionId);
}
