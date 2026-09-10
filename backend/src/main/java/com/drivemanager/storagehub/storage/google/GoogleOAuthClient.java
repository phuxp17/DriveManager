package com.drivemanager.storagehub.storage.google;

public interface GoogleOAuthClient {
    String authorizationUrl(String state, String challenge);
    GoogleToken exchange(String code, String verifier);
    GoogleRefreshResponse refresh(String refreshToken);

    record GoogleToken(String idToken, String refreshToken, String scopes) {}
    record GoogleRefreshResponse(String accessToken, String newRefreshToken, int expiresInSeconds) {}

    class GoogleInvalidGrantException extends RuntimeException {
        public GoogleInvalidGrantException(String message) {
            super(message);
        }
    }
}
