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
- Designer Planner dùng luồng **Schedule meeting** theo pattern REUI Schedule 3: lịch tháng trực quan, time slot, thời lượng, chu kỳ lặp có ngày kết thúc, loại sự kiện, người tham gia, địa điểm/link họp và agenda.
- Người tham gia chỉ được chọn từ danh sách Designer/Design Owner đồng bộ từ Admin (`mbbank_admin_team` / `fetchTeamMembersFromSheet`), không nhập email tự do.
- Loại sự kiện đọc trực tiếp `calendar.eventCategories`, hiển thị đúng tên, mô tả và màu cấu hình trong Admin. Màu này tiếp tục được dùng trên event chip của lịch.
- Event hỗ trợ một ảnh thumbnail tối đa 10 MB. Ảnh được tải qua gateway Google Drive hiện có, lưu URL trong `TeamEvent.attachments`, hiển thị chỉ báo trên ô lịch và trong chi tiết event.
- Event lặp được mở rộng thành các occurrence hằng ngày/tuần/tháng đến hết `recurrenceEndDate`; mỗi occurrence giữ nguyên giờ bắt đầu, thời lượng và kiểm tra xung đột nghỉ phép.

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

---

## 8. DESIGNER PLANNER CÁ NHÂN — MVP ĐÃ TRIỂN KHAI (27/09/2026)

### 8.1. Bố cục và trải nghiệm

`src/pages/DesignerPlannerPage.tsx` là màn hình mặc định của route Lịch & Planner. Trang lấy lịch làm việc làm trung tâm và gồm:

1. Ngày hiện tại, lời chào theo tên Designer và một câu cảm hứng chọn ngẫu nhiên mỗi lần mount trang.
2. Khối “AI điểm nhanh hôm nay” có thời điểm cập nhật, thao tác tóm tắt lại, thu gọn và deep-link tới task liên quan.
3. Ba KPI cá nhân: đang phụ trách, task overload và task go-live trong tuần; bên dưới là phân bố theo bốn khâu UX.
4. Lịch tháng/tuần theo bố cục 70/30, điều hướng kỳ trước/sau/Hôm nay và bộ lọc từng loại nội dung.
5. Panel ngày đang chọn, task Lv1/Lv2 trong tuần và danh sách task chưa xếp ngày.
6. Feed cập nhật liên quan đến các task của Designer, có Chưa đọc/Tất cả và đánh dấu đã đọc.
7. Responsive một cột trên viewport nhỏ; calendar giữ vùng cuộn ngang riêng để không làm vỡ toàn trang.

### 8.2. Các lớp dữ liệu trên lịch

| Lớp | Nguồn | Màu/ngữ nghĩa |
| :--- | :--- | :--- |
| Deadline cam kết | `expected_deadline` / `design_deadline` | Rose |
| Ngày dự kiến làm | `planned_work_date` | Blue |
| Lịch nghỉ cá nhân | `leaveService` lọc theo tên/email phiên | Amber |
| Event team | `calendar.teamEvents` | Violet |
| Event cá nhân | Event do chính Designer tạo và tham dự | Cyan |
| Nghỉ lễ/ngày làm bù | `workSchedule.holidays` | Trạng thái nền ô lịch, không tạo event/task chip |

Người dùng có thể bật/tắt độc lập các lớp task/event. Ô ngày hiển thị tối đa ba mục ở Month view và có nhãn `+N mục khác` khi vượt giới hạn. Ngày không làm việc được tô nền xám; ngày nghỉ lễ hiển thị watermark “Nghỉ lễ” cùng tên ngày lễ ở nền ô. Ngày làm bù dùng nền xanh rất nhẹ và watermark “Làm bù”.

### 8.3. Rule-based briefing và số liệu cá nhân

