# Implementation backlog

## Team and execution

- Developer: gpt-5.6-terra / medium; implements backend before frontend.
- Reviewer: gpt-5.6-sol / high; independently reviews changes against requirements and tests.
- Workflow: implement -> review -> fix -> verify -> next slice. A build is not evidence of integration or live Google verification.

## Architecture invariants

PostgreSQL owns logical metadata and organization. Google Drive stores binary content. Collections never map automatically to Drive folders. Item uses content composition and supports multiple nested collections. Application identity differs from storage identity. Encrypted OAuth credentials belong to storage connections. Provider SDKs stay behind StorageProvider. Use a modular monolith, session authentication with CSRF, per-resource authorization, bounded file I/O, durable provider jobs, and application VIEW sharing through backend content access.

## Backend backlog

| ID     | Scope                                                                         | Acceptance                                                                                                                                  | Status                                                          |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| BE-001 | Java 21/Spring Boot, PostgreSQL/Flyway, configuration, health, error contract | Reproducible build; migrations from empty PostgreSQL; no secrets/schema auto-update; test evidence and explicit environment limitations     | Passed independent review                                       |
| BE-002 | Register/login/logout/session/CSRF                                            | Password hashing; session rotation/logout; protected API; CSRF and authentication tests                                                     | Passed independent review                                       |
| BE-003 | Item/Link composition and ownership                                           | Create/read/update link; owner-scoped list/detail; constraints and IDOR tests                                                               | Passed independent review                                       |
| BE-004 | Nested multi-collections and tags                                             | Same-owner relationships; cycle-safe atomic moves; add/remove membership; tag CRUD/merge tests                                              | Passed independent source review and final 23-test verification |
| BE-005 | Multi-account Google OAuth and storage abstraction                            | Connect never changes app principal; state validation; encrypted connection credential; refresh/reconnect; provider contract and mock tests | Partial: adapter-level OAuth/Drive HTTP tests remain required    |
| BE-006 | Durable upload/import and bounded content access                              | File size/concurrency limits; disk/stream I/O; idempotency/reconcile; verified import metadata; range/download authorization tests          | Partial: durable job/idempotency/reconciliation remains required |
| BE-007 | Retrieval and lifecycle                                                       | Search/filter pagination; Inbox vs Uncategorized; personal Recent/Favorite; Archive/Trash/restore; recoverable purge                        | Passed independent review and 31-test verification              |
| BE-008 | Contacts and VIEW sharing                                                     | Request lifecycle; direct/inherited authorization; no private storage metadata leak; recipient needs no Google connection                   | Passed independent review and 41-test verification              |
| BE-009 | Backend integration/hardening                                                 | Cross-user acceptance tests; failure handling; API contract; security review findings resolved; external verification gaps documented       | Partial: final re-review and BE-006 durability gap remain       |

## Frontend backlog (after backend gate)

| ID     | Scope                                            | Acceptance                                                                                             | Status  |
| ------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------- |
| FE-001 | React/TypeScript/router/query, layout and auth   | Real API integration; cookie/CSRF handling; logout clears cache; build and interaction tests           | Pending |
| FE-002 | Explorer, collections/tags, search and lifecycle | Grid/list; multi-collection semantics; URL filters; accessible actions; mutation/error states          | Pending |
| FE-003 | Connections/upload/import/sharing/dashboard      | Queue and retry states; Picker integration; contacts/shares; useful dashboard; end-to-end verification | Pending |

## Verification ledger

- 2026-09-09 Frontend implementation checkpoint: Hoàn thành triển khai toàn bộ ứng dụng web DriveManager trong `frontend/` theo đúng `frontend-plan.md` (FE-000, FE-001, FE-002, FE-003). Cấu hình React 18/TypeScript/Vite/Router/Query/Radix UI/Lucide, API client quản lý xoay vòng CSRF trong memory, xác thực cookie session, thư viện 8 view (active, inbox, uncategorized, favorites, recent, shared, archive, trash) với chuyển đổi bảng/lưới, cây bộ sưu tập đệ quy tối đa 10 cấp, quản lý thẻ và gộp thẻ, hàng đợi tải lên concurrency 2 với thanh tiến độ real-time, nhập Drive file ID, quản lý chia sẻ quyền VIEW, danh bạ cá nhân và dashboard dữ liệu thực. Kết quả kiểm thử tự động: Vitest chạy 8/8 tests pass (csrf.test.ts, client.test.ts); `npm run build` (`tsc && vite build`) hoàn thành thành công 0 lỗi.

