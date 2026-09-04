# 🧭 TÀI LIỆU DỰ ÁN MB UX REQUEST PORTAL — KIẾN TRÚC & HƯỚNG DẪN DÀNH CHO DEVELOPER MỚI

> **Hệ thống:** MB UX Request Portal & Task Management System  
> **Mục tiêu tài liệu:** Giúp kỹ sư mới tiếp nhận dự án hiểu toàn diện hệ thống trong 30 phút, biết chính xác **CẦN ĐỌC Ở ĐÂU** khi làm tính năng mới và khi bảo trì/sửa tính năng cũ để đạt **100 điểm an toàn & phân tích phạm vi ảnh hưởng (Impact Analysis)**.

---

## 🎯 BẢN ĐỒ TRA CỨU NHANH (QUICK NAVIGATION MAP)

Khi bạn được giao một nhiệm vụ, hãy mở ngay tài liệu chuyên trách tương ứng dưới đây trong thư mục `doc/`:

```
Deploy App/doc/
│
├── 📖 00_OVERVIEW_AND_ONBOARDING.md   <-- BẠN ĐANG ĐỌC TÀI LIỆU NÀY (Tổng quan, Bản đồ tra cứu)
│
├── 📂 reports/                        <-- BÁO CÁO CẬP NHẬT HỆ THỐNG ĐỊNH KỲ:
│   └── 📋 2026-09-04_DAILY_UPDATE_REPORT.md  <-- Báo cáo chi tiết nâng cấp ReUI 8 Tabs, Role Preview, Xuất CSV
│
├── 📂 features/                       <-- DANH MỤC TÍNH NĂNG TÁCH BIỆT CHI TIẾT:
│   ├── 🔐 01_AUTH_AND_SESSION_MANAGEMENT.md
│   │   └── Đọc khi: Sửa/Làm mới tính năng Đăng nhập, OTP Teams, Quản lý phiên (Session 8h), Đặc quyền Admin xem trước vai trò (Role Preview), Token, Đăng xuất.
│   │
│   ├── 📊 02_TASK_MANAGEMENT_AND_TRACKING.md
│   │   └── Đọc khi: Sửa/Làm mới Bảng Kanban, Danh sách Track (Table/Grid/List), Bộ lọc, Modal chi tiết Task (6 nhóm trường), Chuyển khâu, Tính % SLA, Cập nhật tiến độ.
│   │
│   ├── 📝 03_REQUEST_CREATION_FLOW.md
│   │   └── Đọc khi: Sửa/Làm mới Màn hình tạo yêu cầu (RequestForm), Ràng buộc sản phẩm của PO, Đính kèm tài liệu Google Drive, Hiệu ứng Confetti (Matter.js).
│   │
│   ├── ⚙️ 04_ADMIN_PORTAL_AND_RBAC.md
│   │   └── Đọc khi: Sửa/Làm mới Màn hình Admin (QuanLyPage), Chuẩn ReUI Application Settings 2 cột (8 tabs), Phân quyền 4 Role, Role Preview, Xuất CSV, Đồng bộ Google Sheet 2 chiều, Quản lý Khâu UX & SLA, Master Data, Audit Logs.
│   │
│   ├── 💾 05_GOOGLE_SHEET_AND_GAS_BACKEND.md
│   │   └── Đọc khi: Đụng tới backend Google Apps Script (`google-apps-script-backend.js`), Cấu trúc lưu trữ JSON Core (`RAW_REQUESTS`, `RAW_SETTINGS`), API Sync dữ liệu nhân sự/squads, Upload Avatar/Drive.
│   │
│   ├── 🎨 06_DESIGN_SYSTEM_AND_UI_GUIDELINE.md
│   │   └── Đọc khi: Thiết kế giao diện mới, Tạo UI Component mới, Chuẩn hóa màu sắc (Zinc Monochrome, Color Tokens), Spacing, Border-radius (`rounded-xl`), Chuẩn ReUI Application Settings, Sidebar Desktop Offset (`md:ml-60`).
│   │
│   ├── 🎓 07_TEST_ASSESSMENT_MODULE.md
│   │   └── Đọc khi: Sửa/Làm mới Phân hệ Khảo sát & Đánh giá Năng lực UX (Bộ câu hỏi, Làm bài trắc nghiệm, Import/Export Excel bằng XLSX, Chấm điểm).
│   │
│   └── 🛠️ 08_BUILTIN_TOOLS_AND_UTILITIES.md
│       └── Đọc khi: Sửa/Dùng công cụ nén ảnh Client-side (`ImageCompressorModal.tsx`), Các tiện ích dùng chung.
```

