package com.drivemanager.storagehub.auth;

import com.drivemanager.storagehub.auth.AuthDtos.RegisterRequest;
import com.drivemanager.storagehub.auth.AuthDtos.UserResponse;
import com.drivemanager.storagehub.user.ApplicationUser;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import java.util.Locale;
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

    public AuthService(ApplicationUserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = request.email().strip();
        String normalizedEmail = normalizeEmail(email);
        if (users.existsByNormalizedEmail(normalizedEmail)) {
            throw new EmailAlreadyRegisteredException();
        }

        try {
            ApplicationUser user = users.saveAndFlush(new ApplicationUser(
                    email,
                    normalizedEmail,
                    passwordEncoder.encode(request.password()),
                    request.displayName().strip()));
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

    private static UserResponse response(ApplicationUser user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName());
    }
}
