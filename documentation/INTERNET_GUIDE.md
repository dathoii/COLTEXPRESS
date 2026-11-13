# Hướng Dẫn Chơi Qua Internet Miễn Phí (Cloudflare Quick Tunnel)

Khi bạn bè ở xa (khác mạng Wi-Fi / khác nhà), giải pháp truyền thống như Port Forwarding thường **không hoạt động** vì đa số nhà mạng tại Việt Nam áp dụng **CGNAT (Carrier-Grade NAT)** hoặc khóa cấu hình modem.

Ứng dụng tích hợp sẵn tùy chọn **Cloudflare Quick Tunnel (Miễn phí)** để giải quyết vấn đề này mà **không cần thuê VPS, không cần mua tên miền và không cần thẻ tín dụng**.

## 1. Cách hoạt động & Ưu điểm
- `cloudflared` tạo một đường hầm mã hóa kết nối **chiều đi (outbound HTTPS/QUIC)** từ máy Windows Host tới mạng biên Cloudflare, sau đó cấp cho bạn một tên miền tạm dạng `https://xxxx-yyyy.trycloudflare.com`.
- Nhờ đi bằng kết nối outbound, giải pháp **vượt qua CGNAT** và không cần cấu hình Port Forwarding trên router.

## 2. Cài đặt tự động kèm `ColtExpressOnline-Setup.exe`
- **Tự động 100%**: Kể từ bản cập nhật hiện tại, tệp **`cloudflared.exe`** đã được đóng gói sẵn bên trong bộ cài **`ColtExpressOnline-Setup.exe`** (`resources\bin\cloudflared.exe`).
- Ngay sau khi cài đặt và mở **Colt Express Online Host**, hệ thống tự nhận diện sẵn nhị phân và hiển thị nhãn **`cloudflared: Sẵn sàng`** (`cloudflared: Ready`). Bạn **không cần tải thủ công** hay cài đặt thêm bất kỳ công cụ dòng lệnh nào.
- *(Tùy chọn cho bản chạy từ mã nguồn)*: Nếu chạy trực tiếp từ repo, có thể đặt `cloudflared.exe` vào `bin\cloudflared.exe`, `%APPDATA%\colt-express-online\bin\cloudflared.exe`, hoặc cài qua `winget install Cloudflare.cloudflared`, rồi bấm **Kiểm tra lại**.

## 3. Bật Quick Tunnel và mời người chơi
1. Bấm **Bật Quick Tunnel** trong khung **Network Status**.
2. Chờ vài giây để Cloudflare cấp đường dẫn `https://....trycloudflare.com`.
3. Bấm **Copy Link Internet** hoặc bấm **Copy Invite** trong thẻ phòng (link lúc này có sẵn `https://....trycloudflare.com/?room=CODE`).
4. Gửi link cho bạn bè ở bất kỳ đâu mở trên trình duyệt để chơi ngay.

## 4. Các giới hạn thực tế cần biết
- **URL tạm thời**: Mỗi lần bạn tắt/mở lại Tunnel hoặc tắt ứng dụng, Cloudflare cấp một địa chỉ `trycloudflare.com` mới. Hãy copy lại link mới gửi cho bạn bè.
- **Tường lửa / Mạng công ty**: Nếu mạng trường học hoặc công ty chặn giao thức QUIC/outbound tunnel, Quick Tunnel có thể không kết nối được; hãy thử đổi sang mạng gia đình hoặc 4G/5G phát Wi-Fi.
- **Không giả lập kết nối**: Nếu máy chưa có `cloudflared.exe` hoặc mất Internet, Dashboard báo rõ trạng thái `UNAVAILABLE` hoặc `ERROR` thay vì hiển thị đường dẫn giả.
- **Lưu lượng & Độ ổn định**: Quick Tunnel miễn phí phù hợp tốt cho 1–2 phòng game bạn bè (3–6 người chơi + vài khán giả).
