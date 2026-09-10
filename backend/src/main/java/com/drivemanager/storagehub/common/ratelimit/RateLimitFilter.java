package com.drivemanager.storagehub.common.ratelimit;

import com.drivemanager.storagehub.common.error.ApiErrorWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiter rateLimiter;
    private final RateLimitProperties properties;
    private final ApiErrorWriter apiErrorWriter;

    public RateLimitFilter(RateLimiter rateLimiter, RateLimitProperties properties, ApiErrorWriter apiErrorWriter) {
        this.rateLimiter = rateLimiter;
        this.properties = properties;
        this.apiErrorWriter = apiErrorWriter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method)) {
            int limit = 0;
            String category = null;

            if ("/api/v1/auth/login".equals(path) || "/api/v1/auth/register".equals(path)) {
                limit = properties.getAuthLimit();
                category = "auth";
            } else if ("/api/v1/items/files/upload".equals(path)) {
                limit = properties.getUploadLimit();
                category = "upload";
            } else if ("/api/v1/shares".equals(path)) {
                limit = properties.getSharesLimit();
                category = "shares";
            }

            if (category != null && limit > 0) {
                String ip = clientIp(request);
                String key = ip + ":" + category;
                if (!rateLimiter.tryAcquire(key, limit)) {
                    response.setHeader(HttpHeaders.RETRY_AFTER, "60");
                    apiErrorWriter.write(response, HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED",
                            "Too many requests. Please try again later.");
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private String clientIp(HttpServletRequest request) {
        String addr = request.getRemoteAddr();
        return (addr != null && !addr.isBlank()) ? addr : "unknown";
    }
}
