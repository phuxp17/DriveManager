ALTER TABLE storage_connections
    ADD COLUMN quota_total_bytes BIGINT,
    ADD COLUMN quota_used_bytes BIGINT,
    ADD COLUMN quota_usage_in_drive_bytes BIGINT,
    ADD COLUMN last_synced_at TIMESTAMPTZ;

CREATE INDEX storage_connections_last_synced_idx ON storage_connections(last_synced_at);
