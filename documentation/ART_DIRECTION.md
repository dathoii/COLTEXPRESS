# COLT EXPRESS ONLINE — ART DIRECTION (`ART_DIRECTION.md`)

Tài liệu định hướng mỹ thuật cho **Colt Express Online**, tổng hợp từ tư liệu lịch sử công cộng (Wikimedia Commons, bảo tàng đường sắt Union Pacific, Unsplash/Pexels/Pixabay) và phân tích hình học của trò chơi bàn (board game) gốc. **Không sao chép bất kỳ tài sản độc quyền nào của Ludonaute.**

---

## 1. Phong cách tổng thể (Visual Style)

- **Bối cảnh**: Đoàn tàu tốc hành **Union Pacific Express — Ngày 11 tháng 7 năm 1899** băng qua vùng hoang mạc đá đỏ miền Tây Hoa Kỳ.
- **Phong cách hội họa**: **Stylized Western Comic / Illustrated Board Game** — đường viền mực đậm (inked outlines `2px–3px`), mảng màu phẳng kết hợp đổ bóng cel-shading ấm, bề mặt có hạt giấy da (parchment grain) và gỗ thông cũ.
- **Bảng màu chủ đạo (Palette)**:
  - Nền tối / Gỗ cháy: `#1E1610`, `#2B2017`, `#38291D`
  - Đồng thau & Vàng Viễn Tây (Brass / Gold): `#E0A94F`, `#B8843B`
  - Giấy da cừu (Parchment): `#F3E7D3`, `#B9A489`
  - Đỏ cảnh báo / Thuốc súng: `#C94A38`
  - Xanh lục két sắt / Đô-la: `#58A55C`

---

## 2. Phân tích hình học, tỷ lệ, chất liệu & chi tiết nhận diện

### 2.1. Đầu máy hơi nước (4-4-0 American Steam Locomotive — Thế kỷ 19)
- **Hình dáng & Cấu trúc**: Ống khói loe hình phễu (diamond smokestack), nồi hơi hình trụ nằm ngang, lưới chắn bò (cowcatcher) nhọn phía mũi, buồng lái (cab) bằng gỗ ở đuôi đầu máy.
- **Tỷ lệ**: Dài gấp `1.15x` một toa hành khách; chiều cao tính cả ống khói bằng `1.2x` chiều cao toa.
- **Chất liệu & Màu sắc**: Thép đen mờ (`#232629`), đai đồng thau sáng (`#D89B3C`), bánh truyền động sơn đỏ son (`#A62B2B`).

### 2.2. Toa tàu lịch sử, Nội thất & Mái tàu (19th-Century Wooden Passenger Coach & Caboose)
- **Cấu trúc cắt lớp (Cutaway Cross-Section)**: Mặt bên phía người xem được cắt mở để nhìn rõ cả **Tầng trong (`inside`)** và **Mái tàu (`roof`)** cùng lúc.
- **Tỷ lệ toa**: Khung chữ nhật tỷ lệ `16:9` (ngang : cao), bên dưới có 2 cụm bánh xe (bogies), giữa các toa có bệ nối bằng sắt.
- **Mái tàu (`roof`)**: Dạng vòm clerestory (phần giữa nhô cao có ô thông gió nhỏ), bề mặt ván gỗ ghép dọc chống trượt để đặt các quân nhân vật và chiến lợi phẩm rơi.
- **Nội thất (`inside`)**: Ghế băng bọc nhung đỏ/xanh lá, đèn dầu treo tường, sàn gỗ sồi in vị trí đặt Túi tiền/Kim cương.

