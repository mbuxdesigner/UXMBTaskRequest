# 🗺️ TÍNH NĂNG 10: IA MAP & SƠ ĐỒ TƯ DUY (IA MAP & INTERACTIVE FLOW CANVAS)

> **Mục tiêu tính năng:** Cung cấp khung vẽ sơ đồ tư duy (Interactive Mindmap Canvas) trực quan hóa cấu trúc sản phẩm số của MBBank theo phân cấp 4 tầng chuẩn mực, đạt trải nghiệm vượt trội hơn cả ReUI Flow. Hỗ trợ điều khiển mượt mà (Pan, Zoom, Căn giữa Fit-to-view, Auto-align, Snap to Grid 20px, Minimap bản đồ nhỏ), đa nút gốc Tier 1 trên cùng sản phẩm, thanh thêm nhanh Node kiểu n8n cho Admin/Design Owner, liên kết chặt chẽ với các bài toán thiết kế thực tế (`UXRequest`), tích hợp phân quyền vai trò (RBAC) và cho phép nhập/xuất sơ đồ qua JSON siêu tốc.

---

## 🎯 1. KHI NÀO CẦN ĐỌC TÀI LIỆU NÀY?

- **Khi làm tính năng mới:**
  - Cần bổ sung phân cấp mới hoặc mở rộng thuộc tính cho node cây IA (`IANode`).
  - Cần nâng cấp hoặc tích hợp thêm thao tác khung vẽ (thước đo, chế độ vẽ tự do, xuất ảnh SVG/PNG).
  - Cần tích hợp thêm các loại điểm chạm (Touchpoint) hoặc luồng đồng bộ JSON mở rộng.
- **Khi sửa tính năng cũ:**
  - Cần tinh chỉnh thuật toán tính toán tọa độ phân cấp cây (`useIATreeState.ts` - Top-down Layout Engine).
  - Cần cấu hình lại các quy tắc phân quyền Xem / Sửa cấu trúc IA (`cap-ia-view`, `cap-ia-edit`).
  - Sửa đổi thanh QuickAdd Sidebar, Minimap, hoặc cơ chế hít lưới Snap to Grid.
  - Tinh chỉnh giao diện `PageHeader`, thanh điều khiển `IAToolbar` dạng Chip hay thẻ `IATreeNodeCard`.

---

## 🏗️ 2. MÔ HÌNH PHÂN CẤP 4 TẦNG KIẾN TRÚC & ĐA TIER 1 (MULTI-ROOT IA)

Hệ thống cấu trúc toàn bộ ngân hàng số MBBank theo 4 cấp độ nghiêm ngặt, cho phép **một sản phẩm có thể sở hữu nhiều nút gốc Tier 1** cùng lúc:

```
[ CẤP 1: SẢN PHẨM / ROOT A ]                     [ CẤP 1: SẢN PHẨM / ROOT B ]
           │                                                │
           ├── [ CẤP 2: PHÂN HỆ / MODULE ]                  ├── [ CẤP 2: PHÂN HỆ / MODULE ]
           │              │                                 │              │
           │              ├── [ CẤP 3: LUỒNG TÍNH NĂNG ]    │              ├── [ CẤP 3: LUỒNG TÍNH NĂNG ]
           │              │              │                  │              │              │
           │              │              └── [ CẤP 4 ]      │              │              └── [ CẤP 4 ]
```

| Cấp Độ | Tên Gọi | Mô Tả Nghiệp Vụ | Màu Sắc Nhận Diện | Thuộc Tính Đặc Trưng |
| :---: | :--- | :--- | :--- | :--- |
| **Tier 1** | **Gốc sản phẩm (Product Root)** | Gốc cao nhất của sản phẩm số hoặc cụm nghiệp vụ lớn tự thêm. Hỗ trợ nhiều Tier 1 cạnh nhau. | Theo màu cấu hình Sản phẩm | `code`, `iconName`, `description`, `siblingRoots` |
| **Tier 2** | **Phân hệ / Module (Domain)** | Nhóm nghiệp vụ lớn (Thanh toán, Tiết kiệm, Tín dụng số, Quản trị thẻ,...) | Xanh dương / Chàm (`blue`/`indigo`) | `squadName`, `domainBadge` |
| **Tier 3** | **Luồng tính năng (Journey)** | Chuỗi hành trình khách hàng (Chuyển nhanh Napas 247, Mở thẻ online, Gửi tiết kiệm,...) | Tím / Tím nhạt (`purple`/`violet`) | `journeySteps`, `isCriticalPath` |
| **Tier 4** | **Màn hình & Điểm chạm (Touchpoint)** | Giao diện hiển thị cụ thể hoặc điểm chạm (Screen, Modal, Bottom Sheet, Push Notification, Webview, Action Sheet) | Xanh lá / Ngọc bích (`emerald`/`teal`) | `screenCode`, `touchpointType`, `figmaUrl`, `requestId` |

