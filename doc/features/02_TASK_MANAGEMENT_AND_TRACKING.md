# 📊 TÍNH NĂNG 02: THEO DÕI & QUẢN LÝ TIẾN ĐỘ YÊU CẦU (TASK TRACKING & KANBAN)

> **Mục tiêu tính năng:** Cung cấp không gian làm việc chính cho toàn bộ đội ngũ UX và PO để theo dõi tiến độ các yêu cầu thiết kế theo thời gian thực qua 4 chế độ xem (**Kanban Board**, **Interactive Gantt Timeline**, **Table**, **Grid/List**), hỗ trợ bộ lọc đa chiều và modal quản trị chi tiết 6 nhóm trường thông tin.

---

## 🎯 1. KHI NÀO CẦN ĐỌC TÀI LIỆU NÀY?

- **Khi làm tính năng mới:**
  - Thêm 1 chế độ xem mới (ví dụ: Calendar View, Export PDF/Excel danh sách task).
  - Thêm trường dữ liệu mới vào thẻ Task hoặc Modal chi tiết (ví dụ: trường "Độ phức tạp Story Points", "Loại thiết bị Mobile/Web").
  - Bổ sung tiêu chí lọc mới vào Bộ lọc (`FilterPopover.tsx`).
  - Thêm hành động hàng loạt (Bulk actions: chuyển khâu hàng loạt, phân công hàng loạt).
- **Khi sửa tính năng cũ:**
  - Kéo thả Kanban bị giật, bị lệch cột hoặc không lưu được trạng thái mới.
  - Thẻ Kanban bị che mất hoặc bị cắt mép trên màn hình nhỏ.
  - Dropdown chuyển khâu trong Modal chi tiết không hiển thị đủ các khâu mới cấu hình bên Quản trị.
  - PO bấm vào xem task bị lỗi hoặc Designer sửa task của người khác bị chặn không đúng cách.
  - Thống kê tiến độ % hoặc trạng thái cảnh báo quá hạn SLA tính toán sai.

---

## 🏗️ 2. KIẾN TRÚC & CÁC THÀNH PHẦN GIAO DIỆN (COMPONENTS BREAKDOWN)

```
src/pages/TrackRequestPage.tsx (Trang Cha)
│
├── 🔍 Bộ Lọc & Tìm Kiếm:
│   ├── Search Input (Tìm nhanh theo Mã task, Tiêu đề, Tên PO, Tên Designer)
│   ├── FilterPopover.tsx (Lọc đa chiều: Squad, Khâu, Ưu tiên, Người phụ trách)
│   └── View Mode Toggle (Chuyển đổi: Kanban | Gantt | Table | Grid | List)
│
├── 🖼️ 4 Chế Độ Hiển Thị:
│   ├── 1. KanbanBoard.tsx (Kéo thả thẻ theo khâu UX, đếm số lượng task/khâu)
│   │   └── KanbanCard.tsx (Thẻ task: Mã task, Ngày hoàn thành, Priority, Progress bar, Avatar)
│   ├── 2. GanttTimeline.tsx (Trục thời gian tương tác, xem tiến độ theo lịch)
│   ├── 3. Table View (Bảng dữ liệu phân trang, sắp xếp cột)
│   └── 4. Grid / List View (Dạng lưới thẻ Spotlight hoặc danh sách tóm tắt)
│
└── 📄 Modal Chi Tiết Bài Toán (RequestDetail.tsx):
    ├── Nhóm 1: Thông tin chung (Mã task, Tiêu đề, Squad, Sản phẩm, Độ ưu tiên)
    ├── Nhóm 2: Tiến độ & Khâu UX (Dropdown khâu, Thanh slider %, Ghi chú nhật ký)
    ├── Nhóm 3: Thông tin Nghiệp vụ & PO (PO Name, Email, Mục tiêu kinh doanh, Lý do deadline)
    ├── Nhóm 4: Phân công UX (Designer phụ trách, Reviewer, Ngày bắt đầu, Deadline)
    ├── Nhóm 5: Tài liệu bàn giao & Figma (Link Figma, Doc Links, File đính kèm Drive)
    └── Nhóm 6: Lịch sử cập nhật khâu (Timeline log `task_updates`)
```

---

## 📊 3. QUY TRÌNH 6 KHÂU UX CHUẨN & QUY TẮC PHÂN QUYỀN

### 3.1 Quy trình 6 Khâu Mặc định (Có thể tùy biến từ Admin Portal):
1. `1. Tiếp nhận & Phân loại` (10% - SLA 1 ngày)
2. `2. Discovery & Nghiên cứu` (25% - SLA 2-3 ngày)
3. `3. User Flow & Wireframe` (45% - SLA 3 ngày)
4. `4. Hi-Fi UI Design` (70% - SLA 4-5 ngày)
5. `5. Review & Đóng gói Design System` (90% - SLA 2 ngày)
6. `6. Bàn giao & Handoff Dev` (100% - Hoàn thành)

### 3.2 Quy tắc Phân quyền thao tác trên Task:
- **Admin & Design Owner:** Có quyền kéo thả/chuyển khâu, sửa % tiến độ, gán Designer cho **BẤT KỲ TASK NÀO**.
- **Designer:** Chỉ được phép đổi khâu, kéo thẻ Kanban và ghi Note tiến độ đối với **TASK ĐƯỢC PHÂN CÔNG CHO CHÍNH MÌNH** (`assigned_designer === session.email`). Đối với các task khác: Chỉ có quyền xem.
- **Product Owner (PO):** Chỉ xem task thuộc sản phẩm do mình quản lý. **Không có quyền đổi khâu hoặc sửa tiến độ.**

