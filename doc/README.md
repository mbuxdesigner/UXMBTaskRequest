# 🧭 TÀI LIỆU DỰ ÁN MB UX REQUEST PORTAL — KIẾN TRÚC & HƯỚNG DẪN DÀNH CHO DEVELOPER MỚI

> **Hệ thống:** MB UX Request Portal & Task Management System  
> **Mục tiêu tài liệu:** Giúp kỹ sư mới tiếp nhận dự án hiểu toàn diện hệ thống trong 30 phút, biết chính xác **CẦN ĐỌC Ở ĐÂU** khi làm tính năng mới và khi bảo trì/sửa tính năng cũ để đạt **100 điểm an toàn & phân tích phạm vi ảnh hưởng (Impact Analysis)**.

---

## 🎯 BẢN ĐỒ TRA CỨU NHANH (QUICK NAVIGATION MAP)

Khi được giao một nhiệm vụ, hãy bắt đầu từ nhóm tài liệu tương ứng:

| Nhu cầu | Nơi tra cứu |
| :--- | :--- |
| Tiếp nhận dự án và chuẩn viết tài liệu | [`getting-started/`](getting-started/) |
| Kiến trúc tổng thể, backend và đồng bộ dữ liệu | [`architecture/`](architecture/) |
| Hành vi và phạm vi ảnh hưởng của từng tính năng | [`features/`](features/) |
| Token UI, component và motion | [`design-system/`](design-system/) |
| Deploy, bảo mật và xử lý sự cố | [`operations/`](operations/) |
| UAT và tiêu chí nghiệm thu | [`quality/`](quality/) |
| Nhật ký thay đổi theo thời gian | [`reports/`](reports/) |
| Tài liệu đã hết hiệu lực | [`archive/`](archive/) |
| Prototype và tài sản tham khảo | [`examples/`](examples/) |

Các điểm vào quan trọng:

- Tổng quan toàn hệ thống: [`architecture/system-overview.md`](architecture/system-overview.md).
- Auth và session: [`features/auth-and-session.md`](features/auth-and-session.md).
- Task/Kanban/Gantt: [`features/task-management.md`](features/task-management.md).
- Admin và RBAC: [`features/admin-portal.md`](features/admin-portal.md).
- Google Sheets/GAS: [`architecture/data-storage/google-sheets-and-gas.md`](architecture/data-storage/google-sheets-and-gas.md).
- Design System: [`design-system/foundations-and-components.md`](design-system/foundations-and-components.md).
- AI Copilot: [`features/ai-copilot/overview.md`](features/ai-copilot/overview.md).
- Git/Vercel: [`operations/deployment/git-vercel-workflow.md`](operations/deployment/git-vercel-workflow.md).

---

## 🏆 CÔNG THỨC ĐẠT "100 ĐIỂM" KHI LÀM TÍNH NĂNG MỚI HOẶC SỬA TÍNH NĂNG CŨ

### 1. KHI LÀM 1 TÍNH NĂNG MỚI (NEW FEATURE):
Để đạt 100 điểm, hãy tự trả lời 5 câu hỏi cốt tử sau bằng cách tra cứu các doc:
1. **Phân quyền (RBAC):** Tính năng này cho ai dùng (`Admin`, `Design Owner`, `Designer`, hay `PO`)? Menu của nó nằm ở đâu trong Sidebar (`Platform` hay `Resources`)?  
   👉 *Đọc ngay:* `features/admin-portal.md` và `features/auth-and-session.md`.
2. **Nơi lưu trữ dữ liệu (Storage):** Dữ liệu mới lưu ở đâu? LocalStorage, Google Sheet JSON (`RAW_REQUESTS` / `RAW_SETTINGS`), hay Google Drive?  
   👉 *Đọc ngay:* `architecture/data-storage/google-sheets-and-gas.md` và `architecture/data-storage/master-data-sync.md`.
3. **Giao diện & Trải nghiệm (UI/UX):** Component mới tuân thủ Design System không? Có bị Sidebar che khuất trên Desktop không (`md:ml-60`)?  
   👉 *Đọc ngay:* `design-system/implementation-guide.md`.
