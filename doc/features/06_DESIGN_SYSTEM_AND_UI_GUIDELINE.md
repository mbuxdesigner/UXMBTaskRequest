# 🎨 TÍNH NĂNG 06: DESIGN SYSTEM, GIAO DIỆN & QUY CHUẨN UI/UX (UI GUIDELINES)

> **Mục tiêu tính năng:** Cung cấp quy chuẩn toàn diện về hệ thống Design Tokens (màu sắc thương hiệu MBBank, kiểu chữ Typography, khoảng cách Spacing, bo góc Border-radius), các component dùng chung (ReUI / JolyUI / Radix UI) và các quy tắc bố cục (Layout rules) để đảm bảo giao diện luôn đồng nhất, hiện đại và không bao giờ bị vỡ layout khi phát triển tính năng mới.

---

## 🎯 1. KHI NÀO CẦN ĐỌC TÀI LIỆU NÀY?

- **Khi làm tính năng mới:**
  - Bạn cần tạo một Màn hình mới (Page), một Modal popup hoặc một Thẻ hiển thị dữ liệu mới (Card).
  - Bạn muốn chọn màu sắc, kích thước chữ, hoặc bo góc chuẩn theo phong cách của dự án.
  - Bạn muốn thêm các hiệu ứng hiện đại (Shimmer, Spotlight, BorderBeam, Confetti).
- **Khi sửa tính năng cũ:**
  - Giao diện trên Desktop bị Sidebar bên trái che mất một phần nội dung.
  - Bảng Kanban hoặc bảng danh sách bị giật khi cuộn hoặc thẻ task bị cắt mép.
  - Chữ trên màn hình bị mờ hoặc không đồng nhất kích cỡ font chữ giữa các trang.
  - Màu sắc các Badge trạng thái (Status Badges) bị lệch màu giữa trang Quản lý và trang Theo dõi.

---

## 🛑 2. QUY TẮC BỐ CỤC SỐNG CÒN: "SIDEBAR DESKTOP OFFSET"

Đây là lỗi phổ biến nhất mà các lập trình viên mới thường mắc phải khiến giao diện bị vỡ:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  BROWSER WINDOW                                 │
│ ┌──────────────┐ ┌────────────────────────────────────────────────────────────┐ │
│ │              │ │                                                            │ │
│ │   SIDEBAR    │ │                   MAIN CONTENT CONTAINER                   │ │
│ │   (Fixed)    │ │                                                            │ │
│ │              │ │  TRÊN DESKTOP: Bắt buộc phải có class `md:ml-60`           │ │
│ │  Width: 60   │ │  (hoặc `md:ml-16` khi Sidebar thu gọn).                    │ │
│ │  (240px)     │ │                                                            │ │
│ │              │ │  ⚠️ NẾU QUÊN: Nội dung sẽ bị Sidebar đè lên che mất 240px! │ │
│ │              │ │                                                            │ │
│ └──────────────┘ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Cách áp dụng chuẩn:
Trong `src/App.tsx`, khung chứa nội dung các trang đã được căn lề tự động:
```tsx
<div className={`transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-60"}`}>
  {/* Nội dung trang render ở đây */}
</div>
```
👉 **Lưu ý:** Khi viết component con hoặc trang mới, **tuyệt đối không** đặt lại `fixed` hoặc `absolute left-0 top-0` cho container trang toàn màn hình mà không bù lề Sidebar, vì sẽ phá vỡ cấu trúc layout chung!

---

## 🎨 3. HỆ THỐNG MÀU SẮC THƯƠNG HIỆU & DESIGN TOKENS

Hệ thống sử dụng các biến CSS được định nghĩa tại `src/index.css` và cấu hình token trong `token.json`:

### 3.1 Bảng Màu Nhận Diện Thương Hiệu MBBank:
- **Primary MB Blue:** `#001A9C` (Màu xanh đậm chủ đạo của Ngân hàng MB).
- **Primary MB Red:** `#E60000` (Màu đỏ biểu tượng ngôi sao MB).
- **Accent Blue (Digital):** `#0052FF` / `#2563EB` (Dùng cho các nút hành động, Active link).
- **Background Base:** `#F8FAFC` (Màu xám nhạt nền tảng công nghệ, dịu mắt).
- **Card Surface:** `#FFFFFF` (Nền thẻ card trắng sáng, đổ bóng viền mờ).

