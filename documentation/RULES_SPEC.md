# COLT EXPRESS — RULES SPECIFICATION (`RULES_SPEC.md`)

Tài liệu đặc tả luật gốc của **Colt Express** (thiết kế bởi Christophe Raimbault, phát hành bởi Ludonaute, 2014). Mọi mục đều được gắn nhãn:

- **VERIFIED**: Đã xác minh từ sách luật gốc Ludonaute / tài liệu hướng dẫn chính thức.
- **UNVERIFIED**: Chi tiết in trên từng thành phần vật lý cụ thể chưa có bản quét đối chiếu 1:1.
- **IMPLEMENTATION NOTE**: Quy ước kỹ thuật trong `game-rules` và `game-engine` để xử lý các biên (edge cases) một cách tất định.

---

## 1. Phạm vi & Số lượng người chơi

- **VERIFIED**: Trò chơi hỗ trợ **3 đến 6 người chơi** trong dự án này (có thể lấp đầy các ghế còn trống tối đa 6 chỗ bằng AI Bot `easy`/`normal` trong phòng chờ; đồng hồ giới hạn thời gian lượt tùy chọn ở mức server).
- **VERIFIED**: Không triển khai chế độ 2 người chơi ("Team Play" / biến thể 2 người bị loại bỏ theo yêu cầu).
- **VERIFIED**: Thời lượng 1 ván gồm đúng **5 vòng (Rounds)**: 4 Thẻ Bối cảnh (Round Cards) + 1 Thẻ Ga Tàu (Train Station Card) ở vòng thứ 5.

## 2. Thành phần trò chơi (Components)

- **VERIFIED**: **1 Đầu máy (Locomotive)** (chỉ số `car = 0`) + **N Toa tàu (Train Cars)** với `N = số người chơi` (`car = 1 .. N`, toa cuối cùng `car = N` là **Caboose**).
- **VERIFIED**: Mỗi toa tàu và đầu máy có 2 tầng (`floor`):
  - `inside`: Bên trong toa.
  - `roof`: Trên nóc toa.
- **VERIFIED**: **1 Cảnh sát trưởng (Marshal)** bảo vệ Đầu máy lúc bắt đầu ván.
- **VERIFIED**: **6 Nhân vật (Bandits)**, mỗi nhân vật có:
  - 1 bộ bài Hành động gồm **10 lá (Action Cards)**:
    - `move` (Di chuyển): 2 lá
    - `changeFloor` (Thay đổi tầng / Trèo): 2 lá
    - `shoot` (Bắn): 2 lá
    - `rob` (Cướp): 2 lá
    - `punch` (Đấm): 1 lá
    - `marshal` (Di chuyển Cảnh sát trưởng): 1 lá
  - **6 lá Đạn cá nhân (Bullet Cards)** đánh số từ 6 xuống 1.
- **VERIFIED**: **13 lá Đạn Trung Lập (Neutral Bullet Cards)**.
- **VERIFIED**: **Chiến lợi phẩm (Loot)**:
  - **2 Hòm châu báu (Strongboxes / Briefcases)**: Trị giá `$1,000` mỗi cái.
  - **6 Viên kim cương (Jewels / Rubies)**: Trị giá `$500` mỗi viên.
  - **18 Túi tiền (Purses)**: Mệnh giá nằm trong tập `{$250, $300, $350, $400, $450, $500}`, đặt úp mặt (chỉ người sở hữu được xem).
- **UNVERIFIED**: Số lượng chính xác từng mệnh giá trong 18 túi tiền (ngoài việc có ít nhất 6 túi `$250` cho người chơi khởi đầu) và tổ hợp biểu tượng túi tiền/kim cương in dưới sàn từng toa trong 6 mẫu toa vật lý.
- **IMPLEMENTATION NOTE**: `PURSE_VALUES` trong [`game-rules/src/data.ts`](../game-rules/src/data.ts) định nghĩa đủ 18 túi tiền (gồm 8 túi `$250` cho khởi đầu/sự kiện và phân bổ đều `$300–$500`), và `CAR_LAYOUTS` định nghĩa 6 bố cục toa tàu bảo toàn tổng số lượng vật phẩm chuẩn.

## 3. Chuẩn bị ván chơi (Setup)

