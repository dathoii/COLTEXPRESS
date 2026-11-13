# Khắc Phục Sự Cố Thường Gặp (Troubleshooting)

## 1. Người chơi trong mạng LAN không mở được link của Host
- **Kiểm tra địa chỉ IP**: Không gửi link `127.0.0.1` cho máy khác. Hãy dùng IP Wi-Fi/Ethernet (thường là `192.168.x.x`) trong mục **Mạng LAN**.
- **Windows Firewall chặn cổng `3001`**:
  1. Mở **Windows Security -> Firewall & network protection -> Allow an app through firewall**.
  2. Tìm **Colt Express Online Host** và tick cột **Private** (và **Public** nếu dùng hotspot).
  3. Hoặc mở Rule cổng TCP đến (Inbound Rule) cho cổng `3001`.
- **Wi-Fi ở chế độ Guest / AP Isolation**: Một số Wi-Fi quán cà phê hoặc ký túc xá bật cô lập máy khách (*AP Isolation*) khiến các máy không nhìn thấy nhau. Hãy thử chuyển sang mạng gia đình hoặc dùng **Cloudflare Quick Tunnel**.

## 2. Lỗi Port `3001` đã có ứng dụng khác sử dụng (`EADDRINUSE`)
- Trên thanh tiêu đề Dashboard, nhập số cổng khác (ví dụ `3002` hoặc `3005`) vào ô **Port**, rồi bấm **Start Server** hoặc **Restart Server**.

## 3. Không bật được Cloudflare Quick Tunnel
- **Báo `cloudflared: Chưa cài`**: Tải hoặc cài `cloudflared.exe` theo `documentation/INTERNET_GUIDE.md`, sau đó bấm **Kiểm tra lại**.
- **Tunnel bị kẹt ở `STARTING` hoặc `ERROR`**: Kiểm tra kết nối Internet máy Host, tắt tạm VPN công ty (nếu đang bật VPN chặn QUIC) và thử bấm **Tắt Tunnel** -> **Bật Quick Tunnel** lại.

## 4. Trình duyệt báo mất kết nối hoặc bị đơ giữa lượt
- Kiểm tra thanh trạng thái phía trên trong game (hiện `Server Connected` màu xanh).
- Nhấn **F5 / Tải lại trang**: client tự lưu session token trong `localStorage` để khôi phục đúng vị trí ghế và bài hiện tại.
- Nhờ **Host** kiểm tra xem phòng có đang ở trạng thái **PAUSED** không (nếu có, Host bấm **Resume**).

## 5. Không thể bấm Start Match dù đã có người trong phòng
- Kiểm tra 3 điều kiện bắt buộc:
  1. Số lượng **Người chơi** phải đạt từ **3 đến 6** (Khán giả không được tính vào số người chơi).
  2. Tất cả người chơi đã chọn **nhân vật khác nhau**.
  3. Tất cả người chơi đều đã bấm **Ready**.

## 6. Mất quyền điều khiển Host Player sau khi lỡ đóng cửa sổ chơi game
- Trên ứng dụng **Colt Express Online Host**, phòng vẫn còn nguyên và chạy ngầm. Bạn vẫn điều khiển được Start / Pause / Resume / Backup trực tiếp từ Dashboard. Nếu muốn xem lại màn hình trận đấu, bấm **Mở Cửa Sổ Game** hoặc **Xem Khán Giả**.
