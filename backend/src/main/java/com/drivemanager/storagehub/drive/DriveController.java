package com.drivemanager.storagehub.drive;

import jakarta.validation.Valid;
import java.net.URI;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping(path = {"/api/drive-accounts/{accountId}", "/api/v1/drive-accounts/{accountId}"})
public class DriveController {

    private final DriveService driveService;

    public DriveController(DriveService driveService) {
        this.driveService = driveService;
    }

    @GetMapping("/files")
    public ResponseEntity<DriveDtos.DriveFileListResponse> listFiles(
            Principal principal,
            @PathVariable UUID accountId,
            @RequestParam(value = "parentId", defaultValue = "root") String parentId,
            @RequestParam(value = "pageToken", required = false) String pageToken,
            @RequestParam(value = "pageSize", defaultValue = "50") int pageSize) {
        var response = driveService.listFiles(principal.getName(), accountId, parentId, pageToken, pageSize);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<DriveDtos.DriveFileListResponse> searchFiles(
            Principal principal,
            @PathVariable UUID accountId,
            @RequestParam("q") String query,
            @RequestParam(value = "parentId", required = false) String parentId,
            @RequestParam(value = "pageToken", required = false) String pageToken,
            @RequestParam(value = "pageSize", defaultValue = "50") int pageSize) {
        var response = driveService.searchFiles(principal.getName(), accountId, query, parentId, pageToken, pageSize);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/files/{fileId}")
    public ResponseEntity<DriveDtos.DriveFileDto> getFile(
            Principal principal,
            @PathVariable UUID accountId,
            @PathVariable String fileId) {
        var response = driveService.getFile(principal.getName(), accountId, fileId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/files/{fileId}/content")
    public ResponseEntity<StreamingResponseBody> downloadContent(
            Principal principal,
            @PathVariable UUID accountId,
            @PathVariable String fileId,
            @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader,
            @RequestParam(value = "export", required = false) String exportFormat) {
        DriveDtos.DownloadResult result = driveService.downloadFile(principal.getName(), accountId, fileId, rangeHeader, exportFormat);

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.ACCEPT_RANGES, "bytes");
        headers.setContentType(MediaType.parseMediaType(result.mimeType()));

        if (result.contentLength() != null) {
            headers.setContentLength(result.contentLength());
        }

        String safeFilename = result.filename().replace("\"", "\\\"");
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + safeFilename + "\"");

        if (result.isPartial()) {
            headers.set(HttpHeaders.CONTENT_RANGE, "bytes " + result.startByte() + "-" + result.endByte() + "/" + result.totalSize());
        }

        HttpStatus status = result.isPartial() ? HttpStatus.PARTIAL_CONTENT : HttpStatus.OK;

        StreamingResponseBody body = outputStream -> {
            try (result) {
                result.stream().transferTo(outputStream);
            }
        };

        return new ResponseEntity<>(body, headers, status);
    }

    @PostMapping("/files")
    public ResponseEntity<DriveDtos.DriveFileDto> uploadFile(
            Principal principal,
            @PathVariable UUID accountId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "parentId", defaultValue = "root") String parentId,
            @RequestParam(value = "name", required = false) String name) {
        var uploaded = driveService.uploadFile(principal.getName(), accountId, file, parentId, name);
        return ResponseEntity.created(URI.create("/api/drive-accounts/" + accountId + "/files/" + uploaded.id())).body(uploaded);
    }

    @PostMapping("/folders")
    public ResponseEntity<DriveDtos.DriveFileDto> createFolder(
            Principal principal,
            @PathVariable UUID accountId,
            @Valid @RequestBody DriveDtos.CreateFolderRequest request) {
        var created = driveService.createFolder(principal.getName(), accountId, request.name(), request.parentId());
        return ResponseEntity.created(URI.create("/api/drive-accounts/" + accountId + "/files/" + created.id())).body(created);
    }

    @PatchMapping("/files/{fileId}")
    public ResponseEntity<DriveDtos.DriveFileDto> renameFile(
            Principal principal,
            @PathVariable UUID accountId,
            @PathVariable String fileId,
            @Valid @RequestBody DriveDtos.RenameFileRequest request) {
        var updated = driveService.renameFile(principal.getName(), accountId, fileId, request.name());
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/files/{fileId}/move")
    public ResponseEntity<DriveDtos.DriveFileDto> moveFile(
            Principal principal,
            @PathVariable UUID accountId,
            @PathVariable String fileId,
            @Valid @RequestBody DriveDtos.MoveFileRequest request) {
        var moved = driveService.moveFile(principal.getName(), accountId, fileId, request.newParentId(), request.oldParentId());
        return ResponseEntity.ok(moved);
    }

    @PostMapping("/files/{fileId}/copy")
    public ResponseEntity<DriveDtos.DriveFileDto> copyFile(
            Principal principal,
            @PathVariable UUID accountId,
            @PathVariable String fileId,
            @RequestBody(required = false) DriveDtos.CopyFileRequest request) {
        String name = request != null ? request.name() : null;
        String destFolder = request != null ? request.destinationFolderId() : null;
        var copied = driveService.copyFile(principal.getName(), accountId, fileId, name, destFolder);
        return ResponseEntity.created(URI.create("/api/drive-accounts/" + accountId + "/files/" + copied.id())).body(copied);
    }

    @PostMapping("/files/{fileId}/trash")
    public ResponseEntity<DriveDtos.DriveFileDto> trashFile(
            Principal principal,
            @PathVariable UUID accountId,
            @PathVariable String fileId,
            @RequestBody(required = false) DriveDtos.TrashRequest request) {
        boolean trashed = request == null || request.trashed();
        var result = driveService.trashFile(principal.getName(), accountId, fileId, trashed);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/files/{fileId}/restore")
    public ResponseEntity<DriveDtos.DriveFileDto> restoreFile(
            Principal principal,
            @PathVariable UUID accountId,
            @PathVariable String fileId) {
        var result = driveService.trashFile(principal.getName(), accountId, fileId, false);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<Void> deleteFile(
            Principal principal,
            @PathVariable UUID accountId,
            @PathVariable String fileId,
            @RequestParam(value = "permanent", defaultValue = "false") boolean permanent) {
        if (permanent) {
            driveService.deleteFilePermanent(principal.getName(), accountId, fileId);
        } else {
            driveService.trashFile(principal.getName(), accountId, fileId, true);
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/files/{fileId}/permissions")
    public ResponseEntity<List<DriveDtos.PermissionDto>> listPermissions(
            Principal principal,
            @PathVariable UUID accountId,
            @PathVariable String fileId) {
        var permissions = driveService.listPermissions(principal.getName(), accountId, fileId);
        return ResponseEntity.ok(permissions);
    }

    @PostMapping("/files/{fileId}/permissions")
    public ResponseEntity<DriveDtos.PermissionDto> createPermission(
            Principal principal,
            @PathVariable UUID accountId,
            @PathVariable String fileId,
            @Valid @RequestBody DriveDtos.CreatePermissionRequest request) {
        var permission = driveService.createPermission(principal.getName(), accountId, fileId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(permission);
    }

    @DeleteMapping("/files/{fileId}/permissions/{permissionId}")
    public ResponseEntity<Void> deletePermission(
            Principal principal,
            @PathVariable UUID accountId,
            @PathVariable String fileId,
            @PathVariable String permissionId) {
        driveService.deletePermission(principal.getName(), accountId, fileId, permissionId);
        return ResponseEntity.noContent().build();
    }
}