- 2026-09-09 review correction: BE-006 direct streaming, range access, framework multipart limits, bounded concurrency, and MIME inference are covered, but provider upload is still executed before metadata commit and has no durable job/idempotency/reconciliation path. It must remain partial until that recovery workflow is implemented and verified; retries can otherwise create provider orphans.

- Final verification 2026-09-09: `backend/test-local.ps1` completed Java 21 Maven verify with 51 tests, 0 failures, 0 errors, 0 skipped on isolated PostgreSQL (`drivemanager` db). BE-005, BE-006, and BE-009 remain Partial pending adapter HTTP tests, durable upload reconciliation, and bounded download concurrency.
- BE-009 hardening checkpoint: added rate limiting, sanitized error responses, and cross-user IDOR regression coverage. The hardening code passes its regression tests, but the backend gate remains Partial because the listed BE-005/BE-006 acceptance gaps are open.

- Previous checkpoint 2026-09-09 15:08 +07:00: `backend/test-local.ps1` completed Java 21 Maven verify with 41 tests, 0 failures, 0 errors, 0 skipped on isolated PostgreSQL (`drivemanager` db). Executable JAR startup and real HTTP health (`backend/smoke-jar.ps1`) verified successfully.
- BE-006 implementation checkpoint: Added Flyway migration `V8__file_contents_and_upload.sql` creating `file_contents` table with FK to `items` (CASCADE delete), `storage_connections`, and indexes. Implemented `FileContent` entity, `FileContentRepository`, and extended `Item` entity with content composition (`Item.file(...)` factory) and `ItemDtos.ItemResponse`. Created `StorageProvider` abstraction port with `GoogleDriveStorageProvider` adapter for uploadStream, getFileMetadata, and downloadStream. Implemented `ItemFileService` and `ItemFileController` with 50MB max file size check, semaphore upload throttling, streaming proxy download with byte-range headers (`206 Partial Content`, `Range: bytes=start-end`, `416 Range Not Satisfiable`), and verified import from Google Drive. This remains partial pending durable idempotent/reconciled uploads, bounded downloads, and adapter HTTP tests.
- BE-008 completed: Added Flyway migration `V9__contacts_and_view_sharing.sql` creating `contacts` and `shares` tables with target check constraints, active unique indexes, and audit timestamps. Implemented `Contact` entity, `ContactRepository`, `ContactService`, and `ContactController` (`/api/v1/contacts`). Implemented `Share` entity with state machine (`PENDING`, `ACCEPTED`, `REJECTED`, `REVOKED`), `ShareRepository`, `SharingService`, and `ShareController` (`/api/v1/shares`, `/shares/incoming`, `/shares/{id}/accept`, `/shares/{id}/reject`, `/shares/{id}/revoke`). Extended `ItemService`, `ItemFileService`, `ItemLifecycleService`, and `ItemViewsService` to authorize VIEW access for shared items (both direct item shares and collection-inherited shares), proxy binary streaming for recipients without Google connections, prevent storage metadata leakage, support recipient-specific favorites/recents, and support `view=shared`. Tested via `SharingTest` (3 comprehensive end-to-end scenarios).
- Previously passed slices remain intact; BE-005 and BE-006 are now explicitly Partial for the open acceptance gaps above.

- Previous checkpoint 2026-09-09 14:45 +07:00: `backend/test-local.ps1` completed Java 21 Maven verify with 31 tests, 0 failures, 0 errors, 0 skipped on isolated PostgreSQL. Executable JAR startup and real HTTP health (`backend/smoke-jar.ps1`) verified successfully.

- Previous checkpoint 2026-09-09 14:17 +07:00: `backend/test-local.ps1` completed Java 21 Maven verify with 23 tests, 0 failures, 0 errors, 0 skipped. Includes all reviewer regression fixes and six credential encryption/configuration tests. Executable JAR repackaged successfully. BE-004 is passed; BE-005 and BE-007 remain partial as scoped above. Next implementation: storage connection schema and OAuth connect/callback with deterministic mocks, then upload/import. Frontend remains pending backend completion.

- Terra reviewer found active-item restore incorrectly mutated timestamp and tag merge/delete omitted Item modification state. Root fixed both and added regression checks. Re-review passed; collection lifecycle preserves memberships and changes Collection timestamp only (documented in organization-api.md).
- Cipher and Spring configuration tests passed in the 23-test verification before the final organization review fixes. Cipher foundation independently source-reviewed; keys and tokens are not included in API/logs. Final post-fix verification is running.

