package com.drivemanager.storagehub;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ItemSearchTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) { StorageHubApplicationTest.databaseProperties(registry); }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @Test void literalSearchCoversMetadataAndOrganizationWithoutDuplicates() throws Exception {
        Browser user = browser(), other = browser();
        String first = call(user, post("/api/v1/items/links"), Map.of("name", "100% Java_reference",
                "description", "Compiler notes", "url", "https://example.com/docs"), 201).get("id").asText();
        call(user, post("/api/v1/items/links"), Map.of("name", "Unrelated", "url", "https://other.test"), 201);
        String tag = call(user, post("/api/v1/tags"), Map.of("name", "Backend"), 201).get("id").asText();
        String collection = call(user, post("/api/v1/collections"), Map.of("name", "University"), 201).get("id").asText();
        call(user, put("/api/v1/tags/" + tag + "/items/" + first), null, 204);
        call(user, put("/api/v1/collections/" + collection + "/items/" + first), null, 204);
        for (String q : new String[]{"java", "%", "_", "compiler", "example.com", "backend", "university"}) {
            JsonNode result = call(user, get("/api/v1/items").param("q", q), null, 200);
            assertThat(result.get("totalElements").asInt()).as(q).isEqualTo(1);
            assertThat(result.get("content").get(0).get("id").asText()).isEqualTo(first);
        }
        assertThat(call(user, get("/api/v1/items").param("q", "' OR 1=1 --"), null, 200)
                .get("totalElements").asInt()).isZero();
        assertThat(call(other, get("/api/v1/items").param("q", "java").param("collectionId", collection), null, 200)
                .get("totalElements").asInt()).isZero();
        call(user, delete("/api/v1/collections/" + collection), null, 204);
        assertThat(call(user, get("/api/v1/items").param("q", "university"), null, 200)
                .get("totalElements").asInt()).isZero();
    }

    @Test void filtersCombineWithAndAndValidateInput() throws Exception {
        Browser user = browser();
        String first = call(user, post("/api/v1/items/links"), Map.of("name", "First", "url", "https://example.com"), 201).get("id").asText();
        call(user, post("/api/v1/items/links"), Map.of("name", "Second", "url", "https://example.com"), 201);
        String a = call(user, post("/api/v1/tags"), Map.of("name", "A"), 201).get("id").asText();
        String b = call(user, post("/api/v1/tags"), Map.of("name", "B"), 201).get("id").asText();
        call(user, put("/api/v1/tags/" + a + "/items/" + first), null, 204);
        assertThat(call(user, get("/api/v1/items").param("tags", java.util.Collections.nCopies(21, a).toArray(String[]::new)),
                null, 200).get("totalElements").asInt()).isEqualTo(1);
        call(user, get("/api/v1/items").param("tags", java.util.stream.IntStream.range(0, 21)
                .mapToObj(n -> UUID.randomUUID().toString()).toArray(String[]::new)), null, 400);
        assertThat(call(user, get("/api/v1/items").param("tags", a, b), null, 200).get("totalElements").asInt()).isZero();
        call(user, put("/api/v1/tags/" + b + "/items/" + first), null, 204);
        call(user, put("/api/v1/users/me/favorites/" + first), null, 204);
        JsonNode filtered = call(user, get("/api/v1/items").param("tags", a, b, a).param("type", "LINK")
                .param("favorite", "true").param("createdFrom", "2000-01-01T00:00:00Z")
                .param("createdBefore", "2100-01-01T00:00:00Z").param("sort", "modified").param("size", "1"), null, 200);
        assertThat(filtered.get("totalElements").asInt()).isEqualTo(1);
        assertThat(filtered.get("content").get(0).get("id").asText()).isEqualTo(first);
        assertThat(call(user, get("/api/v1/items").param("favorite", "false"), null, 200).get("totalElements").asInt()).isEqualTo(1);
        call(user, get("/api/v1/items").param("type", "PDF"), null, 400);
        call(user, get("/api/v1/items").param("sort", "i.id; DROP TABLE items"), null, 400);
        call(user, get("/api/v1/items").param("q", "x".repeat(201)), null, 400);
        call(user, get("/api/v1/items").param("createdFrom", "2100-01-01T00:00:00Z")
                .param("createdBefore", "2000-01-01T00:00:00Z"), null, 400);
        call(user, get("/api/v1/items").param("tags", "invalid"), null, 400);
    }

    private Browser browser() throws Exception {
        var result = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        var token = mapper.readTree(result.getResponse().getContentAsString());
        Browser anon = new Browser(result.getResponse().getCookie("SESSION"), token.get("headerName").asText(), token.get("token").asText());
        var body = Map.of("email", "search-" + UUID.randomUUID() + "@example.com", "password", "test-password-123", "displayName", "User");
        call(anon, post("/api/v1/auth/register"), body, 201);
        var login = mvc.perform(post("/api/v1/auth/login").cookie(anon.cookie()).header(anon.header(), anon.token())
                .contentType("application/json").content(mapper.writeValueAsString(body))).andExpect(status().isOk()).andReturn();
        Cookie cookie = login.getResponse().getCookie("SESSION");
        token = mapper.readTree(mvc.perform(get("/api/v1/auth/csrf").cookie(cookie)).andReturn().getResponse().getContentAsString());
        return new Browser(cookie, token.get("headerName").asText(), token.get("token").asText());
    }
    private JsonNode call(Browser user, MockHttpServletRequestBuilder request, Object body, int expected) throws Exception {
        request.cookie(user.cookie()).header(user.header(), user.token());
        if (body != null) request.contentType("application/json").content(mapper.writeValueAsString(body));
        var result = mvc.perform(request).andExpect(status().is(expected)).andReturn();
        return mapper.readTree(result.getResponse().getContentAsString());
    }
    private record Browser(Cookie cookie, String header, String token) {}
}
