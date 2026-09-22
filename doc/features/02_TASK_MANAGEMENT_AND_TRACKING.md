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

### 3.3. Chuẩn Hóa Định Dạng Hạn Chót (Due Date) Chuẩn `DD/MM/YYYY` Trên Biểu Đồ Gantt
- Toàn bộ cột **Due date** trên biểu đồ Gantt (`ReUIGanttChart`) được chuyển đổi triệt để từ định dạng tiếng Anh (`Sep 16`, `Oct 1`,...) sang định dạng số **`DD/MM/YYYY`** (ví dụ: `16/09/2026`, `01/10/2026`).
- Cột Due date được mở rộng từ `w-20` (80px) lên `w-24` (96px) ở cả Header và các dòng Task để hiển thị trọn vẹn chuỗi 10 ký tự mà không bị cắt chữ (truncate).
- Tooltip hover trên timeline Gantt đồng bộ định dạng `DD/MM/YYYY`.

### 3.4. Tích Hợp UI Component Kbd Chuẩn ReUI (`@reui/c-kbd-1`) Trong Khung Trao Đổi
- Tạo component `src/components/ui/kbd.tsx` chuẩn ReUI / shadcn với hiệu ứng đổ bóng viền 3D keycap tactile.
- Khung trao đổi `ai-prompt-box.tsx` sử dụng thẻ `<Kbd size="xs">Enter ↵</Kbd> gửi` và `<Kbd size="xs">Shift</Kbd> + <Kbd size="xs">Enter ↵</Kbd> xuống dòng` thay cho text thuần trước đây.

### 3.5. Cơ Chế Bảo Mật & Mã Hóa Task PO / Business Trên Dashboard (Data Privacy RBAC)
- **Mục tiêu:** Dashboard hiển thị toàn bộ bài toán của tất cả Squads/Sản phẩm nhằm phục vụ điều phối và tiến độ chung, nhưng phải đảm bảo an toàn bí mật đề bài giữa các đơn vị kinh doanh.
- **Quy chuẩn mã hóa:**
  - Đối với người dùng có vai trò **PO** hoặc **Business**: Các bài toán **KHÔNG DO CHÍNH HỌ TẠO** sẽ tự động được mã hóa tiêu đề thành chuỗi `********` có độ dài ngẫu nhiên khác nhau (`generateMaskedTitle()` cố định theo hash ID để tránh giật giao diện).
  - Biểu đồ Gantt trên Dashboard hiển thị các thanh task mã hóa kèm tooltip cảnh báo `🔒 Không có quyền truy cập bài toán này (Liên hệ Admin)`.
- **Cơ chế khóa an toàn khi mở chi tiết:**
  - Khi click mở Drawer/Sheet `RequestDetail`, hệ thống kiểm tra phân quyền `canUserAccessRequest(req, session)`.
  - Nếu không có quyền, Sheet lập tức chặn hiển thị toàn bộ tài liệu, brief, link figma, bình luận và hiển thị giao diện cảnh báo:
    - Huy hiệu mã bài toán + Icon khóa `ShieldAlert` nổi bật.
    - Tiêu đề: **"Không có quyền truy cập"**.
    - Hướng dẫn: **"Bài toán này thuộc quyền quản lý của đơn vị khác. Vui lòng liên hệ Quản trị viên (Admin) để được cấp quyền theo dõi hoặc phê duyệt."**
