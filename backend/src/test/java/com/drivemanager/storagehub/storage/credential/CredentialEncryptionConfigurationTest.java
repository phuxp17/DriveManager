package com.drivemanager.storagehub.storage.credential;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import java.util.Base64;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class CredentialEncryptionConfigurationTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(CredentialEncryptionConfiguration.class);

    @Test void emptyConfigurationAllowsApplicationStartupButCannotEncrypt() {
        runner.run(context -> {
            assertThat(context).hasNotFailed().hasSingleBean(CredentialCipher.class);
            assertThatThrownBy(() -> context.getBean(CredentialCipher.class)
                    .encrypt(UUID.randomUUID(), "token")).isInstanceOf(IllegalStateException.class);
        });
    }

    @Test void bindsVersionedKeyringWithoutAdditionalDependencies() {
        runner.withPropertyValues("storage.credentials.active-version=1",
                "storage.credentials.keys.1=" + Base64.getEncoder().encodeToString(new byte[32]))
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    CredentialCipher cipher = context.getBean(CredentialCipher.class);
                    UUID id = UUID.randomUUID();
                    assertThat(cipher.decrypt(id, cipher.encrypt(id, "token"))).isEqualTo("token");
                });
    }
}
