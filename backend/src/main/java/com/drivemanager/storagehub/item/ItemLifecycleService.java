package com.drivemanager.storagehub.item;

import com.drivemanager.storagehub.auth.AuthService;
import com.drivemanager.storagehub.storage.StorageProvider;
import com.drivemanager.storagehub.storage.connection.StorageOAuthService;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItemLifecycleService {
    private static final Logger log = LoggerFactory.getLogger(ItemLifecycleService.class);

    private final ItemRepository items;
    private final AuthService auth;
    private final JdbcTemplate jdbc;
    private final ApplicationUserRepository users;
    private final com.drivemanager.storagehub.sharing.SharingService sharing;
    private final ObjectProvider<StorageProvider> storageProvider;
    private final StorageOAuthService oauthService;
    private final FileContentRepository fileContents;

    public ItemLifecycleService(ItemRepository items, AuthService auth, JdbcTemplate jdbc,
                                ApplicationUserRepository users,
                                com.drivemanager.storagehub.sharing.SharingService sharing,
                                ObjectProvider<StorageProvider> storageProvider,
                                StorageOAuthService oauthService,
                                FileContentRepository fileContents) {
        this.items = items; this.auth = auth; this.jdbc = jdbc; this.users = users; this.sharing = sharing;
        this.storageProvider = storageProvider;
        this.oauthService = oauthService;
        this.fileContents = fileContents;
    }

    @Transactional
    public void review(String principal, UUID id, boolean reviewed) { owned(principal, id, false).review(reviewed); }
    @Transactional
    public void archive(String principal, UUID id, boolean archived) { owned(principal, id, false).archive(archived); }
    @Transactional
    public void trash(String principal, UUID id) {
        Item item = owned(principal, id, true);
        item.trash(item.getOwnerId());
        trashOnStorage(principal, id, true);
    }
    @Transactional
    public void restore(String principal, UUID id) {
        Item item = owned(principal, id, true);
        if (item.getDeletedAt() == null) throw new ItemNotFoundException();
        item.restore();
        trashOnStorage(principal, id, false);
    }
    @Transactional
    public void purge(String principal, UUID id) {
        Item item = owned(principal, id, true);
        if (item.getDeletedAt() == null) throw new ItemNotFoundException();
        deleteOnStorage(principal, id);
        UUID owner = item.getOwnerId();
        jdbc.update("DELETE FROM item_tags WHERE item_id=? AND owner_id=?", id, owner);
        jdbc.update("DELETE FROM collection_items WHERE item_id=? AND owner_id=?", id, owner);
        items.delete(item);
    }

    private void trashOnStorage(String principal, UUID id, boolean trashed) {
        try {
            fileContents.findById(id).ifPresent(fc -> {
                StorageProvider provider = storageProvider.getIfAvailable();
                if (provider != null && provider.isConfigured() && fc.getStorageConnectionId() != null && fc.getStorageFileId() != null) {
                    try {
                        String token = oauthService.getFreshAccessToken(principal, fc.getStorageConnectionId());
                        provider.trashFile(token, fc.getStorageFileId(), trashed);
                    } catch (Exception ex) {
                        log.warn("Could not obtain token or update trash on storage provider for item {}: {}", id, ex.getMessage());
                    }
                }
            });
        } catch (Exception ex) {
            log.warn("Error during storage trash action for item {}: {}", id, ex.getMessage());
        }
    }

    private void deleteOnStorage(String principal, UUID id) {
        try {
            fileContents.findById(id).ifPresent(fc -> {
                StorageProvider provider = storageProvider.getIfAvailable();
                if (provider != null && provider.isConfigured() && fc.getStorageConnectionId() != null && fc.getStorageFileId() != null) {
                    try {
                        String token = oauthService.getFreshAccessToken(principal, fc.getStorageConnectionId());
                        provider.deleteFile(token, fc.getStorageFileId());
                    } catch (Exception ex) {
                        log.warn("Could not obtain token or permanently delete from storage provider for item {}: {}", id, ex.getMessage());
                    }
                }
            });
        } catch (Exception ex) {
            log.warn("Error during storage permanent delete action for item {}: {}", id, ex.getMessage());
        }
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
