package com.drivemanager.storagehub.storage.connection;
import java.util.UUID;
public final class StorageConnectionDtos {
    private StorageConnectionDtos() {}
    public record ConnectResponse(String authorizationUrl) {}
    public record ConnectionResponse(UUID id, String provider, String displayName, String status, String grantedScopes) {}
}
