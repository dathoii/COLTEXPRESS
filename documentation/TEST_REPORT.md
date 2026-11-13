# Báo Cáo Kiểm Thử — Colt Express Online (Phase 1–10)

> Tất cả kết quả dưới đây ghi nhận trực tiếp từ lần chạy xác minh sau chỉnh sửa cuối cùng.

## 1. Tổng hợp kết quả Typecheck, Build, Tests & Smoke (`npm run verify`)
Lệnh: `npm run verify` (`tsc -p tsconfig.json --noEmit && tsc -p client/tsconfig.json --noEmit && npm run build && vitest run && npm run smoke`)

- **TypeScript Typecheck**: Pass (0 lỗi trên cả monorepo và `@colt/client`).
- **Vitest Test Suite**: **11 / 11 tệp đạt — 101 / 101 ca kiểm thử PASS (0 fail, 0 skip)** trong **13.26s**:

| Tệp kiểm thử | Số ca | Thời gian | Phạm vi kiểm tra |
| --- | ---: | ---: | --- |
| `tests/playerTrain.test.ts` | 15 | 36ms | Tạo người chơi, đoàn tàu 3–6 toa, vị trí, rơi/nhặt vật phẩm |
| `tests/abilities.test.ts` | 11 | 46ms | 6 năng lực nhân vật: Django, Tuco, Doc, Cheyenne, Ghost, Belle |
| `tests/actions.test.ts` | 16 | — | 6 hành động (`Move`, `Floor`, `Shoot`, `Punch`, `Rob`, `Marshal`), line-of-sight & Marshal |
| `tests/cards.test.ts` | 7 | — | Rút/chơi bài, vòng lặp chồng bài bỏ, thẻ đạn |
| `tests/stateMachine.test.ts` | 7 | 27ms | Chuyển pha Lobby -> Setup -> Planning -> Execution -> RoundEnd -> GameEnd |
| `tests/scoring.test.ts` | 5 | 19ms | Tiền thưởng vật phẩm, Gunslinger `+$1,000` (kể cả đồng hạng), phân xử hòa theo số đạn nhận |
| `tests/round.test.ts` | 24 | 10255ms | 4 vòng thường + Ga Tàu (8 sự kiện), mô phỏng ngẫu nhiên trọn vẹn ván 3/4/5/6 người & tính tất định theo seed |
| `tests/server.test.ts` | 2 | — | Lưu SQLite, khôi phục phòng, Socket.IO 3 người & lọc bí mật (`toView`) |
| `tests/multiplayer.test.ts` | 4 | 1347ms | Invite-only, mật khẩu, giới hạn 3–6 người (tràn sang Spectator), Dedicated Server, Spectator isolation, Disconnect/Pause/Resume/Reconnect, chống trùng sự kiện (`requestId`/`expectedVersion`), Close room, Backup/Restore |
| `tests/host.test.ts` | 4 | — | LAN IPv4 discovery, `buildInviteUrl`, `isPortReachable`, `CloudflareTunnelManager`, API điều khiển phòng từ Windows Host (`player`/`dedicated`), Backup/Restore, đóng gói `bin/cloudflared.exe` trong `electron-builder.yml` & song ngữ VI/EN Dashboard |
| `tests/assetsAndUi.test.ts` | 6 | 5347ms | Toàn bộ tài nguyên `assets/manifest.json`, 19 tệp âm thanh CC0 `client/public/audio/` (header `OggS`/`RIFF` & MIME HTTP `audio/ogg`/`audio/wav`), bảo mật `bulletsReceived` (`toView`), từ điển `client/src/i18n.ts` (`VI`/`EN`), bảng đếm đạn, hoạt ảnh xào/chia bài, toàn màn hình & click trực tiếp trên tàu, bundle sản xuất, và ván **6 người chơi qua Socket.IO** (`4621ms`, `autoResolveSingleOption: false`) |

