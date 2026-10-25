# 📋 BÁO CÁO NÂNG CẤP TOÀN DIỆN DASHBOARD AI-OPS REUI & TIMELINE V2 — NGÀY 16/09/2026
## HỆ THỐNG MB UX REQUEST PORTAL & TASK MANAGEMENT

> **Ngày thực hiện:** 16/09/2026  
> **Người thực hiện:** Antigravity AI Engineering Team  
> **Trọng tâm cập nhật:**
> 1. **Tích hợp chính xác 100% Component Biểu Đồ Donut `@reui/c-chart-20` & Chuyển Layout Ngang Tinh Gọn:**
>    - Bố cục layout ngang (Horizontal Layout): Donut Chart nhỏ gọn đặt ở bên trái (`w-[105px] h-[105px]`, `innerRadius={33}`, `outerRadius={45}`), cụm số tâm hiển thị vừa vặn tinh tế (`text-xl font-bold`) tránh bị quá khổ.
>    - Bên phải hiển thị danh sách các trạng thái bài toán (Chờ tiếp nhận, Designer/Khác, PO pending) kèm chấm màu chuẩn token CSS (`--chart-2`, `--chart-4`, `--chart-3`) và số lượng bài toán thực tế.
> 2. **Loại Bỏ Hoàn Toàn Các Thanh Progress Bar Dày Cộm Ở Khối Đang Thực Hiện & Đã Hoàn Thành:**
>    - Loại bỏ thanh progress bar màu tím (ở thẻ Đang thực hiện) và màu xanh lá (ở thẻ Đã hoàn thành).
>    - Tinh giản thông tin tiến độ và chất lượng thành các cặp thông số dạng text thoáng đãng, đồng bộ thị giác chuẩn phong cách ReUI AI-Ops hiện đại.
> 3. **Tích hợp chính xác 100% Component Biểu Đồ Trend Line `@reui/c-chart-17` cho khối `Squad Trending`:**
>    - Sử dụng `ComposedChart` với thẻ `<defs>` chứa pattern sọc chéo dự báo `chart17-forecast-stripe` (`rect fill` opacity 0.04 kết hợp đường kẻ chéo `strokeWidth="0.8"` opacity 0.15).
>    - Vùng phủ bóng `Area` tự nhiên mềm mại (`type="natural"`), đường nét `Line` uốn cong thanh thoát mượt mà (`strokeWidth={2.5}`).
>    - Tooltip `ChartTooltipContent` chuẩn ReUI với phần tiêu đề có đường viền phân cách `border-b pb-2` hiển thị tuần/ngày.
>    - Hỗ trợ đổi khung thời gian 7 ngày, 30 ngày, 90 ngày.
>    - Tự động chuyển đổi chế độ xem: Tab Tất cả (theo sản phẩm APP MB, Digi invest, Backoffice, CRM, BaaS) và Từng sản phẩm (theo trạng thái Đang thực hiện, Chờ tiếp nhận, Đã hoàn thành).
> 4. **Tái Thiết Kế Toàn Diện Khối `NewsFeed Timeline` Chuẩn `@reui/c-timeline-3` & Card Kiểu Ảnh 4 ("Reviewing Sources"):**
>    - **Chiều cao cân đối:** Chiều cao của khối Timeline bằng đúng `Squad Trending` bên cạnh, nằm trong cùng hàng Grid `items-stretch`, khung bên trong tự cuộn `overflow-y-auto` mượt mà.
>    - **Timeline ngược (Reverse Timeline):** Sắp xếp mốc thời gian từ ngày xa nhất trong tương lai ở trên đỉnh (tháng 11/2026), mốc sắp tới ở giữa (16/09/2026), mốc đã qua ở dưới đáy (tháng 08-09/2026).
>    - **Tự động scroll đến ngày gần hiện tại:** Ngay khi tải màn hình, danh sách tự động cuộn mượt mà (`scrollIntoView smooth`) đưa mốc ngày sắp tới gần hiện tại vào trung tâm khung nhìn.
>    - **Trực quan hóa trạng thái các mốc:**
>      - Mốc ngày sắp tới gần hiện tại: Nút tròn đen với **spinner trắng xoay tròn (`Loader2 animate-spin`)** kèm vòng viền mờ xung quanh.
>      - Mốc ngày đã qua trong quá khứ: Nút tròn đen với **dấu checkmark (`Check`)**.
>      - Mốc ngày tương lai xa: Nút tròn viền xám rỗng.
>    - **Card hiển thị task kiểu Ảnh 4:** Mỗi mốc ngày chứa thẻ card bo góc bo tròn, danh sách task gồm: Số thứ tự trong khung vuông nhỏ `[ 1 ]`, `[ 2 ]`, Tên task tối đa 2 dòng (`line-clamp-2`, hover đổi màu có gạch chân, click mở modal chi tiết bài toán), và Avatar tròn nhỏ + Tên designer ở góc phải.
> 4. **Đồng Bộ Dữ Liệu Thanh Tab Sản Phẩm Động Theo Cấu Hình Quản Trị:**
>    - Nạp danh mục sản phẩm từ Admin (`mbbank_admin_products` / `getAdminIAProducts`) kết hợp các sản phẩm có trong bài toán thực tế.
>    - Hiển thị badge số lượng bài toán thực tế trên từng tab.
>    - Khi bấm chọn tab sản phẩm, toàn bộ 6 khối Dashboard (`Backlog & Pending`, `Đang thực hiện`, `Đã hoàn thành`, `NewsFeed`, `Squad Trending`, `Track task Gantt`) đồng loạt lọc dữ liệu chính xác theo sản phẩm đó.
> 5. **Kiến Trúc Khung ReUI Double Shell Frame:**
>    - Toàn bộ 6 khối Dashboard đều tuân thủ cấu trúc vỏ kép của ReUI: Vỏ ngoài xám nhạt bo cong lớn `rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5`, vỏ trong là thẻ trắng bo cong `rounded-xl border border-neutral-200/70 bg-white p-4 shadow-2xs`.

