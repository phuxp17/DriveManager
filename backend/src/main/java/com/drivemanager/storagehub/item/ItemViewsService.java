package com.drivemanager.storagehub.item;

import com.drivemanager.storagehub.auth.AuthService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.HashMap;
import java.util.Set;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItemViewsService {
    public record Entry(UUID id, UUID ownerId, String type, String name, String description, String url, String domain,
                        Instant createdAt, Instant updatedAt, long version, Instant reviewedAt, Instant archivedAt,
                        Instant deletedAt, Instant favoritedAt, Instant lastOpenedAt) {}
    public record Page(List<Entry> content, int page, int size, long totalElements, long totalPages) {}
    public record Filters(String q, String type, List<UUID> tags, UUID collectionId,
                          Boolean favorite, Instant createdFrom, Instant createdBefore, String sort) {}
    private final NamedParameterJdbcTemplate jdbc;
    private final AuthService auth;
    public ItemViewsService(NamedParameterJdbcTemplate jdbc, AuthService auth) { this.jdbc = jdbc; this.auth = auth; }

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Page list(String principal, String view, int page, int size, Filters search) {
        if (page < 0 || page > 100000 || size < 1 || size > 100) throw new IllegalArgumentException("Invalid pagination");
        if (search.q() != null && search.q().length() > 200) throw new IllegalArgumentException("Search too long");
        Set<UUID> selectedTags = search.tags() == null ? Set.of() : Set.copyOf(search.tags());
        if (selectedTags.size() > 20) throw new IllegalArgumentException("Too many tags");
        if (search.type() != null && !Set.of("FILE", "IMAGE", "VIDEO", "DOCUMENT", "AUDIO", "ARCHIVE", "LINK", "NOTE").contains(search.type()))
            throw new IllegalArgumentException("Invalid item type");
        if (search.createdFrom() != null && search.createdBefore() != null
                && !search.createdFrom().isBefore(search.createdBefore())) throw new IllegalArgumentException("Invalid date range");
        String sharedClause = "(sh.recipient_id = :owner AND sh.status = 'ACCEPTED' AND ("
                + "(sh.target_type = 'ITEM' AND sh.item_id = i.id) OR "
                + "(sh.target_type = 'COLLECTION' AND EXISTS ("
                + "WITH RECURSIVE descendants(id) AS (SELECT c.id FROM collections c WHERE c.id=sh.collection_id AND c.deleted_at IS NULL "
                + "UNION ALL SELECT c.id FROM collections c JOIN descendants d ON c.parent_id=d.id WHERE c.deleted_at IS NULL) "
                + "SELECT 1 FROM collection_items ci JOIN descendants d ON d.id=ci.collection_id WHERE ci.item_id=i.id))))";

        String active = "i.deleted_at IS NULL AND i.archived_at IS NULL";
        String filter = switch (view) {
            case "active" -> active + " AND i.owner_id = :owner";
            case "inbox" -> active + " AND i.owner_id = :owner AND i.reviewed_at IS NULL";
            case "uncategorized" -> active + " AND i.owner_id = :owner AND NOT EXISTS (SELECT 1 FROM collection_items ci JOIN collections c "
                    + "ON c.id=ci.collection_id WHERE ci.item_id=i.id AND c.deleted_at IS NULL)";
            case "favorites" -> active + " AND s.favorited_at IS NOT NULL AND (i.owner_id = :owner OR EXISTS (SELECT 1 FROM shares sh WHERE " + sharedClause + "))";
            case "recent" -> active + " AND s.last_opened_at IS NOT NULL AND (i.owner_id = :owner OR EXISTS (SELECT 1 FROM shares sh WHERE " + sharedClause + "))";
            case "shared" -> active + " AND i.owner_id <> :owner AND EXISTS (SELECT 1 FROM shares sh WHERE " + sharedClause + ")";
            case "archive" -> "i.deleted_at IS NULL AND i.archived_at IS NOT NULL AND i.owner_id = :owner";
            case "trash" -> "i.deleted_at IS NOT NULL AND i.owner_id = :owner";
            default -> throw new IllegalArgumentException("Invalid library view");
        };
        String order = switch (view) {
            case "recent" -> "s.last_opened_at";
            case "favorites" -> "s.favorited_at";
            case "trash" -> "i.deleted_at";
            default -> "i.created_at";
        };
        if (search.sort() != null) order = switch (search.sort()) {
            case "added" -> "i.created_at";
            case "modified" -> "i.updated_at";
            default -> throw new IllegalArgumentException("Invalid sort");
        };
        Map<String, Object> params = new HashMap<>();
        params.put("owner", auth.currentUser(principal).id());
        params.put("limit", size);
        params.put("offset", (long) page * size);
        if (search.q() != null && !search.q().isBlank()) {
            // Treat wildcard characters literally; JDBC binding also keeps query text out of SQL syntax.
            params.put("q", "%" + search.q().strip().replace("!", "!!").replace("%", "!%")
                    .replace("_", "!_") + "%");
            filter += " AND (i.name ILIKE :q ESCAPE '!' OR i.description ILIKE :q ESCAPE '!' "
                    + "OR l.url ILIKE :q ESCAPE '!' OR l.domain ILIKE :q ESCAPE '!' "
                    + "OR EXISTS (SELECT 1 FROM item_tags it JOIN tags t ON t.id=it.tag_id "
                    + "WHERE it.item_id=i.id AND t.owner_id=:owner AND t.name ILIKE :q ESCAPE '!') "
                    + "OR EXISTS (SELECT 1 FROM collection_items ci JOIN collections c ON c.id=ci.collection_id "
                    + "WHERE ci.item_id=i.id AND c.owner_id=:owner AND c.deleted_at IS NULL AND c.name ILIKE :q ESCAPE '!'))";
        }
        if (search.type() != null) {
            filter += " AND i.type=:type"; params.put("type", search.type());
        }
        if (search.collectionId() != null) {
            filter += " AND EXISTS (SELECT 1 FROM collection_items ci JOIN collections c ON c.id=ci.collection_id "
                    + "WHERE ci.item_id=i.id AND c.id=:collection AND c.owner_id=:owner AND c.deleted_at IS NULL)";
            params.put("collection", search.collectionId());
        }
        if (!selectedTags.isEmpty()) {
            filter += " AND (SELECT COUNT(*) FROM item_tags it WHERE it.item_id=i.id AND it.owner_id=:owner "
                    + "AND it.tag_id IN (:tags))=:tagCount";
            params.put("tags", selectedTags); params.put("tagCount", selectedTags.size());
        }
        if (search.favorite() != null) filter += search.favorite()
                ? " AND s.favorited_at IS NOT NULL" : " AND s.favorited_at IS NULL";
        if (search.createdFrom() != null) {
            filter += " AND i.created_at>=:createdFrom";
            params.put("createdFrom", java.sql.Timestamp.from(search.createdFrom()));
        }
        if (search.createdBefore() != null) {
            filter += " AND i.created_at<:createdBefore";
            params.put("createdBefore", java.sql.Timestamp.from(search.createdBefore()));
        }
        // Only server-owned SQL fragments are concatenated; every caller value is bound.
        String from = " FROM items i LEFT JOIN link_contents l ON l.item_id=i.id LEFT JOIN user_item_states s "
                + "ON s.item_id=i.id AND s.user_id=:owner WHERE " + filter;
        Long total = jdbc.queryForObject("SELECT COUNT(*)" + from, params, Long.class);
        List<Entry> rows = jdbc.query("SELECT i.*,l.url,l.domain,s.favorited_at,s.last_opened_at" + from
                + " ORDER BY " + order + " DESC,i.id DESC LIMIT :limit OFFSET :offset", params, (rs, row) -> new Entry(
                rs.getObject("id", UUID.class), rs.getObject("owner_id", UUID.class), rs.getString("type"),
                rs.getString("name"), rs.getString("description"), rs.getString("url"), rs.getString("domain"),
                instant(rs,"created_at"), instant(rs,"updated_at"), rs.getLong("version"), instant(rs,"reviewed_at"),
                instant(rs,"archived_at"), instant(rs,"deleted_at"), instant(rs,"favorited_at"), instant(rs,"last_opened_at")));
        return new Page(rows, page, size, total, (total + size - 1) / size);
    }
    private static Instant instant(ResultSet row, String field) throws SQLException {
        var value = row.getTimestamp(field);
        return value == null ? null : value.toInstant();
    }
}
