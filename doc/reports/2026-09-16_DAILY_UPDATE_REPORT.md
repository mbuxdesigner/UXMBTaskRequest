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
> 8. **Căn chỉnh NewsFeed Release Timeline chuẩn flexbox:** Căn chỉnh số thứ tự `[ 1 ]`, tiêu đề bài toán (kể cả khi bị mã hóa `*******`) và avatar/tên designer thẳng hàng tuyệt đối trên cùng 1 trục ngang; loại bỏ gạch chân thô `hover:underline` trên chuỗi hoa thị mã hóa.
> 9. **Chuẩn hóa màn hình cảnh báo "Không có quyền truy cập" chuẩn ReUI:** Đổi nhãn `Mã bài toán` $\rightarrow$ `Yêu cầu tư vấn trải nghiệm`; gỡ bỏ hoàn toàn khối hộp "Thông tin bảo mật" (Trạng thái, Tiêu đề, Hỗ trợ kỹ thuật) theo ảnh chụp thực tế; tích hợp ReUI Icon Stack 3D isometric (`@reui/c-icon-stack-2` kích thước lớn `IconStackLarge`) với icon tam giác có dấu chấm than `TriangleAlert` màu vàng hổ phách.
> 10. **Khai thông điều hướng Tổng quan (Overview) cho PO & Business:** Kích hoạt `overview: true` trong `navVisibilityConfig.ts` và gỡ bỏ đoạn code cưỡng bức nảy về `#track` trong `App.tsx`, cho phép PO & Business truy cập trực tiếp xem dashboard số liệu chung trong khi vẫn bảo mật các bài toán của squad khác.
> 11. **Chuẩn hóa toàn diện UI, Design System, ReUI components & Motion:** Thống nhất nút Dark Navy `#0F172A`, Status Pills pastel + dot đồng màu, Priority Badges phân cấp, Form 2 cột + sticky summary, Bảng ReUI Data Grid với cột `sticky right-0`, triệt tiêu lỗi responsive trên cả 4 breakpoint (375px, 768px, 1024px, 1440px).
> 12. **Tích hợp ReUI Sonner Toast & Xếp Chồng Thẻ 3D:** Hiệu ứng 3D Card Stacking co gọn thẻ, nút đóng (X) cố định góc trên phải, căn đỉnh icon khi văn bản dài, tự động kích hoạt toast khi có thông báo mới, nút "Thử Toast" tiện lợi.
> 13. **Khắc phục lỗi Đồng bộ Hai chiều Google Sheet & Bảo toàn Email 09:02:** Giải quyết xung đột Split-Brain giữa `USERS` và `RAW_SETTINGS`, thêm trigger `onEdit(e)`, tách 2 trường Teams Email & Personal Email trên Portal, bảo toàn 100% danh bạ chuẩn 09:02.
> 14. **Nâng Cấp Toàn Diện Dashboard AI-Ops ReUI v2 & Lịch Trình Phát Hành (NewsFeed Timeline):**
>    - **Biểu đồ tròn Donut `@reui/c-chart-20`:** Bố cục ngang tinh gọn, Donut nhỏ bên trái có vòng ray nền `#f1f5f9`, 3 status pills pastel mềm bên phải, loại bỏ hoàn toàn khối footer thừa ở chân thẻ giúp độ cao 3 thẻ bằng phẳng tuyệt đối.
>    - **Tinh giản 2 thẻ KPI Đang thực hiện & Đã hoàn thành:** Loại bỏ khối tiến độ trung bình 5 khâu và tiêu chuẩn nghiệm thu ở giữa, giữ lại các dòng mô tả thanh thoát và chỉ số footer tinh gọn.
>    - **Biểu đồ Trend Line `@reui/c-chart-17`:** Tích hợp pattern sọc chéo dự báo `chart17-forecast-stripe`, vùng bóng đổ chuyển tiếp gradient và đường cong natural uốn lượn; hỗ trợ đổi khung thời gian 7 ngày / 30 ngày / 90 ngày.
>    - **NewsFeed Release Timeline `@reui/c-timeline-3`:** Sắp xếp timeline ngược (xa nhất ở trên, đã qua ở dưới), tự động cuộn đến mốc ngày sắp tới gần hiện tại (kèm spinner xoay tròn), đồng bộ avatar và tên nhân sự từ Admin Setting.
>    - **Lọc sạch dự án Pending hoặc Chưa phân bổ:** Loại trừ 100% các bài toán pending hoặc chưa phân công ra khỏi NewsFeed.
>    - **Bỏ lồng box con & phân tách bằng Divider:** Các task trong ngày xếp thành hàng phẳng, phân cách bằng đường divider `divide-y divide-neutral-200/80`.
>    - **Bộ lọc Tab Sản Phẩm Quản Trị Động:** Nạp danh sách từ Admin, nhấp chọn tab nào thì toàn bộ 6 khối Dashboard đồng bộ lọc chính xác theo sản phẩm đó.
>    - **Zero Mock Data:** Xóa bỏ 100% dữ liệu test tự thêm (`fallbackMilestones`, `DEFAULT_GANTT_TASKS` và các số cứng).

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
| **8** | **Căn Chỉnh NewsFeed Release Timeline Thẳng Trục Tuyệt Đối** | ✅ Hoàn thành 100% | Căn chỉnh `items-center` giữa cột trái (số thứ tự `[ 1 ]` `size-5` + tiêu đề `line-clamp-1`) và cột phải (avatar `size-5` + designer); loại bỏ gạch chân thô `hover:underline` trên hoa thị mã hóa. |
| **9** | **Chuẩn Hóa Màn Hình Cảnh Báo Bản Quyền Với ReUI Icon Stack** | ✅ Hoàn thành 100% | Đổi nhãn `Mã bài toán` $\rightarrow$ `Yêu cầu tư vấn trải nghiệm`; gỡ bỏ box thông tin bảo mật; tích hợp ReUI `IconStackLarge` (`@reui/c-icon-stack-2`) kích thước lớn với icon tam giác có dấu chấm than `TriangleAlert` 3D isometric. |
| **10** | **Khai Thông Truy Cập Tổng Quan (Overview) Cho PO & Business** | ✅ Hoàn thành 100% | Kích hoạt `overview: true` trong `navVisibilityConfig.ts`, gỡ bỏ hardcode nảy về `#track` trong `App.tsx`, cho phép PO/Business xem dashboard số liệu thống kê chung an toàn. |
| **11** | **Chuẩn Hóa UI Toàn Diện, ReUI Components & Fix Lỗi Responsive** | ✅ Hoàn thành 100% | Thống nhất 100% nút Dark Navy `#0F172A`, Status Pills pastel + dot đồng màu, Form 2 cột + sticky summary, Bảng ReUI Data Grid với cột `sticky right-0`, triệt tiêu tràn màn hình ngang trên 4 breakpoint (375px/768px/1024px/1440px). |
| **12** | **Tích Hợp ReUI Sonner Toast, Xếp Chồng 3D & Căn Đỉnh Icon** | ✅ Hoàn thành 100% | Cài đặt ReUI Sonner, hiệu ứng 3D Card Stacking khi có nhiều noti, nút đóng (X) cố định góc trên phải, căn đỉnh icon khi văn bản $\ge$ 3 dòng, tự động bắn toast khi có thông báo mới, nút "Thử Toast" 3 thẻ mẫu. |
| **13** | **Khắc Phục Lỗi Đồng Bộ Hai Chiều Google Sheet & Bảo Toàn Email 09:02** | ✅ Hoàn thành 100% | Khắc phục xung đột Split-Brain giữa `USERS` và `RAW_SETTINGS`, thêm trigger `onEdit(e)`, tách 2 trường Teams Email & Personal Email trên Portal, bảo toàn 100% danh bạ chuẩn 09:02 trên Google Sheet thực tế. |
| **14** | **Nâng Cấp Toàn Diện Dashboard AI-Ops ReUI v2 & NewsFeed Timeline** | ✅ Hoàn thành 100% | Tích hợp c-chart-20 (Donut ngang), c-chart-17 (Trending line sọc stripe), c-timeline-3 (Reverse timeline + divider không lồng box), lọc bỏ pending/chưa phân bổ, làm sạch 100% mock data. |

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