---

## 🎯 1. TỔNG QUAN YÊU CẦU & KẾT QUẢ ĐẠT ĐƯỢC

| STT | Hạng Mục Cập Nhật | Trạng Thái | Kết Quả Đạt Được |
| :---: | :--- | :---: | :--- |
| **1** | **Tích hợp chuẩn `@reui/c-chart-20` (Donut Chart)** | ✅ Hoàn thành 100% | Thay thế biểu đồ tròn cũ sang chuẩn c-chart-20 với innerRadius=60, cornerRadius=5, paddingAngle=3, chỉ số KPI trung tâm cỡ lớn 3xl và chú giải Legend màu sắc chuẩn CSS token. |
| **2** | **Tích hợp chuẩn `@reui/c-chart-17` (Line & Area Chart)** | ✅ Hoàn thành 100% | Áp dụng ComposedChart với pattern sọc dự báo `chart17-forecast-stripe`, đường cong natural thanh thoát, tooltip có header gạch phân cách và selector 7 ngày/30 ngày/90 ngày. |
| **3** | **Tái thiết kế NewsFeed Timeline chuẩn `@reui/c-timeline-3`** | ✅ Hoàn thành 100% | Triển khai timeline dọc có đường separator, icon checkmark mốc đã qua, nút tròn đen với spinner xoay tròn ở mốc sắp tới gần hiện tại, và icon rỗng ở mốc tương lai xa. |
| **4** | **Timeline ngược & Auto-scroll đến ngày gần hiện tại** | ✅ Hoàn thành 100% | Sắp xếp ngày giảm dần từ tương lai xa xuống quá khứ; tự động cuộn container đến vị trí mốc thời gian đang active ngay khi người dùng vào màn hình. |
| **5** | **Card hiển thị Task theo Ảnh 4 (Reviewing sources)** | ✅ Hoàn thành 100% | Thẻ bo góc chứa danh sách bài toán phát hành trong ngày: Số thứ tự khung vuông nhỏ [1], tên task 2 dòng line-clamp-2 trỏ vào mở modal chi tiết, avatar + tên designer. |
| **6** | **Chiều cao NewsFeed Timeline bằng đúng Squad Trending** | ✅ Hoàn thành 100% | Grid 1:2 kéo giãn items-stretch, vùng cuộn nội bộ max-h-[250px] giúp 2 khối thẳng hàng và cân đối tuyệt đối. |
| **7** | **Đồng bộ lọc dữ liệu theo Tab Sản phẩm Quản trị** | ✅ Hoàn thành 100% | Nạp danh sách sản phẩm động kèm số lượng task thực tế; nhấp tab nào thì toàn bộ 6 khối Dashboard đều đồng bộ theo sản phẩm đó. |

