# Files API & Storage Provider Contract

This document specifies the REST API endpoints, storage provider integration, file upload/import mechanisms, bounded streaming, range requests, and error contracts for file items in the StorageHub backend.

---

## 1. Storage Architecture & Composition

In accordance with architectural invariants:
- **PostgreSQL** owns logical metadata, item ownership, collections, tags, lifecycle, and sharing.
- **Binary storage** resides in cloud providers (e.g. Google Drive) via encrypted `StorageConnection` credentials.
- An `Item` of type `FILE` contains a 1-to-1 composition with `FileContent`, which stores:
  - `storage_connection_id`: FK to the owning user's storage connection.
  - `provider_file_id`: Remote file identifier in the provider.
  - `mime_type`: Content MIME type detected or declared.
  - `size_bytes`: Byte length of the binary payload.
  - `md5_checksum`: Hex hash from the provider if available.
  - `original_filename`: Name supplied during upload or import.

---

## 2. API Endpoints

### 2.1 Direct File Upload
Uploads a binary file from the client, streams it directly to the user's storage provider, and creates an `Item` and `FileContent`.

> Current limitation: this synchronous endpoint has no durable upload job or idempotency key. A provider success followed by database failure can leave a provider orphan; BE-006 remains partial until the durable reconcile workflow is added.
> Download streams are provider-proxied but do not yet have a separate global download-concurrency bound; BE-006 remains partial until that bounded-I/O policy is implemented and tested.

- **Method**: `POST /api/v1/items/files/upload`
- **Content-Type**: `multipart/form-data`
- **Authentication**: Session cookie + CSRF header (`X-CSRF-TOKEN`)
- **Rate Limit**: Enforced per transport client IP (sliding window, default: 60 requests/minute). Exceeding returns `429 Too Many Requests`.
- **Max File Size**: 50 MB (`52,428,800 bytes`). Exceeding returns `400 Bad Request`.
- **Concurrency Control**: Bounded by an internal concurrency semaphore (default: 5 concurrent uploads). Exceeding returns `503 Service Unavailable` with `Retry-After: 5`.

#### Request Parameters (Multipart Form)
| Parameter | Type | Required | Description |
|---|---|---|---|
| `file` | Binary Part | Yes | The file payload to upload |
| `connectionId` | UUID | Yes | ID of an active storage connection owned by the caller |
| `name` | String | No | Optional display name |
| `description` | String | No | Optional description |

#### Response: `201 Created`
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "type": "FILE",
  "name": "report.pdf",
  "description": "Quarterly financial summary",
  "archived": false,
  "trashed": false,
  "trashedAt": null,
  "mimeType": "application/pdf",
  "sizeBytes": 1048576,
  "originalFilename": "report.pdf",
  "createdAt": "2026-09-09T14:30:00Z",
  "updatedAt": "2026-09-09T14:30:00Z",
}
```

---

### 2.2 Import Existing File from Provider
Registers an existing file in Google Drive as an `Item` in StorageHub without re-uploading bytes. Verifies file existence and fetches metadata via the provider adapter.

- **Method**: `POST /api/v1/items/files/import`
- **Content-Type**: `application/json`
- **Authentication**: Session cookie + CSRF header (`X-CSRF-TOKEN`)

#### Request Body
```json
{
  "connectionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "driveFileId": "1A2B3C4D5E6F7G8H9I0J",
  "name": "Imported Drive work file",
  "description": "Imported from Drive work folder"
}
```

#### Response: `201 Created`
Returns the created `ItemResponse` as above.

---

### 2.3 Download File Content (Streaming & Range Requests)
Streams binary content for an item. The caller may be the item owner or an authorized recipient with an accepted direct/inherited share.

- **Method**: `GET /api/v1/items/{id}/content`
- **Authentication**: Session cookie
- **Headers Supported**:
  - `Range: bytes=start-end` or `Range: bytes=start-`

#### Full Content Response: `200 OK`
- `Content-Type`: MIME type of the file
- `Content-Length`: Full byte size
- `Accept-Ranges`: `bytes`
- `Content-Disposition`: `inline; filename="report.pdf"`

#### Partial Content Response: `206 Partial Content`
- `Content-Type`: MIME type of the file
- `Content-Length`: Sliced byte size (`end - start + 1`)
- `Content-Range`: `bytes start-end/total`
- `Accept-Ranges`: `bytes`

#### Invalid Range Response: `416 Range Not Satisfiable`
- `Content-Range`: `bytes */total`

---

## 3. Error Handling & Security Guarantees

| Status Code | Condition | Response Body (`ApiError`) |
|---|---|---|
| `400 Bad Request` | Upload size exceeds 50MB, invalid parameters | Standard error with `fieldErrors` or validation message |
| `404 Not Found` | Item does not exist, or caller does not own it and has no share | Anti-IDOR uniform `404` error |
| `416 Range Not Satisfiable` | Requested range is invalid or out of file bounds | Handled with `Content-Range: bytes */size` |
| `429 Too Many Requests` | IP rate limit exceeded on `/items/files/upload` | `429` with header `Retry-After: 60` |
| `503 Service Unavailable` | Concurrency limit reached for active uploads | `503` with header `Retry-After: 5` |
