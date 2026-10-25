# 📈 TÍNH NĂNG 11: PHÂN HỆ DASHBOARD TỔNG QUAN AI-OPS & TIMELINE PHÁT HÀNH

> **Mục tiêu tính năng:** Cung cấp trung tâm điều hành trực quan toàn diện (Executive AIOps Dashboard) cho MB UX Team, hiển thị các chỉ số KPI trọng yếu về khối lượng công việc, tốc độ phân bổ, chất lượng bàn giao, lịch trình release dự kiến và xu hướng biến động số lượng task theo sản phẩm số và từng squad.

---

## 🎯 1. KHI NÀO CẦN ĐỌC TÀI LIỆU NÀY?

- **Khi làm tính năng mới:**
  - Thêm thẻ KPI mới hoặc điều chỉnh chỉ số SLA, First-Time Right, Tải trọng bình quân.
  - Tích hợp thêm biểu đồ mới từ ReUI / shadcn vào Dashboard.
  - Mở rộng logic phân loại bài toán chờ xác nhận (Pending, PO Pending, Designer Pending).
  - Tích hợp API theo dõi tiến độ phát hành tính năng thời gian thực từ JIRA / GitLab.
- **Khi bảo trì / sửa lỗi:**
  - Biểu đồ Donut hoặc Line Chart bị vỡ tỷ lệ, mất màu sắc hoặc mất hiệu ứng bóng đổ.
  - Timeline NewsFeed không tự cuộn đến mốc ngày hiện tại hoặc bị lệch chiều cao so với Squad Trending.
  - Bộ lọc Tab sản phẩm không cập nhật dữ liệu trên các khối biểu đồ.
  - Click vào tên task trên timeline không mở modal chi tiết bài toán.

---

## 🏗️ 2. CẤU TRÚC KIẾN TRÚC & CÁC THÀNH PHẦN (COMPONENTS BREAKDOWN)

