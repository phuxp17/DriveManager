package com.drivemanager.storagehub.tag;

import com.drivemanager.storagehub.auth.AuthService;
import com.drivemanager.storagehub.common.error.OrganizationConflictException;
import com.drivemanager.storagehub.item.Item;
import com.drivemanager.storagehub.item.ItemNotFoundException;
import com.drivemanager.storagehub.item.ItemRepository;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TagService {
    private final TagRepository tags;
    private final ItemRepository items;
    private final AuthService auth;
    private final JdbcTemplate jdbc;
    private final ApplicationUserRepository users;
    public TagService(TagRepository tags, ItemRepository items, AuthService auth, JdbcTemplate jdbc, ApplicationUserRepository users) {
        this.tags = tags; this.items = items; this.auth = auth; this.jdbc = jdbc; this.users = users;
    }
    @Transactional
    public Tag create(String p, String name, String color) {
        UUID owner = lockedOwner(p);
        String clean = cleanName(name, color);
        return persist(new Tag(owner, clean, normalize(clean), color));
    }
    @Transactional(readOnly = true)
    public List<Tag> list(String p) { return tags.findByOwnerIdOrderByNameAsc(auth.currentUser(p).id()); }
    @Transactional
    public Tag rename(String p, UUID id, String name, String color) {
        Tag tag = owned(lockedOwner(p), id);
        String clean = cleanName(name, color);
        tag.rename(clean, normalize(clean), color);
        return persist(tag);
    }
    @Transactional
    public void add(String p, UUID itemId, UUID tagId) {
        UUID owner = lockedOwner(p);
        Item item = lockedItem(owner, itemId);
        owned(owner, tagId);
        int changed = jdbc.update("INSERT INTO item_tags(item_id,tag_id,owner_id,created_at) VALUES (?,?,?,now()) ON CONFLICT DO NOTHING",
                itemId, tagId, owner);
        if (changed > 0) item.markOrganizationChanged();
    }
    @Transactional
    public void remove(String p, UUID itemId, UUID tagId) {
        UUID owner = lockedOwner(p);
        Item item = lockedItem(owner, itemId);
        owned(owner, tagId);
        if (jdbc.update("DELETE FROM item_tags WHERE item_id=? AND tag_id=? AND owner_id=?", itemId, tagId, owner) > 0)
            item.markOrganizationChanged();
    }
    @Transactional
    public void merge(String p, UUID source, UUID target) {
        if (source == null || target == null) throw new IllegalArgumentException();
        UUID owner = lockedOwner(p);
        Tag sourceTag = owned(owner, source);
        owned(owner, target);
        if (source.equals(target)) return;
        touchTaggedItems(owner, source);
        jdbc.update("INSERT INTO item_tags(item_id,tag_id,owner_id,created_at) SELECT item_id,?,owner_id,now() FROM item_tags "
                + "WHERE tag_id=? AND owner_id=? ON CONFLICT DO NOTHING", target, source, owner);
        jdbc.update("DELETE FROM item_tags WHERE tag_id=? AND owner_id=?", source, owner);
        tags.delete(sourceTag);
        tags.flush();
    }
    @Transactional
    public void delete(String p, UUID id) {
        UUID owner = lockedOwner(p);
        Tag tag = owned(owner, id);
        touchTaggedItems(owner, id);
        jdbc.update("DELETE FROM item_tags WHERE tag_id=? AND owner_id=?", id, owner);
        tags.delete(tag);
        tags.flush();
    }
    private void touchTaggedItems(UUID owner, UUID tag) {
        // No Item entities are loaded in these bulk operations; version protects concurrent metadata edits.
        jdbc.update("UPDATE items SET updated_at=clock_timestamp(),version=version+1 WHERE owner_id=? "
                + "AND id IN (SELECT item_id FROM item_tags WHERE owner_id=? AND tag_id=?)", owner, owner, tag);
    }
    private Tag persist(Tag tag) {
        try { return tags.saveAndFlush(tag); }
        catch (DataIntegrityViolationException ex) { throw new OrganizationConflictException(); }
    }
    private Tag owned(UUID owner, UUID id) { return tags.findByIdAndOwnerId(id, owner).orElseThrow(NoSuchElementException::new); }
    private Item lockedItem(UUID owner, UUID id) {
        Item item = items.findOwnedForUpdate(id, owner).orElseThrow(ItemNotFoundException::new);
        if (item.getDeletedAt() != null) throw new ItemNotFoundException();
        return item;
    }
    private UUID lockedOwner(String p) {
        UUID owner = auth.currentUser(p).id();
        users.findByIdForUpdate(owner).orElseThrow(NoSuchElementException::new);
        return owner;
    }
    private static String cleanName(String name, String color) {
        if (name == null || (color != null && !color.matches("#[0-9A-Fa-f]{6}"))) throw new IllegalArgumentException();
        String clean = Normalizer.normalize(name.strip(), Normalizer.Form.NFC);
        if (clean.isBlank() || clean.length() > 64 || normalize(clean).length() > 64) throw new IllegalArgumentException();
        return clean;
    }
    private static String normalize(String name) { return name.toLowerCase(Locale.ROOT); }
}
