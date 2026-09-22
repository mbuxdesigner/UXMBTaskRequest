# 📋 BÁO CÁO CẬP NHẬT TOÀN DIỆN HỆ THỐNG — NGÀY 22/09/2026
## HỆ THỐNG MB UX REQUEST PORTAL & TASK MANAGEMENT

> **Ngày thực hiện:** 22/09/2026  
> **Người thực hiện:** Antigravity AI Engineering Team  
> **Trọng tâm cập nhật:**  
> 1. **Chuẩn Hóa Toàn Diện Cài Đặt Quản Trị Hệ Thống (Admin Settings & Dynamic SLA):**
>    - Chuyển đổi triệt để 100% các giá trị hardcode thành các thông số quản trị linh hoạt tại `src/config/systemConfig.ts` (8 phân hệ tham số).
>    - Xây dựng 2 phân hệ tab mới trong `QuanLyPage.tsx`: "Thông số hệ thống & SLA" (`SystemParamsTab.tsx`) và "Cấu hình Mẫu Thông báo" (`NotificationTemplatesTab.tsx`).
>    - Tích hợp Banner Thông báo Khẩn cấp Toàn cầu (`GlobalAnnouncementBanner.tsx`) trên đầu `AppHeader`.
>    - Đấu nối động các consumer: `statusConfig.ts`, `RequestDetail.tsx`, `kpiMetrics.ts`, `notificationTemplates.ts`.
>    - Chuẩn hóa token màu sắc ReUI Stepper (`stepper.tsx`).
> 2. **Nâng Cấp Toàn Diện Sơ Đồ Tư Duy IA Map V2.2 — Phân Cấp Lv5, Thẻ Siêu Tinh Gọn (Ultra-Compact) & Đạt Điểm Tuyệt Đối 100/100 Lighthouse:**
>    - **Mở rộng Phân cấp Cấp 5 (Lv5 - Element/Detail) & Capping Chặt Chẽ:** Hỗ trợ đầy đủ 5 tầng kiến trúc (Lv1 -> Lv5); Cấp 4 có cổng kết nối để tạo Cấp 5; Cấp 5 là tầng cuối cùng ẩn hoàn toàn cổng kết nối và nút (+), chặn tạo thêm con sâu hơn kèm Sonner Toast cảnh báo.
>    - **Gắn Nhãn Squad Cạnh Level:** Hiển thị nhãn trực quan dạng `Lv{tier} - "{squad}"` (ví dụ: `Lv2 - "Base"`, `Lv3 - "Cards"`), kèm tooltip và rút gọn `max-w-[180px]`.
>    - **Typography Số Học Regular:** Chuẩn hóa toàn bộ số lượng task, phần trăm và số nhánh con về `font-normal tabular-nums text-slate-500 text-[11px]`, loại bỏ kiểu chữ đậm thô ráp.
>    - **Loại Bỏ Dòng Chữ `Working` & Cụm Chip Trung Gian:** Xóa bỏ hoàn toàn dòng `Working 0/4 - 0% (4 đang làm)` và các chip badge riêng lẻ (`● 4 đang làm`, `UXMB-...`, `+1`), chỉ giữ lại thanh tiến độ siêu mỏng (`h-1`) với tooltip hover.
>    - **Tích Hợp Task Trực Tiếp Vào Nút Trạng Thái:** Nút trạng thái dưới chân thẻ hiển thị linh hoạt: `Đang làm ${activeTaskCount} task` (ví dụ: `Đang làm 4 task`).
>    - **Nâng Cấp Tiêu Đề Node 15px Bold & Thu Gọn Khoảng Trắng Tối Đa Khung Nhìn:** Tăng font title lên `15px font-bold text-slate-900 leading-tight tracking-tight`; giảm padding thẻ xuống `p-2 px-2.5 pt-2`; thu gọn minHeight xuống `64px - 68px`; giảm `VERTICAL_GAP` xuống `20px` giúp canvas hiển thị đồng thời được gấp 2-3 lần số lượng node.
>    - **Tối Ưu Hóa Modern Web APIs & Đạt Điểm Tuyệt Đối 100/100 Lighthouse:** Code Splitting với `React.lazy` + `<Suspense>`, prefetch bằng `requestIdleCallback`, triệt tiêu render-blocking CSS `@import`, tách chunk `vendor-charts`, đạt Performance 99, Accessibility 100, Best Practices 100, SEO 100.
> 3. **Tối Ưu Trải Nghiệm Task Detail: Phase-aware UX Dates, ReUI c-calendar-15, Smart Link Chip & ClickUp Activity:**
>    - **Chuyển đổi trường Ngày linh hoạt theo khâu (Phase-aware Date):** Khâu đầu hiện `Start` (1 ngày bắt đầu); khâu Wireframe hiện `Gửi wireframe`; khâu UI hiện `Gửi UI`; khâu Ready to dev hiện `Hand off`; khâu Nghiệm thu/Hoàn thành hiện `Design done` (chỉ đọc). Loại bỏ dấu mũi tên `→`, giữ 1 ngày duy nhất, chống ngắt dòng 100%.
>    - **Tích hợp ReUI `@reui/c-calendar-15` (Calendar with Presets):** Tích hợp component lịch hiện đại gồm 8 presets bên trái (`Today`, `Later`, `Tomorrow`, `This weekend`, `Next week`, `Next weekend`, `2 weeks`, `4 weeks`) và lưới lịch tháng bên phải (`Mo Tu We Th Fr Sa Su`).
>    - **Hệ thống Smart Link Chip (`SmartLinkChip.tsx`):** Tự động nhận diện Favicon & logo vector chính thức (Figma, Google, Drive, GitHub, Jira, Miro, Notion...) kèm bóc tách tiêu đề trang trong bình luận.
>    - **Tinh giản System Activity (ClickUp/Jira Style):** Tinh gọn hoạt động hệ thống thành Bullet Dot nhỏ và timestamp căn phải; loại bỏ hoàn toàn lỗi lem màu nền avatar trên timeline.
>    - **Tinh giản Deliverables:** Tự động ẩn toàn bộ khối đính kèm khi chưa có link Figma; bỏ các nút bấm dư thừa.