### 3.6. Cải Tiến Giao Diện NewsFeed Release Timeline & Chuẩn Hóa Màn Hình Không Có Quyền Truy Cập
- **Căn chỉnh NewsFeed Release Timeline (`ReleaseNewsfeedTimeline.tsx`):**
  - Khắc phục triệt để hiện tượng lệch dòng và xô lệch trục ngang giữa số thứ tự `[ 1 ]`, tiêu đề bài toán mã hóa `*******` và thông tin Designer.
  - Cấu trúc flexbox `items-center justify-between` với 2 cột:
    - **Cột trái:** Số thứ tự `[ 1 ]` kích thước cố định `size-5` (`20x20px`), viền `border-neutral-200/90`, nền trắng đổ bóng nhẹ, căn giữa tuyệt đối; tiêu đề bài toán hiển thị `text-xs font-medium text-neutral-800 line-clamp-1 leading-normal truncate`.
    - **Cột phải:** Avatar designer `size-5 rounded-full ring-1 ring-neutral-200` và tên designer `text-[11.5px] font-medium leading-none`.
    - Loại bỏ gạch chân thô `hover:underline` trên chuỗi hoa thị mã hóa để giữ thẩm mỹ giao diện sạch và tinh tế.
- **Chuẩn hóa màn hình Không có quyền truy cập (`RequestDetail.tsx`):**
  - **Đổi nhãn định danh:** Chuyển đổi toàn diện từ `Mã bài toán: {request.request_id}` thành **`Yêu cầu tư vấn trải nghiệm: {request.request_id}`** (đồng bộ ở cả thanh breadcrumb trên cùng và nhãn pill badge).
  - **Loại bỏ khối thông tin thừa:** Đã gỡ bỏ hoàn toàn khối hộp *"Thông tin bảo mật"* bên dưới (gồm Trạng thái, Tiêu đề `***`, Hỗ trợ kỹ thuật) theo đúng phản hồi thực tế của người dùng.
  - **Tích hợp Icon Stack 3D isometric (`@reui/c-icon-stack-2`):**
    - Sử dụng component `IconStackLarge` (`h-28 w-24`) từ `@/components/reui/c-icon-stack-2`.
    - Icon cảnh báo bên trong là hình tam giác có dấu chấm than `TriangleAlert` (`size-7 text-amber-500 stroke-[2.25]`).
- **Phân quyền truy cập Tổng quan (Overview) cho PO & Business:**
  - Kích hoạt quyền `overview: true` cho vai trò `PO` và `Business` trong `navVisibilityConfig.ts`.
  - Gỡ bỏ chuyển hướng cưỡng bức về `#track` trong `App.tsx`, cho phép PO & Business truy cập trực tiếp trang Tổng quan (Dashboard) để theo dõi các chỉ số KPI, Backlog & Pending, Đang thực hiện, Đã hoàn thành, Squad Trending.
  - Tại NewsFeed & Track Task: bài toán của chính họ hoặc được gán quyền view thì hiển thị rõ ràng, mở xem bình thường; bài toán không thuộc quyền sở hữu sẽ được mã hóa và khóa truy cập bảo mật.

---

## 🔍 4. MA TRẬN PHÂN TÍCH PHẠM VI ẢNH HƯỞNG (IMPACT MATRIX)