### 2.3. Sáu Nhân vật Cao bồi & Cảnh sát trưởng (Characters)
Mỗi nhân vật được phân biệt ngay lập tức bằng **màu chủ đạo + phom dáng (silhouette) + phụ kiện đặc trưng**:
1. **Django** (Đen / Xám than `#3A3D45`): Áo choàng duster dài, mũ rộng vành phẳng, khẩu súng săn/lục ổ quay cỡ lớn.
2. **Tuco** (Đỏ cam `#D64527`): Thân hình vạm vỡ, mũ sombrero Mexico rộng vành, dây đạn đeo chéo ngực (bandolier).
3. **Doc** (Xanh lam `#2E6EA6`): Vest lịch lãm kiểu quý ông miền Tây, mũ chóp thấp (bowler/gambler hat), kính gọng tròn.
4. **Cheyenne** (Xanh lục `#3E8E5A`): Trang phục da thuộc có tua rua, lông vũ cài tóc, dáng đứng linh hoạt.
5. **Ghost** (Trắng ngà / Xám bạc `#D8DCE3`): Khăn bandana che kín nửa mặt, áo poncho sáng màu, dáng ẩn hiện.
6. **Belle** (Tím hồng / Đỏ rượu `#A83868`): Đầm saloon cách điệu có lông vũ, mũ nhỏ lệch bên, quạt/khẩu derringer.
7. **Marshal (Cảnh sát trưởng)** (Vàng sao đồng `#E5B842` + Áo khoác xanh navy `#1F2D42`): Ngôi sao Cảnh sát trưởng 6 cánh trước ngực, ria mép lớn, mũ Stetson trắng.

### 2.4. Lá bài (Action Cards, Bullet Cards, Round & Station Cards)
- **Lá Hành động (`ActionCard`)**: Tỷ lệ `2.5 : 3.5` (bo góc `8px`), viền màu theo nhân vật sở hữu, trung tâm là biểu tượng hành động rõ nét (Bàn chân = `move`, Thang = `changeFloor`, Nắm đấm = `punch`, Túi tiền = `rob`, Khẩu súng = `shoot`, Ngôi sao = `marshal`).
- **Lá Đạn (`BulletCard`)**: Nền giấy cháy xém, hiển thị số viên đạn còn lại (`6 → 1`) và vết thủng lỗ đạn; Đạn Trung Lập màu xám chì in hình ngôi sao Cảnh sát trưởng.
- **Thẻ Bối cảnh / Ga Tàu (`RoundCard`)**: Dạng ngang (landscape `3.5 : 2.2`), dải ô biểu tượng lượt (`normal`, `tunnel` hình cổng hầm tối, `speedingUp` hình mũi tên kép, `switching` hình mũi tên đảo chiều) và góc phải hiển thị minh họa sự kiện cuối vòng.

### 2.5. Vật phẩm Chiến lợi phẩm (Loot Tokens)
- **Túi tiền (`purse`)**: Túi vải bố buộc dây thừng màu nâu vàng (`#C69C6D`), mặt lưng chỉ in dấu `$` (ẩn mệnh giá), mặt trước in con số `$250–$500`.
- **Kim cương (`jewel`)**: Viên hồng ngọc / kim cương cắt giác đỏ tươi (`#E03B50`), lấp lánh, luôn hiển thị `$500`.
- **Hòm châu báu (`strongbox`)**: Két sắt/vali thép tán đinh màu xanh đậm viền đồng (`#375A47`), khóa đồng lớn, in rõ `$1,000`.

### 2.6. Môi trường Sa mạc & Đường ray (Environment)
- Nền parallax 3 lớp: Bầu trời hoàng hôn vàng cam → Núi đá đỏ (buttes/mesas kiểu Monument Valley) + xương rồng saguaro → Đường ray tà vẹt gỗ và bụi cát bay theo chiều tàu chạy.

---

## 3. Danh mục tài nguyên cần xây dựng ở các giai đoạn tiếp theo (Asset Inventory)