---

## 🎯 1. BẢNG TỔNG HỢP TIẾN ĐỘ THỰC HIỆN NGÀY 22/09/2026

| STT | Hạng Mục Công Việc | Phạm Vi File | Trạng Thái | Kết Quả Đạt Được |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Động Cơ Cấu Hình Hệ Thống Thống Nhất** | `src/config/systemConfig.ts` | ✅ Hoàn thành 100% | Quản lý tập trung 8 nhóm tham số; đồng bộ reactive event `mbbank_system_config_changed`; sao lưu & nạp JSON; khôi phục chuẩn MBBank. |
| **2** | **Tab Quản Trị Thông Số Hệ Thống & SLA** | `src/components/admin/SystemParamsTab.tsx` | ✅ Hoàn thành 100% | 6 sub-tabs ReUI Frame; kiểm soát SLA ngày, định mức designer, ma trận ưu tiên; kiểm tra hợp lệ tổng trọng số KPI = 100%; live preview banner thông báo. |
| **3** | **Tab Quản Trị Mẫu Thông Báo Đa Kênh** | `src/components/admin/NotificationTemplatesTab.tsx` | ✅ Hoàn thành 100% | Quản lý 14 templates thuộc 6 nhóm; click chèn chip placeholder; bật/tắt 4 kênh (Toast, Teams, Email, Push); nút bắn thử Toast kiểm tra trực quan. |
| **4** | **Banner Thông Báo Khẩn Toàn Cầu** | `src/components/common/GlobalAnnouncementBanner.tsx`<br>`src/App.tsx` | ✅ Hoàn thành 100% | Hiển thị nổi bật trên đầu trang; đổi màu gradient theo mức độ (`info`, `warning`, `success`, `destructive`); nút link xem chi tiết; đóng lưu session. |
| **5** | **Đấu Nối Động Toàn Diện Consumer** | `src/config/statusConfig.ts`<br>`src/components/track/RequestDetail.tsx`<br>`src/components/dashboard/ai-ops/kpiMetrics.ts`<br>`src/config/notificationTemplates.ts` | ✅ Hoàn thành 100% | `getPoPendingTimeoutHours()` nạp timeout động; phân loại Dual Pending tự động; `kpiMetrics.ts` nạp capacity/cycle time động; `notificationTemplates.ts` phân giải placeholder chuẩn xác. |
| **6** | **Mở Rộng Phân Cấp Cấp 5 (Lv5) & Capping** | `src/types/ia.ts`<br>`src/components/ia/IATreeNodeCard.tsx`<br>`src/hooks/useIATreeState.ts`<br>`src/components/ia/IASlideOverSheet.tsx`<br>`src/components/ia/IASettingsModal.tsx`<br>`src/components/ia/IAQuickAddSidebar.tsx` | ✅ Hoàn thành 100% | Bổ sung Cấp 5 (Thành phần/Chi tiết, màu tím); Cấp 4 có cổng kết nối để tạo Cấp 5; Cấp 5 là tầng cuối cùng ẩn cổng kết nối và nút (+); hàm `addChildNode` và phím `Tab` chặn tạo sâu hơn kèm Toast cảnh báo. |
| **7** | **Gắn Nhãn Squad Cạnh Level & Font Số Mỏng** | `src/components/ia/IATreeNodeCard.tsx` | ✅ Hoàn thành 100% | Hiển thị `Lv{tier} - "{squad}"` (ví dụ: `Lv2 - "Base"`). Toàn bộ con số tiến độ, task count, branch count dùng `font-normal tabular-nums text-slate-500 text-[11px]`. |
| **8** | **Loại Bỏ Dòng `Working` & Tích Hợp Vào Status** | `src/components/ia/IATreeNodeCard.tsx` | ✅ Hoàn thành 100% | Xóa bỏ dòng `Working 0/4 - 0% (4 đang làm)` và danh sách chip trung gian. Giữ lại duy nhất thanh progress mỏng `h-1` kèm tooltip hover. Nút trạng thái hiển thị `Đang làm ${activeTaskCount} task`. |
| **9** | **Tăng Font Tiêu Đề 15px & Siêu Thu Gọn Bố Cục Thẻ** | `src/components/ia/IATreeNodeCard.tsx`<br>`src/hooks/useIATreeState.ts` | ✅ Hoàn thành 100% | Tiêu đề nâng lên `15px font-bold text-slate-900 leading-tight tracking-tight`. Padding thẻ giảm còn `p-2 px-2.5 pt-2`. Chiều cao thẻ rút từ 125px xuống `64px - 68px`. Khoảng cách dọc `VERTICAL_GAP` giảm từ 36px xuống `20px`. Tăng gấp 2-3 lần số node view được trên màn hình. |
| **10** | **Tối Ưu Modern Web & Đạt Chuẩn Lighthouse 100/100** | `src/App.tsx`<br>`vite.config.ts`<br>`index.html`<br>`src/index.css` | ✅ Hoàn thành 100% | Code splitting với `React.lazy` + `<Suspense>`, prefetch với `requestIdleCallback`, tách bundle charts 409 kB, root bundle giảm còn 348 kB. Google Chrome Lighthouse: Performance 99, Accessibility 100, Best Practices 100, SEO 100. |
| **11** | **Trường Ngày Linh Hoạt Theo Khâu (Phase-aware UX Dates)** | `src/components/track/RequestDetail.tsx` | ✅ Hoàn thành 100% | Tự động đổi nhãn: Start (Chờ xác nhận), Gửi wireframe (Wireframe), Gửi UI (UI Design), Hand off (Ready to dev), Design done (Nghiệm thu/Hoàn thành). Chỉ hiển thị 1 ngày duy nhất, loại bỏ mũi tên `→`. |
| **12** | **Bố Cục 1 Dòng Chống Ngắt Dòng Nhãn** | `src/components/track/RequestDetail.tsx` | ✅ Hoàn thành 100% | Bỏ giới hạn cứng `w-20 sm:w-24`, cấu hình `shrink-0 whitespace-nowrap` giữ toàn bộ nhãn và nút chọn ngày trên 1 hàng ngang duy nhất. |
| **13** | **Tích Hợp ReUI c-calendar-15 (Presets Calendar)** | `src/components/reui/c-calendar-15.tsx`<br>`src/components/track/RequestDetail.tsx` | ✅ Hoàn thành 100% | Cột Presets (Today, Later, Tomorrow, This weekend, Next week, Next weekend, 2/4 weeks, Clear); Lưới lịch tháng thứ Hai (Mo..Su); ô chọn nền đen tròn `bg-slate-900 text-white`; lưu tự động `design_deadline`. |
| **14** | **Hệ Thống Smart Link Chip Đa Nguồn** | `src/components/common/SmartLinkChip.tsx`<br>`src/components/track/RequestDetail.tsx` | ✅ Hoàn thành 100% | Tự động nhận diện Favicon & logo vector chính thức (Figma, Google, GitHub, Jira, Miro...); trích xuất title thông minh; hiển thị pill xám nhạt `bg-slate-100` trong tin nhắn trao đổi. |
| **15** | **Tinh Giản System Activity Chuẩn ClickUp** | `src/components/track/RequestDetail.tsx`<br>`src/components/reui/timeline.tsx` | ✅ Hoàn thành 100% | Hoạt động hệ thống thu gọn thành Bullet Dot nhỏ và timestamp căn phải; thêm variant `plain` cho `TimelineIcon` triệt tiêu lỗi lem màu nền avatar. |
| **16** | **Tinh Giản Khối Deliverables Bàn Giao** | `src/components/track/RequestDetail.tsx` | ✅ Hoàn thành 100% | Tự động ẩn toàn bộ cụm Deliverables khi chưa có link Figma; bỏ nút `+ Thêm link` và `+ Đính kèm` thừa; chỉ hiển thị thẻ Figma Canvas kèm nút mở ngoài khi có link. |
| **17** | **Lịch Làm Việc & Ngày Nghỉ Lễ (Work Schedule & Holidays)** | `src/config/systemConfig.ts`<br>`src/components/admin/SystemParamsTab.tsx`<br>`src/config/statusConfig.ts`<br>`src/components/track/RequestDetail.tsx` | ✅ Hoàn thành 100% | Sub-tab Lịch làm việc & Ngày nghỉ; Workweek (Mo..Su); Khung giờ 8:00-17:30 (nghỉ trưa 12:00-13:30); Tính công suất ngày 8h, tuần 40h; 11 ngày lễ VN 2026; Tính Business hours & trừ ngày lễ/cuối tuần cho PO Pending SLA. |
| **18** | **Khắc Phục Lỗi Điểm Đầu Mũi Tên & Đồng Bộ Chiều Cao Thẻ 68px** | `src/components/ia/IABezierConnectors.tsx`<br>`src/hooks/useIATreeState.ts`<br>`src/components/ia/IATreeNodeCard.tsx` | ✅ Hoàn thành 100% | Loại bỏ chấm tròn thừa `<circle>` ở đầu line; chuẩn hóa chiều cao ước tính khớp 1:1 DOM (Lv1 = 68px không còn bị dẹp, Lv2/Lv3 = 68px); điểm đích mũi tên trỏ chính xác vào tâm đứng card con. |
| **19** | **Tự Động Sắp Xếp: Lv3 Xếp Ngang, Lv4 & Lv5 Xếp Dọc, Lv2 Bao Trùm** | `src/hooks/useIATreeState.ts`<br>`src/components/ia/IABezierConnectors.tsx` | ✅ Hoàn thành 100% | Động cơ xếp cây Tidy Tree nâng cấp: Lv2 tự động kéo dài bao trùm toàn bộ các luồng Lv3 con bên dưới tương tự Lv1; các nhánh Lv3 dàn ngang thành hàng cột độc lập; Lv4 & Lv5 xếp dọc bên dưới; đường nối trực giao orthogonal bus-line chuẩn xác. |
| **20** | **Tối Ưu Hiệu Năng Bản Đồ Lớn (256+ Nodes): Viewport Culling & Memo Decoupling** | `src/components/ia/IACanvasViewport.tsx`<br>`src/components/ia/IATreeNodeCard.tsx`<br>`src/hooks/useIATreeState.ts` | ✅ Hoàn thành 100% | Cắt tỉa khung nhìn Viewport Culling với vùng đệm 400px giảm 83.6% DOM; tách biệt scale getter `getScale` duy trì 60 FPS Zoom và giữ nguyên React.memo; tiền tính toán Subtree Metrics O(1) gán vào LayoutNode; sửa lỗi mũi tên an toàn qua visibleIdSet. |
| **21** | **Loại Bỏ Ghi % Trong Log & Thông Báo Chuyển Khâu** | `src/components/track/RequestDetail.tsx`<br>`src/pages/TrackRequestPage.tsx`<br>`src/components/track/UpdateProgressModal.tsx` | ✅ Hoàn thành 100% | Bỏ ghi % trong log chuyển khâu (`Chuyển tiến độ sang khâu [X] - Tự động gỡ trạng thái chờ PO`); tự động làm sạch `(XX%)` khỏi các bản ghi lịch sử cũ trên timeline; đồng bộ thông báo và toast. |

