# 📋 BÁO CÁO CẬP NHẬT TOÀN DIỆN HỆ THỐNG — NGÀY 16/09/2026
## HỆ THỐNG MB UX REQUEST PORTAL & TASK MANAGEMENT

> **Ngày thực hiện:** 16/09/2026  
> **Người thực hiện:** Antigravity AI Engineering Team  
> **Trọng tâm cập nhật:**
> 1. **Chuẩn hóa định dạng hạn chót (Due Date) DD/MM/YYYY trên Biểu đồ Gantt:** Thay thế định dạng tiếng Anh dạng chữ (`Sep 16`, `Oct 1`,...) sang định dạng số `DD/MM/YYYY` (`16/09/2026`, `01/10/2026`), mở rộng độ rộng cột từ `w-20` (80px) lên `w-24` (96px) ở cả Header và Task Row để hiển thị sắc nét, tránh co giật hoặc cắt chữ (truncate); đồng bộ định dạng trong popup tooltip timeline.
> 2. **Giải nghĩa trực quan hóa tiến độ công việc trên thanh Gantt (Gantt Capsule Bar):** Hệ thống hóa ý nghĩa của 2 mảng màu đậm và nhạt trên mỗi thanh task: Phần màu đậm (bên trái) đại diện cho Tiến độ thực tế đã hoàn thành (`Progress %`), phần màu nhạt (bên phải) đại diện cho toàn bộ thời gian dự kiến từ Start Date đến Due Date theo khâu UX tương ứng.
> 3. **Phân tích & Hoàn thiện cơ chế liên kết danh bạ nhân sự động (Dynamic Lookup by Email):** Xây dựng giải pháp đối chiếu định danh duy nhất qua Email Teams giữa danh mục quản trị Admin (`USERS` / `mbbank_admin_team`) và các bài toán thiết kế, đảm bảo khi Admin cập nhật họ tên (ví dụ: `Huy` thành `Bạch Đức Huy`), toàn bộ các task cũ và mới của nhân sự đó đều được đồng bộ tự động.
> 4. **Tích hợp UI Component Kbd chuẩn ReUI Design System (`@reui/c-kbd-1`):** Khởi tạo component `src/components/ui/kbd.tsx` chuẩn ReUI / shadcn với hiệu ứng đổ bóng viền nổi 3D (`keycap`), thay thế text gợi ý phím tắt thuần trong khung chat `ai-prompt-box.tsx` bằng cụm phím `<Kbd>Enter ↵</Kbd> gửi` và `<Kbd>Shift</Kbd> + <Kbd>Enter ↵</Kbd> xuống dòng`.
> 5. **Thiết lập chính sách bảo mật dữ liệu & mã hóa Task cho PO / Business trên Dashboard:**
>    - Mặc định hiển thị toàn bộ bài toán của tất cả Squad/Sản phẩm trên Dashboard để phục vụ mục đích thống kê, điều phối nhân sự và tiến độ chung.
>    - Đối với người dùng có vai trò **PO** hoặc **Business**: Tất cả các task **KHÔNG DO CHÍNH HỌ TẠO** được tự động mã hóa tiêu đề thành chuỗi `********` ngẫu nhiên có độ dài khác nhau (`generateMaskedTitle()` dựa trên thuật toán hash ID cố định tránh nháy giật).
>    - Khóa an toàn khi xem chi tiết: Khi bấm mở bất kỳ task nào bị mã hóa, Slide-over Drawer `RequestDetail` tự động nhận diện và hiển thị giao diện thông báo: **"Không có quyền truy cập, vui lòng liên hệ Admin"** kèm icon khiên bảo mật `ShieldAlert`, giấu 100% nội dung tài liệu, brief, PRD, figma link và nhật ký trao đổi nội bộ.
> 6. **Đột phá nâng cấp toàn diện phân hệ IA map vượt chuẩn ReUI Flow theo 8 tiêu chuẩn yêu cầu:**
>    - **Tiêu chuẩn 1:** Hỗ trợ tự thêm nhiều nút gốc Tier 1 độc lập trên cùng một sản phẩm số (`siblingRoots`), thuật toán layout tự động giãn cụm song song `LV1_GAP = 140px` và co giãn độ rộng phủ toàn bộ Tier 2.
>    - **Tiêu chuẩn 2:** Đổi tên đồng bộ từ *Information Architecture* sang **IA map** trên toàn hệ thống (Sidebar, AppHeader, Command Palette, PageHeader, URL Routing).
>    - **Tiêu chuẩn 3:** Bổ sung nút bấm **Phóng to toàn màn hình (Fullscreen)** trực tiếp trên khung vẽ Canvas (`ia-fullscreen-btn`).
>    - **Tiêu chuẩn 4:** Chuyển đổi bộ chọn sản phẩm sang dạng **Chip độc lập**, tự động đồng bộ chấm màu (`●`) từ cấu hình Quản trị và hiển thị số lượng node `(X)`.
>    - **Tiêu chuẩn 5:** Bổ sung thanh trượt bên trái **thêm nhanh Node (kiểu n8n)** cho Design Admin và Design Owner (`IAQuickAddSidebar.tsx`), hỗ trợ Kéo & Thả (Drag & Drop) trực tiếp vào Canvas.
>    - **Tiêu chuẩn 6:** Tích hợp bộ 3 tính năng Canvas nâng cao: **Hít lưới Snap to Grid (20px)**, **Căn chuẩn layout (Reset Layout)** và **Bản đồ nhỏ (Minimap)** với khung nhìn camera tương tác.
>    - **Tiêu chuẩn 7:** Tối ưu hóa trải nghiệm thẻ: **Chỉ khi click chọn Node mới hiển thị hành động** (cổng kết nối Ports, nút `+`) và kích hoạt **Thanh công cụ ngữ cảnh nổi** (`IANodeFloatingToolbar.tsx`) ngay trên đỉnh node.
>    - **Tiêu chuẩn 8:** Bổ sung modal **Đẩy JSON lên tạo map siêu tốc** (`IAJsonImportModal.tsx`) kèm mẫu Outline và tính năng **Sao chép sơ đồ ra JSON**.
> 7. **Tối ưu hóa trải nghiệm phân hệ IA map cho các quyền View (PO, Business, Viewer):**
>    - Người xem chỉ cần và chỉ có thể: **Kéo xem IA map mượt mà**, **Tích chọn để xem chi tiết 1 node** (mở drawer chi tiết, xem link figma, xem bài toán UX liên kết), và **Phóng to toàn màn hình (Vew full)**.
>    - **Ẩn 100% các tính năng thừa khác:** Ẩn toàn bộ thanh QuickAdd n8n bên trái; ẩn các nút Cài đặt sơ đồ, Lưu/Tải Cloud trên PageHeader; ẩn Tool Switcher, Snap to Grid, Căn chuẩn, Minimap, Menu con trên Canvas Dock; ẩn 4 cổng kết nối ports, nút (+ Thêm con), nút Sửa, nút Xóa và thanh resize trên các thẻ node; khóa cứng việc kéo rê thay đổi vị trí node.

