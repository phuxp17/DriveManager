# Organization and lifecycle API

All routes use `/api/v1`, authenticated session cookies and the CSRF header described in `auth-api.md`. Missing and foreign-owned resources return 404. These operations never call Google Drive.

## Collections

- `POST /collections`: `{name,parentId?}`; `GET /collections?parentId=...` lists active children (omit parent for roots).
- `GET /collections/{id}` and `GET /collections/{id}/ancestors` (root-first, excludes current collection).
- `PATCH /collections/{id}`: `{name}`; `PATCH /collections/{id}/parent`: `{parentId}` (null means root).
- `PUT /collections/{collectionId}/items/{itemId}` adds an idempotent membership; DELETE removes only that membership.
- `POST /collections/items/{itemId}/move`: `{sourceCollectionId,destinationCollectionId}` atomically replaces the named source membership; other memberships survive. Missing source returns 404.
- `DELETE /collections/{id}` soft-deletes the collection, reparents immediate children and retains memberships/items. Name conflicts roll the transaction back with 409.
- `POST /collections/{id}/restore` restores memberships; a missing/deleted parent sends it to root. Previously reparented children stay where they are.

Maximum depth is ten collections, counting root. Moving a branch checks its full height. Sibling names are normalized and unique among active collections. Per-owner write locks serialize concurrent organization changes and prevent reciprocal parent cycles.

## Tags

`GET/POST /tags`, `PATCH/DELETE /tags/{id}`, `PUT/DELETE /tags/{tagId}/items/{itemId}`, and `POST /tags/{sourceId}/merge` with `{targetId}`. Creation/rename accepts `{name,color?}`; color is six-digit hex. Normalized names are unique per owner. Merge retains the target and collapses duplicate item assignments. Deleting a tag keeps items.

## Views and personal state

`GET /items?view=active|inbox|uncategorized|favorites|recent|shared|archive|trash&page=0&size=20` returns an authorized paginated projection (maximum size 100). Search and supported filters are available through the item query parameters; unsupported advanced filtering remains later scope.

- Inbox means not reviewed; `PUT/DELETE /items/{id}/review` sets/clears review. Being assigned to a collection does not automatically mark reviewed.
- Uncategorized means no active collection membership, independently of review.
- `PUT/DELETE /users/me/favorites/{id}` controls application favorite state.
- `POST /items/{id}/opens` records an explicit open. Fetching detail does not change Recent.
- `PUT/DELETE /items/{id}/archive` sets/clears archive.
- `DELETE /items/{id}` sends to Trash; `POST /trash/items/{id}/restore` requires a trashed item and preserves archive/review/personal state. Active-item restore returns 404. `DELETE /trash/items/{id}` permanently purges a trashed item, removing its memberships, tags, states and content; purging an active or foreign item returns 404.

Item.updatedAt tracks direct metadata, lifecycle and membership mutations, including tag merge/delete. Favorite and open timestamps are personal and do not change Item.updatedAt. Renaming or soft-deleting/restoring a collection changes the collection timestamp; preserved item memberships are not rewritten. Derived views such as Uncategorized can therefore change without an item modification. Tag rename likewise changes the tag itself, whereas merge/delete changes item assignments.

Accepted direct and recursive collection VIEW shares authorize recipient detail/content access and recipient-specific favorite/recent state. Recipients cannot mutate owner items or collections.
