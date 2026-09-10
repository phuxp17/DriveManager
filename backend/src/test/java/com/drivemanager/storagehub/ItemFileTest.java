package com.drivemanager.storagehub;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.drivemanager.storagehub.item.ItemDtos;
import com.drivemanager.storagehub.storage.StorageProvider;
import com.drivemanager.storagehub.storage.credential.CredentialCipher;
import com.drivemanager.storagehub.storage.google.GoogleIdentity;
import com.drivemanager.storagehub.storage.google.GoogleIdentityValidator;
import com.drivemanager.storagehub.storage.google.GoogleOAuthClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@Import(ItemFileTest.MockStorageConfiguration.class)
class ItemFileTest {

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        StorageHubApplicationTest.databaseProperties(registry);
        registry.add("storage.credentials.active-version", () -> 1);
        registry.add("storage.credentials.keys.1", () -> Base64.getEncoder().encodeToString(new byte[32]));
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;
    @Autowired CredentialCipher cipher;
    @Autowired MockStorageProvider mockStorage;

    @Test
    void uploadFileSuccessAndVerifyMetadata() throws Exception {
        Browser user = browser();
        UUID connectionId = seedConnectedStorage(user.email());

        byte[] content = "Hello Spring Boot Storage Hub!".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "document.txt", "text/plain", content);

        MvcResult result = mvc.perform(multipart("/api/v1/items/files/upload")
                        .file(file)
                        .param("connectionId", connectionId.toString())
                        .param("name", "Custom Document")
                        .param("description", "A test text file")
                        .cookie(user.cookie())
                        .header(user.header(), user.token()))
                .andExpect(status().isCreated())
                .andExpect(header().exists(HttpHeaders.LOCATION))
                .andReturn();

        JsonNode response = mapper.readTree(result.getResponse().getContentAsString());
        assertThat(response.get("name").asText()).isEqualTo("Custom Document");
        assertThat(response.get("type").asText()).isEqualTo("FILE");
        assertThat(response.get("originalFilename").asText()).isEqualTo("document.txt");
        assertThat(response.get("mimeType").asText()).isEqualTo("text/plain");
        assertThat(response.get("sizeBytes").asLong()).isEqualTo(content.length);

        String itemId = response.get("id").asText();

