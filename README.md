<p align="center">
  <img src="frontend/public/logo.png" alt="DriveManager" width="112" />
</p>

# DriveManager

Personal library and cloud-storage manager built with Spring Boot and React.

[Tiếng Việt](README.vi.md)

## What it does

DriveManager keeps file metadata, links, collections, tags and sharing data in PostgreSQL while external providers such as Google Drive store file content.

- Session authentication, CSRF protection and mandatory email verification through Resend.
- Hierarchical collections, tags, search, favorites, archive and trash.
- Google Drive OAuth, upload and import.
- Item sharing, contacts and optimistic concurrency control.
- Responsive React interface with background upload queue.

## Stack

- Backend: Java 21, Spring Boot 3.5, PostgreSQL 17, Flyway.
- Frontend: React 18, TypeScript, Vite 6, TanStack Query.
- Production: Docker Compose, Nginx, GHCR and GitHub Actions.

## Run locally

Requirements: Java 21, Maven, Node.js 22 and Docker.

```bash
cp .env.example .env
# Fill POSTGRES_PASSWORD, Resend settings and the storage encryption key.
docker compose up -d postgres
```

Load the values from `.env` into the backend process, then run:

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000`. Google OAuth values are optional unless Google Drive integration is used.

## Test

```bash
cd backend && mvn verify
cd frontend && npm test && npm run build
```

## Production

Production runs with Docker Compose and GitHub Actions. Deployment credentials and environment values are stored only in GitHub Secrets and on the VPS, never in the repository.

Never commit `.env`, API keys, database passwords, encryption keys or SSH private keys.

## License

[MIT](LICENSE)
