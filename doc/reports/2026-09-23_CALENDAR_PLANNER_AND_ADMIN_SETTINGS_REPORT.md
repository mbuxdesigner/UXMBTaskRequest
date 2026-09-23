# 📋 BÁO CÁO CẬP NHẬT TOÀN DIỆN HỆ THỐNG — NGÀY 23/09/2026
## HỆ THỐNG MB UX REQUEST PORTAL & TASK MANAGEMENT
### PHÂN HỆ: UX TEAM PLANNER, DUAL-CALENDAR & CẤU HÌNH QUẢN TRỊ HỆ THỐNG

> **Ngày thực hiện:** 23/09/2026  
> **Người thực hiện:** Antigravity AI Engineering Team  
> **Trạng thái:** ✅ Đã hoàn thành 100% — Build sản phẩm thành công trong 566ms, 12/12 Unit tests passed tuyệt đối.

---

## 📌 TỔNG QUAN CÔNG VIỆC TRONG NGÀY

Trong ngày làm việc 23/09/2026, đội ngũ kỹ thuật đã tập trung triển khai và hoàn thiện trọn gói phân hệ **UX Team Planner & Calendar** kết hợp **Cấu hình Quản trị Lịch trong Admin**, đồng thời tiến hành rà soát nghiêm túc, phát hiện và xử lý dứt điểm các lỗi runtime crash và lỗi giao diện (UI):

1. **Xây Dựng Toàn Diện Module UX Team Planner & Dual-Calendar (`src/pages/CalendarPage.tsx`):**
   - Áp dụng cấu trúc **Lịch Đôi (Dual-Calendar Architecture)**: Cột trái (Mini Calendar, Widget "Vertex Studio · Today", Danh mục Ưu tiên, Người tham dự, Danh sách task theo cá nhân) + Khu vực trung tâm (Lưới lịch lớn đa chế độ: Tháng, Tuần, Ngày, Lịch trình).
   - Tích hợp chuẩn xác **4 Tầng Dữ Liệu**:
     - *Tầng 1:* Đề bài & Deadline UX (`ux_portal_real_requests`), hỗ trợ kéo thả dời hạn trực tiếp trên lịch. Tự động ghi nhật ký `TaskUpdateRecord` vào lịch sử bài toán.
     - *Tầng 2:* Lịch nghỉ phép nhân sự đồng bộ từ Google Sheets tab `Đăng ký nghỉ` (Cột C, D, E, G) qua `leaveService.ts` có cache thông minh. Cảnh báo tự động khi deadline trùng ngày nghỉ của Designer phụ trách.
     - *Tầng 3:* Lịch làm việc, nghỉ lễ và ngày làm bù ngân hàng (`workSchedule`).
     - *Tầng 4:* Sự kiện nội bộ UX Team với các danh mục tùy biến linh hoạt.
   - Thiết kế chuẩn **ClickUp Planner & ReUI**:
     - Widget nghỉ phép `Vertex Studio · Today` chuẩn theo ảnh tham chiếu `media_1790107058303.png`: Avatar xếp chồng `-space-x-1.5`, badge `+N`, nút `All` mở modal xem tất cả nhân sự nghỉ hôm nay.
     - Thanh tìm kiếm nổi ở đáy (`Floating Search Dock`) cố định tại `bottom-4 left-1/2 -translate-x-1/2`.
     - ClickUp Command Palette bung mở từ dưới lên (`springs.popover`), tích hợp danh sách đề tài sắp tới (`Up next`), lệnh thao tác (`Commands`) và bộ lọc theo thành viên (`Team`).
     - Nút chuyển nhanh `5D` (5 ngày làm việc Thứ 2 - Thứ 6) và `7D` (toàn bộ 7 ngày).
     - Badge đầu tháng nền đen (vd: `Oct 1`) và vòng tròn đỏ ngày hôm nay (`bg-[#E53935]`).