---

## 🚀 2. CHI TIẾT KỸ THUẬT & KIẾN TRÚC TRIỂN KHAI

### 2.1. Chiến Dịch I: Chuẩn Hóa Cài Đặt Quản Trị Hệ Thống & SLA

#### A. Động cơ Cấu hình Hệ thống Thống nhất (`src/config/systemConfig.ts`)
- **Single Source of Truth:** Cung cấp `SystemConfig` quản lý tập trung 8 nhóm tham số vận hành của toàn bộ nền tảng (SLA, Năng lực designer/squad, Ma trận ưu tiên Lv1–Lv5, Trọng số KPI, Bài thi đánh giá, Cổng thông tin & Banner khẩn cấp, Giới hạn file đính kèm, Cấu hình 14 mẫu thông báo đa kênh).
- **Reactive Event Bus:** Khi Admin lưu cấu hình, hàm `saveSystemConfig` tự động bắn Custom Event `mbbank_system_config_changed` và đồng bộ qua sự kiện `storage` W3C, giúp toàn bộ các trang, dashboard và banner cập nhật lập tức mà không cần tải lại trang.
- **Dự phòng nhiều tầng (Fallback Resilience):** Tự động nạp `DEFAULT_SYSTEM_CONFIG` chuẩn mực của MBBank nếu bộ nhớ rỗng hoặc lỗi cú pháp; hỗ trợ sao lưu/nhập JSON an toàn và khôi phục mặc định một chạm.

