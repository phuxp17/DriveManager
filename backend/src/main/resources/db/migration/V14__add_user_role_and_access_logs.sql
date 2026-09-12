ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'ROLE_USER';

UPDATE users SET role = 'ROLE_ADMIN' WHERE normalized_email = 'phuxp17@gmail.com';

CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    path VARCHAR(500) NOT NULL,
    http_method VARCHAR(16) NOT NULL,
    status_code INT NOT NULL,
    client_ip VARCHAR(64) NOT NULL,
    user_agent VARCHAR(500),
    user_email VARCHAR(320),
    duration_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS access_logs_timestamp_idx ON access_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS access_logs_path_idx ON access_logs(path);
CREATE INDEX IF NOT EXISTS access_logs_status_idx ON access_logs(status_code);
CREATE INDEX IF NOT EXISTS access_logs_client_ip_idx ON access_logs(client_ip);