- “AI điểm nhanh” hiện là rule engine nội bộ, không gửi dữ liệu task ra nhà cung cấp AI bên ngoài.
- Khối AI dùng surface trắng kiểu ClickUp, icon `/public/ai-default.png` và progressive typewriter cho từng nhận định. Bấm “Tóm tắt lại” chạy lại nội dung theo thứ tự; hover/focus một nhận định mở preview nổi có boundary detection, mô tả và metadata task liên quan.
- Câu truyền cảm hứng được chọn ngẫu nhiên khi vào trang, gõ theo kiểu typewriter, giữ 20 giây rồi xóa để chuyển sang một câu ngẫu nhiên khác. Hiệu ứng đi theo chính sách motion runtime của ứng dụng (`MotionConfig reducedMotion="never"`) để không bị Windows vô hiệu hóa ngoài mong đợi.
- Engine ưu tiên cảnh báo quá hạn/quá tải, deadline trong tuần, go-live trong tuần và task chưa xếp ngày.
- Task cá nhân được lọc qua `isTaskAssignedToUser()` theo session, bao gồm assigned designer/UX owner và design owner khi phù hợp.
- Phân bố khâu được chuẩn hóa về `Define đầu bài`, `Wireframe + UI`, `Ready to dev`, `Nghiệm thu UI`.
- Logic thuần nằm trong `src/lib/designerPlanner.ts` để có thể kiểm thử độc lập và tái sử dụng.

### 8.4. Sheet tương tác của Planner

- Các luồng “Xếp ngày dự kiến”, “Schedule meeting” và “Chi tiết lịch & mốc cần nhớ” dùng chung `RightSheet` trượt từ phải, có backdrop, Escape/outside-click, sticky header/footer và responsive full-width trên mobile.
- Việc mở task từ briefing, notification hoặc event vẫn chuyển sang Request Detail vốn đã là slide-over sheet, không tạo thêm modal chồng lớp.

### 8.5. Ngày dự kiến làm và Cloud persistence

- `UXRequest` có trường tùy chọn `planned_work_date`; đây là ngày kế hoạch cá nhân và **không thay đổi deadline cam kết**.
- Thao tác “Xếp ngày/Đổi ngày” cập nhật cache tức thì, tạo activity note và gửi qua `update_task_progress`.
- Frontend `googleSheetService.ts` đưa `planned_work_date` vào payload và normalize response.
- Apps Script ghi trường này vào `RAW_TASKS.Payload_JSON`; cần deploy **New Version** để production lưu được qua nhiều thiết bị.

### 8.6. Phạm vi chưa hoàn thiện

- Event cá nhân đang tái sử dụng `calendar.teamEvents`; chưa có schema `ownerEmail/visibility` riêng và chưa đảm bảo đồng bộ đa thiết bị ngoài luồng SystemConfig hiện tại.
- Trạng thái đã đọc notification vẫn là local browser.
- Rule-based briefing chưa phải AI sinh nội dung. Chỉ tích hợp AI thật sau khi có quyết định về provider và chính sách dữ liệu.
- Team Planner cũ vẫn được giữ tại `src/pages/CalendarPage.tsx` để đối chiếu, nhưng route mặc định đã chuyển sang Designer Planner.

### 8.7. Kiểm thử

- `tests/test-designer-planner.mjs`: week bounds, go-live, phase distribution, briefing, phân tách planned date/deadline và contract Apps Script.
- `tests/test-calendar-planner.test.ts` + `tests/test-leave-sync.test.ts`: **12/12 PASS**.
- `npm test`: toàn bộ regression suite PASS.
- `npm run build`: PASS.

---

## 9. NÂNG CẤP VÀ HOÀN THIỆN ĐIỀU HÀNH PLANNER (29/09/2026)

