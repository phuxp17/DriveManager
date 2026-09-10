# DriveManager

DriveManager includes a Spring Boot backend and a React/Vite frontend. PostgreSQL owns application metadata; configured storage providers hold file binaries.

## Prerequisites

- JDK 21
- Maven 3.9+
- PostgreSQL locally, or Docker Desktop for the provided PostgreSQL 17 service
- Node.js 20+ and npm

## Before you run

1. Copy `.env.example` to the ignored `.env` file and set a non-empty `POSTGRES_PASSWORD`. Do not overwrite an existing `.env`.
2. Ensure the configured `POSTGRES_PORT` is available. Use either an existing dedicated PostgreSQL database or start Docker Desktop and run `docker compose up -d postgres`.
3. For Google Drive, create OAuth web credentials, add `http://localhost:3000/app/connections/callback` as an authorized redirect URI, then set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `.env`.
4. Install frontend dependencies once with `npm install` from `frontend/`.
5. Start the backend first and confirm `http://localhost:8080/actuator/health` returns `UP`; then start the frontend.

## Run locally

```powershell
powershell -NoProfile -File backend/run-local.ps1
```

In another terminal:

```powershell
Set-Location frontend
npm run dev
```

Open `http://localhost:3000`.

Before first use, create an ignored `.env` from `.env.example` without overwriting an existing file. Set the local database name, user, password and port. The runner imports only known configuration keys without printing their values. Database credentials are never committed.

When using an existing PostgreSQL installation, point the configuration at a dedicated application database; do not start Compose over its occupied port. For a new Docker-managed database, `docker compose up -d postgres` starts the supplied service. Choose an available POSTGRES_PORT first. The application applies migrations to its configured database and never resets existing schemas.

Health is available at `http://localhost:8080/actuator/health`.

The development database uses Flyway migrations. Hibernate validates mappings and never modifies the schema.

## Integration tests without Docker

The normal test path uses Testcontainers. When Docker is unavailable, an isolated PostgreSQL database can be selected explicitly with `USE_EXTERNAL_TEST_DATABASE=true` and the `TEST_DATABASE_URL`, `TEST_DATABASE_USERNAME`, and `TEST_DATABASE_PASSWORD` keys in ignored `.env`. The test creates a new UUID-named schema and does not clean or drop existing schemas.

```powershell
powershell -NoProfile -File backend/test-local.ps1
```

Maven verify also packages an executable Spring Boot JAR in `backend/target`. Run it with a Java 21 runtime and datasource environment variables (`java -jar backend/target/storage-hub-backend-0.0.1-SNAPSHOT.jar`). Deployment defaults require HTTPS for the session cookie; HTTP localhost development uses the local profile.

API contracts: [authentication/session/CSRF](docs/auth-api.md), [Item and Link](docs/items-api.md), [collections/tags and lifecycle](docs/organization-api.md). Google connection, storage, sharing, and the frontend are implemented with the acceptance gaps tracked in [implementation status](docs/implementation-status.md).