---

## 🏆 CÔNG THỨC ĐẠT "100 ĐIỂM" KHI LÀM TÍNH NĂNG MỚI HOẶC SỬA TÍNH NĂNG CŨ

### 1. KHI LÀM 1 TÍNH NĂNG MỚI (NEW FEATURE):
Để đạt 100 điểm, hãy tự trả lời 5 câu hỏi cốt tử sau bằng cách tra cứu các doc:
1. **Phân quyền (RBAC):** Tính năng này cho ai dùng (`Admin`, `Design Owner`, `Designer`, hay `PO`)? Menu của nó nằm ở đâu trong Sidebar (`Platform` hay `Resources`)?  
   👉 *Đọc ngay:* `features/04_ADMIN_PORTAL_AND_RBAC.md` và `features/01_AUTH_AND_SESSION_MANAGEMENT.md`.
2. **Nơi lưu trữ dữ liệu (Storage):** Dữ liệu mới lưu ở đâu? LocalStorage, Google Sheet JSON (`RAW_REQUESTS` / `RAW_SETTINGS`), hay Google Drive?  
   👉 *Đọc ngay:* `features/05_GOOGLE_SHEET_AND_GAS_BACKEND.md`.
3. **Giao diện & Trải nghiệm (UI/UX):** Component mới tuân thủ Design System không? Có bị Sidebar che khuất trên Desktop không (`md:ml-60`)?  
   👉 *Đọc ngay:* `features/06_DESIGN_SYSTEM_AND_UI_GUIDELINE.md`.
4. **Đồng bộ trạng thái (Events):** Component khác có cần biết sự thay đổi này không? (Ví dụ: Đổi avatar, đổi menu, đổi session thì cần bắn event gì)?  
   👉 *Đọc ngay:* Bảng Event Bus trong tài liệu này và `features/04_ADMIN_PORTAL_AND_RBAC.md`.
5. **Kiểm tra biên dịch:** Chạy lệnh `npx tsc --noEmit` có đạt 0 lỗi TypeScript không?

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
│          Radix UI Slot + ReUI / JolyUI Design System + Matter.js + XLSX         │
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
│  - Users_View (Danh sách nhân sự)      │
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

---

## 🧭 MA TRẬN PHẠM VI ẢNH HƯỞNG TỔNG THỂ (GLOBAL IMPACT MATRIX)

