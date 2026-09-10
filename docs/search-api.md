# Basic library search

`GET /api/v1/items` combines the existing `view`, `page` and `size` with optional filters:

| Parameter | Meaning |
| --- | --- |
| q | Case-insensitive literal substring, maximum 200 characters; name, description, URL/domain, assigned tag names and active collection names |
| type | FILE, IMAGE, VIDEO, LINK or NOTE; PDF is a MIME filter, not an Item type |
| tags | Repeated UUID parameters; item must have all specified tags; maximum 20 distinct tags, duplicates ignored |
| collectionId | Exact active collection membership; descendants are not included |
| favorite | true or false, for the acting owner's personal state |
| createdFrom | Inclusive ISO-8601 instant |
| createdBefore | Exclusive ISO-8601 instant; must follow createdFrom |
| sort | added or modified, descending with item UUID as stable tie-breaker; omit to retain view-specific ordering |

All filters combine with AND. Text matches any supported field. Wildcard `%` and `_` are literal input. Foreign tag/collection IDs return an empty result without revealing their existence. Archive/Trash boundaries remain controlled by view. Queries never inspect Drive.

This MVP uses PostgreSQL ILIKE and indexed relationship lookups. Leading substring matches scan candidate owner rows, which is acceptable for a small personal library; benchmark real data before adding pg_trgm/full-text indexes. No Elasticsearch service is needed. Original filename, MIME, size and storage filters await the file-content model; query-language syntax and accent-insensitive/semantic matching are not implemented.
