# 🧭 TÀI LIỆU DỰ ÁN MB UX REQUEST PORTAL — KIẾN TRÚC & HƯỚNG DẪN DÀNH CHO DEVELOPER MỚI

> **Hệ thống:** MB UX Request Portal & Task Management System  
> **Mục tiêu tài liệu:** Giúp kỹ sư mới tiếp nhận dự án hiểu toàn diện hệ thống trong 30 phút, biết chính xác **CẦN ĐỌC Ở ĐÂU** khi làm tính năng mới và khi bảo trì/sửa tính năng cũ để đạt **100 điểm an toàn & phân tích phạm vi ảnh hưởng (Impact Analysis)**.

---

## 🎯 BẢN ĐỒ TRA CỨU NHANH (QUICK NAVIGATION MAP)

Khi bạn được giao một nhiệm vụ, hãy mở ngay tài liệu chuyên trách tương ứng dưới đây trong thư mục `doc/`:

```
Deploy App/doc/
├── 📖 00_OVERVIEW_AND_ONBOARDING.md             <-- BẠN ĐANG ĐỌC TÀI LIỆU NÀY (Tổng quan, Bản đồ tra cứu)
├── 📐 ONBOARDING_DOCUMENTATION_STANDARD.md       <-- QUY CHUẨN SOẠN THẢO TÀI LIỆU ONB: 5 Nguyên tắc, 7 Phần bắt buộc, Rubric chấm điểm
├── 🚀 GIT_WORKFLOW_VERCEL_PIPELINE.md            <-- QUY TRÌNH DEPLOY VERCEL: Tách nhánh develop/main, Zero-Downtime, Cô lập Sheet test
├── 🛡️ CLOUDFLARE_HARDENING_GUIDE.md             <-- CẨM NANG BẢO VỆ HẠ TẦNG: Cloudflare WAF, Bot Fight Mode, DNS an toàn
├── 🎨 UI_DESIGN_SYSTEM.md                        <-- TÀI LIỆU THIẾT KẾ TOÀN DIỆN: Tokens (#0F172A), Pills, Badges, ReUI Sonner Toast
│
├── 📂 reports/                        <-- BÁO CÁO CẬP NHẬT HỆ THỐNG ĐỊNH KỲ:
│   ├── 📋 2026-09-04_DAILY_UPDATE_REPORT.md  <-- Báo cáo chi tiết nâng cấp ReUI 8 Tabs, Role Preview, Xuất CSV
│   ├── 📋 2026-09-05_DAILY_UPDATE_REPORT.md  <-- Báo cáo Tool Quy tắc Trạng thái tự động, Gantt PO Pending, Đồng nhất UI Badge & Typography
│   ├── 📋 2026-09-07_DAILY_UPDATE_REPORT.md  <-- Báo cáo Nâng cấp Toàn diện: Image Compressor Standalone & JSZip, Chuẩn 2 loại Pending, @SenToPO Trigger, Đồng bộ 2 Chiều Google Sheets
│   ├── 📋 2026-09-15_DAILY_UPDATE_REPORT.md  <-- Báo cáo Toàn diện: Information Architecture & Mindmap Canvas, Đồng nhất Header Style Track Task, Phân quyền RBAC IA, Đồng bộ Sản phẩm Quản trị, Bảo mật OTP
│   ├── 📋 2026-09-16_DAILY_UPDATE_REPORT.md  <-- BÁO CÁO TOÀN DIỆN 16/09: Format Due Date Gantt DD/MM/YYYY, Component Kbd ReUI, Dynamic Email Lookup, Masking Task PO/Business, IA Map v2 (8 tiêu chuẩn vượt ReUI Flow) & Chế độ View-Only tinh gọn
│   ├── 📋 2026-09-16_DASHBOARD_REUI_AND_TIMELINE_V2_REPORT.md  <-- Báo cáo: Tích hợp chuẩn @reui/c-chart-20 (Donut), @reui/c-chart-17 (Trending), @reui/c-timeline-3 (Reverse Timeline, Spinner, Card Ảnh 4), Đồng bộ Tab Sản phẩm Admin
│   ├── 📋 2026-09-16_UI_STANDARDIZATION_REUI_SONNER_AND_RESPONSIVE_REPORT.md  <-- Báo cáo: Chuẩn hóa 4 layout mẫu thực tế, Nút Dark Navy #0F172A, Status Pills dot đồng màu, ReUI Sonner Toast 3D Stacking, Fix Responsive 375-1440px
│   ├── 📋 2026-09-16_DUAL_SESSION_POLICY_AND_ADMIN_SETTINGS_REPORT.md  <-- Báo cáo: Cơ chế Phiên song song (Fixed 8h & Sliding 24h khi thoát), W3C Page Lifecycle, Cấu hình Quản trị 2 tầng (RBAC & Nhân sự), Đồng bộ Backend GAS 14 cột
│   ├── 📋 2026-09-17_DAILY_UPDATE_REPORT.md  <-- Báo cáo: Magnific UI IA Map (Middle-Click Pan, Tooltip ReUI, 4 Tầng Capping Lv4, Lateral Dock & Sheet), Modal Xem chi tiết node, Khôi phục Release dự kiến, Khử co giật Stepper, Polling 2 chiều OTP
│   ├── 📋 2026-09-22_DAILY_UPDATE_REPORT.md  <-- BÁO CÁO TOÀN DIỆN 22/09: Admin Settings, System Config, Notification Templates, Banner khẩn cấp, KPI & SLA
│   ├── 📋 2026-09-23_CALENDAR_PLANNER_AND_ADMIN_SETTINGS_REPORT.md  <-- Báo cáo Planner/Calendar 4 tầng dữ liệu và cấu hình lịch trong Admin
│   ├── 📋 2026-09-26_DAILY_UPDATE_REPORT.md  <-- Báo cáo Motion runtime, Sonner stack, đồng bộ task và nickname persistence
│   ├── 📋 2026-09-27_DAILY_UPDATE_REPORT.md  <-- Báo cáo Task ↔ IA, cloud merge, IA canvas refinements và nghiên cứu Designer Planner
│   ├── 📋 2026-09-28_DAILY_UPDATE_REPORT.md  <-- Báo cáo Designer Planner, Schedule Meeting, AI briefing, right sheet và planned work date persistence
│   ├── 📋 2026-09-29_DAILY_UPDATE_REPORT.md  <-- Báo cáo Designer Planner cá nhân, 4-step Agent Trace, Executive Typewriter Streaming & Clickable Link, Thẻ đứng im (CLS=0), Phân quyền sửa Event
│   └── 📋 2026-09-30_DAILY_UPDATE_REPORT.md  <-- Báo cáo Chuẩn hóa ReUI Empty State (1 & 10), Tinh gọn UI Priority kéo thả, Executive Summary All-in-One 1 lần xuất toàn bộ & Sửa triệt để lỗi đơ luồng tóm tắt 4/4
│
├── 📂 features/                       <-- DANH MỤC TÍNH NĂNG TÁCH BIỆT CHI TIẾT:
│   ├── 🔐 01_AUTH_AND_SESSION_MANAGEMENT.md
│   │   └── Đọc khi: Sửa/Làm mới tính năng Đăng nhập, OTP Teams, Cơ chế Phiên song song (Dual Session: Cố định 8h & Trượt 24h khi thoát app), Cấu hình Quản trị phiên 2 tầng (Role & User Override), Tự động đồng bộ vai trò từ Sheet USERS (14 cột), Đặc quyền Admin xem trước vai trò (Role Preview), Token, Đăng xuất, Chính sách an toàn OTP.
│   │
│   ├── 📊 02_TASK_MANAGEMENT_AND_TRACKING.md
│   │   └── Đọc khi: Sửa/Làm mới Kanban/Gantt, RequestDetail, nickname, phase/status, Viewers hoặc liên kết một-một giữa Task và node IA theo Product/Squad/Lv1-Lv5.
│   │
│   ├── 📝 03_REQUEST_CREATION_FLOW.md
│   │   └── Đọc khi: Sửa/Làm mới Màn hình tạo yêu cầu (RequestForm), Ràng buộc sản phẩm của PO, Đính kèm tài liệu Google Drive, Hiệu ứng Confetti (Matter.js).
│   │
│   ├── ⚙️ 04_ADMIN_PORTAL_AND_RBAC.md
│   │   └── Đọc khi: Sửa/Làm mới Màn hình Admin (QuanLyPage), Chuẩn ReUI Application Settings 2 cột (11 tabs), Status Automation Rules Tool (6 trạng thái tự động), Phân quyền 4 Role, Role Preview, Xuất CSV, Đồng bộ Google Sheet 2 chiều, Deep link Hash URL, Đồng bộ Sản phẩm sang IA.
│   │
│   ├── 💾 05_GOOGLE_SHEET_AND_GAS_BACKEND.md
│   │   └── Đọc khi: Đụng tới Google Apps Script, JSON Core, nickname read-after-write, empty-task-list guard, IA-only sync theo `cap-ia-edit`, GViz USERS hoặc Upload Drive.
│   │
│   ├── 🎨 06_DESIGN_SYSTEM_AND_UI_GUIDELINE.md
│   │   └── Đọc khi: Thiết kế UI/component, token/spacing/radius, Sidebar offset, Sonner stack/close button hoặc chính sách MotionConfig và `prefers-reduced-motion`.
│   │
│   ├── 🎓 07_TEST_ASSESSMENT_MODULE.md
│   │   └── Đọc khi: Sửa/Làm mới Phân hệ Khảo sát & Đánh giá Năng lực UX (Bộ câu hỏi, Làm bài trắc nghiệm, Import/Export Excel bằng XLSX, Chấm điểm).
│   │
│   ├── 🛠️ 08_BUILTIN_TOOLS_AND_UTILITIES.md
│   │   └── Đọc khi: Sửa/Dùng công cụ nén ảnh Client-side độc lập (`ImageCompressorPage.tsx` & `ImageCompressorModal.tsx`), Đóng gói file ZIP hàng loạt (`jszip`), Chuyển đổi định dạng WebP/PNG/JPEG.
│   │
│   ├── 🔄 09_MASTERDATA_AND_TWO_WAY_SYNC_SETTINGS.md
│   │   └── Đọc khi: Sửa/Làm mới Master Data (UX Squads, Phân bổ PO/Business/Designers theo vai trò, Sản phẩm số MBBank), Đồng bộ 2 chiều (Push/Pull) với Google Sheets (`RAW_SETTINGS`), Khử trùng lặp Activity Comments (Deduplication Engine).
│   │
│   ├── 🗺️ 10_INFORMATION_ARCHITECTURE_AND_MINDMAP.md
│   │   └── Đọc khi: Sửa IA map, Task ↔ IA, lọc Product/Squad, quyền `cap-ia-edit`, dirty-product cloud merge, màu node theo level, auto layout, bottom dock, import/export JSON hoặc chế độ view-only.
│   │
│   ├── 📈 11_DASHBOARD_AND_AIOPS_REUI.md
│   │   └── Đọc khi: Sửa/Làm mới Dashboard điều hành AIOps, Biểu đồ Donut Backlog & Pending (@reui/c-chart-20), Biểu đồ Line Squad Trending (@reui/c-chart-17), NewsFeed Timeline ngược & auto-scroll (@reui/c-timeline-3), Thẻ task Ảnh 4 (Reviewing sources), Double Shell Cards, Lọc theo Tab sản phẩm Admin.
│   │
│   ├── ⚙️ 12_ADMIN_SYSTEM_CONFIG_AND_NOTIFICATION_TEMPLATES.md
│   │   └── Đọc khi: Sửa/Làm mới các thông số vận hành động (SLA ngày, Tải trọng & Ngưỡng quá tải Designer, Ma trận Độ ưu tiên Lv1-Lv5, Trọng số KPI, Cấu hình Đề thi, Banner khẩn cấp GlobalAnnouncementBanner), Tùy biến 14 Mẫu thông báo đa kênh (In-app, Teams, Email, Push) với chip placeholder động, Cơ chế reactive event bus mbbank_system_config_changed, Xuất/Nhập/Khôi phục cấu hình JSON.
│   │
│   └── 📅 13_UX_TEAM_PLANNER_AND_CALENDAR.md
│       └── Đọc khi: Sửa Planner/Calendar 4 tầng, Designer Planner cá nhân, ReUI Empty State (1 & 10), Kéo thả task xếp ngày, Agent Activity Trace, Executive Summary All-in-One typewriter streaming & deep-link, KPI cá nhân, Right-Sheet, hoặc cấu hình lịch Admin.
```