Được khai báo khung tại [`assets/manifest.json`](../assets/manifest.json):
- **Sprites / SVG Nhân vật (7)**: `django`, `tuco`, `doc`, `cheyenne`, `ghost`, `belle`, `marshal` (idle + hit + action).
- **Sprites Toa tàu (7)**: `locomotive` + 6 mẫu toa hành khách (`car-a` .. `car-f`), mỗi toa tách lớp `roof` và `inside`.
- **Biểu tượng Lá bài (8)**: 6 hành động + `bullet` + `neutralBullet` + mặt lưng bài (card back).
- **Biểu tượng Lượt & Sự kiện Vòng (12)**: 4 loại lượt + 8 sự kiện cuối vòng.
- **Icon Chiến lợi phẩm (3)**: `purse` (úp & ngửa), `jewel`, `strongbox`.


---

## 4. Phiên bản Nâng Cấp Toàn Diện — Stylized 3D Western Diorama & Borderless Tabletop HUD (Remaster)

Bản Remaster nâng cấp sân khấu trò chơi từ 2D phẳng lên **Stylized 3D Western Diorama** dựng bằng Three.js (`client/src/scene3d/`) kết hợp giao diện **Borderless Tabletop HUD** mở tràn toàn màn hình (không sidebar rườm rà), giữ nguyên khả năng tương thích trên mọi trình duyệt và tự động chuyển dự phòng sang 2D `TrainScene` khi thiết bị mất ngữ cảnh WebGL:
- **Đoàn tàu 3D (`TrainBuilder.ts`)**: Đầu máy hơi nước 4-4-0 với ống khói, đèn pha chiếu hầm, bánh nan hoa và thanh truyền động quay đồng bộ tốc độ; các toa cắt mặt ngang với **khung cửa sổ sau xuyên thấu ra bầu trời và dãy núi đá sa mạc**, giấy dán tường sọc kem, ghế bành san hô, bàn tròn, đèn dầu và chồng vật phẩm gộp nhóm kèm bộ đếm comic (`2`, `3`).
- **Nhân vật & Cảnh sát trưởng 3D (`CharacterBuilder.ts`)**: Tạo hình riêng cho Django, Tuco, Doc, Cheyenne, Ghost, Belle và Cảnh sát trưởng với tỷ lệ hoạt hình nổi bật cùng hoạt ảnh di chuyển, leo thang/nhảy vòm, gồng nắm đấm, rút súng nhảy bật không trung và hào quang `!` khi đụng độ Cảnh sát trưởng.
- **Môi trường & Hầm tối (`EnvironmentBuilder.ts`)**: Bầu trời sa mạc ban ngày xanh dịu sáng sủa, cát vàng, dãy núi đá bậc thang Monument Valley và xương rồng Saguaro cuộn parallax mượt theo tốc độ lượt (`normal`, `speedingUp`, `station`), chuyển ánh sáng sang chế độ **Hầm tối (Tunnel)** bật đèn pha + đèn dầu toa tàu.
- **VFX & Camera (`VfxSystem.ts`, `CameraRig.ts`)**: Khói hơi nước đầu máy, tia đạn bay từ nòng súng tới mục tiêu trước khi đẩy lùi, nắm đấm khổng lồ, túi tiền bay vòng cung, hiệu ứng toàn bộ 8 sự kiện cuối vòng và góc máy 3/4 đóng khung trọn vẹn đoàn tàu thu phóng mượt theo hành động.
- **Borderless Tabletop HUD & Thẻ bài minh họa (`GameArenaScreen.tsx`, `PlayingCard.tsx`)**: Góc trên trái chỉ hiển thị **duy nhất lá bài đánh gần nhất** (ẩn mặt sau khi bài úp, giữ luật ghi nhớ kịch bản); góc trên giữa là huy chương chân dung tròn hiển thị đạn còn lại (`×6` → `6/6 🎯+$1K`), túi tiền và tiền cá nhân bí mật; góc dưới trái hiện banner vòng + nút bật modal chi tiết bàn; giữa dưới là quạt bài minh họa hành động có icon góc; góc dưới phải là chồng rút bài + nút tạm dừng/cài đặt.
- **Tài nguyên tối ưu (`scripts/optimize-media.mjs`)**: Ảnh chân dung và nền nén `.webp` gọn nhẹ kết hợp bảng tổng kết **Podium** kèm nút **Rematch**.