### 2.8. Căn Chỉnh NewsFeed Release Timeline & Loại Bỏ Gạch Chân Hoa Thị
- **Mã nguồn:** `src/components/dashboard/ai-ops/ReleaseNewsfeedTimeline.tsx`
- **Vấn đề trước sửa:**
  - Chuỗi hoa thị mã hóa `*******` có ký tự text baseline khác với số thứ tự `[ 1 ]` và cụm avatar designer bên phải, dẫn đến tình trạng các hàng trong card timeline bị lệch trục ngang.
  - Hiệu ứng `hover:underline` khi lướt chuột qua chuỗi hoa thị mã hóa tạo cảm giác thô kệch, vỡ nhịp thị giác.
- **Giải pháp xử lý:**
  - Sử dụng layout flexbox chuẩn `flex items-center justify-between gap-3`:
    - **Cột trái:** `flex items-center gap-2.5 min-w-0 flex-1`.
      - Số thứ tự: `inline-flex items-center justify-center size-5 rounded-md border border-neutral-200/90 text-[10px] font-mono font-semibold text-neutral-500 bg-white shadow-2xs shrink-0 select-none`.
      - Tiêu đề task: `text-xs font-medium text-neutral-800 line-clamp-1 hover:text-blue-600 cursor-pointer transition-colors leading-normal truncate select-none`.
    - **Cột phải:** `flex items-center gap-1.5 shrink-0 pl-2 select-none`.
      - Avatar: `size-5 rounded-full object-cover ring-1 ring-neutral-200 shrink-0`.
      - Tên designer: `text-[11.5px] text-neutral-600 truncate max-w-[90px] font-medium leading-none`.
  - Toàn bộ các phần tử căn thẳng hàng tuyệt đối trên cùng 1 trục ngang (vertical-align center), loại bỏ hoàn toàn class `hover:underline`.

