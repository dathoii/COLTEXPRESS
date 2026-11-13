# COLT EXPRESS ONLINE — VISUAL ASSET SOURCES & COPYRIGHT LOG (`ASSET_SOURCES.md`)

Tài liệu ghi nhận toàn bộ nguồn tham khảo lịch sử công cộng phục vụ nghiên cứu mỹ thuật (Giai đoạn 6) và xác nhận bản quyền tài nguyên phát hành trong sản phẩm.

---

## 1. Chính sách Bản quyền (Zero Proprietary Assets)

- **Tuyệt đối không** sao chép, trích xuất hoặc phân phối bất kỳ hình ảnh, khung bài, minh họa nhân vật hay tài sản đồ họa độc quyền nào của **Colt Express (Ludonaute)**.
- **Tuyệt đối không** nhúng trực tiếp ảnh chụp có điều khoản **CC BY-SA** hoặc ảnh chưa xác minh bản quyền vào bản phát hành nhị phân nếu không cần thiết.
- Toàn bộ hình ảnh trong bản phát hành (nhân vật, đầu máy, toa tàu cắt lớp, lá bài, vật phẩm, biểu tượng ứng dụng Windows) đều là **tài nguyên đồ họa nguyên bản (Original Vector/Raster Art)** được đội ngũ kỹ thuật sáng tác mới dựa trên phân tích cấu trúc từ các tư liệu lịch sử dưới đây.

---

## 2. Tư liệu Tham khảo Lịch sử (Research References Only)

| Chủ đề | Tên tệp tham khảo (Wikimedia Commons) | Tác giả / Nguồn | Giấy phép gốc | Chi tiết kỹ thuật tham khảo |
|---|---|---|---|---|
| **Đầu máy hơi nước 4-4-0 (1899)** | `File:Union Pacific No. 119 02.jpg` | Farragutful | CC BY-SA 4.0 | Tỷ lệ nồi hơi, ống khói loe (diamond smokestack), cowcatcher trước mũi, thanh truyền động bánh xe 4-4-0, đai đồng thau. |
| **Toa hành khách & Caboose thế kỷ 19** | `File:Passenger Train Car for Black River and Western Railroad Train Interior.jpg` | SeichanGant | CC BY-SA 4.0 | Nội thất ván gỗ sồi, ghế băng bọc nhung, đèn dầu treo tường, cửa sổ vòm và mái nâng clerestory. |
| **Nội thất Caboose lịch sử** | `File:Alston caboose interior 1.JPG` | Michael Rivera | CC BY-SA 4.0 | Bố cục sàn gỗ, cửa hông và khung gia cố bên trong toa cuối tàu. |
| **Trang phục Cao bồi 1898–1905** | `File:Cowboy, Western United States, 1898-1905.jpg` | Detroit Publishing Co. (Library of Congress) | Public Domain (`PD-US-old`) | Mũ rộng vành Stetson, khăn bandana, áo vest/duster, bao súng và tỷ lệ trang phục miền Viễn Tây. |
| **Huy hiệu Cảnh sát trưởng** | `File:US Marshal Badge.png` | U.S. Marshals Service (U.S. Dept. of Justice) | Public Domain (U.S. Federal Gov work) | Cấu trúc sao 5/6 cánh chạm khắc và viền tròn kim loại đồng thau. |
| **Khẩu Colt 1873** | `File:Colt single action modello 1873 - 1.jpg` | Ricce | Public Domain / CC0 | Hình dáng nòng súng lục Single Action Army, ổ đạn xoay và báng gỗ. |
| **Sa mạc Đá đỏ miền Tây** | `File:Monument valley panoramic.jpg` | Gerd A.T. Müller | CC BY-SA 3.0 / GFDL | Đường chân trời sa mạc, khối núi đá sa thạch đỏ (buttes/mesas) và dải mây hoàng hôn. |
| **Đường ray sa mạc** | `File:Former track of the Death Valley Railroad 01.jpg` | Wikimedia Commons contributor | Public Domain / CC | Thanh tà vẹt gỗ đặt trên nền đá dăm sa mạc và ray thép song song. |
| **Chất liệu Túi vải & Đá quý** | `File:Burlap (8963603095).jpg`, `File:Heat-treated ruby-1.jpg` | Wikimedia Commons contributors | CC BY / Public Domain | Sợi vải bố thô màu nâu vàng và mặt cắt đa giác phản quang của hồng ngọc. |

---

## 3. Tài nguyên Nguyên bản Trong Bản Phát hành (`Original In-House Assets`)

