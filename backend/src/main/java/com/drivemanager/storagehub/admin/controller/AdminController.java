package com.drivemanager.storagehub.admin.controller;

import com.drivemanager.storagehub.admin.dto.AdminDtos.*;
import com.drivemanager.storagehub.admin.service.AdminService;
import com.drivemanager.storagehub.common.error.ApiError;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    private void requireAdmin(Authentication auth) {
        if (auth == null || !adminService.isAdmin(auth.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Quyền Quản trị viên (Admin) là bắt buộc.");
        }
    }

    private void requireAdminAnd2FA(Authentication auth, HttpSession session) {
        requireAdmin(auth);
        if (!adminService.is2faVerified(session)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ADMIN_2FA_REQUIRED",
                    "Yêu cầu xác nhận khóa bảo mật hoặc mã OTP gửi về email Admin.");
        }
    }

    @GetMapping("/auth/status")
    public AdminAuthStatusResponse getAuthStatus(Authentication auth, HttpSession session) {
        String email = auth != null ? auth.getName() : null;
        return adminService.getAuthStatus(email, session);
    }

    @PostMapping("/auth/send-otp")
    public ResponseEntity<?> sendOtp(Authentication auth) {
        requireAdmin(auth);
        try {
            SendOtpResponse response = adminService.sendOtp(auth.getName());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiError.of(500, "EMAIL_DELIVERY_FAILED", "Không thể gửi email OTP: " + e.getMessage()));
        }
    }

    @PostMapping("/auth/verify")
    public ResponseEntity<?> verifyKey(
            Authentication auth,
            HttpSession session,
            @RequestBody AdminVerifyRequest request) {
        requireAdmin(auth);
        boolean valid = adminService.verifyKey(request.key(), session);
        if (!valid) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiError.of(400, "INVALID_ADMIN_KEY", "Khóa bảo mật hoặc mã OTP không chính xác hoặc đã hết hạn."));
        }
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Xác thực quyền Admin thành công. Đã mở khóa phiên làm việc."));
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsResponse> getStats(Authentication auth, HttpSession session) {
        requireAdminAnd2FA(auth, session);
        return ResponseEntity.ok(adminService.getStats());
    }

    @GetMapping("/logs")
    public ResponseEntity<Page<AdminAccessLogEntry>> getLogs(
            Authentication auth,
            HttpSession session,
            @RequestParam(required = false) String path,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String ip,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        requireAdminAnd2FA(auth, session);
        int pageSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(Math.max(page, 0), pageSize);
        return ResponseEntity.ok(adminService.getLogs(path, status, ip, pageable));
    }

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserEntry>> getUsers(Authentication auth, HttpSession session) {
        requireAdminAnd2FA(auth, session);
        return ResponseEntity.ok(adminService.getUsers());
    }

    @PostMapping("/users/{id}/role")
    public ResponseEntity<?> updateUserRole(
            Authentication auth,
            HttpSession session,
            @PathVariable UUID id,
            @RequestBody UpdateUserRoleRequest request) {
        requireAdminAnd2FA(auth, session);
        adminService.updateUserRole(id, request.role());
        return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật vai trò thành công."));
    }

    // Custom response exception for clean API error returns
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public static class ResponseStatusException extends RuntimeException {
        private final HttpStatus status;
        private final String code;

        public ResponseStatusException(HttpStatus status, String code, String message) {
            super(message);
            this.status = status;
            this.code = code;
        }

        public HttpStatus getStatus() {
            return status;
        }

        public String getCode() {
            return code;
        }
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatus())
                .body(ApiError.of(ex.getStatus().value(), ex.getCode(), ex.getMessage()));
    }
}
