<p align="center">
  <img src="frontend/public/logo.png" alt="DriveManager" width="112" />
</p>

# DriveManager

Ứng dụng quản lý thư viện cá nhân và lưu trữ đám mây, xây dựng bằng Spring Boot và React.

[English](README.md)

## Dự án làm gì?

DriveManager lưu metadata, liên kết, bộ sưu tập, thẻ và thông tin chia sẻ trong PostgreSQL; nội dung tệp được lưu tại nhà cung cấp bên ngoài như Google Drive.

- Đăng nhập bằng session, bảo vệ CSRF và bắt buộc xác minh email qua Resend.
- Bộ sưu tập phân cấp, thẻ, tìm kiếm, yêu thích, lưu trữ và thùng rác.
- Kết nối Google Drive qua OAuth, upload và import tệp.
- Chia sẻ mục, danh bạ và kiểm soát xung đột phiên bản.
- Giao diện React responsive với hàng đợi upload nền.

## Công nghệ

- Backend: Java 21, Spring Boot 3.5, PostgreSQL 17, Flyway.
- Frontend: React 18, TypeScript, Vite 6, TanStack Query.
- Production: Docker Compose, Nginx, GHCR và GitHub Actions.

## Chạy local

Yêu cầu: Java 21, Maven, Node.js 22 và Docker.

```bash
cp .env.example .env
# Điền POSTGRES_PASSWORD, cấu hình Resend và khóa mã hóa storage.
docker compose up -d postgres
```

Nạp các biến trong `.env` vào tiến trình backend, sau đó chạy:

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Mở terminal khác:

```bash
cd frontend
npm ci
npm run dev
```

Truy cập `http://localhost:3000`. Các biến Google OAuth có thể để trống nếu chưa dùng Google Drive.

## Kiểm thử

```bash
cd backend && mvn verify
cd frontend && npm test && npm run build
```

## Production

Production chạy bằng Docker Compose và GitHub Actions. Thông tin truy cập và biến môi trường chỉ được lưu trong GitHub Secrets và trên VPS, không đưa vào repository.

Không commit `.env`, API key, mật khẩu database, khóa mã hóa hoặc SSH private key.

## Giấy phép

[MIT](LICENSE)