---

## 🏆 CÔNG THỨC ĐẠT "100 ĐIỂM" KHI LÀM TÍNH NĂNG MỚI HOẶC SỬA TÍNH NĂNG CŨ

### 1. KHI LÀM 1 TÍNH NĂNG MỚI (NEW FEATURE):
Để đạt 100 điểm, hãy tự trả lời 5 câu hỏi cốt tử sau bằng cách tra cứu các doc:
1. **Phân quyền (RBAC):** Tính năng này cho ai dùng (`Admin`, `Design Owner`, `Designer`, hay `PO`)? Menu của nó nằm ở đâu trong Sidebar (`Platform` hay `Resources`)?  
   👉 *Đọc ngay:* `features/04_ADMIN_PORTAL_AND_RBAC.md` và `features/01_AUTH_AND_SESSION_MANAGEMENT.md`.
2. **Nơi lưu trữ dữ liệu (Storage):** Dữ liệu mới lưu ở đâu? LocalStorage, Google Sheet JSON (`RAW_REQUESTS` / `RAW_SETTINGS`), hay Google Drive?  
   👉 *Đọc ngay:* `features/05_GOOGLE_SHEET_AND_GAS_BACKEND.md` và `features/09_MASTERDATA_AND_TWO_WAY_SYNC_SETTINGS.md`.