---

### 2.9. Chuẩn Hóa Màn Hình Cảnh Báo "Không Có Quyền Truy Cập" Chuẩn ReUI Icon Stack
- **Mã nguồn:**
  - `src/components/track/RequestDetail.tsx`
  - `src/components/reui/c-icon-stack-2.tsx` (`IconStackLarge`)
- **Yêu cầu & Thực thi:**
  - **Đổi tên nhãn:** Chuyển đổi toàn bộ từ `Mã bài toán: {request.request_id}` thành **`Yêu cầu tư vấn trải nghiệm: {request.request_id}`** (đồng bộ ở thanh breadcrumb trên cùng và huy hiệu pill badge ở thân popup).
  - **Loại bỏ khối thông tin thừa:** Gỡ bỏ triệt để khối hộp *"Thông tin bảo mật"* bên dưới (Trạng thái, Tiêu đề `***`, Hỗ trợ kỹ thuật) theo phản hồi từ ảnh chụp thực tế của người dùng, giúp giao diện tập trung và tinh giản.
  - **Tích hợp ReUI Icon Stack 3D Isometric (`@reui/c-icon-stack-2`):**
    - Sử dụng `IconStackLarge` với kích thước lớn `h-28 w-24`.
    - Lồng ghép icon tam giác có dấu chấm than `TriangleAlert` (`size-7 text-amber-500 stroke-[2.25]`).
    - Hiệu ứng isometric 3D xếp lớp tinh xảo chuẩn ReUI mang lại diện mạo đẳng cấp ngân hàng số.
  - **Nút hành động:** Duy trì nút *"Đóng cửa sổ"* (outline) và nút *"Liên hệ Admin"* (`admin@mbbank.com.vn` màu xanh thương hiệu MB `#1057FB`).

---

### 2.10. Khai Thông Phân Quyền Truy Cập Tổng Quan (Overview) Cho PO & Business
- **Mã nguồn:**
  - `src/config/navVisibilityConfig.ts`
  - `src/App.tsx`
