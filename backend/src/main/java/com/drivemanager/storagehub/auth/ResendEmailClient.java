package com.drivemanager.storagehub.auth;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class ResendEmailClient {

    private final boolean enabled;
    private final String from;
    private final String verificationUrl;
    private final RestClient client;

    public ResendEmailClient(
            @Value("${resend.enabled:true}") boolean enabled,
            @Value("${resend.api-key:}") String apiKey,
            @Value("${resend.from}") String from,
            @Value("${resend.verification-url}") String verificationUrl) {
        if (enabled && apiKey.isBlank()) {
            throw new IllegalStateException("RESEND_API_KEY is required when email verification is enabled");
        }
        this.enabled = enabled;
        this.from = from;
        this.verificationUrl = verificationUrl;
        this.client = RestClient.builder()
                .baseUrl("https://api.resend.com")
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    boolean isEnabled() {
        return enabled;
    }

    void sendVerification(String email, String token) {
        if (!enabled) {
            return;
        }
        String link = verificationUrl + "?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
        String html = """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033">
                  <h2>Xác minh email DriveManager</h2>
                  <p>Nhấn nút bên dưới để kích hoạt tài khoản. Liên kết có hiệu lực trong 24 giờ.</p>
                  <p style="margin:28px 0"><a href="%s" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Xác minh email</a></p>
                  <p>Nếu bạn không tạo tài khoản này, hãy bỏ qua email.</p>
                </div>
                """.formatted(link);
        try {
            client.post()
                    .uri("/emails")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Idempotency-Key", "verify/" + token)
                    .body(Map.of(
                            "from", from,
                            "to", email,
                            "subject", "Xác minh email DriveManager",
                            "html", html,
                            "text", "Xác minh email DriveManager trong 24 giờ: " + link))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException exception) {
            throw new EmailDeliveryException(exception);
        }
    }

    public void sendAdminOtp(String email, String otpCode) {
        if (!enabled) {
            return;
        }
        String html = """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
                  <h2 style="color:#2563eb;margin-bottom:8px">DriveManager - Mã xác thực Admin</h2>
                  <p>Bạn (hoặc người quản trị) vừa yêu cầu mở khóa truy cập <strong>Admin Dashboard & Monitoring</strong> của hệ thống DriveManager.</p>
                  <p>Mã bảo mật xác thực (OTP) một lần của bạn là:</p>
                  <div style="background:#f8fafc;border:2px dashed #94a3b8;border-radius:8px;padding:18px;text-align:center;margin:24px 0">
                    <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0f172a;font-family:monospace">%s</span>
                  </div>
                  <p style="color:#64748b;font-size:13px">Mã này có hiệu lực trong 10 phút. Tuyệt đối không chia sẻ mã này cho bất kỳ ai. Nếu bạn không thực hiện yêu cầu này, vui lòng kiểm tra ngay bảo mật tài khoản.</p>
                </div>
                """.formatted(otpCode);
        try {
            client.post()
                    .uri("/emails")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Idempotency-Key", "admin-otp/" + System.currentTimeMillis() + "/" + otpCode)
                    .body(Map.of(
                            "from", from,
                            "to", email,
                            "subject", "[DriveManager] Mã xác thực Admin Dashboard: " + otpCode,
                            "html", html,
                            "text", "Mã xác thực Admin Dashboard của bạn: " + otpCode + " (có hiệu lực trong 10 phút)."))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException exception) {
            throw new EmailDeliveryException(exception);
        }
    }
}