```
src/pages/TongQuanPage.tsx (Trang Tổng Quan Điều Hành)
│
├── 🏷️ Thanh Tab Sản Phẩm Động (Admin Products Tabs)
│   └── Tự động nạp từ getAdminIAProducts() kết hợp bài toán thực tế, lọc đồng bộ 6 khối
│
├── 🧱 Hàng 1: Bộ 3 Thẻ ReUI KPI Double Shell Cards (AiOpsKpiCards.tsx)
│   ├── 1. Backlog & Pending (BacklogPendingDonutCard.tsx - Chuẩn @reui/c-chart-20 Layout Ngang)
│   │   ├── Layout ngang tinh gọn: Donut Chart nhỏ w-[105px] bên trái kèm vòng ray nền tròn #f1f5f9
│   │   ├── 3 hàng trạng thái dạng Pill mềm bên phải: Chờ tiếp nhận, Designer/Khác, PO pending
│   │   └── Loại bỏ hoàn toàn khối footer lặp lại ở chân thẻ, đạt độ cao đồng nhất với 2 thẻ bên cạnh
│   │
│   ├── 2. Đang Thực Hiện (InProgressWorkloadCard.tsx)
│   │   ├── Số lượng task đang thực hiện, huy hiệu trạng thái, dòng mô tả thanh thoát
│   │   ├── Loại bỏ khối tiến độ trung bình 5 khâu cồng kềnh ở giữa
│   │   └── Khung footer chỉ số: Tải trọng bình quân 2.4 task/designer
│   │
│   └── 3. Đã Hoàn Thành (CompletedSlaCard.tsx)
│       ├── Số lượng task hoàn thành, SLA 96.4%, dòng mô tả đạt chuẩn PO
│       ├── Loại bỏ khối First-Time Right acceptance & tiêu chuẩn nghiệm thu ở giữa
│       └── Khung footer chỉ số: Lead time trung bình 3.8 ngày/task
│
├── ⚖️ Hàng 2: Lưới Bất Đối Xứng 1:2 (items-stretch)
│   ├── 4. NewsFeed Timeline (ReleaseNewsfeedTimeline.tsx - Chuẩn @reui/c-timeline-3)
│   │   ├── Chiều cao bằng đúng Squad Trending (H đồng bộ tuyệt đối)
│   │   ├── Timeline ngược: Ngày xa nhất ở trên, ngày đã qua ở dưới
│   │   ├── Tự động scroll mượt mà đến mốc ngày gần hiện tại
│   │   ├── Mốc ngày sắp tới: Nút tròn đen với spinner xoay tròn (Loader2 animate-spin)
│   │   ├── Mốc ngày đã qua: Nút tròn đen với dấu checkmark (Check)
│   │   ├── Lọc bỏ 100% các bài toán Pending hoặc Chưa phân bổ
│   │   ├── Hiển thị danh sách task dạng hàng phẳng phân tách bằng Divider (divide-y), không lồng hộp con
│   │   └── Tích hợp chuẩn User Avatar từ Cài đặt hệ thống (Admin Setting: mbbank_admin_team / mbbank_team_members / UserAvatar)
│   │
│   └── 5. Squad Trending (SquadTrendingChart.tsx - Chuẩn @reui/c-chart-17)
│       ├── ComposedChart với pattern sọc chéo chart17-forecast-stripe
│       ├── Area shaded zone với dải màu chuyển sắc gradient + Line natural uốn cong mềm mại
│       ├── Tooltip có header ngày/tuần phân cách nét mờ border-b
│       └── Selector thời gian: 7 ngày | 30 ngày | 90 ngày
│
└── 🗺️ Hàng 3: Bảng Gantt Toàn Chiều Rộng (TrackTaskGanttFrame.tsx)
    └── Lộ trình Gantt toàn diện của các bài toán theo sản phẩm & squad

---

## 🎨 3. QUY CHUẨN REUI DOUBLE SHELL FRAME

Tất cả 6 khối trên Dashboard đều áp dụng chuẩn vỏ kép tinh tế của ReUI:
- **Vỏ ngoài (Outer Shell):** `rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 min-w-0`
- **Vỏ trong (Inner Card):** `rounded-xl border border-neutral-200/70 bg-white p-4 shadow-2xs`
- **Header trên nền xám:** `px-3.5 py-2` với tiêu đề và badge phân loại rõ ràng.

---

## 📊 4. DANH MỤC THÀNH PHẦN REUI ĐÃ TÍCH HỢP

| Thành phần | Mã Registry | Nơi Sử Dụng | Đặc trưng chính |
| :--- | :--- | :--- | :--- |
| **Donut Chart** | `@reui/c-chart-20` | `BacklogPendingDonutCard.tsx` | Layout ngang, vòng ray nền #f1f5f9, 3 status pills pastel, label tâm vừa vặn |
| **Trend Line Chart** | `@reui/c-chart-17` | `SquadTrendingChart.tsx` | Pattern stripe dự báo, gradient fill, đường cong natural, tooltip gạch phân cách |
| **Vertical Timeline** | `@reui/c-timeline-3` | `ReleaseNewsfeedTimeline.tsx` | Reverse timeline, spinner xoay tròn, auto-scroll, lọc pending/chưa phân bổ, divider ngăn cách |
| **Double Shell Card** | ReUI AI-Ops Pattern | Toàn bộ Dashboard | Vỏ ngoài p-1.5 bo 2xl, vỏ trong bo xl bóng đổ 2xs |
| **Zero Mock Data** | Nguyên tắc sản phẩm | Toàn bộ Dashboard | Xóa bỏ 100% fallbackMilestones, DEFAULT_GANTT_TASKS và số liệu giả |
| **Icon Stack Large** | `@reui/c-icon-stack-2` | `RequestDetail.tsx` | Icon xếp tầng 3D isometric h-28 w-24 cảnh báo quyền hạn với TriangleAlert hổ phách |

---

## 🔒 5. CHÍNH SÁCH BẢO MẬT DỮ LIỆU & PHÂN QUYỀN TRUY CẬP (RBAC DASHBOARD)

### 5.1. Quyền xem số liệu tổng quan của PO & Business
- **Khai thông quyền truy cập Dashboard:**
  - Cấu hình `overview: true` trong `src/config/navVisibilityConfig.ts` cho cả vai trò `PO` và `Business`.
  - PO & Business có thể vào xem toàn diện các chỉ số thống kê điều phối tiến độ chung:
    - 3 Thẻ KPI: Backlog & Pending, Đang thực hiện, Đã hoàn thành.
    - Biểu đồ xu hướng biến động khối lượng Squad Trending.
    - Bộ lọc Tabs phân hệ sản phẩm.

### 5.2. Cơ chế mã hóa tiêu đề bài toán ngoài quyền sở hữu
- **Tại NewsFeed Timeline & Bảng Gantt:**
  - Task do chính PO/Business tạo HOẶC được gán quyền theo dõi (`viewers`): Hiển thị tiêu đề bài toán bình thường, nhấp chọn xem chi tiết và trao đổi bình thường.
  - Task **KHÔNG do PO/Business tạo VÀ KHÔNG được gán quyền theo dõi**:
    - Tiêu đề bài toán được tự động mã hóa thành chuỗi hoa thị ngẫu nhiên `*******` (`generateMaskedTitle()` dựa trên thuật toán băm ID cố định, tránh giật nhảy độ dài).
    - Biểu đồ Gantt gắn cờ `isRestricted: true` kèm tooltip cảnh báo bảo mật.
    - Hàng task trên NewsFeed Timeline: Căn chỉnh flexbox `items-center justify-between` với số thứ tự `[ 1 ]` (`size-5` căn giữa tuyệt đối) và cụm avatar/tên designer bên phải thẳng hàng tuyệt đối trên cùng một trục ngang. Bỏ gạch chân thô `hover:underline` trên chuỗi hoa thị mã hóa.

### 5.3. Khóa an toàn chi tiết bài toán & Màn hình cảnh báo ReUI Icon Stack
- Khi người dùng click vào bất kỳ bài toán nào bị mã hóa:
  - Slide-over Sheet (`RequestDetail.tsx`) chặn 100% việc hiển thị nội dung nhạy cảm (Stepper khâu quy trình, Brief, PRD, Luồng nghiệp vụ, Đường dẫn Figma, Nhật ký trao đổi nội bộ).
  - Hiển thị màn hình thông báo chuẩn ReUI:
    - **Nhãn định danh:** `Yêu cầu tư vấn trải nghiệm: {request.request_id}` (thay thế nhãn cũ `Mã bài toán`).
    - **Icon cảnh báo ReUI:** Tích hợp component `IconStackLarge` (`@reui/c-icon-stack-2`, kích thước lớn `h-28 w-24`) với icon tam giác có dấu chấm than `TriangleAlert` (`size-7 text-amber-500 stroke-[2.25]`) góc nghiêng isometric 3D.
    - **Tiêu đề & Hướng dẫn:** *"Không có quyền truy cập — Bài toán này thuộc quyền quản lý của đơn vị khác. Vui lòng liên hệ Quản trị viên (Admin) để được cấp quyền theo dõi hoặc phê duyệt."*
    - **Tinh giản thông tin:** Đã loại bỏ hoàn toàn khối hộp "Thông tin bảo mật" bên dưới.
    - **Nút tương tác:** Nút *"Đóng cửa sổ"* và nút *"Liên hệ Admin"* (`admin@mbbank.com.vn`).