        // Check GET item detail
        mvc.perform(get("/api/v1/items/" + itemId).cookie(user.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.originalFilename").value("document.txt"))
                .andExpect(jsonPath("$.sizeBytes").value(content.length));
    }

    @Test
    void uploadImageDeterminesImageType() throws Exception {
        Browser user = browser();
        UUID connectionId = seedConnectedStorage(user.email());

        byte[] content = new byte[]{1, 2, 3, 4};
        MockMultipartFile file = new MockMultipartFile("file", "picture.png", "image/png", content);

        MvcResult result = mvc.perform(multipart("/api/v1/items/files/upload")
                        .file(file)
                        .param("connectionId", connectionId.toString())
                        .cookie(user.cookie())
                        .header(user.header(), user.token()))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode response = mapper.readTree(result.getResponse().getContentAsString());
        assertThat(response.get("type").asText()).isEqualTo("IMAGE");
        assertThat(response.get("name").asText()).isEqualTo("picture.png");
    }

    @Test
    void uploadOverOneMegabyteReachesTheConfiguredFiftyMegabyteLimit() throws Exception {
        Browser user = browser();
        UUID connectionId = seedConnectedStorage(user.email());
        MockMultipartFile file = new MockMultipartFile("file", "large.bin", "application/octet-stream", new byte[2 * 1024 * 1024]);

        mvc.perform(multipart("/api/v1/items/files/upload").file(file)
                        .param("connectionId", connectionId.toString())
                        .cookie(user.cookie()).header(user.header(), user.token()))
                .andExpect(status().isCreated());
    }

    @Test
    void uploadInfersDocumentAudioAndArchiveTypes() throws Exception {
        Browser user = browser();
        UUID connectionId = seedConnectedStorage(user.email());
        MockMultipartFile audio = new MockMultipartFile("file", "voice.mp3", "audio/mpeg", new byte[] {1});
        MockMultipartFile archive = new MockMultipartFile("file", "files.zip", "application/zip", new byte[] {2});
        MockMultipartFile document = new MockMultipartFile("file", "report.pdf", "application/pdf", new byte[] {3});

        mvc.perform(multipart("/api/v1/items/files/upload").file(audio).param("connectionId", connectionId.toString())
                        .cookie(user.cookie()).header(user.header(), user.token()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.type").value("AUDIO"));
        mvc.perform(multipart("/api/v1/items/files/upload").file(archive).param("connectionId", connectionId.toString())
                        .cookie(user.cookie()).header(user.header(), user.token()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.type").value("ARCHIVE"));
        mvc.perform(multipart("/api/v1/items/files/upload").file(document).param("connectionId", connectionId.toString())
                        .cookie(user.cookie()).header(user.header(), user.token()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.type").value("DOCUMENT"));
    }

    @Test
    void uploadEmptyFileOrExceedingLimitIsRejected() throws Exception {
        Browser user = browser();
        UUID connectionId = seedConnectedStorage(user.email());

        // Empty file
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.txt", "text/plain", new byte[0]);
        mvc.perform(multipart("/api/v1/items/files/upload")
                        .file(emptyFile)
                        .param("connectionId", connectionId.toString())
                        .cookie(user.cookie())
                        .header(user.header(), user.token()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void importFileFromGoogleDriveSuccess() throws Exception {
        Browser user = browser();
        UUID connectionId = seedConnectedStorage(user.email());

        String driveId = "drive-import-xyz";
        byte[] content = "Existing Drive file content".getBytes(StandardCharsets.UTF_8);
        mockStorage.seedDriveFile(driveId, "notes.pdf", "application/pdf", content);

        ItemDtos.ImportFileRequest request = new ItemDtos.ImportFileRequest(
                connectionId, driveId, "Imported Notes", "Imported from Drive");

        MvcResult result = mvc.perform(post("/api/v1/items/files/import")
                        .cookie(user.cookie())
                        .header(user.header(), user.token())
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode response = mapper.readTree(result.getResponse().getContentAsString());
        assertThat(response.get("name").asText()).isEqualTo("Imported Notes");
        assertThat(response.get("type").asText()).isEqualTo("DOCUMENT");
        assertThat(response.get("originalFilename").asText()).isEqualTo("notes.pdf");
        assertThat(response.get("mimeType").asText()).isEqualTo("application/pdf");
        assertThat(response.get("sizeBytes").asLong()).isEqualTo(content.length);
    }

    @Test
    void crossUserStorageConnectionRejected() throws Exception {
        Browser userA = browser();
        Browser userB = browser();
        UUID connectionB = seedConnectedStorage(userB.email());

        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", "data".getBytes());

        // User A tries to upload using User B's connectionId -> 404
        mvc.perform(multipart("/api/v1/items/files/upload")
                        .file(file)
                        .param("connectionId", connectionB.toString())
                        .cookie(userA.cookie())
                        .header(userA.header(), userA.token()))
                .andExpect(status().isNotFound());
    }

    @Test
    void downloadFullAndRangeContent() throws Exception {
        Browser user = browser();
        UUID connectionId = seedConnectedStorage(user.email());

        byte[] content = "0123456789ABCDEFGHIJ".getBytes(StandardCharsets.UTF_8); // 20 bytes
        MockMultipartFile file = new MockMultipartFile("file", "data.bin", "application/octet-stream", content);

        MvcResult uploadRes = mvc.perform(multipart("/api/v1/items/files/upload")
                        .file(file)
                        .param("connectionId", connectionId.toString())
                        .cookie(user.cookie())
                        .header(user.header(), user.token()))
                .andExpect(status().isCreated())
                .andReturn();

        String itemId = mapper.readTree(uploadRes.getResponse().getContentAsString()).get("id").asText();

        // 1. Full download (200 OK)
        MvcResult fullDownload = mvc.perform(get("/api/v1/items/" + itemId + "/content").cookie(user.cookie()))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"))
                .andExpect(header().string(HttpHeaders.CONTENT_LENGTH, "20"))
                .andReturn();
        if (fullDownload.getRequest().isAsyncStarted()) {
            fullDownload = mvc.perform(asyncDispatch(fullDownload)).andReturn();
        }
        assertThat(fullDownload.getResponse().getContentAsByteArray()).isEqualTo(content);

        // 2. Partial download range: bytes=0-4 -> "01234"
        MvcResult rangeDownload = mvc.perform(get("/api/v1/items/" + itemId + "/content")
                        .cookie(user.cookie())
                        .header(HttpHeaders.RANGE, "bytes=0-4"))
                .andExpect(status().isPartialContent())
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes 0-4/20"))
                .andExpect(header().string(HttpHeaders.CONTENT_LENGTH, "5"))
                .andReturn();
        if (rangeDownload.getRequest().isAsyncStarted()) {
            rangeDownload = mvc.perform(asyncDispatch(rangeDownload)).andReturn();
        }
        assertThat(rangeDownload.getResponse().getContentAsString()).isEqualTo("01234");

        // 3. Partial download range: bytes=10-19 -> "ABCDEFGHIJ"
        MvcResult rangeSuffix = mvc.perform(get("/api/v1/items/" + itemId + "/content")
                        .cookie(user.cookie())
                        .header(HttpHeaders.RANGE, "bytes=10-19"))
                .andExpect(status().isPartialContent())
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes 10-19/20"))
                .andExpect(header().string(HttpHeaders.CONTENT_LENGTH, "10"))
                .andReturn();
        if (rangeSuffix.getRequest().isAsyncStarted()) {
            rangeSuffix = mvc.perform(asyncDispatch(rangeSuffix)).andReturn();
        }
        assertThat(rangeSuffix.getResponse().getContentAsString()).isEqualTo("ABCDEFGHIJ");

        // 4. Unsatisfiable range -> 416
        mvc.perform(get("/api/v1/items/" + itemId + "/content")
                        .cookie(user.cookie())
                        .header(HttpHeaders.RANGE, "bytes=50-100"))
                .andExpect(status().isRequestedRangeNotSatisfiable());
        mvc.perform(get("/api/v1/items/" + itemId + "/content")
                        .cookie(user.cookie())
                        .header(HttpHeaders.RANGE, "bytes=0-abc"))
                .andExpect(status().isRequestedRangeNotSatisfiable())
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes */20"));

        // 5. Trashed item download -> 404
        mvc.perform(delete("/api/v1/items/" + itemId).cookie(user.cookie()).header(user.header(), user.token()))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/items/" + itemId + "/content").cookie(user.cookie()))
                .andExpect(status().isNotFound());
    }

    @Test
    void downloadForeignItemReturnsNotFound() throws Exception {
        Browser userA = browser();
        Browser userB = browser();
        UUID connectionA = seedConnectedStorage(userA.email());

        MockMultipartFile file = new MockMultipartFile("file", "secret.txt", "text/plain", "classified".getBytes());
        MvcResult uploadRes = mvc.perform(multipart("/api/v1/items/files/upload")
                        .file(file)
                        .param("connectionId", connectionA.toString())
                        .cookie(userA.cookie())
                        .header(userA.header(), userA.token()))
                .andExpect(status().isCreated())
                .andReturn();

        String itemId = mapper.readTree(uploadRes.getResponse().getContentAsString()).get("id").asText();

        // User B tries to download User A's item -> 404
        mvc.perform(get("/api/v1/items/" + itemId + "/content").cookie(userB.cookie()))
                .andExpect(status().isNotFound());
    }

    private UUID seedConnectedStorage(String email) {
        UUID userId = jdbc.queryForObject("SELECT id FROM users WHERE normalized_email = ?", UUID.class, email);
        UUID connectionId = UUID.randomUUID();
        byte[] encryptedRefresh = cipher.encrypt(connectionId, "refresh-token-mock");
        jdbc.update("INSERT INTO storage_connections (id, owner_id, provider, provider_issuer, provider_subject, display_name, granted_scopes, encrypted_refresh_token, status, version, created_at, updated_at) "
                        + "VALUES (?, ?, 'GOOGLE', 'https://accounts.google.com', ?, 'Test Drive', 'openid email https://www.googleapis.com/auth/drive.file', ?, 'CONNECTED', 0, now(), now())",
                connectionId, userId, "subject-" + UUID.randomUUID(), encryptedRefresh);
        return connectionId;
    }

    private Browser browser() throws Exception {
        var csrf = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        Cookie cookie = csrf.getResponse().getCookie("SESSION");
        var token = mapper.readTree(csrf.getResponse().getContentAsString());
        String email = "file-" + UUID.randomUUID() + "@example.com";
        String body = mapper.writeValueAsString(Map.of("email", email, "password", "test-password-123", "displayName", "User"));
        mvc.perform(post("/api/v1/auth/register").cookie(cookie)
                        .header(token.get("headerName").asText(), token.get("token").asText()).contentType("application/json").content(body))
                .andExpect(status().isCreated());
        var login = mvc.perform(post("/api/v1/auth/login").cookie(cookie)
                        .header(token.get("headerName").asText(), token.get("token").asText()).contentType("application/json").content(body))
                .andExpect(status().isOk()).andReturn();
        cookie = login.getResponse().getCookie("SESSION");
        token = mapper.readTree(mvc.perform(get("/api/v1/auth/csrf").cookie(cookie)).andReturn().getResponse().getContentAsString());
        return new Browser(email, cookie, token.get("headerName").asText(), token.get("token").asText());
    }

    private record Browser(String email, Cookie cookie, String header, String token) {}

    @TestConfiguration
    static class MockStorageConfiguration {
        @Bean @Primary
        MockGoogleOAuthClient mockGoogleOAuthClient() {
            return new MockGoogleOAuthClient();
        }
        @Bean @Primary
        MockGoogleIdentityValidator mockGoogleIdentityValidator() {
            return new MockGoogleIdentityValidator();
        }
        @Bean @Primary
        MockStorageProvider mockStorageProvider() {
            return new MockStorageProvider();
        }
    }

    static class MockGoogleOAuthClient implements GoogleOAuthClient {
        @Override
        public String authorizationUrl(String state, String challenge) {
            return "https://accounts.google.com/o/oauth2/v2/auth?state=" + state;
        }
        @Override
        public GoogleToken exchange(String code, String verifier) {
            return new GoogleToken("id-token", "refresh-token", "openid email https://www.googleapis.com/auth/drive.file");
        }
        @Override
        public GoogleRefreshResponse refresh(String refreshToken) {
            return new GoogleRefreshResponse("fresh-access-token", null, 3600);
        }
    }

    static class MockGoogleIdentityValidator implements GoogleIdentityValidator {
        @Override
        public GoogleIdentity validate(String idToken) {
            return new GoogleIdentity("https://accounts.google.com", "google-sub", "google-user@example.com");
        }
    }

    static class MockStorageProvider implements StorageProvider {
        private final Map<String, StoredFile> files = new ConcurrentHashMap<>();

        public void seedDriveFile(String driveFileId, String filename, String mimeType, byte[] data) {
            String md5 = md5(data);
            files.put(driveFileId, new StoredFile(driveFileId, filename, mimeType, data, md5));
        }

        @Override
        public String providerName() { return "GOOGLE"; }

        @Override
        public boolean isConfigured() { return true; }

        @Override
        public FileUploadResult uploadStream(String accessToken, String filename, String mimeType, InputStream contentStream, long sizeBytes) {
            try {
                byte[] data = contentStream.readAllBytes();
                String driveId = "drive-" + UUID.randomUUID();
                String md5 = md5(data);
                files.put(driveId, new StoredFile(driveId, filename, mimeType, data, md5));
                return new FileUploadResult(driveId, filename, mimeType, data.length, md5);
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        }

        @Override
        public FileMetadata getFileMetadata(String accessToken, String driveFileId) {
            StoredFile f = files.get(driveFileId);
            if (f == null) throw new IllegalArgumentException("File not found: " + driveFileId);
            return new FileMetadata(f.id, f.filename, f.mimeType, f.data.length, f.md5);
        }

        @Override
        public InputStream downloadStream(String accessToken, String driveFileId, Long startByte, Long endByte) {
            StoredFile f = files.get(driveFileId);
            if (f == null) throw new IllegalArgumentException("File not found: " + driveFileId);
            int start = startByte != null ? startByte.intValue() : 0;
            int end = endByte != null ? endByte.intValue() : f.data.length - 1;
            int length = Math.max(0, end - start + 1);
            byte[] slice = Arrays.copyOfRange(f.data, start, start + length);
            return new ByteArrayInputStream(slice);
        }

        private static String md5(byte[] data) {
            try {
                byte[] hash = MessageDigest.getInstance("MD5").digest(data);
                return HexFormat.of().formatHex(hash);
            } catch (Exception e) {
                return "";
            }
        }

        private record StoredFile(String id, String filename, String mimeType, byte[] data, String md5) {}
    }
}
