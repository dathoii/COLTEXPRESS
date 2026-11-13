# Hướng Dẫn Cài Đặt Colt Express Online (Windows)

## 1. Yêu cầu hệ thống
- **Hệ điều hành**: Windows 10 hoặc Windows 11 (64-bit).
- **RAM**: Tối thiểu 4 GB (khuyến nghị 8 GB).
- **Dung lượng trống**: Khoảng 450 MB.
- **Không cần cài đặt Node.js, npm hay tải thêm `cloudflared`.** Bộ cài `ColtExpressOnline-Setup.exe` đã đóng gói sẵn máy chủ, giao diện web, cơ sở dữ liệu SQLite và công cụ `cloudflared.exe` để mở Quick Tunnel qua Internet ngay sau khi cài.

## 2. Cài đặt từ `ColtExpressOnline-Setup.exe`
1. Chạy tệp **`ColtExpressOnline-Setup.exe`** trong thư mục `release/`.
2. Nếu Windows Defender SmartScreen hiện cảnh báo tệp tải về chưa ký số thương mại, chọn **More info -> Run anyway** (chỉ thực hiện khi bạn tải trực tiếp từ bản phát hành chính thức của nhóm/dự án).
3. Chọn thư mục cài đặt mong muốn (mặc định trong thư mục người dùng hoặc `Program Files`).
4. Đánh dấu tạo biểu tượng trên **Desktop** và **Start Menu** nếu muốn, sau đó bấm **Install**.
5. Khi hoàn tất, đánh dấu **Run Colt Express Online Host** và bấm **Finish**.

## 3. Cho người chơi tham gia (Client)
- **Người chơi khác không cần cài đặt gì thêm.**
- Chỉ cần dùng trình duyệt web (Chrome, Edge, Firefox, Safari trên máy tính hoặc điện thoại) mở đúng đường dẫn mời do Host cung cấp.

## 4. Gỡ cài đặt & Dữ liệu lưu trữ
- Cơ sở dữ liệu ván chơi (`colt-express.db`) được lưu ở thư mục dữ liệu người dùng (`userData`, đường dẫn hiển thị tại mục **SQLite DB** trên Dashboard), tách biệt khỏi thư mục cài đặt chương trình để không mất dữ liệu khi cập nhật.
- Để gỡ cài đặt, vào **Windows Settings -> Apps -> Installed apps -> Colt Express Online Host -> Uninstall**.
