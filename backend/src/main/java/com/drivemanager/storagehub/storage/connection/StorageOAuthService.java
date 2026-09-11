package com.drivemanager.storagehub.storage.connection;

import com.drivemanager.storagehub.storage.credential.CredentialCipher;
import com.drivemanager.storagehub.storage.google.*;
import com.drivemanager.storagehub.storage.google.GoogleOAuthClient.GoogleInvalidGrantException;
import com.drivemanager.storagehub.storage.google.GoogleOAuthClient.GoogleRefreshResponse;
import com.drivemanager.storagehub.storage.google.GoogleOAuthClient.GoogleToken;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StorageOAuthService {
    private static final Set<String> EMAIL_SCOPES = Set.of(
            "email",
            "https://www.googleapis.com/auth/userinfo.email"
    );
    private static final Set<String> DRIVE_SCOPES = Set.of(
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/drive"
    );

    public static boolean hasRequiredScopes(String grantedScopes) {
        if (grantedScopes == null || grantedScopes.isBlank()) {
            return false;
        }
        Set<String> granted = Set.of(grantedScopes.split(" "));
        boolean hasOpenId = granted.contains("openid");
        boolean hasEmail = granted.stream().anyMatch(EMAIL_SCOPES::contains);
        boolean hasDrive = granted.stream().anyMatch(DRIVE_SCOPES::contains);
        return hasOpenId && hasEmail && hasDrive;
    }

    private final StorageConnectionRepository connections;
    private final OAuthAuthorizationRepository authorizations;
    private final ApplicationUserRepository users;
    private final CredentialCipher cipher;
    private final ObjectProvider<GoogleOAuthClient> google;
    private final ObjectProvider<GoogleIdentityValidator> identities;
    private final SecureRandom random = new SecureRandom();
    private final ConcurrentHashMap<UUID, Object> connectionLocks = new ConcurrentHashMap<>();

    public StorageOAuthService(StorageConnectionRepository connections,
                               OAuthAuthorizationRepository authorizations,
                               ApplicationUserRepository users,
                               CredentialCipher cipher,
                               ObjectProvider<GoogleOAuthClient> google,
                               ObjectProvider<GoogleIdentityValidator> identities) {
        this.connections = connections;
        this.authorizations = authorizations;
        this.users = users;
        this.cipher = cipher;
        this.google = google;
        this.identities = identities;
    }

    @Transactional
    public String begin(String email, String sessionId, UUID connectionId) {
        GoogleOAuthClient client = configured();
        UUID owner = owner(email);
        if (connectionId != null && connections.findByIdAndOwnerId(connectionId, owner).isEmpty()) {
            throw new NoSuchElementException();
        }
        String state = token(), verifier = token();
        byte[] digest = digest(state);
        OAuthAuthorization authorization = new OAuthAuthorization(digest, owner, sessionId, connectionId, new byte[]{0});
        authorization.setEncryptedPkceVerifier(cipher.encrypt(authorization.getId(), verifier, CredentialCipher.Purpose.OAUTH_PKCE));
        authorizations.save(authorization);
        return client.authorizationUrl(state, challenge(verifier));
    }

    @Transactional
    public Pending consume(String email, String sessionId, String state) {
        OAuthAuthorization a = authorizations.lockByStateDigest(digest(state))
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired OAuth state"));
        if (!a.consumeIfValid(owner(email), sessionId)) {
            throw new IllegalArgumentException("OAuth authorization request is invalid, already consumed, or expired");
        }
        authorizations.save(a);
        return new Pending(a.getOwnerId(), a.getConnectionId(), cipher.decrypt(a.getId(), a.encryptedPkceVerifier(), CredentialCipher.Purpose.OAUTH_PKCE));
    }

    @Transactional
    public void complete(Pending pending, String code) {
        GoogleOAuthClient client = configured();
        GoogleToken token = client.exchange(code, pending.verifier());
        if (!hasRequiredScopes(token.scopes())) {
            throw new IllegalArgumentException("Required Google scopes were not granted");
        }
        GoogleIdentity identity = validator().validate(token.idToken());
        StorageConnection target = pending.connectionId() == null
                ? connections.findByOwnerIdAndProviderAndProviderIssuerAndProviderSubject(
                        pending.ownerId(), "GOOGLE", identity.issuer(), identity.subject()).orElse(null)
                : connections.findByIdAndOwnerId(pending.connectionId(), pending.ownerId())
                        .orElseThrow(NoSuchElementException::new);

        if (target != null && (!target.getProviderIssuer().equals(identity.issuer())
                || !target.getProviderSubject().equals(identity.subject()))) {
            throw new IllegalArgumentException("Google account does not match this connection");
        }

        if (target == null) {
            if (token.refreshToken() == null || token.refreshToken().isBlank()) {
                throw new IllegalArgumentException("Google did not return a refresh credential");
            }
            UUID id = UUID.randomUUID();
            byte[] encrypted = cipher.encrypt(id, token.refreshToken());
            target = new StorageConnection(id, pending.ownerId(), identity.issuer(), identity.subject(),
                    identity.email(), token.scopes(), encrypted);
        } else {
            byte[] encrypted = (token.refreshToken() == null || token.refreshToken().isBlank())
                    ? null
                    : cipher.encrypt(target.getId(), token.refreshToken());
            target.reconnect(identity.email(), token.scopes(), encrypted);
        }
        connections.save(target);
    }

    @Transactional(readOnly = true)
    public List<StorageConnectionDtos.ConnectionResponse> list(String email) {
        return connections.findByOwnerIdOrderByUpdatedAtDesc(owner(email)).stream()
                .map(c -> new StorageConnectionDtos.ConnectionResponse(c.getId(), "GOOGLE", c.getDisplayName(),
                        c.getStatus(), c.getGrantedScopes()))
                .toList();
    }

    @Transactional
    public void disconnect(String email, UUID id) {
        StorageConnection c = connections.findByIdAndOwnerId(id, owner(email))
                .orElseThrow(NoSuchElementException::new);
        c.disconnect();
    }

    @Transactional(noRollbackFor = GoogleInvalidGrantException.class)
    public String getFreshAccessToken(String email, UUID connectionId) {
        UUID owner = owner(email);
        StorageConnection connection = connections.findByIdAndOwnerId(connectionId, owner)
                .orElseThrow(NoSuchElementException::new);
        if ("DISCONNECTED".equals(connection.getStatus())) {
            throw new IllegalStateException("Storage connection is disconnected");
        }
        if (connection.getEncryptedRefreshToken() == null) {
            throw new IllegalStateException("No refresh token available for connection");
        }
        GoogleOAuthClient client = configured();
        Object lock = connectionLocks.computeIfAbsent(connectionId, k -> new Object());
        synchronized (lock) {
            connection = connections.findByIdAndOwnerId(connectionId, owner)
                    .orElseThrow(NoSuchElementException::new);
            String refreshToken = cipher.decrypt(connection.getId(), connection.getEncryptedRefreshToken());
            try {
                GoogleRefreshResponse response = client.refresh(refreshToken);
                if (response.newRefreshToken() != null && !response.newRefreshToken().isBlank()) {
                    byte[] rotated = cipher.encrypt(connection.getId(), response.newRefreshToken());
                    connection.reconnect(connection.getDisplayName(), connection.getGrantedScopes(), rotated);
                    connections.save(connection);
                }
                return response.accessToken();
            } catch (GoogleInvalidGrantException ex) {
                connection.markReauthenticationRequired();
                connections.save(connection);
                throw ex;
            }
        }
    }

    private GoogleOAuthClient configured() {
        GoogleOAuthClient c = google.getIfAvailable();
        if (c == null || identities.getIfAvailable() == null) {
            throw new IllegalStateException("Google storage is not configured");
        }
        return c;
    }

    private GoogleIdentityValidator validator() {
        return identities.getObject();
    }

    private UUID owner(String email) {
        return users.findByNormalizedEmail(email).orElseThrow(NoSuchElementException::new).getId();
    }

    private String token() {
        byte[] b = new byte[32];
        random.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    private static byte[] digest(String v) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(v.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String challenge(String v) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(digest(v));
    }

    public record Pending(UUID ownerId, UUID connectionId, String verifier) {}
}