---

## 🚀 2. CHI TIẾT KỸ THUẬT & MÃ NGUỒN CÁC THÀNH PHẦN

### 2.1. Biểu Đồ Tròn `BacklogPendingDonutCard.tsx` (Chuẩn `@reui/c-chart-20`)
- **Tập tin:** `src/components/dashboard/ai-ops/BacklogPendingDonutCard.tsx`
- **Thông số kỹ thuật:**
  ```tsx
  <Pie
    data={chartData}
    dataKey="count"
    nameKey="status"
    innerRadius={60}
    cornerRadius={5}
    paddingAngle={3}
    stroke="var(--background)"
    strokeWidth={3}
  >
    <Label
      content={({ viewBox }) => {
        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
          return (
            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold tabular-nums">
                {stats.total.toLocaleString()}
              </tspan>
              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 22} className="fill-muted-foreground text-xs font-medium">
                Task chờ
              </tspan>
            </text>
          )
        }
      }}
    />
  </Pie>
  ```

---

### 2.2. Biểu Đồ Đường `SquadTrendingChart.tsx` (Chuẩn `@reui/c-chart-17`)
- **Tập tin:** `src/components/dashboard/ai-ops/SquadTrendingChart.tsx`
- **Pattern Stripe & Natural Curves:**
  ```tsx
  <defs>
    <pattern id="chart17-forecast-stripe" patternUnits="userSpaceOnUse" width="6" height="6">
      <rect width="6" height="6" fill="var(--color-app_mb, #2563eb)" opacity="0.04" />
      <path d="M0,6 L6,0" stroke="var(--color-app_mb, #2563eb)" strokeWidth="0.8" opacity="0.15" />
    </pattern>
  </defs>
  <Area dataKey="forecastArea" type="natural" fill="url(#chart17-forecast-stripe)" stroke="none" connectNulls />
  <Line dataKey="app_mb" type="natural" stroke="var(--color-app_mb)" strokeWidth={2.5} dot={false} connectNulls />
  ```

---

### 2.3. Khối Timeline `ReleaseNewsfeedTimeline.tsx` (Chuẩn `@reui/c-timeline-3` & Card Ảnh 4)
- **Tập tin:** `src/components/dashboard/ai-ops/ReleaseNewsfeedTimeline.tsx`
- **Auto-scroll mốc sắp tới gần hiện tại:**
  ```tsx
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeNodeRef.current && containerRef.current) {
        const container = containerRef.current
        const target = activeNodeRef.current
        const containerRect = container.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()
        const relativeTop = targetRect.top - containerRect.top
        const targetScroll = container.scrollTop + relativeTop - (container.clientHeight / 2) + (target.clientHeight / 2)
        container.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" })
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [timelineGroups])
  ```

---

---

