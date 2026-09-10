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
}
