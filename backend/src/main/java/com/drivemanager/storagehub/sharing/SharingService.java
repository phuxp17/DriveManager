package com.drivemanager.storagehub.sharing;

import com.drivemanager.storagehub.auth.AuthService;
import com.drivemanager.storagehub.collection.Collection;
import com.drivemanager.storagehub.collection.CollectionItemRepository;
import com.drivemanager.storagehub.collection.CollectionRepository;
import com.drivemanager.storagehub.common.error.OrganizationConflictException;
import com.drivemanager.storagehub.item.Item;
import com.drivemanager.storagehub.item.ItemNotFoundException;
import com.drivemanager.storagehub.item.ItemRepository;
import com.drivemanager.storagehub.user.ApplicationUser;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SharingService {

    private final ShareRepository shares;
    private final ApplicationUserRepository users;
    private final ItemRepository items;
    private final CollectionRepository collections;
    private final CollectionItemRepository collectionItems;
    private final AuthService auth;

    public SharingService(ShareRepository shares,
                          ApplicationUserRepository users,
                          ItemRepository items,
                          CollectionRepository collections,
                          CollectionItemRepository collectionItems,
                          AuthService auth) {
        this.shares = shares;
        this.users = users;
        this.items = items;
        this.collections = collections;
        this.collectionItems = collectionItems;
        this.auth = auth;
    }

    @Transactional
    public SharingDtos.ShareResponse createShare(String principal, SharingDtos.CreateShareRequest request) {
        UUID ownerId = auth.currentUser(principal).id();
        String normalizedEmail = request.recipientEmail().strip().toLowerCase(Locale.ROOT);
        ApplicationUser recipient = users.findByNormalizedEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("Recipient not found with email: " + request.recipientEmail()));

        if (recipient.getId().equals(ownerId)) {
            throw new IllegalArgumentException("Cannot share with yourself");
        }

        Share share;
        String targetName;
        if (request.targetType() == Share.TargetType.ITEM) {
            Item item = items.findByIdAndOwnerIdAndDeletedAtIsNull(request.targetId(), ownerId)
                    .orElseThrow(ItemNotFoundException::new);
            targetName = item.getName();
            List<Share> existing = shares.findByItemIdAndRecipientIdAndStatusIn(
                    item.getId(), recipient.getId(), List.of(Share.Status.PENDING, Share.Status.ACCEPTED));
            if (!existing.isEmpty()) {
                throw new OrganizationConflictException("Active share already exists for this item and recipient");
            }
            share = Share.forItem(ownerId, item.getId(), recipient.getId());
        } else if (request.targetType() == Share.TargetType.COLLECTION) {
            Collection col = collections.findByIdAndOwnerId(request.targetId(), ownerId)
                    .filter(c -> c.getDeletedAt() == null)
                    .orElseThrow(NoSuchElementException::new);
            targetName = col.getName();
            List<Share> existing = shares.findByCollectionIdAndRecipientIdAndStatusIn(
                    col.getId(), recipient.getId(), List.of(Share.Status.PENDING, Share.Status.ACCEPTED));
            if (!existing.isEmpty()) {
                throw new OrganizationConflictException("Active share already exists for this collection and recipient");
            }
            share = Share.forCollection(ownerId, col.getId(), recipient.getId());
        } else {
            throw new IllegalArgumentException("Unsupported target type: " + request.targetType());
        }

        shares.save(share);
        ApplicationUser owner = users.findById(ownerId).orElseThrow();
        return toResponse(share, owner, recipient, targetName);
    }

    @Transactional(readOnly = true)
    public List<SharingDtos.ShareResponse> listIncomingShares(String principal) {
        UUID recipientId = auth.currentUser(principal).id();
        List<Share> incoming = shares.findByRecipientIdAndStatusInOrderByCreatedAtDesc(
                recipientId, List.of(Share.Status.PENDING, Share.Status.ACCEPTED));
        return incoming.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<SharingDtos.ShareResponse> listOutgoingShares(String principal) {
        UUID ownerId = auth.currentUser(principal).id();
        return shares.findByOwnerIdOrderByUpdatedAtDesc(ownerId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SharingDtos.ShareResponse acceptShare(String principal, UUID shareId) {
        UUID recipientId = auth.currentUser(principal).id();
        Share share = shares.findByIdAndRecipientId(shareId, recipientId)
                .orElseThrow(NoSuchElementException::new);
        if (share.getStatus() != Share.Status.PENDING) {
            throw new OrganizationConflictException("Share is not in PENDING state");
        }
        share.accept();
        shares.save(share);
        return toResponse(share);
    }

    @Transactional
    public SharingDtos.ShareResponse rejectShare(String principal, UUID shareId) {
        UUID recipientId = auth.currentUser(principal).id();
        Share share = shares.findByIdAndRecipientId(shareId, recipientId)
                .orElseThrow(NoSuchElementException::new);
        if (share.getStatus() != Share.Status.PENDING) {
            throw new OrganizationConflictException("Share is not in PENDING state");
        }
        share.reject();
        shares.save(share);
        return toResponse(share);
    }

    @Transactional
    public void revokeOrLeave(String principal, UUID shareId) {
        UUID currentUserId = auth.currentUser(principal).id();
        Share share = shares.findById(shareId).orElseThrow(NoSuchElementException::new);
        if (share.getOwnerId().equals(currentUserId)) {
            if (share.getStatus() != Share.Status.PENDING && share.getStatus() != Share.Status.ACCEPTED) {
                throw new OrganizationConflictException("Share cannot be revoked");
            }
            share.revoke();
            shares.save(share);
        } else if (share.getRecipientId().equals(currentUserId)) {
            if (share.getStatus() != Share.Status.ACCEPTED) {
                throw new OrganizationConflictException("Share cannot be left");
            }
            share.reject();
            shares.save(share);
        } else {
            throw new NoSuchElementException();
        }
    }

    @Transactional(readOnly = true)
    public boolean hasViewAccess(UUID itemId, UUID userId) {
        // 1. Direct share on item
        if (shares.existsByItemIdAndRecipientIdAndStatus(itemId, userId, Share.Status.ACCEPTED)) {
            return true;
        }
        // 2. Inherited share via collections
        List<UUID> collectionIds = collectionItems.findCollectionIdsByItemId(itemId);
        if (collectionIds.isEmpty()) {
            return false;
        }
        List<UUID> acceptedCollections = shares.findDirectSharedCollectionIds(userId);
        if (acceptedCollections.isEmpty()) {
            return false;
        }
        Set<UUID> acceptedSet = new HashSet<>(acceptedCollections);
        for (UUID colId : collectionIds) {
            if (isCollectionOrAncestorShared(colId, acceptedSet)) {
                return true;
            }
        }
        return false;
    }

    private boolean isCollectionOrAncestorShared(UUID colId, Set<UUID> acceptedSet) {
        UUID curr = colId;
        int depth = 0;
        while (curr != null && depth < 12) {
            Collection c = collections.findById(curr).orElse(null);
            if (c == null || c.getDeletedAt() != null) {
                return false;
            }
            if (acceptedSet.contains(curr)) return true;
            curr = c.getParentId();
            depth++;
        }
        return false;
    }

    private SharingDtos.ShareResponse toResponse(Share share) {
        ApplicationUser owner = users.findById(share.getOwnerId()).orElse(null);
        ApplicationUser recipient = users.findById(share.getRecipientId()).orElse(null);
        String targetName = "";
        if (share.getTargetType() == Share.TargetType.ITEM && share.getItemId() != null) {
            targetName = items.findById(share.getItemId()).map(Item::getName).orElse("");
        } else if (share.getTargetType() == Share.TargetType.COLLECTION && share.getCollectionId() != null) {
            targetName = collections.findById(share.getCollectionId()).map(Collection::getName).orElse("");
        }
        return toResponse(share, owner, recipient, targetName);
    }

    private SharingDtos.ShareResponse toResponse(Share share, ApplicationUser owner, ApplicationUser recipient, String targetName) {
        UUID targetId = share.getTargetType() == Share.TargetType.ITEM ? share.getItemId() : share.getCollectionId();
        return new SharingDtos.ShareResponse(
                share.getId(),
                share.getOwnerId(),
                owner != null ? owner.getEmail() : null,
                share.getTargetType(),
                targetId,
                targetName,
                share.getRecipientId(),
                recipient != null ? recipient.getEmail() : null,
                share.getPermission().name(),
                share.getStatus().name(),
                share.getCreatedAt(),
                share.getUpdatedAt()
        );
    }
}
