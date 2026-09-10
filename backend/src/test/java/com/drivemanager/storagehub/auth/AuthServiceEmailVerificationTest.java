package com.drivemanager.storagehub.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.drivemanager.storagehub.auth.AuthDtos.RegisterRequest;
import com.drivemanager.storagehub.user.ApplicationUser;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceEmailVerificationTest {

    @Test
    void blocksLoginUntilTheSingleUseTokenIsVerified() {
        ApplicationUserRepository users = mock(ApplicationUserRepository.class);
        PasswordEncoder passwords = mock(PasswordEncoder.class);
        ResendEmailClient email = mock(ResendEmailClient.class);
        AtomicReference<ApplicationUser> saved = new AtomicReference<>();
        AtomicReference<String> token = new AtomicReference<>();
        when(email.isEnabled()).thenReturn(true);
        when(passwords.encode("correct-horse-battery")).thenReturn("password-hash");
        when(users.saveAndFlush(any())).thenAnswer(call -> {
            saved.set(call.getArgument(0));
            return saved.get();
        });
        doAnswer(call -> {
            token.set(call.getArgument(1));
            return null;
        }).when(email).sendVerification(any(), any());

        AuthService service = new AuthService(users, passwords, email);
        service.register(new RegisterRequest("User@example.com", "correct-horse-battery", "User"));
        when(users.findByNormalizedEmail("user@example.com")).thenReturn(Optional.of(saved.get()));
        when(users.findByEmailVerificationTokenHash(saved.get().getEmailVerificationTokenHash()))
                .thenReturn(Optional.of(saved.get()));

        assertThatThrownBy(() -> service.requireVerifiedEmail("user@example.com"))
                .isInstanceOf(EmailNotVerifiedException.class);
        assertThat(service.verifyEmail(token.get())).isTrue();
        service.requireVerifiedEmail("user@example.com");
        assertThat(service.verifyEmail(token.get())).isFalse();
    }
}