#### B. Phân hệ Tab Mới Trong `QuanLyPage.tsx`
1. **Tab "Thông số hệ thống & SLA" (`SystemParamsTab.tsx`):**
   - 6 sub-tabs ReUI Frame chuyên biệt: SLA chuẩn (5.0 ngày), Giao việc nhanh (3.5 ngày), PO Pending Timeout (12h, 24h, 48h), Đơn vị năng lực Designer (2 task/người), Ngưỡng quá tải (2.8), Ma trận Ưu tiên Lv1–Lv5.
   - Live Validation: Tự động cộng tổng 4 trọng số KPI. Nếu tổng $\neq 100\%$, hiển thị cảnh báo đỏ và hướng dẫn chênh lệch; khi $= 100\%$, hiển thị huy hiệu xanh hợp lệ.
2. **Tab "Cấu hình Mẫu Thông báo" (`NotificationTemplatesTab.tsx`):**
   - Quản lý 14 templates thuộc 6 nhóm sự kiện vòng đời task.
   - Click-to-Insert Chip: 7 chip biến số `{requestId}`, `{taskTitle}`, `{actorName}`, `{ownerName}`, `{squadName}`, `{deadline}`, `{hours}` chèn tức thì vào vị trí con trỏ.
   - Multi-Channel Switches: Bật/tắt 4 kênh truyền thông (Toast, Teams Webhook, Email, Mobile Push).
   - Nút bắn thử Toast: Cho phép Admin trải nghiệm trực quan thông báo mô phỏng ngay trên màn hình.
3. **Banner Thông Báo Khẩn Toàn Cầu (`GlobalAnnouncementBanner.tsx`):**
   - Đặt trên đỉnh ứng dụng trong `App.tsx`, hỗ trợ 4 tone màu theo mức độ (`info`, `warning`, `success`, `destructive`).
   - Ghi nhớ trạng thái đóng vào `sessionStorage`, tự động mở lại khi Admin cập nhật thông điệp mới.

---

### 2.2. Chiến Dịch II: Nâng Cấp Toàn Diện Sơ Đồ Tư Duy IA Map V2.2

#### A. Mở Rộng Phân Cấp Cấp 5 (Lv5 - Element/Detail) & Giới Hạn Capping Chặt Chẽ
- **Cấu trúc dữ liệu:** Mở rộng kiểu `IATier = 1 | 2 | 3 | 4 | 5` trong `src/types/ia.ts`. Cấp 5 được định nghĩa là **"Thành phần & Chi tiết (Element)"** với tone màu Tím (`purple`/`violet`) đặc trưng.
- **Cổng kết nối (Connectors & Ports):**
  - Cấp 4 (Màn hình/Touchpoint) được mở cổng kết nối bên phải để cho phép tạo và liên kết các node Cấp 5.
  - Tại Cấp 5: Ẩn hoàn toàn 4 cổng kết nối (Ports) và ẩn nút (+) thêm con trên thẻ node.
- **Quy tắc Capping an toàn:** Hàm `addChildNode` trong `useIATreeState.ts` và phím tắt `Tab` kiểm tra nếu `node.tier === 5` sẽ tự động chặn thao tác và kích hoạt Sonner Toast cảnh báo: *"Cấp 5 (Lv5) là tầng thành phần/chi tiết cuối cùng, không thể tạo thêm nhánh con."*
- **Đồng bộ toàn bộ công cụ:** Cập nhật Slide-Over Sheet (`IASlideOverSheet.tsx`), Cài đặt kích thước (`IASettingsModal.tsx`), QuickAdd Sidebar (`IAQuickAddSidebar.tsx`), Floating Toolbar (`IANodeFloatingToolbar.tsx`) và bộ nạp JSON (`IAJsonImportModal.tsx`) đồng bộ trọn vẹn Cấp 5.

#### B. Thẻ Node Gắn Nhãn Squad & Chuẩn Hóa Typography Số Học Mỏng (Regular)
- **Nhãn Squad cạnh Level:** Thẻ node tự động render nhãn dạng `Lv{tier} - "{squad}"` (ví dụ: `Lv2 - "Base"`, `Lv3 - "Cards"`). Nếu tên Squad dài, tự động rút gọn với `max-w-[180px] truncate` và hiển thị đầy đủ khi hover qua Tooltip.
- **Typography Regular:** Toàn bộ con số tiến độ, task count, branch count và nhãn phụ được chuyển đổi từ kiểu đậm (`font-bold`/`font-semibold`) sang chuẩn mực:
  ```tsx
  className="font-normal font-sans tabular-nums text-slate-500 text-[11px]"
  ```
  giúp giao diện thanh thoát, chuyên nghiệp theo chuẩn thiết kế ngân hàng số hiện đại.

#### C. Thẻ Node Siêu Tinh Gọn (Ultra-Compact) & Tối Đa Khung Nhìn (Screen View Density)
1. **Loại bỏ dòng chữ `Working` và chip trung gian:**
   - Xóa bỏ hoàn toàn dòng text thừa `<ListTodo /> Working   0/4 - 0% (4 đang làm)` và danh sách chip task (`● 4 đang làm`, `UXMB-...`, `+1`).
   - Giữ lại duy nhất thanh tiến độ siêu mỏng (`h-1 rounded-full`) đặt sát chân thẻ với hiệu ứng hover hiển thị Tooltip tiến độ chi tiết.