### 3.2 Quy chuẩn Màu Badge Trạng Thái (Status & Phase Colors):
Để đảm bảo nhất quán trên tất cả các màn hình (Kanban, Table, Chi tiết task):

| Trạng thái | Màu nền Tailwind | Màu chữ | Icon đại diện |
| :--- | :--- | :--- | :---: |
| **Tiếp nhận & Phân loại** | `bg-slate-100 dark:bg-slate-800` | `text-slate-700` | 📥 Inbox |
| **Discovery & Nghiên cứu** | `bg-amber-100 dark:bg-amber-900/40` | `text-amber-800` | 🔍 Search |
| **User Flow & Wireframe** | `bg-sky-100 dark:bg-sky-900/40` | `text-sky-800` | 📐 Layout |
| **Hi-Fi UI Design** | `bg-indigo-100 dark:bg-indigo-900/40` | `text-indigo-800` | 🎨 Palette |
| **Review & Design System**| `bg-purple-100 dark:bg-purple-900/40` | `text-purple-800` | 👁️ Eye |
| **Hoàn thành / Bàn giao** | `bg-emerald-100 dark:bg-emerald-900/40`| `text-emerald-800`| ✅ CheckCircle |
| **Quá hạn SLA / Khẩn cấp**| `bg-rose-100 dark:bg-rose-900/40` | `text-rose-800` | ⚠️ AlertTriangle |

---

## 📐 4. QUY CHUẨN BO GÓC (BORDER-RADIUS) & KHOẢNG CÁCH (SPACING)

Để loại bỏ tình trạng bo góc tùy tiện giữa các màn hình, hãy tuân thủ nghiêm ngặt **4 Cấp Độ Bo Góc**:

| Cấp Độ | Lớp Tailwind | Giá trị Pixel | Thành Phần Áp Dụng |
| :--- | :--- | :---: | :--- |
| **Level 1 (Nhỏ)** | `rounded-lg` | `8px` | Nút phụ, Phân trang, Tooltip, Dropdown Menu Item, Input nhỏ |
| **Level 2 (Chuẩn)** | `rounded-xl` | `12px` | **Modal Dialog**, Thẻ Card ReUI, Ô nhập liệu Input, Nút CTA chính, Tag Filter |
| **Level 3 (Thẻ Lớn)**| `rounded-2xl`| `16px` | Khối container lớn, Hero banners |
| **Level 4 (Pill)** | `rounded-full`| `9999px` | Avatar nhân sự, Status Badge nhỏ, Nút tròn icon |

> ⚠️ **Lưu ý quan trọng:** Tuyệt đối không dùng `rounded-3xl` (24px) cho Dialog hay Modal thông thường vì sẽ tạo cảm giác cồng kềnh, mất tính hiện đại chuẩn Enterprise.

---

## 🏛️ 5. QUY CHUẨN REUI APPLICATION SETTINGS (TRANG QUẢN TRỊ & CẤU HÌNH)

