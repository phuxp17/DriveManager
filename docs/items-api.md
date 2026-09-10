# Item and Link API (BE-003)

All endpoints require an application session. Mutations use the session-backed CSRF contract in `auth-api.md`.

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/v1/items/links` | Create one logical Item and one dependent LinkContent atomically; 201 with Location |
| GET | `/api/v1/items?page=0&size=50` | Owner-scoped page; max size 100; createdAt then ID descending |
| GET | `/api/v1/items/{id}` | Read an owned, non-trashed Item |
| PATCH | `/api/v1/items/{id}` | Update name/description with mandatory expectedVersion |

Create example:

```json
{"name":"Java reference","description":"Read later","url":"https://docs.oracle.com/en/java/"}
```

Patch example:

```json
{"name":"Java documentation","description":"","expectedVersion":0}
```

Omitted/null metadata fields stay unchanged; an empty description clears its display text. Blank names are rejected after whitespace normalization. A successful patch returns the new version; stale writes return 409 VERSION_CONFLICT. URL edits are not part of this slice.

Owner ID is always derived from the authenticated user. Client-supplied owner fields cannot transfer ownership. Missing and other-owner IDs both return 404 NOT_FOUND, including PATCH. Sharing will extend this policy in BE-008; it is not enabled here.

Only absolute HTTP(S) links with a parseable host and no embedded credentials are accepted. The application stores the URL and lowercased host, without fetching pages, favicons, thumbnails or content. International domain names should use their ASCII/punycode form in this initial API. Duplicate URLs are allowed intentionally.

Item and LinkContent use composition; URL content does not require any Google account. Collections and provider-backed files arrive in later slices. Lifecycle columns reserve the agreed Item state, but lifecycle endpoints are not yet implemented.
