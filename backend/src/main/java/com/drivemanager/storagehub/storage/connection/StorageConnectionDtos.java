package com.drivemanager.storagehub.storage.connection;
import java.time.Instant;
import java.util.UUID;

public final class StorageConnectionDtos {
    private StorageConnectionDtos() {}
    public record ConnectResponse(String authorizationUrl) {}
    public record ConnectionResponse(
            UUID id,
            String provider,
            String displayName,
            String status,
            String grantedScopes,
            Long quotaTotalBytes,
            Long quotaUsedBytes,
            Long quotaUsageInDriveBytes,
            Long quotaRemainingBytes,
            Instant lastSyncedAt
    ) {
        public ConnectionResponse(UUID id, String provider, String displayName, String status, String grantedScopes) {
            this(id, provider, displayName, status, grantedScopes, null, null, null, null, null);
        }
    }
    public record SyncResultResponse(int newItems, int updatedItems, int totalItems) {}
}