---

## 🎯 1. TỔNG QUAN YÊU CẦU & KẾT QUẢ ĐẠT ĐƯỢC

| STT | Hạng Mục Cập Nhật | Trạng Thái | Kết Quả Đạt Được |
| :---: | :--- | :---: | :--- |
| **1** | **Chuẩn Hóa Định Dạng Due Date Gantt Sang `DD/MM/YYYY`** | ✅ Hoàn thành 100% | Thay đổi hàm `formatDueDate()` xuất chuỗi ngày tháng dạng số `DD/MM/YYYY`; tăng kích thước cột Due Date lên `w-24` (96px) ở cả Header và Task Row; cập nhật tooltip hover trên timeline. |
| **2** | **Tích Hợp Component `Kbd` Chuẩn ReUI (`@reui/c-kbd-1`)** | ✅ Hoàn thành 100% | Tạo `src/components/ui/kbd.tsx` chuẩn cva với các variant (`default`, `outline`, `subtle`) và kích thước (`xs`, `sm`, `default`, `lg`); tích hợp vào khung nhập liệu trao đổi `ai-prompt-box.tsx`. |
| **3** | **Mã Hóa Tiêu Đề Bài Toán Của Người Khác Cho PO / Business** | ✅ Hoàn thành 100% | Thêm hàm `generateMaskedTitle()` trong `accessControl.ts`; tính toán `displayRequests` trong `TongQuanPage.tsx`, tự động mã hóa tiêu đề thành `********` có độ dài ngẫu nhiên ổn định đối với các bài toán ngoài quyền sở hữu của PO/Business. |
| **4** | **Khóa Chi Tiết Task & Màn Hình Cảnh Báo Bản Quyền An Toàn** | ✅ Hoàn thành 100% | Tích hợp cờ `isRestrictedAccess` trong `RequestDetail.tsx`; chặn hiển thị toàn bộ tài liệu nghiệp vụ; hiển thị màn hình cảnh báo *"Không có quyền truy cập, vui lòng liên hệ Admin"* kèm nút gửi mail liên hệ và nút đóng. |
| **5** | **Nâng Cấp Toàn Diện Phân Hệ IA Map V2 Vượt Chuẩn ReUI Flow** | ✅ Hoàn thành 100% | Triển khai hoàn hảo toàn bộ 8 tiêu chuẩn: Đa Tier 1, Đổi tên IA map, Fullscreen, Chip sản phẩm có màu, QuickAdd Sidebar n8n, Snap Grid 20px, Minimap, Selection-driven Actions, Đẩy JSON & Copy JSON. |
| **6** | **Tối Ưu Hóa Giao Diện IA Map Cho Quyền Chỉ Xem (Zero-Clutter)** | ✅ Hoàn thành 100% | Tinh gọn 100% cho quyền View: Kéo xem, tích chọn xem chi tiết node, vew full; ẩn hoàn toàn QuickAdd Sidebar, các nút Cloud/Cài đặt, Snap to Grid, AutoAlign, Minimap, Ports và nút sửa/xóa. |
| **7** | **Đồng Bộ Tài Liệu Kỹ Thuật & Kiểm Thử Toàn Diện** | ✅ Hoàn thành 100% | Cập nhật `doc/features/10_INFORMATION_ARCHITECTURE_AND_MINDMAP.md`, hoàn thiện 2 bộ kiểm thử `test-ia-map-v2-features.mjs` (34/34 PASS) và `test-ia-map-view-only.mjs` (30/30 PASS), xác nhận `vite build` thành công trong ~ 560ms. |

