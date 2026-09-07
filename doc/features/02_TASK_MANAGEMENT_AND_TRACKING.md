# 📊 TÍNH NĂNG 02: THEO DÕI & QUẢN LÝ TIẾN ĐỘ YÊU CẦU (TASK TRACKING & KANBAN)

> **Mục tiêu tính năng:** Cung cấp không gian làm việc chính cho toàn bộ đội ngũ UX và PO để theo dõi tiến độ các yêu cầu thiết kế theo thời gian thực qua 4 chế độ xem (**Kanban Board**, **Interactive Gantt Timeline**, **Table Phân Tầng**, **Grid/List**), hỗ trợ bộ lọc đa chiều, cơ chế phân loại chuẩn 2 loại Pending, tự động hóa gửi PO qua cú pháp chat `@SenToPO:`, và modal quản trị chi tiết bài toán với cấu trúc lưới thuộc tính 2x2 tối ưu.

---

## 🎯 1. KHI NÀO CẦN ĐỌC TÀI LIỆU NÀY?

- **Khi làm tính năng mới:**
  - Thêm một chế độ xem mới (ví dụ: Lịch biểu Calendar View, Xuất báo cáo PDF/Excel phân tầng).
  - Thêm trường dữ liệu mới vào thẻ Task hoặc Modal chi tiết (ví dụ: "Story Points", "Nền tảng mục tiêu Web/Mobile/Tablet").
  - Mở rộng logic tự động hóa chuyển khâu hoặc mở rộng bộ lọc `FilterPopover.tsx`.
  - Tích hợp thêm các cú pháp trao đổi thông minh mới trong khung chat JolyUI (ví dụ: `@ReviewBy:`, `@HandoffDev:`).
- **Khi sửa / bảo trì tính năng cũ:**
  - Kéo thả Kanban bị giật hoặc sai lệch vị trí giữa các khâu UX.
  - Trạng thái `Pending` hoặc `PO Pending` hiển thị sai màu sắc hoặc tính sai mốc 24h.
  - Cú pháp `@SenToPO:` không tự động gán link Figma hoặc không kích hoạt nút "Mở Figma".
  - Đường dẫn URL trong comment trao đổi không click mở tab mới được.
  - Khối thuộc tính 2x2 trong `RequestDetail.tsx` bị lệch dòng hoặc không lưu lên Google Sheets.
  - Biểu đồ Gantt Timeline hiển thị thiếu mốc số 7 `PO Pending`.

---

## 🏗️ 2. KIẾN TRÚC & CÁC THÀNH PHẦN GIAO DIỆN (COMPONENTS BREAKDOWN)

```
src/pages/TrackRequestPage.tsx (Trang Cha)
│
├── 🔍 Thanh Điều Hướng & Bộ Lọc Đa Chiều:
│   ├── Search Input (Tìm nhanh theo Mã task, Tiêu đề, PO, Designer)
│   ├── FilterPopover.tsx (Lọc theo Squad, Khâu UX, Độ ưu tiên, Người phụ trách)
│   └── View Mode Selector (Kanban | Gantt | Table | Grid / List)
│
├── 🖼️ 4 Chế Độ Hiển Thị Tiến Độ:
│   ├── 1. KanbanBoard.tsx (Kéo thả thẻ theo khâu UX, đếm task theo cột)
│   │   └── KanbanCard.tsx (Thẻ task: Mã task, Ngày hoàn thành, Priority, Progress bar, Avatar)
│   ├── 2. gantt-chart.tsx (Trục thời gian tương tác, thanh tiến độ 7 mốc gồm PO Pending)
│   ├── 3. SolutionAgentsTable.tsx (Bảng phân nhóm thông minh, badge đồng nhất h-[22px], tối ưu Overload)
│   └── 4. Grid / List View (Dạng lưới thẻ Spotlight hoặc danh sách tóm lược)
│
└── 📄 Modal Chi Tiết Bài Toán (RequestDetail.tsx):
    ├── Banner Trạng thái PO: Đếm ngược 24h hoặc Cảnh báo Quá hạn / Lý do Pending
    ├── Lưới Thuộc Tính 2x2 Chuẩn Hóa:
    │   ├── Hàng 1: [Status / Khâu UX] (Trái) & [Assignees / Phân công] (Phải)
    │   └── Hàng 2: [Dates / Thời hạn] (Trái) & [Priority / Ưu tiên] (Phải)
    ├── Khung Trao Đổi Thông Minh (ai-prompt-box.tsx):
    │   ├── Nhận diện cú pháp @SenToPO: [figma_url] & @pending: [lý do]
    │   └── Render link xanh MB-Blue bo pill kèm click mở tab mới
    └── Lịch sử nhật ký tiến độ (task_updates timeline)
```

