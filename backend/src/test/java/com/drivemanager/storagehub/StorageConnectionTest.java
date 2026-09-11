package com.drivemanager.storagehub;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.drivemanager.storagehub.storage.connection.StorageOAuthService;
import com.drivemanager.storagehub.storage.google.GoogleIdentity;
import com.drivemanager.storagehub.storage.google.GoogleIdentityValidator;
import com.drivemanager.storagehub.storage.google.GoogleOAuthClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
@Import(StorageConnectionTest.MockGoogleConfiguration.class)
class StorageConnectionTest {

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        StorageHubApplicationTest.databaseProperties(registry);
        registry.add("storage.credentials.active-version", () -> 1);
        registry.add("storage.credentials.keys.1", () -> Base64.getEncoder().encodeToString(new byte[32]));
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockGoogleOAuthClient mockGoogleClient;
    @Autowired MockGoogleIdentityValidator mockGoogleValidator;
    @Autowired StorageOAuthService oauthService;

    @BeforeEach
    void resetGoogleMocks() {
        mockGoogleClient.reset();
        mockGoogleValidator.reset();
    }

    @Test
    void connectBeginsOAuthFlowAndValidatesSession() throws Exception {
        Browser user = browser();

        // Anonymous cannot access protected connections (401)
        mvc.perform(get("/api/v1/storage-connections")).andExpect(status().isUnauthorized());

        var anonCsrf = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        Cookie anonCookie = anonCsrf.getResponse().getCookie("SESSION");
        var anonToken = mapper.readTree(anonCsrf.getResponse().getContentAsString());
        mvc.perform(post("/api/v1/storage-connections/google/connect").cookie(anonCookie)
                        .header(anonToken.get("headerName").asText(), anonToken.get("token").asText()))
                .andExpect(status().isUnauthorized());

        // Connect without CSRF is forbidden (403)
        mvc.perform(post("/api/v1/storage-connections/google/connect").cookie(user.cookie())).andExpect(status().isForbidden());

        // Connect with CSRF succeeds and returns authorization URL with state and challenge
        MvcResult res = call(user, post("/api/v1/storage-connections/google/connect"), 200);
        String authUrl = mapper.readTree(res.getResponse().getContentAsString()).get("authorizationUrl").asText();
        assertThat(authUrl).contains("state=").contains("code_challenge=");

        String state = extractQueryParam(authUrl, "state");
        assertThat(state).isNotBlank();

        // State is persisted in oauth_authorizations table
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM oauth_authorizations WHERE consumed_at IS NULL", Integer.class);
        assertThat(count).isGreaterThanOrEqualTo(1);
    }

