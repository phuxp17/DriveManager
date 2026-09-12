package com.drivemanager.storagehub.admin.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "access_logs")
public class AccessLog {

    @Id
    private UUID id;

    @Column(nullable = false)
    private Instant timestamp;

    @Column(nullable = false, length = 500)
    private String path;

    @Column(name = "http_method", nullable = false, length = 16)
    private String httpMethod;

    @Column(name = "status_code", nullable = false)
    private int statusCode;

    @Column(name = "client_ip", nullable = false, length = 64)
    private String clientIp;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "user_email", length = 320)
    private String userEmail;

    @Column(name = "duration_ms", nullable = false)
    private long durationMs;

    protected AccessLog() {
    }

    public AccessLog(
            UUID id,
            Instant timestamp,
            String path,
            String httpMethod,
            int statusCode,
            String clientIp,
            String userAgent,
            String userEmail,
            long durationMs) {
        this.id = id != null ? id : UUID.randomUUID();
        this.timestamp = timestamp != null ? timestamp : Instant.now();
        this.path = path;
        this.httpMethod = httpMethod;
        this.statusCode = statusCode;
        this.clientIp = clientIp;
        this.userAgent = userAgent != null && userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent;
        this.userEmail = userEmail;
        this.durationMs = durationMs;
    }

    public UUID getId() {
        return id;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public String getPath() {
        return path;
    }

    public String getHttpMethod() {
        return httpMethod;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getClientIp() {
        return clientIp;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public long getDurationMs() {
        return durationMs;
    }
}