---

## ⚡ 3. CÁC QUY CHUẨN NGHIỆP VỤ & NÂNG CẤP ĐẶC TẢ

### 3.1. Phân Loại Chuẩn 2 Loại Trạng Thái Pending (`statusConfig.ts`)
Nhằm giải quyết triệt để sự nhầm lẫn trong quản lý tiến độ, hệ thống tách biệt rõ ràng 2 trường hợp Pending:

| Tiêu chí | 1. PO Pending (Hổ Phách - Amber) | 2. Pending (Xám Slate) |
| :--- | :--- | :--- |
| **Bản chất nghiệp vụ** | Đang chờ Product Owner (PO) phản hồi hoặc nghiệm thu phương án thiết kế. | Designer chủ động tạm dừng thực hiện bài toán do thiếu thông tin / đợi bên thứ ba. |
| **Cơ chế kích hoạt** | Tự động kích hoạt sau **24 giờ** kể từ khi Designer gửi phương án Figma cho PO nhưng chưa có phản hồi. | Kích hoạt khi trạng thái là `Pending` hoặc khi Designer chat cú pháp `@pending: [lý do]`. |
| **Giao diện nhận diện** | Dot vàng `amber-500`, nền `bg-amber-50`, viền `border-amber-300`, chữ `text-amber-800`. | Dot xám `slate-500`, nền `bg-slate-100`, viền `border-slate-300`, chữ `text-slate-700`. |
| **Hiển thị lý do** | *"Quá hạn 24h PO chưa phản hồi duyệt phương án"*. | Trích xuất trực tiếp nội dung sau cú pháp `@pending: ...` từ bình luận gần nhất. |
| **Hành vi SLA** | Đồng hồ SLA 24h chạy đếm ngược, chuyển cảnh báo khi quá hạn. | Tạm dừng đồng hồ tính SLA nội bộ của Designer. |

### 3.2. Tự Động Hóa Gửi PO Bằng Cú Pháp `@SenToPO:` Kèm Link Figma
- **Loại bỏ quy trình thủ công:** Xóa bỏ thanh nhập URL kẹp giấy rườm rà.
- **Quy trình 1 chạm qua khung chat:** Designer chỉ cần nhập vào ô trao đổi:
  ```text
  @SenToPO: https://www.figma.com/file/xyz... Đã hoàn thành bản Hi-Fi UI luồng mở thẻ.
  ```
- **Hệ quả tự động hóa:**
  1. Regex trích xuất đường dẫn `figma.com` lưu vào `request.figma_url`.
  2. Tự động chuyển trạng thái bài toán sang `Đã gửi PO`.
  3. Kích hoạt mốc thời gian `sent_to_po_at`, bật đồng hồ đếm lùi 24h.
  4. Hiển thị nút **"Mở Figma"** tại thanh footer điều hướng của Modal.
  5. Đồng bộ tức thì lên Google Sheets backend qua API `update_task_progress`.

### 3.3. Tự Động Render Rich Clickable Link (URL Bôi Xanh & Mở Tab Mới)
- Toàn bộ đường dẫn URL (`http://`, `https://`) trong nội dung bình luận được nhận diện tự động qua hàm `renderRichCommentContent`.
- Định dạng theo chuẩn visual MBBank:
  - Màu chữ xanh dương nhận diện: `text-[#1057FB] font-medium`.
  - Nền bo pill nổi bật: `bg-blue-50/90 hover:bg-blue-100 border border-blue-200/80 px-2 py-0.5 rounded-md`.
  - Tự động gắn icon `ExternalLink` và thuộc tính `target="_blank" rel="noopener noreferrer"` cho phép click mở tab mới ngay lập tức mà không rời khỏi trang làm việc.

### 3.4. Bổ Sung Mốc Trạng Thái "7. PO Pending" Trên Biểu Đồ Gantt
- Biểu đồ Gantt Timeline (`gantt-chart.tsx`) bổ sung giai đoạn thứ 7:
  ```typescript
  { id: "7_po_pending", name: "7. PO Pending", color: "amber", slaDays: 2 }
  ```
- Thể hiện thanh block màu hổ phách kèm icon `Clock` khi bài toán đang dừng chờ PO, đồng thời hiển thị đầy đủ mốc số 7 tại Footer Legend dưới chân biểu đồ.

