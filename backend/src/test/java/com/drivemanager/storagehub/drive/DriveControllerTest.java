package com.drivemanager.storagehub.drive;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class DriveControllerTest {

    private MockMvc mockMvc;
    private DriveService driveService;
    private ObjectMapper objectMapper;
    private final UUID accountId = UUID.randomUUID();
    private final Principal principal = () -> "user@example.com";

    @BeforeEach
    void setUp() {
        driveService = mock(DriveService.class);
        DriveController controller = new DriveController(driveService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
    }

    @Test
    void testListFiles() throws Exception {
        DriveDtos.DriveCapabilitiesDto caps = DriveDtos.DriveCapabilitiesDto.defaultCapabilities();
        DriveDtos.DriveFileDto file = new DriveDtos.DriveFileDto(
                "file-1", "Test Folder", "application/vnd.google-apps.folder", 0L,
                List.of("root"), "2026-09-11T12:00:00Z", "2026-09-11T10:00:00Z",
                null, null, null, null, true, false, false, List.of("Me"), caps
        );
        DriveDtos.DriveFileListResponse response = new DriveDtos.DriveFileListResponse(List.of(file), "token123");

        when(driveService.listFiles(eq("user@example.com"), eq(accountId), eq("root"), isNull(), eq(50)))
                .thenReturn(response);

        mockMvc.perform(get("/api/drive-accounts/" + accountId + "/files")
                        .principal(principal)
                        .param("parentId", "root"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.files[0].id").value("file-1"))
                .andExpect(jsonPath("$.files[0].name").value("Test Folder"))
                .andExpect(jsonPath("$.files[0].isFolder").value(true))
                .andExpect(jsonPath("$.nextPageToken").value("token123"));
    }

    @Test
    void testSearchFiles() throws Exception {
        DriveDtos.DriveCapabilitiesDto caps = DriveDtos.DriveCapabilitiesDto.defaultCapabilities();
        DriveDtos.DriveFileDto file = new DriveDtos.DriveFileDto(
                "file-2", "report.pdf", "application/pdf", 1024L,
                List.of("root"), "2026-09-11T12:00:00Z", "2026-09-11T10:00:00Z",
                null, null, null, null, false, false, false, List.of("Me"), caps
        );
        DriveDtos.DriveFileListResponse response = new DriveDtos.DriveFileListResponse(List.of(file), null);

        when(driveService.searchFiles(eq("user@example.com"), eq(accountId), eq("report"), isNull(), isNull(), eq(50)))
                .thenReturn(response);

        mockMvc.perform(get("/api/drive-accounts/" + accountId + "/search")
                        .principal(principal)
                        .param("q", "report"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.files[0].id").value("file-2"))
                .andExpect(jsonPath("$.files[0].name").value("report.pdf"));
    }

    @Test
    void testGetFile() throws Exception {
        DriveDtos.DriveCapabilitiesDto caps = DriveDtos.DriveCapabilitiesDto.defaultCapabilities();
        DriveDtos.DriveFileDto file = new DriveDtos.DriveFileDto(
                "file-1", "doc.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                2048L, List.of("root"), "2026-09-11T12:00:00Z", "2026-09-11T10:00:00Z",
                null, "https://view.link", null, null, false, false, false, List.of("Me"), caps
        );

        when(driveService.getFile("user@example.com", accountId, "file-1")).thenReturn(file);

        mockMvc.perform(get("/api/drive-accounts/" + accountId + "/files/file-1")
                        .principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("file-1"))
                .andExpect(jsonPath("$.name").value("doc.docx"))
                .andExpect(jsonPath("$.webViewLink").value("https://view.link"));
    }

    @Test
    void testDownloadContent() throws Exception {
        byte[] content = "Hello Google Drive".getBytes(StandardCharsets.UTF_8);
        DriveDtos.DownloadResult dl = new DriveDtos.DownloadResult(
                new ByteArrayInputStream(content), "doc.txt", "text/plain", (long) content.length,
                false, null, null, (long) content.length
        );

        when(driveService.downloadFile(eq("user@example.com"), eq(accountId), eq("file-1"), isNull(), isNull()))
                .thenReturn(dl);

        MvcResult asyncResult = mockMvc.perform(get("/api/drive-accounts/" + accountId + "/files/file-1/content")
                        .principal(principal))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(asyncResult))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "inline; filename=\"doc.txt\""))
                .andExpect(header().string("Content-Type", "text/plain"))
                .andExpect(content().bytes(content));
    }

    @Test
    void testUploadFile() throws Exception {
        MockMultipartFile multipartFile = new MockMultipartFile(
                "file", "hello.txt", "text/plain", "content".getBytes(StandardCharsets.UTF_8)
        );

        DriveDtos.DriveCapabilitiesDto caps = DriveDtos.DriveCapabilitiesDto.defaultCapabilities();
        DriveDtos.DriveFileDto uploaded = new DriveDtos.DriveFileDto(
                "new-file-id", "hello.txt", "text/plain", 7L,
                List.of("root"), "2026-09-11T12:00:00Z", "2026-09-11T10:00:00Z",
                null, null, null, null, false, false, false, List.of("Me"), caps
        );

        when(driveService.uploadFile(eq("user@example.com"), eq(accountId), any(), eq("root"), isNull()))
                .thenReturn(uploaded);

        mockMvc.perform(multipart("/api/drive-accounts/" + accountId + "/files")
                        .file(multipartFile)
                        .principal(principal))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("new-file-id"))
                .andExpect(jsonPath("$.name").value("hello.txt"));
    }

    @Test
    void testCreateFolder() throws Exception {
        DriveDtos.CreateFolderRequest req = new DriveDtos.CreateFolderRequest("New Folder", "root");
        DriveDtos.DriveCapabilitiesDto caps = DriveDtos.DriveCapabilitiesDto.defaultCapabilities();
        DriveDtos.DriveFileDto created = new DriveDtos.DriveFileDto(
                "folder-id", "New Folder", "application/vnd.google-apps.folder", 0L,
                List.of("root"), "2026-09-11T12:00:00Z", "2026-09-11T10:00:00Z",
                null, null, null, null, true, false, false, List.of("Me"), caps
        );

        when(driveService.createFolder("user@example.com", accountId, "New Folder", "root")).thenReturn(created);

        mockMvc.perform(post("/api/drive-accounts/" + accountId + "/folders")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("folder-id"))
                .andExpect(jsonPath("$.name").value("New Folder"));
    }

    @Test
    void testRenameFile() throws Exception {
        DriveDtos.RenameFileRequest req = new DriveDtos.RenameFileRequest("renamed.txt");
        DriveDtos.DriveCapabilitiesDto caps = DriveDtos.DriveCapabilitiesDto.defaultCapabilities();
        DriveDtos.DriveFileDto updated = new DriveDtos.DriveFileDto(
                "file-1", "renamed.txt", "text/plain", 100L,
                List.of("root"), "2026-09-11T12:00:00Z", "2026-09-11T10:00:00Z",
                null, null, null, null, false, false, false, List.of("Me"), caps
        );

        when(driveService.renameFile("user@example.com", accountId, "file-1", "renamed.txt")).thenReturn(updated);

        mockMvc.perform(patch("/api/drive-accounts/" + accountId + "/files/file-1")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("renamed.txt"));
    }

    @Test
    void testMoveFile() throws Exception {
        DriveDtos.MoveFileRequest req = new DriveDtos.MoveFileRequest("target-folder", "old-folder");
        DriveDtos.DriveCapabilitiesDto caps = DriveDtos.DriveCapabilitiesDto.defaultCapabilities();
        DriveDtos.DriveFileDto moved = new DriveDtos.DriveFileDto(
                "file-1", "file.txt", "text/plain", 100L,
                List.of("target-folder"), "2026-09-11T12:00:00Z", "2026-09-11T10:00:00Z",
                null, null, null, null, false, false, false, List.of("Me"), caps
        );

        when(driveService.moveFile("user@example.com", accountId, "file-1", "target-folder", "old-folder")).thenReturn(moved);

        mockMvc.perform(post("/api/drive-accounts/" + accountId + "/files/file-1/move")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parents[0]").value("target-folder"));
    }

    @Test
    void testCopyFile() throws Exception {
        DriveDtos.CopyFileRequest req = new DriveDtos.CopyFileRequest("file copy.txt", "target-folder");
        DriveDtos.DriveCapabilitiesDto caps = DriveDtos.DriveCapabilitiesDto.defaultCapabilities();
        DriveDtos.DriveFileDto copied = new DriveDtos.DriveFileDto(
                "copy-id", "file copy.txt", "text/plain", 100L,
                List.of("target-folder"), "2026-09-11T12:00:00Z", "2026-09-11T10:00:00Z",
                null, null, null, null, false, false, false, List.of("Me"), caps
        );

        when(driveService.copyFile("user@example.com", accountId, "file-1", "file copy.txt", "target-folder")).thenReturn(copied);

        mockMvc.perform(post("/api/drive-accounts/" + accountId + "/files/file-1/copy")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("copy-id"))
                .andExpect(jsonPath("$.name").value("file copy.txt"));
    }

    @Test
    void testTrashAndRestoreFile() throws Exception {
        DriveDtos.DriveCapabilitiesDto caps = DriveDtos.DriveCapabilitiesDto.defaultCapabilities();
        DriveDtos.DriveFileDto trashed = new DriveDtos.DriveFileDto(
                "file-1", "file.txt", "text/plain", 100L,
                List.of("root"), "2026-09-11T12:00:00Z", "2026-09-11T10:00:00Z",
                null, null, null, null, false, true, false, List.of("Me"), caps
        );

        when(driveService.trashFile("user@example.com", accountId, "file-1", true)).thenReturn(trashed);

        mockMvc.perform(post("/api/drive-accounts/" + accountId + "/files/file-1/trash")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"trashed\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trashed").value(true));

        when(driveService.trashFile("user@example.com", accountId, "file-1", false)).thenReturn(trashed);

        mockMvc.perform(post("/api/drive-accounts/" + accountId + "/files/file-1/restore")
                        .principal(principal))
                .andExpect(status().isOk());
    }

    @Test
    void testDeleteFilePermanent() throws Exception {
        doNothing().when(driveService).deleteFilePermanent("user@example.com", accountId, "file-1");

        mockMvc.perform(delete("/api/drive-accounts/" + accountId + "/files/file-1?permanent=true")
                        .principal(principal))
                .andExpect(status().isNoContent());

        verify(driveService).deleteFilePermanent("user@example.com", accountId, "file-1");
    }

    @Test
    void testPermissions() throws Exception {
        DriveDtos.PermissionDto p = new DriveDtos.PermissionDto("perm-1", "user", "reader", "colleague@example.com", "Colleague", null);

        when(driveService.listPermissions("user@example.com", accountId, "file-1")).thenReturn(List.of(p));

        mockMvc.perform(get("/api/drive-accounts/" + accountId + "/files/file-1/permissions")
                        .principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("perm-1"))
                .andExpect(jsonPath("$[0].role").value("reader"))
                .andExpect(jsonPath("$[0].emailAddress").value("colleague@example.com"));

        DriveDtos.CreatePermissionRequest createReq = new DriveDtos.CreatePermissionRequest("writer", "user", "colleague@example.com", false);
        when(driveService.createPermission(eq("user@example.com"), eq(accountId), eq("file-1"), any())).thenReturn(p);

        mockMvc.perform(post("/api/drive-accounts/" + accountId + "/files/file-1/permissions")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("perm-1"));

        doNothing().when(driveService).deletePermission("user@example.com", accountId, "file-1", "perm-1");

        mockMvc.perform(delete("/api/drive-accounts/" + accountId + "/files/file-1/permissions/perm-1")
                        .principal(principal))
                .andExpect(status().isNoContent());
    }
}