3. **Giao diện & Trải nghiệm (UI/UX):** Component mới tuân thủ Design System không? Có bị Sidebar che khuất trên Desktop không (`md:ml-60`)?  
   👉 *Đọc ngay:* `features/06_DESIGN_SYSTEM_AND_UI_GUIDELINE.md`.
4. **Đồng bộ trạng thái (Events):** Component khác có cần biết sự thay đổi này không? (Ví dụ: Đổi avatar, đổi menu, đổi session thì cần bắn event gì)?  
   👉 *Đọc ngay:* Bảng Event Bus trong tài liệu này và `features/04_ADMIN_PORTAL_AND_RBAC.md`.
5. **Kiểm tra biên dịch:** Chạy lệnh `npm run build` có đạt 0 lỗi TypeScript không?

---

### 2. KHI SỬA 1 TÍNH NĂNG CŨ (BUG FIX / REFACTOR):
Để đạt 100 điểm, tuyệt đối không nhảy vào sửa code ngay! Hãy làm theo 3 bước:
1. **Tra cứu Ma trận Phạm vi Ảnh hưởng (Impact Matrix):** Xem file bạn sắp sửa nằm ở dòng nào trong ma trận, những component/trang nào đang dùng chung state hoặc logic đó.  
   👉 *Xem bảng Ma trận tại Mục 4 bên dưới hoặc file doc chi tiết của tính năng đó.*