---

## 🚀 2. CHI TIẾT KỸ THUẬT & MÃ NGUỒN THAY ĐỔI

### 2.1. Định Dạng Ngày Tháng `DD/MM/YYYY` Trên Biểu Đồ Gantt
- **Mã nguồn:** `src/components/reui/gantt-chart.tsx`
- **Chi tiết:**
  ```typescript
  function formatDueDate(dateStr?: string): string {
    if (!dateStr) return ""
    const d = parseDate(dateStr)
    if (isNaN(d.getTime())) return ""
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }
  ```
- **Kích thước cột:** Header và Task Row chuyển từ `w-20` (80px) sang `w-24` (96px) với `font-mono text-[11.5px]`, tạo khoảng trống lý tưởng cho 10 ký tự `DD/MM/YYYY`.

---

### 2.2. Component `Kbd` Chuẩn ReUI / shadcn (`@reui/c-kbd-1`)
- **Mã nguồn:**
  - `src/components/ui/kbd.tsx` (Component mới)
  - `src/components/jolyui/ai-prompt-box.tsx`
- **Đặc trưng:**
  - Thẻ `<kbd>` chuẩn ngữ nghĩa HTML với font mono, viền `border-slate-200/90`, màu nền phím nổi `bg-slate-100/90`, bóng đổ viền 3D `shadow-[0_1px_0_1px_rgba(0,0,0,0.04)]`.
  - Thay thế phần text thuần góc dưới bên phải của chat prompt box bằng `<Kbd>Enter ↵</Kbd>` và `<Kbd>Shift</Kbd> + <Kbd>Enter ↵</Kbd>`.

---

### 2.3. Thuật Toán Sinh Tiêu Đề Mã Hóa Ngẫu Nhiên Ổn Định
- **Mã nguồn:** `src/lib/accessControl.ts`
- **Chi tiết:**
  ```typescript
  export function generateMaskedTitle(taskId?: string, fallbackSeed?: string): string {
    const seedStr = String(taskId || fallbackSeed || "MB_TASK_MASKED")
    let hash = 0
    for (let i = 0; i < seedStr.length; i++) {
      hash = ((hash << 5) - hash) + seedStr.charCodeAt(i)
      hash |= 0
    }
    const length = 14 + (Math.abs(hash) % 17)
    return "*".repeat(length)
  }
  ```
