package com.drivemanager.storagehub.storage.connection;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name = "oauth_authorizations")
public class OAuthAuthorization {
    @Id private UUID id;
    @Column(name="state_digest", nullable=false) private byte[] stateDigest;
    @Column(name="owner_id", nullable=false) private UUID ownerId;
    @Column(name="session_id", nullable=false) private String sessionId;
    @Column(name="connection_id") private UUID connectionId;
    @Column(name="encrypted_pkce_verifier", nullable=false) private byte[] encryptedPkceVerifier;
    @Column(name="expires_at", nullable=false) private Instant expiresAt;
    @Column(name="consumed_at") private Instant consumedAt;
    protected OAuthAuthorization() {}
    OAuthAuthorization(byte[] stateDigest, UUID ownerId, String sessionId, UUID connectionId, byte[] verifier) { id=UUID.randomUUID(); this.stateDigest=stateDigest; this.ownerId=ownerId; this.sessionId=sessionId; this.connectionId=connectionId; encryptedPkceVerifier=verifier; expiresAt=Instant.now().plusSeconds(600); }
    void setEncryptedPkceVerifier(byte[] value) { encryptedPkceVerifier = value.clone(); }
    public boolean consumeIfValid(UUID owner, String session) { if (consumedAt != null || expiresAt.isBefore(Instant.now()) || !ownerId.equals(owner) || !sessionId.equals(session)) return false; consumedAt=Instant.now(); return true; }
    public UUID getId(){return id;} UUID getOwnerId(){return ownerId;} UUID getConnectionId(){return connectionId;} byte[] encryptedPkceVerifier(){return encryptedPkceVerifier.clone();}
}
