# COLT EXPRESS ONLINE — TECHNICAL DECISIONS (`TECH_DECISIONS.md`)

Tài liệu ghi lại các quyết định công nghệ chính cho dự án **Colt Express Online**.

---

## 1. Ngăn xếp Công nghệ Đã Chọn (Selected Tech Stack)

| Hạng mục | Lựa chọn | Lý do kỹ thuật |
|---|---|---|
| **Ngôn ngữ** | **TypeScript 5.8 (Strict mode + `noUncheckedIndexedAccess`)** | Chia sẻ 100% kiểu dữ liệu giữa `shared`, `game-rules`, `game-engine`, `server` và `client`; phát hiện lỗi chỉ số mảng/null ngay lúc biên dịch. |
| **Runtime** | **Node.js 24 LTS (ESM)** | Hỗ trợ sẵn `structuredClone`, `node:sqlite`, `process.loadEnvFile` mà không cần thư viện ngoài nặng nề. |
| **Cơ sở dữ liệu** | **SQLite qua `node:sqlite` (`DatabaseSync`)** | Tích hợp trực tiếp trong nhân Node.js 22.5+/24, **không cần biên dịch C++ (`node-gyp`)** trên Windows, hỗ trợ chế độ WAL nhanh và an toàn cho lưu trữ phòng chơi (`rooms`) và lịch sử ván (`game_results`). |
| **Thời gian thực** | **Socket.IO 4.8** | Hỗ trợ acknowledgement có kiểu dữ liệu (`ClientToServerEvents` / `ServerToClientEvents`), tự động kết nối lại, phân phòng (`socket.join(roomCode)`). |
| **Giao diện Web** | **React 19 + Vite 6** | Khởi tạo nhanh, HMR tức thời, bundle gọn nhẹ (`release/client`). |
| **Đóng gói Server** | **esbuild** | Đóng gói toàn bộ `server` + `game-engine` + `game-rules` + `shared` thành một file duy nhất `release/server/server.mjs` trong chưa đầy 200ms. |
| **Kiểm thử** | **Vitest 3.2** | Tương thích gốc với TypeScript ESM và monorepo workspaces, tốc độ chạy 87 bài kiểm thử (bao gồm 60 ván mô phỏng đầy đủ) dưới 9 giây. |
| **Windows Host** | **Desktop Host (`desktop-host/main.mjs`)** | Tách biệt lớp khởi chạy máy chủ cục bộ + giao diện đóng gói để nhúng trực tiếp vào Electron ở giai đoạn đóng gói bản phát hành. |

---

## 2. Quyết định Thiết kế Kỹ thuật Trọng tâm

1. **Tách rời hoàn toàn `game-rules` và `game-engine` khỏi I/O và UI**:
   - `game-rules` chỉ chứa dữ liệu luật và hàm thuần (pure functions).
   - `game-engine` chỉ nhận `GameState` + tham số lệnh và biến đổi trạng thái một cách tất định. Không có `setTimeout`, không gọi mạng hay cơ sở dữ liệu.
2. **PRNG Tất định (`mulberry32`) nằm trong `GameState`**:
   - Mọi thao tác xáo bài (`shuffle`) và bốc túi tiền ngẫu nhiên đều đi qua [`rng.ts`](../game-engine/src/rng.ts) với `state.rngState`. Cùng một hạt giống (`seed`) và cùng chuỗi lệnh đầu vào sẽ luôn tạo ra kết quả ván chơi giống hệt nhau 100% (đã kiểm chứng bằng unit test).
3. **Giải quyết hành động tại thời điểm lật bài (Late/Resolution-Time Binding)**:
   - Theo đúng luật Colt Express, khi đánh lá bài ở pha Planning, người chơi **chưa** chọn hướng di chuyển hay mục tiêu bắn/đấm. Chỉ khi lá bài được lật ở pha Execution, `ActionManager.getActionOptions` mới tính toán các lựa chọn hợp lệ dựa trên vị trí thực tế lúc đó.
4. **Tự động giải quyết khi chỉ có 0 hoặc 1 lựa chọn (`autoResolveSingleOption`)**:
   - Nếu một lá bài lật ra không có lựa chọn hợp lệ nào (ví dụ `rob` ở toa trống, `shoot` khi không có mục tiêu), Engine ghi nhận `execution.noEffect` và chuyển ngay sang lá tiếp theo.
   - Nếu chỉ có duy nhất 1 lựa chọn hợp lệ (ví dụ `changeFloor` luôn chỉ đổi giữa `inside` và `roof` cùng toa, hoặc `marshal` khi Cảnh sát trưởng đang ở Đầu máy chỉ có thể sang toa 1), Engine tự động thực thi để nhịp độ trận đấu trực tuyến mượt mà, không bắt người chơi bấm xác nhận thừa. (Có thể tắt qua `EngineOptions` khi cần).


---

## 3. Quyết định Kiến trúc Bổ sung (Colt Express Remaster)

- **Three.js + Code Splitting (`vite.config.ts`)**: Tách riêng `three` vào chunk `three-vendor` và tải lười `TrainScene3D.tsx` qua `React.lazy` + `StageErrorBoundary`, giữ bundle khởi đầu dưới `650 KB` và tự động lùi về 2D `TrainScene` nếu không có WebGL.
- **Web Audio API & Tương thích iOS/Safari (`soundManager.ts`, `server/src/index.ts`)**: Dùng `AudioContext` tách `masterGain` / `bgmGain` / `sfxGain`, tạo thêm bản `.mp3` song song `.ogg`/`.wav`, và hỗ trợ HTTP `Range` (`206 Partial Content`) + nén `gzip` trên máy chủ tĩnh.
- **AI Bots & Đồng hồ Lượt (`BotController.ts`, `RoomManager.ts`)**: Hỗ trợ bot `easy`/`normal` trong phòng chờ 3–6 chỗ, giới hạn thời gian lượt (`turnTimeoutSec`), cơ chế `game:rematch` giữ nguyên phòng và lưu giữ `hostControlId` khi chuyển vai/khôi phục phiên.
- **Giao diện Responsive Thuần & Electron WebGL (`electron-main.cjs`)**: Loại bỏ cơ chế xoay CSS 90° gây nghịch trục cuộn trên điện thoại; dùng bố cục responsive + vùng chạm `>= 44px`; bổ sung cờ `enable-unsafe-swiftshader` / `ignore-gpu-blocklist` trong Electron.
