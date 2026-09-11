package com.drivemanager.storagehub;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.drivemanager.storagehub.contact.ContactDtos;
import com.drivemanager.storagehub.item.ItemDtos;
import com.drivemanager.storagehub.sharing.SharingDtos;
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
@Import(SharingTest.MockSharingTestConfig.class)
class SharingTest {

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
    void contactsLifecycle() throws Exception {
        Browser userA = browser();
        Browser userB = browser();

        // 1. Add contact
        ContactDtos.AddContactRequest request = new ContactDtos.AddContactRequest(userB.email(), "Friend Bob");
        MvcResult addRes = mvc.perform(post("/api/v1/contacts")
                        .cookie(userA.cookie()).header(userA.header(), userA.token())
                        .contentType("application/json").content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode contactJson = mapper.readTree(addRes.getResponse().getContentAsString());
        assertThat(contactJson.get("email").asText()).isEqualTo(userB.email());
        assertThat(contactJson.get("alias").asText()).isEqualTo("Friend Bob");

        // 2. List contacts
        MvcResult listRes = mvc.perform(get("/api/v1/contacts").cookie(userA.cookie()))
                .andExpect(status().isOk()).andReturn();
        JsonNode contactsList = mapper.readTree(listRes.getResponse().getContentAsString());
        assertThat(contactsList.isArray()).isTrue();
        assertThat(contactsList.size()).isGreaterThanOrEqualTo(1);

        // 3. Add yourself -> 400
        mvc.perform(post("/api/v1/contacts")
                        .cookie(userA.cookie()).header(userA.header(), userA.token())
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(new ContactDtos.AddContactRequest(userA.email(), "Myself"))))
                .andExpect(status().isBadRequest());

        // 4. Remove contact
        String contactUserId = contactJson.get("contactUserId").asText();
        mvc.perform(delete("/api/v1/contacts/" + contactUserId)
                        .cookie(userA.cookie()).header(userA.header(), userA.token()))
                .andExpect(status().isNoContent());
    }

    @Test
    void directItemSharingLifecycleAndContentAccess() throws Exception {
        Browser owner = browser();
        Browser recipient = browser();
        Browser stranger = browser();

        UUID connectionId = seedConnectedStorage(owner.email());

        // 1. Owner uploads a file
        byte[] content = "Shared Secret Report 2026".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "report.pdf", "application/pdf", content);
        MvcResult uploadRes = mvc.perform(multipart("/api/v1/items/files/upload")
                        .file(file)
                        .param("connectionId", connectionId.toString())
                        .param("name", "Q3 Report")
                        .cookie(owner.cookie()).header(owner.header(), owner.token()))
                .andExpect(status().isCreated())
                .andReturn();
        String itemId = mapper.readTree(uploadRes.getResponse().getContentAsString()).get("id").asText();

        // Recipient has no access before sharing
        mvc.perform(get("/api/v1/items/" + itemId).cookie(recipient.cookie())).andExpect(status().isNotFound());

        // 2. Owner invites recipient to view item
        SharingDtos.CreateShareRequest shareReq = new SharingDtos.CreateShareRequest(
                SharingDtos.CreateShareRequest.class.cast(new SharingDtos.CreateShareRequest(
                        com.drivemanager.storagehub.sharing.Share.TargetType.ITEM,
                        UUID.fromString(itemId), recipient.email())).targetType(),
                UUID.fromString(itemId), recipient.email());

        MvcResult shareRes = mvc.perform(post("/api/v1/shares")
                        .cookie(owner.cookie()).header(owner.header(), owner.token())
                        .contentType("application/json").content(mapper.writeValueAsString(shareReq)))
                .andExpect(status().isCreated())
                .andReturn();
        String shareId = mapper.readTree(shareRes.getResponse().getContentAsString()).get("id").asText();

        // Recipient sees incoming pending share
        MvcResult incomingRes = mvc.perform(get("/api/v1/shares/incoming").cookie(recipient.cookie()))
                .andExpect(status().isOk()).andReturn();
        JsonNode incoming = mapper.readTree(incomingRes.getResponse().getContentAsString());
        assertThat(incoming.size()).isGreaterThanOrEqualTo(1);

        // Before accepting, access still not granted
        mvc.perform(get("/api/v1/items/" + itemId).cookie(recipient.cookie())).andExpect(status().isNotFound());