---

## 🧭 3. KIẾN TRÚC THÀNH PHẦN & TỔ CHỨC MÃ NGUỒN

Toàn bộ phân hệ IA map được đóng gói module hóa sạch sẽ tại `src/components/ia/`, `src/pages/` và `src/hooks/`:

```
src/
├── pages/
│   └── IAPage.tsx                       # Màn hình chính IA map, tích hợp QuickAdd Sidebar, Canvas & Modals
│
├── components/ia/
│   ├── IAToolbar.tsx                    # Command Bar: Chip sản phẩm có chấm màu + số đếm & Quick Search
│   ├── IACanvasViewport.tsx             # Khung nhìn tương tác (Pan, Zoom, Snap to Grid, Fullscreen, Menu ...)
│   ├── IAQuickAddSidebar.tsx            # Thanh trượt bên trái thêm nhanh node kiểu n8n (Drag & Drop)
│   ├── IAMinimap.tsx                    # Bản đồ nhỏ góc trái với khung nhìn camera tương tác (Viewport Box)
│   ├── IANodeFloatingToolbar.tsx        # Thanh công cụ ngữ cảnh nổi xuất hiện khi chọn đúng 1 node
│   ├── IAJsonImportModal.tsx            # Modal nhập/xuất JSON sơ đồ siêu tốc kèm mẫu Outline
│   ├── IATreeNodeCard.tsx               # Thẻ node đại diện phân cấp (hít lưới, ẩn hiện action khi chọn)
│   ├── IABezierConnectors.tsx           # SVG đường nối Bezier mượt mà giữa các node
│   ├── IANodeEditorModal.tsx            # Modal Thêm / Sửa / Xóa / Xác nhận khôi phục node
│   └── IASettingsModal.tsx              # Modal cài đặt khoảng cách độ dài các cấp
│
├── hooks/
│   ├── useIATreeState.ts                # State Engine: Quản lý đa root, Top-down Layout, Search, JSON Import
│   └── useCanvasTransform.ts            # Transform Engine: Pan kéo, Zoom, Căn giữa Fit to View
│
├── types/
│   └── ia.ts                            # Định nghĩa Interfaces, Types và Enums chuẩn (IANode, IATier,...)
│
└── data/
    └── iaMockData.ts                    # Dữ liệu gốc khởi tạo và hàm trích xuất Admin Products
```

---

## 🚀 4. CHI TIẾT 8 TIÊU CHUẨN NÂNG CẤP VƯỢT TRỘI (IA MAP V2)

### 1. Đa Tier 1 (Multiple Root Nodes) cho cùng 1 sản phẩm
- Cấu trúc `IANode` hỗ trợ mảng `siblingRoots?: IANode[]`.
- Khi người dùng tạo thêm Tier 1 mới (từ QuickAdd Sidebar, Toolbar hay Import JSON), layout engine tự động sắp xếp các cụm Tier 1 nằm song song với khoảng cách `LV1_GAP = 140px`.
- Thẻ Tier 1 tự động tính toán độ rộng trải dài bao trùm toàn bộ các phân hệ Tier 2 con trực thuộc.
- Cơ chế xóa node thông minh: Nếu xóa Tier 1 chính, hệ thống tự động đôn một sibling root kế cận lên làm gốc chính thay vì làm sập sơ đồ.