### 9.1. Luồng Agent Activity Trace (4/4 Bước Tuần Tự)
- **Vấn đề trước đây:** Quá trình đọc/tổng hợp dữ liệu thường bị hủy ngang hoặc reset về bước 1/4 khi các hook/state ở component cha re-render dữ liệu ngầm, hoặc hiển thị kết quả quá sớm khi chưa đọc đủ 4 bước.
- **Giải pháp chuẩn hóa:** Component `AgentActivityTrace.tsx` được cô lập với `useRef` lưu giữ callback `onComplete` và chuỗi `setTimeout` độc lập. Quá trình trace chạy chính xác 4 bước tuần tự (`1/4`, `2/4`, `3/4`, `4/4`) kèm thanh tiến độ mượt mà (`h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full`).
- **Bàn giao tức thì (Immediate Handover):** Khi kết thúc bước 4/4, component kích hoạt handover sang phần hiển thị nội dung ngay lập tức mà không cần chờ các skeleton hay query nền khác của trang kết thúc.

### 9.2. Executive Summary Typewriter Streaming & Clickable Hyperlinks
- **Hiệu ứng Gõ chữ Tự nhiên (Typewriter):** Component `ExecutiveSummaryTypewriter.tsx` nhận văn bản markdown thô từ AI Engine và phát luồng (stream) từng ký tự với tốc độ mượt mà (~14ms/ký tự) kèm con trỏ nhấp nháy `|` chuẩn AI Assistant. Người dùng có thể nhấn phím tắt hoặc nút "Bỏ qua hiệu ứng gõ" để hiển thị ngay toàn bộ nội dung.
- **Định dạng Text thuần khiết & Liên kết Trực quan:** Văn bản không chia thành các khối card màu sắc phức tạp mà hiển thị như một lời phản hồi tinh tế của AI Chatbot.
- **Hyperlink nhận diện Task & Event:** Các mã Task (`[TASK-1234: Tiêu đề]`) và Event (`[EVENT: Tên sự kiện]`) tự động được biên dịch thành liên kết:
  - Task link: Màu xanh `text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer`, click mở thẳng Slide-Over Sheet chi tiết task.
  - Event link: Màu tím `text-purple-600 hover:text-purple-800 underline font-medium cursor-pointer`, click mở Right Sheet chi tiết/chỉnh sửa sự kiện.

### 9.3. Kiến trúc Thẻ Đứng Im (Stationary Card Layout - CLS = 0)
- Thẻ Executive Summary được cấu hình đứng im cố định (`no entrance animation`), loại bỏ hoàn toàn hiện tượng nhấp nháy chuyển giao (layout shift) giữa skeleton/trace và khối văn bản hoàn thiện.
- Các thẻ bên dưới (KPI Cards, Weekly Calendar, Right Detail Panel) áp dụng hiệu ứng xuất hiện xếp tầng mềm mại (staggered cascade animation) với độ trễ tiến triển (`120ms` per card), tạo cảm giác nhịp nhàng, có chiều sâu cho toàn trang.

### 9.4. Phạm vi Scoping Cá nhân Tuyệt đối (Strict Personal Scoping)
- **Quy tắc cốt lõi:** Designer Planner là không gian cá nhân của từng chuyên viên thiết kế. Toàn bộ thông tin hiển thị (Task, Event, Thống kê KPI, AI Briefing) phải xoay quanh chính cá nhân đó:
  - Task: Thuộc quyền sở hữu, được giao phân công (assignee), hoặc được thêm vào danh sách theo dõi (viewer).
  - Event: Do người đó tạo hoặc nằm trong danh sách người tham gia (attendees).
- **Áp dụng cho mọi vai trò (Kể cả Admin):** Khi tài khoản Admin vào trang Designer Planner, hệ thống chỉ lọc các bài toán và sự kiện mà Admin đó trực tiếp tham gia phụ trách hoặc theo dõi, không hiển thị tràn lan toàn bộ dữ liệu của cả team. Muốn xem toàn cảnh, Admin truy cập module **Lịch Team MBBank** (Team Planner).

