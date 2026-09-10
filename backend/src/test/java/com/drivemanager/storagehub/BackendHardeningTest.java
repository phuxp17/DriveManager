package com.drivemanager.storagehub;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.drivemanager.storagehub.common.ratelimit.RateLimiter;
import com.drivemanager.storagehub.item.ItemDtos;
import com.drivemanager.storagehub.sharing.SharingDtos;
import com.drivemanager.storagehub.storage.credential.CredentialCipher;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
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
class BackendHardeningTest {

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        StorageHubApplicationTest.databaseProperties(registry);
        registry.add("storage.credentials.active-version", () -> 1);
        registry.add("storage.credentials.keys.1", () -> Base64.getEncoder().encodeToString(new byte[32]));
        registry.add("security.rate-limit.auth-limit", () -> 15);
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;
    @Autowired CredentialCipher cipher;
    @Autowired RateLimiter rateLimiter;

    @Test
    void itemAndLinkIdorProtectionAcrossLifecycle() throws Exception {
        Browser userA = browser();
        Browser userB = browser();

        // User A creates a Link Item
        String linkBody = mapper.writeValueAsString(Map.of(
                "name", "Private Link A",
                "description", "Confidential bookmark",
                "url", "https://internal.corp/secret"
        ));
        MvcResult createRes = mvc.perform(post("/api/v1/items/links")
                        .cookie(userA.cookie()).header(userA.header(), userA.token())
                        .contentType("application/json").content(linkBody))
                .andExpect(status().isCreated())
                .andReturn();
        String itemId = mapper.readTree(createRes.getResponse().getContentAsString()).get("id").asText();

        // User B attempts IDOR on User A's item -> All must return 404 NOT_FOUND
        mvc.perform(get("/api/v1/items/" + itemId).cookie(userB.cookie()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mvc.perform(patch("/api/v1/items/" + itemId)
                        .cookie(userB.cookie()).header(userB.header(), userB.token())
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(Map.of("name", "Hacked Name", "expectedVersion", 0))))
                .andExpect(status().isNotFound());

        mvc.perform(put("/api/v1/items/" + itemId + "/archive")
                        .cookie(userB.cookie()).header(userB.header(), userB.token()))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/v1/items/" + itemId + "/archive")
                        .cookie(userB.cookie()).header(userB.header(), userB.token()))
                .andExpect(status().isNotFound());

        mvc.perform(put("/api/v1/items/" + itemId + "/review")
                        .cookie(userB.cookie()).header(userB.header(), userB.token()))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/v1/items/" + itemId + "/review")
                        .cookie(userB.cookie()).header(userB.header(), userB.token()))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/v1/items/" + itemId)
                        .cookie(userB.cookie()).header(userB.header(), userB.token()))
                .andExpect(status().isNotFound());

        mvc.perform(post("/api/v1/trash/items/" + itemId + "/restore")
                        .cookie(userB.cookie()).header(userB.header(), userB.token()))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/v1/trash/items/" + itemId)
                        .cookie(userB.cookie()).header(userB.header(), userB.token()))
                .andExpect(status().isNotFound());

        // User A successfully archives, trashes, and purges
        mvc.perform(delete("/api/v1/items/" + itemId)
                        .cookie(userA.cookie()).header(userA.header(), userA.token()))
                .andExpect(status().isNoContent());

        mvc.perform(delete("/api/v1/trash/items/" + itemId)
                        .cookie(userA.cookie()).header(userA.header(), userA.token()))
                .andExpect(status().isNoContent());
    }

    @Test
    void collectionAndTagIdorProtection() throws Exception {
        Browser userA = browser();
        Browser userB = browser();

        // User A creates a Collection and a Tag
        MvcResult colRes = mvc.perform(post("/api/v1/collections")
                        .cookie(userA.cookie()).header(userA.header(), userA.token())
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(Map.of("name", "Confidential Folder"))))
                .andExpect(status().isCreated())
                .andReturn();
        String colId = mapper.readTree(colRes.getResponse().getContentAsString()).get("id").asText();

        MvcResult tagRes = mvc.perform(post("/api/v1/tags")
                        .cookie(userA.cookie()).header(userA.header(), userA.token())
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(Map.of("name", "Classified", "color", "#FF0000"))))
                .andExpect(status().isCreated())
                .andReturn();
        String tagId = mapper.readTree(tagRes.getResponse().getContentAsString()).get("id").asText();

        // User B attempts IDOR on User A's collection -> 404
        mvc.perform(get("/api/v1/collections/" + colId).cookie(userB.cookie()))
                .andExpect(status().isNotFound());

        mvc.perform(get("/api/v1/collections/" + colId + "/ancestors").cookie(userB.cookie()))
                .andExpect(status().isNotFound());

        mvc.perform(patch("/api/v1/collections/" + colId)
                        .cookie(userB.cookie()).header(userB.header(), userB.token())
                        .contentType("application/json").content(mapper.writeValueAsString(Map.of("name", "Stolen Folder"))))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/v1/collections/" + colId)
                        .cookie(userB.cookie()).header(userB.header(), userB.token()))
                .andExpect(status().isNotFound());

        mvc.perform(post("/api/v1/collections/" + colId + "/restore")
                        .cookie(userB.cookie()).header(userB.header(), userB.token()))
                .andExpect(status().isNotFound());

        // User B attempts IDOR on User A's tag -> 404
        mvc.perform(patch("/api/v1/tags/" + tagId)
                        .cookie(userB.cookie()).header(userB.header(), userB.token())
                        .contentType("application/json").content(mapper.writeValueAsString(Map.of("name", "Stolen Tag"))))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/v1/tags/" + tagId)
                        .cookie(userB.cookie()).header(userB.header(), userB.token()))
                .andExpect(status().isNotFound());

        // User B creates a tag and tries to merge User A's tag -> 404
        MvcResult bTagRes = mvc.perform(post("/api/v1/tags")
                        .cookie(userB.cookie()).header(userB.header(), userB.token())
                        .contentType("application/json").content(mapper.writeValueAsString(Map.of("name", "User B Tag"))))
                .andExpect(status().isCreated())
                .andReturn();
        String bTagId = mapper.readTree(bTagRes.getResponse().getContentAsString()).get("id").asText();

        mvc.perform(post("/api/v1/tags/" + tagId + "/merge")
                        .cookie(userB.cookie()).header(userB.header(), userB.token())
                        .contentType("application/json").content(mapper.writeValueAsString(Map.of("targetId", bTagId))))
                .andExpect(status().isNotFound());
    }

    @Test
    void storageConnectionIdorAndUploadIsolation() throws Exception {
        Browser userA = browser();
        Browser userB = browser();

        UUID connectionA = seedConnectedStorage(userA.email());

        // User B cannot see User A's storage connection
        MvcResult bList = mvc.perform(get("/api/v1/storage-connections").cookie(userB.cookie()))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode arr = mapper.readTree(bList.getResponse().getContentAsString());
        assertThat(arr.toString()).doesNotContain(connectionA.toString());

        // User B cannot disconnect User A's storage connection
        mvc.perform(delete("/api/v1/storage-connections/" + connectionA)
                        .cookie(userB.cookie()).header(userB.header(), userB.token()))
                .andExpect(status().isNotFound());

        // User B cannot upload using User A's storage connection
        MockMultipartFile file = new MockMultipartFile("file", "exploit.txt", "text/plain", "data".getBytes());
        mvc.perform(multipart("/api/v1/items/files/upload")
                        .file(file)
                        .param("connectionId", connectionA.toString())
                        .cookie(userB.cookie()).header(userB.header(), userB.token()))
                .andExpect(status().isNotFound());
    }

    @Test
    void sharingIsolationStrangerDenialAndInstantRevoke() throws Exception {
        Browser owner = browser();
        Browser recipient = browser();
        Browser stranger = browser();

        UUID connectionId = seedConnectedStorage(owner.email());

        // Owner uploads file
        byte[] data = "Top Secret Document 2026".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "top-secret.txt", "text/plain", data);
        MvcResult uploadRes = mvc.perform(multipart("/api/v1/items/files/upload")
                        .file(file)
                        .param("connectionId", connectionId.toString())
                        .cookie(owner.cookie()).header(owner.header(), owner.token()))
                .andExpect(status().isCreated())
                .andReturn();
        String itemId = mapper.readTree(uploadRes.getResponse().getContentAsString()).get("id").asText();

        // Owner shares with Recipient
        var shareReq = new SharingDtos.CreateShareRequest(
                com.drivemanager.storagehub.sharing.Share.TargetType.ITEM,
                UUID.fromString(itemId),
                recipient.email()
        );
        MvcResult shareRes = mvc.perform(post("/api/v1/shares")
                        .cookie(owner.cookie()).header(owner.header(), owner.token())
                        .contentType("application/json").content(mapper.writeValueAsString(shareReq)))
                .andExpect(status().isCreated())
                .andReturn();
        String shareId = mapper.readTree(shareRes.getResponse().getContentAsString()).get("id").asText();

        // Stranger cannot see the share in incoming
        MvcResult strangerIncoming = mvc.perform(get("/api/v1/shares/incoming").cookie(stranger.cookie()))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(strangerIncoming.getResponse().getContentAsString()).doesNotContain(shareId);

        // Stranger cannot accept, reject, or revoke the share
        mvc.perform(post("/api/v1/shares/" + shareId + "/accept")
                        .cookie(stranger.cookie()).header(stranger.header(), stranger.token()))
                .andExpect(status().isNotFound());

        mvc.perform(post("/api/v1/shares/" + shareId + "/reject")
                        .cookie(stranger.cookie()).header(stranger.header(), stranger.token()))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/v1/shares/" + shareId)
                        .cookie(stranger.cookie()).header(stranger.header(), stranger.token()))
                .andExpect(status().isNotFound());

        // Stranger cannot read or download the item
        mvc.perform(get("/api/v1/items/" + itemId).cookie(stranger.cookie())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/items/" + itemId + "/content").cookie(stranger.cookie())).andExpect(status().isNotFound());

        // Recipient accepts the share
        mvc.perform(post("/api/v1/shares/" + shareId + "/accept")
                        .cookie(recipient.cookie()).header(recipient.header(), recipient.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        // Recipient can access detail
        mvc.perform(get("/api/v1/items/" + itemId).cookie(recipient.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("top-secret.txt"));

        // Owner revokes the share
        mvc.perform(delete("/api/v1/shares/" + shareId)
                        .cookie(owner.cookie()).header(owner.header(), owner.token()))
                .andExpect(status().isNoContent());

        // Instantly, recipient is blocked from item detail and content download
        mvc.perform(get("/api/v1/items/" + itemId).cookie(recipient.cookie()))
                .andExpect(status().isNotFound());

        mvc.perform(get("/api/v1/items/" + itemId + "/content").cookie(recipient.cookie()))
                .andExpect(status().isNotFound());
    }

    @Test
    void rateLimitingTriggersTooManyRequests() throws Exception {
        // Reset rate limiter window to ensure clean state
        rateLimiter.reset();

        var csrf = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        Cookie cookie = csrf.getResponse().getCookie("SESSION");
        var token = mapper.readTree(csrf.getResponse().getContentAsString());

        String email = "victim-" + UUID.randomUUID() + "@example.com";
        String body = mapper.writeValueAsString(Map.of("email", email, "password", "wrong-password"));

        // Send 15 requests (configured auth limit is 15 in this test)
        for (int i = 0; i < 15; i++) {
            mvc.perform(post("/api/v1/auth/login").cookie(cookie)
                    .header(token.get("headerName").asText(), token.get("token").asText())
                    .contentType("application/json").content(body));
        }

        // 16th request must trigger HTTP 429 RATE_LIMIT_EXCEEDED
        mvc.perform(post("/api/v1/auth/login").cookie(cookie)
                        .header(token.get("headerName").asText(), token.get("token").asText())
                        .contentType("application/json").content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string(HttpHeaders.RETRY_AFTER, "60"))
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.code").value("RATE_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.message").isNotEmpty());

        // Reset so subsequent tests run freely
        rateLimiter.reset();
    }

    @Test
    void forwardedForCannotBypassRateLimit() throws Exception {
        rateLimiter.reset();
        var csrf = mvc.perform(get("/api/v1/auth/csrf")).andReturn();
        Cookie cookie = csrf.getResponse().getCookie("SESSION");
        var token = mapper.readTree(csrf.getResponse().getContentAsString());
        String body = mapper.writeValueAsString(Map.of("email", "spoof-" + UUID.randomUUID() + "@example.com", "password", "wrong-password"));
        for (int i = 0; i < 15; i++) {
            mvc.perform(post("/api/v1/auth/login").cookie(cookie).header(token.get("headerName").asText(), token.get("token").asText())
                    .header("X-Forwarded-For", "198.51.100." + i).contentType("application/json").content(body));
        }
        mvc.perform(post("/api/v1/auth/login").cookie(cookie).header(token.get("headerName").asText(), token.get("token").asText())
                        .header("X-Forwarded-For", "203.0.113.1").contentType("application/json").content(body))
                .andExpect(status().isTooManyRequests());
        rateLimiter.reset();
    }

    @Test
    void errorContractAndSecurityHeadersVerification() throws Exception {
        // 1. 401 Unauthenticated error structure
        MvcResult unauth = mvc.perform(get("/api/v1/items"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andReturn();
        JsonNode unauthJson = mapper.readTree(unauth.getResponse().getContentAsString());
        assertThat(unauthJson.get("status").asInt()).isEqualTo(401);
        assertThat(unauthJson.get("code").asText()).isEqualTo("UNAUTHENTICATED");
        assertThat(unauthJson.has("timestamp")).isTrue();
        assertThat(unauth.getResponse().getContentAsString()).doesNotContain("Exception");

        // 2. 403 Access Denied (invalid CSRF) error structure
        Browser user = browser();
        MvcResult forbidden = mvc.perform(post("/api/v1/collections")
                        .cookie(user.cookie())
                        .header(user.header(), "invalid-csrf-token")
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(Map.of("name", "Test"))))
                .andExpect(status().isForbidden())
                .andReturn();
        JsonNode forbJson = mapper.readTree(forbidden.getResponse().getContentAsString());
        assertThat(forbJson.get("status").asInt()).isEqualTo(403);
        assertThat(forbJson.get("code").asText()).isEqualTo("ACCESS_DENIED");
        assertThat(forbidden.getResponse().getContentAsString()).doesNotContain("Exception");

        // 3. 400 Bad Request error structure
        MvcResult badReq = mvc.perform(post("/api/v1/items/links")
                        .cookie(user.cookie()).header(user.header(), user.token())
                        .contentType("application/json")
                        .content("{invalid json body"))
                .andExpect(status().isBadRequest())
                .andReturn();
        JsonNode badJson = mapper.readTree(badReq.getResponse().getContentAsString());
        assertThat(badJson.get("status").asInt()).isEqualTo(400);
        assertThat(badJson.get("code").asText()).isEqualTo("VALIDATION_ERROR");
        assertThat(badReq.getResponse().getContentAsString()).doesNotContain("Exception");
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
        String email = "harden-" + UUID.randomUUID() + "@example.com";
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
}