| Vùng Thay Đổi | Các File Liên Quan | Phạm Vi Ảnh Hưởng Cần Rà Soát | Tài Liệu Chi Tiết |
| :--- | :--- | :--- | :--- |
| **Đăng nhập / Session / OTP** | `otpAuthService.ts`<br>`OtpLoginForm.tsx`<br>`TeamsOtpModal.tsx`<br>`Sidebar.tsx`<br>`App.tsx` | - Hàm `clearSession()` xóa sạch cả sessionStorage & localStorage.<br>- Timeout phiên 8h/15m.<br>- Bắn event `auth_session_changed`. | `features/01_AUTH_AND_SESSION_MANAGEMENT.md` |
| **Kanban / Danh sách Task / Chi tiết Task** | `TrackRequestPage.tsx`<br>`KanbanBoard.tsx`<br>`RequestDetail.tsx`<br>`mockData.ts` | - Dropdown chuyển khâu có đủ các khâu không.<br>- Cột Kanban có đồng bộ thứ tự SLA không.<br>- Kiểm tra quyền sửa theo 4 Roles (PO chỉ xem). | `features/02_TASK_MANAGEMENT_AND_TRACKING.md` |
| **Tạo Yêu Cầu (Request Form)** | `CreateRequestPage.tsx`<br>`RequestForm.tsx`<br>`googleSheetService.ts` | - PO chỉ được chọn Sản phẩm thuộc quyền quản lý.<br>- Upload file lên Drive có lấy được link không.<br>- Ghi JSON đồng bộ lên Google Sheet. | `features/03_REQUEST_CREATION_FLOW.md` |
| **Admin Settings & RBAC** | `QuanLyPage.tsx`<br>`navVisibilityConfig.ts`<br>`Sidebar.tsx` | - Đổi thứ tự menu / bật tắt menu phản ánh ngay trên Sidebar.<br>- Thêm/xóa/sửa khâu UX cập nhật ngay vào Kanban & Track.<br>- Master Data Squads & Products không được lỗi format. | `features/04_ADMIN_PORTAL_AND_RBAC.md` |
| **Google Sheet Backend & Drive** | `google-apps-script-backend.js`<br>`googleSheetService.ts` | - Bắt buộc Deploy New Version trên GAS.<br>- Giữ nguyên cấu trúc 2 bảng Core JSON (`RAW_REQUESTS`, `RAW_SETTINGS`).<br>- Không tự ý đổi tên cột bảng Core. | `features/05_GOOGLE_SHEET_AND_GAS_BACKEND.md` |
| **UI, Token & Layout** | `App.tsx`<br>`Sidebar.tsx`<br>`index.css`<br>`src/components/ui/` | - Luôn giữ `md:ml-60` trên Desktop để không bị Sidebar che.<br>- Dùng color token và border-radius chuẩn.<br>- Đảm bảo responsive mobile (`w-full`). | `features/06_DESIGN_SYSTEM_AND_UI_GUIDELINE.md` |
| **Khảo sát Năng lực (Assessment)** | `TestAssessmentPage.tsx`<br>`test-assessment/` | - Định dạng file Excel Import/Export bằng thư viện XLSX.<br>- Trạng thái làm bài, bộ đếm giờ và kết quả bài thi. | `features/07_TEST_ASSESSMENT_MODULE.md` |
| **Công cụ nén ảnh** | `ImageCompressorModal.tsx` | - Chạy hoàn toàn trên Canvas browser, không gửi dữ liệu ra ngoài. | `features/08_BUILTIN_TOOLS_AND_UTILITIES.md` |

---

## 🛑 5 QUY TẮC "SỐNG CÒN" (GOTCHAS) DEV MỚI PHẢI THUỘC LÒNG

1. **Sidebar Desktop Offset:**
   - Sidebar cố định bên trái màn hình. Khi mở rộng có độ rộng `w-60` (`240px`).
   - Mọi trang nội dung trong `src/pages/` khi hiển thị trên Desktop **bắt buộc** phải có padding/margin bù tương ứng (`md:ml-60`). Nếu bỏ sót, nội dung trang sẽ bị Sidebar đè lên che mất góc trái!
2. **Xóa sạch Session khi Logout:**
   - Không được chỉ xóa `sessionStorage`. Phải gọi `logoutTeamsSession()` hoặc `clearSession()` để xóa đồng thời cả `sessionStorage` VÀ `localStorage` (`ux_portal_session_auth`, `ux_portal_session`).
3. **Backend Google Apps Script là Cloud-hosted:**
   - Sửa code trong file `google-apps-script-backend.js` ở máy local **không** tự động đổi code trên Google Cloud! Phải copy code vào Trình chỉnh sửa Apps Script và chọn **Deploy -> New version**.
4. **Fallback cho Schema Dữ liệu cũ:**
   - Khi thêm trường mới vào `UXRequest` (ví dụ `doc_links`, `attachments`), luôn luôn viết code phòng thủ: `request.attachments ?? []` để tránh crash app với các task cũ trên Google Sheet.
5. **Kiểm tra Biên dịch TypeScript:**
   - Trước khi hoàn tất task, luôn chạy:
     ```bash
     npx tsc --noEmit
     ```
     Đảm bảo đạt 0 lỗi biên dịch!