- Latest root verification: Java 21 Maven verify passed 17 tests, zero failures/errors/skips on isolated local PostgreSQL. OrganizationTest contributes five scenarios for breadcrumbs/rename, subtree depth, concurrent moves, collection deletion/restoration, tag merge and cross-owner validation. Executable JAR startup and real HTTP health also passed after these changes.
- Root took over remaining BE-004 implementation when prior agents were unavailable. A new Terra medium reviewer was activated for BE-004/BE-007 read-only review; developer activation still hit the agent-thread limit. Historical ownership notes below describe earlier checkpoints only.
- CredentialCipher foundation is separate from live OAuth: no claim of Google authorization, upload or provider verification.

- 2026-09-09 resume: BE-001 through BE-003 remain independently passed. BE-004 controllers/services have partial changes, but the existing eight-test result predates organization tests and cannot pass BE-004. Root resumed developer work; manager messaging the reviewer encountered an agent-thread-limit error, reported to root. Reviewer activity is not assumed until activation succeeds.
- BE-004 checkpoint: nine tests pass on V1–V5, including one organization API scenario. Manager read-only inspection still found missing read/rename APIs, validation/conflict handling, restore-parent and subtree-depth semantics and concurrent move protection. Developer redispatched to complete these; no BE-004 pass yet. Reviewer activation remains limited.
- Root packaging smoke: executable Spring Boot JAR reached real HTTP health on a fresh isolated schema. This proves packaging/startup, not full organization acceptance.
- Ownership: root implements BE-007 metadata/lifecycle subset in Item-related files and V6; developer keeps BE-004 organization files/tests and V5. Future BE-005 migrations start after reserved V6.
- Current coordination checkpoint: developer ended at another partial organization checkpoint. Root is running the combined verification; developer edits are paused until that run completes, then remaining BE-004 work must be reactivated with followup_task. Backlog "in progress" describes incomplete task status, not an assertion that an agent is currently executing.
- BE-007 manager read-check found no immediate ownership/SQL/provider-side-effect issue in the owned-item metadata subset. This is not Terra independent review. BE-008 must extend Favorite/Opened and views to accessible shared items using acting-user state rather than the owner-only implementation.

- Initial repository: empty, no Git metadata.
- Initial runtime survey: Maven 3.9.9 uses JDK 21; PATH java reports JDK 25. Build with the Java 21 Maven environment.
- Docker: root started Docker Desktop; engine 29.1.3 is now available. PostgreSQL/Testcontainers verification can proceed.
- Google credentials: not supplied. Complete deterministic provider/OAuth mock tests; do not claim live OAuth/Drive validation.
- BE-001 developer evidence: `mvn verify` packages successfully with Java 21. One Testcontainers test discovered but skipped because its process could not reach the Docker pipe. This is not an integration pass; independent review and Docker recheck pending.
- RV-001 independently reproduced build success and skipped integration. Fix requested: standardize safe in-scope MVC/security/not-found errors and test the error contract. No provider coupling or logical-organization violation found. Developer is addressing this before the next slice.
- RV-001 source re-review: error-response fixes accepted; main/test compilation and package pass. Docker integration now fails explicitly (one error, zero skipped), preventing a misleading green build. Local PostgreSQL verification is in preparation using a fresh isolated schema without altering existing data. No credentials belong in this ledger.
- BE-005 review reminder: sanitize provider errors before generic exception logging; never include token-bearing URLs or credential values in exception messages.
- BE-001 final evidence: external PostgreSQL mode ran in a new UUID schema of the dedicated application database; 2 tests, 0 failures, 0 errors, 0 skipped. Flyway V1/session schema, health and safe unauthenticated error verified. Reviewer inspected source isolation and Surefire report and passed the slice.
- Compatibility follow-up: local PostgreSQL 18.1 generated a Flyway tested-version warning; migrations succeeded. Compose pins PostgreSQL 17; run that integration path when Docker is reliable.
- Resume checkpoint: auth controller/service/DTOs and user entity/repository exist; BE-002 remains in progress until tests and review pass. Manager resumed successfully, but direct messaging to the developer returned an agent-thread-limit error; root was informed to coordinate that handoff.
- Temporary execution adjustment: developer activation remains blocked by agent-thread limits. Root is implementing BE-002 directly; manager owns documentation and read-only requirement checks, reviewer remains independent. This is not a claim that the requested developer agent has resumed.
- RV-002 initial findings: registration conflict must be caught at flush/commit boundary; MockHttpSession-only tests do not establish JDBC persistence/logout or two-user isolation. Clarify the CSRF response-token contract and production cookie policy. Root is addressing these; BE-002 is not yet passed.
- BE-002 root verification: Java 21 `mvn verify` succeeded with 6 tests, 0 failures/errors/skips on a fresh PostgreSQL schema. Reviewer has accepted prior source corrections and is checking final evidence. The implemented CSRF contract uses the token returned by `/auth/csrf`; see `auth-api.md` for the current contract.
- RV-002 final PASS: six tests cover cookie-only JDBC session persistence/rotation/invalidation, distinct users, generic failed login, validation, migrations/health and concurrent duplicate registration mapped to 409. Auth API documentation verified. Proceed to BE-003.
- Developer activation recovered during BE-003. Root retains BE-003 source until its review gate; developer prepares BE-004 read-only and will resume implementation after that gate.
- BE-003 initial verification: 8 tests passed with migrations V1–V4. Reviewer found a post-normalization validation gap (Unicode whitespace name could strip to empty and become a database error); root is adding validation/regression evidence before final gate. Auth remains the previously tested ChangeSessionId implementation.
- RV-003 final PASS: normalized-name validation/regression verified, tested auth configuration preserved, 8 tests/0 failures/errors/skips. Developer was dispatched to implement BE-004 using the current source tree and append-only migrations.
- RV-004 early review found duplicate V5 constraint, invalid move membership semantics and incomplete CRUD/API/tests. Developer fixed the first two and was explicitly redispatched to finish the remaining API/error/test work; BE-004 remains in progress, not passed.