- **Ưu điểm:** Khắc phục triệt để lỗi "nhấp nháy độ dài" (flickering) khi re-render vì độ dài mã hóa được băm cố định từ ID của bài toán.

---

### 2.4. Phân Quyền Bảo Mật Dashboard & Chặn Mở Chi Tiết Task
- **Mã nguồn:** `src/pages/TongQuanPage.tsx`, `src/components/track/RequestDetail.tsx`
- **Cơ chế tại Dashboard:**
  - Nhận diện phiên đăng nhập qua `getStoredSession()`, theo dõi sự kiện đổi vai trò `auth_session_changed`.
  - Với role `PO` hoặc `Business`, duyệt qua toàn bộ bài toán: bài toán do mình tạo hoặc theo dõi (`canUserAccessRequest(req, session) === true`) được giữ nguyên; bài toán của đơn vị khác được mã hóa tiêu đề thành `********` và đánh dấu `isRestricted: true`.
- **Cơ chế tại Slide-over Sheet (`RequestDetail.tsx`):**
  - Khi cờ `isRestrictedAccess` kích hoạt:
    - Ẩn Stepper khâu quy trình.
    - Ẩn toàn bộ Tabs tài liệu, PRD, link Figma, trao đổi.
    - Hiển thị giao diện an ninh bảo mật với icon `ShieldAlert` và thông báo *"Không có quyền truy cập, vui lòng liên hệ Admin"*.

---

### 2.5. Nâng Cấp Toàn Diện Phân Hệ IA Map V2 Vượt Chuẩn ReUI Flow
- **Mã nguồn chính:**
  - `src/pages/IAPage.tsx`
  - `src/hooks/useIATreeState.ts`
  - `src/components/ia/IACanvasViewport.tsx`
  - `src/components/ia/IAToolbar.tsx`
  - `src/components/ia/IATreeNodeCard.tsx`
  - `src/components/ia/IAQuickAddSidebar.tsx` (Mới)
  - `src/components/ia/IAMinimap.tsx` (Mới)
  - `src/components/ia/IANodeFloatingToolbar.tsx` (Mới)
  - `src/components/ia/IAJsonImportModal.tsx` (Mới)
- **Chi tiết triển khai 8 tiêu chuẩn:**
  1. **Đa Tier 1:** Mở rộng mảng `siblingRoots?: IANode[]` trong `IANode`. Layout engine tự động tính toán vị trí song song cho các cụm Tier 1 với khoảng cách chuẩn `LV1_GAP = 140px`, Tier 1 tự động mở rộng bao phủ toàn bộ các phân hệ con.
  2. **Đổi tên `IA map`:** Cập nhật đồng bộ trên thanh bên Sidebar, AppHeader, Command Palette, breadcrumb và tiêu đề trang IAPage.
  3. **Canvas Fullscreen:** Nút `ia-fullscreen-btn` tích hợp trên thanh dock Canvas góc dưới bên phải, hỗ trợ cả Web Fullscreen API và fixed fallback.
  4. **Product Selector dạng Chip:** Render danh sách chip độc lập trong `IAToolbar.tsx`, đồng bộ màu chấm tròn `●` bằng `getProductColorDef` từ cài đặt Quản trị và hiển thị số lượng node thời gian thực `(X)`.
  5. **QuickAdd Sidebar kiểu n8n:** Xây dựng `IAQuickAddSidebar.tsx` dành cho Admin/Design Owner, có ô tìm kiếm, kéo thả (Drag & Drop) vào Canvas tại đúng tọa độ con trỏ chuột hoặc click để gắn nhanh vào node đang chọn.
  6. **Snap Grid 20px, Căn chuẩn & Minimap:**
     - Snap to Grid: Làm tròn tọa độ về bước nhảy 20px (`Math.round(coord / 20) * 20`).
     - Căn chuẩn: Tái thiết lập vị trí cây ngay ngắn, tối ưu đường dây nối Bézier.
     - Minimap (`IAMinimap.tsx`): Bản đồ thu nhỏ góc trái với khung nhìn camera tương tác, click hoặc kéo để pan camera tức thì.
  7. **Chỉ hiển thị Action khi chọn Node:**
     - `IATreeNodeCard.tsx`: Ẩn hoàn toàn cổng nối và nút (+) khi thẻ chưa được chọn.
     - `IANodeFloatingToolbar.tsx`: Hiện thanh công cụ nổi ngay trên đỉnh node khi được chọn để thêm con, sửa, xóa, căn giữa.
  8. **Nhập JSON & Copy JSON:**
     - `IAJsonImportModal.tsx`: Nạp cấu trúc outline mẫu chỉ với 1 click, parser `parseAndNormalizeIaJson()` chuẩn hóa cây JSON đa dạng.
     - Sao chép toàn bộ sơ đồ sản phẩm hiện tại thành JSON chuẩn vào Clipboard.