### 9.5. Quản lý Sự kiện: Phân quyền Chỉnh sửa & Avatar Danh sách Tham gia
- **Phân quyền chỉnh sửa (Edit Event RBAC):** Chỉ Quản trị viên (Admin) hoặc chính người tạo sự kiện (Creator) mới có quyền mở form `ScheduleMeetingDialog` để chỉnh sửa/xóa sự kiện.
- **Avatar Stack Người tham gia:** Khung chi tiết sự kiện hiển thị danh sách người tham gia theo chuẩn `CAvatar29` xếp chồng `-space-x-1.5` kèm viền trắng `ring-2 ring-white`, hỗ trợ Dark Hover Tooltip liệt kê đầy đủ họ tên/email như danh sách Viewers trong chi tiết Task.

---

## 10. EXECUTIVE INTELLIGENCE ALL-IN-ONE & CHUẨN HÓA REUI (30/09/2026)

### 10.1. Chuẩn hóa ReUI Empty State (`EmptyState10` & `EmptyState1`)
- **Vấn đề giải quyết:** Các trạng thái rỗng (Empty State) trước đây được viết ad-hoc, thiếu tính nhất quán với thư viện thiết kế chuẩn ReUI.
- **Giải pháp chuẩn hóa:**
  - **`EmptyState10` cho Panel Ngày đang chọn (Selected Day):** Tích hợp component ReUI Empty State 10 với icon hộp lưu trữ nét mảnh, tiêu đề "Chưa có công việc hoặc sự kiện", mô tả hướng dẫn người dùng kéo thả task hoặc tạo sự kiện mới, và nút CTA "Tạo sự kiện" nổi bật.
  - **`EmptyState1` cho Notification Dropdown:** Tích hợp ReUI Empty State 1 với biểu tượng chuông thông báo cách điệu và nút bấm "Tải lại danh sách" khi không có thông báo mới.

### 10.2. Tinh gọn Giao diện Ưu tiên (Priority) & Kéo thả (Drag & Drop)
- **Loại bỏ chữ thừa:** Gỡ bỏ cụm chữ "Kéo thả" dài dòng ở từng đầu task; thay bằng icon `GripVertical` tinh tế đặt ngay phía trước tiêu đề (`opacity-40 group-hover:opacity-100 cursor-grab active:cursor-grabbing`).
- **Ẩn tag Lv1 thừa:** Khi các bài toán đã được gom vào khu vực "Ưu tiên tuần này (Priority)", badge "Lv1" bên trong thẻ task được ẩn đi vì bản thân khu vực đã được định danh và phân loại thứ tự theo level ưu tiên.
- **Xếp lịch kéo thả mượt mà:** Người dùng kéo task từ danh sách thả vào bất kỳ ô ngày nào trên lịch (Tháng hoặc Tuần), mở popup xác nhận với ghi chú deadline tiêu chuẩn theo phase (`getPhaseDeadlineInfo`), cập nhật tức thì (0ms Optimistic UI) và đồng bộ ngầm lên Google Sheet / Cloud.

### 10.3. Executive Summary All-in-One (Tổng hợp 1 lần 5 chiều thông tin)
- **Loại bỏ thanh tab phân mảnh:** Bỏ 4 nút tab nhỏ (`Tổng quan`, `Ủy quyền`, `Thảo luận`, `Năng suất`) và text "Trợ lý đồng hành" kèm chấm xanh ở đầu thẻ theo yêu cầu trải nghiệm.
- **Tổng hợp toàn diện một lần đọc (`angle === "all"`):** Engine `src/lib/executiveIntelligence.ts` kết nối mượt mà 5 chiều thông tin cốt lõi trong một bản tin duy nhất:
  1. **Lời chào & Tiến độ cá nhân:** Chào theo thời điểm trong ngày (sáng/trưa/chiều/tối/đêm), phân tích số bài toán đang phụ trách, tiến độ % và trọng tâm khâu UX hiện tại.
  2. **Radar bài toán ủy quyền:** Điểm nhanh các bài toán do người dùng tạo nhưng giao cho đồng đội phụ trách kèm tiến độ %, hạn chót và avatar/tên người thực hiện.
  3. **Điểm nóng thảo luận & Chat:** Nhận diện các bài toán có nhiều trao đổi sôi nổi nhất kèm badge `[💬 X trao đổi]` và trích dẫn phản hồi gần nhất.
  4. **Phân tích Deep Work & Lịch trình:** Tổng hợp số cuộc họp trong ngày, tính toán số giờ tập trung Deep Work khả dụng và xếp hạng chất lượng tập trung.
  5. **Đề xuất hành động chiến lược:** Lời khuyên cụ thể cho ngày/tuần giúp Designer chốt chặn sản phẩm đúng cam kết.