| Thành phần sửa đổi | File mã nguồn | Tác động hệ thống & Rủi ro cần phòng tránh |
| :--- | :--- | :--- |
| **Logic Phân loại Pending** | `src/config/statusConfig.ts`<br>`src/components/track/RequestDetail.tsx`<br>`src/components/track/SolutionAgentsTable.tsx` | Đảm bảo hàm `getRequestPendingClassification()` luôn xử lý an toàn khi thiếu trường dữ liệu (`req.sent_to_po_at` null hoặc rỗng), không gây crash ứng dụng. |
| **Tự động hóa `@SenToPO:`** | `src/components/jolyui/ai-prompt-box.tsx`<br>`src/components/track/RequestDetail.tsx` | Regex bắt link figma phải linh hoạt với cả link share desktop app, prototype mode và link canvas chung. |
| **Stage 7 trên Gantt Chart** | `src/components/reui/gantt-chart.tsx` | Mốc 7 chỉ xuất hiện khi task ở trạng thái chờ PO; không làm lệch dải thời gian của các khâu 1-6 trước đó. |
| **Định dạng Due Date Gantt** | `src/components/reui/gantt-chart.tsx` | Cột `w-24` bảo đảm không xô lệch các cột Status và Assignee lân cận. |
| **Mã hóa Task Dashboard RBAC** | `src/pages/TongQuanPage.tsx`<br>`src/lib/accessControl.ts`<br>`src/components/track/RequestDetail.tsx`<br>`src/components/dashboard/ai-ops/ReleaseNewsfeedTimeline.tsx`<br>`src/components/dashboard/ai-ops/TrackTaskGanttFrame.tsx` | Đảm bảo PO/Business xem đầy đủ số liệu thống kê chung (KPI cards, Squad Trending, Tabs sản phẩm). Riêng tại NewsFeed & Track Task: task do họ tạo hoặc được gán quyền view thì hiển thị rõ ràng; task không tạo và không gán quyền view sẽ bị mã hóa `*******` và khi click chi tiết sẽ báo không có quyền truy cập. |
| **Căn chỉnh NewsFeed Timeline** | `src/components/dashboard/ai-ops/ReleaseNewsfeedTimeline.tsx` | Đảm bảo 2 cột thẳng hàng trên trục ngang, số thứ tự `[ 1 ]` và avatar không bị co méo trên màn hình nhỏ. |
| **Màn hình Không có quyền truy cập** | `src/components/track/RequestDetail.tsx`<br>`src/components/reui/c-icon-stack-2.tsx` | Dùng component `IconStackLarge` với `TriangleAlert` 3D isometric; loại bỏ hoàn toàn box thông tin bảo mật bên dưới; đổi nhãn thành `Yêu cầu tư vấn trải nghiệm`. |
| **Điều hướng Sidebar cho PO/Business** | `src/config/navVisibilityConfig.ts`<br>`src/App.tsx` | Cho phép PO/Business click vào menu Tổng quan (Dashboard) từ thanh bên mà không bị nảy ngược về Track Task. |

---

## 🛑 5. CHECKLIST KIỂM THỬ ĐẠT 100 ĐIỂM (TEST CHECKLIST)

- [x] **Kiểm tra 2 loại Pending:**
  - Tạo task mới, chuyển trạng thái sang `Đã gửi PO` -> Đợi/chỉnh thời gian gửi quá 24h -> Hệ thống hiển thị badge màu Amber `PO Pending`.
  - Nhập comment `@pending: Đợi BA xác nhận luồng OTP Smart OTP` -> Hệ thống hiển thị badge màu Slate `Pending` kèm lý do trích xuất chính xác.
- [x] **Kiểm tra cú pháp `@SenToPO:`:**
  - Nhập `@SenToPO: https://figma.com/design/sample-url` vào ô trao đổi -> Bấm gửi -> Trạng thái đổi thành `Đã gửi PO`, xuất hiện nút "Mở Figma", link trong comment được bôi xanh và click mở tab mới.
- [x] **Kiểm tra Gantt Timeline:** Mở chế độ Gantt Chart -> Task chờ PO hiển thị block màu hổ phách và dot vàng, Footer Legend có mốc `7. PO Pending`.
- [x] **Kiểm tra Định dạng Due Date:** Hiển thị chuẩn `DD/MM/YYYY` (ví dụ `16/09/2026`), độ rộng cột cân đối không bị truncate.
- [x] **Kiểm tra UI Kbd:** Gợi ý phím tắt trong khung chat hiển thị phím bấm nổi ReUI sắc nét (`Enter ↵`, `Shift`, `Enter ↵`).
- [x] **Kiểm tra Phân quyền Mã hóa Dashboard & Điều hướng PO/Business:**
  - PO/Business click vào menu Tổng quan (Dashboard) từ Sidebar chuyển trang thành công, không bị chặn hay nảy ngược về Track Task.
  - Dashboard hiển thị đầy đủ số liệu thống kê 3 thẻ KPI và Squad Trending.
  - Tại NewsFeed và Track Task: task do chính PO/Business tạo HOẶC được gán quyền view (viewers) hiển thị rõ ràng, mở xem chi tiết bình thường.
  - Task không tạo và không được gán quyền view hiển thị dưới dạng chuỗi `********` có độ dài ngẫu nhiên khác nhau.
