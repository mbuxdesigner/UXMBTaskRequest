# ⚙️ TÍNH NĂNG 04: TRANG QUẢN TRỊ HỆ THỐNG & CẤU HÌNH PHÂN QUYỀN (ADMIN SETTINGS PORTAL)

> **Mục tiêu tính năng:** Cung cấp trung tâm chỉ huy tối cao dành cho Quản trị viên (Admin & Design Owner) theo quy chuẩn giao diện **ReUI Application Settings** (2 cột, layout tối giản, không card lồng card). Hệ thống quản lý toàn diện qua 8 phân hệ chuyên sâu (Tabs), tích hợp đặc quyền **Xem trước vai trò (Role Preview)**, cơ chế đồng bộ 2 chiều với Google Sheets và xuất báo cáo CSV/JSON.

---

## 🎯 1. KHI NÀO CẦN ĐỌC TÀI LIỆU NÀY?

- **Khi làm tính năng mới:**
  - Bổ sung cấu hình hệ thống hoặc thêm Tab quản trị mới trong `QuanLyPage.tsx`.
  - Mở rộng phân quyền nghiệp vụ RBAC cho các chức năng mới.
  - Tích hợp thêm cổng kết nối ngoài (APIs, Webhooks, Design System Token Sync).
  - Mở rộng ngân hàng đề thi hoặc ma trận đánh giá hiệu suất nhân sự.
- **Khi sửa tính năng cũ:**
  - Sửa lỗi hiển thị ma trận phân quyền hoặc menu kéo thả không cập nhật sang `Sidebar.tsx`.
  - Khắc phục sự cố đồng bộ dữ liệu nhân sự giữa LocalStorage và Google Sheet (`fetchTeamMembersFromSheet`, `syncTeamMembersToSheet`).
  - Sửa đổi các bước trong quy trình 6 khâu UX & SLA cam kết.
  - Tinh chỉnh danh mục Squads & Danh mục Sản phẩm.
  - Sửa hoặc bổ sung copywriting trong từ điển trung tâm `src/config/content.ts` nhánh `APP_CONTENT.manage`.

---

## 🏗️ 2. KIẾN TRÚC GIAO DIỆN REUI APPLICATION SETTINGS (2 CỘT)