## Scope boundary

Smart collections, notifications/activity, AI, additional providers, Drive change/watch sync, advanced preview, EDIT/MANAGE collaboration and browser-resumable multi-GB uploads remain later phases. MVP upload limits must be explicit.

## Next slice acceptance details

### BE-002 authentication

- REST register/login/logout/me/csrf with safe JSON errors and session cookies.
- Normalize email for uniqueness; password hash never returned; login failures do not reveal account existence.
- Login rotates an existing session identifier and saves the SecurityContext for subsequent requests; logout invalidates server-side session.
- CSRF enforced on cookie-authenticated mutations with a usable SPA token flow before and after authentication/logout.
- Tests cover successful/failed login, duplicate normalized email, CSRF rejection, persistent session, rotation, logout and distinct users.

### BE-003 resources

- Item base metadata plus one-to-one LinkContent; file content modeled only when needed by storage slice.
- Owner is taken from authenticated principal, never trusted from request body.
- Create/list/detail/patch links; HTTP(S) URL validation and domain parsing only, no remote metadata fetching/SSRF surface.
- Paginated owner-scoped list with stable ordering; safe DTOs; optimistic version handling for updates.
- Two-user tests prove IDs do not bypass access control; missing and inaccessible resources share the configured not-found behavior.

### BE-004 organization

- Collection adjacency tree with owner-scoped parent, bounded depth and cycle prevention protected against concurrent tree mutations (per-owner database lock is sufficient).
- Item may have multiple collection memberships; add is idempotent, remove affects only one membership, move names source and destination and runs atomically.
- Same-owner composite foreign keys for memberships/tags; no Drive operations from organization services.
- Breadcrumbs reflect collection context; no canonical Item path assumed.
- Collection soft-delete reparents immediate children, preserves Item content and restoreable memberships; active queries ignore deleted collections. Name conflicts return 409.
- Tags have normalized per-owner names, optional color, CRUD and transactional merge with duplicate membership prevention.
- Tests: cross-user references, concurrent cycle/move, duplicate memberships, source-specific move, tag merge, collection delete/restore preserving Items.

### BE-005 storage connection and OAuth