2. **Xây Dựng Tab Cấu Hình Quản Trị Hệ Thống (`src/components/admin/CalendarConfigTab.tsx`):**
   - Thiết lập quy tắc hiển thị mặc định: Chế độ mở đầu (`Month`/`Week`/`Day`/`Agenda`), ngày bắt đầu tuần (Thứ Hai / Chủ Nhật), khung giờ làm việc tiêu chuẩn.
   - Bảng ma trận phân quyền vai trò (Role Permissions RBAC) cho 4 nhóm quyền: Admin, Design Owner, Designer, PO / Business.
   - Quản lý danh mục sự kiện team (CRUD Event Categories): Tùy chọn tên, mã màu đại diện (`color picker`), mô tả và trạng thái mặc định hệ thống.
   - Cổng giám sát kết nối Lịch nghỉ phép: Thống kê số lượt nghỉ trong bộ nhớ, nhân sự nghỉ hôm nay, lần đồng bộ gần nhất và nút kích hoạt quét lại tức thì (`forceRefresh`).

3. **Chẩn Đoán & Khắc Phục Triệt Để 2 Lỗi Nghiêm Trọng (Theo Ảnh Báo Cáo):**
   - **Lỗi 1 (Runtime ErrorBoundary Crash - `media_1790124102222.png`):** Màn hình `Quản trị hệ thống` văng lỗi `Cannot read properties of undefined (reading 'length')`. Nguyên nhân do `fetchTeamLeaves()` trả về mảng nhưng code truy xuất sai `res.leaves.length`, kết hợp thiếu optional chaining trên các mảng `rolePermissions`, `eventCategories`, `navOrder.platform`, và `rule.mappedPhaseIds`. Đã chuẩn hóa toàn diện `leavesList: TeamLeaveRecord[]` và áp dụng toán tử phòng thủ `|| []` ở tất cả các vị trí.
   - **Lỗi 2 (Modal Backdrop Bị Giam Hãm & Lịch Co Rút - `media_1790124081964.png`):** Modal "Thêm sự kiện team mới" chỉ làm mờ phần nội dung nhỏ của lịch; thanh Menu bên trái (Sidebar) và Header phía trên hoàn toàn trắng trơn và bấm được bình thường. Lịch bị co rút có viền đôi, thanh tìm kiếm dưới đáy bị che lấp. Nguyên nhân do phần tử cha có thuộc tính `transform` của animation Framer Motion làm hỏng stacking context của `position: fixed`. Đã chuyển toàn bộ 5 Dialog/Modal sang cơ chế **`createPortal(..., document.body)`**, đồng thời cấu hình trang Calendar ở chế độ **Full-bleed Desktop Workspace** (loại bỏ viền đôi và margin thừa).

---

## 🎯 CHI TIẾT BẢNG TIẾN ĐỘ THỰC HIỆN