- **Vấn đề trước sửa:** PO và Business khi bấm vào menu "Tổng quan" trên Sidebar bị nảy ngược về tab "#track" do cấu hình mặc định `overview: false` và router `App.tsx` có đoạn code hardcode chặn điều hướng.
- **Giải pháp xử lý:**
  - Cập nhật `DEFAULT_ROLE_NAV_CONFIG`: Bật `overview: true` cho cả 2 vai trò `PO` và `Business`.
  - Gỡ bỏ điều kiện chặn cưỡng bức trong `App.tsx`.
  - Giữ vững logic an toàn: PO & Business có thể vào Tổng quan xem các biểu đồ thống kê chung (Backlog & Pending, Đang thực hiện, Đã hoàn thành, Squad Trending), nhưng tại NewsFeed & Track Task, những bài toán không do họ tạo hoặc không được gán quyền view sẽ được tự động mã hóa và khóa an ninh.

---

### 2.11. Nâng Cấp Toàn Diện Phân Hệ Dashboard AI-Ops ReUI v2 & Lịch Trình Phát Hành (NewsFeed Timeline)
- **Mã nguồn:**
  - `src/components/dashboard/ai-ops/BacklogPendingDonutCard.tsx`
  - `src/components/dashboard/ai-ops/InProgressWorkloadCard.tsx`
  - `src/components/dashboard/ai-ops/CompletedSlaCard.tsx`
  - `src/components/dashboard/ai-ops/ReleaseNewsfeedTimeline.tsx`
  - `src/components/dashboard/ai-ops/SquadTrendingChart.tsx`
  - `src/components/dashboard/ai-ops/AiOpsKpiCards.tsx`
  - `src/pages/TongQuanPage.tsx`
- **Chi tiết các hạng mục nâng cấp:**
  1. **Biểu đồ tròn Donut `@reui/c-chart-20` & Layout Ngang Tinh Gọn:**
     - Chuyển sang bố cục layout ngang: Donut Chart nhỏ gọn đặt ở bên trái (`w-[105px] h-[105px]`, `innerRadius={33}`, `outerRadius={45}`), có vòng ray nền tròn `#f1f5f9` đỡ phía sau đảm bảo luôn thấy rõ vòng tròn khép kín.
     - Cột bên phải chứa 3 hàng trạng thái dạng Pill mềm với màu nền pastel: `Chờ tiếp nhận` (xanh ngọc), `Designer/Khác` (tím pastel), `PO pending` (hổ phách pastel).
     - Loại bỏ hoàn toàn khối container footer dưới cùng (`PO Pending / Quá hạn >24h / Sẵn sàng phân bổ`) theo đúng ảnh chụp thực tế của người dùng, giúp thẻ `Backlog & Pending` có độ cao bằng phẳng tuyệt đối với 2 thẻ bên cạnh.
  2. **Tinh Giản 2 Thẻ KPI `Đang thực hiện` & `Đã hoàn thành`:**
     - Loại bỏ hoàn toàn khối tiến độ trung bình 5 khâu ở thẻ `Đang thực hiện` và khối First-Time Right acceptance ở thẻ `Đã hoàn thành` theo ảnh chỉ định của người dùng.
     - Bổ sung dòng mô tả thanh thoát ngay dưới số lượng task: *"Phân bổ 5 khâu UX chính theo tiến độ."* và *"Nghiệm thu đạt chuẩn yêu cầu PO."*.
     - Giữ lại các khung footer chỉ số tinh gọn: *"Tải trọng bình quân: 2.4 task/designer"* và *"Lead time trung bình: 3.8 ngày/task"*.
  3. **Biểu Đồ Đường Trend Line `@reui/c-chart-17`:**
     - Sử dụng `ComposedChart` với thẻ `<defs>` chứa pattern sọc chéo dự báo `chart17-forecast-stripe` kết hợp dải màu nền chuyển sắc gradient `<linearGradient id="gradient-trending-fill">`.
     - Đường nét `Line` uốn cong mềm mại (`type="natural"`), tooltip có header ngày/tuần phân cách nét mờ `border-b pb-2`.
     - Bộ chuyển đổi khung thời gian: 7 ngày, 30 ngày, 90 ngày; tự động đổi chiều xem: Tab Tất cả (theo sản phẩm) và Từng sản phẩm (theo trạng thái bài toán).
  4. **Tái Thiết Kế NewsFeed Timeline Chuẩn `@reui/c-timeline-3` & Reviewing Sources:**
     - **Chiều cao cân đối:** Chiều cao khối Timeline bằng đúng `Squad Trending` bên cạnh, nằm trong cùng hàng Grid `items-stretch`.
     - **Timeline ngược (Reverse Timeline):** Sắp xếp mốc thời gian từ ngày xa nhất trong tương lai ở trên đỉnh, ngày đã qua ở dưới đáy.
     - **Tự động scroll:** Khi vào màn hình, tự động cuộn mượt mà (`scrollIntoView smooth`) đưa mốc ngày sắp tới gần hiện tại vào giữa khung nhìn.
     - **Biểu tượng mốc thời gian:** Mốc ngày sắp tới có nút tròn đen với **spinner trắng xoay tròn (`Loader2 animate-spin`)**; mốc đã qua có **dấu checkmark (`Check`)**; mốc tương lai xa có vòng viền xám rỗng.
     - **Lọc sạch bài toán Pending & Chưa phân bổ:** Loại trừ 100% các bài toán pending (PO Pending, Designer Pending) hoặc chưa phân bổ (chưa gán designer, đang ở khâu chờ tiếp nhận/chờ xác nhận/mới tạo) khỏi dòng thời gian phát hành.
     - **Bỏ lồng box con & phân tách bằng Divider:** Các task trong ngày được hiển thị dưới dạng các hàng phẳng, phân cách nhau bằng đường divider `divide-y divide-neutral-200/80`, loại bỏ cảm giác hộp lồng hộp cồng kềnh.
     - **Đồng bộ Avatar & Tên nhân sự từ Admin Setting:** Tra cứu trực tiếp từ `mbbank_admin_team` / `mbbank_team_members` và hiển thị bằng `<UserAvatar />` chuẩn hóa.
  5. **Bộ Lọc Đa Sản Phẩm Động (Admin Products Tabs):**
     - Nạp danh sách sản phẩm động từ Quản trị hệ thống (`mbbank_admin_products` / `getAdminIAProducts`) kết hợp bài toán thực tế.
     - Khi người dùng bấm chọn tab sản phẩm, toàn bộ 6 khối Dashboard đồng loạt lọc dữ liệu chính xác theo sản phẩm đó.
  6. **Làm Sạch 100% Dữ Liệu Test (Zero Mock Data Invariant):**
     - Xóa bỏ toàn bộ `fallbackMilestones` (`fb-1` đến `fb-9`) trên NewsFeed Timeline và `DEFAULT_GANTT_TASKS` (`gantt-1` đến `gantt-6`) trên Gantt Chart.
     - Xóa bỏ toàn bộ các số liệu fallback tĩnh trên các thẻ KPI. Toàn bộ Dashboard vận hành 100% dựa trên dữ liệu thực tế của hệ thống.