### 2. Đổi tên đồng bộ "Information Architecture" -> "IA map"
- Chuyển đổi tên gọi chuẩn mực trên toàn bộ các điểm chạm:
  - Sidebar điều hướng hệ thống (`src/components/Sidebar.tsx`): icon `Network`, nhãn `IA map`.
  - Command Palette tìm kiếm & Quick Actions (`src/components/common/AppHeader.tsx`): `title: "IA map"`.
  - Breadcrumb và Header trang (`src/pages/IAPage.tsx`): `MBBank UX Platform / IA map`.
  - URL Hash Routing (`src/App.tsx`): `#ia`.

### 3. Phóng to toàn màn hình Canvas (Fullscreen)
- Nút bấm `ia-fullscreen-btn` tích hợp ngay trên thanh dock Canvas góc dưới bên phải.
- Hỗ trợ cả Web Fullscreen API tiêu chuẩn (`container.requestFullscreen()`) cùng CSS Overlay Fallback (`fixed inset-0 z-50 w-screen h-screen`), giúp người dùng mở rộng không gian làm việc tối đa trên bất kỳ kích thước màn hình nào.

### 4. Tag chọn sản phẩm dạng Chip với màu cấu hình Quản trị
- Thay thế hoàn toàn khối tab container cũ thành danh sách các Chip sản phẩm độc lập trong `IAToolbar.tsx`.
- Đồng bộ màu sắc bằng hàm `getProductColorDef(name, color)` lấy trực tiếp từ cài đặt Quản trị (`mbbank_admin_products`).
- Hiển thị chấm tròn màu tương ứng (`●`) kèm số lượng node thực tế trong sơ đồ `(X)` (ví dụ: `App MBBank (18)`).

### 5. Thanh Quick-Add bên trái (n8n-style) cho Design Admin & Design Owner
- Component `IAQuickAddSidebar.tsx` mang phong cách thiết kế hiện đại kiểu n8n:
  - Phân loại rõ rệt 4 cấp độ: Tier 1 (Root), Tier 2 (Domain/Module), Tier 3 (Journey), Tier 4 (Touchpoints: Screen, Modal, Bottom Sheet, Push Notification, Webview, Action Sheet).
  - Tìm kiếm nhanh loại node theo từ khóa.
  - **Kéo thả (Drag & Drop):** Kéo thả trực tiếp từ thanh bar thả vào vị trí bất kỳ trên Canvas; hệ thống tự động tính toán tọa độ canvas theo tỉ lệ scale và zoom hiện tại.
  - **Click để thêm:** Click chuột để gắn node mới vào ngay dưới node đang chọn (`selectedNode`) hoặc gắn vào root.
  - Nút thu gọn / mở rộng nhanh giúp mở rộng không gian canvas.

### 6. Snap to Grid - Căn chuẩn Layout - Bản đồ nhỏ (Minimap)
- **Hít lưới (Snap to Grid):**
  - Tự động làm tròn tọa độ thẻ khi kéo thả về bước nhảy 20px (`Math.round(coord / 20) * 20`).
  - Nút bật/tắt hít lưới với icon `Grid` trên dock điều khiển Canvas.
- **Căn chuẩn tự động (Reset Layout):**
  - Nút `Căn chuẩn` đặt trên dock Canvas và trong menu `...`.
  - Xóa bỏ các tọa độ kéo lệch tạm thời, khôi phục cấu trúc phân tầng dạng cột thẳng hàng ngay ngắn, tối ưu đường dây nối Bézier.
- **Bản đồ nhỏ (Minimap - `IAMinimap.tsx`):**
  - Hiển thị bản đồ thu nhỏ ở góc trái với màu sắc mã hóa theo từng cấp độ.
  - Khung camera thời gian thực (Viewport Box) phản ánh chính xác vùng nhìn hiện tại.
  - Hỗ trợ click hoặc kéo chuột trên Minimap để pan camera tức thì đến khu vực mong muốn.

### 7. Chỉ hiển thị Action khi chọn Node (Selection-Driven UI)
- **Thẻ node sạch sẽ:**
  - Khi node chưa được chọn: Ẩn toàn bộ 4 cổng kết nối (ports) và các nút thao tác (+) để giữ khung vẽ thoáng mắt, tập trung.
  - Khi click chọn node (`isSelected === true`): Thẻ nổi bật với viền xanh neon, hiển thị đầy đủ cổng kết nối và nút thêm nhanh.