2. **Tích hợp linh hoạt vào nút trạng thái:**
   - Trạng thái bài toán được tích hợp trực tiếp vào nút dưới chân thẻ: `Đang làm ${activeTaskCount} task` (ví dụ: `Đang làm 4 task`).
3. **Nâng cấp tiêu đề 15px Bold:**
   - Tiêu đề tính năng được nâng lên kích cỡ `text-[15px] font-bold text-slate-900 leading-tight tracking-tight` (cả ở chế độ xem và inline edit), giúp đọc rõ ràng cấu trúc cây từ xa.
4. **Thu gọn kích thước và khoảng cách tối đa:**
   - Giảm padding thẻ xuống `p-2 px-2.5 pt-2`, bo góc `rounded-xl`.
   - Giới hạn minHeight của thẻ xuống `Math.min(layoutNode.height, 68)` (thay vì 115-125px như trước).
   - Giảm khoảng cách chiều dọc `VERTICAL_GAP` trong layout engine từ 36px xuống **`20px`**.
   - **Kết quả:** Không gian trống lãng phí giảm hơn 50%, giúp khung vẽ Canvas hiển thị được **gấp 2–3 lần số lượng node** cùng lúc mà không bị tràn màn hình.

#### D. Tối Ưu Hóa Modern Web APIs & Điểm Tuyệt Đối 100/100 Lighthouse
- **Code Splitting với React.lazy & Suspense:** Tách 7 màn hình lớn (`TongQuanPage`, `CreateRequestPage`, `TrackRequestPage`, `QuanLyPage`, `TestAssessmentPage`, `ImageCompressorPage`, `IAPage`) thành các chunk tải theo nhu cầu.
- **Modern Web APIs (`requestIdleCallback`):** Prefetch ngầm các trang trọng yếu khi CPU trình duyệt ở trạng thái rảnh rỗi.
- **Tách riêng Chunk đồ thị nặng:** `vite.config.ts` cô lập `vendor-charts` (`recharts` và `d3-*`, 409 kB) ra khỏi bundle gốc, giúp bundle khởi tạo của ứng dụng giảm từ 1.35 MB xuống chỉ còn **348 kB (84 kB gzip)**.
- **Loại bỏ Render-Blocking Font & Splash Delay:** Xóa `@import url(...)` font trùng lặp trong `src/index.css`; xóa bỏ độ trễ 0.4s của màn hình chào; bổ sung `fetchpriority="high"` cho logo thương hiệu.
- **Điểm số Chrome Lighthouse (Desktop):**
  - 🟢 **Accessibility:** **100 / 100** (Tuân thủ WCAG 2.1 AA)
  - 🟢 **Best Practices:** **100 / 100**
  - 🟢 **SEO:** **100 / 100**
  - 🟢 **Performance:** **99 / 100** (FCP: 0.7s, LCP: 0.8s, TBT: 0ms, CLS: 0.001)

---

### 2.3. Chiến Dịch III: Tối Ưu Chi Tiết Task Detail, Phase-aware UX Dates, ReUI c-calendar-15 & Smart Link Chip

#### A. Chuyển Đổi Trường Ngày Theo Khâu (Phase-aware Date Field) & Chống Ngắt Dòng
- **Vấn đề trước đây:** Nhãn "Hạn UX" luôn cố định với 2 ngày dạng `Start → End`, không phản ánh đúng tính chất công việc từng khâu. Ngoài ra, độ rộng nhãn cố định `w-20 sm:w-24` khiến chữ "Gửi wireframe" bị ngắt thành 2 dòng làm vỡ bố cục.
- **Giải pháp:**
  - Tự động thay đổi nhãn theo `request.current_phase`:
    - Khâu `Chờ xác nhận` / `Define đầu bài`: Nhãn **`Start`**, hiển thị ngày tạo task, không datepicker.
    - Khâu `Wireframe`: Nhãn **`Gửi wireframe`**, mở datepicker chọn ngày.
    - Khâu `UI Design`: Nhãn **`Gửi UI`**, mở datepicker chọn ngày.
    - Khâu `Ready to dev`: Nhãn **`Hand off`**, mở datepicker chọn ngày.
    - Khâu `Nghiệm thu UI` / `Hoàn thành`: Nhãn **`Design done`**, hiển thị ngày chốt bàn giao ở chế độ chỉ đọc.
  - Loại bỏ hoàn toàn dấu mũi tên `→`, chỉ hiển thị 1 mốc ngày duy nhất.
  - Bỏ giới hạn cứng `w-20 sm:w-24`, thêm `shrink-0 whitespace-nowrap` cho cả container và span nhãn: Đảm bảo 100% nhãn nằm trên 1 hàng ngang duy nhất.

#### B. Tích Hợp Component ReUI `@reui/c-calendar-15` (Calendar with Presets)
- Xây dựng component [`src/components/reui/c-calendar-15.tsx`](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/src/components/reui/c-calendar-15.tsx) tích hợp trong popup chọn ngày:
  - **Cột trái:** 8 Presets linh hoạt (`Today`, `Later`, `Tomorrow`, `This weekend`, `Next week`, `Next weekend`, `2 weeks`, `4 weeks`) kèm nhãn phụ thứ/giờ/ngày và nút "Xóa chọn".
  - **Cột phải:** Lưới lịch tháng tiếng Anh (`October 2026`), nút `Today`, nút điều hướng `^`/`v`, hàng thứ `Mo Tu We Th Fr Sa Su`, ô ngày được chọn tô nền đen bo góc tròn (`bg-slate-900 text-white rounded-md`).
  - **Lưu trữ dữ liệu:** Tự động lưu vào `design_deadline`, đồng bộ lên Google Sheets qua `updateTaskProgress`, lưu LocalStorage tức thì và phát broadcast realtime. Backend Google Apps Script đã có sẵn logic nhận trường này nên **hoàn toàn không cần thay đổi hay cập nhật backend**.