Tất cả tài sản phát hành thuộc bản quyền dự án (Original Project Assets — 100% tự tạo, an toàn phân phối):
- **Nhân vật (7)**: `Django`, `Tuco`, `Doc`, `Cheyenne`, `Ghost`, `Belle`, `Marshal` (`client/src/components/art/CharacterSprite.tsx` + `assets/characters/*.svg`).
- **Đoàn tàu cắt lớp & Sa mạc (Locomotive + Passenger Cars + Parallax)**: `client/src/components/art/TrainScene.tsx` + `assets/train/*.svg`.
- **Bộ bài nguyên bản (Action, Character, Bullet, Round, Station, Back)**: `client/src/components/art/PlayingCard.tsx`, `RoundCardDisplay.tsx`.
- **Vật phẩm & Token (Purse, Jewel, Strongbox, Bullets, Marshal Badge)**: `client/src/components/art/LootToken.tsx`.
- **Biểu tượng Ứng dụng Windows (`Setup.exe` Icon)**: `assets/icons/colt-express.png`, `assets/icons/colt-express.ico`.

---

## 4. Nguồn Âm thanh & Nhạc nền (`client/public/audio/` — 19 tệp CC0 Public Domain)

Tất cả 19 tệp âm thanh được tải trực tiếp từ các bộ tài nguyên **CC0 1.0 Public Domain** trên OpenGameArt.org (tổng dung lượng `2,232,826` bytes / `2.13 MB`), an toàn phân phối thương mại và mã nguồn mở không ràng buộc bản quyền:

| Tệp (`client/public/audio/`) | Chức năng / Tình huống | Nguồn OpenGameArt (CC0 1.0 Public Domain) |
|---|---|---|
| `bgm-saloon.ogg` | Nhạc nền Sảnh chờ / Menu (Western Saloon Ragtime) | *Miniature Saloon* (CC0) |
| `bgm-western.ogg` | Nhạc nền Trong trận đấu (Wild West Cowboy Theme) | *Wild West Music — The Cowboys Theme* (CC0) |
| `victory.ogg` | Nhạc hiệu Chiến thắng khi kết thúc ván (`gameEnd`) | *Victory Fanfare Short* (CC0) |
| `card-shuffle.ogg` | Hiệu ứng xào bài đầu game & đầu mỗi vòng | *Playing Card Sounds* (CC0) |
| `card-deal.wav` | Hiệu ứng chia bài / rút thêm bài (`planning.cardsDrawn`) | *Playing Card Sounds* (CC0) |
| `card-play.wav` | Hiệu ứng đánh lá bài lên chồng bài (`planning.cardPlayed`) | *Playing Card Sounds* (CC0) |
| `card-flip.wav` | Hiệu ứng lật bài trung tâm khi thực thi (`execution.cardRevealed`) | *Playing Card Sounds* (CC0) |
| `move-step.ogg` | Di chuyển giữa các toa tàu (`action.moved`) | *yd-Sounds* (CC0) |
| `climb-ladder.ogg` | Leo thang / đổi tầng giữa nóc & trong toa (`action.changedFloor`) | *yd-Sounds* (CC0) |
| `shoot-revolver.ogg` | Tiếng súng ổ quay khi bắn (`action.shot`) | *25 CC0 Bang / Firework SFX (`shot_01`)* (CC0) |
| `punch-hit.ogg` | Tiếng đấm trúng đối thủ (`action.punched`) | *10 Impact / Shield Blocks (`impact.1`)* (CC0) |
| `rob-coin.ogg` | Lụm Túi tiền hoặc Hồng ngọc (`action.robbed`) | *Gold Coin #6* (CC0) |
| `rob-sack.ogg` | Lụm Hòm vàng $1.000 (`action.robbed` strongbox) | *Sack of Gold* (CC0) |
| `marshal-whistle.ogg` | Tiếng còi Cảnh sát trưởng (`action.marshalMoved` / `marshal.hit`) | *Steam Whistle* (CC0) |
| `empty-click.ogg` | Cò súng trống / Không có đối tượng hợp lệ (`execution.noEffect`) | *Gun Reload Lock / Click Sound* (CC0) |
| `turn-bell.ogg` | Chuông báo tới lượt hành động của bạn | *Correct Bell* (CC0) |
| `ui-click.wav` | Âm thanh nhấn nút điều hướng, bật/tắt ngôn ngữ & toàn màn hình | *Kenney UI SFX Set* (`51 UI Sound Effects`, CC0) |
| `ui-ready.wav` | Âm thanh xác nhận Sẵn sàng trong phòng chờ | *Kenney UI SFX Set* (`51 UI Sound Effects`, CC0) |
| `error-buzz.wav` | Âm báo lỗi thao tác / mất kết nối | *Card Game Sounds* (CC0) |