- [x] **Kiểm tra NewsFeed Timeline:**
  - Số thứ tự `[ 1 ]`, tiêu đề bài toán (kể cả khi bị mã hóa `*******`) và avatar/tên designer thẳng hàng tuyệt đối trên cùng 1 trục ngang.
  - Bỏ gạch chân khi hover vào chuỗi hoa thị mã hóa.
- [x] **Kiểm tra Màn hình Không có quyền truy cập:**
  - Bấm vào task bị mã hóa -> Sheet hiển thị giao diện báo *"Không có quyền truy cập"*.
  - Nhãn định danh hiển thị chuẩn: **Yêu cầu tư vấn trải nghiệm: {request_id}** (ở cả breadcrumb và pill badge).
  - Sử dụng component `IconStackLarge` (`@reui/c-icon-stack-2`) kích thước lớn với icon tam giác có dấu chấm than `TriangleAlert` 3D isometric màu vàng hổ phách.
  - Đã loại bỏ hoàn toàn khối hộp thông tin bảo mật bên dưới (Trạng thái, Tiêu đề, Hỗ trợ kỹ thuật).
- [x] **Kiểm tra Build & Compile:** Chạy `npm run build` hoàn thành với 0 cảnh báo hoặc lỗi cú pháp (exit code 0).

---

## 🚀 6. CÁC NÂNG CẤP CHI TIẾT TASK & HOẠT HỌA STEPPER (17/09/2026)

### 6.1. Khôi Phục Huy Hiệu & Mục "Release Dự Kiến" (`RequestDetail.tsx`)
- **Vị trí Row 1 Header:** Đặt huy hiệu màu tím pastel `bg-purple-50 text-purple-700 border-purple-200/80` bên cạnh loại yêu cầu `[Tính năng mới]`:
  ```tsx
  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[12px] font-medium bg-purple-50 text-purple-700 border border-purple-200/80">
    <Calendar className="w-3.5 h-3.5" />
    Release: {formatDate(req.release_target_date)}
  </span>
  ```
- **Mục 5 trong nội dung chi tiết:** Hiển thị khối "Kế hoạch Release dự kiến" với thời gian phát hành Golive của PO, môi trường Staging/Production và thông tin đợt release.

### 6.2. Chuẩn Hóa Nhận Diện Breadcrumb & Status Pill
- Thêm icon `Building` kích thước `w-3.5 h-3.5` cạnh tên sản phẩm số (`App MBBank`).
- Badge mã bài toán: Làm mỏng viền với `border-slate-200/80`, font mono `11.5px`, màu chữ trung tính `text-slate-600` chống cảm giác thô cứng.
- Status pill: Tích hợp chấm chỉ báo tròn đồng màu (`w-1.5 h-1.5 rounded-full`) theo chuẩn ReUI.

### 6.3. Hoạt Họa Stepper & Chống Hiện Tượng Co Giật (Layout Anti-Jitter)
- **Sóng Sonar / Radar Ping Wave sau UI:** Thiết lập `absolute inset-0 -z-10 rounded-full bg-blue-500/20`, đảm bảo sóng phát ra từ phía sau nút tròn thay vì đè lên icon.
- **Opacity Pulse thay vì Transform Scale:** Sử dụng `animate-pulse` thuần độ mờ (opacity), không làm biến dạng kích thước phần tử ảo, triệt tiêu lỗi layout recalculation.
- **Một vòng xoay nét đứt ngoài duy nhất:** Bỏ viền nét đứt bên trong, giữ nguyên lõi solid và 1 vòng xoay ngoài chậm `animate-[spin_8s_linear_infinite]`.
- **Live Pulse Beacon:** Chấm xanh lá nhấp nháy (`animate-pulse`) cạnh tiêu đề khâu đang hoạt động.
- **Chặn tràn dọc `overflow-y-hidden`:** Đảm bảo thanh cuộn ngang Stepper không bao giờ bị thụt thò hay giật khung hình.