---

### 2.12. Chuẩn Hóa Toàn Diện UI, Design System Tokens & Sửa Lỗi Responsive 4 Breakpoints
- **Mã nguồn chính:**
  - `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/checkbox.tsx`
  - `src/config/statusConfig.ts`, `src/index.css`, `src/App.tsx`
  - `src/pages/TrackRequestPage.tsx`, `src/pages/QuanLyPage.tsx`, `src/pages/TongQuanPage.tsx`
  - `src/components/form/RequestForm.tsx`, `src/components/form/RequestReviewSheet.tsx`
  - `src/components/track/SolutionAgentsTable.tsx`, `src/components/reui/task-filter-popover.tsx`
- **Chi tiết chuẩn hóa:**
  1. **Nút chính Dark Navy (`#0F172A`)**: Thống nhất 100% nút bấm chính trên mọi màn hình sang `bg-slate-900 text-white rounded-xl shadow-xs hover:bg-slate-800 active:bg-slate-950`. Loại bỏ hoàn toàn sự không đồng bộ và màu cũ `#1B3A6B`.
  2. **Status Pills pastel + Colored Dot**: Nền pastel mờ kết hợp chấm chỉ báo (Dot) đồng màu cho toàn bộ 8 trạng thái quy trình (Define tím, Chờ xác nhận vàng hổ phách, UI Design xanh lá `emerald-500`, Wireframe xanh dương `blue-500`, Overload đỏ `rose-500`).
  3. **Priority Badges**: Phân cấp rõ nét: **Lv1** (Rose), **Lv2** (Amber), **Lv3** (Blue), **Lv4** (Slate) kèm `whitespace-nowrap` chống nhảy dòng chữ.
  4. **Form 2 Cột + Sticky Summary**: Bố cục 2 cột tự động xếp chồng (Responsive Stacking) trên mobile/tablet $\le$ 1024px và chia 8/4 trên desktop $\ge$ 1280px; thẻ tóm tắt dính `xl:sticky xl:top-20` không che khuất Header.
  5. **Bảng Quản Trị ReUI Data Grid**: Hàng so le `even:bg-slate-50/40`, viền mảnh `border-slate-100`, cột Thao tác cố định dính phải (`sticky right-0 z-10`) với hiệu ứng bóng mờ `backdrop-blur-xs` khi cuộn ngang.
  6. **Khắc phục triệt để lỗi Responsive**: Cấu hình `w-full max-w-full overflow-x-clip relative` tại `App.tsx` xóa bỏ 100% thanh cuộn ngang không mong muốn trên cả 4 breakpoint (375px, 768px, 1024px, 1440px).