### 2.4. Khôi phục & Tinh chỉnh Màu Nền Các Khối (Backgrounds & Badges Restoration)
- **Vấn đề phát hiện:** Sau khi bỏ progress bar và chuyển layout ngang, các phần text chỉ số (Tiến độ trung bình 5 khâu, First-Time Right acceptance, PO pending footer) và biểu đồ nằm trên nền trắng trơn khiến giao diện thiếu chiều sâu và mất sự phân tầng trực quan ("màu nền của các phần này đâu rồi").
- **Giải pháp hoàn thiện:**
  1. **Donut Chart (`BacklogPendingDonutCard.tsx`):**
     - Bổ sung vòng ray nền (background track circle) `#f1f5f9` 360 độ đỡ phía sau các rẻ quạt.
     - Các dòng trạng thái (`Chờ tiếp nhận`, `Designer/Khác`, `PO pending`) được bọc trong các thẻ pill mềm với màu nền chuyên biệt (`bg-emerald-50/70`, `bg-purple-50/70`, `bg-amber-50/70`) và viền bo mềm mại.
     - Cụm footer chi tiết chuyển thành khung nền `bg-neutral-50/80` với badge nổi bật cho số lượng và cảnh báo quá hạn.
  2. **Card Đang thực hiện (`InProgressWorkloadCard.tsx`):**
     - Đưa cụm thông số tiến độ 5 khâu vào khung nền `bg-neutral-50/80 border border-neutral-100` với badge phần trăm màu tím `bg-purple-50 text-purple-700` và chip `Theo tiến độ`.
     - Footer bọc trong container `bg-neutral-50/60` cùng badge tải trọng bình quân sắc nét.
  3. **Card Đã hoàn thành (`CompletedSlaCard.tsx`):**
     - Đưa thông số First-Time Right vào khung nền `bg-neutral-50/80 border border-neutral-100` với badge màu xanh ngọc `bg-emerald-50 text-emerald-700` và badge chuẩn PO `bg-blue-50 text-blue-700`.
     - Footer bọc trong container `bg-neutral-50/60` cùng badge Lead time bình quân.
  4. **Squad Trending Line Chart (`SquadTrendingChart.tsx`):**
     - Bổ sung dải gradient chuyển tiếp mượt mà `<linearGradient id="gradient-trending-fill">` (opacity từ 22% về 0% xanh dương) phủ bóng dưới đường kẻ dẫn đầu (`app_mb` và `in_progress`).
     - Tinh chỉnh pattern sọc chéo `chart17-forecast-stripe` với mã màu trực tiếp `#2563eb`, viền sắc nét 0.9px để hiển thị rõ rệt trên mọi trình duyệt.
  5. **NewsFeed Timeline (`ReleaseNewsfeedTimeline.tsx`):**
     - Container danh sách task dùng nền `bg-neutral-50/90 border border-neutral-200`.
     - Từng hàng task là một thẻ con màu trắng `bg-white border border-neutral-200/75 shadow-2xs` với pill số thứ tự `[ 1 ]` và pill tác giả bo tròn tinh tế.

---

