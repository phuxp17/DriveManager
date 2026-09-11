package com.drivemanager.storagehub.item;

import com.drivemanager.storagehub.auth.AuthService;
import com.drivemanager.storagehub.item.ItemDtos.*;
import java.net.URI;
import java.util.Locale;
import java.util.UUID;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItemService {
    private final ItemRepository items;
    private final AuthService auth;
    private final com.drivemanager.storagehub.sharing.SharingService sharing;
    public ItemService(ItemRepository items, AuthService auth, com.drivemanager.storagehub.sharing.SharingService sharing) {
        this.items = items;
        this.auth = auth;
        this.sharing = sharing;
    }

    @Transactional
    public ItemResponse createLink(String principal, CreateLink request) {
        String url = request.url().strip();
        URI uri = URI.create(url);
        if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                || uri.getHost() == null || uri.getHost().length() > 253 || uri.getRawUserInfo() != null
                || uri.getPort() > 65535 || uri.getPort() == 0) {
            throw new IllegalArgumentException("Invalid web URL");
        }
        String name = request.name().strip();
        if (name.isBlank()) throw new IllegalArgumentException("Name must not be blank");
        Item item = Item.link(auth.currentUser(principal).id(), name, request.description(),
                url, uri.getHost().toLowerCase(Locale.ROOT));
        return response(items.saveAndFlush(item));
    }

    @Transactional(readOnly = true)
    public ItemResponse get(String principal, UUID id) {
        UUID currentUserId = auth.currentUser(principal).id();
        Item item = items.findByIdAndDeletedAtIsNull(id).orElseThrow(ItemNotFoundException::new);
        if (item.getOwnerId().equals(currentUserId) || sharing.hasViewAccess(id, currentUserId)) {
            return response(item);
        }
        throw new ItemNotFoundException();
    }

    @Transactional
    public ItemResponse patch(String principal, UUID id, PatchItem request) {
        Item item = owned(principal, id);
        if (item.getVersion() != request.expectedVersion()) throw new ObjectOptimisticLockingFailureException(Item.class, id);
        String name = request.name() == null ? null : request.name().strip();
        if (name != null && name.isBlank()) throw new IllegalArgumentException("Name must not be blank");
        item.updateMetadata(name, request.description());
        return response(items.saveAndFlush(item));
    }
    private Item owned(String principal, UUID id) {
        return items.findByIdAndOwnerIdAndDeletedAtIsNull(id, auth.currentUser(principal).id()).orElseThrow(ItemNotFoundException::new);
    }
    public static ItemResponse response(Item item) {
        LinkContent link = item.getLink();
        FileContent file = item.getFile();
        String url = link != null ? link.getUrl() : null;
        String domain = link != null ? link.getDomain() : null;
        String storageFileId = null;
        String driveUrl = null;

        if (file != null) {
            storageFileId = file.getStorageFileId();
            driveUrl = "https://drive.google.com/file/d/" + storageFileId + "/view";
            if (url == null) {
                url = driveUrl;
                domain = "drive.google.com";
            }
        }

        return new ItemResponse(item.getId(), item.getOwnerId(), item.getType(), item.getName(), item.getDescription(),
                url, domain,
                item.getCreatedAt(), item.getUpdatedAt(), item.getVersion(),
                item.getReviewedAt(), item.getArchivedAt(), item.getDeletedAt(),
                file == null ? null : file.getOriginalFilename(),
                file == null ? null : file.getMimeType(),
                file == null ? null : file.getSizeBytes(),
                storageFileId, driveUrl);
    }
}