    @Test
    void callbackRejectsStateReplayAndMismatches() throws Exception {
        Browser user = browser(), other = browser();

        // Begin connect
        String authUrl = mapper.readTree(call(user, post("/api/v1/storage-connections/google/connect"), 200)
                .getResponse().getContentAsString()).get("authorizationUrl").asText();
        String state = extractQueryParam(authUrl, "state");

        // Consent error from Google returns 400
        mvc.perform(get("/api/v1/storage-connections/google/callback")
                        .cookie(user.cookie()).param("state", state).param("error", "access_denied"))
                .andExpect(status().isBadRequest());

        // Calling callback from a different user session returns 400
        mvc.perform(get("/api/v1/storage-connections/google/callback")
                        .cookie(other.cookie()).param("state", state).param("code", "valid-code"))
                .andExpect(status().isBadRequest());

        // Successful callback
        mvc.perform(get("/api/v1/storage-connections/google/callback")
                        .cookie(user.cookie()).param("state", state).param("code", "valid-code"))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Cache-Control", "no-store"));

        // Replaying same state returns 400
        mvc.perform(get("/api/v1/storage-connections/google/callback")
                        .cookie(user.cookie()).param("state", state).param("code", "valid-code"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void callbackValidatesScopesAndCreatesConnection() throws Exception {
        Browser user = browser(), other = browser();

        // Test missing scope rejection
        mockGoogleClient.nextScopes = "openid email";
        String authUrl1 = mapper.readTree(call(user, post("/api/v1/storage-connections/google/connect"), 200)
                .getResponse().getContentAsString()).get("authorizationUrl").asText();
        String state1 = extractQueryParam(authUrl1, "state");
        mvc.perform(get("/api/v1/storage-connections/google/callback")
                        .cookie(user.cookie()).param("state", state1).param("code", "code-without-scope"))
                .andExpect(status().isBadRequest());

        // Restore required scopes and connect
        mockGoogleClient.nextScopes = "openid email https://www.googleapis.com/auth/drive.file";
        mockGoogleValidator.subject = "sub-" + UUID.randomUUID();
        mockGoogleValidator.email = "drive-user-" + UUID.randomUUID() + "@example.com";
        String authUrl2 = mapper.readTree(call(user, post("/api/v1/storage-connections/google/connect"), 200)
                .getResponse().getContentAsString()).get("authorizationUrl").asText();
        String state2 = extractQueryParam(authUrl2, "state");

        mvc.perform(get("/api/v1/storage-connections/google/callback")
                        .cookie(user.cookie()).param("state", state2).param("code", "good-code"))
                .andExpect(status().isNoContent());

        // List connections and verify public fields only (no tokens/secrets)
        MvcResult listRes = mvc.perform(get("/api/v1/storage-connections").cookie(user.cookie()))
                .andExpect(status().isOk()).andReturn();
        JsonNode listNode = mapper.readTree(listRes.getResponse().getContentAsString());
        assertThat(listNode.size()).isEqualTo(1);
        JsonNode connNode = listNode.get(0);
        assertThat(connNode.get("provider").asText()).isEqualTo("GOOGLE");
        assertThat(connNode.get("status").asText()).isEqualTo("CONNECTED");
        assertThat(connNode.get("displayName").asText()).isEqualTo(mockGoogleValidator.email);
        assertThat(connNode.has("encryptedRefreshToken")).isFalse();
        assertThat(connNode.has("refreshToken")).isFalse();

        // Other user's list is empty
        MvcResult otherList = mvc.perform(get("/api/v1/storage-connections").cookie(other.cookie()))
                .andExpect(status().isOk()).andReturn();
        assertThat(mapper.readTree(otherList.getResponse().getContentAsString()).size()).isZero();
    }

    @Test
    void callbackAcceptsCanonicalGoogleScopesUrl() throws Exception {
        Browser user = browser();
        mockGoogleClient.nextScopes = "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file";
        mockGoogleValidator.subject = "sub-" + UUID.randomUUID();
        mockGoogleValidator.email = "drive-canonical-" + UUID.randomUUID() + "@example.com";

        String authUrl = mapper.readTree(call(user, post("/api/v1/storage-connections/google/connect"), 200)
                .getResponse().getContentAsString()).get("authorizationUrl").asText();
        String state = extractQueryParam(authUrl, "state");

        mvc.perform(get("/api/v1/storage-connections/google/callback")
                        .cookie(user.cookie()).param("state", state).param("code", "canonical-scope-code"))
                .andExpect(status().isNoContent());

        MvcResult listRes = mvc.perform(get("/api/v1/storage-connections").cookie(user.cookie()))
                .andExpect(status().isOk()).andReturn();
        JsonNode listNode = mapper.readTree(listRes.getResponse().getContentAsString());
        assertThat(listNode.size()).isPositive();
        assertThat(listNode.get(0).get("displayName").asText()).isEqualTo(mockGoogleValidator.email);
    }

    @Test
    void reconnectFlowValidatesSubjectAndPreservesOrRotatesRefreshToken() throws Exception {
        Browser user = browser();
        String origSubject = "sub-" + UUID.randomUUID();
        mockGoogleValidator.subject = origSubject;
        mockGoogleClient.nextRefreshToken = "initial-refresh-token";

        String authUrl = mapper.readTree(call(user, post("/api/v1/storage-connections/google/connect"), 200)
                .getResponse().getContentAsString()).get("authorizationUrl").asText();
        String state = extractQueryParam(authUrl, "state");
        mvc.perform(get("/api/v1/storage-connections/google/callback")
                        .cookie(user.cookie()).param("state", state).param("code", "c1"))
                .andExpect(status().isNoContent());

        JsonNode list = mapper.readTree(mvc.perform(get("/api/v1/storage-connections").cookie(user.cookie()))
                .andReturn().getResponse().getContentAsString());
        String connectionId = list.get(0).get("id").asText();

        // Reconnect with WRONG Google subject -> 400
        mockGoogleValidator.subject = "different-subject-" + UUID.randomUUID();
        String reauthUrl = mapper.readTree(call(user, post("/api/v1/storage-connections/" + connectionId + "/reconnect"), 200)
                .getResponse().getContentAsString()).get("authorizationUrl").asText();
        String reState = extractQueryParam(reauthUrl, "state");
        mvc.perform(get("/api/v1/storage-connections/google/callback")
                        .cookie(user.cookie()).param("state", reState).param("code", "c2"))
                .andExpect(status().isBadRequest());

        // Reconnect with same subject but no new refresh token -> preserves original refresh token
        mockGoogleValidator.subject = origSubject;
        mockGoogleClient.nextRefreshToken = null;
        String reauthUrl2 = mapper.readTree(call(user, post("/api/v1/storage-connections/" + connectionId + "/reconnect"), 200)
                .getResponse().getContentAsString()).get("authorizationUrl").asText();
        String reState2 = extractQueryParam(reauthUrl2, "state");
        mvc.perform(get("/api/v1/storage-connections/google/callback")
                        .cookie(user.cookie()).param("state", reState2).param("code", "c3"))
                .andExpect(status().isNoContent());

        // Refresh token works using preserved token
        mockGoogleClient.failRefreshWithInvalidGrant = false;
        String freshToken = oauthService.getFreshAccessToken(user.email(), UUID.fromString(connectionId));
        assertThat(freshToken).isEqualTo("new-access-token");
    }

    @Test
    void disconnectAndCoordinatedRefresh() throws Exception {
        Browser user = browser(), other = browser();
        mockGoogleValidator.subject = "sub-" + UUID.randomUUID();
        mockGoogleClient.nextRefreshToken = "valid-refresh-token";

        String authUrl = mapper.readTree(call(user, post("/api/v1/storage-connections/google/connect"), 200)
                .getResponse().getContentAsString()).get("authorizationUrl").asText();
        String state = extractQueryParam(authUrl, "state");
        mvc.perform(get("/api/v1/storage-connections/google/callback")
                        .cookie(user.cookie()).param("state", state).param("code", "c"))
                .andExpect(status().isNoContent());

        String connectionId = mapper.readTree(mvc.perform(get("/api/v1/storage-connections").cookie(user.cookie()))
                .andReturn().getResponse().getContentAsString()).get(0).get("id").asText();

        // Other user cannot disconnect
        call(other, delete("/api/v1/storage-connections/" + connectionId), 404);

        // Coordinated refresh with rotated token updates refresh token
        mockGoogleClient.nextRotatedRefreshToken = "rotated-refresh-token";
        String access1 = oauthService.getFreshAccessToken(user.email(), UUID.fromString(connectionId));
        assertThat(access1).isEqualTo("new-access-token");

        // Refresh with invalid grant marks REAUTHENTICATION_REQUIRED
        mockGoogleClient.failRefreshWithInvalidGrant = true;
        assertThatThrownBy(() -> oauthService.getFreshAccessToken(user.email(), UUID.fromString(connectionId)))
                .isInstanceOf(GoogleOAuthClient.GoogleInvalidGrantException.class);

        String status = mapper.readTree(mvc.perform(get("/api/v1/storage-connections").cookie(user.cookie()))
                .andReturn().getResponse().getContentAsString()).get(0).get("status").asText();
        assertThat(status).isEqualTo("REAUTHENTICATION_REQUIRED");

        // Disconnect marks DISCONNECTED
        call(user, delete("/api/v1/storage-connections/" + connectionId), 204);
        status = mapper.readTree(mvc.perform(get("/api/v1/storage-connections").cookie(user.cookie()))
                .andReturn().getResponse().getContentAsString()).get(0).get("status").asText();
        assertThat(status).isEqualTo("DISCONNECTED");

        assertThatThrownBy(() -> oauthService.getFreshAccessToken(user.email(), UUID.fromString(connectionId)))
                .isInstanceOf(IllegalStateException.class);
    }

    private String extractQueryParam(String url, String param) {
        try {
            URI uri = URI.create(url);
            String query = uri.getQuery();
            if (query == null) return null;
            for (String pair : query.split("&")) {
                String[] kv = pair.split("=", 2);
                if (kv[0].equals(param)) {
                    return kv.length > 1 ? URLDecoder.decode(kv[1], StandardCharsets.UTF_8) : "";
                }
            }
            return null;
        } catch (Exception e) {
            throw new IllegalArgumentException(e);
        }
    }

    private Browser browser() throws Exception {
        var csrf = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        Cookie cookie = csrf.getResponse().getCookie("SESSION");
        var token = mapper.readTree(csrf.getResponse().getContentAsString());
        String email = "storage-" + UUID.randomUUID() + "@example.com";
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

    private MvcResult call(Browser user, MockHttpServletRequestBuilder request, int expected) throws Exception {
        request.cookie(user.cookie()).header(user.header(), user.token());
        return mvc.perform(request).andExpect(status().is(expected)).andReturn();
    }

    private record Browser(String email, Cookie cookie, String header, String token) {}

    @TestConfiguration
    static class MockGoogleConfiguration {
        @Bean
        @Primary
        MockGoogleOAuthClient mockGoogleOAuthClient() {
            return new MockGoogleOAuthClient();
        }

        @Bean
        @Primary
        MockGoogleIdentityValidator mockGoogleIdentityValidator() {
            return new MockGoogleIdentityValidator();
        }
    }

    static class MockGoogleOAuthClient implements GoogleOAuthClient {
        String nextIdToken = "valid-id-token";
        String nextRefreshToken = "refresh-token-123";
        String nextScopes = "openid email https://www.googleapis.com/auth/drive.file";
        String nextRefreshedAccessToken = "new-access-token";
        String nextRotatedRefreshToken = null;
        boolean failRefreshWithInvalidGrant = false;

        void reset() {
            nextIdToken = "valid-id-token";
            nextRefreshToken = "refresh-token-123";
            nextScopes = "openid email https://www.googleapis.com/auth/drive.file";
            nextRefreshedAccessToken = "new-access-token";
            nextRotatedRefreshToken = null;
            failRefreshWithInvalidGrant = false;
        }

        @Override
        public String authorizationUrl(String state, String challenge) {
            return "https://accounts.google.com/o/oauth2/v2/auth?state=" + state + "&code_challenge=" + challenge;
        }

        @Override
        public GoogleToken exchange(String code, String verifier) {
            if ("error_code".equals(code)) {
                throw new IllegalArgumentException("Google authorization failed");
            }
            return new GoogleToken(nextIdToken, nextRefreshToken, nextScopes);
        }

        @Override
        public GoogleRefreshResponse refresh(String refreshToken) {
            if (failRefreshWithInvalidGrant) {
                throw new GoogleInvalidGrantException("Token revoked");
            }
            return new GoogleRefreshResponse(nextRefreshedAccessToken, nextRotatedRefreshToken, 3600);
        }
    }

    static class MockGoogleIdentityValidator implements GoogleIdentityValidator {
        String issuer = "https://accounts.google.com";
        String subject = "google-subject-12345";
        String email = "google-user@example.com";

        void reset() {
            issuer = "https://accounts.google.com";
            subject = "google-subject-12345";
            email = "google-user@example.com";
        }

        @Override
        public GoogleIdentity validate(String idToken) {
            if ("invalid".equals(idToken)) {
                throw new IllegalArgumentException("Invalid Google identity");
            }
            return new GoogleIdentity(issuer, subject, email);
        }
    }
}
