# Báo Cáo Bàn Giao Cuối Dự Án — COLT EXPRESS ONLINE (Ultimate Remaster)

## 1. Tổng quan sản phẩm
**Colt Express Online** là phiên bản board game trực tuyến nhiều người chơi (**3–6 người chơi**, hỗ trợ ghép **AI Bot `easy`/`normal`** trong phòng chờ + khán giả), kiến trúc **Authoritative Game Server**, đi kèm ứng dụng **Windows Host Server** đóng gói độc lập (`release/ColtExpressOnline-Setup.exe`).

## 2. Xác minh các tính năng & nâng cấp trọng tâm
- **Luật gốc Colt Express & Công bằng Server**: Bảo toàn 6 nhân vật (Django, Tuco, Doc, Cheyenne, Ghost — đã chuẩn hóa luật bước 0 vòng đầu, Belle), 6 hành động, 4 thẻ vòng + thẻ Ga Tàu vòng 5, toàn bộ 8 sự kiện cuối vòng, Cảnh sát trưởng, 13 đạn trung lập, **Gunslinger Bonus `+$1,000` chỉ trao khi bắn hết toàn bộ `6/6` viên đạn**, phân xử hòa và **luật ghi nhớ bài** (chỉ hiện lá vừa đánh gần nhất ở chồng bài chung, úp mặt sau nếu lá đó úp).
- **Chế độ Nhiều Người Chơi, Bot & Đồng hồ Lượt**:
  - Phòng **Invite-Only** (mã 5 ký tự, link mời `?room=CODE`, mật khẩu tùy chọn, thời lượng lượt `0/20/30/45/60s`).
  - Hỗ trợ **Host Player**, **Dedicated Server**, bảo toàn `hostControlId`, **Khán giả** ẩn bài úp/bài trên tay, xử lý rớt mạng **HOST DECIDES**, Backup/Restore SQLite và nút **Chơi lại (Rematch)** trên bảng xếp hạng Podium cuối ván.
- **Sân khấu 3D Stylized Western Diorama & Borderless Tabletop HUD (`client/src/scene3d/`, `GameArenaScreen.tsx`)**:
  - Sân khấu 3D tràn viền `100dvh` dưới bầu trời xanh sa mạc ban ngày, dãy núi đá bậc thang, xương rồng Saguaro, đầu máy hơi nước 4-4-0 và toa tàu cắt mặt ngang có **cửa sổ sau xuyên thấu**, nội thất kem/san hô, vật phẩm gộp nhóm có bộ đếm số, chế độ **Đường Hầm Tối (Tunnel)**, camera hành động góc 3/4, hiệu ứng bắn súng / nắm đấm khổng lồ / tung túi tiền / toàn bộ 8 sự kiện vòng và dự phòng tự động về 2D `TrainScene`.
  - Bố cục HUD Tabletop 6 vùng: Chồng bài lá gần nhất (`+`) ở trên trái, huy chương chân dung tròn theo dõi đạn còn lại `×6` + túi đồ ở trên giữa, thanh tiện ích thu gọn ở trên phải, banner vòng ở dưới trái, quạt thẻ bài minh họa hành động ở giữa dưới, và chồng rút bài + nút tạm dừng tròn ở dưới phải.
- **Âm thanh, Đồ họa & Responsive Đa Thiết Bị**:
  - Ảnh `.webp` nén nhẹ, **19 âm thanh CC0** (`.ogg`/`.wav` kèm bản `.mp3` cho Safari/iOS) phát qua Web Audio API (`masterGain`/`bgmGain`/`sfxGain`, mặc định 100%) và máy chủ hỗ trợ HTTP `Range` (`206`) + `gzip`.
  - Hỗ trợ **VI / EN**, toàn màn hình responsive thuần trên PC & điện thoại (nút chạm `>= 44px`, thanh chọn mục tiêu nhanh trên tàu, bảng đếm đạn Gunslinger, lật bài 3D, Podium tổng kết).
- **Đóng gói Windows Host**: Tích hợp sẵn `cloudflared.exe` và cờ WebGL/SwiftShader trong `desktop-host/electron-main.cjs`.

## 3. Cấu trúc phát hành & Tài liệu
- `release/ColtExpressOnline-Setup.exe`: Bộ cài đặt Windows NSIS x64.
- `release/README-VI.md`, `release/CHANGELOG.md`: Hướng dẫn nhanh & ghi chú phát hành.
- `documentation/`: `ART_DIRECTION.md`, `RULES_SPEC.md`, `TECH_DECISIONS.md`, `HOST_GUIDE.md`, `PLAYER_GUIDE.md`, `LAN_GUIDE.md`, `INTERNET_GUIDE.md`, `INSTALLATION.md`, `TROUBLESHOOTING.md`.
