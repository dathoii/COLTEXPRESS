# Hướng Dẫn Người Chơi (Player Guide)

## 1. Tham gia phòng chơi
1. Mở đường dẫn mời từ Host trên trình duyệt (dạng `http://192.168.x.x:3001/?room=XXXXX` trong LAN hoặc `https://....trycloudflare.com/?room=XXXXX` qua Internet).
2. Nếu bạn tự mở trang chủ (`/?`), chọn **Join Room by Invite Code**, nhập **Mã phòng**, **Tên nhân vật hiển thị**, **Mật khẩu** (nếu phòng có cài).
3. Đánh dấu **Join as Spectator** nếu bạn chỉ muốn xem ván đấu mà không chiếm 1 trong 3–6 ghế người chơi.
4. Trong phòng chờ (**Lobby**), bạn có thể đổi vai trò qua lại giữa Người chơi và Khán giả trước khi ván bắt đầu (nếu phòng còn chỗ).

## 2. Chọn nhân vật (6 Cao Bồi Nguyên Bản)
- **Django**: Đạn bắn của bạn đẩy mục tiêu đi 1 toa theo chiều viên đạn.
- **Tuco**: Có thể bắn xuyên trần/sàn trong cùng toa tàu với mình.
- **Doc**: Rút **7 lá** thay vì 6 lá ở đầu mỗi vòng.
- **Cheyenne**: Cướp được ngay chiếc túi tiền rơi ra khi đấm trúng đối thủ (thay vì rơi xuống sàn).
- **Ghost**: Được úp lá bài **đầu tiên** của mỗi vòng (ở lượt thường).
- **Belle**: Không thể bị bắn hoặc bị đấm nếu trong phạm vi của đối thủ vẫn còn mục tiêu hợp lệ khác.

## 3. Cách chơi ngắn gọn theo luật chuẩn Colt Express (3–6 người)
Mỗi ván có **4 vòng thường** và **1 vòng cuối tại Ga Tàu (Round 5 / Station)** với 2 giai đoạn mỗi vòng:

### Giai đoạn 1 — Planning (Lên kế hoạch)
- Theo thứ tự lượt, ở mỗi lượt bạn chọn 1 trong 2 hành động:
  - **Play Action Card**: Đánh 1 lá Hành động lên chồng bài chung. Các lá đều ngửa, trừ lượt **Tunnel (∩)** (bị úp) hoặc năng lực lượt 1 của **Ghost** (có thể bật nút đánh úp).
  - **Luật Ghi Nhớ Kịch Bản**: Không hiển thị danh sách lịch sử toàn bộ bài đã đánh trong vòng — góc trên trái **chỉ hiển thị duy nhất lá bài vừa được đánh gần nhất** (nếu lá đó đang úp thì chỉ hiện **mặt sau** lá bài). Hãy tự ghi nhớ thứ tự bài của mình và đối thủ!
  - **Draw 3 Cards**: Nếu chưa muốn/không có bài phù hợp, rút thêm 3 lá từ chồng bài của bạn.
- Lượt **Speeding Up (»)**: Người chơi đánh liên tiếp **2 lá** trong lượt đó.
- Lượt **Switching (↺)**: Thứ tự đánh bị đảo ngược chiều.

