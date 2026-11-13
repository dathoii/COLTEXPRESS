# Hướng Dẫn Chơi Qua Mạng LAN (Wi-Fi / Dây Mạng Nội Bộ)

Chơi qua LAN cho độ trễ cực thấp (thường 1–10 ms), không cần tài khoản hay dịch vụ Internet bên ngoài.

## Bước 1 — Kết nối cùng mạng
- Đảm bảo máy **Host** và tất cả máy/điện thoại **Người chơi** cùng kết nối vào một router/Wi-Fi nội bộ (hoặc phát Wi-Fi Hotspot từ một điện thoại/laptop cho cả nhóm cùng bắt).

## Bước 2 — Chạy Windows Host & Mở tường lửa Windows (lần đầu)
1. Mở ứng dụng **Colt Express Online Host** trên máy Windows làm Host.
2. Ở lần chạy đầu tiên, hộp thoại **Windows Defender Firewall** có thể xuất hiện:
   - Đánh dấu cả **Private networks** (nên bật tại Wi-Fi nhà/văn phòng tin cậy) và bấm **Allow access**.
   - Nếu lỡ bấm Cancel trước đó, xem mục **Xử lý Firewall** trong `TROUBLESHOOTING.md`.

## Bước 3 — Lấy link LAN & Mời bạn bè
1. Nhìn vào mục **Network Status -> Mạng LAN** trên Dashboard, ứng dụng tự liệt kê địa chỉ IPv4 nội bộ (ví dụ `http://192.168.1.25:3001`).
2. Bấm **Create Room**, chọn phòng vừa tạo rồi bấm **Copy Invite** cạnh địa chỉ IP LAN (ví dụ `http://192.168.1.25:3001/?room=AB12C`).
3. Gửi link đó qua Zalo/Messenger/Discord trong nhóm. Mọi người mở link trên trình duyệt là vào thẳng màn hình tham gia phòng đã điền sẵn mã phòng.

## Lưu ý nếu máy Host có nhiều card mạng ảo
- Nếu máy Host cài VPN, VMware, VirtualBox hoặc WSL, mục LAN có thể hiện nhiều IP (như `172.x.x.x` hoặc `10.x.x.x`). Hãy chọn đúng địa chỉ thuộc **Wi-Fi** hoặc **Ethernet** (thường dạng `192.168.x.x`).
- Không dùng địa chỉ `127.0.0.1` để gửi cho máy khác vì `127.0.0.1` chỉ truy cập được trên chính máy Host.