- **Ma trận chống trùng lặp câu chữ (Anti-Repetition Narrative Matrix):** Tích hợp hệ thống xoay vòng hạt giống văn phong (`seed`) kết hợp thứ trong tuần và buổi trong ngày, xưng hô chuẩn mực ngôi "bạn" như trợ lý đồng hành chuyên biệt.

### 10.4. Khắc phục triệt để lỗi đơ luồng Tóm tắt lại (Trace Freeze 4/4)
- **Nguyên nhân cốt lõi:** Khi người dùng nhấn nút "Tóm tắt lại" (`handleRefreshBriefing`), state `isAiRefreshing` được bật thành `true`. Khi `AgentActivityTrace` chạy tới bước 4/4 và gọi callback `onComplete()` -> `handleTraceComplete`, hàm này chỉ gọi `setLoading(false)` mà không gọi `setIsAiRefreshing(false)`. Kết quả là điều kiện `loading || isAiRefreshing` luôn là `true`, khiến giao diện bị dừng cố định ở màn hình trace đã hoàn thành `4/4` mãi mãi.
- **Biện pháp xử lý 3 tầng bảo vệ:**
  1. **Direct State Reset:** `handleTraceComplete` đồng thời gọi `setLoading(false)` và `setIsAiRefreshing(false)` ngay khi animation trace hoàn tất.
  2. **Safety Timeout Guard:** Bổ sung hook `useEffect` dự phòng tự động tắt `isAiRefreshing` sau 2200ms để chống treo trong trường hợp người dùng chuyển tab làm chậm `setTimeout`.
  3. **Click-to-skip:** Người dùng có thể nhấp chuột trực tiếp vào thanh trace bất kỳ lúc nào để chuyển ngay sang màn hình nội dung tóm tắt typewriter mà không cần chờ chạy hết hiệu ứng.

---

**Last Updated:** 30/09/2026
**Changelog:**
- 30/09/2026: Chuẩn hóa ReUI Empty State (`EmptyState10` cho selected day, `EmptyState1` cho notifications), tinh gọn UI khu vực Priority (icon `GripVertical`, ẩn tag Lv1 thừa), chuyển Executive Summary sang All-in-One 1 lần xuất toàn bộ (bỏ 4 tab & nhãn trợ lý đồng hành), khắc phục triệt để lỗi đơ luồng tóm tắt (reset `isAiRefreshing` và bổ sung safety timeout 2200ms).
- 29/09/2026: Chuẩn hóa Agent Activity Trace 4/4 bước không reset, ExecutiveSummaryTypewriter gõ chữ từng ký tự kèm clickable link mở task/event, thẻ Executive Summary đứng im chống giật CLS=0, cascade animation 120ms cho các card còn lại, personal scoping tuyệt đối cho mọi role (kể cả Admin), cho phép Creator/Admin sửa event và avatar stack người tham gia.
- 28/09/2026: Chuyển từ đề xuất sang MVP Designer Planner; bổ sung UI cá nhân, AI briefing nền trắng với typewriter/hover preview, calendar 70/30, right-sheet interaction, Schedule Meeting có ảnh đính kèm, Cloud persistence cho `planned_work_date` và nền ngày nghỉ/nghỉ lễ không dùng task chip.