- **Thanh công cụ nổi ngữ cảnh (`IANodeFloatingToolbar.tsx`):**
  - Khi chọn đúng 1 node, thanh công cụ nổi tự động xuất hiện ngay trên đỉnh node trong không gian canvas.
  - Cung cấp các thao tác tức thì: Thêm con, Chỉnh sửa thông tin, Căn giữa camera vào node, Xóa node.

### 8. Tạo Map bằng JSON siêu tốc
- **Modal Nhập JSON (`IAJsonImportModal.tsx`):**
  - Nạp cấu trúc JSON Outline phân cấp chỉ với 1 click qua nút "Nạp mẫu thử nghiệm".
  - Parser thông minh `parseAndNormalizeIaJson()` chấp nhận cả dạng cây lồng nhau (`children: [...]`), mảng nhiều cây hay dạng phẳng.
  - Báo cáo số lượng node và cấp bậc sẽ tạo trước khi áp dụng vào sơ đồ.
- **Sao chép JSON (Copy as JSON):** Xuất toàn bộ sơ đồ của sản phẩm hiện tại thành JSON chuẩn đưa vào Clipboard.

---

## ⚡ 5. ĐỘNG CƠ BỐ TRÍ CÂY DẠNG CỘT (COLUMNAR HIERARCHY LAYOUT ENGINE)

Layout engine trong `useIATreeState.ts` sử dụng thuật toán bố trí theo phả hệ dạng cột tối ưu:
1. **Tier 1:** Đặt tại đỉnh, tự động trải dài theo chiều ngang để che phủ toàn bộ chiều rộng của các phân hệ Tier 2 con.
2. **Tier 2 (Phân hệ):** Xếp ngang theo từng cột nghiệp vụ riêng biệt.
3. **Tier 3 (Luồng tính năng):** Xếp dọc dưới Tier 2 tương ứng, thụt lề sang phải `INDENT_LV3 = 48px`.
4. **Tier 4 (Màn hình & Điểm chạm):** Xếp dọc dưới Tier 3 tương ứng, thụt lề sang phải `INDENT_LV4 = 40px`.
5. **Khoảng cách linh hoạt:** Cho phép người dùng tùy chỉnh khoảng cách dọc và ngang thông qua `IASettingsModal.tsx`.

---

## 🛡️ 6. MA TRẬN PHÂN QUYỀN RBAC VÀ TRẢI NGHIỆM TINH GỌN CHO QUYỀN VIEW

| Capability ID | Tên Năng Lực | Admin | Design Owner | Designer | Product Owner (PO) | Business / Viewer |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **`cap-ia-view`** | **Xem sơ đồ IA map** | ✅ Có | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| **`cap-ia-edit`** | **Biên tập sơ đồ IA map** | ✅ Có | ✅ Có | ✅ Có | ❌ Chỉ xem | ❌ Chỉ xem |

### 🎯 Trải nghiệm tối ưu dành riêng cho các vai trò Chỉ Xem (PO, Business, Viewer)
Nhằm mang lại trải nghiệm xem sơ đồ tinh gọn nhất, không bị rối mắt bởi các nút công cụ biên tập kỹ thuật, hệ thống thiết kế chế độ chỉ xem (`readOnly`) theo nguyên tắc:
1. **Kéo xem IA map mượt mà:**
   - Người xem có thể kéo thả bất kỳ vị trí trống nào trên Canvas để xoay/cuộn camera xem sơ đồ.
   - Nhóm điều khiển góc phải chỉ hiển thị các công cụ điều hướng thiết yếu: **Phóng to tỉ lệ (+)**, **Thu nhỏ (-)**, **100%**, và **Căn giữa (Fit to View)**.
