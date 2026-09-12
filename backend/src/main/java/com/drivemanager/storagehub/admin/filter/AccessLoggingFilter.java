package com.drivemanager.storagehub.admin.filter;

import com.drivemanager.storagehub.admin.model.AccessLog;
import com.drivemanager.storagehub.admin.repository.AccessLogRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AccessLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AccessLoggingFilter.class);
    private final AccessLogRepository accessLogRepository;

    public AccessLoggingFilter(AccessLogRepository accessLogRepository) {
        this.accessLogRepository = accessLogRepository;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null
                || path.startsWith("/assets/")
                || path.startsWith("/static/")
                || path.equals("/favicon.ico")
                || path.equals("/robots.txt")
                || path.equals("/actuator/health")
                || path.endsWith(".js")
                || path.endsWith(".css")
                || path.endsWith(".png")
                || path.endsWith(".jpg")
                || path.endsWith(".svg")
                || path.endsWith(".woff2");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        long startTime = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            recordAccess(request, response.getStatus(), duration);
        }
    }

    private void recordAccess(HttpServletRequest request, int statusCode, long durationMs) {
        try {
            String clientIp = extractClientIp(request);
            String userEmail = extractUserEmail();
            String path = request.getRequestURI();
            String method = request.getMethod();
            String userAgent = request.getHeader("User-Agent");

            AccessLog logEntry = new AccessLog(
                    UUID.randomUUID(),
                    Instant.now(),
                    path,
                    method,
                    statusCode,
                    clientIp,
                    userAgent,
                    userEmail,
                    durationMs);
            accessLogRepository.save(logEntry);
        } catch (Exception e) {
            // Never break user request flow due to logging
            log.debug("Failed to record access log: {}", e.getMessage());
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        String header = request.getHeader("X-Forwarded-For");
        if (header != null && !header.isBlank()) {
            int commaIndex = header.indexOf(',');
            return (commaIndex > 0 ? header.substring(0, commaIndex) : header).trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }

    private String extractUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return auth.getName();
        }
        return null;
    }
}
