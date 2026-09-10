ALTER TABLE users
    ADD COLUMN email_verified_at TIMESTAMPTZ,
    ADD COLUMN email_verification_token_hash VARCHAR(64),
    ADD COLUMN email_verification_expires_at TIMESTAMPTZ;

UPDATE users SET email_verified_at = created_at;

CREATE UNIQUE INDEX users_email_verification_token_uq
    ON users (email_verification_token_hash)
    WHERE email_verification_token_hash IS NOT NULL;