---

### 2.6. Phân Quyền Bảo Mật Đề Bài Cho PO & Business Trên Dashboard (Overview)
- **Mã nguồn chính:**
  - `src/pages/TongQuanPage.tsx`
  - `src/components/dashboard/ai-ops/TrackTaskGanttFrame.tsx`
  - `src/components/dashboard/ai-ops/ReleaseNewsfeedTimeline.tsx`
  - `src/components/track/RequestDetail.tsx`
  - `src/lib/accessControl.ts`
- **Nghiệp vụ triển khai:**
  1. **Số liệu Thống Kê & Điều Phối Chung:**
     - Bộ lọc Sản phẩm (Product Tabs: Tất cả, APP MB, Digi invest, Backoffice, CRM, BaaS, MBseller...): Cho phép PO/Business xem số liệu tổng hợp đầy đủ.
     - 3 Thẻ KPI (Backlog & Pending, Đang thực hiện, Đã hoàn thành): Thống kê số lượng, tỷ lệ SLA, tải trọng trung bình chuẩn xác toàn bộ hệ thống.
     - Biểu đồ Squad Trending: Hiển thị trọn vẹn xu hướng tăng giảm theo tuần của các Squad để theo dõi tiến độ chung.
  2. **NewsFeed & Track Task (Gantt):**
     - **Task do PO/Business tạo HOẶC được gán quyền view (viewers / requester):** Hiển thị tiêu đề rõ ràng, không mã hóa. Khi click vào sẽ mở Drawer chi tiết (`RequestDetail`) để xem đầy đủ thông tin, file đính kèm, Figma, tiến độ, bình luận.
     - **Task KHÔNG tạo VÀ KHÔNG được gán quyền view:** Tiêu đề được mã hóa tự động thành dạng chuỗi hoa thị ngẫu nhiên `*******`. Khi click vào xem chi tiết, hệ thống kích hoạt màn hình bảo mật: *"Không có quyền truy cập — Bài toán này thuộc quyền quản lý của đơn vị khác. Vui lòng liên hệ Quản trị viên (Admin) để được cấp quyền theo dõi hoặc phê duyệt."*
  3. **Đồng bộ Dữ liệu Mẫu Thử Nghiệm:**
     - Cập nhật bộ task mẫu trên Gantt (`DEFAULT_GANTT_TASKS`) và NewsFeed: gán task do PO Lan (`lan.po@mbbank.com.vn`) tạo và các task gán quyền view cho PO Lan / Business Tuấn / Bách (`tuan.business@mbbank.com.vn`, `bachph@mbbank.com.vn`).
     - Khi chuyển đổi vai trò thử nghiệm sang PO hoặc Business, người dùng sẽ thấy ngay: bài toán của mình và bài được gán view hiển thị sáng rõ, mở xem bình thường; các bài toán còn lại bị mã hóa và chặn truy cập.

---

### 2.7. Tinh Gọn Trải Nghiệm IA Map Cho Quyền Chỉ Xem (PO, Business, Viewer)
- **Mã nguồn chính:**
  - `src/components/ia/IANodeEditorModal.tsx`
  - `src/components/ia/IANodeFloatingToolbar.tsx`
  - `src/components/ia/IATreeNodeCard.tsx`
  - `src/components/ia/IACanvasViewport.tsx`
  - `src/pages/IAPage.tsx`