### 3.5. Chuẩn Hóa Typography & Badge UI Bảng Task (`SolutionAgentsTable.tsx`)
- **Đồng nhất chiều cao dòng:** Toàn bộ badge Trạng thái, Squad và Ưu tiên được cố định kích thước `h-[22px]`, bo góc `rounded-md`, khoảng đệm `px-2 py-0.5` và cỡ chữ `text-[11px] font-medium`.
- **Khử trùng lặp cảnh báo Overload:** Đối với các bài toán đã nằm trong nhóm "Quá tải (Overload)", ẩn badge màu đỏ `[Trễ]` ở cột ngày hạn, nâng cỡ chữ ngày hoàn thành lên `11.5px font-semibold text-slate-700` để giao diện thoáng sạch, không gây ức chế thị giác.

### 3.6. Lưới Thuộc Tính 2x2 Cân Đối Trong `RequestDetail.tsx`
- Đổi nhãn `Khâu UX` thành **`Status`** với icon `<Target className="w-4 h-4 text-slate-400" />`.
- Loại bỏ trường Status cũ bị trùng lặp với Banner PO.
- Cấu trúc lưới 2x2 hoàn hảo:
  - **Ô 1 (Trên - Trái):** `Status` (Chọn khâu quy trình từ Phân loại đến Bàn giao).
  - **Ô 2 (Trên - Phải):** `Assignees` (Chọn UX/UI Designer phụ trách).
  - **Ô 3 (Dưới - Trái):** `Dates` (Ngày tạo và Hạn hoàn thành với bộ chọn ReUI Date Picker).
  - **Ô 4 (Dưới - Phải):** `Priority` (Độ ưu tiên: High / Medium / Low).

---

## 🔍 4. MA TRẬN PHÂN TÍCH PHẠM VI ẢNH HƯỞNG (IMPACT MATRIX)

| Thành phần sửa đổi | File mã nguồn | Tác động hệ thống & Rủi ro cần phòng tránh |
| :--- | :--- | :--- |
| **Logic Phân loại Pending** | `src/config/statusConfig.ts`<br>`src/components/track/RequestDetail.tsx`<br>`src/components/track/SolutionAgentsTable.tsx` | Đảm bảo hàm `getRequestPendingClassification()` luôn xử lý an toàn khi thiếu trường dữ liệu (`req.sent_to_po_at` null hoặc rỗng), không gây crash ứng dụng. |
| **Tự động hóa `@SenToPO:`** | `src/components/jolyui/ai-prompt-box.tsx`<br>`src/components/track/RequestDetail.tsx` | Regex bắt link figma phải linh hoạt với cả link share desktop app, prototype mode và link canvas chung. |
| **Stage 7 trên Gantt Chart** | `src/components/reui/gantt-chart.tsx` | Mốc 7 chỉ xuất hiện khi task ở trạng thái chờ PO; không làm lệch dải thời gian của các khâu 1-6 trước đó. |
| **Lưới 2x2 Properties Grid** | `src/components/track/RequestDetail.tsx` | Mỗi thao tác đổi giá trị trong ô thuộc tính phải kích hoạt Optimistic UI ngay lập tức và gọi API `updateTaskProgressInSheet()` ở background. |

---

## 🛑 5. CHECKLIST KIỂM THỬ ĐẠT 100 ĐIỂM (TEST CHECKLIST)

- [x] **Kiểm tra 2 loại Pending:**
  - Tạo task mới, chuyển trạng thái sang `Đã gửi PO` -> Đợi/chỉnh thời gian gửi quá 24h -> Hệ thống hiển thị badge màu Amber `PO Pending`.
  - Nhập comment `@pending: Đợi BA xác nhận luồng OTP Smart OTP` -> Hệ thống hiển thị badge màu Slate `Pending` kèm lý do trích xuất chính xác.
- [x] **Kiểm tra cú pháp `@SenToPO:`:**
  - Nhập `@SenToPO: https://figma.com/design/sample-url` vào ô trao đổi -> Bấm gửi -> Trạng thái đổi thành `Đã gửi PO`, xuất hiện nút "Mở Figma", link trong comment được bôi xanh và click mở tab mới.
- [x] **Kiểm tra Gantt Timeline:** Mở chế độ Gantt Chart -> Task chờ PO hiển thị block màu hổ phách và dot vàng, Footer Legend có mốc `7. PO Pending`.
- [x] **Kiểm tra Bảng Danh sách Task:** Chiều cao cả 3 badge Trạng thái, Squad, Ưu tiên bằng nhau chằn chặn `h-[22px]`; các task trong nhóm Overload không còn hiện badge đỏ `[Trễ]`.
- [x] **Kiểm tra Build & Compile:** Chạy `npm run build` hoàn thành với 0 cảnh báo hoặc lỗi cú pháp.