Khi thiết kế hoặc cập nhật màn hình Quản trị / Settings, cần tuân thủ triệt để nguyên tắc **[ReUI Application Settings](https://reui.io/blocks/application/settings)**:
1. **Bố cục 2 cột phẳng (Flat 2-Column Layout):**
   - Cột trái (`w-64`): Navigation Rail phân chia danh mục rành mạch, icon tối giản, nền hover `hover:bg-zinc-50`, active `bg-zinc-100 text-zinc-900 font-semibold`.
   - Cột phải: Content Panel hiển thị các thẻ ReUI độc lập.
2. **Triệt tiêu Anti-Pattern "Hộp lồng hộp" (No Nested Boxes):**
   - Không đặt thẻ Card bên trong một thẻ Card khác.
   - Sử dụng đường kẻ phân tách ngang **`divide-y divide-zinc-100`** hoặc `border-b border-zinc-200/80` để phân tách các hàng dữ liệu/cấu hình.
3. **Bảng màu Monochrome Zinc/Slate:**
   - Sử dụng bảng màu trung tính Zinc (`zinc-50` đến `zinc-900`).
   - Loại bỏ các hiệu ứng ánh sáng Neon, Spotlight tím/vàng, gradient màu mè trên trang Quản trị.
   - Nút hành động chính: `bg-zinc-900 hover:bg-zinc-800 text-white`.
   - Nút hành động phụ / Huỷ: `bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50`.

---

## ✨ 6. BỘ THƯ VIỆN HIỆU ỨNG (REUI & JOLYUI)

Các component độc quyền đã được đóng gói sẵn trong thư mục `src/components/`:
1. `Frame` (`src/components/reui/frame.tsx`): Khung chứa thẻ chuẩn có viền ánh sáng và nền trắng.
2. `SpotlightCard` (`src/components/jolyui/SpotlightCard.tsx`): Thẻ lưới có hiệu ứng quét sáng theo con trỏ chuột (chỉ dùng cho Hero/Marketing, không lạm dụng trong Admin Settings).
3. `BorderBeam` (`src/components/jolyui/BorderBeam.tsx`): Luồng ánh sáng chạy viền quanh card nổi bật.
4. `InteractiveHoverButton` (`src/components/jolyui/InteractiveHoverButton.tsx`): Nút bấm có hiệu ứng di chuột đổi màu mượt mà.
5. `Skeleton` (`src/components/ui/skeleton.tsx`): Khung xương hiệu ứng Shimmer khi dữ liệu đang tải (giữ Layout không bị giật, CLS = 0).

---

## 🔍 6. MA TRẬN PHÂN TÍCH PHẠM VI ẢNH HƯỞNG (IMPACT ANALYSIS)

| Khi bạn chỉnh sửa... | Các file bị ảnh hưởng | Rủi ro tiềm ẩn & Cách phòng tránh |
| :--- | :--- | :--- |
| **Sửa màu hoặc theme token trong `src/index.css`** | Toàn bộ các component trong `src/` | - Tuyệt đối không xóa các biến `--primary`, `--background`, `--card`.<br>- Phải kiểm tra lại cả chế độ Light và Dark mode sau khi đổi màu. |
| **Sửa Sidebar (`Sidebar.tsx`)** | `src/components/Sidebar.tsx`<br>`src/App.tsx` | - Nếu thay đổi độ rộng `w-60` hoặc `w-16`, phải cập nhật lại class bù trừ tương ứng trong `App.tsx`.<br>- Menu trên điện thoại phải dùng Drawer ẩn/hiện, không được cố định che khuất màn hình. |
| **Sửa Thẻ Kanban (`KanbanCard.tsx`)** | `src/components/kanban/KanbanCard.tsx`<br>`src/components/kanban/KanbanBoard.tsx` | - Thẻ không được quá cao (>200px) gây lãng phí không gian cuộn dọc.<br>- Hiển thị ngày hoàn thành dạng `DD/MM/YYYY`, không hiển thị chuỗi ISO dài. |

---

## 🛑 7. CHECKLIST KIỂM THỬ ĐẠT 100 ĐIỂM (TEST CHECKLIST)

- [ ] **Desktop Offset Test**: Thu nhỏ và mở rộng Sidebar -> Kiểm tra xem các trang Tổng quan, Track, Tạo yêu cầu, Quản trị có tự động thụt lề mượt mà không, không có chữ nào bị Sidebar che khuất.
- [ ] **Responsive Mobile Test**: Bật chế độ giả lập màn hình iPhone/Android (375px - 414px) -> Sidebar tự động ẩn vào Menu Hamburger -> Các bảng và thẻ hiển thị dạng 1 cột vừa vặn, không xuất hiện thanh cuộn ngang vỡ màn hình.
- [ ] **Badge Status Consistency**: So sánh màu của khâu "Hi-Fi UI Design" trên thẻ Kanban và trong Modal chi tiết task -> Màu sắc và icon phải khớp nhau 100%.
- [ ] **Skeleton Shimmer**: F5 trang mạng yếu -> Khung xương Skeleton phải xuất hiện lấp lánh và giữ đúng kích thước trước khi dữ liệu thật tải xong.
- [ ] **Compile Test**: Chạy `npx tsc --noEmit` đạt 0 lỗi.
