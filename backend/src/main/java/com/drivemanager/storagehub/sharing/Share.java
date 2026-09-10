package com.drivemanager.storagehub.sharing;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "shares")
public class Share {

    public enum TargetType { ITEM, COLLECTION }
    public enum Permission { VIEW }
    public enum Status { PENDING, ACCEPTED, REJECTED, REVOKED }

    @Id
    private UUID id;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 16)
    private TargetType targetType;

    @Column(name = "item_id")
    private UUID itemId;

    @Column(name = "collection_id")
    private UUID collectionId;

    @Column(name = "recipient_id", nullable = false)
    private UUID recipientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Permission permission;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected Share() {}

    public static Share forItem(UUID ownerId, UUID itemId, UUID recipientId) {
        Share s = new Share();
        s.id = UUID.randomUUID();
        s.ownerId = ownerId;
        s.targetType = TargetType.ITEM;
        s.itemId = itemId;
        s.recipientId = recipientId;
        s.permission = Permission.VIEW;
        s.status = Status.PENDING;
        s.createdAt = s.updatedAt = Instant.now();
        return s;
    }

    public static Share forCollection(UUID ownerId, UUID collectionId, UUID recipientId) {
        Share s = new Share();
        s.id = UUID.randomUUID();
        s.ownerId = ownerId;
        s.targetType = TargetType.COLLECTION;
        s.collectionId = collectionId;
        s.recipientId = recipientId;
        s.permission = Permission.VIEW;
        s.status = Status.PENDING;
        s.createdAt = s.updatedAt = Instant.now();
        return s;
    }

    public void accept() {
        this.status = Status.ACCEPTED;
        this.updatedAt = Instant.now();
    }

    public void reject() {
        this.status = Status.REJECTED;
        this.updatedAt = Instant.now();
    }

    public void revoke() {
        this.status = Status.REVOKED;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public TargetType getTargetType() { return targetType; }
    public UUID getItemId() { return itemId; }
    public UUID getCollectionId() { return collectionId; }
    public UUID getRecipientId() { return recipientId; }
    public Permission getPermission() { return permission; }
    public Status getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public long getVersion() { return version; }
}