## 2. Production Build & Smoke Server Test
- **Client Bundle (`vite build`)**:
  - `release/client/index.html`: `0.40 kB` (`gzip: 0.27 kB`)
  - `release/client/assets/index-CgoLK8QW.css`: `24.93 kB` (`gzip: 6.15 kB`)
  - `release/client/assets/index-CxZq1Oi4.js`: `348.95 kB` (`gzip: 107.83 kB`)
  - `release/client/audio/`: 19 tệp `.ogg` / `.wav` CC0 (`2,232,826` bytes / `2.13 MB`)
- **Server Bundle**: `release/server/server.mjs` (esbuild self-contained ESM, đóng gói kèm `socket.io` và MIME âm thanh).
- **Smoke Test (`npm run smoke`)**: Pass (`SMOKE TEST PASSED`).

## 3. Kiểm thử UI, Đồ họa, Bố cục & Console trong Chromium (`npx electron scripts/ui-audit.cjs`)
Chạy trực tiếp trong nhân Chromium của Electron `v45.3.1` kết nối tới server & bundle thực tế:

| Màn hình / Viewport | Tải trang | Lỗi Console | Tràn ngang | Chi tiết kiểm chứng |
| --- | ---: | ---: | ---: | --- |
| Browser Client Fullscreen (`1280x720`) | 597 ms | 0 | 0 px | Song ngữ `VI <-> EN`, Toàn màn hình 1 khung hình (`scrollHeight: 720`, `planningHeightOverflow: 0`, `executionHeightOverflow: 0`), thay thế Nhật ký bằng **Bảng Đếm Đạn Gunslinger +$1,000 & Thương tích** (`hasBulletTracker: true`, `bulletTrackerHas1000Rule: true`, `hasSelfWounds: true`, `hasOldEventLog: false`), **Hoạt ảnh Xào/Chia bài tự động** (`hasDealAnimation: true`), **Nút âm thanh & phục vụ tệp audio** (`audioToggleWorked: true`, `audioEndpointOk: true`), lật lá trung tâm (`spotlightSeen: true`) & nhấp trực tiếp trên tàu (`directTrainClickWorked: true`) |
| Browser Client Mobile (`430x844`) | 470 ms | 0 | 0 px | Hiển thị gọn trên di động, `scrollWidth: 414`, `overflowPx: 0` |
| Windows Host Dashboard (`1220x820`) | 571 ms | 0 | 0 px | Trạng thái `RUNNING`, hiển thị phòng trực tiếp qua IPC (`roomsListed: 1`), chuyển ngữ `Mở Cửa Sổ Game` <-> `Open Game Window`, nút điều khiển `Start`/`Backup`/`Tunnel` đầy đủ |

## 4. Kiểm thử Đóng gói Windows & Tệp Thực Thi
- **Unpacked Electron Host (`dist-installer/win-unpacked/Colt Express Online Host.exe --smoke`)**:
  - Exit code `0`, Node nhúng chạy sạch, `SQLite` và server HTTP/Socket.IO khởi tạo thành công.
  - Đã kiểm tra tồn tại tệp **`dist-installer/win-unpacked/resources/bin/cloudflared.exe`** (`55,397,592` bytes).
- **Windows Installer (`release/ColtExpressOnline-Setup.exe`)**:
  - Đã tạo bằng `electron-builder` v26.18.0 (`nsis` x64), dung lượng **`137,866,464` bytes (`131.48 MB`)** đã bao gồm sẵn `cloudflared.exe` và toàn bộ tài nguyên âm thanh.

## 5. Phạm vi & Giới hạn đã ghi nhận trung thực
- **Cloudflare Quick Tunnel**: Tệp `cloudflared.exe` v2026.11.0 đã được đóng gói sẵn bên trong bộ cài để tự động sẵn sàng sau khi cài đặt; đường dẫn công cộng `trycloudflare.com` thay đổi theo từng phiên bật tunnel.
- **Trình cài đặt NSIS GUI**: Đã tạo hoàn chỉnh `ColtExpressOnline-Setup.exe` và xác minh nhị phân đích (`Colt Express Online Host.exe --smoke`), chưa chạy trình cài đặt NSIS GUI ghi đè trực tiếp lên Windows của máy phát triển.
