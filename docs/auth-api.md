# Authentication API (BE-002)

Authentication is application-owned, using a PostgreSQL-backed Spring Session. Connecting Google storage will be a separate flow and must not replace this identity.

## Browser contract

1. GET `/api/v1/auth/csrf` with `credentials: 'include'`. Keep the returned `token` and `headerName` in memory. The session cookie is HttpOnly; do not read it from JavaScript.
2. Send that token under the returned header name on every POST/PATCH/PUT/DELETE, including register and login. Continue sending cookies.
3. POST `/api/v1/auth/register` with `{email,password,displayName}` creates a user (201), sends a 24-hour verification link through Resend, and does not log in.
4. The email button opens GET `/api/v1/auth/verify?token=...`; a valid single-use token verifies the account and redirects to `/login?verification=success` on the configured frontend.
5. POST `/api/v1/auth/login` with `{email,password}` succeeds only for a verified email, returns the public user, rotates the session ID and clears the prior CSRF token.
6. Fetch `/csrf` again after login before the next mutation. GET `/api/v1/auth/me` reads the authenticated identity.
7. POST `/api/v1/auth/logout` with the current CSRF token invalidates the database session. Clear user/query caches and fetch a new `/csrf` token before logging in again.

The API uses a session-backed CSRF repository and the response body token. There is no XSRF-TOKEN cookie contract. Responses must not be cached across users; Spring Security supplies no-cache headers.

## Errors and validation

- Missing authentication: 401 `UNAUTHENTICATED`.
- Wrong email or password: 401 `INVALID_CREDENTIALS` with the same message.
- Correct credentials before email verification: 403 `EMAIL_NOT_VERIFIED`.
- Missing/wrong/stale CSRF: 403 `ACCESS_DENIED`.
- Duplicate normalized email, including concurrent requests: 409 `EMAIL_ALREADY_REGISTERED`.
- Invalid JSON or validated input: 400 `VALIDATION_ERROR`.
- Passwords: at least 12 characters for registration, at most 72 UTF-8 bytes for BCrypt; never trimmed, returned or stored as plaintext.
- Email uniqueness is case-insensitive; user responses include only ID, email and display name.

## Deployment and verification

Session cookies default to Secure, HttpOnly and SameSite=Lax. Use HTTPS in deployment. Only the local profile disables Secure for HTTP localhost development. Frontend/backend should share an origin through a proxy; no permissive cross-origin configuration is enabled.

`RESEND_API_KEY` is required at startup. Set `RESEND_FROM` to an address on a verified Resend domain for real recipients; `onboarding@resend.dev` is limited to Resend account-owner testing. Configure public HTTPS `APP_BASE_URL` and `FRONTEND_URL` values in deployment.

From the repository root, run `rtk proxy powershell -NoProfile -File backend/test-local.ps1` to read the known test datasource keys from the ignored `.env` and execute Maven verification. Values are never evaluated as code or printed by the script. JDK 21 is enforced by Maven.

External database tests create a fresh UUID schema and never reset/drop existing data. The default path remains PostgreSQL 17 Testcontainers. Retained generated test schemas require a separately reviewed cleanup process.

BE-009 will add rate limiting and deployment-wide operational hardening; BE-002 alone is not the completed production security gate.
