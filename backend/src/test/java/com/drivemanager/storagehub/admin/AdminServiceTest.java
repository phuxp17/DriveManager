package com.drivemanager.storagehub.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.drivemanager.storagehub.admin.dto.AdminDtos.AdminAuthStatusResponse;
import com.drivemanager.storagehub.admin.dto.AdminDtos.SendOtpResponse;
import com.drivemanager.storagehub.admin.repository.AccessLogRepository;
import com.drivemanager.storagehub.admin.service.AdminService;
import com.drivemanager.storagehub.auth.ResendEmailClient;
import com.drivemanager.storagehub.item.ItemRepository;
import com.drivemanager.storagehub.storage.connection.StorageConnectionRepository;
import com.drivemanager.storagehub.user.ApplicationUser;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpSession;

import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private AccessLogRepository accessLogRepository;

    @Mock
    private ApplicationUserRepository userRepository;

    @Mock
    private StorageConnectionRepository storageConnectionRepository;

    @Mock
    private ItemRepository itemRepository;

    @Mock
    private ResendEmailClient resendEmailClient;

    private AdminService adminService;

    @BeforeEach
    void setUp() {
        adminService = new AdminService(
                accessLogRepository,
                userRepository,
                storageConnectionRepository,
                itemRepository,
                resendEmailClient,
                "master_admin_secret_key_123",
                "phuxp17@gmail.com",
                "phuxp17@gmail.com"
        );
    }

    @Test
    void testIsAdminFromConfiguredEmail() {
        assertThat(adminService.isAdmin("phuxp17@gmail.com")).isTrue();
        assertThat(adminService.isAdmin("PHUXP17@GMAIL.COM")).isTrue();
        assertThat(adminService.isAdmin("random@example.com")).isFalse();
    }

    @Test
    void testIsAdminFromUserRole() {
        ApplicationUser adminUser = new ApplicationUser(
                "custom-admin@example.com", "custom-admin@example.com", "hash", "Admin", true, "ROLE_ADMIN");
        when(userRepository.findByNormalizedEmail("custom-admin@example.com")).thenReturn(Optional.of(adminUser));

        assertThat(adminService.isAdmin("custom-admin@example.com")).isTrue();
    }

    @Test
    void testVerifyMasterKeyFromEnv() {
        MockHttpSession session = new MockHttpSession();
        assertThat(adminService.is2faVerified(session)).isFalse();

        boolean verified = adminService.verifyKey("master_admin_secret_key_123", session);
        assertThat(verified).isTrue();
        assertThat(adminService.is2faVerified(session)).isTrue();
    }

    @Test
    void testVerifyInvalidKey() {
        MockHttpSession session = new MockHttpSession();
        boolean verified = adminService.verifyKey("wrong_key", session);
        assertThat(verified).isFalse();
        assertThat(adminService.is2faVerified(session)).isFalse();
    }

    @Test
    void testSendOtpAndVerify() {
        MockHttpSession session = new MockHttpSession();
        SendOtpResponse otpResponse = adminService.sendOtp("phuxp17@gmail.com");

        assertThat(otpResponse).isNotNull();
        assertThat(otpResponse.email()).isEqualTo("phuxp17@gmail.com");

        verify(resendEmailClient, times(1)).sendAdminOtp(eq("phuxp17@gmail.com"), any(String.class));
    }

    @Test
    void testGetAuthStatus() {
        MockHttpSession session = new MockHttpSession();
        AdminAuthStatusResponse status = adminService.getAuthStatus("phuxp17@gmail.com", session);

        assertThat(status.isAdmin()).isTrue();
        assertThat(status.is2faVerified()).isFalse();
        assertThat(status.adminEmail()).isEqualTo("phuxp17@gmail.com");

        adminService.verifyKey("master_admin_secret_key_123", session);
        AdminAuthStatusResponse verifiedStatus = adminService.getAuthStatus("phuxp17@gmail.com", session);
        assertThat(verifiedStatus.is2faVerified()).isTrue();
    }
}