- **VERIFIED**: Ghép Đầu máy (`car = 0`) và `N` toa hành khách (`car = 1 .. N`) theo số người chơi `N`.
- **VERIFIED**: Đặt **Cảnh sát trưởng** và **1 Hòm châu báu (`$1,000`)** vào bên trong Đầu máy (`car = 0, floor = 'inside'`). Hòm châu báu thứ 2 để bên ngoài tàu (dùng cho sự kiện *Take It All!*).
- **VERIFIED**: Đặt các Túi tiền (úp) và Kim cương (ngửa) vào bên trong các toa `1 .. N` theo bố cục toa.
- **VERIFIED**: Mỗi người chơi chọn 1 nhân vật duy nhất, nhận 10 lá hành động, 6 lá đạn cá nhân, và **1 Túi tiền khởi điểm trị giá `$250`** (đặt úp).
- **VERIFIED**: Rút ngẫu nhiên **4 Thẻ Bối cảnh** theo nhóm số người chơi (`2-4` dùng cho 3–4 người; `5-6` dùng cho 5–6 người) đặt chồng lên **1 Thẻ Ga Tàu** ngẫu nhiên (tổng cộng 5 vòng).
- **VERIFIED**: **Vị trí xuất phát**:
  - Người chơi thứ **1, 3, 5** (ghế lẻ theo thứ tự) đặt nhân vật **bên trong toa cuối cùng (Caboose, `car = N`)**.
  - Người chơi thứ **2, 4, 6** (ghế chẵn) đặt nhân vật **bên trong toa áp chót (`car = N - 1`)**.

## 4. Sáu Nhân vật & Năng lực đặc biệt (Characters & Abilities)

Tất cả 6 năng lực đều **VERIFIED**:

1. **Django**: Khi bắn trúng một tên cướp khác, mục tiêu bị **đẩy lùi 1 toa theo hướng viên đạn bắn tới** (giữ nguyên tầng). Nếu mục tiêu đang ở toa đầu/cuối tàu và không còn toa phía sau theo hướng bắn thì không bị đẩy rơi khỏi tàu.
2. **Tuco**: Có thể bắn xuyên qua trần/sàn tàu vào tên cướp đang ở **tầng còn lại của cùng toa tàu** mà Tuco đang đứng (ngoài các mục tiêu hợp lệ thông thường).
3. **Doc**: Đầu mỗi vòng chơi, Doc rút **7 lá bài** lên tay thay vì 6 lá.
4. **Cheyenne**: Khi đấm (Punch) một tên cướp khác và làm rơi **Túi tiền (Purse)**, Cheyenne **lấy luôn túi tiền đó** về mình thay vì để rơi xuống sàn. (Kim cương hoặc Hòm châu báu vẫn rơi xuống sàn như thường).
5. **Ghost**: Trong **lượt đầu tiên (Turn 1, Bước 1 — `turnIndex === 0 && stepsTaken === 0`)** của mỗi vòng chơi, Ghost có quyền chọn **đánh lá bài hành động úp mặt** ngay cả khi lượt đó là lượt đánh ngửa thông thường (với lượt tăng tốc `speedingUp`, chỉ lá đầu tiên ở bước 0 được úp nếu người chơi chưa đánh lá nào trong vòng).
6. **Belle**: Không thể bị chọn làm mục tiêu của hành động **Bắn (Shoot)** hoặc **Đấm (Punch)** nếu người thực hiện hành động có **ít nhất một mục tiêu hợp lệ khác**. Nếu Belle là mục tiêu hợp lệ duy nhất thì vẫn bị bắn/đấm bình thường.

## 5. Cấu trúc Vòng chơi: Thẻ Bối cảnh & Thẻ Ga Tàu

### 5.1. Các loại lượt (Turn Modifiers) — **VERIFIED**
- `normal` (Lượt thường): Đánh 1 lá ngửa mặt theo chiều kim đồng hồ bắt đầu từ First Player.
- `tunnel` (Đường hầm): Đánh 1 lá **úp mặt** theo chiều kim đồng hồ.
- `speedingUp` (Tăng tốc): Mỗi người chơi thực hiện **2 bước liên tiếp** trong lượt của mình (đánh 2 lá, hoặc rút 3 lá rồi đánh 1 lá, hoặc rút 2 lần).
- `switching` (Đổi chiều): Thứ tự người chơi trong lượt này đi **ngược chiều kim đồng hồ** bắt đầu từ First Player.

