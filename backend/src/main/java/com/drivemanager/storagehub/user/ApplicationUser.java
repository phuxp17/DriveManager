package com.drivemanager.storagehub.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class ApplicationUser {

    @Id
    private UUID id;

    @Column(nullable = false, length = 320)
    private String email;

    @Column(name = "normalized_email", nullable = false, length = 320)
    private String normalizedEmail;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(name = "email_verification_token_hash", length = 64)
    private String emailVerificationTokenHash;

    @Column(name = "email_verification_expires_at")
    private Instant emailVerificationExpiresAt;

    protected ApplicationUser() {
    }

    public ApplicationUser(String email, String normalizedEmail, String passwordHash, String displayName,
                           boolean emailVerified) {
        this.id = UUID.randomUUID();
        this.email = email;
        this.normalizedEmail = normalizedEmail;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
        this.emailVerifiedAt = emailVerified ? this.createdAt : null;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getNormalizedEmail() {
        return normalizedEmail;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean isEmailVerified() {
        return emailVerifiedAt != null;
    }

    public String getEmailVerificationTokenHash() {
        return emailVerificationTokenHash;
    }

    public boolean verifyEmail(Instant now) {
        if (isEmailVerified() || emailVerificationExpiresAt == null || now.isAfter(emailVerificationExpiresAt)) {
            return false;
        }
        emailVerifiedAt = now;
        emailVerificationTokenHash = null;
        emailVerificationExpiresAt = null;
        updatedAt = now;
        return true;
    }

    public void startEmailVerification(String tokenHash, Instant expiresAt) {
        emailVerificationTokenHash = tokenHash;
        emailVerificationExpiresAt = expiresAt;
    }

}
