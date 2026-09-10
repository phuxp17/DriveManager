CREATE TABLE storage_connections (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(32) NOT NULL,
    provider_issuer VARCHAR(255) NOT NULL,
    provider_subject VARCHAR(255) NOT NULL,
    display_name VARCHAR(320),
    granted_scopes TEXT NOT NULL,
    encrypted_refresh_token BYTEA,
    status VARCHAR(32) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT storage_connections_provider_chk CHECK (provider = 'GOOGLE'),
    CONSTRAINT storage_connections_status_chk CHECK (status IN ('CONNECTED', 'REAUTHENTICATION_REQUIRED', 'DISCONNECTED')),
    CONSTRAINT storage_connections_owner_google_account_uq UNIQUE (owner_id, provider, provider_issuer, provider_subject)
);
CREATE INDEX storage_connections_owner_idx ON storage_connections(owner_id, updated_at DESC);

CREATE TABLE oauth_authorizations (
    id UUID PRIMARY KEY,
    state_digest BYTEA NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES users(id),
    session_id VARCHAR(100) NOT NULL,
    connection_id UUID REFERENCES storage_connections(id) ON DELETE CASCADE,
    encrypted_pkce_verifier BYTEA NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ
);
CREATE INDEX oauth_authorizations_expiry_idx ON oauth_authorizations(expires_at) WHERE consumed_at IS NULL;