### 5.2. Sự kiện cuối vòng trên Thẻ Bối cảnh (Round Events) — **VERIFIED**
Kích hoạt ở cuối vòng sau khi giải quyết xong chồng bài hành động:
- **Angry Marshal**: Cảnh sát trưởng bắn tất cả tên cướp đang đứng trên **nóc toa của ông ta** (mỗi người nhận 1 Đạn Trung Lập), sau đó Cảnh sát trưởng di chuyển **1 toa về phía cuối tàu (Caboose)**.
- **Swivel Arm**: Tất cả tên cướp đang đứng trên **nóc của bất kỳ toa nào** đều bị cần gạt quét về **nóc toa cuối cùng (Caboose)**.
- **Braking**: Tàu phanh gấp; tất cả tên cướp đang đứng trên **nóc tàu** bị trượt **1 toa về phía Đầu máy (Locomotive)**.
- **Take It All!**: Đặt **Hòm châu báu thứ hai (`$1,000`)** vào bên trong toa mà Cảnh sát trưởng đang đứng.
- **Passengers' Rebellion**: Tất cả tên cướp đang đứng **bên trong các toa tàu (`inside`)** đều nhận **1 lá Đạn Trung Lập**.

### 5.3. Sự kiện trên Thẻ Ga Tàu (Train Station Cards — Vòng 5) — **VERIFIED**
- **Pickpocketing**: Mỗi tên cướp đang đứng **một mình** tại vị trí của mình (không có tên cướp nào khác cùng toa + cùng tầng) được nhặt **1 Túi tiền** tại vị trí đó (nếu có).
- **Marshal's Revenge**: Mỗi tên cướp đang đứng trên **nóc toa của Cảnh sát trưởng** bị mất **1 Túi tiền có giá trị thấp nhất** của mình (đặt úp xuống nóc toa đó).
- **Hostage-Taking of the Conductor**: Mỗi tên cướp đang ở **Đầu máy (`car = 0`, cả bên trong lẫn trên nóc)** nhận thêm **1 Túi tiền `$250`**.

- **UNVERIFIED**: Chuỗi biểu tượng lượt (`normal`/`tunnel`/`speedingUp`/`switching`) in cụ thể trên từng thẻ trong 14 thẻ bối cảnh và 3 thẻ ga tàu vật lý. Trong [`game-rules/src/data.ts`](../game-rules/src/data.ts), các thẻ này được gắn cờ `patternVerified: false` để dễ dàng cập nhật khi đối chiếu thẻ vật lý.

## 6. Giai đoạn 1: Lập kế hoạch (Schemin' / Planning Phase) — **VERIFIED**

1. Lật thẻ vòng hiện tại.
2. Mỗi người chơi gom bài trên tay + chồng bài rút của mình (bao gồm cả các lá Đạn đã bị bắn ở các vòng trước), xáo kỹ và rút **6 lá** (Doc rút **7 lá**).
3. Theo từng lượt (Turn) quy định trên thẻ vòng, đến lượt mỗi người chơi được chọn 1 trong 2 hành động:
   - **Đánh 1 lá Hành động (Action Card)** từ trên tay vào chồng bài chung (`actionStack`), đặt ngửa hoặc úp tùy theo loại lượt (và năng lực của Ghost). **Không được phép đánh lá Đạn (Bullet Card)**.
   - **Rút 3 lá bài (Draw 3)** từ chồng bài cá nhân lên tay.
- **IMPLEMENTATION NOTE**: Nếu một người chơi chỉ còn lá Đạn trên tay và chồng bài cá nhân đã cạn (0 lá), người đó tự động bỏ qua bước lập kế hoạch (`planning.passed`).

## 7. Giai đoạn 2: Thực hiện hành động (Stealin' / Execution Phase) — **VERIFIED**

Chồng bài chung được giải quyết lần lượt từ **lá đầu tiên được đánh ra đến lá cuối cùng** (FIFO):

### 7.1. Di chuyển (`move`) — **VERIFIED**
- Nếu đang ở **bên trong toa (`inside`)**: Di chuyển sang **1 toa liền kề** (`car - 1` hoặc `car + 1`), giữ nguyên ở tầng `inside`.
- Nếu đang ở **trên nóc (`roof`)**: Di chuyển **1, 2 hoặc 3 toa** theo một hướng (về phía Đầu máy hoặc về phía Caboose), giữ nguyên trên tầng `roof`.

### 7.2. Thay đổi tầng (`changeFloor`) — **VERIFIED**
- Di chuyển từ `inside` lên `roof` hoặc từ `roof` xuống `inside` tại **cùng toa tàu** đang đứng.

### 7.3. Cảnh sát trưởng (`marshal`) & Luật gặp Cảnh sát trưởng — **VERIFIED**
- Lá `marshal`: Di chuyển Cảnh sát trưởng sang **1 toa liền kề** (`marshalCar - 1` hoặc `marshalCar + 1`). Cảnh sát trưởng luôn ở tầng `inside`.
- **Luật đụng độ Cảnh sát trưởng**: Bất kỳ khi nào Cảnh sát trưởng và một tên cướp ở cùng 1 toa bên trong (`inside`) — dù do Cảnh sát trưởng bước vào hay tên cướp bước/trèo/bị đấm/bị đẩy vào — tên cướp đó ngay lập tức:
  1. Nhận **1 lá Đạn Trung Lập** vào chồng bài của mình.
  2. Bỏ chạy lên **nóc (`roof`) của chính toa đó**.

