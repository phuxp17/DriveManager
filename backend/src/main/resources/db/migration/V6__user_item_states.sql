CREATE TABLE user_item_states (
    user_id UUID NOT NULL REFERENCES users(id),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    favorited_at TIMESTAMPTZ,
    last_opened_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, item_id)
);
CREATE INDEX user_item_favorites_idx ON user_item_states(user_id, favorited_at DESC) WHERE favorited_at IS NOT NULL;
CREATE INDEX user_item_recent_idx ON user_item_states(user_id, last_opened_at DESC) WHERE last_opened_at IS NOT NULL;
CREATE INDEX user_item_states_item_idx ON user_item_states(item_id);
CREATE INDEX items_owner_deleted_idx ON items(owner_id, deleted_at DESC) WHERE deleted_at IS NOT NULL;