---

## 📦 4. CẤU TRÚC DỮ LIỆU TASK (`UXRequest`)

```typescript
export interface UXRequest {
  request_id: string                 // Mã định danh (VD: UXMB-2026-088)
  title: string                      // Tiêu đề công việc
  squad: string                      // Tên Squad thực hiện
  product: string                    // Tên Sản phẩm / Phân hệ
  request_type: string               // Loại yêu cầu (Mới, Cải tiến, Sửa lỗi...)
  current_phase: string              // Tên khâu hiện tại
  progress: number                   // Tiến độ thực tế (0 - 100)
  priority: "High" | "Medium" | "Low" // Độ ưu tiên
  submitted_at: string               // Thời điểm tạo (DD/MM/YYYY)
  deadline: string                   // Hạn chót cam kết (DD/MM/YYYY)
  deadline_reason?: string           // Lý do deadline
  po_name: string                    // Tên PO tạo task
  po_email: string                   // Email PO
  assigned_designer?: string         // Email Designer thực hiện
  reviewer?: string                  // Email Lead review
  business_goal?: string             // Mục tiêu kinh doanh
  expected_output?: string           // Kết quả đầu ra bàn giao
  doc_links?: string[]               // Mảng link tài liệu (PRD/Spec)
  figma_url?: string                 // Link Figma
  attachments?: Array<{              // File đính kèm trên Google Drive
    name: string
    url: string
    size?: number
  }>
  task_updates?: TaskUpdateRecord[]  // Toàn bộ lịch sử chuyển khâu & ghi chú
}
```

---

## 🔍 5. MA TRẬN PHÂN TÍCH PHẠM VI ẢNH HƯỞNG (IMPACT ANALYSIS)

| Khi bạn chỉnh sửa... | Các file bị ảnh hưởng | Rủi ro tiềm ẩn & Cách phòng tránh |
| :--- | :--- | :--- |
| **Bảng Kanban (`KanbanBoard.tsx`)** | `src/components/kanban/KanbanBoard.tsx`<br>`src/components/kanban/KanbanCard.tsx` | - **Bẫy CSS:** Không được dùng class `snap-x` trên container cuộn ngang Kanban vì sẽ làm thẻ ngoài cùng bên trái bị giật hoặc cắt mép.<br>- Kiểm tra quyền kéo thả: Người không có quyền (PO) phải bị disable kéo thả (`isDraggable = false`). |
| **Modal Chi tiết Task (`RequestDetail.tsx`)** | `src/components/track/RequestDetail.tsx`<br>`src/services/googleSheetService.ts` | - Khi lưu thay đổi (khâu mới, % mới, ghi chú), phải append một bản ghi vào mảng `task_updates`.<br>- Đồng bộ ngay lên Google Sheet qua `updateRequest()` và cập nhật state ở component cha (`TrackRequestPage`). |
| **Thêm/Sửa Khâu UX từ Admin** | `src/pages/QuanLyPage.tsx`<br>`src/components/track/RequestDetail.tsx`<br>`src/components/kanban/KanbanBoard.tsx` | - Danh sách cột Kanban và Dropdown chọn khâu phải lấy động từ `localStorage` key `mbbank_admin_phases` (kèm fallback 6 khâu mặc định trong `mockData.ts`). |
| **Bộ Lọc Task (`FilterPopover.tsx`)** | `src/components/track/FilterPopover.tsx`<br>`src/pages/TrackRequestPage.tsx` | - Khi reset bộ lọc, phải đảm bảo các mảng filter quay về rỗng và ô tìm kiếm được clear.<br>- Không được làm mất bộ lọc phân quyền của PO (PO luôn chỉ thấy task của sản phẩm mình). |

---

## 🛑 6. CHECKLIST KIỂM THỬ ĐẠT 100 ĐIỂM (TEST CHECKLIST)

- [ ] **Chuyển đổi 4 View**: Bấm chuyển đổi lần lượt giữa Kanban -> Gantt -> Table -> Grid. Dữ liệu task phải nhất quán, không bị mất hoặc lệch state.
- [ ] **Kéo thả thẻ Kanban**: Kéo 1 thẻ từ khâu A sang khâu B -> Kiểm tra xem % tiến độ có tự động cập nhật theo SLA của khâu B không -> F5 lại trang kiểm tra xem trạng thái đã được lưu chưa.
- [ ] **Kiểm tra quyền Designer**: Đăng nhập tài khoản Designer -> Thử kéo thẻ task của mình (thành công) -> Thử kéo thẻ task của Designer khác (hệ thống chặn hoặc cảnh báo không có quyền).
- [ ] **Thẻ Task hiển thị ngày tháng**: Kiểm tra thẻ Kanban chỉ hiển thị ngày hoàn thành (VD: `30/08/2026`), không hiển thị giờ phút rườm rà.
- [ ] **Modal Chi tiết Task**: Mở modal -> Kiểm tra đủ 6 nhóm thông tin -> Thử nhập ghi chú mới và bấm Lưu -> Kiểm tra nhóm 6 (Lịch sử `task_updates`) có xuất hiện dòng log mới vừa tạo không.
- [ ] **Compile Test**: Chạy `npx tsc --noEmit` đạt 0 lỗi.
