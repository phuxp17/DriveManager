package com.drivemanager.storagehub.auth;

import com.drivemanager.storagehub.auth.AuthDtos.RegisterRequest;
import com.drivemanager.storagehub.auth.AuthDtos.UserResponse;
import com.drivemanager.storagehub.user.ApplicationUser;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import java.util.Locale;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService implements UserDetailsService {

    private final ApplicationUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final ResendEmailClient emailClient;
    private static final SecureRandom RANDOM = new SecureRandom();

    public AuthService(ApplicationUserRepository users, PasswordEncoder passwordEncoder, ResendEmailClient emailClient) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.emailClient = emailClient;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = request.email().strip();
        String normalizedEmail = normalizeEmail(email);
        if (users.existsByNormalizedEmail(normalizedEmail)) {
            throw new EmailAlreadyRegisteredException();
        }

        try {
            String token = newToken();
            ApplicationUser user = new ApplicationUser(
                    email,
                    normalizedEmail,
                    passwordEncoder.encode(request.password()),
                    request.displayName().strip(),
                    !emailClient.isEnabled());
            if (emailClient.isEnabled()) {
                user.startEmailVerification(hash(token), Instant.now().plus(24, ChronoUnit.HOURS));
            }
            users.saveAndFlush(user);
            emailClient.sendVerification(email, token);
            return response(user);
        } catch (DataIntegrityViolationException exception) {
            throw new EmailAlreadyRegisteredException();
        }
    }

    @Transactional(readOnly = true)
    public UserResponse currentUser(String normalizedEmail) {
        return users.findByNormalizedEmail(normalizedEmail)
                .map(AuthService::response)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @Transactional(readOnly = true)
    public void requireVerifiedEmail(String normalizedEmail) {
        if (!users.findByNormalizedEmail(normalizedEmail)
                .map(ApplicationUser::isEmailVerified)
                .orElse(false)) {
            throw new EmailNotVerifiedException();
        }
    }

    @Transactional
    public boolean verifyEmail(String token) {
        if (token == null || token.length() != 43) {
            return false;
        }
        return users.findByEmailVerificationTokenHash(hash(token))
                .map(user -> user.verifyEmail(Instant.now()))
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) {
        return users.findByNormalizedEmail(normalizeEmail(email))
                .map(user -> User.withUsername(user.getNormalizedEmail())
                        .password(user.getPasswordHash())
                        .authorities("ROLE_USER")
                        .build())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private static String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    private static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static UserResponse response(ApplicationUser user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName());
    }
}