        // 3. Recipient accepts share
        mvc.perform(post("/api/v1/shares/" + shareId + "/accept")
                        .cookie(recipient.cookie()).header(recipient.header(), recipient.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        // 4. Recipient can now read item detail
        MvcResult detailRes = mvc.perform(get("/api/v1/items/" + itemId).cookie(recipient.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Q3 Report"))
                .andExpect(jsonPath("$.originalFilename").value("report.pdf"))
                .andExpect(jsonPath("$.sizeBytes").value(content.length))
                .andReturn();

        // Assert NO storage connection ID or token is leaked in response
        String detailBody = detailRes.getResponse().getContentAsString();
        assertThat(detailBody).doesNotContain(connectionId.toString());
        assertThat(detailBody).doesNotContain("storageConnectionId");
        assertThat(detailBody).doesNotContain("refresh-token");

        // 5. Recipient downloads binary content without having any Google connection!
        MvcResult asyncRes = mvc.perform(get("/api/v1/items/" + itemId + "/content")
                        .cookie(recipient.cookie()))
                .andExpect(request().asyncStarted())
                .andReturn();

        MvcResult downloadRes = mvc.perform(asyncDispatch(asyncRes))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_LENGTH, String.valueOf(content.length)))
                .andReturn();
        assertThat(downloadRes.getResponse().getContentAsByteArray()).isEqualTo(content);

        // 6. Recipient CANNOT mutate the shared item
        mvc.perform(patch("/api/v1/items/" + itemId)
                        .cookie(recipient.cookie()).header(recipient.header(), recipient.token())
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(Map.of("name", "Hacked Name", "expectedVersion", 0))))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/v1/items/" + itemId)
                        .cookie(recipient.cookie()).header(recipient.header(), recipient.token()))
                .andExpect(status().isNotFound());