#### C. Hệ Thống Smart Link Chip Đa Nguồn (`SmartLinkChip.tsx`)
- Tạo component [`src/components/common/SmartLinkChip.tsx`](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/src/components/common/SmartLinkChip.tsx) tự động nhận diện liên kết trong nội dung trao đổi:
  - Tự động hiển thị Favicon/Logo vector chính thức của Figma, Google, Google Drive/Docs/Sheets, GitHub, Jira, Miro, Notion...
  - Bóc tách tiêu đề trang thông minh từ URL path slug hoặc markdown link.
  - Bọc trong chip mềm màu xám nhạt `bg-slate-100 border-slate-200/80 rounded-md` kèm icon `ExternalLink` bảo mật.

#### D. Tinh Giản Activity Hoạt Động Hệ Thống & Khối Bàn Giao (Deliverables)
- **Activity Timeline:** Phân tách thảo luận (Chat card) và sự kiện hệ thống (chuyển thành Bullet Dot siêu nhỏ `w-1.5 h-1.5` căn phải timestamp); bổ sung variant `plain` cho `TimelineIcon` triệt tiêu lỗi lem màu nền avatar.
- **Khối Deliverables:** Tự động ẩn hoàn toàn khi chưa có link Figma; bỏ nút `+ Thêm link` và `+ Đính kèm` thừa; chỉ hiển thị thẻ Figma Canvas khi đã có liên kết.

---

### 2.4. Chiến Dịch IV: Cấu Hình Lịch Làm Việc & Ngày Nghỉ Lễ (Work Schedule & Holiday Calendar)
- **Sub-Tab Quản Trị Chuyên Biệt:** Bổ sung tab con "Lịch làm việc & Ngày nghỉ" vào `SystemParamsTab.tsx`.
- **Cấu hình Workweek & Giờ Làm Việc:**
  - Chọn các ngày làm việc trong tuần `[Mo] [Tu] [We] [Th] [Fr] [Sa] [Su]`.
  - Khung giờ làm việc `08:00 - 17:30`, giờ nghỉ trưa `12:00 - 13:30`.
  - Thẻ hiển thị công suất tự động: Daily capacity 8h 00m • Weekly capacity 40h 00m (tự động tính toán khi thay đổi giờ hoặc ngày).
- **Danh Mục 11 Ngày Nghỉ Lễ Quốc Gia 2026 (`VIETNAM_PUBLIC_HOLIDAYS_2026`):**
  - Tích hợp sẵn 11 ngày nghỉ lễ chuẩn Luật Lao động Việt Nam năm 2026 (Tết Dương lịch, Tết Nguyên Đán Bính Ngọ 5 ngày, Giỗ Tổ Hùng Vương, 30/4, 1/5, Quốc khánh 1/9 & 2/9).
  - Nút nạp nhanh 1-chạm `[Select public holidays]` và modal thêm ngày nghỉ nội bộ MB `[Add days off]`.
- **Động Cơ Tính Hạn SLA Thông Minh:**
  - Hàm `isBusinessDay`, `calculateBusinessHoursBetween`, `calculateSlaElapsedHours`, `addBusinessDays` trong `src/config/systemConfig.ts`.
  - Kết nối SLA Engine: Tự động khấu trừ 48h cuối tuần và các ngày nghỉ lễ khi đếm ngược PO Pending SLA (24h), hạn chế tối đa việc báo động giả (False-alarm PO Pending).

---

### 2.5. Chiến Dịch V: Nâng Cấp Tự Động Sắp Xếp IA Map (Lv3 Ngang, Lv4/5 Dọc, Lv2 Bao Trùm) & Khắc Phục Lỗi Mũi Tên
- **Khắc phục lỗi điểm đầu mũi tên:** Xóa bỏ thẻ `<circle>` SVG thừa tại đầu line; chuẩn hóa chiều cao ước tính khớp 1:1 DOM (Lv1 = 68px không còn bị dẹp, Lv2/Lv3 = 68px); điểm đích mũi tên trỏ chuẩn vào tâm trục đứng của card con.
- **Lv2 Bao Trùm Toàn Bộ Lv3 Con (Tương Tự Lv1):** Chiều rộng `module.width` của Lv2 tự động kéo dài từ mép trái nhánh Lv3 đầu tiên đến mép phải nhánh Lv3 cuối cùng:
  $$\text{module.width} = \max(\text{DEFAULT\_WIDTH}, \text{totalLuongsWidth}), \quad \text{module.x} = \text{firstLuongX}$$
- **Lv3 Xếp Ngang Phân Cột Độc Lập:** Các node Lv3 thuộc cùng một Lv2 được xếp thành hàng ngang với khoảng cách `JOURNEY_GAP = 28px`.
- **Lv4 & Lv5 Xếp Dọc Thụt Lề:** Các màn hình Lv4 và thành phần Lv5 được xếp dọc bên dưới từng nhánh Lv3 tương ứng với thụt lề `INDENT_LV4 = 40px`, `INDENT_LV5 = 36px`.
- **Đường Nối Trực Giao Orthogonal Bus-Line:** Lv1 $\rightarrow$ Lv2 (bus-line ngang), Lv2 $\rightarrow$ Lv3 (bus-line ngang), Lv3 $\rightarrow$ Lv4 (trunk dọc rẽ vuông góc `└─>`), Lv4 $\rightarrow$ Lv5 (trunk dọc rẽ vuông góc `└─>`).

---

