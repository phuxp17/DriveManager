package com.drivemanager.storagehub.storage.google;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(GoogleProperties.class)
public class GoogleOAuthConfiguration {

    @Bean
    @Conditional(GoogleConfigured.class)
    GoogleOAuthClient googleOAuthClient(GoogleProperties properties) {
        return new HttpGoogleOAuthClient(properties, RestClient.create());
    }

    @Bean
    @Conditional(GoogleConfigured.class)
    GoogleIdentityValidator googleIdentityValidator() {
        JwtDecoder decoder = JwtDecoders.fromIssuerLocation("https://accounts.google.com");
        return token -> {
            Jwt jwt = decoder.decode(token);
            if (!Set.of("https://accounts.google.com", "accounts.google.com").contains(jwt.getIssuer().toString())
                    || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
                throw new IllegalArgumentException("Invalid Google identity");
            }
            return new GoogleIdentity(jwt.getIssuer().toString(), jwt.getSubject(), jwt.getClaimAsString("email"));
        };
    }

    @Bean
    @Conditional(GoogleConfigured.class)
    com.drivemanager.storagehub.storage.StorageProvider googleStorageProvider() {
        return new GoogleDriveStorageProvider(RestClient.create(), true);
    }

    static final class GoogleConfigured implements Condition {
        @Override
        public boolean matches(ConditionContext c, AnnotatedTypeMetadata m) {
            return !c.getEnvironment().getProperty("storage.google.client-id", "").isBlank()
                    && !c.getEnvironment().getProperty("storage.google.client-secret", "").isBlank()
                    && !c.getEnvironment().getProperty("storage.google.redirect-uri", "").isBlank();
        }
    }

    private static final class HttpGoogleOAuthClient implements GoogleOAuthClient {
        private final GoogleProperties p;
        private final RestClient http;

        HttpGoogleOAuthClient(GoogleProperties p, RestClient http) {
            this.p = p;
            this.http = http;
        }

        @Override
        public String authorizationUrl(String state, String challenge) {
            return "https://accounts.google.com/o/oauth2/v2/auth?client_id=" + e(p.getClientId())
                    + "&redirect_uri=" + e(p.getRedirectUri())
                    + "&response_type=code&access_type=offline&prompt=select_account+consent&scope="
                    + e("openid email https://www.googleapis.com/auth/drive.file")
                    + "&state=" + e(state) + "&code_challenge=" + e(challenge) + "&code_challenge_method=S256";
        }

        @Override
        public GoogleToken exchange(String code, String verifier) {
            var body = http.post().uri("https://oauth2.googleapis.com/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body("code=" + e(code) + "&client_id=" + e(p.getClientId())
                            + "&client_secret=" + e(p.getClientSecret())
                            + "&redirect_uri=" + e(p.getRedirectUri())
                            + "&grant_type=authorization_code&code_verifier=" + e(verifier))
                    .retrieve()
                    .body(TokenBody.class);
            if (body == null || body.id_token() == null) {
                throw new IllegalArgumentException("Google authorization failed");
            }
            return new GoogleToken(body.id_token(), body.refresh_token(), body.scope());
        }

        @Override
        public GoogleRefreshResponse refresh(String refreshToken) {
            try {
                var body = http.post().uri("https://oauth2.googleapis.com/token")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .body("refresh_token=" + e(refreshToken) + "&client_id=" + e(p.getClientId())
                                + "&client_secret=" + e(p.getClientSecret()) + "&grant_type=refresh_token")
                        .retrieve()
                        .body(RefreshTokenBody.class);
                if (body == null || body.access_token() == null) {
                    throw new IllegalStateException("Google token refresh returned empty response");
                }
                return new GoogleRefreshResponse(body.access_token(), body.refresh_token(), body.expires_in());
            } catch (HttpClientErrorException ex) {
                if (ex.getStatusCode().value() == 400 && ex.getResponseBodyAsString().contains("invalid_grant")) {
                    throw new GoogleInvalidGrantException("Google refresh token is invalid or expired");
                }
                throw ex;
            }
        }

        private static String e(String value) {
            return URLEncoder.encode(value, StandardCharsets.UTF_8);
        }

        private record TokenBody(String id_token, String refresh_token, String scope) {}
        private record RefreshTokenBody(String access_token, String refresh_token, int expires_in) {}
    }
}