        // 7. Stranger has no access
        mvc.perform(get("/api/v1/items/" + itemId).cookie(stranger.cookie())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/items/" + itemId + "/content").cookie(stranger.cookie())).andExpect(status().isNotFound());

        // 8. Recipient personal state (Favorite & Open & Shared View)
        mvc.perform(put("/api/v1/users/me/favorites/" + itemId)
                        .cookie(recipient.cookie()).header(recipient.header(), recipient.token()))
                .andExpect(status().isNoContent());

        mvc.perform(post("/api/v1/items/" + itemId + "/opens")
                        .cookie(recipient.cookie()).header(recipient.header(), recipient.token()))
                .andExpect(status().isNoContent());

        // Recipient's view=favorites includes this item
        mvc.perform(get("/api/v1/items?view=favorites").cookie(recipient.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        // Recipient's view=shared includes this item
        mvc.perform(get("/api/v1/items?view=shared").cookie(recipient.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        // Owner's favorites does not include this item
        mvc.perform(get("/api/v1/items?view=favorites").cookie(owner.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        // 9. Owner revokes share
        mvc.perform(delete("/api/v1/shares/" + shareId)
                        .cookie(owner.cookie()).header(owner.header(), owner.token()))
                .andExpect(status().isNoContent());

        // Recipient loses access immediately
        mvc.perform(get("/api/v1/items/" + itemId).cookie(recipient.cookie()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/items/" + itemId + "/content").cookie(recipient.cookie()))
                .andExpect(status().isNotFound());
    }

    @Test
    void inheritedCollectionSharingGrantsAndRevokesAccess() throws Exception {
        Browser owner = browser();
        Browser recipient = browser();

        // 1. Owner creates a Collection
        MvcResult colRes = mvc.perform(post("/api/v1/collections")
                        .cookie(owner.cookie()).header(owner.header(), owner.token())
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(Map.of("name", "Project Alpha"))))
                .andExpect(status().isCreated())
                .andReturn();
        String collectionId = mapper.readTree(colRes.getResponse().getContentAsString()).get("id").asText();

        // 2. Owner creates a child collection and puts an Item in it.
        MvcResult childRes = mvc.perform(post("/api/v1/collections")
                        .cookie(owner.cookie()).header(owner.header(), owner.token())
                        .contentType("application/json").content(mapper.writeValueAsString(Map.of("name", "Child", "parentId", collectionId))))
                .andExpect(status().isCreated()).andReturn();
        String childId = mapper.readTree(childRes.getResponse().getContentAsString()).get("id").asText();

        // 3. Owner creates an Item and adds to the child collection
        MvcResult linkRes = mvc.perform(post("/api/v1/items/links")
                        .cookie(owner.cookie()).header(owner.header(), owner.token())
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(Map.of("name", "Alpha Specs", "url", "https://example.com/alpha"))))
                .andExpect(status().isCreated())
                .andReturn();
        String itemId = mapper.readTree(linkRes.getResponse().getContentAsString()).get("id").asText();

        mvc.perform(put("/api/v1/collections/" + childId + "/items/" + itemId)
                        .cookie(owner.cookie()).header(owner.header(), owner.token()))
                .andExpect(status().isNoContent());

        // Recipient has no access before collection share
        mvc.perform(get("/api/v1/items/" + itemId).cookie(recipient.cookie())).andExpect(status().isNotFound());

        // 3. Owner shares Collection with recipient
        SharingDtos.CreateShareRequest shareReq = new SharingDtos.CreateShareRequest(
                com.drivemanager.storagehub.sharing.Share.TargetType.COLLECTION,
                UUID.fromString(collectionId), recipient.email());

        MvcResult shareRes = mvc.perform(post("/api/v1/shares")
                        .cookie(owner.cookie()).header(owner.header(), owner.token())
                        .contentType("application/json").content(mapper.writeValueAsString(shareReq)))
                .andExpect(status().isCreated())
                .andReturn();
        String shareId = mapper.readTree(shareRes.getResponse().getContentAsString()).get("id").asText();

        // Recipient accepts collection share
        mvc.perform(post("/api/v1/shares/" + shareId + "/accept")
                        .cookie(recipient.cookie()).header(recipient.header(), recipient.token()))
                .andExpect(status().isOk());

        // 4. Recipient inherits VIEW access to Item inside Collection
        mvc.perform(get("/api/v1/items/" + itemId).cookie(recipient.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alpha Specs"));
        mvc.perform(get("/api/v1/items?view=shared").cookie(recipient.cookie()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));

        // 5. Soft-deleting the shared collection revokes inherited access even though memberships are retained.
        mvc.perform(delete("/api/v1/collections/" + collectionId)
                        .cookie(owner.cookie()).header(owner.header(), owner.token()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/items/" + itemId).cookie(recipient.cookie())).andExpect(status().isNotFound());

        mvc.perform(post("/api/v1/collections/" + collectionId + "/restore")
                        .cookie(owner.cookie()).header(owner.header(), owner.token()))
                .andExpect(status().isNoContent());

        // 6. Owner removes Item from Collection -> recipient loses access
        mvc.perform(delete("/api/v1/collections/" + childId + "/items/" + itemId)
                        .cookie(owner.cookie()).header(owner.header(), owner.token()))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/items/" + itemId).cookie(recipient.cookie()))
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
        String email = "share-" + UUID.randomUUID() + "@example.com";
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
    static class MockSharingTestConfig {
        @Bean @Primary
        MockGoogleOAuthClient mockGoogleOAuthClient() { return new MockGoogleOAuthClient(); }
        @Bean @Primary
        MockGoogleIdentityValidator mockGoogleIdentityValidator() { return new MockGoogleIdentityValidator(); }
        @Bean @Primary
        MockStorageProvider mockStorageProvider() { return new MockStorageProvider(); }
    }

    static class MockGoogleOAuthClient implements GoogleOAuthClient {
        @Override
        public String authorizationUrl(String state, String challenge) { return "https://accounts.google.com"; }
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
        private final Map<String, byte[]> files = new ConcurrentHashMap<>();

        @Override
        public String providerName() { return "GOOGLE"; }
        @Override
        public boolean isConfigured() { return true; }

        @Override
        public FileUploadResult uploadStream(String accessToken, String filename, String mimeType, InputStream contentStream, long sizeBytes) {
            try {
                byte[] data = contentStream.readAllBytes();
                String driveId = "drive-" + UUID.randomUUID();
                files.put(driveId, data);
                return new FileUploadResult(driveId, filename, mimeType, data.length, md5(data));
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        }

        @Override
        public FileMetadata getFileMetadata(String accessToken, String driveFileId) {
            byte[] data = files.get(driveFileId);
            if (data == null) throw new IllegalArgumentException("File not found: " + driveFileId);
            return new FileMetadata(driveFileId, "file.bin", "application/octet-stream", data.length, md5(data));
        }

        @Override
        public InputStream downloadStream(String accessToken, String driveFileId, Long startByte, Long endByte) {
            byte[] data = files.get(driveFileId);
            if (data == null) throw new IllegalArgumentException("File not found: " + driveFileId);
            int start = startByte != null ? startByte.intValue() : 0;
            int end = endByte != null ? endByte.intValue() : data.length - 1;
            int length = Math.max(0, end - start + 1);
            byte[] slice = Arrays.copyOfRange(data, start, start + length);
            return new ByteArrayInputStream(slice);
        }

        @Override
        public StorageQuota getStorageQuota(String accessToken) {
            long used = files.values().stream().mapToLong(b -> b.length).sum();
            return new StorageQuota(15L * 1024 * 1024 * 1024, used, used);
        }

        @Override
        public DriveFileList listFiles(String accessToken, String pageToken, int pageSize) {
            var list = files.entrySet().stream()
                    .map(e -> new DriveFileItem(e.getKey(), "file.bin", "application/octet-stream", (long) e.getValue().length, md5(e.getValue()), "https://drive.google.com/file/d/" + e.getKey() + "/view", false))
                    .toList();
            return new DriveFileList(list, null);
        }

        private static String md5(byte[] data) {
            try {
                byte[] hash = MessageDigest.getInstance("MD5").digest(data);
                return HexFormat.of().formatHex(hash);
            } catch (Exception e) {
                return "";
            }
        }
    }
}