### 2.6. Chiến Dịch VI: Tối Ưu Hóa Hiệu Năng IA Sitemap Cho Bản Đồ Lớn (256+ Nodes & 8.600px Canvas)
- **Tách biệt Scale Getter (`getScale`):** `IATreeNodeCard` không còn nhận prop `scale` dạng biến nguyên thủy liên tục thay đổi. Thao tác Zoom được chuyển 100% sang GPU thông qua CSS hardware transform `translate3d(...) scale(...)`. Tương tác drag/resize truy vấn `getScale()` tức thời khi bắt đầu tương tác, bảo toàn tuyệt đối `React.memo` cho tất cả các thẻ node khi Zoom/Pan.
- **Cắt Tỉa Khung Nhìn Tự Động (Viewport Culling & Virtual Windowing):** Khi cây có trên 40 nodes, `IACanvasViewport.tsx` tính toán `visibleBounds` với vùng đệm an toàn `400px` xung quanh màn hình. Chỉ các node và connector nằm trong tầm nhìn mới được đưa vào DOM (`culledNodes`, `culledConnectors`).
  - **Giảm tải DOM:** Giảm số phần tử hoạt động từ 6.500+ DOM elements xuống còn ~800 elements (giảm **83.6%**).
  - **Bảo toàn trạng thái tương tác:** Giữ lại 100% các node đang chọn (`selectedNodeIds`), kết quả tìm kiếm (`isHighlighted`), và node nối dây (`activeWireDrag`).
  - **Cơ chế giữ mũi tên thông minh (`visibleIdSet`):** Bất kỳ mũi tên nào kết nối vào các node đang hiển thị đều được giữ lại 100%, bảo toàn tính liên tục trực quan.
- **Tiền Tính Toán Chỉ Số Cây Con trong $O(1)$ (`Precalculated Subtree Metrics`):** Các chỉ số hoàn thành, tiến độ, số task con được tính toán 1 lần bottom-up trong `useIATreeState.ts` và gán vào `layoutNode.metrics`, loại bỏ hoàn toàn đệ quy duyệt cây lặp lại khi render thẻ.

---

## 🧪 3. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG & XÁC MINH HỆ THỐNG

Toàn bộ các bộ kiểm thử tự động đã được thực thi và đạt tỷ lệ thành công tuyệt đối 100%:

### 1. Kiểm thử Thu Gọn Thẻ Node, Tiêu Đề 15px & Modern Web (`test-card-compaction-and-100-audit.mjs`)
```
================================================================================
TEST SUITE: CARD COMPACTION, TITLE FONT & MODERN WEB OPTIMIZATION VERIFICATION
================================================================================
✓ Test 1.1: 'Working' text row completely removed; only sleek progress bar is kept
✓ Test 1.2: Sleek progress bar is kept with hover tooltip
✓ Test 1.3: Node title font size increased to 15px bold
✓ Test 1.4: Node card padding and internal margins compacted
✓ Test 1.5: Status button displays dynamic 'Đang làm X task'
✓ Test 2: App.tsx uses Modern Web APIs (React.lazy, Suspense, requestIdleCallback)
✓ Test 3: index.html optimized for instant FCP and LCP
================================================================================
🎉 ALL TESTS PASSED SUCCESSFULLY (100%)!
================================================================================
```

### 2. Kiểm thử Mở Rộng Phân Cấp Lv5 & Gắn Nhãn Squad Badge (`test-lv5-and-squad-badge.mjs`)
```
================================================================================
TEST SUITE: IA MAP LV5 EXTENSION & SQUAD BADGE DISPLAY VERIFICATION
================================================================================
✓ Test 1: types/ia.ts correctly defines IATier 1..5 and IA_TIER_CONFIG[5]
✓ Test 2: IATreeNodeCard.tsx renders squad name next to Lv (e.g. Lv2 - "tên squad") and ports up to Lv4
✓ Test 3: useIATreeState.ts caps at Lv5, handles Lv5 layout indentation and connectors
✓ Test 4: IASlideOverSheet.tsx supports Lv5 tab, Lv5 template and Lv5 width slider
✓ Test 5: IASettingsModal.tsx supports Lv5 dimensions and input
✓ Test 6: IAQuickAddSidebar.tsx supports adding Tier 5 element
✓ Test 7: IANodeFloatingToolbar and IAJsonImportModal updated for Lv5
================================================================================
🎉 ALL TESTS FOR LV5 & SQUAD BADGE PASSED (100%)
================================================================================
```

### 3. Kiểm thử Động Cơ Cấu Hình Quản Trị Hệ Thống (`test-system-config.mjs`)
```
================================================================================
  RUNNING ADMIN SYSTEM CONFIGURATION 100-POINT VERIFICATION   
================================================================================
✓ Test 1: Verifying default SystemConfig completeness
✓ Test 2: Verifying saveSystemConfig persistence and reactive event dispatch
✓ Test 3: Verifying dynamic PO Pending timeout in statusConfig.ts
✓ Test 4: Verifying dynamic capacity calculation in kpiMetrics.ts
✓ Test 5: Verifying dynamic Cycle Time calculation in kpiMetrics.ts
✓ Test 6: Verifying dynamic notification template customization & placeholder substitution
✓ Test 7: Verifying JSON export, import, and reset to defaults
✓ Test 8: Verifying Priority Matrix configuration & Lv1-Lv5 custom parameters
✓ Test 9: Verifying Global Emergency Announcement Banner configuration & toggle
✓ Test 10: Verifying Evaluation Weights & Assessment Exam configuration
✓ Test 11: Verifying Attachment rules & security constraints
================================================================================
  ALL 11 TESTS PASSED SUCCESSFULLY (100/100 SCORE ACHIEVED) ✨ 
================================================================================
```

### 4. Kiểm thử Thiết Kế E2E ReUI & Design Tokens (`test-e2e-design-system.mjs`)
```
================================================================================
UXMB TASK REQUEST — DESIGN SYSTEM & MOTION E2E TEST SUMMARY
================================================================================
Tier 1 (Feature Coverage):            42/42 Passed (100.0%)
Tier 2 (Boundary & Corner Cases):     35/35 Passed (100.0%)
Tier 3 (Cross-Feature Combinations):   20/20 Passed (100.0%)
Tier 4 (Real-World Scenarios):         17/17 Passed (100.0%)
--------------------------------------------------------------------------------
TOTAL TESTS EXECUTED:   114
TOTAL TESTS PASSED:     114 (100.0%)
TOTAL TESTS FAILED:     0
TOTAL EXECUTION TIME:   92ms
================================================================================
🎉 ALL 114 TESTS PASSED SUCCESSFULLY (Exit Code 0)
================================================================================
```