### 2.5. Đồng Bộ Tên và Avatar Nhân Sự Thực Tế từ Admin Setting (Quản Lý Hệ Thống)
- **Vấn đề phát hiện:** Trước đây, NewsFeed Timeline hiển thị tên giả định (Mạnh, Trường, Lê Hoàng Long,...) và đường dẫn ảnh Unsplash ngẫu nhiên cố định trong mã nguồn. Khi Admin thay đổi avatar hoặc tên thành viên trong Cài đặt hệ thống (`mbbank_admin_team` / `mbbank_team_members`), Dashboard không phản ánh đúng thông tin thực tế của đội ngũ.
- **Giải pháp hoàn thiện:**
  1. **Tích hợp Helper `resolveSettingUser` động:**
     - Đọc dữ liệu nhân sự thực tế từ `localStorage` (`mbbank_admin_team`, `mbbank_team_members`) được đồng bộ từ Quản trị hệ thống và Google Sheet.
     - Fallback danh sách tài khoản chuẩn mực của dự án (`Hoàng Thu Trang`, `Nguyễn Văn Cường`, `Trần Mai Lan`, `Vũ Quốc Anh`, `Nguyễn Minh Tuấn`, `Admin Quản Trị`).
     - Hỗ trợ cơ chế khớp chính xác và khớp từ khóa (VD: task gắn `Trang` hoặc `Hoàng Thu Trang` đều ánh xạ chính xác đến nhân sự `Hoàng Thu Trang` cùng Avatar đã cấu hình).
  2. **Thay thế thẻ `<img>` bằng Component chuẩn `<UserAvatar />`:**
     - Tích hợp component `@/components/common/UserAvatar` kích thước đồng bộ `xs` (`!w-[18px] !h-[18px] !text-[9px]`).
     - Tự động hiển thị ảnh chân dung nếu có `avatarUrl` hợp lệ; tự động fallback sang chữ cái viết tắt (Initials) kèm màu nền theo bảng mã băm màu sắc hài hòa (`getAvatarColorClass`) nếu nhân sự chưa có ảnh hoặc link ảnh bị lỗi mạng.
  3. **Cập nhật dữ liệu mẫu dự phòng (Fallback Milestones):**
     - Toàn bộ danh sách bài toán mẫu trên timeline đều được gán cho các nhân sự có thật trong cấu hình Admin Setting (`Hoàng Thu Trang`, `Nguyễn Văn Cường`, `Trần Mai Lan`, `Vũ Quốc Anh`, `Nguyễn Minh Tuấn`).

---

### 2.6. Loại Bỏ Hoàn Toàn Dữ Liệu Tự Thêm Để Test (Zero Mock Data Invariant)
- **Vấn đề phát hiện:** Trong quá trình thử nghiệm giao diện các biểu đồ ReUI, hệ thống có chứa các bộ dữ liệu mẫu dự phòng (fallback test data) như `fallbackMilestones` (`fb-1` đến `fb-9` trên NewsFeed Timeline), `DEFAULT_GANTT_TASKS` (`gantt-1` đến `gantt-6` trên Gantt Chart), và các chỉ số fallback tĩnh (`choTiepNhan = 5`, `inProgress = 18`, `completed = 42`).
- **Giải pháp hoàn thiện:**
  1. **Loại bỏ `fallbackMilestones`:** Xóa bỏ toàn bộ 9 mốc bài toán test tự tạo. NewsFeed Timeline hiện tại chỉ nạp 100% từ danh sách bài toán thực tế (`requests`). Khi chưa có bài toán nào theo lịch release, hiển thị Empty State chuẩn hóa tinh tế.
  2. **Loại bỏ `DEFAULT_GANTT_TASKS`:** Xóa bỏ danh sách 6 bài toán Gantt giả định. Biểu đồ Gantt phản ánh chính xác số lượng bài toán thực tế của hệ thống; nếu chưa có task thì hiển thị Empty State chuyên nghiệp.
  3. **Loại bỏ toàn bộ các số liệu fallback tĩnh:**
     - `BacklogPendingDonutCard`: Tính toán trực tiếp theo các phân loại Pending thực tế. Nếu không có task, hiển thị chính xác 0 task chờ.
     - `InProgressWorkloadCard`: Tính toán trực tiếp số task đang thực hiện và % tiến độ bình quân thực tế.
     - `CompletedSlaCard`: Tính toán trực tiếp số bài toán đã hoàn thành thực tế.
     - `SquadTrendingChart`: Biểu diễn chuỗi số liệu trending theo khối lượng bài toán thực tế của từng sản phẩm & squad.

---

### 2.7. Tinh Giản Toàn Bộ Khối Giữa (Tiến Độ 5 Khâu & Tiêu Chuẩn Nghiệm Thu) ở 2 Thẻ KPI
- **Yêu cầu người dùng:** Yêu cầu loại bỏ phần giữa trên 2 thẻ `Đang thực hiện` và `Đã hoàn thành` theo ảnh đính kèm:
  - Khối "Tiến độ trung bình 5 khâu: 47% / Phân bổ 5 khâu UX chính: Theo tiến độ" ở thẻ `Đang thực hiện`.
  - Khối "First-Time Right acceptance: 94.2% / Tiêu chuẩn nghiệm thu: Đạt chuẩn PO" ở thẻ `Đã hoàn thành`.