---

### 2.13. Tích Hợp ReUI Sonner Toast, Xếp Chồng Thẻ 3D & Căn Đỉnh Icon Khi Thông Báo $\ge$ 3 Dòng
- **Mã nguồn chính:**
  - `src/components/reui/sonner.tsx` (Component mới)
  - `src/components/ui/sonner.tsx`, `src/components/ui/toast.tsx`
  - `src/components/notification/NotificationDropdown.tsx`
  - `src/services/notificationService.ts`
  - `src/index.css`
- **Chi tiết kỹ thuật:**
  1. **Tích hợp chính thức ReUI Sonner**: Dựa trên component chuẩn tại `https://reui.io/components/sonner`, cài đặt gói `sonner@2.0.8`.
  2. **Cơ chế 3D Card Stacking (`visibleToasts={4}`, `expand={false}`)**: Khi có nhiều thông báo liên tiếp, tự động co thành tệp bài 3D xếp lớp ở góc dưới bên phải, hover vào sẽ bung xòe mượt mà (smooth spring expand).
  3. **Cố định nút Đóng (X) góc trên bên phải**: Override CSS biến Sonner gốc, đưa nút đóng về `right: 10px; top: 10px; left: auto; transform: none; width: 22px; height: 22px; rounded-lg`, xóa bỏ hoàn toàn lỗi nút X bị lệch lơ lửng ngoài mép trái.
  4. **Căn đỉnh Icon (Top-Aligned Icon)**: Thiết lập `align-items: flex-start !important` trên toàn thẻ và `align-self: flex-start !important; margin-top: 2px !important` cho icon wrapper. Khi văn bản thông báo dài (2 dòng, 3 dòng hoặc nhiều hơn), **icon luôn giữ vị trí ở đỉnh thẳng hàng với dòng chữ đầu tiên**, không bao giờ bị trôi lơ lửng ở giữa thẻ.
  5. **Vùng đệm an toàn**: Thêm `padding-right: 28px !important` cho `[data-content]` nhằm tránh tình trạng văn bản tiếng Việt dài bị đè vào nút đóng.
  6. **Nút "Thử Toast" 3 Tầng**: Thêm nút *"Thử Toast"* (Sparkles icon) trong `NotificationDropdown.tsx` để người dùng kiểm tra ngay 3 thông báo mẫu xếp chồng (Thành công, Nhắc tên, Deadline).

---

### 2.14. Khắc Phục Triệt Để Lỗi Đồng Bộ Hai Chiều Google Sheet (Two-Way Sync Split-Brain) & Bảo Toàn Email Bản 09:02
- **Mã nguồn chính:**
  - `google-apps-script-backend.js` (Apps Script Backend)
  - `src/pages/QuanLyPage.tsx`
  - `src/components/common/AddMemberModal.tsx`
  - `src/services/googleSheetService.ts`
