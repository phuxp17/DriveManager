CREATE TABLE contacts (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alias VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, contact_user_id),
    CONSTRAINT contacts_no_self CHECK (user_id <> contact_user_id)
);
CREATE INDEX contacts_user_idx ON contacts(user_id, created_at DESC);

CREATE TABLE shares (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(16) NOT NULL CHECK (target_type IN ('ITEM', 'COLLECTION')),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(16) NOT NULL CHECK (permission = 'VIEW'),
    status VARCHAR(16) NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED')),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT shares_target_chk CHECK (
        (target_type = 'ITEM' AND item_id IS NOT NULL AND collection_id IS NULL) OR
        (target_type = 'COLLECTION' AND collection_id IS NOT NULL AND item_id IS NULL)
    ),
    CONSTRAINT shares_no_self CHECK (owner_id <> recipient_id)
);
CREATE INDEX shares_recipient_status_idx ON shares(recipient_id, status);
CREATE INDEX shares_owner_idx ON shares(owner_id, updated_at DESC);
CREATE INDEX shares_item_idx ON shares(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX shares_collection_idx ON shares(collection_id) WHERE collection_id IS NOT NULL;
CREATE UNIQUE INDEX shares_active_item_recipient_uq ON shares(item_id, recipient_id) WHERE status IN ('PENDING', 'ACCEPTED');
CREATE UNIQUE INDEX shares_active_collection_recipient_uq ON shares(collection_id, recipient_id) WHERE status IN ('PENDING', 'ACCEPTED');