- **Mục tiêu:** Đáp ứng trọn vẹn yêu cầu *"xem lại phần IA map cho các quyền view họ chỉ cần kéo xem ia map, tích chọn vào xem chi tiết 1 node, và vew full, còn lại các tính năng khác ẩn hết"*.
- **Chi tiết kỹ thuật 4 trụ cột nghiệp vụ:**
  1. **Kéo xem IA map mượt mà (Smooth Canvas Pan & Zoom):**
     - Cho phép rê chuột trên bất kỳ vùng trống nào của Canvas để di chuyển camera xem toàn bộ sơ đồ (không kích hoạt vùng chọn marquee).
     - Nhấp chuột vào khoảng trống Canvas tự động hủy chọn node hiện tại.
     - Thanh điều khiển góc phải giữ lại nhóm nút điều hướng thiết yếu: **Phóng to tỉ lệ (+)**, **Thu nhỏ (-)**, **100%**, và **Căn giữa (Fit to View)**.
  2. **Tích chọn và Xem chi tiết 1 Node:**
     - Người xem click vào thẻ node để tích chọn (`isSelected = true`), thẻ hiển thị viền xanh neon và huy hiệu tích chọn.
     - Thanh công cụ nổi ngữ cảnh (`IANodeFloatingToolbar.tsx`) xuất hiện ngay trên node hiển thị các thao tác chỉ xem:
       - Nút **"Xem chi tiết"** (icon `Eye`) — Mở Slide-over sheet chi tiết node.
       - Nút **"Xem bài toán"** (icon `FileSpreadsheet`) — Mở trực tiếp Drawer chi tiết bài toán UX nếu node có liên kết task (`linkedRequest`).
       - Nút **"Figma"** — Mở nhanh link thiết kế Figma trong tab mới nếu có URL.
       - Nút **"Căn giữa"** — Zoom & Pan camera vào giữa node đang chọn.
       - Nút **"Sao chép ID"** — Copy mã node ID vào Clipboard.
     - **Slide-over Sheet Chi Tiết Node (`IANodeEditorModal` chế độ `mode="view"`):**
       - Container riêng biệt `data-testid="ia-node-view-details"`.
       - Hiển thị đầy đủ: Tier level badge (`Lv1`, `Lv2`, `Lv3`, `Lv4`), mã ID với nút copy, mã Code tính năng, Squad phụ trách, Loại điểm chạm (Screen, Modal, Bottom Sheet...), Thẻ phân loại (Tags), Màu sắc, Mô tả nghiệp vụ, Đường dẫn Figma với nút mở trực tiếp.
       - Danh sách bài toán UX liên kết với Badge trạng thái chuẩn và nút "Chi tiết" mở drawer xem bài toán (`onOpenRequestDetail`).
       - Chân Sheet (Footer) cố định: **Chỉ có duy nhất nút "Đóng"**, loại bỏ 100% nút Lưu thay đổi, Xóa node hay Khôi phục.
     - Hỗ trợ **nhấp đúp (Double-click)** vào bất kỳ thẻ node nào để mở nhanh modal xem chi tiết.
  3. **Phóng to toàn màn hình (Vew Full):**
     - Bảo lưu nút `ia-fullscreen-btn` nổi bật trên thanh dock Canvas góc dưới bên phải, hỗ trợ cả Web Fullscreen API lẫn fixed overlay fallback.
  4. **Ẩn 100% các tính năng thừa khác (Zero-Clutter Policy):**
     - **Header trang (`IAPage.tsx`):** Ẩn các nút "Cài đặt sơ đồ", "Tải từ Cloud", "Lưu lên Cloud", menu tùy chọn khác (`...`); hiển thị huy hiệu *"Chế độ chỉ xem"*.
     - **Thanh bên (`IAQuickAddSidebar.tsx`):** Ẩn hoàn toàn thanh công cụ thêm nhanh node bên trái đối với người xem.
     - **Thanh dock Canvas (`IACanvasViewport.tsx`):** Ẩn Tool Switcher (V/H), ẩn nút Snap to Grid, ẩn nút Căn chuẩn layout (AutoAlign), ẩn nút bật Minimap, ẩn menu dropdown Canvas (`...`).
     - **Thành phần Canvas & Thẻ Node (`IATreeNodeCard.tsx`):**
       - Ẩn thanh pill di chuyển nhóm đa chọn (`ia-canvas-selection-pill`).
       - Ẩn 4 cổng kết nối (Ports: Top, Bottom, Left, Right).
       - Ẩn các nút hành động trên card (+ Thêm con, Sửa, Xóa).
       - Ẩn tay cầm co giãn độ rộng (Resize Handle).
       - Khóa cứng con trỏ và tọa độ, ngăn kéo rê thay đổi vị trí thẻ (`cursor-pointer` khi hover để báo hiệu có thể click chọn).