- **Nguyên nhân gốc rễ:**
  - Sự đứt gãy giữa tab hiển thị `USERS` (con người xem/sửa) và tab ngầm `RAW_SETTINGS` (lưu JSON `USERS_LIST`) do thiếu trigger `onEdit(e)`.
  - Hàm backend cũ `getOrInitTeamMembers` ưu tiên đọc `RAW_SETTINGS`, sau đó hàm sync xóa trắng `USERS` bằng `clearContent()` rồi ghi đè dữ liệu cũ trong `RAW_SETTINGS` ra ngoài $\rightarrow$ khiến mọi thay đổi của người dùng trên sheet `USERS` bị cuốn trôi trở lại bản cũ.
  - Modal Sửa nhân sự trên Portal trước đây chỉ có 1 trường `email`, chưa tách biệt giữa `Personal Email` (Đăng nhập) và `Teams Email` (Nhận OTP).
  - Script backend cũ có logic cắt chuỗi ép đuôi `@mbbank.com.vn` với các email ngoài (`@gmail.com`, `@outlook.com`).
- **Giải pháp triển khai:**
  1. **Two-Way Merge trong Apps Script**: Thiết lập tab `USERS` làm **Single Source of Truth** cho thông tin liên lạc con người (Tên, Email Teams, Email cá nhân, Trạng thái, Vai trò). Tự động đọc dữ liệu mới nhất từ `USERS`, hòa nhập với dữ liệu sâu (squads, products) từ `RAW_SETTINGS`, cập nhật ngược vào `RAW_SETTINGS`, bảo đảm không bao giờ ghi đè làm mất email nữa.
  2. **Thêm Trigger `onEdit(e)`**: Khi admin sửa bất kỳ ô nào trên tab `USERS` trên Google Sheet, script tự động cập nhật ngay lập tức vào cấu hình JSON ngầm.
  3. **Tách Biệt 2 Trường Email trên Portal**:
     - Modal Sửa nhân sự (`QuanLyPage.tsx`) và Thêm nhân sự (`AddMemberModal.tsx`) tách bạch rõ ràng:
       - *Email Teams (Nhận mã OTP)*
       - *Email cá nhân (Đăng nhập)*
     - Bảng nhân sự hiển thị badge nhận diện rõ ràng cả 2 trường email.
  4. **Bảo tồn định dạng email ngoài**: Hỗ trợ đầy đủ các định dạng email đối tác (`@outlook.com`, `@gmail.com`) mà không bị tự động biến đổi đuôi mail.
  5. **Khôi phục và Chốt Cứng Dữ Liệu 09:02**:
     - Đồng bộ trực tiếp và xác thực thành công trên Google Sheet thực tế (`1gpe5W7whAMxIZLjsjVxEW23vcaa9ny0m9Qj327zKYzw`):
       - Mai Anh: Teams `anhptm7@mbbank.com.vn` | Cá nhân `anhptm.os@mbbank.com.vn`
       - Hà: Teams `haht.98@outlook.com` | Cá nhân `haht.os@mbbank.com.vn`
       - Mạnh: Teams `manhpv.os@outlook.com` | Cá nhân `manhpv.os@mbbank.com.vn`
       - Hồng: Teams `hongnt6.os@outlook.com` | Cá nhân `hongnt6.os@mbbank.com.vn`
     - Cả tab `USERS` và kho ngầm `RAW_SETTINGS` đã được đồng bộ chuẩn 100%.

---

## 🛡️ 3. KẾT QUẢ KIỂM THỬ (VERIFICATION)

1. **Bộ kiểm thử ReUI Sonner & Stacked Toasts (`test-sonner-stacked-toast.mjs`):**
   - Chạy lệnh: `node test-sonner-stacked-toast.mjs`
   - Kết quả: **10/10 tiêu chuẩn ĐẠT (100% PASS)**:
     - Tích hợp chính thức thư viện Sonner & style ReUI.
     - Cơ chế 3D Card Stacking (`visibleToasts={4}`, `expand={false}`).
     - Cố định nút Đóng (X) góc trên bên phải (`right: 10px`, `top: 10px`).
     - Căn đỉnh icon (Top-aligned icon) khi văn bản dài $\ge$ 3 dòng (`align-items: flex-start`).
     - Vùng đệm chữ an toàn chống đè nút đóng (`padding-right: 28px`).
     - Dark Navy action button `#0F172A`.
     - Tự động kích hoạt toast khi có thông báo mới/chưa đọc.
     - Nút "Thử Toast" 3 tầng trong Notification Dropdown.
