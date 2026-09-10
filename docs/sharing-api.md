# Sharing & Contacts API Specification

This document details the contacts management, share request lifecycle, permissions, and proxy VIEW streaming access in StorageHub.

---

## 1. Sharing Domain Model

- **Application VIEW Sharing**: All shares in StorageHub grant read-only (`VIEW`) access. StorageHub mediates binary delivery on behalf of the owner, so recipients never require their own Google Drive connections.
- **Target Types**:
  - `ITEM`: Direct share of a specific file or link.
  - `COLLECTION`: Share of an entire collection, recursively granting VIEW access to all items contained in the collection.
- **Share Lifecycle State Machine**:
  - `PENDING`: Initial state upon creation by the owner.
  - `ACCEPTED`: Recipient explicitly accepts the share. VIEW access is activated.
  - `REJECTED`: Recipient declines the share. Access is denied.
  - `REVOKED`: Owner revokes or recipient leaves. Access is immediately terminated.

---

## 2. Contacts Endpoints

### 2.1 List Contacts
Lists all personal contacts saved by the current user.
- **Method**: `GET /api/v1/contacts`
- **Response**: `200 OK`
```json
[
  {
    "id": "1fa85f64-5717-4562-b3fc-2c963f66afa1",
    "email": "colleague@example.com",
    "name": "Alex Colleague",
    "createdAt": "2026-09-09T10:00:00Z"
  }
]
```

### 2.2 Add Contact
Creates or updates a contact in the caller's address book.
- **Method**: `POST /api/v1/contacts`
- **Request Body**:
```json
{
  "email": "colleague@example.com",
  "name": "Alex Colleague"
}
```
- **Response**: `201 Created`

### 2.3 Delete Contact
Removes a contact from the caller's address book.
- **Method**: `DELETE /api/v1/contacts/{id}`
- **Response**: `204 No Content`

---

## 3. Shares Endpoints

### 3.1 Create Share
Creates a share invitation for an item or collection with a target recipient email.
- **Method**: `POST /api/v1/shares`
- **Rate Limit**: Enforced per transport client IP (sliding window, default: 60 requests/minute).
- **Request Body**:
```json
{
  "targetType": "ITEM",
  "targetId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "recipientEmail": "recipient@example.com"
}
```
- **Response**: `201 Created`
```json
{
  "id": "7fa85f64-5717-4562-b3fc-2c963f66afa9",
  "targetType": "ITEM",
  "targetId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "ownerEmail": "owner@example.com",
  "recipientEmail": "recipient@example.com",
  "status": "PENDING",
  "createdAt": "2026-09-09T14:35:00Z"
}
```

### 3.2 List Incoming Shares
Lists pending and accepted incoming shares for the authenticated user.
- **Method**: `GET /api/v1/shares/incoming`
- **Response**: `200 OK`

### 3.3 Accept Share
Accepts an incoming share, granting access to the target item or collection.
- **Method**: `POST /api/v1/shares/{id}/accept`
- **Response**: `200 OK` (with `"status": "ACCEPTED"`)

### 3.4 Reject Share
Declines an incoming share.
- **Method**: `POST /api/v1/shares/{id}/reject`
- **Response**: `200 OK` (with `"status": "REJECTED"`)

### 3.5 Revoke or Leave Share
Allows the item owner to revoke access, or an accepted recipient to leave the share.
- **Method**: `DELETE /api/v1/shares/{id}`
- **Response**: `204 No Content`
- **Security Effect**: Access is terminated immediately. Subsequent requests by the recipient to view or download content return `404 Not Found`.

---

## 4. VIEW Content Streaming & Privacy

1. **Proxy Streaming**: When an authorized recipient requests `GET /api/v1/items/{id}/content`, the backend uses the item owner's storage connection to stream bytes securely from Google Drive. The recipient does not need a Google connection or Drive account.
2. **Metadata Sanitization**: Responses to shared items omit internal owner storage connection credentials and provider tokens.
3. **Recipient Preferences**: Recipients have their own isolated Favorite and Recent state (`view=favorites`, `view=recent`) that never alters the owner's state.
