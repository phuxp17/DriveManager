package com.drivemanager.storagehub.storage.credential;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.HashMap;
import java.util.Map;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(CredentialEncryptionConfiguration.Properties.class)
public class CredentialEncryptionConfiguration {
    @Bean
    CredentialCipher credentialCipher(Properties properties) {
        return new CredentialCipher(properties.getActiveVersion(), properties.getKeys());
    }

    @ConfigurationProperties("storage.credentials")
    public static class Properties {
        private int activeVersion;
        private Map<Integer, String> keys = new HashMap<>();

        public int getActiveVersion() { return activeVersion; }
        public void setActiveVersion(int activeVersion) { this.activeVersion = activeVersion; }
        public Map<Integer, String> getKeys() { return keys; }
        public void setKeys(Map<Integer, String> keys) { this.keys = keys; }
        // No generated toString: configuration contains encryption keys.
    }
}
