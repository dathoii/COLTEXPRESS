# Hướng Dẫn Làm Host (Colt Express Online — Windows Host)

Ứng dụng **Colt Express Online Host** vừa làm máy chủ trung tâm (Authoritative Server), vừa phục vụ giao diện web cho tất cả người chơi qua LAN hoặc Internet.

## 1. Khởi động, Ngôn ngữ & Điều khiển Server
Khi mở ứng dụng, máy chủ tự động khởi động trên cổng mặc định **3001** và tự động nhận diện tệp `cloudflared.exe` được cài sẵn cùng bộ cài.
- **Tùy chỉnh ngôn ngữ (VI / EN)**: Nhấn nút **`🇻🇳 VI | EN`** ở góc trên bên phải Dashboard để chuyển đổi ngay toàn bộ giao diện quản trị giữa **Tiếng Việt** và **Tiếng Anh**.
- **Start Server / Stop Server / Restart Server**: Bật, tắt hoặc khởi động lại máy chủ (có thể đổi số cổng ở ô `Port` rồi bấm **Restart Server**).
- **Server Status**: Theo dõi trạng thái `RUNNING/STOPPED`, địa chỉ lắng nghe, thời gian hoạt động, số ván đã kết thúc và đường dẫn `colt-express.db`.

## 2. Hai chế độ Host
1. **Host Player** *(Khuyên dùng khi bạn muốn chơi cùng bạn bè)*:
   - Chọn `Host Player`, nhập tên người chơi và tên phòng (có thể đặt thêm mật khẩu).
   - Bấm **Create Room**. Hệ thống tự mở cửa sổ chơi game và đưa bạn vào sẵn phòng chờ với tư cách Host.
2. **Dedicated Server** *(Khuyên dùng khi bạn chỉ điều hành giải/ván đấu)*:
   - Chọn `Dedicated Server`, nhập tên phòng (không chiếm vị trí người chơi trong 3–6 chỗ).
   - Bạn điều khiển **Start Match**, **Pause**, **Resume**, **Close Room** trực tiếp từ Dashboard hoặc mở cửa sổ **Xem Khán Giả**.

## 3. Mời người chơi & Khán giả (Invite-Only)
- Game **không mở sảnh công khai cho người lạ**. Người chơi chỉ vào được khi có:
  - **Mã phòng 5 ký tự** (ví dụ `AB12C`) hoặc **Link mời** (`http://<IP-hoặc-Tunnel>:3001/?room=AB12C`).
  - **Mật khẩu phòng** (nếu Host có đặt).
- **Số lượng người chơi**: Bắt buộc **3 đến 6 người chơi** (không hỗ trợ 2 người).
- Người vào sau khi đủ 6 chỗ hoặc chọn **Join as Spectator** sẽ làm **Khán giả**: xem được đoàn tàu, hành động đã lật và bảng điểm, nhưng hoàn toàn không xem được bài trên tay/thẻ úp và không thể thao tác gameplay.

## 4. Mất kết nối & Tạm dừng (HOST DECIDES)
- Khi một người chơi rớt mạng giữa trận, trạng thái của người đó đổi sang biểu tượng mất kết nối đỏ trên bảng điều khiển.
- Luật gốc được giữ nguyên (máy chủ không tự chơi thay người). Host tự quyết định bấm **Pause** để chờ người chơi quay lại hoặc **Resume** để tiếp tục.
- Khi người chơi mở lại trình duyệt (hoặc tải lại trang), phiên chơi tự động khôi phục đúng trạng thái hiện tại của họ.

## 5. Sao lưu & Khôi phục (Backup / Restore)
- Bấm **Backup Dữ Liệu** để lưu toàn bộ phòng đang hoạt động, người chơi, khán giả, bài và lịch sử vào một tệp `.json`.
- Nếu cần chuyển máy hoặc khôi phục sau sự cố, bấm **Restore Bản Lưu** và chọn tệp `.json` đã sao lưu.
