package com.drivemanager.storagehub.storage.credential;

import org.junit.jupiter.api.Test;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class CredentialCipherTest {
    private static String key(int value) {
        byte[] bytes = new byte[32];
        java.util.Arrays.fill(bytes, (byte) value);
        return Base64.getEncoder().encodeToString(bytes);
    }

    @Test void randomizedRoundTripAndConnectionBinding() {
        var cipher = new CredentialCipher(1, Map.of(1, key(1)));
        UUID connection = UUID.randomUUID();
        byte[] first = cipher.encrypt(connection, "private-refresh-token");
        byte[] second = cipher.encrypt(connection, "private-refresh-token");
        assertThat(first).isNotEqualTo(second);
        assertThat(cipher.decrypt(connection, first)).isEqualTo("private-refresh-token");
        assertThatThrownBy(() -> cipher.decrypt(UUID.randomUUID(), first))
                .isInstanceOf(IllegalStateException.class).hasNoCause();
        first[first.length - 1] ^= 1;
        assertThatThrownBy(() -> cipher.decrypt(connection, first))
                .isInstanceOf(IllegalStateException.class).hasNoCause();
    }

    @Test void rotationRetainsOldKeysAndAuthenticatesVersion() {
        UUID connection = UUID.randomUUID();
        var old = new CredentialCipher(1, Map.of(1, key(1)));
        byte[] stored = old.encrypt(connection, "old-token");
        var rotated = new CredentialCipher(2, Map.of(1, key(1), 2, key(2)));
        assertThat(rotated.decrypt(connection, stored)).isEqualTo("old-token");
        assertThat(rotated.decrypt(connection, rotated.encrypt(connection, "new-token")))
                .isEqualTo("new-token");
        assertThatThrownBy(() -> new CredentialCipher(2, Map.of(2, key(2)))
                .decrypt(connection, stored)).isInstanceOf(IllegalStateException.class);
        stored[4] = 2;
        assertThatThrownBy(() -> rotated.decrypt(connection, stored))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test void missingAndInvalidConfigurationFailWithoutSecretDetails() {
        var disabled = new CredentialCipher(0, Map.of());
        assertThatThrownBy(() -> disabled.encrypt(UUID.randomUUID(), "secret"))
                .isInstanceOf(IllegalStateException.class).hasNoCause()
                .hasMessageNotContaining("secret");
        assertThatThrownBy(() -> new CredentialCipher(1, Map.of(1, "sensitive-invalid-key")))
                .isInstanceOf(IllegalArgumentException.class).hasNoCause()
                .hasMessage("Invalid credential encryption configuration");
        assertThatThrownBy(() -> new CredentialCipher(2, Map.of(1, key(1))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CredentialCipher(1, Map.of(1, "YWJj")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test void malformedEnvelopeAndWrongKeyFailClosed() {
        UUID connection = UUID.randomUUID();
        var cipher = new CredentialCipher(1, Map.of(1, key(1)));
        byte[] stored = cipher.encrypt(connection, "token");
        assertThatThrownBy(() -> new CredentialCipher(1, Map.of(1, key(2)))
                .decrypt(connection, stored)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> cipher.decrypt(connection, new byte[0]))
                .isInstanceOf(IllegalStateException.class);
        stored[0] = 2;
        assertThatThrownBy(() -> cipher.decrypt(connection, stored))
                .isInstanceOf(IllegalStateException.class);
    }
}