- Separate storage authorization/callback from application login. Pending authorization has one-time expiring state bound to the existing application session and user; multiple transactions must not overwrite each other.
- Identify Google account by validated issuer/subject; reconnect to a different subject is rejected; account selection never changes application principal.
- Connection-owned encrypted refresh credentials (AES-GCM, per-write nonce, connection-bound AAD, key version); missing refresh token does not erase an existing token.
- Scopes verified; use least-privilege drive.file plus identity scopes. No tokens in DTOs, logs or provider exception strings. Google Picker short-lived access token endpoint is owner-only and no-store when introduced.
- Credential refresh is coordinated per connection, preserves rotated refresh token, and distinguishes transient retry from reauthentication-required invalid grant.
- StorageProvider port and Google adapter isolated from organization; connection list/default/reconnect/disconnect retain Item metadata. Disconnect/revoke state must not falsely report completed external revocation.
- Deterministic OAuth state/reconnect/credential tests cover state replay/session mismatch, consent error, wrong reconnect account, refresh omission/rotation/failure, encryption ownership and private API DTOs. Adapter-level OAuth/Drive HTTP tests remain required; live consent remains unverified without credentials.

### BE-006 durable upload/import and bounded content access

- `file_contents` 1-1 composition with `items` (ON DELETE CASCADE, foreign key to storage_connections).
- Explicit size limit (50MB) and bounded streaming concurrency (Semaphore limit 5).
- Direct multipart upload streams to `StorageProvider` without buffering entire files in memory; calculates size and MD5.
- Verified import: checks existing Google Drive file metadata via `StorageProvider.getFileMetadata()` using fresh OAuth token; rejects non-existent/unowned files.
- Proxy streaming download: supports full (200 OK) and range (`206 Partial Content`, `Range: bytes=start-end`, `416 Range Not Satisfiable`), setting `Content-Disposition`, `Content-Type`, `Accept-Ranges`, `Content-Length`, `Content-Range`.
- Item type inference from MIME type (IMAGE, DOCUMENT, AUDIO, VIDEO, ARCHIVE, FILE).
- Soft-deleted items return 404 on content download.
- `ItemFileTest.java` covers upload, MIME type determination, size limits, Google Drive import, cross-user rejection, full/range/malformed-range streaming downloads, and trashed item access; durable/reconciled upload and bounded-download acceptance remains open.

### BE-008 contacts and VIEW sharing

- Contact management (`contacts` table, target check constraints, bidirectional lookup, add/remove/list, self-contact prevention, duplicate prevention).
- Explicit VIEW share lifecycle (`shares` table, states `PENDING` -> `ACCEPTED` / `REJECTED` / `REVOKED`, owner-managed revoke, recipient-managed accept/reject).
- Target support for both direct `ITEM` and inherited `COLLECTION` shares (all items residing in accepted shared collections inherit VIEW access).
- Zero storage metadata leakage: recipient responses contain original filename, mime type, size, but strictly no storage connection IDs, Drive file IDs, OAuth tokens, or Drive provider details.
- Proxy streaming download: recipient can download shared item binary content without needing any Google Drive connection or OAuth tokens of their own; backend streams on recipient's behalf using owner's connection.
- Personal state for recipient: recipient can favorite and record opened timestamps on accessible shared items without mutating owner's metadata or items.
- Specialized view filters: `view=shared` displays accepted shared items; `view=favorites` and `view=recent` include accepted shared items marked as favorite or recently opened by the acting user.
- Authorization enforcement: recipients CANNOT mutate (rename, update, delete) shared items or collections (returns 404 / access denied).
- Comprehensive suite `SharingTest.java` (3 scenarios) covering contacts lifecycle, direct item sharing lifecycle with content access and permission bounds, and inherited collection sharing granting/revoking access.

### BE-009 backend integration/hardening

- Sliding-window IP rate limiter (`RateLimitProperties`, `RateLimiter`, `RateLimitFilter`) protecting `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/items/files/upload`, `/api/v1/shares`, returning `429 Too Many Requests` with `Retry-After: 60` and standard `ApiError`.
- Error contract sanitization: `MaxUploadSizeExceededException` handled cleanly as 400 Bad Request; zero stack traces / SQL error leaks; zero token/secret leaks in logs or payloads; uniform anti-IDOR `404 Not Found` across all unauthorized resources.
- Cross-user IDOR isolation acceptance tests across all domains: Items, Links, Collections, Tags, Storage Connections, Contacts, Shares, and Instant Revocation blocking content streaming.
- API specifications documented in `docs/files-api.md`, `docs/sharing-api.md`, and `docs/hardening-security.md`.
- `BackendHardeningTest.java` passes alongside all existing suites (51 tests passed, 0 failures, 0 errors, 0 skipped); the backend gate remains Partial for the documented BE-005/BE-006 gaps.
