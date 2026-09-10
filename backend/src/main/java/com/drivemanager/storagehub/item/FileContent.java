package com.drivemanager.storagehub.item;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "file_contents")
public class FileContent {

    @Id
    @Column(name = "item_id")
    private UUID itemId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id")
    private Item item;

    @Column(name = "storage_connection_id", nullable = false)
    private UUID storageConnectionId;

    @Column(name = "storage_file_id", nullable = false)
    private String storageFileId;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "mime_type", nullable = false, length = 127)
    private String mimeType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "md5_checksum", length = 64)
    private String md5Checksum;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected FileContent() {}

    public FileContent(Item item, UUID storageConnectionId, String storageFileId,
                       String originalFilename, String mimeType, long sizeBytes, String md5Checksum) {
        this.item = item;
        this.storageConnectionId = storageConnectionId;
        this.storageFileId = storageFileId;
        this.originalFilename = originalFilename;
        this.mimeType = mimeType;
        this.sizeBytes = sizeBytes;
        this.md5Checksum = md5Checksum;
        this.createdAt = Instant.now();
    }

    public UUID getItemId() { return itemId; }
    public Item getItem() { return item; }
    public UUID getStorageConnectionId() { return storageConnectionId; }
    public String getStorageFileId() { return storageFileId; }
    public String getOriginalFilename() { return originalFilename; }
    public String getMimeType() { return mimeType; }
    public long getSizeBytes() { return sizeBytes; }
    public String getMd5Checksum() { return md5Checksum; }
    public Instant getCreatedAt() { return createdAt; }
}
