package com.drivemanager.storagehub.item;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "items")
public class Item {
    @Id private UUID id;
    @Column(name = "owner_id", nullable = false) private UUID ownerId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) private Type type;
    @Column(nullable = false, length = 255) private String name;
    @Column(columnDefinition = "text") private String description;
    @Column(name = "reviewed_at") private Instant reviewedAt;
    @Column(name = "archived_at") private Instant archivedAt;
    @Column(name = "deleted_at") private Instant deletedAt;
    @Column(name = "deleted_by") private UUID deletedBy;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Version private long version;
    @OneToOne(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private LinkContent link;
    @OneToOne(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private FileContent file;

    protected Item() {}
    static Item link(UUID ownerId, String name, String description, String url, String domain) {
        Item item = new Item();
        item.id = UUID.randomUUID();
        item.ownerId = ownerId;
        item.type = Type.LINK;
        item.name = name;
        item.description = description;
        item.createdAt = Instant.now();
        item.updatedAt = item.createdAt;
        item.link = new LinkContent(item, url, domain);
        return item;
    }
    public static Item file(UUID ownerId, String name, String description, Type type,
                            UUID storageConnectionId, String storageFileId, String originalFilename,
                            String mimeType, long sizeBytes, String md5Checksum) {
        Item item = new Item();
        item.id = UUID.randomUUID();
        item.ownerId = ownerId;
        item.type = type != null ? type : Type.FILE;
        item.name = name;
        item.description = description;
        item.createdAt = Instant.now();
        item.updatedAt = item.createdAt;
        item.file = new FileContent(item, storageConnectionId, storageFileId, originalFilename, mimeType, sizeBytes, md5Checksum);
        return item;
    }
    public void updateMetadata(String name, String description) {
        if (name != null) this.name = name;
        if (description != null) this.description = description;
        updatedAt = Instant.now();
    }
    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public Type getType() { return type; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public long getVersion() { return version; }
    public LinkContent getLink() { return link; }
    public FileContent getFile() { return file; }
    public Instant getReviewedAt() { return reviewedAt; }
    public Instant getArchivedAt() { return archivedAt; }
    public Instant getDeletedAt() { return deletedAt; }
    public void markOrganizationChanged() { updatedAt = Instant.now(); }
    void review(boolean reviewed) { reviewedAt = reviewed ? Instant.now() : null; updatedAt = Instant.now(); }
    void archive(boolean archived) { archivedAt = archived ? Instant.now() : null; updatedAt = Instant.now(); }
    void trash(UUID actor) {
        if (deletedAt == null) { deletedAt = Instant.now(); deletedBy = actor; updatedAt = deletedAt; }
    }
    void restore() { deletedAt = null; deletedBy = null; updatedAt = Instant.now(); }
    public enum Type { FILE, IMAGE, VIDEO, DOCUMENT, AUDIO, ARCHIVE, LINK, NOTE }
}