2. **Kiểm tra tính tương thích ngược (Backward Compatibility):** Nếu sửa schema của Task (`UXRequest`) hoặc cấu trúc `localStorage`, code cũ có bị crash khi gặp dữ liệu cũ chưa có trường mới không? Đã thêm giá trị fallback mặc định (`?? []`, `?? ""`) chưa?
3. **Kiểm tra Backend Cloud:** Nếu sửa file `google-apps-script-backend.js`, bạn đã nhớ rằng Google Apps Script chạy trên Cloud và cần Deploy New Version chưa?

---

## 🏗️ TỔNG QUAN KIẾN TRÚC HỆ THỐNG & TECH STACK

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND CLIENT APPLICATION                           │
│     React 19 + TypeScript 5.7 + Vite 8 + Tailwind CSS v4 + Framer Motion        │
│    Radix UI Slot + ReUI / JolyUI Design System + Matter.js + XLSX + JSZip       │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ RESTful HTTPS / JSON Payloads
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        GOOGLE APPS SCRIPT SERVERLESS API                        │
│                 (google-apps-script-backend.js - Deploy trên Cloud)             │
│        Endpoints: doGet (query, sync) & doPost (create, update, upload, otp)    │
└────────────────────┬─────────────────────────────┬──────────────────────────────┘
                     │                             │
                     ▼                             ▼