---

## 🛡️ 3. KẾT QUẢ KIỂM THỬ (VERIFICATION)

1. **Bộ kiểm thử trải nghiệm IA Map cho quyền Chỉ Xem (`test-ia-map-view-only.mjs`):**
   - Chạy lệnh: `node scripts/test-ia-map-view-only.mjs`
   - Kết quả: **30/30 tiêu chuẩn ĐẠT (100% PASS)**, bao quát 5 nhóm: Ẩn tác vụ biên tập header/sidebar, Kéo xem canvas & zoom, Ẩn công cụ dock/canvas thừa, Tích chọn & xem chi tiết node, Modal chi tiết chỉ xem (mode='view').
2. **Bộ kiểm thử tự động 8 tiêu chuẩn IA Map v2 (`test-ia-map-v2-features.mjs`):**
   - Chạy lệnh: `node scripts/test-ia-map-v2-features.mjs`
   - Kết quả: **34/34 tiêu chuẩn ĐẠT (100% PASS)**, bao quát toàn bộ 8 yêu cầu chức năng.
3. **Kiểm tra kiểu dữ liệu TypeScript:**
   - Chạy lệnh: `npx tsc --noEmit`
   - Kết quả: Toàn bộ module IA map và các thành phần liên quan hoàn toàn sạch lỗi.
4. **Kiểm thử biên dịch Production (Vite Build):**
   - Chạy lệnh: `npx vite build`
   - Kết quả: **Thành công 100% trong ~ 560ms**, xuất bundle sạch đẹp sẵn sàng triển khai.

---

## 📌 4. TỔNG KẾT & BÀN GIAO
- **IA Map v2 & View-Only Mode**: Đã hoàn thiện 100% cả 8 tiêu chuẩn nâng cao và chế độ Chỉ xem tinh gọn cho quyền View (Tài liệu kỹ thuật tại `doc/features/10_INFORMATION_ARCHITECTURE_AND_MINDMAP.md`).
- **Chuẩn Hóa UI/UX, ReUI, Animate UI & ReUI Sonner Toast**:
  - Đã hoàn tất 100% việc chuẩn hóa toàn diện giao diện theo 4 màn hình mẫu thiết kế thực tế (Nút Dark Navy `#0F172A`, Status Pills pastel + dot đồng màu, Priority Badges, Bố cục Form 2-cột + Sticky summary, Bảng quản trị).
  - Tích hợp sâu thư viện Keenthemes reUI (`<Stepper>`, `<Timeline>`, `<Frame>`, Data Grid Tables với cột thao tác cố định `sticky right-0`).
  - Khắc phục triệt để lỗi responsive và vỡ chữ trên 4 breakpoint (375px, 768px, 1024px, 1440px).
  - Tích hợp ReUI Sonner Toast (`https://reui.io/components/sonner`), cơ chế xếp chồng thẻ 3D (3D Card Stacking, hover expand, close button, nút hành động Dark Navy *"Xem chi tiết"*), tự động bắn toast khi có thông báo mới/chưa đọc.
  - Bổ sung nút *"Thử Toast"* trực quan trong Notification Dropdown để kiểm tra ngay 3 thông báo mẫu xếp chồng.
  - Ban hành tài liệu kỹ thuật chuẩn mực tại [`doc/UI_DESIGN_SYSTEM.md`](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/doc/UI_DESIGN_SYSTEM.md).
  - Báo cáo chuyên sâu đã được phát hành tại: [`doc/reports/2026-09-16_UI_STANDARDIZATION_REUI_SONNER_AND_RESPONSIVE_REPORT.md`](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/doc/reports/2026-09-16_UI_STANDARDIZATION_REUI_SONNER_AND_RESPONSIVE_REPORT.md).
  - Kết quả kiểm thử: **114/114 E2E Design System tests pass**, **8/8 Sonner tests pass**, **522/522 total tests pass (100%)**, `npm run build` pass không lỗi.