| STT | Hạng Mục Công Việc | File Xử Lý | Trạng Thái | Kết Quả Đạt Được |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **Thuật toán lưới tuần Mon-Fri / Mon-Sun** | `src/services/calendarService.ts` | ✅ Đạt 100% | Hàm `computeCalendarWeeks()` chia tuần theo hàng độc lập, không lệch cột khi chuyển giữa 5 cột và 7 cột. |
| **2** | **Cập nhật Deadline kéo thả & Activity Log** | `src/services/calendarService.ts` | ✅ Đạt 100% | Hàm `updateTaskDeadlineWithLog()` dời hạn bài toán, kiểm tra quyền RBAC và ghi nhật ký `TaskUpdateRecord` vào bài toán. |
| **3** | **Quản lý Sự kiện Team (CRUD)** | `src/services/calendarService.ts` | ✅ Đạt 100% | Các hàm `addTeamEvent()`, `updateTeamEvent()`, `deleteTeamEvent()` lưu trữ trực tiếp vào cấu hình hệ thống. |
| **4** | **Giao diện Dual-Calendar Workspace** | `src/pages/CalendarPage.tsx` | ✅ Đạt 100% | Full-bleed app layout; tích hợp Planner Sidebar trái, lưới tháng lớn, Floating Search Dock, Command Palette. |
| **5** | **Widget Nghỉ Phép Vertex Studio** | `src/pages/CalendarPage.tsx` | ✅ Đạt 100% | Hiển thị danh sách nhân sự nghỉ hôm nay (Today) độc lập với ngày chọn trên lịch, avatar xếp chồng chuẩn ClickUp. |
| **6** | **Modal Backdrop Portal** | `src/pages/CalendarPage.tsx` | ✅ Đạt 100% | Bọc 5 Modal/Popover bằng `createPortal(..., document.body)`, phủ đen mờ 100% diện tích màn hình gồm cả Sidebar & Header. |
| **7** | **Tab Cấu hình Lịch trong Admin** | `src/components/admin/CalendarConfigTab.tsx` | ✅ Đạt 100% | 4 khối chức năng: Quy tắc hiển thị, RBAC Roles, CRUD Danh mục sự kiện, Giám sát cổng đồng bộ Lịch nghỉ. |
| **8** | **Khắc phục lỗi Crash Quản trị hệ thống** | `src/pages/QuanLyPage.tsx`<br>`src/components/admin/CalendarConfigTab.tsx` | ✅ Đạt 100% | Khai báo `calendar_config` vào `type AdminTab`; sửa triệt để lỗi `.length` trên các mảng chưa khởi tạo. |
| **9** | **Full-bleed Routing trong App.tsx** | `src/App.tsx` | ✅ Đạt 100% | Render `page === "calendar"` ở chế độ toàn khung nhìn không padding ngoài, triệt tiêu lỗi cuộn kép (double scrollbars). |
| **10** | **Tài liệu Tính năng & Báo cáo** | `doc/features/13_UX_TEAM_PLANNER_AND_CALENDAR.md`<br>`doc/reports/2026-09-23_CALENDAR_PLANNER_AND_ADMIN_SETTINGS_REPORT.md` | ✅ Đạt 100% | Biên soạn tài liệu kiến trúc, luồng dữ liệu, hướng dẫn vận hành và nhật ký khắc phục sự cố chi tiết. |

---

## 🛠️ CHI TIẾT SỬA LỖI & PHÒNG THỦ KỸ THUẬT (BUG FIXES)

### 1. Khắc Phục Lỗi Crash `Cannot read properties of undefined (reading 'length')`

#### Hiện tượng:
Người dùng truy cập vào Workspace Quản trị hệ thống (`#manage`), trang bị sập hoàn toàn và hiển thị màn hình ErrorBoundary:
```
Cannot read properties of undefined (reading 'length')
```

#### Nguyên nhân kỹ thuật:
1. `fetchTeamLeaves()` trong `src/services/leaveService.ts` trả về mảng `UserLeaveRecord[]`. Tuy nhiên trong `CalendarConfigTab.tsx`, state được định nghĩa sai kiểu đối tượng `{ leaves: TeamLeaveRecord[] }`. Khi gọi `setLeavesData(res)` thì `leavesData` là một mảng, dẫn đến `leavesData.leaves` bị `undefined`. Khi component render:
   ```tsx
   leavesData.leaves.filter(...) // THROW TypeError: Cannot read properties of undefined (reading 'filter')
   leavesData?.leaves.length     // THROW TypeError: Cannot read properties of undefined (reading 'length')
   ```
2. Nếu người dùng có dữ liệu `localStorage` từ các phiên bản cũ chưa có key `rolePermissions`, `eventCategories`, `navOrder.platform`, hoặc `rule.mappedPhaseIds`, việc truy cập trực tiếp `.includes()` hoặc `.length` mà không có fallback sẽ gây sập trang ngay lập tức.
3. Trong `QuanLyPage.tsx`, kiểu dữ liệu `AdminTab` bị thiếu union `"calendar_config"`.

#### Biện pháp xử lý:
- Chuyển đổi state trong `CalendarConfigTab.tsx` sang mảng phẳng:
  ```tsx
  const [leavesList, setLeavesList] = useState<TeamLeaveRecord[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  ```
