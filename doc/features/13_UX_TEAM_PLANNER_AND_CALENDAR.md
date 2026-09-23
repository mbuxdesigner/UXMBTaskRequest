# 📅 TÍNH NĂNG 13: UX TEAM PLANNER & LỊCH LÀM VIỆC TẬP TRUNG
## (DUAL-CALENDAR ARCHITECTURE, 4-LAYER INTEGRATION & ADMIN WORKSPACE CONFIG)

> **Mục tiêu tính năng:** Cung cấp giải pháp quản lý tiến độ, lịch trình công việc và kế hoạch nguồn lực nhân sự toàn diện cho UX Team MBBank. Module kết hợp mô hình **Dual-Calendar (Lịch Đôi)** chuẩn ClickUp & ReUI, tích hợp **4 tầng dữ liệu vận hành** đồng thời (Deadline Đề bài UX, Lịch Nghỉ phép Nhân sự từ Google Sheets, Lịch Làm việc & Nghỉ lễ Ngân hàng, Sự kiện Nội bộ Team), hỗ trợ dời hạn kéo thả thông minh kèm tự động ghi nhật ký **Activity Log**, cùng hệ thống phân quyền vai trò (**RBAC**) và tùy biến danh mục sự kiện hoàn chỉnh trong trang Quản trị Hệ thống.

---

## 🎯 1. KHI NÀO CẦN ĐỌC TÀI LIỆU NÀY?

- **Khi phát triển tính năng mới:**
  - Cần mở rộng hoặc thay đổi các chế độ hiển thị lịch (Tháng - Month, Tuần - Week, Ngày - Day, Lịch trình - Agenda).
  - Cần bổ sung thêm một tầng dữ liệu mới (ví dụ: Lịch phỏng vấn tuyển dụng, Lịch phát hành Sprint/Release MBBank).
  - Cần tinh chỉnh quy tắc cảnh báo xung đột lịch nghỉ phép hoặc thời hạn bàn giao đề bài.
  - Cần tích hợp thêm các kênh thông báo khi dời hạn deadline (Teams Webhook, Email PO).
- **Khi bảo trì / kiểm tra lỗi (Troubleshooting):**
  - Dữ liệu nghỉ phép không đồng bộ từ Google Sheets tab `Đăng ký nghỉ` (hoặc cấu trúc cột C, D, E, G thay đổi).
  - Kéo thả deadline trên lịch không cập nhật hạn hoặc không thấy xuất hiện trong lịch sử Activity Logs của bài toán.
  - Các modal/popover bị che khuất, lệch giao diện hoặc bị lỗi backdrop giam hãm bên trong khung làm việc.
  - Lỗi phân quyền thao tác: Designer hoặc PO không xem được lịch hoặc không có quyền tạo sự kiện team.
  - Quản trị viên điều chỉnh cấu hình lịch trong Admin bị lỗi hoặc không nạp được danh mục sự kiện mặc định.

---

## 🏗️ 2. CẤU TRÚC KIẾN TRÚC & CÁC THÀNH PHẦN (COMPONENTS BREAKDOWN)

```
src/
├── services/
│   ├── calendarService.ts            <-- CORE LOGIC: Nạp 4 tầng dữ liệu, tính toán lưới tuần Mon-Fri/Mon-Sun, cập nhật deadline kèm Activity Log
│   └── leaveService.ts               <-- GATEWAY NGHỈ PHÉP: Đồng bộ tab "Đăng ký nghỉ" từ Google Apps Script / Sheets CSV + LocalStorage Cache
│
├── config/
│   ├── systemConfig.ts               <-- CẤU HÌNH HỆ THỐNG: CalendarConfig, RolePermissions, EventCategoryConfig, DEFAULT_CALENDAR_CONFIG
│   └── navVisibilityConfig.ts        <-- PHÂN QUYỀN MENU: Vị trí 'calendar' trên Sidebar Navigation cho từng Role
│
├── components/
│   ├── admin/
│   │   └── CalendarConfigTab.tsx     <-- ADMIN SETTINGS: Cấu hình quy tắc xem, RBAC Role matrix, CRUD Category, Quét đồng bộ Lịch nghỉ
│   └── common/
│       └── UserAvatar.tsx            <-- Hiển thị Avatar nhân sự chuẩn MB Design System
│
├── pages/
│   ├── CalendarPage.tsx              <-- GIAO DIỆN CHÍNH: Full-bleed Dual-Calendar Workspace, Vertex Studio Widget, Month Grid, Floating Search Dock
│   └── QuanLyPage.tsx                <-- TRUNG TÂM QUẢN TRỊ: Nạp tab "calendar_config", bảo vệ dữ liệu phòng thủ
│
└── tests/
    ├── test-calendar-planner.test.ts <-- UNIT TESTS: 11 tests kiểm thử thuật toán lưới tuần, dời hạn, phân quyền, CRUD sự kiện
    └── test-leave-sync.test.ts       <-- UNIT TESTS: 1 test kiểm thử nạp & bóc tách dữ liệu nghỉ phép
```

