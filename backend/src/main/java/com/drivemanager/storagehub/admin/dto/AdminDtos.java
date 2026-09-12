package com.drivemanager.storagehub.admin.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AdminDtos {

    private AdminDtos() {
    }

    public record AdminAuthStatusResponse(
            boolean isAdmin,
            boolean is2faVerified,
            String adminEmail
    ) {}

    public record AdminVerifyRequest(
            String key
    ) {}

    public record SendOtpResponse(
            String message,
            String email,
            Instant expiresAt
    ) {}

    public record TimelinePoint(
            String label,
            long count,
            long errors
    ) {}

    public record PathCount(
            String path,
            long count
    ) {}

    public record SystemHealthInfo(
            long freeMemoryBytes,
            long totalMemoryBytes,
            long maxMemoryBytes,
            int availableProcessors,
            long uptimeSeconds
    ) {}

    public record AdminStatsResponse(
            long totalVisits,
            long visitsToday,
            long visitsLast7Days,
            long uniqueVisitors,
            long uniqueVisitorsToday,
            double errorRatePercent,
            double averageLatencyMs,
            long totalUsers,
            long verifiedUsers,
            long adminUsers,
            long totalConnections,
            long totalFiles,
            long totalStorageBytes,
            List<TimelinePoint> visitsTimeline,
            List<PathCount> topPaths,
            SystemHealthInfo systemHealth
    ) {}

    public record AdminAccessLogEntry(
            UUID id,
            Instant timestamp,
            String path,
            String httpMethod,
            int statusCode,
            String clientIp,
            String userAgent,
            String userEmail,
            long durationMs
    ) {}

    public record AdminUserEntry(
            UUID id,
            String email,
            String displayName,
            String role,
            boolean emailVerified,
            Instant createdAt
    ) {}

    public record UpdateUserRoleRequest(
            String role
    ) {}
}
