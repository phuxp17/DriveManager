CREATE TABLE items (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(16) NOT NULL CHECK (type IN ('FILE', 'IMAGE', 'VIDEO', 'LINK', 'NOTE')),
    name VARCHAR(255) NOT NULL CHECK (length(trim(name)) > 0),
    description TEXT,
    reviewed_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT items_id_owner_uq UNIQUE (id, owner_id),
    CONSTRAINT items_deletion_pair CHECK ((deleted_at IS NULL) = (deleted_by IS NULL))
);
CREATE INDEX items_owner_created_idx ON items(owner_id, created_at DESC, id DESC) WHERE deleted_at IS NULL;
CREATE TABLE link_contents (
    item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    domain VARCHAR(253) NOT NULL
);
CREATE INDEX link_contents_domain_idx ON link_contents(domain);