---

## 🎨 3. BỐ CỤC DUAL-CALENDAR & TRẢI NGHIỆM NGƯỜI DÙNG (UX/UI)

Module được thiết kế theo đúng quy chuẩn [UI_DESIGN_SYSTEM.md](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/doc/UI_DESIGN_SYSTEM.md), [motion-guidelines.md](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/doc/motion-guidelines.md) và tham chiếu thực tế giao diện ClickUp Planner / Vertex Studio:

### 3.1. Cột Trái (Planner Sidebar — Chiều rộng cố định 285px)
- **Header Sidebar:** Tiêu đề `Planner` kèm các nút phím tắt Tìm kiếm (`Ctrl+K`), Thu gọn thanh bên (`⌘ \`), Tạo sự kiện mới (`+`).
- **Widget "Vertex Studio · Today":**
  - Luôn phản ánh nhân sự nghỉ phép trong ngày thực tế hôm nay (Today), không bị phụ thuộc vào tháng/ngày đang xem trên lịch.
  - Hiển thị cụm Avatar tròn xếp chồng `-space-x-1.5` chuẩn mực (`ring-2 ring-white`) cùng badge số dư `+N`.
  - Nút `All` mở Modal danh sách chi tiết nhân sự vắng mặt kèm lý do và ca nghỉ (Sáng/Chiều/Cả ngày).
- **Mục "Priorities":** Liệt kê các bài toán UX có mức độ ưu tiên cao (`Lv1`, `Lv2`) kèm cờ đỏ `Flag` và thời hạn.
- **Mục "Meet with":** Ô tìm kiếm nhanh nhân sự theo tên hoặc email để lọc lịch trình tương ứng.
- **Mục "Assigned to me":** Danh sách bài toán được giao cho tài khoản hiện tại, hỗ trợ kéo trực tiếp từ sidebar thả vào ô ngày trên lịch để ấn định deadline.
- **Mục "Today & overdue":** Liệt kê bài toán đến hạn hôm nay hoặc đang trễ hạn.

### 3.2. Khu Vực Trung Tâm (Lịch Lớn Đa Chế Độ)
- **Thanh Điều Hướng (Top Navigation):**
  - Cụm phím chuyển tháng `< >`, tiêu đề tháng năm hiện tại (`September 2026`), nút `Today` đưa về ngày hiện tại tức thì.
  - Dropdown chọn 4 chế độ hiển thị: **Tháng (Month)**, **Tuần (Week)**, **Ngày (Day)**, **Lịch trình (Agenda)**.
  - Nút chuyển nhanh **`5D` / `7D`**: Xem 5 ngày làm việc tiêu chuẩn (Thứ 2 → Thứ 6) hoặc mở rộng đầy đủ 7 ngày gồm Thứ 7 và Chủ Nhật.
  - Nút bóng đổ giờ ngoài hành chính (`Sun`/`Droplet`), nút tạo sự kiện nhanh (`+`).
- **Lưới Lịch Tháng (Month View Grid):**
  - Chia hàng tuần độc lập thông qua thuật toán `computeCalendarWeeks()`, loại bỏ 100% tình trạng lệch cột.
  - Huy hiệu ngày hôm nay: Khoanh tròn đỏ nổi bật `bg-[#E53935] text-white font-bold text-xs`.
  - Huy hiệu đầu tháng: Thẻ đen `bg-slate-900 text-white font-bold text-[10px]` kèm tên tháng viết tắt (ví dụ: `Oct 1`).
  - Vùng nhận kéo thả (Drop Target): Tự động phát sáng viền xanh `ring-2 ring-blue-500 bg-blue-50/60 shadow-inner z-10` khi rê task qua.

### 3.3. Thanh Tìm Kiếm Đáy Nổi (Floating Search Dock) & ClickUp Command Palette
- **Search Dock:** Cố định tại `bottom-4 left-1/2 -translate-x-1/2 z-40`, thiết kế dạng con nhộng kính mờ cao cấp (`bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/90`).
- **Command Palette Popover:** Bung mở từ dưới lên (`origin-bottom`, hiệu ứng nhung mềm `springs.popover`), tích hợp:
  - `Up next`: Các đề tài và sự kiện kế tiếp.
  - `Commands`: Bật tắt hiển thị giờ làm việc, đổi chế độ 5 ngày / 7 ngày, đóng mở sidebar, chuyển tháng.
  - `Team`: Lọc lịch làm việc của từng Designer trong nhóm.
  - Ô tìm kiếm text thời gian thực ở đáy popover.

---

## 📊 4. BỐN TẦNG DỮ LIỆU TÍCH HỢP (4-LAYER ARCHITECTURE)

Hệ thống hợp nhất 4 luồng dữ liệu độc lập thành cấu trúc chung `CalendarItem`:

```typescript
export interface CalendarItem {
  id: string
  title: string
  date: string                // YYYY-MM-DD
  startTime?: string          // HH:mm
  endTime?: string            // HH:mm
  layer: CalendarLayer        // 1: Deadline Đề bài, 2: Nghỉ phép, 3: Lịch NH, 4: Sự kiện Team
  categoryLabel: string
  color: string
  assigneeName?: string
  assigneeAvatar?: string
  status?: string
  hasConflict?: boolean       // Cảnh báo trùng lịch nghỉ phép
  conflictReason?: string
  rawItem?: any
}
```

### Tầng 1: Đề bài & Deadline UX (`layer = 1`)
- Nguồn: Danh sách bài toán thực tế `ux_portal_real_requests` (hoặc `mockRequests`).
- Trực quan: Thanh màu xanh dương tươi ClickUp `#0084FF` kèm biểu tượng tai nghe `🎧 Work on [Tiêu đề đề tài]`. Nếu task đã hoàn thành, thanh chuyển xám gạch ngang.
- Tương tác kéo thả: Cho phép giữ và kéo thả sang ô ngày khác để dời hạn deadline.
- Hoạt động bảo vệ: Kiểm tra quyền `modifyDeadlines`. Khi xác nhận dời hạn, hệ thống tự động ghi 1 bản ghi `TaskUpdateRecord` vào lịch sử bài toán chứa: thời gian, người thực hiện, hạn cũ, hạn mới và lý do dời hạn.

### Tầng 2: Lịch Nghỉ Phép Nhân Sự (`layer = 2`)
- Nguồn: Đồng bộ từ Google Sheets tab `Đăng ký nghỉ` (Cột C: Họ và tên, D: Ca nghỉ, E: Lý do, G: Ngày nghỉ) thông qua `leaveService.ts`.
- Trực quan: Thanh màu hồng phấn `bg-pink-100 text-pink-800 border-pink-200` có icon cây cọ `🌴`.
- Phát hiện xung đột tự động (`hasConflict = true`): Nếu một bài toán UX có deadline trùng vào ngày nghỉ phép của chính Designer đang phụ trách, hệ thống tự động gắn huy hiệu cảnh báo vàng `⚠️ Xung đột nghỉ phép`.

### Tầng 3: Lịch Nghỉ Lễ & Ngày Làm Bù Ngân Hàng (`layer = 3`)
- Nguồn: Tham số lịch làm việc hệ thống `workSchedule` trong `systemConfig.ts`.
- Trực quan: Dòng chữ mảnh tối giản kèm chấm tròn xám `text-slate-600`.

### Tầng 4: Sự Kiện & Họp Nội Bộ UX Team (`layer = 4`)
- Nguồn: Mảng `teamEvents` trong cấu hình `CalendarConfig`.
- Trực quan: Thanh sự kiện dài màu theo phân loại (`categoryId`) hoặc xanh dương đậm.
- Quản lý: Cho phép người dùng có quyền `manageEvents` tạo mới, cập nhật thời gian, link họp Teams, địa điểm và xóa sự kiện.

---

## ⚙️ 5. CẤU HÌNH QUẢN TRỊ TRONG ADMIN (`CalendarConfigTab.tsx`)

Quản trị viên có toàn quyền cấu hình phân hệ Planner thông qua menu **Cài đặt hệ thống > Lịch & UX Planner**:

### 5.1. Quy Tắc Hiển Thị & Hoạt Động
- **Chế độ xem mặc định:** Lựa chọn màn hình khi mở tab Lịch (`month`, `week`, `day`, `agenda`).
- **Ngày bắt đầu trong tuần:** Thứ Hai (chuẩn ISO / MBBank) hoặc Chủ Nhật.
- **Khung giờ làm việc tiêu chuẩn:** Thiết lập giờ bắt đầu (`08:00`) và giờ kết thúc (`18:00`).
- **Tùy chọn hiển thị:** Bật/tắt ẩn giờ ngoài hành chính, bật/tắt cảnh báo xung đột lịch nghỉ phép.

### 5.2. Ma Trận Phân Quyền Vai Trò (Role Permissions RBAC)
Phân tách độc lập 3 đặc quyền cho từng vai trò trong hệ thống:

| Quyền hạn | Mã cấu hình | Admin | Design Owner | Designer | PO / Business |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Xem màn hình Lịch** | `viewCalendar` | ✅ | ✅ | ✅ | ✅ (Mặc định) |
| **Quản lý Sự kiện Team** | `manageEvents` | ✅ | ✅ | ✅ | ❌ |
| **Dời Deadline Kéo Thả** | `modifyDeadlines` | ✅ | ✅ | ❌ | ❌ |

### 5.3. Quản Lý Danh Mục Sự Kiện Team (Event Categories)
- Cung cấp danh mục mặc định: *Họp Sprint Review*, *Họp Squad / Alignment*, *Đào tạo & Workshop*, *Teambuilding & Sự kiện ngoài*.
- Cho phép thêm mới loại sự kiện tùy chỉnh kèm bộ chọn mã màu (`color picker`), tiêu đề và mô tả.
- Bảo vệ danh mục hệ thống không bị xóa nhầm.

### 5.4. Cổng Kết Nối Lịch Nghỉ Phép (Team Leaves Gateway)
- Thống kê thời gian thực: Tổng số lượt nghỉ phép trong bộ nhớ, số lượng nhân sự đang nghỉ hôm nay.
- Nút **"Quét & Đồng bộ lại ngay"**: Kích hoạt quét trực tiếp từ Google Apps Script / Google Sheets với cờ `forceRefresh = true`.

---

## 🛡️ 6. BẢO VỆ PHÒNG THỦ & XỬ LÝ LỖI (DEFENSIVE CODING)

Nhằm đảm bảo hệ thống không bao giờ gặp lỗi màn hình trắng (White Screen / ErrorBoundary Crash), toàn bộ module tuân thủ nghiêm ngặt các nguyên tắc:

1. **Modal Isolation với `createPortal`:**
   - Tất cả 5 Dialog/Modal/Popover trong `CalendarPage.tsx` được bao bọc bằng `createPortal(..., document.body)`.
   - Ngăn chặn hoàn toàn hiện tượng backdrop bị "nhốt" bên trong container có animation `transform` của Framer Motion. Backdrop luôn phủ 100% diện tích màn hình.
2. **Deep Fallback cho Cấu hình Cache LocalStorage:**
   - Dữ liệu cấu hình khi nạp luôn được gộp (shallow merge + nested fallback) cùng `DEFAULT_CALENDAR_CONFIG`.
   - Các mảng `rolePermissions.viewCalendar`, `eventCategories`, `navOrder.platform`, `rule.mappedPhaseIds` luôn đi kèm toán tử `|| []` trước khi gọi `.length` hoặc `.map()`.
3. **Chuẩn Hóa Kiểu Dữ Liệu Leave Service:**
   - Đảm bảo hàm `fetchTeamLeaves()` luôn trả về mảng `UserLeaveRecord[]`. Các consumer quản lý trực tiếp qua mảng `leavesList`, không truy cập qua thuộc tính giả định `.leaves`.

---

## 🧪 7. BẢNG KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITE)

Bộ kiểm thử được viết bằng **Vitest** tại `tests/test-calendar-planner.test.ts` (11 bài test) và `tests/test-leave-sync.test.ts` (1 bài test), đạt tỷ lệ vượt qua **100% (12/12 tests)**:

```bash
 ✓ tests/test-leave-sync.test.ts (1 test) 2ms
 ✓ tests/test-calendar-planner.test.ts (11 tests) 9ms

 Test Files  2 passed (2)
      Tests  12 passed (12)
```

1. `computeCalendarWeeks` 5 cột: Kiểm tra chính xác mỗi tuần chỉ có 5 ngày làm việc (Mon → Fri).
2. `computeCalendarWeeks` 7 cột: Kiểm tra chính xác mỗi tuần có đủ 7 ngày (Mon → Sun).
3. Đánh dấu đầu tháng: Kiểm tra cờ `isFirstOfMonth = true` và nhãn `monthShort` (vd: `Oct 1`).
4. Đánh dấu ngày hôm nay: Kiểm tra cờ `isToday = true` cho ngày thực tế.
5. Cập nhật Deadline thành công: Kiểm tra đổi ngày deadline và ghi nhận `task_updates` trong localStorage.
6. Ghi nhận Activity Log chi tiết: Kiểm tra đầy đủ actor, hạn cũ, hạn mới và lý do dời hạn.
7. Chặn dời hạn sai format: Báo lỗi khi truyền chuỗi ngày không hợp lệ.
8. Thêm sự kiện team: Hàm `addTeamEvent` tạo sự kiện mới và nạp vào cấu hình.
9. Sửa sự kiện team: Hàm `updateTeamEvent` cập nhật thông tin sự kiện.
10. Xóa sự kiện team: Hàm `deleteTeamEvent` gỡ bỏ sự kiện khỏi cấu hình.
11. Phân quyền RBAC dời hạn: Kiểm tra cấm Designer và PO dời deadline nếu chưa được cấp quyền trong Admin.
12. Đồng bộ Lịch nghỉ: Bóc tách chính xác các trường dữ liệu từ Google Sheets.