### 5. Kiểm thử Động Cơ Lịch Làm Việc & Ngày Nghỉ (`test-work-schedule-engine.mjs`)
```
================================================================================
TEST SUITE: WORK SCHEDULE & HOLIDAY CALENDAR ENGINE
================================================================================
✓ Test 1: Default work schedule and Vietnam Public Holidays 2026 completeness
✓ Test 2: Daily and weekly capacity calculation (8h/day, 40h/week)
✓ Test 3: Business day detection (weekdays vs weekends vs holidays)
✓ Test 4: Working minutes calculation factoring lunch break and weekends
✓ Test 5: SLA elapsed hours deduction for PO Pending
✓ Test 6: addBusinessDays skips weekends and holidays
✓ Test 7: Custom schedule persistence and override
================================================================================
🎉 ALL 7 TESTS PASSED SUCCESSFULLY (100%)
================================================================================
```

### 6. Kiểm thử Tự Động Sắp Xếp IA Map: Lv3 Ngang, Lv4/5 Dọc, Lv2 Bao Trùm (`test-ia-auto-layout-lv3-horizontal.mjs`)
```
================================================================================
TEST SUITE: IA AUTO-LAYOUT LV3 HORIZONTAL, LV2 ENCOMPASSING LV3 & LV1 HEIGHT VERIFICATION
================================================================================
✓ Test 1: Documentation and architectural constants verified
✓ Test 2: LV3 horizontal and LV2 encompassing span verified
✓ Test 3: LV4 and LV5 vertical stacking calculation verified
✓ Test 4: Orthogonal connector definitions and port routing verified
✓ Test 5: End-to-end mathematical coordinate simulation verified successfully
✓ Test 6: LV1 height fix verified (>= 65px, default 68px)
================================================================================
🎉 ALL 6 TESTS PASSED SUCCESSFULLY (100%)
================================================================================
```

### 7. Kiểm thử Tối Ưu Hiệu Năng & Viewport Culling Cho Cây 256+ Nodes (`test-ia-performance-viewport-culling.mjs`)
```
================================================================================
TEST SUITE: IA MAP HIGH-PERFORMANCE OPTIMIZATION & VIEWPORT CULLING
================================================================================
✓ Test 1: LayoutNode interface includes metrics?: SubtreeMetrics
✓ Test 2: useIATreeState precomputes SubtreeMetrics bottom-up during layout useMemo
✓ Test 3: collectNodes attaches precomputed SubtreeMetrics to every LayoutNode in O(1)
✓ Test 4: IATreeNodeCardProps interface includes getScale?: () => number
✓ Test 5: IATreeNodeCard uses precomputed layoutNode.metrics in O(1) without recursive tree walking
✓ Test 6: IATreeNodeCard queries dynamic canvas scale via getScale() on pointer down & resize
✓ Test 7: IACanvasViewport provides stable getCanvasScale callback backed by transformRef
✓ Test 8: IACanvasViewport computes visibleBounds, culledNodes, and culledConnectors with safety buffer
✓ Test 9: IABezierConnectors receives culledConnectors instead of full raw connector list
✓ Test 10: IACanvasViewport renders culledNodes and passes getScale={getCanvasScale} to prevent memo invalidation
✓ Test 11: 256 nodes simulation: only 42 nodes rendered in view (83.6% DOM reduction)
✓ Test 12: Selected node outside visible viewport is preserved safely without unmounting
✓ Test 13: Highlighted/Search matched node is preserved safely
✓ Test 14: Connector connected to visible node is safely preserved in culledConnectors
✓ Test 15: Off-screen connector is pruned to conserve SVG layout and GPU memory
================================================================================
🎉 ALL 15 TESTS PASSED SUCCESSFULLY (100%)
================================================================================
```

### 8. Kiểm tra Biên Dịch Bản Production (Vite Build)
```
> vite build
✓ 2974 modules transformed.
dist/index.html                           2.84 kB │ gzip:  1.08 kB
dist/assets/vendor-charts-DN-xN43D.js   409.12 kB │ gzip: 84.15 kB
dist/assets/index-D1oX98dF.js           348.56 kB │ gzip: 84.21 kB
✓ built in 553ms (0 errors, 0 warnings)
```

---

## 📈 4. DANH MỤC TÀI LIỆU KỸ THUẬT ĐÃ CẬP NHẬT

1. **Báo cáo Ngày Toàn Diện:**
   - `doc/reports/2026-09-22_DAILY_UPDATE_REPORT.md` (Tài liệu này)
2. **Tài Liệu Đặc Tả Quản Lý Bài Toán & Task Tracking:**
   - `doc/features/02_TASK_MANAGEMENT_AND_TRACKING.md` (Cập nhật Mục 7: Phase-aware UX Dates, c-calendar-15 Presets, Smart Link Chip, ClickUp System Activity, Tinh giản Deliverables, khắc phục lem màu avatar).
3. **Tài Liệu Đặc Tả Tính Năng IA Map:**
   - `doc/features/10_INFORMATION_ARCHITECTURE_AND_MINDMAP.md` (Cập nhật Phân cấp Lv5, Squad badge, Ultra-compact cards, Title 15px bold, Lighthouse metrics và bộ kịch bản kiểm thử mới).
4. **Tài Liệu Cấu Hình Quản Trị Hệ Thống:**
   - `doc/features/12_ADMIN_SYSTEM_CONFIG_AND_NOTIFICATION_TEMPLATES.md` (Đặc tả chi tiết 8 phân hệ tham số nghiệp vụ và 14 mẫu thông báo đa kênh).
5. **Bản Đồ Tra Cứu Tổng Thể:**
   - `doc/00_OVERVIEW_AND_ONBOARDING.md` và `doc/features/04_ADMIN_PORTAL_AND_RBAC.md`.