### 6.4. Phân Định Rõ Ràng Về Mặt Nghiệp Vụ
- **Hạn UX (Design Timeline):** Thời hạn nội bộ của UX Team (từ ngày tiếp nhận đến khi hoàn thành nghiệm thu thiết kế trên Figma).
- **Release dự kiến (PO Production Target):** Thời điểm sản phẩm số được đóng gói và phát hành Golive trên Store/Web cho khách hàng cuối.

---

## 🚀 7. CÁC NÂNG CẤP CHI TIẾT TASK DETAIL & GIAO DIỆN NÂNG CAO (21/09 - 22/09/2026)

### 7.1. Khắc Phục Triệt Để Lỗi Lem Màu Nền Avatar Trong Activity Timeline
- **Vấn đề phát hiện:** `TimelineIcon` có background mặc định theo trạng thái (`bg-emerald-500` hoặc `bg-slate-900`). Khi đặt avatar tròn bên trong, màu nền bị lộ viền xung quanh avatar.
- **Giải pháp:**
  - Bổ sung `variant="plain"` / `status="plain"` vào `TimelineIconProps` trong [`timeline.tsx`](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/src/components/reui/timeline.tsx), loại bỏ màu trạng thái và chuyển về `bg-white`.
  - Trong `RequestDetail.tsx`, cấu hình `<UserAvatar size="lg" className="w-8 h-8" showBorder={false} />` khớp hoàn toàn kích thước slot 32px trên nền trắng, triệt tiêu 100% hiện tượng lem màu.

### 7.2. Tinh Giản Nhật Ký Hoạt Động Hệ Thống (System Activity - Chuẩn ClickUp/Jira)
- **Phân tách 2 nhóm Activity:**
  - **Thảo luận / Chat:** Giữ nguyên thẻ bình luận đầy đủ với Avatar tác giả, badge vai trò, văn bản Markdown và file đính kèm.
  - **Hoạt động hệ thống (Chuyển khâu, phân công, đổi trạng thái, đính kèm bàn giao...):** Tinh giản hoàn toàn.
- **Thiết kế Bullet Dot & Căn phải thời gian:**
  - Thay thế icon vòng tròn cồng kềnh bằng Bullet Dot nhỏ gọn `<span className="w-1.5 h-1.5 rounded-full bg-slate-400 ring-4 ring-white" />` căn chính xác trên trục dọc 16px của timeline.
  - Bố cục 1 dòng: Nội dung sự kiện bên trái với badge pill thu nhỏ (`px-1.5 py-0.5 rounded-md text-[11px]`), thời gian `{event.timestamp}` căn sang tận cùng bên phải (`text-[11px] text-slate-400 font-normal whitespace-nowrap`). Tự động hiển thị `"Bạn"` nếu tác giả trùng với người đang đăng nhập.

### 7.3. Hệ Thống Smart Link Chip Đa Nguồn (`SmartLinkChip.tsx`)
- Tạo mới component [`SmartLinkChip.tsx`](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/src/components/common/SmartLinkChip.tsx):
  - **Tự động nhận diện Logo thương hiệu chính thức:**
    - **Figma:** Vector 5 màu nhận diện. Tự động bóc tách tên file từ đường dẫn URL (ví dụ: `/design/:id/MB-App-V5` -> `MB App V5`, `/proto/` -> `(Prototype)`).
    - **Google:** Logo "G" 4 màu chuẩn xác. Tự động nhận diện chuỗi tìm kiếm hoặc tên đường dẫn.
    - **Google Drive, Docs, Sheets, Slides:** Icon vector đặc trưng.
    - **GitHub, GitLab, Jira, Miro, Notion, YouTube...:** Tích hợp icon vector tương ứng.
    - **Mọi trang web khác:** Tra cứu Favicon tự động qua Google Favicon API (`https://www.google.com/s2/favicons?domain=...`) kèm fallback icon địa cầu `Globe`.
  - **Định dạng chuẩn:** Pill màu xám dịu `bg-slate-100 hover:bg-slate-200/90 border border-slate-200/80 rounded-md px-2 py-0.5`, tên nguồn in đậm `font-semibold text-slate-900 text-[11.5px]`, tiêu đề trang `truncate text-slate-600 text-[11.5px]`, mở tab mới với `rel="noopener noreferrer"`.
  - Tích hợp vào nội dung comment, tài liệu đính kèm và hoạt động hệ thống.

