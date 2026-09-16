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
│   └── Tự động nạp từ getAdminIAProducts() kết hợp bài toán thực tế
│
├── 🧱 Hàng 1: Bộ 3 Thẻ ReUI KPI Double Shell Cards (AiOpsKpiCards.tsx)
│   ├── 1. Backlog & Pending (BacklogPendingDonutCard.tsx - Chuẩn @reui/c-chart-20 Layout Ngang)
│   │   └── Layout ngang tinh gọn: Donut Chart nhỏ w-[105px] bên trái, cụm số tâm 2xl vừa vặn, danh sách trạng thái dạng list bên phải
│   ├── 2. Đang Thực Hiện (InProgressWorkloadCard.tsx)
│   │   └── Số lượng task, +12.6%, tiến độ bình quân 5 khâu UX (không dùng progress bar dày), tải trọng task/designer
│   └── 3. Đã Hoàn Thành (CompletedSlaCard.tsx)
│       └── 4 tasks, SLA 96.4%, First-Time Right 94.2% dạng text thanh lịch, lead time bình quân
│
├── ⚖️ Hàng 2: Lưới Bất Đối Xứng 1:2 (items-stretch)
│   ├── 4. NewsFeed Timeline (ReleaseNewsfeedTimeline.tsx - Chuẩn @reui/c-timeline-3)
│   │   ├── Chiều cao bằng đúng Squad Trending (H đồng bộ)
│   │   ├── Timeline ngược: Ngày xa nhất ở trên, ngày đã qua ở dưới
│   │   ├── Tự động scroll đến mốc ngày gần hiện tại (smooth scroll)
│   │   ├── Mốc ngày sắp tới: Nút tròn đen với spinner xoay tròn (Loader2 animate-spin)
│   │   ├── Mốc ngày đã qua: Nút tròn đen với dấu checkmark (Check)
│   │   ├── Card hiển thị danh sách task kiểu Ảnh 4 (Số thứ tự [1], tên task line-clamp-2, avatar designer)
│   │   └── Tích hợp chuẩn User Avatar từ Cài đặt hệ thống (Admin Setting: mbbank_admin_team / mbbank_team_members / UserAvatar)
│   │
│   └── 5. Squad Trending (SquadTrendingChart.tsx - Chuẩn @reui/c-chart-17)
│       ├── ComposedChart với pattern sọc chéo chart17-forecast-stripe
│       ├── Area shaded zone + Line natural uốn cong mềm mại
│       ├── Tooltip có header ngày/tuần phân cách nét mờ border-b
│       └── Selector thời gian: 7 ngày | 30 ngày | 90 ngày
│
└── 🗺️ Hàng 3: Bảng Gantt Toàn Chiều Rộng (TrackTaskGanttFrame.tsx)
    └── Lộ trình Gantt toàn diện của các bài toán theo sản phẩm & squad
```

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
| **Donut Chart** | `@reui/c-chart-20` | `BacklogPendingDonutCard.tsx` | innerRadius 60, cornerRadius 5, paddingAngle 3, Label tâm 3xl |
| **Trend Line Chart** | `@reui/c-chart-17` | `SquadTrendingChart.tsx` | Pattern stripe dự báo, đường cong natural, tooltip gạch phân cách |
| **Vertical Timeline** | `@reui/c-timeline-3` | `ReleaseNewsfeedTimeline.tsx` | Reverse timeline, spinner xoay tròn, auto-scroll, card kiểu ảnh 4 |
| **Double Shell Card** | ReUI AI-Ops Pattern | Toàn bộ Dashboard | Vỏ ngoài p-1.5 bo 2xl, vỏ trong bo xl bóng đổ 2xs |
