package com.drivemanager.storagehub;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
class OrganizationTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) { StorageHubApplicationTest.databaseProperties(registry); }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;

    @Test
    void breadcrumbsRenameAndWholeSubtreeDepthAreValidated() throws Exception {
        Browser user = browser();
        String root = collection(user, "University", null);
        String child = collection(user, "Graduation", root);
        String leaf = collection(user, "References", child);
        JsonNode path = json(call(user, get("/api/v1/collections/" + leaf + "/ancestors"), null, 200));
        assertThat(path.get(0).get("id").asText()).isEqualTo(root);
        assertThat(path.get(1).get("id").asText()).isEqualTo(child);
        call(user, patch("/api/v1/collections/" + child), Map.of("name", "Thesis"), 200);
        assertThat(json(call(user, get("/api/v1/collections/" + child), null, 200)).get("name").asText()).isEqualTo("Thesis");
        call(user, post("/api/v1/collections"), Map.of("name", "THESIS", "parentId", root), 409);
        call(user, patch("/api/v1/collections/" + root + "/parent"), Map.of("parentId", leaf), 400);
        String deep = collection(user, "Depth1", null);
        for (int level = 2; level <= 10; level++) deep = collection(user, "Depth" + level, deep);
        call(user, post("/api/v1/collections"), Map.of("name", "Too deep", "parentId", deep), 400);
        call(user, patch("/api/v1/collections/" + root + "/parent"), Map.of("parentId", deep), 400);
        assertThat(json(call(user, get("/api/v1/collections/" + root), null, 200)).get("parentId").isNull()).isTrue();
    }

    @Test
    void deleteRestorePreserveItemsAndRollbackReparentNameConflicts() throws Exception {
        Browser user = browser();
        String parent = collection(user, "Parent", null);
        String child = collection(user, "Child", parent);
        String item = link(user);
        call(user, put("/api/v1/collections/" + parent + "/items/" + item), null, 204);
        call(user, delete("/api/v1/collections/" + parent), null, 204);
        assertThat(json(call(user, get("/api/v1/collections/" + child), null, 200)).get("parentId").isNull()).isTrue();
        call(user, get("/api/v1/items/" + item), null, 200);
        assertThat(membershipCount(item)).isEqualTo(1);
        call(user, post("/api/v1/collections/" + parent + "/restore"), null, 204);
        assertThat(json(call(user, get("/api/v1/collections/" + child), null, 200)).get("parentId").isNull()).isTrue();

        String deletedChild = collection(user, "Deleted child", parent);
        call(user, delete("/api/v1/collections/" + deletedChild), null, 204);
        call(user, delete("/api/v1/collections/" + parent), null, 204);
        call(user, patch("/api/v1/collections/" + parent + "/parent"), Map.of(), 404);
        call(user, post("/api/v1/collections/" + deletedChild + "/restore"), null, 204);
        assertThat(json(call(user, get("/api/v1/collections/" + deletedChild), null, 200)).get("parentId").isNull()).isTrue();
        collection(user, "Parent", null);
        call(user, post("/api/v1/collections/" + parent + "/restore"), null, 409);
        call(user, get("/api/v1/collections/" + parent), null, 404);

        collection(user, "Collision", null);
        String container = collection(user, "Container", null);
        String collision = collection(user, "Collision", container);
        call(user, delete("/api/v1/collections/" + container), null, 409);
        call(user, get("/api/v1/collections/" + container), null, 200);
        assertThat(json(call(user, get("/api/v1/collections/" + collision), null, 200)).get("parentId").asText()).isEqualTo(container);
    }

    @Test
    void concurrentCycleAndSourceMovesCannotCorruptTreeOrMemberships() throws Exception {
        Browser user = browser();
        String a = collection(user, "A", null), b = collection(user, "B", null);
        assertThat(race(
                () -> raw(user, patch("/api/v1/collections/" + a + "/parent"), Map.of("parentId", b)).getResponse().getStatus(),
                () -> raw(user, patch("/api/v1/collections/" + b + "/parent"), Map.of("parentId", a)).getResponse().getStatus()))
                .containsExactlyInAnyOrder(204, 400);
        String source = collection(user, "Source", null), d1 = collection(user, "Target1", null);
        String d2 = collection(user, "Target2", null), preserved = collection(user, "Preserved", null);
        String item = link(user);
        call(user, put("/api/v1/collections/" + source + "/items/" + item), null, 204);
        call(user, put("/api/v1/collections/" + source + "/items/" + item), null, 204);
        call(user, put("/api/v1/collections/" + preserved + "/items/" + item), null, 204);
        assertThat(membershipCount(item)).isEqualTo(2);
        call(user, post("/api/v1/collections/items/" + item + "/move"),
                Map.of("sourceCollectionId", source, "destinationCollectionId", source), 204);
        assertThat(membershipCount(item)).isEqualTo(2);
        assertThat(race(
                () -> raw(user, post("/api/v1/collections/items/" + item + "/move"),
                        Map.of("sourceCollectionId", source, "destinationCollectionId", d1)).getResponse().getStatus(),
                () -> raw(user, post("/api/v1/collections/items/" + item + "/move"),
                        Map.of("sourceCollectionId", source, "destinationCollectionId", d2)).getResponse().getStatus()))
                .containsExactlyInAnyOrder(204, 404);
        assertThat(membershipCount(item)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM collection_items WHERE item_id=? AND collection_id=?",
                Integer.class, UUID.fromString(item), UUID.fromString(preserved))).isEqualTo(1);
        call(user, delete("/api/v1/collections/" + preserved + "/items/" + item), null, 204);
        assertThat(membershipCount(item)).isEqualTo(1);
    }

    @Test
    void tagsCanBeRenamedMergedAndDeletedWhileAttached() throws Exception {
        Browser user = browser();
        String item = link(user);
        String source = tag(user, "Java"), target = tag(user, "Backend");
        call(user, put("/api/v1/tags/" + source + "/items/" + item), null, 204);
        call(user, put("/api/v1/tags/" + target + "/items/" + item), null, 204);
        long beforeMerge = itemVersion(item);
        jdbc.update("UPDATE items SET updated_at='2000-01-01T00:00:00Z' WHERE id=?", UUID.fromString(item));
        call(user, post("/api/v1/tags/" + source + "/merge"), Map.of("targetId", target), 204);
        assertThat(itemVersion(item)).isEqualTo(beforeMerge + 1);
        assertThat(jdbc.queryForObject("SELECT updated_at > '2000-01-02T00:00:00Z' FROM items WHERE id=?",
                Boolean.class, UUID.fromString(item))).isTrue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM item_tags WHERE item_id=?", Integer.class, UUID.fromString(item))).isEqualTo(1);
        call(user, patch("/api/v1/tags/" + target), Map.of("name", "Spring", "color", "#123abc"), 200);
        call(user, post("/api/v1/tags"), Map.of("name", "SPRING"), 409);
        String other = tag(user, "Other");
        call(user, patch("/api/v1/tags/" + other), Map.of("name", "Spring"), 409);
        long beforeDelete = itemVersion(item);
        jdbc.update("UPDATE items SET updated_at='2000-01-01T00:00:00Z' WHERE id=?", UUID.fromString(item));
        call(user, delete("/api/v1/tags/" + target), null, 204);
        assertThat(itemVersion(item)).isEqualTo(beforeDelete + 1);
        assertThat(jdbc.queryForObject("SELECT updated_at > '2000-01-02T00:00:00Z' FROM items WHERE id=?",
                Boolean.class, UUID.fromString(item))).isTrue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM item_tags WHERE item_id=?", Integer.class, UUID.fromString(item))).isZero();
        call(user, get("/api/v1/items/" + item), null, 200);
    }

    @Test
    void organizationEndpointsValidateInputAndHideCrossOwnerReferences() throws Exception {
        Browser owner = browser(), other = browser();
        String collection = collection(owner, "Private", null), tag = tag(owner, "Private");
        String item = link(owner);
        call(other, get("/api/v1/collections/" + collection), null, 404);
        call(other, get("/api/v1/collections").param("parentId", collection), null, 404);
        call(other, get("/api/v1/collections/" + collection + "/ancestors"), null, 404);
        call(other, post("/api/v1/collections"), Map.of("name", "Child", "parentId", collection), 404);
        call(other, delete("/api/v1/tags/" + tag + "/items/" + item), null, 404);
        call(owner, post("/api/v1/collections"), Map.of("name", "x".repeat(121)), 400);
        call(owner, post("/api/v1/collections"), Map.of("name", "\u2003"), 400);
        call(owner, post("/api/v1/collections/items/" + item + "/move"), Map.of(), 400);
        call(owner, post("/api/v1/tags/" + tag + "/merge"), Map.of(), 400);
        call(owner, post("/api/v1/tags"), Map.of("name", "x", "color", "red"), 400);
        mvc.perform(post("/api/v1/tags").cookie(owner.cookie()).contentType("application/json").content("{\"name\":\"X\"}"))
                .andExpect(status().isForbidden());
    }

    private List<Integer> race(Callable<Integer> first, Callable<Integer> second) throws Exception {
        CyclicBarrier barrier = new CyclicBarrier(2);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var futures = List.of(first, second).stream().map(task -> executor.submit(() -> {
                barrier.await(10, TimeUnit.SECONDS);
                return task.call();
            })).toList();
            return List.of(futures.get(0).get(20, TimeUnit.SECONDS), futures.get(1).get(20, TimeUnit.SECONDS));
        }
    }
    private long itemVersion(String item) {
        return jdbc.queryForObject("SELECT version FROM items WHERE id=?", Long.class, UUID.fromString(item));
    }
    private int membershipCount(String item) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM collection_items WHERE item_id=?", Integer.class, UUID.fromString(item));
    }
    private String collection(Browser user, String name, String parent) throws Exception {
        Map<String,Object> body = new HashMap<>();
        body.put("name", name); body.put("parentId", parent);
        return json(call(user, post("/api/v1/collections"), body, 201)).get("id").asText();
    }
    private String tag(Browser user, String name) throws Exception {
        return json(call(user, post("/api/v1/tags"), Map.of("name",name), 201)).get("id").asText();
    }
    private String link(Browser user) throws Exception {
        return json(call(user, post("/api/v1/items/links"), Map.of("name","Reference","url","https://example.com"), 201)).get("id").asText();
    }
    private Browser browser() throws Exception {
        var csrf = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        Cookie cookie = csrf.getResponse().getCookie("SESSION");
        var token = json(csrf);
        Browser anonymous = new Browser(cookie, token.get("headerName").asText(), token.get("token").asText());
        var body = Map.of("email","org-" + UUID.randomUUID() + "@example.com","password","test-password-123","displayName","User");
        call(anonymous, post("/api/v1/auth/register"), body, 201);
        cookie = call(anonymous, post("/api/v1/auth/login"), body, 200).getResponse().getCookie("SESSION");
        token = json(mvc.perform(get("/api/v1/auth/csrf").cookie(cookie)).andReturn());
        return new Browser(cookie, token.get("headerName").asText(), token.get("token").asText());
    }
    private MvcResult raw(Browser user, MockHttpServletRequestBuilder request, Object body) throws Exception {
        request.cookie(user.cookie()).header(user.header(),user.token());
        if (body != null) request.contentType("application/json").content(mapper.writeValueAsString(body));
        return mvc.perform(request).andReturn();
    }
    private MvcResult call(Browser user, MockHttpServletRequestBuilder request, Object body, int expected) throws Exception {
        MvcResult result = raw(user,request,body);
        assertThat(result.getResponse().getStatus()).as(request.toString()).isEqualTo(expected);
        return result;
    }
    private JsonNode json(MvcResult result) throws Exception { return mapper.readTree(result.getResponse().getContentAsString()); }
    private record Browser(Cookie cookie, String header, String token) {}
}
