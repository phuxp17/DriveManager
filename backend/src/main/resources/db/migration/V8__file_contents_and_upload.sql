CREATE TABLE file_contents (
    item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    storage_connection_id UUID NOT NULL REFERENCES storage_connections(id) ON DELETE RESTRICT,
    storage_file_id VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(127) NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
    md5_checksum VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX file_contents_connection_idx ON file_contents(storage_connection_id);
CREATE INDEX file_contents_storage_file_idx ON file_contents(storage_file_id);