Trang Quản trị được thiết kế theo tiêu chuẩn thiết kế phẳng hiện đại của **[ReUI Application Settings](https://reui.io/blocks/application/settings)**:
- **Cột trái (Navigation Rail - `w-64`):** Danh mục điều hướng được phân thành 3 nhóm logic, các nút chọn có hiệu ứng hover `hover:bg-zinc-50` và trạng thái kích hoạt `bg-zinc-100 text-zinc-900 font-semibold`.
- **Cột phải (Main Content Panel):** Khu vực hiển thị nội dung chi tiết theo thẻ phẳng `rounded-xl border border-zinc-200 shadow-xs`, sử dụng đường kẻ `divide-y divide-zinc-100` thay cho việc lồng nhiều hộp card.

```
src/pages/QuanLyPage.tsx (Admin & Design Owner Gate)
│
├── 🛡️ ĐẶC QUYỀN ADMIN: ROLE PREVIEW SWITCHER (Xem trước theo vai trò)
│   ├── Giả lập hiển thị dưới vai trò: Admin | Design Owner | Designer | PO
│   └── Banner cảnh báo chế độ xem thử + Nút "Về Admin gốc" (Reset)
│
├── 📂 NHÓM 1: TỔ CHỨC & PHÂN QUYỀN
│   ├── 👥 Tab 1: team - Nhân sự UX & Phân bổ Đa-Squad
│   │   ├── 4 Scorecard thống kê nhanh số lượng nhân sự
│   │   ├── Bảng nhân sự ReUI: Avatar, Tên, Email, Vai trò, Squads, Sản phẩm, Tải việc
│   │   ├── Nút "Tải từ Sheet" (Pull from Sheet) & "Đồng bộ lên Sheet" (Push)
│   │   ├── Nút "Xuất CSV" (Chuẩn UTF-8 BOM tải về mở trực tiếp bằng Excel)
│   │   └── Modal Thêm / Sửa nhân sự (phân bổ đa Squad & đa Sản phẩm)
│   │
│   ├── 🛡️ Tab 2: rbac - Phân quyền (RBAC) & Ma trận Menu
│   │   ├── Bảng quy chuẩn năng lực hệ thống (Duyệt đề bài, Chấm test, Tải việc, SLA, Audit)
│   │   ├── Ma trận bật/tắt hiển thị menu Sidebar cho từng Role
│   │   └── Kéo thả GripVertical hoặc bấm ⬆️/⬇️ đổi thứ tự Menu Platform & Resources
│   │
│   └── ✨ Tab 3: evaluation - Đánh giá Hiệu suất & Năng lực
│       ├── 4 Thẻ KPI tối giản: Chỉ số Chất lượng TB, SLA Đúng hạn, FTR (First-Time-Right), Active Members
│       └── Bảng Ma trận Năng lực & Đánh giá Hiệu suất từng cá nhân
│
├── 📂 NHÓM 2: ĐÀO TẠO & QUY TRÌNH
│   ├── 📖 Tab 4: test_bank - Quản lý Đề thi & Khảo sát Năng lực
│   │   ├── Tích hợp TestManagementView & TestRunnerView
│   │   └── Quản lý câu hỏi trắc nghiệm/tự luận, nhập xuất Excel XLSX
│   │
│   └── 🔄 Tab 5: workflow - Quy trình & Khâu UX (Phases Config & Status Rules Tool)
│       ├── Danh sách 6 khâu UX chuẩn sắp xếp dọc (Discovery -> Handoff)
│       ├── Kéo thả hoặc bấm nút ⬆️/⬇️ để đổi thứ tự bước quy trình
│       ├── Thêm / Sửa / Xóa khâu UX (SLA ngày, % tiến độ, deliverable bắt buộc)
│       ├── Nút Khôi phục mặc định 6 khâu UX MBBank
│       ├── ⚡ TOOL CẤU HÌNH QUY TẮC TRẠNG THÁI TỰ ĐỘNG (Status Automation Rules Tool):
│       │   ├── Bảng tương tác quản trị 6 trạng thái (Đang phân loại, Đang thực hiện, Đã gửi PO, Pending, Hoàn thành, Bị chặn)
│       │   ├── Toggle Switch Bật/Tắt tự động hóa từng trạng thái tức thì
│       │   ├── Modal cấu hình chuyên sâu: Tùy biến Trigger event, SLA Action, Mô tả nghiệp vụ
│       │   ├── Liên kết động với danh sách Khâu UX phía trên (Checklist đa khâu)
│       │   └── Nút Khôi phục mặc định 6 quy tắc tự động hóa chuẩn MBBank
│
└── 📂 NHÓM 3: HỆ THỐNG & KẾT NỐI
    ├── 📦 Tab 6: masterdata - Squads & Sản phẩm (Xem chi tiết doc/features/09_MASTERDATA_AND_TWO_WAY_SYNC_SETTINGS.md)
    │   ├── Giao diện ReUI Card Grid tối ưu kèm bộ lọc & tìm kiếm nhanh
    │   ├── Quản lý danh mục UX Squads: Tên, Mã Code, Hạn mức tasks, Sản phẩm phụ trách
    │   ├── Phân bổ nhân sự Squad theo Vai trò chuẩn (Role-Based Pickers): PO, Business, UX/UI Designers
    │   ├── Quản lý danh mục Phân hệ Sản phẩm MB (App MBBank, Lending, Cards, BaaS...)
    │   └── Tự động đồng bộ 2 chiều (Push/Pull) với Google Sheets (`RAW_SETTINGS`)
    │
    ├── 🔌 Tab 7: integrations - Cổng kết nối APIs & Webhooks
    │   ├── Cấu hình Google Apps Script Web App URL & Tần suất đồng bộ
    │   ├── Cấu hình Figma Org Token & Microsoft Teams Webhook URL
    │   └── Nút Kiểm tra kết nối ngoại vi (Ping Test)
    │
    └── 📋 Tab 8: audit - Nhật ký Kiểm toán (Audit Logs)
        ├── Bảng nhật ký lưu vết mọi hành động Admin (Thêm/sửa nhân sự, đổi SLA, phân bổ Squad)
        └── Badge phân loại đơn sắc: user, workflow, masterdata, integration, security
```

---

## 🎭 3. ĐẶC QUYỀN ADMIN: CƠ CHẾ XEM TRƯỚC VAI TRÒ (ROLE PREVIEW)

### Mục Đích Nghiệp Vụ:
Quản trị viên cần kiểm tra xem người dùng thuộc các vai trò khác nhau (**PO**, **Designer**, **Design Owner**) khi đăng nhập sẽ thấy những menu nào, có bị ẩn nút hành động nào không mà không cần phải đăng xuất tài khoản Admin.

### Nguyên Lý Kỹ Thuật (`src/services/otpAuthService.ts`):
1. **Lưu trữ Session gốc:** Khi Admin đăng nhập, đối tượng phiên thực tế được lưu an toàn trong `localStorage` & `sessionStorage` (`ux_portal_session_auth`).
2. **Kích hoạt Preview:**
   ```typescript
   startRolePreview("PO") // Ghi đè role hiển thị tạm thời sang "PO"
   ```
3. **Phản hồi giao diện:**
   - Hàm `getEffectiveRole()` trả về vai trò đang giả lập.
   - Header hiển thị Banner thông báo màu trung tính: *"Đang xem thử giao diện dưới vai trò [Role]. Bấm 'Về Admin gốc' để thoát"*.
   - `Sidebar.tsx` đọc role giả lập và lọc danh sách menu tương ứng theo Ma trận RBAC.
4. **Thoát chế độ xem thử:**
   ```typescript
   stopRolePreview() // Khôi phục nguyên vẹn role "Admin"
   ```

---

## 📊 4. QUẢN TRỊ NHÂN SỰ: ĐỒNG BỘ GOOGLE SHEETS & XUẤT DỮ LIỆU

### Nơi Lưu Trữ Dữ Liệu Nhân Sự:
1. **Trình duyệt (Client LocalStorage):** Key `mbbank_admin_team` và `mbbank_team_members`.
2. **Google Sheets (Cloud Database):** Tab sheet `USERS` (hoặc bảng dữ liệu trong tab `RAW_SETTINGS`).
3. **Mã nguồn mặc định:** Biến `INITIAL_TEAM_MEMBERS` trong `QuanLyPage.tsx`.

### Các Thao Tác Xuất & Đồng Bộ Dữ Liệu:
- **Tải từ Sheet (Pull):** Gọi API `fetchTeamMembersFromSheet()` để kéo danh sách mới nhất về máy.
- **Đồng bộ lên Sheet (Push):** Gọi API `syncTeamMembersToSheet()` để đẩy danh sách trên giao diện lên Google Sheets.
- **Xuất CSV (Export CSV):**
  - Tải file `Danh_Sach_Nhan_Su_UX_[YYYY-MM-DD].csv`.
  - Tích hợp tiền tố **UTF-8 BOM** (`\uFEFF`) đảm bảo mở trực tiếp bằng Microsoft Excel hiển thị tiếng Việt có dấu chuẩn 100%.
- **Sao lưu JSON (Backup JSON):** Nút trên Header trang Quản trị tải tệp `MBBank_UX_Admin_Settings_Backup_[YYYY-MM-DD].json` bao gồm toàn bộ mảng nhân sự, quy trình, squads, sản phẩm và kết nối.

---

## 📦 5. DANH MỤC STORAGE KEYS LIÊN QUAN

| Storage Key | Kiểu Dữ Liệu | Mục Đích |
| :--- | :--- | :--- |
| `mbbank_admin_team` | `TeamMember[]` | Danh sách nhân sự UX & phân bổ Đa-Squad/Sản phẩm trong trang Quản trị |
| `mbbank_team_members` | `TeamMember[]` | Bản sao đồng bộ dùng cho các phân hệ khác (Kanban, Request Form) |
| `ux_portal_nav_visibility` | `RoleNavConfig` | Cấu hình Bật/Tắt từng menu ứng với 4 vai trò |
| `ux_portal_nav_order` | `NavOrderConfig` | Mảng thứ tự sắp xếp các mục menu Platform và Resources |
| `mbbank_admin_phases` | `UxPhaseSetting[]` | Danh sách 6 khâu UX, SLA cam kết và tỷ lệ % hoàn thành chuẩn |
| `mbbank_admin_squads` | `SquadSetting[]` | Danh mục UX Squads và hạn mức nhận việc tối đa |
| `mbbank_admin_products` | `ProductSetting[]` | Danh mục Sản phẩm / Phân hệ ngân hàng số |
| `mbbank_admin_rbac` | `Record<string, string[]>` | Quyền hạn tác nghiệp hệ thống theo từng capability ID |
| `mbbank_admin_status_rules` | `StatusAutomationRule[]` | 6 quy tắc tự động hóa chuyển trạng thái, điều kiện trigger, ánh xạ khâu UX và hành vi SLA |
| `ux_portal_preview_role` | `UserRole` | Lưu vai trò đang được Admin giả lập xem thử |

---

## 🔍 6. MA TRẬN PHẠM VI ẢNH HƯỞNG (IMPACT ANALYSIS)

| Vùng Chỉnh Sửa | File Bị Ảnh Hưởng | Điểm Cần Chú Ý Để Đạt 100 Điểm |
| :--- | :--- | :--- |
| **Thêm / Sửa Nhân sự** | `QuanLyPage.tsx`<br>`googleSheetService.ts`<br>`mockData.ts` | Luôn đảm bảo mảng `squads` và `products` là mảng chuỗi (`string[]`), hỗ trợ 1 người thuộc nhiều Squad. Tự động đồng bộ lên Google Sheet ngay sau khi lưu. |
| **Sắp xếp Khâu UX** | `QuanLyPage.tsx`<br>`KanbanBoard.tsx`<br>`RequestDetail.tsx` | Khâu UX phải đánh lại số thứ tự `step: 1, 2, 3...` liên tục. Không cho phép xóa nếu danh sách chỉ còn dưới 2 khâu. |
| **Status Automation Rules** | `QuanLyPage.tsx`<br>`RequestDetail.tsx`<br>`gantt-chart.tsx` | Đồng bộ 2 chiều: Khi PO gửi bài toán mới (`po_created`), gán Designer (`designer_assigned`), bàn giao (`send_to_po`), hoặc nghiệm thu (`po_approved`), hệ thống chuyển trạng thái và kích hoạt/tạm dừng bộ đếm SLA tương ứng. |
| **Ma trận Menu RBAC** | `QuanLyPage.tsx`<br>`navVisibilityConfig.ts`<br>`Sidebar.tsx` | Sau khi cập nhật thứ tự hoặc công tắc ẩn/hiện, bắt buộc bắn event `window.dispatchEvent(new Event("nav_visibility_changed"))`. |
| **Role Preview Switcher** | `AppHeader.tsx`<br>`otpAuthService.ts`<br>`Sidebar.tsx` | Chỉ hiển thị dropdown cho Admin/Design Owner thật. Luôn có nút khôi phục về Admin gốc để tránh Admin bị kẹt trong vai trò bị giới hạn quyền. |
| **Điều hướng Deep Link Hash** | `QuanLyPage.tsx`<br>`Sidebar.tsx` | Hỗ trợ mở trực tiếp `#manage?tab=[tab_id]` (ví dụ `#manage?tab=workflow`) mà không bị gián đoạn hay reset về tab đầu. |

---

## 🛑 7. CHECKLIST KIỂM THỬ ĐẠT 100 ĐIỂM (TEST CHECKLIST)

- [ ] **Bảo vệ cổng Quản trị:** Đăng nhập tài khoản Designer hoặc PO -> Thử vào URL `#manage` -> Hệ thống phải tự động điều hướng về `#overview` hoặc `#track`.
- [ ] **Role Preview hoạt động:** Chọn "Xem trước dưới vai trò PO" -> Sidebar chỉ còn các mục menu của PO -> Nút "Thêm nhân sự" bị ẩn -> Bấm "Về Admin gốc" -> Khôi phục đầy đủ quyền Admin.
- [ ] **Xuất CSV nhân sự:** Bấm nút "Xuất CSV" -> Tải file về máy -> Mở bằng Excel -> Kiểm tra các cột Họ tên, Email, Squads, Sản phẩm có đầy đủ dấu tiếng Việt không bị lỗi font.
- [ ] **Đồng bộ Google Sheets 2 chiều:** Bấm "Đồng bộ lên Sheet" kiểm tra thông báo thành công -> Bấm "Tải từ Sheet" kiểm tra dữ liệu load về chuẩn xác.
- [ ] **Kéo thả Khâu UX:** Đổi vị trí giữa khâu Discovery và Wireframe -> Mở bảng Kanban kiểm tra cột có hoán đổi đúng thứ tự mới không.
- [ ] **Compile Test:** Chạy `npx tsc --noEmit` đạt 0 lỗi, `npm run build` thành công.