### 7.4. Tinh Giản Deliverables & Tài Liệu Bàn Giao
- **Khi chưa có link bàn giao (`!figma_url`):** Ẩn hoàn toàn toàn bộ khối tiêu đề `DELIVERABLES & TÀI LIỆU BÀN GIAO` và nút bấm `+ Đính kèm` trống, giúp thanh bên liền mạch và không bị chiếm diện tích.
- **Khi đã có link bàn giao (`figma_url`):** Bỏ nút `+ Thêm link` ở góc phải tiêu đề, chỉ hiển thị duy nhất thẻ Figma Canvas tinh tế kèm icon `ExternalLink` mở ngoài.

### 7.5. Chuyển Đổi "Hạn UX" Thành Trường Ngày Theo Khâu (Phase-aware Date Field)
- Thay vì luôn hiển thị cố định nhãn "Hạn UX" với 2 ngày dạng `Start → End`, trường ngày tự động điều chỉnh theo khâu hiện tại của bài toán:
  - **Khâu `Chờ xác nhận` & `Define đầu bài`:** Nhãn **`Start`**, hiển thị 1 ngày `{request.submitted_at || "—"}` dạng text thuần xám, không hiển thị nút và không mở lịch.
  - **Khâu `Wireframe`:** Nhãn **`Gửi wireframe`**, nút bấm mở lịch chọn ngày, lưu vào `design_deadline`.
  - **Khâu `UI Design`:** Nhãn **`Gửi UI`**, nút bấm mở lịch chọn ngày, lưu vào `design_deadline`.
  - **Khâu `Ready to dev`:** Nhãn **`Hand off`**, nút bấm mở lịch chọn ngày, lưu vào `design_deadline`.
  - **Khâu `Nghiệm thu UI` & `Hoàn thành`:** Nhãn **`Design done`**, hiển thị ngày chốt bàn giao với màu xanh lục `{customDeadline || "—"}` ở chế độ chỉ đọc (read-only).
- **Chống ngắt dòng:** Loại bỏ giới hạn cứng `w-20 sm:w-24`, cấu hình vùng nhãn `shrink-0 whitespace-nowrap` đảm bảo toàn bộ nhãn luôn nằm trên **1 dòng duy nhất** liền kề nút chọn ngày.

### 7.6. Tích Hợp Component ReUI `@reui/c-calendar-15` (Calendar with Presets)
- Xây dựng component [`c-calendar-15.tsx`](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/src/components/reui/c-calendar-15.tsx):
  - **Cột trái (Presets linh hoạt):** 8 lựa chọn nhanh (`Today`, `Later`, `Tomorrow`, `This weekend`, `Next week`, `Next weekend`, `2 weeks`, `4 weeks`) kèm nhãn phụ (thứ trong tuần, giờ, ngày) và nút *"Xóa chọn"*.
  - **Cột phải (Month Grid):** Header tháng/năm chuẩn tiếng Anh (`October 2026`), nút `Today`, nút điều hướng `^` và `v`, hàng thứ từ Thứ Hai (`Mo Tu We Th Fr Sa Su`), ô ngày được chọn tô nền đen bo góc tròn (`bg-slate-900 text-white rounded-md`).
  - **Cơ chế lưu trữ:** Mọi thao tác chọn ngày lập tức lưu vào `design_deadline`, đồng bộ lên Google Sheets, LocalStorage và Lịch sử hoạt động (Activity log), **hoàn toàn không cần thay đổi hay cập nhật backend**.