┌────────────────────────────────────────┐ ┌──────────────────────────────────────┐
│       GOOGLE SHEETS DATA VAULT         │ │      GOOGLE DRIVE ASSET STORAGE      │
│  - RAW_REQUESTS (Core JSON Payload)    │ │  - UX_Portal_Avatars (Ảnh đại diện)  │
│  - RAW_SETTINGS (Cấu hình hệ thống)    │ │  - UX_Portal_Attachments (Tài liệu)  │
│  - Requests_View (Bảng xem nghiệp vụ)  │ └──────────────────────────────────────┘
│  - USERS / Users_View (Danh sách USERS)│
└────────────────────────────────────────┘
                     │
                     ▼ Webhook / Adaptive Cards
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MICROSOFT TEAMS NOTIFICATION & OTP                      │
│                  Gửi mã xác thực 6 số và thông báo yêu cầu mới                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ CƠ CHẾ SỰ KIỆN TOÀN CỤC (GLOBAL EVENT BUS)

Hệ thống sử dụng các sự kiện trình duyệt tiêu chuẩn (`window.dispatchEvent(new Event(...))`) để các component đồng bộ dữ liệu tức thì:

| Tên Event | Nơi phát ra | Component lắng nghe | Tác dụng |
| :--- | :--- | :--- | :--- |
| `auth_session_changed` | `otpAuthService.ts`, `Sidebar.tsx` | `App.tsx`, `Sidebar.tsx`, `TrackRequestPage.tsx` | Cập nhật thông tin đăng nhập, avatar, hoặc reset giao diện khi đăng xuất |
| `nav_visibility_changed`| `QuanLyPage.tsx` (Tab 1) | `Sidebar.tsx` | Cập nhật tức thì thứ tự hoặc trạng thái ẩn/hiện của các menu trên Sidebar |
| `storage` | `QuanLyPage.tsx`, `googleSheetService.ts`| Các trang liên quan | Báo hiệu dữ liệu cấu hình trong `localStorage` đã thay đổi |
| `ux_portal_tasks_changed` | `calendarService.ts`, `AppHeader.tsx`, `QuanLyPage.tsx` | `CalendarPage.tsx` và consumer task | Nạp lại task/lịch sau khi deadline hoặc dữ liệu task thay đổi |
| `ia_trees_changed` | `TaskIALinkField.tsx`, IA state writers | `TaskIALinkField.tsx`, `useIATreeState.ts` | Đồng bộ cây và liên kết Task ↔ IA tức thời trong cùng tab |

---

## 🧭 MA TRẬN PHẠM VI ẢNH HƯỞNG TỔNG THỂ (GLOBAL IMPACT MATRIX)