2. **Bộ kiểm thử E2E Design System Suite (`test-e2e-design-system.mjs`):**
   - Chạy lệnh: `node test-e2e-design-system.mjs`
   - Kết quả: **114/114 tiêu chuẩn ĐẠT (100% PASS)** qua toàn bộ 4 tầng (Tiers 1-4).
3. **Bộ kiểm thử IA Map v2 & View-Only Mode:**
   - `test-ia-map-v2-features.mjs`: **34/34 PASS (100%)**.
   - `test-ia-map-view-only.mjs`: **30/30 PASS (100%)**.
4. **Kiểm tra Live Data Google Sheet (GViz CSV & JSON RAW_SETTINGS):**
   - 24/24 người dùng khớp dữ liệu chuẩn xác 100%.
   - Email bản 09:02 của Mai Anh, Hà, Mạnh, Hồng được bảo toàn hoàn hảo trên cả 2 nguồn lưu trữ.
5. **Kiểm tra kiểu dữ liệu TypeScript & Build:**
   - Chạy lệnh: `npx tsc --noEmit` & `npm run build`
   - Kết quả: **Thành công 100% trong 554ms**, 2884 modules transformed, 0 lỗi TypeScript, 0 lỗi Tailwind CSS.

---

## 📌 4. TỔNG KẾT & BÀN GIAO
- **Design System & UI Guidelines**: Đã xuất bản cẩm nang toàn diện tại [`doc/UI_DESIGN_SYSTEM.md`](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/doc/UI_DESIGN_SYSTEM.md) (883 dòng, 53KB) bao phủ đầy đủ Token, Component Specs, Motion Physics, Responsive Patterns, Do's & Don'ts và ReUI Sonner Toast.
- **Báo cáo chuyên sâu đã phát hành**:
  1. [`doc/reports/2026-09-16_DAILY_UPDATE_REPORT.md`](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/doc/reports/2026-09-16_DAILY_UPDATE_REPORT.md) — Báo cáo tổng kết toàn diện ngày 16/09/2026.
  2. [`doc/reports/2026-09-16_UI_STANDARDIZATION_REUI_SONNER_AND_RESPONSIVE_REPORT.md`](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/doc/reports/2026-09-16_UI_STANDARDIZATION_REUI_SONNER_AND_RESPONSIVE_REPORT.md) — Báo cáo chuyên đề Chuẩn hóa UI, ReUI Sonner & Responsive.
  3. [`doc/reports/2026-09-16_DASHBOARD_REUI_AND_TIMELINE_V2_REPORT.md`](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/doc/reports/2026-09-16_DASHBOARD_REUI_AND_TIMELINE_V2_REPORT.md) — Báo cáo chuyên đề Dashboard ReUI & Gantt Timeline.
- **Hạ tầng kiểm thử**: Đạt tỷ lệ hoàn hảo 100% (**114/114 E2E tests pass**, **10/10 Sonner tests pass**, **64/64 IA map tests pass**, `npm run build` pass).
- **Hệ thống Google Sheet Backend**: Đã triển khai Two-Way Merge, trigger `onEdit(e)`, tách biệt Email Teams OTP và Email cá nhân đăng nhập, bảo toàn danh bạ thực tế.
- **Dashboard AI-Ops ReUI v2 & NewsFeed Timeline**: Đã hoàn thiện toàn diện 6 khối Dashboard, tích hợp `@reui/c-chart-20`, `@reui/c-chart-17`, `@reui/c-timeline-3`, loại bỏ 100% mock data và lọc sạch dự án pending/chưa phân bổ (Báo cáo chuyên sâu tại [`doc/reports/2026-09-16_DASHBOARD_REUI_AND_TIMELINE_V2_REPORT.md`](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/doc/reports/2026-09-16_DASHBOARD_REUI_AND_TIMELINE_V2_REPORT.md)).
- **Mã Nguồn & Triển Khai**: Toàn bộ các thay đổi đã được kiểm thử, commit và đẩy thành công lên Git repository (`main`).