### Giai đoạn 2 — Execution (Lật lá trung tâm & Chọn trực tiếp trên đoàn tàu)
Các lá được lật hiển thị lần lượt **tại khu vực Trung Tâm** cho tất cả người chơi và khán giả cùng quan sát. Khi tới lá của bạn, hệ thống tô sáng các mục tiêu hợp lệ ngay trên đoàn tàu:
- **Di chuyển (`Move`) & Đổi tầng (`Floor`)**: Nhấp trực tiếp vào **toa tàu hoặc nóc toa phát sáng xanh** để di chuyển tới vị trí đó.
- **Điều Cảnh sát (`Marshal`)**: Nhấp trực tiếp vào **bên trong toa kề phát sáng vàng** để đẩy Cảnh sát trưởng sang đó. Mọi cao bồi đang đứng bên trong toa đó phải nhận **1 lá Đạn trung lập** và leo lên nóc toa ngay lập tức.
- **Bắn súng (`Shoot`)**: Nhấp trực tiếp vào **cao bồi đang viền sáng đỏ** trong tầm bắn hợp lệ (trong toa: toa kề; trên nóc: đường ngắm thoáng). Nếu không còn mục tiêu nào hợp lệ trong tầm, hệ thống tự thông báo **`"Không có đối tượng"`** (`"No valid target"`).
- **Đấm (`Punch`)**: Nhấp trực tiếp vào **cao bồi cùng toa & cùng tầng** đang sáng đỏ; nếu cần chọn vật phẩm rơi ra hoặc hướng đẩy toa kề, chọn vật phẩm và nhấp thẳng vào toa đích phát sáng cam trên tàu. Nếu không có ai cùng chỗ, hệ thống tự thông báo **`"Không có đối tượng"`**.
- **Lụm tiền (`Rob`)**: Nhấp trực tiếp vào **túi tiền / đá quý / hòm vàng đang phát sáng** trên sàn đúng vị trí hiện tại của bạn. Nếu trên sàn nơi bạn đứng không có vật phẩm nào, hệ thống tự thông báo **`"Không có gì để lụm"`** (`"Nothing to rob"`).

## 4. Ngôn ngữ, Toàn màn hình, Huy chương Nhân vật & Âm thanh
- **Tùy chỉnh ngôn ngữ (Tiếng Việt / Tiếng Anh)**: Bấm nút **`VI | EN`** trên thanh trên cùng (hoặc chọn trong **Cài đặt**) để chuyển đổi toàn bộ giao diện, thẻ bài, năng lực và hướng dẫn.
- **Giao diện Toàn màn hình Borderless Tabletop (1 khung hình)**: Bấm nút toàn màn hình (**`⛶`**) để mở sân khấu đoàn tàu 3D tràn viền:
  - **Góc trên trái**: Chồng bài chung chỉ hiện lá đánh gần nhất (mặt sau nếu úp) kèm nút **`+`** mở bảng thông tin vòng & danh sách cao bồi.
  - **Góc trên giữa**: Huy chương chân dung tròn từng cao bồi hiển thị số đạn còn lại (`×6`, bắn hết `6/6` chuyển huy hiệu `🎯+$1K`), số túi đồ và tổng `$` cá nhân bí mật, kèm số thương tích bạn đang gánh.
  - **Góc dưới trái / giữa / phải**: Tên vòng & trạng thái lượt (chạm để xem chi tiết vòng/sự kiện), quạt lá bài trên tay, chồng rút 3 lá và nút tròn **`⏸`** mở menu ván đấu.
- **Hiệu ứng Xào & Chia bài tự động**: Đầu ván và đầu mỗi vòng mới, hệ thống tự động chạy hoạt ảnh xào/chia bài và phát âm thanh chia bài — hoàn toàn tự động, người chơi không cần thao tác phụ.
- **Âm thanh & Nhạc nền**: Nút **Âm thanh** (`🔊`) trên thanh trên cùng giúp tắt/bật nhanh toàn bộ âm thanh; vào **Cài đặt (`Settings`)** để bật/tắt riêng nhạc nền (BGM), hiệu ứng (SFX) và kéo thanh âm lượng.

## 5. Kết thúc ván & Tính điểm
- Cuối vòng 5 (Ga Tàu), kích hoạt sự kiện Ga Tàu rồi cộng tổng tiền cướp được.
- **Gunslinger Bonus (+$1,000)**: Chỉ những người chơi **bắn hết cả 6/6 viên đạn** (còn `0` viên) mới được thưởng thêm `$1,000` (nếu nhiều người cùng bắn hết `6/6` viên thì mỗi người đều nhận đủ `$1,000`).
- **Phân xử hòa tổng tiền**: Người nhận ít đạn nhất sẽ xếp trên.
