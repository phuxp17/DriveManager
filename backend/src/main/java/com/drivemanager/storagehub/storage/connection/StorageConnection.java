package com.drivemanager.storagehub.storage.connection;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "storage_connections")
public class StorageConnection {
    @Id private UUID id;
    @Column(name = "owner_id", nullable = false) private UUID ownerId;
    @Column(nullable = false) private String provider;
    @Column(name = "provider_issuer", nullable = false) private String providerIssuer;
    @Column(name = "provider_subject", nullable = false) private String providerSubject;
    @Column(name = "display_name") private String displayName;
    @Column(name = "granted_scopes", nullable = false) private String grantedScopes;
    @Column(name = "encrypted_refresh_token") private byte[] encryptedRefreshToken;
    @Column(nullable = false) private String status;
    @Column(name = "quota_total_bytes") private Long quotaTotalBytes;
    @Column(name = "quota_used_bytes") private Long quotaUsedBytes;
    @Column(name = "quota_usage_in_drive_bytes") private Long quotaUsageInDriveBytes;
    @Column(name = "last_synced_at") private Instant lastSyncedAt;
    @Version private long version;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected StorageConnection() {}

    StorageConnection(UUID id, UUID ownerId, String issuer, String subject, String displayName, String scopes, byte[] refreshToken) {
        this.id = id;
        this.ownerId = ownerId;
        this.provider = "GOOGLE";
        this.providerIssuer = issuer;
        this.providerSubject = subject;
        this.displayName = displayName;
        this.grantedScopes = scopes;
        this.encryptedRefreshToken = refreshToken;
        this.status = "CONNECTED";
        this.createdAt = this.updatedAt = Instant.now();
    }

    void reconnect(String displayName, String scopes, byte[] refreshToken) {
        this.displayName = displayName;
        this.grantedScopes = scopes;
        if (refreshToken != null) {
            this.encryptedRefreshToken = refreshToken;
        }
        this.status = "CONNECTED";
        this.updatedAt = Instant.now();
    }

    void disconnect() {
        this.status = "DISCONNECTED";
        this.updatedAt = Instant.now();
    }

    void markReauthenticationRequired() {
        this.status = "REAUTHENTICATION_REQUIRED";
        this.updatedAt = Instant.now();
    }

    public void updateQuota(Long total, Long used, Long inDrive) {
        this.quotaTotalBytes = total;
        this.quotaUsedBytes = used;
        this.quotaUsageInDriveBytes = inDrive;
        this.updatedAt = Instant.now();
    }

    public void markSynced() {
        this.lastSyncedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public String getProvider() { return provider; }
    public String getProviderIssuer() { return providerIssuer; }
    public String getProviderSubject() { return providerSubject; }
    public String getDisplayName() { return displayName; }
    public String getGrantedScopes() { return grantedScopes; }
    public String getStatus() { return status; }
    public Long getQuotaTotalBytes() { return quotaTotalBytes; }
    public Long getQuotaUsedBytes() { return quotaUsedBytes; }
    public Long getQuotaUsageInDriveBytes() { return quotaUsageInDriveBytes; }
    public Instant getLastSyncedAt() { return lastSyncedAt; }
    public byte[] getEncryptedRefreshToken() { return encryptedRefreshToken == null ? null : encryptedRefreshToken.clone(); }
}