2. **Tích chọn và Xem chi tiết Node:**
   - Nhấp vào bất kỳ thẻ node nào trên Canvas để tích chọn (`isSelected = true`), hiển thị viền xanh và huy hiệu xác nhận chọn.
   - Thanh công cụ nổi (`IANodeFloatingToolbar`) tự động xuất hiện với nút **"Xem chi tiết" (icon Eye)** và nút **"Xem bài toán"** (nếu node có gắn task).
   - Nhấp **"Xem chi tiết"** (hoặc nhấp đúp vào thẻ node) sẽ mở bảng trượt chi tiết `IANodeEditorModal (mode="view")` hiển thị:
     - Tên tính năng, mã định danh ID (với nút sao chép), mã code tính năng.
     - Phân cấp Tier (1 đến 4), loại điểm chạm (Screen, Modal, Bottom sheet...), màu chủ đề, tag.
     - Squad phụ trách, mô tả chi tiết, đường dẫn thiết kế Figma.
     - Danh sách các bài toán thiết kế UXRequest liên kết với trạng thái badge thực tế, có thể bấm "Chi tiết" để mở slide-over drawer của task.
     - Footer chỉ có duy nhất một nút "Đóng", loại bỏ hoàn toàn các nút Lưu hay Xóa.
3. **Phóng to toàn màn hình (Vew full):**
   - Giữ nguyên nút phóng to toàn màn hình (`ia-fullscreen-btn`) nổi bật ở thanh điều hướng canvas giúp người xem mở rộng tối đa không gian trình chiếu.
4. **Ẩn hoàn toàn các tính năng biên tập / quản trị khác (Zero-Clutter):**
   - **PageHeader:** Ẩn toàn bộ nút "Cài đặt sơ đồ", "Tải từ Cloud", "Lưu lên Cloud", và menu tùy chọn khác (`...`). Hiển thị huy hiệu "Chế độ chỉ xem".
   - **Quick-Add Sidebar:** Ẩn hoàn toàn thanh thêm nhanh node bên trái.
   - **Canvas Dock:** Ẩn bộ chuyển đổi Tool Switcher (V/H), ẩn nút Snap to Grid, ẩn nút Căn chuẩn (AutoAlign), ẩn nút bật bản đồ nhỏ (Minimap), ẩn menu canvas dropdown (`...`).
   - **Canvas Elements:** Ẩn thanh pill di chuyển nhóm đa chọn (`ia-canvas-selection-pill`), ẩn các cổng kết nối 4 hướng (ports), ẩn nút (+ Thêm con), nút Sửa, nút Xóa trên card, ẩn thanh kéo ngang resize card, khóa cứng di chuyển thẻ.

---

## 💾 7. LƯU TRỮ ĐA TẦNG VÀ ĐỒNG BỘ CLOUD

1. **LocalStorage (`ux_portal_ia_tree_data_v4`):** Ghi nhớ tức thì mọi di chuyển, co giãn, chỉnh sửa của người dùng.
2. **Đồng bộ Google Sheets Cloud (`syncCloud` / `pullCloud`):**
   - Lưu trữ an toàn toàn bộ cây sơ đồ lên Google Sheets thông qua Google Apps Script backend.
   - Hỗ trợ tải dữ liệu mới nhất từ Cloud về khi chuyển đổi thiết bị làm việc.
3. **Sao lưu & Khôi phục mặc định:** Tự do thử nghiệm và khôi phục lại sơ đồ tiêu chuẩn khi cần thiết.

---

## 🧪 8. KỊCH BẢN KIỂM THỬ TỰ ĐỘNG & ĐẢM BẢO CHẤT LƯỢNG

Hệ thống đi kèm bộ kịch bản kiểm thử tự động toàn diện kiểm tra đầy đủ cả 8 tiêu chuẩn và chế độ xem tinh gọn:
```bash
# Kiểm thử toàn diện 8 tiêu chuẩn IA Map v2
node scripts/test-ia-map-v2-features.mjs

# Kiểm thử trải nghiệm tinh gọn cho các quyền View
node scripts/test-ia-map-view-only.mjs
```
- **Kết quả kiểm thử 8 tiêu chuẩn:** **34/34 test checks PASS (100%)**.
- **Kết quả kiểm thử quyền View:** **30/30 test checks PASS (100%)**.
- **TypeScript Typecheck:** Đạt chuẩn sạch không lỗi.
- **Vite Production Build:** Biên dịch thành công trong ~ 580ms.
