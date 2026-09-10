package com.drivemanager.storagehub.item;

import com.drivemanager.storagehub.auth.AuthService;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItemLifecycleService {
    private final ItemRepository items;
    private final AuthService auth;
    private final JdbcTemplate jdbc;
    private final ApplicationUserRepository users;
    private final com.drivemanager.storagehub.sharing.SharingService sharing;
    public ItemLifecycleService(ItemRepository items, AuthService auth, JdbcTemplate jdbc,
                                ApplicationUserRepository users,
                                com.drivemanager.storagehub.sharing.SharingService sharing) {
        this.items = items; this.auth = auth; this.jdbc = jdbc; this.users = users; this.sharing = sharing;
    }

    @Transactional
    public void review(String principal, UUID id, boolean reviewed) { owned(principal, id, false).review(reviewed); }
    @Transactional
    public void archive(String principal, UUID id, boolean archived) { owned(principal, id, false).archive(archived); }
    @Transactional
    public void trash(String principal, UUID id) {
        Item item = owned(principal, id, true);
        item.trash(item.getOwnerId());
    }
    @Transactional
    public void restore(String principal, UUID id) {
        Item item = owned(principal, id, true);
        if (item.getDeletedAt() == null) throw new ItemNotFoundException();
        item.restore();
    }
    @Transactional
    public void purge(String principal, UUID id) {
        Item item = owned(principal, id, true);
        if (item.getDeletedAt() == null) throw new ItemNotFoundException();
        UUID owner = item.getOwnerId();
        jdbc.update("DELETE FROM item_tags WHERE item_id=? AND owner_id=?", id, owner);
        jdbc.update("DELETE FROM collection_items WHERE item_id=? AND owner_id=?", id, owner);
        items.delete(item);
    }

    @Transactional
    public void favorite(String principal, UUID id, boolean favorite) {
        UUID actorId = accessible(principal, id);
        if (favorite) {
            jdbc.update("INSERT INTO user_item_states(user_id,item_id,favorited_at) VALUES (?,?,now()) "
                    + "ON CONFLICT (user_id,item_id) DO UPDATE SET favorited_at=COALESCE(user_item_states.favorited_at,EXCLUDED.favorited_at)",
                    actorId, id);
        } else {
            jdbc.update("UPDATE user_item_states SET favorited_at=NULL WHERE user_id=? AND item_id=?", actorId, id);
        }
    }

    @Transactional
    public void opened(String principal, UUID id) {
        UUID actorId = accessible(principal, id);
        jdbc.update("INSERT INTO user_item_states(user_id,item_id,last_opened_at) VALUES (?,?,now()) "
                + "ON CONFLICT (user_id,item_id) DO UPDATE SET last_opened_at=EXCLUDED.last_opened_at", actorId, id);
    }

    private UUID accessible(String principal, UUID id) {
        UUID actorId = auth.currentUser(principal).id();
        Item item = items.findByIdAndDeletedAtIsNull(id).orElseThrow(ItemNotFoundException::new);
        if (item.getOwnerId().equals(actorId) || sharing.hasViewAccess(id, actorId)) {
            return actorId;
        }
        throw new ItemNotFoundException();
    }

    private Item owned(String principal, UUID id, boolean includeTrash) {
        UUID owner = auth.currentUser(principal).id();
        // Use the same owner-then-item lock order as organization writes.
        users.findByIdForUpdate(owner).orElseThrow(ItemNotFoundException::new);
        Item item = items.findOwnedForUpdate(id, owner).orElseThrow(ItemNotFoundException::new);
        if (!includeTrash && item.getDeletedAt() != null) throw new ItemNotFoundException();
        return item;
    }
}
