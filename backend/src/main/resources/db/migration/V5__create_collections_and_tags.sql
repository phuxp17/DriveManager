CREATE TABLE collections (
    id UUID PRIMARY KEY, owner_id UUID NOT NULL, parent_id UUID NULL,
    name VARCHAR(120) NOT NULL, normalized_name VARCHAR(120) NOT NULL,
    deleted_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT collections_id_owner_uq UNIQUE (id, owner_id),
    CONSTRAINT collections_owner_fk FOREIGN KEY (owner_id) REFERENCES users(id),
    CONSTRAINT collections_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id),
    CONSTRAINT collections_parent_owner_fk FOREIGN KEY (parent_id, owner_id) REFERENCES collections(id, owner_id)
);
CREATE INDEX collections_owner_parent_ix ON collections(owner_id, parent_id);
CREATE UNIQUE INDEX collections_root_name_uq ON collections(owner_id, normalized_name) WHERE parent_id IS NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX collections_child_name_uq ON collections(owner_id, parent_id, normalized_name) WHERE parent_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE collection_items (
    collection_id UUID NOT NULL, item_id UUID NOT NULL, owner_id UUID NOT NULL, added_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (collection_id, item_id),
    CONSTRAINT collection_items_collection_fk FOREIGN KEY (collection_id, owner_id) REFERENCES collections(id, owner_id),
    CONSTRAINT collection_items_item_fk FOREIGN KEY (item_id, owner_id) REFERENCES items(id, owner_id)
);
CREATE INDEX collection_items_item_ix ON collection_items(item_id);

CREATE TABLE tags (
    id UUID PRIMARY KEY, owner_id UUID NOT NULL, name VARCHAR(64) NOT NULL, normalized_name VARCHAR(64) NOT NULL,
    color VARCHAR(7) NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT tags_owner_name_uq UNIQUE (owner_id, normalized_name),
    CONSTRAINT tags_owner_fk FOREIGN KEY (owner_id) REFERENCES users(id),
    CONSTRAINT tags_id_owner_uq UNIQUE (id, owner_id)
);
CREATE TABLE item_tags (
    item_id UUID NOT NULL, tag_id UUID NOT NULL, owner_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (item_id, tag_id),
    CONSTRAINT item_tags_item_fk FOREIGN KEY (item_id, owner_id) REFERENCES items(id, owner_id),
    CONSTRAINT item_tags_tag_fk FOREIGN KEY (tag_id, owner_id) REFERENCES tags(id, owner_id)
);
CREATE INDEX item_tags_tag_ix ON item_tags(tag_id);
