# COLT EXPRESS ONLINE — BÀN GIAO SANG GIAI ĐOẠN TIẾP THEO (`NEXT_PHASE_HANDOFF.md`)

## 1. Cấu trúc Project
```text
d:\COLT EXPRESS\
├── assets/                 # Manifest tài nguyên đồ họa/âm thanh (manifest.json)
├── client/                 # React 19 + Vite frontend (6 màn hình khung)
├── desktop-host/           # Điểm vào đóng gói Windows / Electron (main.mjs)
├── documentation/          # Toàn bộ tài liệu đặc tả, kiến trúc & bàn giao
├── game-engine/            # Core Game Engine có thẩm quyền (State Machine + 7 Managers)
├── game-rules/             # Dữ liệu luật, năng lực nhân vật & tính toán mục tiêu thuần
├── release/                # Kết quả build sản phẩm (release/client, release/server)
├── scripts/                # Script build-server, dev song song và smoke-test
├── server/                 # Node.js + Socket.IO + SQLite authoritative server
├── shared/                 # Kiểu dữ liệu, GameView, giao thức Socket.IO & mã lỗi
└── tests/                  # 8 bộ kiểm thử Vitest (87 bài test)
```

## 2. Công nghệ Đã Chọn
- **TypeScript 5.8**, **Node.js 24 (ESM)**, **Socket.IO 4.8**, **React 19**, **Vite 6**, **SQLite (`node:sqlite`)**, **Vitest 3.2**, **esbuild**.

## 3. Những File Quan Trọng
- Luật & dữ liệu: [`game-rules/src/data.ts`](../game-rules/src/data.ts), [`game-rules/src/targeting.ts`](../game-rules/src/targeting.ts), [`game-rules/src/abilities.ts`](../game-rules/src/abilities.ts)
- Engine chính: [`game-engine/src/GameEngine.ts`](../game-engine/src/GameEngine.ts), [`game-engine/src/roundManager.ts`](../game-engine/src/roundManager.ts), [`game-engine/src/actionManager.ts`](../game-engine/src/actionManager.ts), [`game-engine/src/scoringManager.ts`](../game-engine/src/scoringManager.ts), [`game-engine/src/view.ts`](../game-engine/src/view.ts)
- Server & Multiplayer: [`server/src/index.ts`](../server/src/index.ts), [`server/src/rooms/RoomManager.ts`](../server/src/rooms/RoomManager.ts), [`server/src/multiplayer/socketServer.ts`](../server/src/multiplayer/socketServer.ts), [`server/src/persistence/Database.ts`](../server/src/persistence/Database.ts)
- Client UI: [`client/src/App.tsx`](../client/src/App.tsx), [`client/src/styles.css`](../client/src/styles.css)

## 4. Các Module Đã Hoàn Thành (Phases 1–4)
- Toàn bộ tài liệu nghiên cứu luật (`RULES_SPEC.md`), định hướng mỹ thuật (`ART_DIRECTION.md`), kiến trúc (`ARCHITECTURE.md`, `GAME_STATE.md`, `TECH_DECISIONS.md`).
- Toàn bộ **Core Game Engine** (Player, Train, Card, Action, Ability, Round, Scoring, EventBus, View Redaction).
- **Authoritative Server** tích hợp Socket.IO + lưu trữ SQLite + tự động khôi phục phòng.
- **Browser Client** với 6 màn hình khung kết nối thời gian thực tới Server.
- Bộ kiểm thử tự động 87 tests + smoke test toàn trình.

## 5. Những Module Chưa Hoàn Thành (Dành cho Giai đoạn 5–10)
- Đồ họa SVG/Canvas chi tiết cho đoàn tàu 2D cắt lớp, hoạt ảnh di chuyển/bắn/đấm và hiệu ứng âm thanh Viễn Tây.
- Hệ thống Bot AI / chế độ luyện tập hoặc tự động đánh khi người chơi mất kết nối quá thời gian chờ (turn timer).
- Đóng gói hoàn chỉnh bộ cài đặt Windows `.exe` qua Electron Builder trong `desktop-host/`.

## 6. Cách Chạy Project & Lệnh Kiểm Thử
- Chạy đồng thời Server + Client ở chế độ phát triển:
  ```powershell
  npm run dev
  ```
  *(Server lắng nghe tại `http://localhost:3001`, Vite Client tại `http://localhost:5173`)*
- Kiểm tra kiểu TypeScript:
  ```powershell
  npm run typecheck
  ```
- Chạy toàn bộ 87 bài kiểm thử Vitest:
  ```powershell
  npm test
  ```
- Build bản phát hành (`release/client` & `release/server/server.mjs`):
  ```powershell
  npm run build
  ```
- Chạy kiểm thử khói (Smoke Test) toàn trình:
  ```powershell
  npm run smoke
  ```
- Chạy toàn bộ chuỗi xác minh (`typecheck` + `test` + `build` + `smoke`):
  ```powershell
  npm run verify
  ```

## 7. Lỗi Còn Tồn Tại
- Không có lỗi biên dịch, lỗi runtime hay lỗi kiểm thử.

## 8. Công Việc Cần Tiếp Tục Ở Giai Đoạn 5
- Mở rộng lớp Multiplayer (hẹn giờ lượt đi `turnTimer`, thông báo trạng thái kết nối lại chi tiết, chat nhanh trong phòng, danh sách phòng công khai) và nâng cấp giao diện bàn chơi trực quan trên `client/`.

## 9. Tóm tắt Quy tắc Đã Xác Minh & Chưa Xác Minh
- **Đã xác minh (VERIFIED)**: Số người chơi 3–6, cấu trúc 5 vòng, 10 lá hành động/nhân vật, 6 đạn cá nhân, 13 đạn trung lập, vị trí xuất phát chẵn/lẻ, toàn bộ 6 hành động, toàn bộ 6 năng lực nhân vật, 4 loại lượt, 8 sự kiện cuối vòng, tính điểm & thưởng Gunslinger `$1,000`, phá hòa bằng số đạn nhận vào.
- **Chưa xác minh (UNVERIFIED)**: Tổ hợp biểu tượng lượt in cụ thể trên từng thẻ trong 14 thẻ bối cảnh + 3 thẻ ga tàu (`patternVerified: false` trong `game-rules/src/data.ts`) và số lượng chính xác từng mệnh giá trong 18 túi tiền.
