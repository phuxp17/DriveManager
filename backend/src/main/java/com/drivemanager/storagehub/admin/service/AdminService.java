package com.drivemanager.storagehub.admin.service;

import com.drivemanager.storagehub.admin.dto.AdminDtos.*;
import com.drivemanager.storagehub.admin.model.AccessLog;
import com.drivemanager.storagehub.admin.repository.AccessLogRepository;
import com.drivemanager.storagehub.auth.ResendEmailClient;
import com.drivemanager.storagehub.item.ItemRepository;
import com.drivemanager.storagehub.storage.connection.StorageConnectionRepository;
import com.drivemanager.storagehub.user.ApplicationUser;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import jakarta.servlet.http.HttpSession;
import java.lang.management.ManagementFactory;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

    public static final String SESSION_ADMIN_2FA_VERIFIED = "ADMIN_2FA_VERIFIED";

    private record OtpEntry(String code, Instant expiresAt) {}

    private final AccessLogRepository accessLogRepository;
    private final ApplicationUserRepository userRepository;
    private final StorageConnectionRepository storageConnectionRepository;
    private final ItemRepository itemRepository;
    private final ResendEmailClient resendEmailClient;

    private final String adminSecurityKey;
    private final String admin2faEmail;
    private final Set<String> adminEmails;
    private final Map<String, OtpEntry> activeOtps = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public AdminService(
            AccessLogRepository accessLogRepository,
            ApplicationUserRepository userRepository,
            StorageConnectionRepository storageConnectionRepository,
            ItemRepository itemRepository,
            ResendEmailClient resendEmailClient,
            @Value("${admin.security-key:admin_secret_key_2026}") String adminSecurityKey,
            @Value("${admin.2fa-email:phuxp17@gmail.com}") String admin2faEmail,
            @Value("${admin.emails:phuxp17@gmail.com}") String adminEmailsConfig) {
        this.accessLogRepository = accessLogRepository;
        this.userRepository = userRepository;
        this.storageConnectionRepository = storageConnectionRepository;
        this.itemRepository = itemRepository;
        this.resendEmailClient = resendEmailClient;
        this.adminSecurityKey = adminSecurityKey != null ? adminSecurityKey.strip() : "";
        this.admin2faEmail = admin2faEmail != null ? admin2faEmail.strip().toLowerCase(Locale.ROOT) : "phuxp17@gmail.com";
        this.adminEmails = Arrays.stream(adminEmailsConfig.split(","))
                .map(String::strip)
                .map(s -> s.toLowerCase(Locale.ROOT))
                .filter(s -> !s.isBlank())
                .collect(java.util.stream.Collectors.toSet());
    }

    public boolean isAdmin(String email) {
        if (email == null) return false;
        String normalized = email.strip().toLowerCase(Locale.ROOT);
        if (adminEmails.contains(normalized)) {
            return true;
        }
        return userRepository.findByNormalizedEmail(normalized)
                .map(ApplicationUser::isAdmin)
                .orElse(false);
    }

    public boolean is2faVerified(HttpSession session) {
        if (session == null) return false;
        Object val = session.getAttribute(SESSION_ADMIN_2FA_VERIFIED);
        return Boolean.TRUE.equals(val);
    }

    public AdminAuthStatusResponse getAuthStatus(String email, HttpSession session) {
        boolean admin = isAdmin(email);
        boolean verified = admin && is2faVerified(session);
        return new AdminAuthStatusResponse(admin, verified, admin2faEmail);
    }

    public SendOtpResponse sendOtp(String requesterEmail) {
        if (!isAdmin(requesterEmail)) {
            throw new SecurityException("Unauthorized: User is not an administrator");
        }

        String otpCode = String.format("%06d", random.nextInt(1_000_000));
        Instant expiresAt = Instant.now().plus(10, ChronoUnit.MINUTES);
        activeOtps.put(admin2faEmail, new OtpEntry(otpCode, expiresAt));

        resendEmailClient.sendAdminOtp(admin2faEmail, otpCode);

        return new SendOtpResponse(
                "Mã bảo mật OTP đã được gửi tới email " + admin2faEmail,
                admin2faEmail,
                expiresAt);
    }

    public boolean verifyKey(String key, HttpSession session) {
        if (key == null || key.isBlank() || session == null) {
            return false;
        }
        String cleanKey = key.strip();

        // 1. Check against Master Key from env
        if (!adminSecurityKey.isBlank() && adminSecurityKey.equals(cleanKey)) {
            session.setAttribute(SESSION_ADMIN_2FA_VERIFIED, true);
            return true;
        }

        // 2. Check against Active OTP sent to admin email
        OtpEntry otp = activeOtps.get(admin2faEmail);
        if (otp != null) {
            if (Instant.now().isBefore(otp.expiresAt()) && otp.code().equals(cleanKey)) {
                activeOtps.remove(admin2faEmail);
                session.setAttribute(SESSION_ADMIN_2FA_VERIFIED, true);
                return true;
            } else if (Instant.now().isAfter(otp.expiresAt())) {
                activeOtps.remove(admin2faEmail);
            }
        }

        return false;
    }

    @Transactional(readOnly = true)
    public AdminStatsResponse getStats() {
        Instant now = Instant.now();
        Instant startOfToday = LocalDate.now(ZoneId.systemDefault()).atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant sevenDaysAgo = now.minus(7, ChronoUnit.DAYS);

        long totalVisits = accessLogRepository.count();
        long visitsToday = accessLogRepository.countByTimestampAfter(startOfToday);
        long visitsLast7Days = accessLogRepository.countByTimestampAfter(sevenDaysAgo);

        long uniqueVisitors = accessLogRepository.countDistinctClientIp();
        long uniqueVisitorsToday = accessLogRepository.countDistinctClientIpSince(startOfToday);

        long errorCount = accessLogRepository.countByStatusCodeRange(400, 599);
        double errorRate = totalVisits > 0 ? (double) errorCount / totalVisits * 100.0 : 0.0;
        errorRate = Math.round(errorRate * 100.0) / 100.0;

        Double avgLatency = accessLogRepository.averageDurationMsSince(sevenDaysAgo);
        double averageLatencyMs = avgLatency != null ? Math.round(avgLatency * 10.0) / 10.0 : 0.0;

        List<ApplicationUser> allUsers = userRepository.findAll();
        long totalUsers = allUsers.size();
        long verifiedUsers = allUsers.stream().filter(ApplicationUser::isEmailVerified).count();
        long adminUsers = allUsers.stream().filter(u -> isAdmin(u.getEmail())).count();

        long totalConnections = storageConnectionRepository.count();
        long totalFiles = itemRepository.count();

        long totalStorageBytes = storageConnectionRepository.findAll().stream()
                .mapToLong(c -> c.getQuotaUsedBytes() != null ? c.getQuotaUsedBytes() : 0L)
                .sum();

        // Build 7-day timeline
        List<TimelinePoint> timeline = buildVisitsTimeline(sevenDaysAgo);

        // Build Top paths
        List<Object[]> rawTop = accessLogRepository.findTopPathsSince(sevenDaysAgo, 7);
        List<PathCount> topPaths = rawTop.stream()
                .map(r -> new PathCount((String) r[0], ((Number) r[1]).longValue()))
                .toList();

        // System resources
        Runtime runtime = Runtime.getRuntime();
        long freeMem = runtime.freeMemory();
        long totalMem = runtime.totalMemory();
        long maxMem = runtime.maxMemory();
        int processors = runtime.availableProcessors();
        long uptimeSeconds = ManagementFactory.getRuntimeMXBean().getUptime() / 1000;

        SystemHealthInfo health = new SystemHealthInfo(freeMem, totalMem, maxMem, processors, uptimeSeconds);

        return new AdminStatsResponse(
                totalVisits,
                visitsToday,
                visitsLast7Days,
                uniqueVisitors,
                uniqueVisitorsToday,
                errorRate,
                averageLatencyMs,
                totalUsers,
                verifiedUsers,
                adminUsers,
                totalConnections,
                totalFiles,
                totalStorageBytes,
                timeline,
                topPaths,
                health);
    }

    private List<TimelinePoint> buildVisitsTimeline(Instant since) {
        List<AccessLog> recentLogs = accessLogRepository.findRecentLogsForTimeline(since);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");
        ZoneId zone = ZoneId.systemDefault();

        // Prepare map with past 7 days
        Map<String, long[]> dayStats = new LinkedHashMap<>();
        LocalDate startDay = LocalDate.now(zone).minusDays(6);
        for (int i = 0; i < 7; i++) {
            LocalDate d = startDay.plusDays(i);
            dayStats.put(d.format(formatter), new long[]{0, 0}); // [count, errors]
        }

        for (AccessLog log : recentLogs) {
            String dayKey = LocalDate.ofInstant(log.getTimestamp(), zone).format(formatter);
            long[] stats = dayStats.get(dayKey);
            if (stats != null) {
                stats[0]++;
                if (log.getStatusCode() >= 400) {
                    stats[1]++;
                }
            }
        }

        List<TimelinePoint> points = new ArrayList<>();
        dayStats.forEach((label, stats) -> points.add(new TimelinePoint(label, stats[0], stats[1])));
        return points;
    }

    @Transactional(readOnly = true)
    public Page<AdminAccessLogEntry> getLogs(String path, Integer status, String ip, Pageable pageable) {
        Page<AccessLog> page = (path == null && status == null && ip == null)
                ? accessLogRepository.findAllByOrderByTimestampDesc(pageable)
                : accessLogRepository.filterLogs(path, status, ip, pageable);

        return page.map(l -> new AdminAccessLogEntry(
                l.getId(),
                l.getTimestamp(),
                l.getPath(),
                l.getHttpMethod(),
                l.getStatusCode(),
                l.getClientIp(),
                l.getUserAgent(),
                l.getUserEmail(),
                l.getDurationMs()));
    }

    @Transactional(readOnly = true)
    public List<AdminUserEntry> getUsers() {
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(ApplicationUser::getCreatedAt).reversed())
                .map(u -> new AdminUserEntry(
                        u.getId(),
                        u.getEmail(),
                        u.getDisplayName(),
                        isAdmin(u.getEmail()) ? "ROLE_ADMIN" : u.getRole(),
                        u.isEmailVerified(),
                        u.getCreatedAt()))
                .toList();
    }

    @Transactional
    public void updateUserRole(UUID userId, String newRole) {
        ApplicationUser user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + userId));
        user.setRole(newRole);
        userRepository.save(user);
    }
}
