# DriveManager Frontend

Giao diện web hiện đại cho hệ thống quản lý thư viện cá nhân DriveManager, được phát triển bằng **React 18**, **TypeScript**, **Vite**, **React Router v6**, **TanStack Query v5** và **Radix UI Primitives**.

## Tính năng chính

1. **Xác thực & Bảo mật (Auth & Security)**:
   - Cơ chế Cookie Session (`credentials: 'include'`).
   - Xoay vòng CSRF Token lưu trữ trong memory (`GET /api/v1/auth/csrf`), tự động đính kèm header trên mọi thao tác đột biến dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`).
   - Tự động làm mới CSRF khi gặp lỗi 403.
   - Đăng xuất xóa sạch Query Cache và Queue để bảo vệ dữ liệu người dùng kế tiếp (Cross-user isolation).

2. **Thư viện & Khám phá (Library Explorer)**:
   - 8 chế độ xem (views): Tất cả mục (`active`), Hộp thư đến (`inbox`), Chưa phân loại (`uncategorized`), Yêu thích (`favorites`), Mở gần đây (`recent`), Được chia sẻ (`shared`), Kho lưu trữ (`archive`), Thùng rác (`trash`).
   - Chuyển đổi linh hoạt giữa giao diện Bảng (`List`) và Lưới (`Grid`) (lưu preference vào `localStorage`).
   - Tìm kiếm với độ trễ (debounced 300ms) và đồng bộ trạng thái qua URL params.
   - Lọc theo loại định dạng (LINK, FILE, DOCUMENT, IMAGE, VIDEO, AUDIO, NOTE, ARCHIVE) và sắp xếp (Mới nhất / Chỉnh sửa).
   - Phân trang máy chủ (20, 50, 100 mục mỗi trang).

3. **Chi tiết & Xung đột phiên bản (Optimistic Locking 409)**:
   - Xem chi tiết siêu dữ liệu (MIME, dung lượng bytes, phiên bản version, thời gian tạo/chỉnh sửa).
   - Chỉnh sửa thông tin đi kèm `expectedVersion`.
   - Nếu xảy ra xung đột `409 VERSION_CONFLICT`, hệ thống giữ nguyên bản nháp đang chỉnh sửa của người dùng và hỗ trợ tải lại phiên bản mới nhất từ máy chủ để đối chiếu.

4. **Bộ sưu tập & Thẻ (Collections & Tags)**:
   - Cây thư mục đệ quy tối đa 10 cấp với khả năng tải chậm (lazy loading con).
   - Tạo bộ sưu tập gốc, tạo con, đổi tên, xóa mềm (khôi phục các mục con).
   - Quản lý gán mục vào nhiều bộ sưu tập cùng lúc.
   - Quản lý thẻ: Tạo mới, đổi tên, chọn màu nhận diện hex, xóa và gộp thẻ (`merge tags`).

5. **Kết nối lưu trữ đám mây & Hàng đợi tải lên (Storage & Upload Queue)**:
   - Quản lý kết nối tài khoản Google Drive (`connect`, `reconnect`, `disconnect`).
   - Trang xử lý chuyển tiếp OAuth callback an toàn.
   - Tải tệp lên Google Drive với kiểm tra dung lượng tối đa 50MB (`52,428,800 bytes`).
   - Hàng đợi tải lên (`UploadQueuePanel`) hoạt động nền với giới hạn tối đa 2 uploads đồng thời (concurrency bound).
   - Nhập tệp Google Drive sẵn có qua Drive File ID hoặc link chia sẻ.

6. **Chia sẻ quyền xem & Danh bạ (Sharing & Contacts)**:
   - Chia sẻ liên kết hoặc bộ sưu tập tới email người nhận với quyền `VIEW`.
   - Đối với tài khoản nhận: Hệ thống tự động ẩn các thao tác sửa/xóa/gán nhãn của chủ sở hữu.
   - Quản lý lời mời đến (Incoming: Chấp nhận, Từ chối, Rời khỏi) và lời mời đi (Outgoing: Thu hồi).
   - Danh bạ liên hệ cá nhân lưu email và biệt danh (alias).

7. **Bảng điều khiển (Dashboard)**:
   - Hiển thị dữ liệu thực từ máy chủ (Gần đây, Hộp thư đến, Lời mời chia sẻ, Trạng thái kết nối) không dùng quota/stats giả lập.

## Hướng dẫn chạy & kiểm thử

### Cài đặt thư viện
```bash
npm install
```

### Chạy môi trường phát triển (Dev Server)
```bash
npm run dev
```
Truy cập tại `http://localhost:3000`. Các yêu cầu tới `/api` được tự động proxy sang backend tại `http://localhost:8080`.

Backend phải được khởi động trước. Nếu dùng Google Drive, `GOOGLE_REDIRECT_URI` phải là `http://localhost:3000/app/connections/callback` và cùng URL phải được khai báo trong Google Cloud Console.

### Kiểm thử tự động (Vitest)
```bash
npm run test
```

### Đóng gói sản phẩm (Production Build)
```bash
npm run build
```
Kết quả được xuất ra thư mục `dist/`.