| Vùng Thay Đổi | Các File Liên Quan | Phạm Vi Ảnh Hưởng Cần Rà Soát | Tài Liệu Chi Tiết |
| :--- | :--- | :--- | :--- |
| **Đăng nhập / Session / OTP** | `otpAuthService.ts`<br>`OtpLoginForm.tsx`<br>`TeamsOtpModal.tsx`<br>`Sidebar.tsx`<br>`App.tsx` | - Hàm `clearSession()` xóa sạch cả sessionStorage & localStorage.<br>- Timeout phiên 8h/15m.<br>- Tự động đối chiếu vai trò mới nhất từ Google Sheet tab `USERS`.<br>- Bắn event `auth_session_changed`. | `features/01_AUTH_AND_SESSION_MANAGEMENT.md` |
| **Kanban / Danh sách Task / Chi tiết Task** | `TrackRequestPage.tsx`<br>`KanbanBoard.tsx`<br>`gantt-chart.tsx`<br>`SolutionAgentsTable.tsx`<br>`RequestDetail.tsx`<br>`statusConfig.ts` | - Phân loại chuẩn 2 loại Pending (Amber PO Pending 24h & Slate Designer Pending với `@pending:`).<br>- Tự động hóa `@SenToPO:` kèm nút "Mở Figma" và link bôi xanh mở tab mới.<br>- Lưới thuộc tính 2x2 tối ưu.<br>- Mốc 7 trên Gantt Timeline.<br>- Đồng nhất badge `h-[22px]`. | `features/02_TASK_MANAGEMENT_AND_TRACKING.md` |
| **Tạo Yêu Cầu (Request Form)** | `CreateRequestPage.tsx`<br>`RequestForm.tsx`<br>`googleSheetService.ts` | - PO chỉ được chọn Sản phẩm thuộc quyền quản lý.<br>- Upload file lên Drive có lấy được link không.<br>- Ghi JSON đồng bộ lên Google Sheet. | `features/03_REQUEST_CREATION_FLOW.md` |
| **Admin Settings & RBAC** | `QuanLyPage.tsx`<br>`navVisibilityConfig.ts`<br>`Sidebar.tsx` | - Đổi thứ tự menu / bật tắt menu phản ánh ngay trên Sidebar.<br>- Status Automation Rules Tool (6 trạng thái tự động).<br>- Đồng bộ 2 chiều với Google Sheets.<br>- Deep Link URL Hash `#manage?tab=...`.<br>- Chặn PO truy cập trang quản trị. | `features/04_ADMIN_PORTAL_AND_RBAC.md` |
| **Google Sheet Backend & Drive** | `google-apps-script-backend.js`<br>`googleSheetService.ts` | - Bắt buộc Deploy New Version trên GAS.<br>- Giữ nguyên cấu trúc 2 bảng Core JSON (`RAW_REQUESTS`, `RAW_SETTINGS`).<br>- Nạp siêu tốc danh sách nhân sự từ tab `USERS` qua GViz API. | `features/05_GOOGLE_SHEET_AND_GAS_BACKEND.md` |
| **UI, Token & Layout** | `App.tsx`<br>`Sidebar.tsx`<br>`index.css`<br>`src/components/ui/` | - Luôn giữ `md:ml-60` trên Desktop để không bị Sidebar che.<br>- Dùng color token và border-radius chuẩn.<br>- Đảm bảo responsive mobile (`w-full`). | `features/06_DESIGN_SYSTEM_AND_UI_GUIDELINE.md` |
| **Khảo sát Năng lực (Assessment)** | `TestAssessmentPage.tsx`<br>`test-assessment/` | - Định dạng file Excel Import/Export bằng thư viện XLSX.<br>- Trạng thái làm bài, bộ đếm giờ và kết quả bài thi. | `features/07_TEST_ASSESSMENT_MODULE.md` |
| **Công cụ nén ảnh (Compressor)** | `ImageCompressorPage.tsx`<br>`ImageCompressorModal.tsx`<br>`package.json` | - Chạy 100% Client-side Canvas HTML5.<br>- Hỗ trợ định dạng WebP, PNG, JPEG.<br>- Đóng gói file ZIP hàng loạt qua thư viện `jszip`. | `features/08_BUILTIN_TOOLS_AND_UTILITIES.md` |
| **Master Data & Đồng bộ 2 chiều** | `QuanLyPage.tsx`<br>`googleSheetService.ts`<br>`google-apps-script-backend.js` | - Phân bổ nhân sự Squad theo vai trò chuẩn (PO, Business, Designer).<br>- Đồng bộ 2 chiều (Push/Pull) với bảng `RAW_SETTINGS`.<br>- Khử trùng lặp Activity Comments. | `features/09_MASTERDATA_AND_TWO_WAY_SYNC_SETTINGS.md` |
| **Information Architecture & Task Linking** | `IAPage.tsx`<br>`useIATreeState.ts`<br>`TaskIALinkField.tsx`<br>`iaTaskLink.ts` | - Giữ quy tắc một task/một node.<br>- Lọc theo Product/Squad và chuỗi Lv1-Lv5.<br>- Không để cloud payload cũ ghi đè sản phẩm đang dirty.<br>- Kiểm tra `cap-ia-edit`. | `features/10_INFORMATION_ARCHITECTURE_AND_MINDMAP.md` |
| **Planner & Calendar** | `CalendarPage.tsx`<br>`calendarService.ts`<br>`CalendarConfigTab.tsx` | - Phân biệt deadline và ngày dự kiến làm.<br>- Lọc dữ liệu cá nhân theo assignee.<br>- Rà soát persistence event/unread trước khi hỗ trợ nhiều thiết bị. | `features/13_UX_TEAM_PLANNER_AND_CALENDAR.md` |