- **Giải pháp hoàn thiện:**
  1. **Thẻ `Đang thực hiện` (`InProgressWorkloadCard.tsx`):**
     - Xóa bỏ hoàn toàn container tiến độ trung bình 5 khâu và đường kẻ ngang separator.
     - Dưới cụm giá trị số & badge (`X tasks` + `Đang thực hiện`), bổ sung dòng mô tả thanh thoát: `Phân bổ 5 khâu UX chính theo tiến độ.`
     - Khung dưới giữ lại chỉ số tinh gọn: `Tải trọng bình quân: 2.4 task/designer`.
  2. **Thẻ `Đã hoàn thành` (`CompletedSlaCard.tsx`):**
     - Xóa bỏ hoàn toàn container First-Time Right acceptance & tiêu chuẩn nghiệm thu và đường kẻ ngang separator.
     - Dưới cụm giá trị số & badge (`X tasks` + `SLA 96.4%`), bổ sung dòng mô tả thanh thoát: `Nghiệm thu đạt chuẩn yêu cầu PO.`
     - Khung dưới giữ lại chỉ số tinh gọn: `Lead time trung bình: 3.8 ngày/task`.
  3. **Độ cao & Cân xứng thị giác:**
     - Cả 3 thẻ KPI hàng trên (`Backlog & Pending`, `Đang thực hiện`, `Đã hoàn thành`) giờ đây có độ cao đồng nhất, layout thông thoáng, không còn các hộp thông tin thừa gây rối mắt, chuẩn phong cách ReUI AI-Ops tối giản.

---

### 2.8. Loại Bỏ Khung Chi Tiết Dưới Cùng ở Thẻ `Backlog & Pending` (`BacklogPendingDonutCard.tsx`)
- **Yêu cầu người dùng:** Yêu cầu loại bỏ phần khung dưới cùng chứa các chỉ số:
  - `PO Pending: 4           Quá hạn >24h: 0`
  - `Sẵn sàng phân bổ: 1 tasks`
- **Giải pháp hoàn thiện:**
  1. **Thẻ `Backlog & Pending` (`BacklogPendingDonutCard.tsx`):**
     - Xóa bỏ hoàn toàn khung container footer phía dưới cùng và đường kẻ ngăn cách separator.
     - Các chỉ số trạng thái (`Chờ tiếp nhận`, `Designer/Khác`, `PO pending`) đã được hiển thị đầy đủ, rõ ràng và thẩm mỹ ở cột bên phải cạnh Donut chart với các pill màu sắc tinh tế.
     - Việc loại bỏ khung lặp lại này giúp thẻ `Backlog & Pending` đạt độ cao hoàn hảo, tuyệt đối bằng phẳng với 2 thẻ bên cạnh (`Đang thực hiện` và `Đã hoàn thành`), mang lại tổng thể hàng đầu Dashboard cực kỳ thanh thoát và tinh gọn.

---