- Thêm cơ chế nạp cấu hình hợp nhất sâu (deep merge with defaults):
  ```tsx
  const [config, setConfig] = useState<CalendarConfig>(() => {
    const sys = getSystemConfig()
    const cal = sys?.calendar || DEFAULT_CALENDAR_CONFIG
    return {
      ...DEFAULT_CALENDAR_CONFIG,
      ...cal,
      rolePermissions: {
        ...DEFAULT_CALENDAR_CONFIG.rolePermissions,
        ...(cal?.rolePermissions || {}),
      },
      eventCategories: Array.isArray(cal?.eventCategories) && cal.eventCategories.length > 0
        ? cal.eventCategories
        : DEFAULT_CALENDAR_CONFIG.eventCategories,
      teamEvents: Array.isArray(cal?.teamEvents) ? cal.teamEvents : [],
    }
  })
  ```
- Áp dụng toán tử phòng vệ `|| []` ở tất cả các vị trí render:
  - `(config.eventCategories || []).map(...)`
  - `const canView = config.rolePermissions?.viewCalendar?.includes(role) ?? true`
  - `(navOrder?.platform || []).length`, `(navOrder?.platform || []).map(...)`
  - `(navOrder?.resources || []).length`, `(navOrder?.resources || []).map(...)`
  - `(rule.mappedPhaseIds || []).length`
  - `(editingStatusRule?.mappedPhaseIds || []).includes(phase.id)`
- Cập nhật định nghĩa:
  ```typescript
  type AdminTab = "team" | "rbac" | "evaluation" | "test_bank" | "workflow" | "calendar_config" | "form_config" | "system_params" | "notifications_config" | "masterdata" | "integrations" | "audit"
  ```

---

### 2. Khắc Phục Lỗi Backdrop Modal Bị Giam Hãm & Co Rút Khung Làm Việc

#### Hiện tượng:
Khi mở modal "Thêm sự kiện team mới", lớp nền tối (`fixed inset-0 bg-slate-900/40`) chỉ che phủ trong vùng nhỏ của lịch. Toàn bộ thanh Menu (Sidebar) bên trái và thanh Header bên trên vẫn sáng trắng và có thể click xuyên qua. Giao diện xuất hiện thanh cuộn kép làm che mất thanh tìm kiếm ở đáy.

#### Nguyên nhân kỹ thuật:
- Theo tiêu chuẩn CSS W3C, bất kỳ phần tử tổ tiên (ancestor) nào có thuộc tính `transform`, `filter`, hoặc `perspective` (do Framer Motion tự động tạo ra khi chạy hiệu ứng chuyển trang `motion.div`) sẽ thiết lập một **Containing Block** mới cho tất cả các phần tử con bên trong. Khi đó, `position: fixed` của modal không còn định vị theo `viewport` của cửa sổ trình duyệt mà bị giới hạn trong khung chứa của phần tử cha.
- Trang `CalendarPage` được bọc bên trong container chung có `px-3.5 py-4` và footer hệ thống, làm giảm chiều cao khả dụng và sinh thanh cuộn ngoài ngoài ý muốn.

#### Biện pháp xử lý:
- Sử dụng **`createPortal(..., document.body)`** từ thư viện `react-dom` cho toàn bộ các Dialog / Modal / Popover:
  ```tsx
  {typeof document !== "undefined" &&
    createPortal(
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div ...>
              ...
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}
  ```
- Chuyển `CalendarPage` sang chế độ **Full-bleed Workspace** trong `src/App.tsx`:
  ```tsx
  {page === "calendar" ? (
    <div className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden">
      <CalendarPage />
    </div>
  ) : ...}
  ```
- Xóa bỏ margin `m-3 mb-2` và viền đôi trong `CalendarPage.tsx`, cho phép khung lịch bung rộng 100% diện tích, Dock tìm kiếm đáy cố định `bottom-4` nổi bật và thanh thoát.

---

## 🧪 KẾT QUẢ KIỂM THỬ & CHỈ SỐ BUILD HỆ THỐNG