### 7.4. Cướp (`rob`) — **VERIFIED**
- Chọn 1 loại chiến lợi phẩm (`purse`, `jewel`, hoặc `strongbox`) đang có tại đúng vị trí (`car`, `floor`) của mình và lấy 1 món thuộc loại đó.
- Nếu là Túi tiền (`purse`), lấy ngẫu nhiên 1 túi (vì các túi đặt úp).
- Nếu vị trí hiện tại không có chiến lợi phẩm nào, lá bài không có tác dụng (`execution.noEffect`).

### 7.5. Bắn (`shoot`) & Cơ chế Đạn — **VERIFIED**
- **Mục tiêu hợp lệ**:
  - Đứng **bên trong toa (`inside`)**: Chỉ bắn được tên cướp đang ở **bên trong toa liền kề** (`car - 1` hoặc `car + 1`). Không bắn được người cùng toa bên trong.
  - Đứng **trên nóc (`roof`)**: Bắn theo **tầm nhìn thẳng (Line of Sight)** về phía trước hoặc phía sau trên nóc tàu. Theo mỗi hướng, chỉ những tên cướp đứng ở **toa gần nhất có người** mới là mục tiêu hợp lệ (những người đứng ở các toa xa hơn phía sau bị che khuất). Không bắn được người cùng toa trên nóc.
  - Ngoại lệ **Tuco**: Có thể bắn thêm mục tiêu ở tầng đối diện của cùng toa.
  - Ngoại lệ **Belle**: Áp dụng bảo vệ nếu có nhiều hơn 1 mục tiêu hợp lệ.
- **Kết quả**: Người bắn lấy **1 lá Đạn trên cùng** trong chồng đạn 6 viên của mình đưa vào chồng bài của mục tiêu. Nếu người bắn đã hết sạch 6 viên đạn hoặc không có mục tiêu hợp lệ, hành động Bắn không có tác dụng.

### 7.6. Đấm (`punch`) — **VERIFIED**
- **Mục tiêu hợp lệ**: Một tên cướp khác đang đứng **cùng vị trí (`car` và `floor`)** với người đấm (áp dụng bảo vệ của Belle nếu có nhiều người).
- **Kết quả**:
  1. Người đấm chọn **loại chiến lợi phẩm** (`purse`, `jewel`, `strongbox`) mà mục tiêu đang giữ để làm rơi 1 món xuống sàn tại vị trí hiện tại (nếu là `purse`, rút ngẫu nhiên 1 túi từ mục tiêu; nếu người đấm là **Cheyenne** và chọn `purse`, Cheyenne cướp luôn túi đó).
  2. Người đấm đẩy mục tiêu sang **1 toa liền kề** (`car - 1` hoặc `car + 1`) trên cùng tầng.

## 8. Kết thúc vòng, Tính điểm & Điều kiện chiến thắng — **VERIFIED**

- **Kết thúc vòng**:
  1. Thực thi sự kiện cuối vòng trên Thẻ Bối cảnh / Thẻ Ga Tàu.
  2. Trả toàn bộ lá bài hành động trong chồng bài chung về lại bộ bài của chủ sở hữu.
  3. Chuyển quyền **First Player** sang người chơi tiếp theo theo chiều kim đồng hồ.
- **Kết thúc ván & Tính điểm (sau vòng 5)**:
  - Cộng tổng giá trị mọi chiến lợi phẩm người chơi đang nắm giữ (`Purse + Jewel + Strongbox`).
  - **Danh hiệu Tay súng thiện xạ (Gunslinger Bonus — `$1,000`)**: Trao thêm `$1,000` cho **những người chơi đã bắn hết cả 6/6 viên đạn** (còn `0` viên trong chồng đạn cá nhân). Bắn ít hơn 6 viên sẽ không được nhận thưởng ngay cả khi bắn nhiều hơn người khác; nếu nhiều người cùng bắn hết `6/6` viên, **mỗi người đều nhận `$1,000`**.
  - **Người chiến thắng**: Người có tổng tiền cao nhất.
  - **Phá hòa (Tie-breaker)**: Nếu hòa tổng tiền, người **nhận ít lá Đạn nhất** (tính cả Đạn từ người chơi khác và Đạn Trung Lập) sẽ thắng. Nếu vẫn hòa thì đồng chiến thắng.
