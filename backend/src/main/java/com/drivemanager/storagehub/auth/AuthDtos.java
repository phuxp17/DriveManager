package com.drivemanager.storagehub.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import jakarta.validation.constraints.AssertTrue;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @Email @NotBlank @Size(max = 320) String email,
            @NotBlank @Size(min = 12, max = 72) String password,
            @NotBlank @Size(max = 120) String displayName) {
        @AssertTrue
        public boolean isPasswordWithinBcryptByteLimit() {
            return password == null || password.getBytes(StandardCharsets.UTF_8).length <= 72;
        }
    }

    public record LoginRequest(
            @Email @NotBlank @Size(max = 320) String email,
            @NotBlank @Size(max = 72) String password) {
        @AssertTrue
        public boolean isPasswordWithinBcryptByteLimit() {
            return password == null || password.getBytes(StandardCharsets.UTF_8).length <= 72;
        }
    }

    public record UserResponse(UUID id, String email, String displayName) {
    }

    public record CsrfResponse(String headerName, String parameterName, String token) {
    }
}