---

## 🛑 5 QUY TẮC "SỐNG CÒN" (GOTCHAS) DEV MỚI PHẢI THUỘC LÒNG

1. **Sidebar Desktop Offset:**
   - Sidebar cố định bên trái màn hình. Khi mở rộng có độ rộng `w-60` (`240px`).
   - Mọi trang nội dung trong `src/pages/` khi hiển thị trên Desktop **bắt buộc** phải có padding/margin bù tương ứng (`md:ml-60`). Nếu bỏ sót, nội dung trang sẽ bị Sidebar đè lên che mất góc trái!
2. **Xóa sạch Session khi Logout:**
   - Không được chỉ xóa `sessionStorage`. Phải gọi `logoutTeamsSession()` hoặc `clearSession()` để xóa đồng thời cả `sessionStorage` VÀ `localStorage` (`ux_portal_session_auth`, `ux_portal_session`).
3. **Backend Google Apps Script là Cloud-hosted:**
   - Sửa code trong file `google-apps-script-backend.js` ở máy local **không** tự động đổi code trên Google Cloud! Phải copy code vào Trình chỉnh sửa Apps Script và chọn **Deploy -> New version**.
   - Sau khi deploy thay đổi nickname, kiểm tra response có `nickname_persistence_version: 1`; sau khi deploy IA RBAC, thử riêng payload IA-only và payload master-data hỗn hợp.
4. **Fallback cho Schema Dữ liệu cũ:**
   - Khi thêm trường mới vào `UXRequest` (ví dụ `doc_links`, `attachments`, `sent_to_po_at`), luôn luôn viết code phòng thủ: `request.attachments ?? []` để tránh crash app với các task cũ trên Google Sheet.
5. **Kiểm tra Biên dịch TypeScript:**
   - Trước khi hoàn tất task, luôn chạy:
     ```bash
     npm run build
     ```
     Đảm bảo đạt 0 lỗi biên dịch!

---

**Last Updated:** 28/09/2026
**Changelog:** Bổ sung báo cáo 28-09, Designer Planner cá nhân, Schedule Meeting, AI briefing, right sheet, hover preview và planned work date persistence.
