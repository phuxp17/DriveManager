package com.drivemanager.storagehub;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.drivemanager.storagehub.auth.AuthDtos.LoginRequest;
import com.drivemanager.storagehub.auth.AuthDtos.RegisterRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.*;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
class StorageHubApplicationTest {
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");
    static final String schema = "test_" + UUID.randomUUID().toString().replace("-", "");
    static final String PASSWORD = "correct-horse-battery";

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("resend.enabled", () -> false);
        if (Boolean.parseBoolean(System.getenv("USE_EXTERNAL_TEST_DATABASE"))) {
            String url = required("TEST_DATABASE_URL");
            if (url.toLowerCase(Locale.ROOT).contains("currentschema=")) {
                throw new IllegalArgumentException("Test URL must not override isolated schema");
            }
            registry.add("spring.datasource.url", () -> url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema);
            registry.add("spring.datasource.username", () -> required("TEST_DATABASE_USERNAME"));
            registry.add("spring.datasource.password", () -> required("TEST_DATABASE_PASSWORD"));
            registry.add("spring.flyway.create-schemas", () -> true);
            registry.add("spring.flyway.schemas", () -> schema);
            registry.add("spring.flyway.default-schema", () -> schema);
        } else {
            postgres.start();
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
        }
    }

    static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalStateException(name + " is required");
        return value;
    }

    @Autowired MockMvc mvc;
    @Autowired DataSource dataSource;
    @Autowired ObjectMapper mapper;
    @Autowired PasswordEncoder encoder;

    @Test
    void startsWithFlywayAndExposesHealth() throws Exception {
        assertThat(jdbc().queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE success AND version IN ('1','2','3','4','5')",
                Integer.class)).isEqualTo(5);
        mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void deniesProtectedEndpointsWithoutFrameworkDetails() throws Exception {
        mvc.perform(get("/api/v1/not-yet-implemented")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED")).andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test
    void persistsRotatesAndInvalidatesJdbcSessionUsingOnlyCookies() throws Exception {
        String email = email();
        Csrf before = csrf(null);
        String anonymousId = sessionId(before.session());
        sessionExists(anonymousId, true);
        mvc.perform(post("/api/v1/auth/register").contentType("application/json")
                        .content(mapper.writeValueAsString(new RegisterRequest(email, PASSWORD, "Student"))))
                .andExpect(status().isForbidden());
        register(before, email).andExpect(status().isCreated()).andExpect(jsonPath("$.passwordHash").doesNotExist());
        String hash = jdbc().queryForObject("SELECT password_hash FROM users WHERE normalized_email=?", String.class, email);
        assertThat(hash).isNotEqualTo(PASSWORD);
        assertThat(encoder.matches(PASSWORD, hash)).isTrue();
        register(before, email.toUpperCase(Locale.ROOT)).andExpect(status().isConflict());

        Cookie session = login(before, email);
        assertThat(session).isNotNull();
        assertThat(session.isHttpOnly()).isTrue();
        assertThat(session.getSecure()).isTrue();
        assertThat(session.getAttribute("SameSite")).isEqualTo("Lax");
        String id = sessionId(session);
        assertThat(id).isNotEqualTo(anonymousId);
        sessionExists(anonymousId, false);
        sessionExists(id, true);
        assertThat(jdbc().queryForObject("SELECT principal_name FROM spring_session WHERE session_id=?", String.class, id))
                .isEqualTo(email);
        assertThat(jdbc().queryForObject("SELECT COUNT(*) FROM spring_session_attributes a JOIN spring_session s "
                        + "ON a.session_primary_id=s.primary_id WHERE s.session_id=? AND a.attribute_name='SPRING_SECURITY_CONTEXT'",
                Integer.class, id)).isEqualTo(1);
        mvc.perform(get("/api/v1/auth/me").cookie(session)).andExpect(status().isOk()).andExpect(jsonPath("$.email").value(email));
        mvc.perform(get("/api/v1/auth/me").cookie(before.session())).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/logout").cookie(session)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/auth/logout").cookie(session).header(before.header(), before.token())).andExpect(status().isForbidden());
        Csrf renewed = csrf(session);
        mvc.perform(post("/api/v1/auth/logout").cookie(session).header(renewed.header(), renewed.token())).andExpect(status().isNoContent());
        sessionExists(id, false);
        mvc.perform(get("/api/v1/auth/me").cookie(session)).andExpect(status().isUnauthorized());
        login(csrf(null), email);
    }

    @Test
    void separatesUsersAndMakesLoginFailuresGeneric() throws Exception {
        String a = email(), b = email();
        Csrf ca = csrf(null), cb = csrf(null);
        register(ca, a).andExpect(status().isCreated());
        register(cb, b).andExpect(status().isCreated());
        Cookie sa = login(ca, a), sb = login(cb, b);
        mvc.perform(get("/api/v1/auth/me").cookie(sa)).andExpect(jsonPath("$.email").value(a));
        mvc.perform(get("/api/v1/auth/me").cookie(sb)).andExpect(jsonPath("$.email").value(b));
        assertThat(sa.getValue()).isNotEqualTo(sb.getValue());
        Csrf anonymous = csrf(null);
        for (String address : List.of(a, "missing@example.com")) {
            mvc.perform(post("/api/v1/auth/login").cookie(anonymous.session()).header(anonymous.header(), anonymous.token())
                            .contentType("application/json").content(mapper.writeValueAsString(new LoginRequest(address, "wrong-password"))))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                    .andExpect(jsonPath("$.message").value("Email or password is incorrect."));
        }
        mvc.perform(get("/api/v1/auth/me").cookie(anonymous.session())).andExpect(status().isUnauthorized());
    }

    @Test
    void validatesJsonAndMultibytePasswordLength() throws Exception {
        Csrf token = csrf(null);
        for (String json : List.of("{broken", mapper.writeValueAsString(new RegisterRequest(email(), "密".repeat(25), "User")))) {
            mvc.perform(post("/api/v1/auth/register").cookie(token.session()).header(token.header(), token.token())
                            .contentType("application/json").content(json))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }
    }

    @Test
    void concurrentRegistrationReturnsOneCreatedAndOneConflict() throws Exception {
        String email = email();
        Csrf first = csrf(null), second = csrf(null);
        CyclicBarrier barrier = new CyclicBarrier(2);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var results = List.of(first, second).stream().map(token -> executor.submit(() -> {
                barrier.await(10, TimeUnit.SECONDS);
                return register(token, email).andReturn().getResponse().getStatus();
            })).toList();
            assertThat(List.of(results.get(0).get(20, TimeUnit.SECONDS), results.get(1).get(20, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(201, 409);
        }
        assertThat(jdbc().queryForObject("SELECT COUNT(*) FROM users WHERE normalized_email=?", Integer.class, email)).isEqualTo(1);
    }

    @Test
    void linkOwnershipSurvivesTamperedBodiesAndCrossUserRequests() throws Exception {
        String a = email(), b = email();
        Csrf ca = csrf(null), cb = csrf(null);
        register(ca, a).andExpect(status().isCreated());
        register(cb, b).andExpect(status().isCreated());
        Cookie sa = login(ca, a), sb = login(cb, b);
        Csrf ta = csrf(sa), tb = csrf(sb);
        var owner = mapper.readTree(mvc.perform(get("/api/v1/auth/me").cookie(sa)).andReturn().getResponse().getContentAsString());
        var other = mapper.readTree(mvc.perform(get("/api/v1/auth/me").cookie(sb)).andReturn().getResponse().getContentAsString());
        var body = mapper.createObjectNode().put("name", "Java reference").put("url", "https://docs.oracle.com/en/java/")
                .put("description", "Saved locally").put("ownerId", other.get("id").asText());
        var created = mvc.perform(post("/api/v1/items/links").cookie(sa).header(ta.header(), ta.token())
                        .contentType("application/json").content(mapper.writeValueAsString(body)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.ownerId").value(owner.get("id").asText()))
                .andExpect(jsonPath("$.type").value("LINK")).andExpect(jsonPath("$.domain").value("docs.oracle.com"))
                .andReturn();
        var item = mapper.readTree(created.getResponse().getContentAsString());
        String id = item.get("id").asText();
        assertThat(jdbc().queryForObject("SELECT COUNT(*) FROM link_contents WHERE item_id=?", Integer.class, UUID.fromString(id))).isEqualTo(1);
        mvc.perform(get("/api/v1/items/" + id).cookie(sa)).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Java reference"));
        mvc.perform(get("/api/v1/items").cookie(sb)).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/v1/items").cookie(sa).param("size", "1"))
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].id").value(id));
        for (String target : List.of(id, UUID.randomUUID().toString())) {
            mvc.perform(get("/api/v1/items/" + target).cookie(sb)).andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("NOT_FOUND"));
            mvc.perform(patch("/api/v1/items/" + target).cookie(sb).header(tb.header(), tb.token())
                            .contentType("application/json").content("{\"name\":\"stolen\",\"expectedVersion\":0}"))
                    .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        }
        String update = "{\"name\":\"Renamed\",\"description\":\"\",\"expectedVersion\":0}";
        mvc.perform(patch("/api/v1/items/" + id).cookie(sa).contentType("application/json").content(update)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/items/" + id).cookie(sa).header(ta.header(), ta.token()).contentType("application/json").content(update))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1)).andExpect(jsonPath("$.name").value("Renamed"));
        mvc.perform(patch("/api/v1/items/" + id).cookie(sa).header(ta.header(), ta.token()).contentType("application/json").content(update))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
        mvc.perform(get("/api/v1/items/" + id).cookie(sa)).andExpect(jsonPath("$.name").value("Renamed"));
    }

    @Test
    void rejectsUnsafeLinkSchemesAndUnboundedPagination() throws Exception {
        String email = email();
        Csrf before = csrf(null);
        register(before, email).andExpect(status().isCreated());
        Cookie session = login(before, email);
        Csrf token = csrf(session);
        for (String url : List.of("javascript:alert(1)", "file:///etc/passwd", "data:text/html,hi", "https:///no-host", "https://user:secret@example.com/")) {
            String json = mapper.writeValueAsString(Map.of("name", "Invalid", "url", url));
            mvc.perform(post("/api/v1/items/links").cookie(session).header(token.header(), token.token())
                            .contentType("application/json").content(json))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }
        mvc.perform(get("/api/v1/items").cookie(session).param("size", "101")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/items/links").cookie(session).header(token.header(), token.token())
                        .contentType("application/json").content(mapper.writeValueAsString(Map.of("name", "\u2003\u2003", "url", "https://example.com"))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mvc.perform(get("/api/v1/items").cookie(session).param("page", "-1")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/items").cookie(session)).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void organizesOneItemAcrossCollectionsAndMergesTags() throws Exception {
        String owner = email(), other = email(); Csrf co = csrf(null), cx = csrf(null);
        register(co, owner).andExpect(status().isCreated()); register(cx, other).andExpect(status().isCreated());
        Cookie so = login(co, owner), sx = login(cx, other); Csrf token = csrf(so), otherToken = csrf(sx);
        String item = mapper.readTree(mvc.perform(post("/api/v1/items/links").cookie(so).header(token.header(), token.token()).contentType("application/json")
                .content("{\"name\":\"Link\",\"url\":\"https://example.com\"}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asText();
        String root = mapper.readTree(mvc.perform(post("/api/v1/collections").cookie(so).header(token.header(), token.token()).contentType("application/json").content("{\"name\":\"Work\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asText();
        String child = mapper.readTree(mvc.perform(post("/api/v1/collections").cookie(so).header(token.header(), token.token()).contentType("application/json").content("{\"name\":\"Project\",\"parentId\":\""+root+"\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asText();
        mvc.perform(patch("/api/v1/collections/"+root+"/parent").cookie(so).header(token.header(), token.token()).contentType("application/json").content("{\"parentId\":\""+child+"\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/collections/"+root+"/items/"+item).cookie(so).header(token.header(), token.token())).andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/collections/items/"+item+"/move").cookie(so).header(token.header(), token.token()).contentType("application/json").content("{\"sourceCollectionId\":\""+root+"\",\"destinationCollectionId\":\""+child+"\"}"))
                .andExpect(status().isNoContent());
        assertThat(jdbc().queryForObject("SELECT count(*) FROM collection_items WHERE item_id=?",Integer.class,UUID.fromString(item))).isEqualTo(1);
        mvc.perform(post("/api/v1/collections/"+root+"/items/"+item).cookie(sx).header(otherToken.header(), otherToken.token())).andExpect(status().isNotFound());
        String a=mapper.readTree(mvc.perform(post("/api/v1/tags").cookie(so).header(token.header(),token.token()).contentType("application/json").content("{\"name\":\"Java\",\"color\":\"#123ABC\"}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asText();
        String b=mapper.readTree(mvc.perform(post("/api/v1/tags").cookie(so).header(token.header(),token.token()).contentType("application/json").content("{\"name\":\"Backend\"}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asText();
        mvc.perform(post("/api/v1/tags/"+a+"/items/"+item).cookie(so).header(token.header(),token.token())).andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/tags/"+a+"/merge").cookie(so).header(token.header(),token.token()).contentType("application/json").content("{\"targetId\":\""+b+"\"}"))
                .andExpect(status().isNoContent());
        assertThat(jdbc().queryForObject("SELECT count(*) FROM item_tags WHERE item_id=? AND tag_id=?",Integer.class,UUID.fromString(item),UUID.fromString(b))).isEqualTo(1);
    }

    ResultActions register(Csrf token, String email) throws Exception {
        return mvc.perform(post("/api/v1/auth/register").cookie(token.session()).header(token.header(), token.token())
                .contentType("application/json").content(mapper.writeValueAsString(new RegisterRequest(email, PASSWORD, "Student"))));
    }
    Cookie login(Csrf token, String email) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").cookie(token.session()).header(token.header(), token.token())
                        .contentType("application/json").content(mapper.writeValueAsString(new LoginRequest(email, PASSWORD))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value(email)).andReturn().getResponse().getCookie("SESSION");
    }
    Csrf csrf(Cookie existing) throws Exception {
        var request = get("/api/v1/auth/csrf");
        if (existing != null) request.cookie(existing);
        var result = mvc.perform(request).andExpect(status().isOk()).andReturn();
        var body = mapper.readTree(result.getResponse().getContentAsString());
        Cookie session = result.getResponse().getCookie("SESSION");
        return new Csrf(session == null ? existing : session, body.get("headerName").asText(), body.get("token").asText());
    }
    JdbcTemplate jdbc() { return new JdbcTemplate(dataSource); }
    String email() { return "user-" + UUID.randomUUID() + "@example.com"; }
    String sessionId(Cookie cookie) { return new String(Base64.getDecoder().decode(cookie.getValue()), StandardCharsets.UTF_8); }
    void sessionExists(String id, boolean expected) {
        assertThat(jdbc().queryForObject("SELECT COUNT(*) FROM spring_session WHERE session_id=?", Integer.class, id)).isEqualTo(expected ? 1 : 0);
    }
    record Csrf(Cookie session, String header, String token) {}
}