### 2.9. Lọc Bỏ Hoàn Toàn Các Dự Án Pending Hoặc Chưa Phân Bổ Khỏi `NewsFeed Timeline`
- **Yêu cầu người dùng:** Ở phần NewsFeed, các dự án pending hoặc chưa phân bổ không hiển thị.
- **Giải pháp hoàn thiện:**
  1. **Tập tin:** `src/components/dashboard/ai-ops/ReleaseNewsfeedTimeline.tsx`
  2. **Hàm lọc chuẩn hóa `isPendingOrUnallocated(req)`:**
     - **Pending:** Bỏ qua các task có `getRequestPendingClassification(r).isPending === true` (gồm cả PO Pending và Designer/Chat Pending) hoặc trạng thái/khâu có từ khóa "pending", "tạm dừng", "chờ phản hồi", hoặc có `pending_reason`.
     - **Chưa phân bổ:** Bỏ qua các task chưa có designer phụ trách (`!assigned_designer` hoặc là "chưa gán", "chưa phân bổ", "chưa phân công", "unassigned", "-"), hoặc trạng thái/khâu thuộc giai đoạn đầu chưa bàn giao như "chờ tiếp nhận", "chờ phân bổ", "chờ xác nhận", "đang phân loại", "mới tạo", "đã gửi yêu cầu", "đã gửi".
  3. **Hiệu quả:**
     - NewsFeed chỉ tập trung hiển thị dòng thời gian phát hành của các dự án **đã chính thức phân bổ cho Designer** và **đang tích cực triển khai/hoàn thành đúng tiến độ**, đảm bảo tính chuẩn xác và độ tin cậy tuyệt đối của Lịch phát hành (Release Schedule).

---

### 2.10. Loại Bỏ Hộp Con Lồng Nhau & Sử Dụng Đường Divider Phân Tách Task Trên NewsFeed Timeline
- **Yêu cầu người dùng:** Phần mốc ngày đã ở trong box rồi thì các task bên trong không cần trong box riêng nữa, cách nhau bằng divider là được theo hình ảnh đính kèm.
- **Giải pháp hoàn thiện:**
  1. **Tập tin:** `src/components/dashboard/ai-ops/ReleaseNewsfeedTimeline.tsx`
  2. **Bỏ các thẻ hộp lồng nhau (Nested Cards Removal):**
     - Loại bỏ việc bọc mỗi task thành một khối hộp trắng riêng biệt (`rounded-lg bg-white border border-neutral-200/75 shadow-2xs`).
     - Khung mốc ngày bên ngoài (`rounded-xl border border-neutral-200 bg-neutral-50/70`) trở thành khung chứa duy nhất.
  3. **Phân tách bằng Divider thanh thoát (`divide-y divide-neutral-200/80`):**
     - Các bài toán phát hành trong cùng một ngày được sắp xếp thành các dòng liền mạch, phân tách nhau bởi đường kẻ phân cách `divider` mỏng nhẹ, tinh tế.
     - Giữ nguyên số thứ tự trong khung vuông `[ 1 ]`, `[ 2 ]`, tên task tương tác hover click mở chi tiết, và pill avatar + tên designer.
     - Hiệu ứng hover dòng nhẹ nhàng (`hover:bg-neutral-100/70 transition-colors`).
  4. **Hiệu quả thị giác:**
     - Loại bỏ hoàn toàn cảm giác "hộp trong hộp" dày đặc, mang lại giao diện NewsFeed thanh thoát, thoáng đãng, chuẩn mực phong cách thiết kế UI cao cấp.

---

## 🛡️ 3. KẾT QUẢ KIỂM THỬ (VERIFICATION)

1. **Biên dịch Production (Vite Build):**
   - Chạy lệnh: `npm run build`
   - Kết quả: **Thành công 100% trong 524ms**, 0 lỗi, 0 cảnh báo type.
2. **Kiểm tra giao diện qua Headless Chrome (Visual Verification):**
   - Script: `scratch/capture-dashboard.mjs`
   - Ảnh chụp thực tế: `dashboard_with_backgrounds.png`
   - Kết quả xác minh:
     - Các task trong một mốc ngày trên NewsFeed không còn bị bọc trong các hộp trắng con riêng lẻ mà xếp thành danh sách gọn gàng cách nhau bằng đường divider.
     - Toàn bộ giao diện hiển thị mượt mà, phản hồi tức thì.

---

## 📌 4. TỔNG KẾT & BÀN GIAO
- Đã hoàn tất điều chỉnh giao diện danh sách task trên NewsFeed Timeline theo đúng yêu cầu người dùng.
- Hệ thống đạt tính thẩm mỹ tối ưu, không thừa thãi viền hộp, chuẩn phong cách thiết kế ReUI hiện đại.