4. **Đồng bộ trạng thái (Events):** Component khác có cần biết sự thay đổi này không? (Ví dụ: Đổi avatar, đổi menu, đổi session thì cần bắn event gì)?  
   👉 *Đọc ngay:* Bảng Event Bus trong tài liệu này và `features/admin-portal.md`.
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
| **Đăng nhập / Session / OTP** | `otpAuthService.ts`<br>`OtpLoginForm.tsx`<br>`TeamsOtpModal.tsx`<br>`Sidebar.tsx`<br>`App.tsx` | - Hàm `clearSession()` xóa sạch cả sessionStorage & localStorage.<br>- Timeout phiên 8h/15m.<br>- Tự động đối chiếu vai trò mới nhất từ Google Sheet tab `USERS`.<br>- Bắn event `auth_session_changed`. | `features/auth-and-session.md` |
| **Kanban / Danh sách Task / Chi tiết Task** | `TrackRequestPage.tsx`<br>`KanbanBoard.tsx`<br>`gantt-chart.tsx`<br>`SolutionAgentsTable.tsx`<br>`RequestDetail.tsx`<br>`statusConfig.ts` | - Phân loại chuẩn 2 loại Pending (Amber PO Pending 24h & Slate Designer Pending với `@pending:`).<br>- Tự động hóa `@SenToPO:` kèm nút "Mở Figma" và link bôi xanh mở tab mới.<br>- Lưới thuộc tính 2x2 tối ưu.<br>- Mốc 7 trên Gantt Timeline.<br>- Đồng nhất badge `h-[22px]`. | `features/task-management.md` |
| **Tạo Yêu Cầu (Request Form)** | `CreateRequestPage.tsx`<br>`RequestForm.tsx`<br>`googleSheetService.ts` | - PO chỉ được chọn Sản phẩm thuộc quyền quản lý.<br>- Upload file lên Drive có lấy được link không.<br>- Ghi JSON đồng bộ lên Google Sheet. | `features/request-creation.md` |
| **Admin Settings & RBAC** | `QuanLyPage.tsx`<br>`navVisibilityConfig.ts`<br>`Sidebar.tsx` | - Đổi thứ tự menu / bật tắt menu phản ánh ngay trên Sidebar.<br>- Status Automation Rules Tool (6 trạng thái tự động).<br>- Đồng bộ 2 chiều với Google Sheets.<br>- Deep Link URL Hash `#manage?tab=...`.<br>- Chặn PO truy cập trang quản trị. | `features/admin-portal.md` |
| **Google Sheet Backend & Drive** | `google-apps-script-backend.js`<br>`googleSheetService.ts` | - Bắt buộc Deploy New Version trên GAS.<br>- Giữ nguyên cấu trúc 2 bảng Core JSON (`RAW_REQUESTS`, `RAW_SETTINGS`).<br>- Nạp siêu tốc danh sách nhân sự từ tab `USERS` qua GViz API. | `architecture/data-storage/google-sheets-and-gas.md` |
| **UI, Token & Layout** | `App.tsx`<br>`Sidebar.tsx`<br>`index.css`<br>`src/components/ui/` | - Luôn giữ `md:ml-60` trên Desktop để không bị Sidebar che.<br>- Dùng color token và border-radius chuẩn.<br>- Đảm bảo responsive mobile (`w-full`). | `design-system/implementation-guide.md` |
| **Khảo sát Năng lực (Assessment)** | `TestAssessmentPage.tsx`<br>`test-assessment/` | - Định dạng file Excel Import/Export bằng thư viện XLSX.<br>- Trạng thái làm bài, bộ đếm giờ và kết quả bài thi. | `features/assessment.md` |
| **Công cụ nén ảnh (Compressor)** | `ImageCompressorPage.tsx`<br>`ImageCompressorModal.tsx`<br>`package.json` | - Chạy 100% Client-side Canvas HTML5.<br>- Hỗ trợ định dạng WebP, PNG, JPEG.<br>- Đóng gói file ZIP hàng loạt qua thư viện `jszip`. | `features/built-in-tools.md` |
| **Master Data & Đồng bộ 2 chiều** | `QuanLyPage.tsx`<br>`googleSheetService.ts`<br>`google-apps-script-backend.js` | - Phân bổ nhân sự Squad theo vai trò chuẩn (PO, Business, Designer).<br>- Đồng bộ 2 chiều (Push/Pull) với bảng `RAW_SETTINGS`.<br>- Khử trùng lặp Activity Comments. | `architecture/data-storage/master-data-sync.md` |
| **Information Architecture & Task Linking** | `IAPage.tsx`<br>`useIATreeState.ts`<br>`TaskIALinkField.tsx`<br>`iaTaskLink.ts` | - Giữ quy tắc một task/một node.<br>- Lọc theo Product/Squad và chuỗi Lv1-Lv5.<br>- Không để cloud payload cũ ghi đè sản phẩm đang dirty.<br>- Kiểm tra `cap-ia-edit`. | `features/information-architecture.md` |
| **Planner & Calendar** | `CalendarPage.tsx`<br>`calendarService.ts`<br>`CalendarConfigTab.tsx` | - Phân biệt deadline và ngày dự kiến làm.<br>- Lọc dữ liệu cá nhân theo assignee.<br>- Rà soát persistence event/unread trước khi hỗ trợ nhiều thiết bị. | `features/planner-and-calendar.md` |

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

**Last Updated:** 24/10/2026  
**Changelog:** Sắp xếp lại tài liệu theo mục đích sử dụng; chuẩn hóa tên file và bản đồ điều hướng.