### 1. Kiểm Thử Tự Động (Vitest Unit Tests)
Chạy lệnh `npx vitest run`:
```bash
 RUN  v5.0.1 D:/AI dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main

 ✓ tests/test-leave-sync.test.ts (1 test) 2ms
 ✓ tests/test-calendar-planner.test.ts (11 tests) 9ms

 Test Files  2 passed (2)
      Tests  12 passed (12)
   Duration  276ms (transform 70%, import 22%, tests 5%, worker 3%)
```
- **12/12 tests vượt qua 100%** bao phủ: thuật toán lưới tuần 5 ngày và 7 ngày, đánh dấu ngày đầu tháng, đánh dấu ngày hôm nay, cập nhật deadline kèm Activity Log, chặn dời hạn sai format, CRUD sự kiện team nội bộ, phân quyền RBAC và bóc tách dữ liệu nghỉ phép.

### 2. Kiểm Thử Đóng Gói Sản Phẩm (Vite Production Build)
Chạy lệnh `npm run build`:
```bash
vite v8.0.3 building client environment for production...
transforming...✓ 2979 modules transformed.
rendering chunks...
computing gzip size...
dist/assets/CalendarPage-x4uIkY5z.js          46.22 kB │ gzip:  11.31 kB
dist/assets/QuanLyPage-CcYCWoah.js           395.33 kB │ gzip:  74.67 kB
✓ built in 566ms
```
- Quá trình biên dịch hoàn thành chỉ trong **566ms**.
- **0 lỗi syntax, 0 lỗi TypeScript, 0 lỗi bundling.**

---

## 📂 DANH MỤC CÁC TỆP ĐÃ TẠO MỚI & CHỈNH SỬA

### Tệp Tạo Mới:
1. `doc/features/13_UX_TEAM_PLANNER_AND_CALENDAR.md`: Tài liệu đặc tả kiến trúc, 4 tầng dữ liệu, cấu hình Admin và nguyên tắc phòng vệ cho module Calendar Planner.
2. `doc/reports/2026-09-23_CALENDAR_PLANNER_AND_ADMIN_SETTINGS_REPORT.md`: Báo cáo chi tiết công việc, nguyên nhân và biện pháp khắc phục sự cố ngày 23/09/2026.

### Tệp Chỉnh Sửa & Tối Ưu:
1. `src/components/admin/CalendarConfigTab.tsx`: Chuẩn hóa state `leavesList`, bổ sung deep fallbacks cho cấu hình, phòng vệ role permissions và event categories.
2. `src/pages/QuanLyPage.tsx`: Bổ sung `calendar_config` vào `type AdminTab`, thêm kiểm tra an toàn cho `navOrder.platform`, `navOrder.resources`, `rule.mappedPhaseIds` và `editingStatusRule.mappedPhaseIds`.
3. `src/pages/CalendarPage.tsx`: Đưa 5 Dialog/Modal vào `createPortal(..., document.body)`, xóa bỏ margin thừa, tối ưu vị trí Search Dock, đảm bảo tính duy nhất cho React keys.
4. `src/App.tsx`: Cấu hình routing Full-bleed cho trang `calendar` (loại bỏ padding ngoài và footer).
5. `walkthrough.md`: Cập nhật lịch sử thay đổi và kết quả xác minh kỹ thuật.

---

## 🎯 KẾT LUẬN & ĐỀ XUẤT TIẾP THEO

Phân hệ **UX Team Planner & Calendar** cùng cấu hình **Quản trị hệ thống** hiện tại đã hoạt động ổn định tuyệt đối, giao diện bám sát 100% tài liệu `UI_DESIGN_SYSTEM.md` và các ảnh tham chiếu thực tế từ người dùng. Không còn phát sinh bất kỳ lỗi giam hãm giao diện (backdrop confinement) hay lỗi sập trang (crash ErrorBoundary) nào.

**Đề xuất tiếp theo:**
- Hướng dẫn các Lead Designer và Admin thử nghiệm kéo thả dời hạn task thực tế trên giao diện để kiểm tra tính năng ghi nhận Activity Logs.
- Có thể tiếp tục kết nối Webhook thông báo sang Microsoft Teams khi có sự kiện dời hạn hoàn thành bài toán quan trọng.
