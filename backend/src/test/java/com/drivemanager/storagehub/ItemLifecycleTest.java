package com.drivemanager.storagehub;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
class ItemLifecycleTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) { StorageHubApplicationTest.databaseProperties(registry); }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;

    @Test
    void personalViewsAndLifecyclePreserveMetadataAndPersonalState() throws Exception {
        Browser user = browser();
        String id = createLink(user);
        String originalModified = mapper.readTree(mvc.perform(get("/api/v1/items/" + id).cookie(user.cookie()))
                .andReturn().getResponse().getContentAsString()).get("updatedAt").asText();
        count(user, "inbox", 1);
        mvc.perform(post("/api/v1/trash/items/" + id + "/restore").cookie(user.cookie())
                .header(user.header(), user.token())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/items/" + id).cookie(user.cookie()))
                .andExpect(jsonPath("$.updatedAt").value(originalModified));
        count(user, "uncategorized", 1);
        count(user, "recent", 0); // Loading detail never counts as an explicit open.
        mutation(user, put("/api/v1/users/me/favorites/" + id));
        mutation(user, post("/api/v1/items/" + id + "/opens"));
        count(user, "favorites", 1);
        count(user, "recent", 1);
        mvc.perform(get("/api/v1/items/" + id).cookie(user.cookie())).andExpect(jsonPath("$.updatedAt").value(originalModified));
        mutation(user, put("/api/v1/items/" + id + "/review"));
        count(user, "inbox", 0);
        count(user, "uncategorized", 1);

        mutation(user, put("/api/v1/items/" + id + "/archive"));
        count(user, "active", 0);
        count(user, "archive", 1);
        count(user, "favorites", 0);
        mutation(user, delete("/api/v1/items/" + id));
        count(user, "archive", 0);
        count(user, "trash", 1);
        mvc.perform(get("/api/v1/items/" + id).cookie(user.cookie())).andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/users/me/favorites/" + id).cookie(user.cookie()).header(user.header(), user.token()))
                .andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT deleted_by FROM items WHERE id=?", UUID.class, UUID.fromString(id))).isEqualTo(user.id());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM link_contents WHERE item_id=?", Integer.class, UUID.fromString(id))).isEqualTo(1);

        mutation(user, post("/api/v1/trash/items/" + id + "/restore"));
        count(user, "trash", 0);
        count(user, "archive", 1); // Restore keeps the previous archive state.
        mutation(user, delete("/api/v1/items/" + id + "/archive"));
        count(user, "active", 1);
        count(user, "favorites", 1);
        count(user, "recent", 1);
        mutation(user, delete("/api/v1/users/me/favorites/" + id));
        count(user, "favorites", 0);
        count(user, "recent", 1);
        mutation(user, delete("/api/v1/items/" + id + "/review"));
        count(user, "inbox", 1);
    }

    @Test
    void otherUserCannotReadOrMutatePersonalOrTrashState() throws Exception {
        Browser owner = browser(), other = browser();
        String id = createLink(owner);
        for (var request : java.util.List.of(put("/api/v1/users/me/favorites/" + id),
                post("/api/v1/items/" + id + "/opens"), put("/api/v1/items/" + id + "/review"),
                put("/api/v1/items/" + id + "/archive"), delete("/api/v1/items/" + id),
                post("/api/v1/trash/items/" + id + "/restore"),
                delete("/api/v1/trash/items/" + id))) {
            mvc.perform(request.cookie(other.cookie()).header(other.header(), other.token()))
                    .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        }
        mvc.perform(put("/api/v1/items/" + id + "/archive").cookie(owner.cookie())).andExpect(status().isForbidden());
        for (String view : java.util.List.of("active", "inbox", "favorites", "recent", "trash", "archive")) count(other, view, 0);
        count(owner, "inbox", 1);
        mvc.perform(get("/api/v1/items").cookie(owner.cookie()).param("view", "unknown OR 1=1"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void uncategorizedIgnoresDeletedCollectionsWithoutChangingInboxReview() throws Exception {
        Browser user = browser();
        String item = createLink(user);
        UUID collection = UUID.randomUUID();
        jdbc.update("INSERT INTO collections(id,owner_id,name,normalized_name,created_at,updated_at) VALUES (?,?,?, ?,now(),now())",
                collection, user.id(), "Fixture", "fixture");
        jdbc.update("INSERT INTO collection_items(collection_id,item_id,owner_id,added_at) VALUES (?,?,?,now())",
                collection, UUID.fromString(item), user.id());
        count(user, "uncategorized", 0);
        count(user, "inbox", 1);
        mutation(user, put("/api/v1/items/" + item + "/review"));
        jdbc.update("UPDATE collections SET deleted_at=now() WHERE id=?", collection);
        count(user, "uncategorized", 1);
        count(user, "inbox", 0);
    }

    @Test
    void purgePermanentlyRemovesTrashedItemAndCascades() throws Exception {
        Browser user = browser();
        String item = createLink(user);
        mvc.perform(delete("/api/v1/trash/items/" + item).cookie(user.cookie()).header(user.header(), user.token()))
                .andExpect(status().isNotFound());
        mutation(user, delete("/api/v1/items/" + item));
        count(user, "trash", 1);
        mutation(user, delete("/api/v1/trash/items/" + item));
        count(user, "trash", 0);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM items WHERE id=?", Integer.class, UUID.fromString(item))).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM link_contents WHERE item_id=?", Integer.class, UUID.fromString(item))).isZero();
    }

    private Browser browser() throws Exception {
        var csrf = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        Cookie cookie = csrf.getResponse().getCookie("SESSION");
        var token = mapper.readTree(csrf.getResponse().getContentAsString());
        String email = "life-" + UUID.randomUUID() + "@example.com";
        String body = mapper.writeValueAsString(Map.of("email", email, "password", "test-password-123", "displayName", "User"));
        var register = mvc.perform(post("/api/v1/auth/register").cookie(cookie)
                        .header(token.get("headerName").asText(), token.get("token").asText()).contentType("application/json").content(body))
                .andExpect(status().isCreated()).andReturn();
        UUID userId = UUID.fromString(mapper.readTree(register.getResponse().getContentAsString()).get("id").asText());
        var login = mvc.perform(post("/api/v1/auth/login").cookie(cookie)
                        .header(token.get("headerName").asText(), token.get("token").asText()).contentType("application/json").content(body))
                .andExpect(status().isOk()).andReturn();
        cookie = login.getResponse().getCookie("SESSION");
        token = mapper.readTree(mvc.perform(get("/api/v1/auth/csrf").cookie(cookie)).andReturn().getResponse().getContentAsString());
        return new Browser(userId, cookie, token.get("headerName").asText(), token.get("token").asText());
    }
    private String createLink(Browser user) throws Exception {
        var result = mvc.perform(post("/api/v1/items/links").cookie(user.cookie()).header(user.header(), user.token())
                        .contentType("application/json").content("{\"name\":\"Reference\",\"url\":\"https://example.com\"}"))
                .andExpect(status().isCreated()).andReturn();
        return mapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
    }
    private void mutation(Browser user, MockHttpServletRequestBuilder request) throws Exception {
        mvc.perform(request.cookie(user.cookie()).header(user.header(), user.token())).andExpect(status().isNoContent());
    }
    private void count(Browser user, String view, int expected) throws Exception {
        mvc.perform(get("/api/v1/items").cookie(user.cookie()).param("view", view))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(expected));
    }
    private record Browser(UUID id, Cookie cookie, String header, String token) {}
}
