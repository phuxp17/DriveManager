package com.drivemanager.storagehub.storage.credential;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** Encrypts connection-owned refresh tokens. The database stores only the returned envelope. */
public final class CredentialCipher {
    private static final byte FORMAT = 1;
    private static final int NONCE_BYTES = 12;
    private final SecureRandom random = new SecureRandom();
    private final Map<Integer, SecretKeySpec> keys;
    private final int activeVersion;

    public CredentialCipher(int activeVersion, Map<Integer, String> base64Keys) {
        Map<Integer, SecretKeySpec> decoded = new HashMap<>();
        try {
            for (var entry : base64Keys.entrySet()) {
                byte[] key = Base64.getDecoder().decode(entry.getValue());
                if (entry.getKey() <= 0 || key.length != 32) {
                    throw new IllegalArgumentException();
                }
                decoded.put(entry.getKey(), new SecretKeySpec(key, "AES"));
                java.util.Arrays.fill(key, (byte) 0);
            }
            if (!decoded.isEmpty() && !decoded.containsKey(activeVersion)) {
                throw new IllegalArgumentException();
            }
        } catch (RuntimeException ex) {
            // Deliberately discard input and cause: either could contain a secret.
            throw new IllegalArgumentException("Invalid credential encryption configuration");
        }
        this.keys = Map.copyOf(decoded);
        this.activeVersion = activeVersion;
    }

    public byte[] encrypt(UUID connectionId, String refreshToken) {
        return encrypt(connectionId, refreshToken, Purpose.REFRESH_TOKEN);
    }

    public byte[] encrypt(UUID connectionId, String refreshToken, Purpose purpose) {
        if (connectionId == null || refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalArgumentException("Connection and credential are required");
        }
        SecretKeySpec key = key(activeVersion);
        byte[] nonce = new byte[NONCE_BYTES];
        random.nextBytes(nonce);
        byte[] plaintext = refreshToken.getBytes(StandardCharsets.UTF_8);
        try {
            Cipher cipher = cipher(Cipher.ENCRYPT_MODE, key, nonce, connectionId, activeVersion, purpose);
            byte[] ciphertext = cipher.doFinal(plaintext);
            return ByteBuffer.allocate(1 + Integer.BYTES + NONCE_BYTES + ciphertext.length)
                    .put(FORMAT).putInt(activeVersion).put(nonce).put(ciphertext).array();
        } catch (GeneralSecurityException ex) {
            throw unavailable();
        } finally {
            java.util.Arrays.fill(plaintext, (byte) 0);
        }
    }

    public String decrypt(UUID connectionId, byte[] envelope) {
        return decrypt(connectionId, envelope, Purpose.REFRESH_TOKEN);
    }

    public String decrypt(UUID connectionId, byte[] envelope, Purpose purpose) {
        if (connectionId == null || envelope == null || envelope.length < 34) {
            throw unavailable();
        }
        ByteBuffer input = ByteBuffer.wrap(envelope);
        if (input.get() != FORMAT) throw unavailable();
        int version = input.getInt();
        SecretKeySpec key = key(version);
        byte[] nonce = new byte[NONCE_BYTES];
        input.get(nonce);
        byte[] ciphertext = new byte[input.remaining()];
        input.get(ciphertext);
        byte[] plaintext = null;
        try {
            plaintext = cipher(Cipher.DECRYPT_MODE, key, nonce, connectionId, version, purpose)
                    .doFinal(ciphertext);
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException ex) {
            throw unavailable();
        } finally {
            if (plaintext != null) java.util.Arrays.fill(plaintext, (byte) 0);
        }
    }

    private Cipher cipher(int mode, SecretKeySpec key, byte[] nonce, UUID connectionId,
                          int version, Purpose purpose) throws GeneralSecurityException {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(mode, key, new GCMParameterSpec(128, nonce));
        cipher.updateAAD((purpose.aad + ":" + FORMAT + ":" + version + ":" + connectionId)
                .getBytes(StandardCharsets.UTF_8));
        return cipher;
    }

    private SecretKeySpec key(int version) {
        SecretKeySpec key = keys.get(version);
        if (key == null) throw unavailable();
        return key;
    }

    private static IllegalStateException unavailable() {
        return new IllegalStateException("Credential encryption unavailable or credential invalid");
    }
    public enum Purpose { REFRESH_TOKEN("storage-refresh-token"), OAUTH_PKCE("storage-oauth-pkce"); private final String aad; Purpose(String aad){this.aad=aad;} }
}
