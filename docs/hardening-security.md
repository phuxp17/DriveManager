# Security Hardening & Abuse Prevention Specification

This document details the operational hardening, sliding-window rate limiting, error contract sanitization, and multi-tenant cross-user IDOR isolation policies implemented in StorageHub backend (BE-009).

---

## 1. Sliding-Window Rate Limiting

To safeguard sensitive endpoints against brute-force authentication, mass account creation, resource exhaustion, and share-spam abuse, an IP-based sliding-window rate limiter is integrated into the Spring Security filter chain prior to authentication filter execution.

### 1.1 Protected Endpoints & Quotas

| Endpoint Path | Method | Default Limit | Window | Purpose |
|---|---|---|---|---|
| `/api/v1/auth/login` | `POST` | 60 requests | 60 seconds | Brute-force & credential stuffing defense |
| `/api/v1/auth/register` | `POST` | 60 requests | 60 seconds | Sybil / mass-registration defense |
| `/api/v1/items/files/upload` | `POST` | 60 requests | 60 seconds | Denial of Service / disk & bandwidth flooding |
| `/api/v1/shares` | `POST` | 60 requests | 60 seconds | Anti-spam share invitation defense |

### 1.2 Limiter Algorithm & Memory Boundedness
- **Algorithm**: Accurate sliding-window counter tracking timestamped hit timestamps in thread-safe double-ended queues (`ConcurrentHashMap<String, Deque<Long>>`).
- **Memory Safety**: Key size is capped at 10,000 entries. Expired entries are pruned and one existing key is evicted before admitting a new key at capacity.
- **IP Extraction**: Uses `request.getRemoteAddr()`; forwarded headers are intentionally ignored unless a trusted proxy normalizes them before the application.
- **429 Response Format**:
  - HTTP Status: `429 Too Many Requests`
  - Response Header: `Retry-After: 60`
  - Payload (`ApiError`):
  ```json
  {
    "timestamp": "2026-09-09T00:00:00Z",
    "status": 429,
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
  ```

---

## 2. Error Contract Uniformity & Failure Sanitization

### 2.1 Uniform `ApiError` Contract
All runtime, validation, security, and operational errors follow the standard `ApiError` schema:
```json
{
  "timestamp": "2026-09-09T00:00:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "The request is invalid."
}
```

### 2.2 Leakage Prevention Guarantees
- **Zero Stack Traces**: Spring Boot `server.error.include-stacktrace=never` and custom `ApiExceptionHandler` ensure stack traces and internal class names are never returned to clients.
- **Zero Token / Secret Exposure**: OAuth client secrets, refresh tokens, access tokens, and credential database rows are strictly excluded from all DTOs, controllers, and log output.
- **Max Upload Size Sanitization**: Spring's `MaxUploadSizeExceededException` is caught and converted to a clean `400 Bad Request` instead of uncaught 500 crashes or servlet disconnects.

---

## 3. Cross-User IDOR Isolation Matrix

All resource operations verify tenant ownership or authorized share grants within the same database transaction before returning data. Unowned or non-existent resources consistently return `404 Not Found` to prevent resource-enumeration attacks.

| Resource Domain | IDOR Attack Vector Tested | Defense Mechanism | Test Status |
|---|---|---|---|
| **Items & Links** | User B attempts GET/PATCH/DELETE on User A's item | Repository query scoped by `ownerId` (`findByIdAndOwnerId`) | Verified (404) |
| **Collections** | User B attempts read, rename, delete, restore, or ancestor lookup on User A's folder | Scoped by owner ID; cycle checks verify same owner | Verified (404) |
| **Tags** | User B attempts rename, delete, or merging User A's tag into User B's tag | Scoped by owner ID | Verified (404) |
| **Storage Connections** | User B attempts to list, disconnect, or upload files using User A's connection | `findByIdAndOwnerId` check | Verified (404) |
| **Contacts** | User B attempts to delete User A's contact | Scoped by owner ID | Verified (404) |
| **Shares** | Stranger attempts to view, accept, reject, revoke, or access item through unshared share | Validated against `recipientEmail` or `ownerEmail` | Verified (404) |
| **Instant Revocation** | Recipient attempts to download item content after owner revokes share | Share state machine transitions to `REVOKED`; content download rejected immediately | Verified (404) |
