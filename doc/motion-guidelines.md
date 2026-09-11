# UXMB Task Request — Motion Design Guidelines & Interaction Standards

> **Phiên bản**: 1.0.0 (Ban hành: 2026-09-10)  
> **Tác giả**: MBBank Digital Innovation Lab & UX Team  
> **Tiêu chuẩn tham chiếu**: [animate-ui.com](https://animate-ui.com/docs/components), WCAG 2.2 Success Criterion 2.3.3, Framer Motion v13  
> **Mục tiêu**: Chuẩn hóa toàn bộ vi tương tác (micro-interactions), động lực học (spring physics), và chuyển động giao diện trên toàn hệ thống UXMB Task Request, đảm bảo tính mượt mà, định hướng không gian (spatial continuity), phản hồi xúc giác tự nhiên và tuân thủ tuyệt đối khả năng tiếp cận (Accessibility).

---

## MỤC LỤC

1. [Triết Lý & Nguyên Tắc Chuyển Động (Core Philosophy)](#1-triết-lý--nguyên-tắc-chuyển-động-core-philosophy)
2. [Hệ Thống Tham Số Động Lực Học (Motion Tokens)](#2-hệ-thống-tham-số-động-lực-học-motion-tokens)
   - 2.1. Bộ Tham Số Lò Xo Vật Lý (Spring Physics)
   - 2.2. Thời Lượng Chuẩn (Duration Tokens)
   - 2.3. Đường Cong Gia Tốc (Easing Curves)
   - 2.4. Chính Sách Giảm Chuyển Động (Reduced Motion Policy)
3. [Bốn Pattern Chuyển Động Chuẩn (Standard Motion Patterns)](#3-bốn-pattern-chuyển-động-chuẩn-standard-motion-patterns)
   - 3.1. Pattern 1: Floating Active Indicator (Shared Layout `layoutId`)
   - 3.2. Pattern 2: Origin-Aware Popover & Dialog (Anchor Origin Scale & Fade)
   - 3.3. Pattern 3: Staggered Skeleton-to-UI Reveal (Cascade Wave Transition)
   - 3.4. Pattern 4: Tactile Feedback & Micro-Interactions (Spring Bounce & Hover Lift)
4. [Tối Ưu Hiệu Năng & Cam Kết 60+ FPS (Performance Engineering)](#4-tối-ưu-hiệu-năng--cam-kết-60-fps-performance-engineering)
5. [Quy Chuẩn Khả Năng Tiếp Cận (WCAG 2.2 SC 2.3.3 Compliance)](#5-quy-chuẩn-khả-năng-tiếp-cận-wcag-22-sc-233-compliance)
6. [Bảng Tra Cứu Tái Sử Dụng (Implementation Catalog)](#6-bảng-tra-cứu-tái-sử-dụng-implementation-catalog)

---

## 1. TRIẾT LÝ & NGUYÊN TẮC CHUYỂN ĐỘNG (CORE PHILOSOPHY)

Hệ thống điều hành yêu cầu nghiệp vụ ngân hàng **UXMB Task Request** đòi hỏi sự cân bằng tinh tế giữa **tính chuẩn xác, độ tin cậy của doanh nghiệp (enterprise-grade reliability)** và **trải nghiệm người dùng hiện đại, sống động (delightful micro-interactions)**.

Chuyển động trong UXMB không phục vụ mục đích trang trí thuần túy mà là một ngôn ngữ giao tiếp chức năng:

1. **Tính Định Hướng Không Gian (Spatial Continuity)**:
   - Khi người dùng di chuyển giữa các thẻ tab, chế độ xem (Bảng, Kanban, Lưới, Gantt) hoặc điều hướng Sidebar, giao diện không được biến mất và xuất hiện gián đoạn (snap/jump). Một chỉ báo chuyển động vật lý (floating pill) trượt mượt mà giữa các điểm mốc, giúp mắt người dùng dễ dàng định vị vị trí hiện tại trong không gian 2 chiều.

2. **Tính Gốc Tọa Độ (Origin Awareness)**:
   - Các cửa sổ bật lên (popovers, dropdowns, contextual dialogs) phải bung nở trực tiếp từ chính tọa độ điểm kích hoạt (nút bấm hoặc con trỏ chuột), tạo cảm giác tương tác thực tế như kéo mở một ngăn kéo hoặc nở rộng một thẻ dữ liệu. Khi đóng lại, cửa sổ phải co về đúng điểm xuất phát thay vì biến mất đột ngột.

3. **Chuyển Tiếp Dữ Liệu Bậc Thang (Staggered Cascade)**:
   - Thay thế việc hoán đổi màn hình thô bạo (monolithic swap) bằng quá trình chuyển hóa nhịp nhàng: Skeleton phát ra luồng sóng phản quang ngang (radiant shimmer wave) trong lúc chờ, và khi dữ liệu tải xong, skeleton mờ dần để nhường chỗ cho các khối thẻ/hàng dữ liệu lần lượt trượt nhẹ lên theo nhịp vi mô (micro-delay 45ms).

4. **Phản Hồi Xúc Giác Đàn Hồi (Tactile Responsiveness)**:
   - Mọi nút bấm, thẻ công việc và cần gạt đều có phản hồi đàn hồi tức thì dưới 16ms (`whileTap`, `whileHover`), đem lại cảm giác chắc chắn, nhạy bén và thỏa mãn thị giác (tactile feedback).

---

## 2. HỆ THỐNG THAM SỐ ĐỘNG LỰC HỌC (MOTION TOKENS)

Toàn bộ tham số được định nghĩa và xuất bản tập trung tại `src/lib/motion.ts`, ngăn ngừa hoàn toàn hiện tượng hardcode thông số tùy tiện.

### 2.1. Bộ Tham Số Lò Xo Vật Lý (Spring Physics)

Chuyển động trong tự nhiên không di chuyển theo các hàm tuyến tính (linear) đơn điệu mà tuân theo các định luật đàn hồi vật lý gồm **Độ cứng (Stiffness)**, **Hệ số cản (Damping)** và **Khối lượng (Mass)**.

$$\text{Force} = -k \cdot x - c \cdot v$$

| Tên Token | Thông số Vật Lý | Thời gian đáp ứng | Ứng dụng chuẩn |
|---|---|:---:|---|
| `springs.snappy` | `{ stiffness: 450, damping: 35, mass: 0.8 }` | ~180ms | Nút bấm, chỉ báo tab trượt (floating pill), icon action, switches |
| `springs.gentle` | `{ stiffness: 320, damping: 28, mass: 1.0 }` | ~260ms | Hộp thoại (modals), ngăn kéo (drawers), popover danh sách lớn |
| `springs.bouncy` | `{ stiffness: 400, damping: 20 }` | ~320ms | Badge thông báo, reaction emojis, tooltip cảnh báo |
| `springs.smooth` | `{ stiffness: 260, damping: 25 }` | ~340ms | Khung chuyển trang lớn, accordion bung mở nhiều dòng |
| `springs.floating` | `{ stiffness: 450, damping: 35, mass: 0.8 }` | ~180ms | Indicator trượt bám chuột và neo active giữa các tab |
| `springs.popover` | `{ stiffness: 420, damping: 26, mass: 0.9 }` | ~220ms | Origin-aware popover, context dropdowns |

### 2.2. Thời Lượng Chuẩn (Duration Tokens)

Khi sử dụng các chuyển động mờ dần (opacity dissolve) hoặc khi hệ thống giảm chuyển động, áp dụng bảng thời lượng sau:

| Token | Giá trị (giây) | Tương đương (ms) | Ngữ cảnh sử dụng |
|---|:---:|:---:|---|
| `durations.instant` | `0.08s` | 80ms | Phản hồi hover icon, tooltip tức thì |
| `durations.fast` | `0.15s` | 150ms | Pha thoát popover (`exit`), đóng menu |
| `durations.normal` | `0.25s` | 250ms | Chuyển trang AnimatePresence, backdrop fade |
| `durations.slow` | `0.35s` | 350ms | Mở drawer toàn màn hình, mở modal lớn |
| `durations.skeletonExit`| `0.20s` | 200ms | Pha mờ dần biến mất của khung xương skeleton |

### 2.3. Đường Cong Gia Tốc (Easing Curves)

Được áp dụng khi kết hợp CSS Transitions hoặc hoạt ảnh phi lò xo:

```ts
export const easings = {
  /** Deceleration nhanh ban đầu, êm ái khi dừng */
  easeOutCubic: [0.215, 0.61, 0.355, 1],
  /** Chuyển tiếp mượt mà hai chiều cho các bộ chứa */
  easeInOutCubic: [0.645, 0.045, 0.355, 1],
  /** Gia tốc cực nhanh theo hàm mũ (dùng cho modal/popover) */
  easeOutExpo: [0.16, 1, 0.3, 1],
  /** Lực bật lùi vi mô khi thả tương tác */
  backOut: [0.34, 1.56, 0.64, 1],
} as const
```

### 2.4. Chính Sách Giảm Chuyển Động (Reduced Motion Policy)

Khi hệ điều hành kích hoạt `prefers-reduced-motion: reduce`:
- Cấm hoàn toàn dịch chuyển không gian lớn (`x`, `y`, `scale`).
- Toàn bộ chuyển đổi lò xo chuyển sang **Fade In / Fade Out** thuần túy trong khoảng thời lượng từ `0.1s - 0.15s`.
- Khung xương Skeleton vô hiệu hóa chuyển động lướt ánh sáng ngang (shimmer wave), giữ nền tĩnh nhẹ nhàng.

---

## 3. BỐN PATTERN CHUYỂN ĐỘNG CHUẨN (STANDARD MOTION PATTERNS)

### 3.1. Pattern 1: Floating Active Indicator (Shared Layout `layoutId`)

#### Mục đích
Loại bỏ hiện tượng nhảy class CSS giật cục khi chuyển đổi qua lại giữa các menu Sidebar, các tab chế độ xem (Bảng, Kanban, Lưới, Gantt) hoặc các bộ lọc vai trò. Một viên thuốc hoặc thanh chỉ báo mềm mại sẽ trượt liên tục theo chuyển động con trỏ.

#### Sơ đồ hoạt động
```
[ Tab 1 ]       [ Tab 2 (Active) ]       [ Tab 3 ]
                      ┌──────┐
                      │ Pill │  ── (Click Tab 3) ──►  [ Tab 3 ]
                      └──────┘                         ┌──────┐
                                                       │ Pill │
                                                       └──────┘
                      (Sliding with springs.snappy physics)
```

#### Code Mẫu Chuẩn (Segmented Switcher):
```tsx
import { useState } from "react"
import { motion } from "framer-motion"
import { springs } from "@/lib/motion"
import { ListFilter, Columns3, LayoutGrid, CalendarRange } from "lucide-react"

const MODES = [
  { id: "table", label: "Bảng", icon: ListFilter },
  { id: "kanban", label: "Kanban", icon: Columns3 },
  { id: "grid", label: "Lưới", icon: LayoutGrid },
  { id: "gantt", label: "Gantt", icon: CalendarRange },
] as const

export function ViewModeSwitcher({
  currentMode,
  onModeChange,
}: {
  currentMode: string
  onModeChange: (mode: string) => void
}) {
  const [hoveredMode, setHoveredMode] = useState<string | null>(null)

  return (
    <div
      className="relative flex items-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 text-xs select-none"
      onMouseLeave={() => setHoveredMode(null)}
    >
      {MODES.map((mode) => {
        const isActive = currentMode === mode.id
        const isHovered = hoveredMode === mode.id
        const Icon = mode.icon

        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onModeChange(mode.id)}
            onMouseEnter={() => setHoveredMode(mode.id)}
            className={`relative h-7 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer z-10 ${
              isActive ? "text-slate-900 font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {/* Lớp 1: Hover Preview Indicator (Lướt đón đầu chuột) */}
            {isHovered && !isActive && (
              <motion.span
                layoutId="view-mode-hover-pill"
                className="absolute inset-0 rounded-lg bg-slate-200/50 -z-10"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}

            {/* Lớp 2: Active Solid Pill (Neo vững chắc) */}
            {isActive && (
              <motion.span
                layoutId="view-mode-active-pill"
                className="absolute inset-0 rounded-lg bg-white shadow-2xs border border-slate-200/40 -z-10"
                transition={springs.floating}
              />
            )}

            <Icon className="size-3.5 relative z-10" />
            <span className="relative z-10">{mode.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

---

### 3.2. Pattern 2: Origin-Aware Popover & Dialog (Anchor Origin Scale & Fade)

#### Mục đích
Triệt tiêu hiện tượng popover và dialog bung nở cơ học từ tâm màn hình hoặc từ các góc cố định. Hộp thoại phải nở ra và co lại trực tiếp từ tọa độ nút bấm kích hoạt (`transformOrigin`).

#### Quy tắc AnimatePresence bất biến:
1. **Tuyệt đối không đặt `if (!open) return null` trước hoặc trong component được bọc bởi `<AnimatePresence>`**: Điều này gây unmount ngay lập tức và triệt tiêu hoàn toàn pha thoát (`exit animation`).
2. **Backdrop và Dialog Card phải là các `motion.div` độc lập**: Không lồng chung vào một thẻ `div` tĩnh.

#### Code Mẫu Chuẩn:
```tsx
import { useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { springs, originPopoverVariants, useAnchorOrigin } from "@/lib/motion"

export function OriginAwarePopover({
  isOpen,
  onClose,
  triggerText = "Bộ lọc",
  children,
}: {
  isOpen: boolean
  onClose: () => void
  triggerText?: string
  children: React.ReactNode
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const { transformOrigin } = useAnchorOrigin(triggerRef, popoverRef, "bottom-right")

  return (
    <div className="relative inline-block">
      {/* Nút bấm kích hoạt có Tactile Press */}
      <motion.button
        ref={triggerRef}
        type="button"
        whileTap={{ scale: 0.96 }}
        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-xs shadow-2xs hover:bg-slate-50"
      >
        {triggerText}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Lớp phủ mờ nhẹ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-xs"
              onClick={onClose}
            />

            {/* Thẻ Popover nở ra từ đúng gốc tọa độ nút bấm */}
            <motion.div
              ref={popoverRef}
              variants={originPopoverVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ transformOrigin }}
              className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50"
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

### 3.3. Pattern 3: Staggered Skeleton-to-UI Reveal (Cascade Wave Transition)

#### Mục đích
Khi dữ liệu nạp hoàn tất, không bung toàn bộ màn hình cùng một lúc (monolithic pop). Skeleton mờ dần (fade-out trong 200ms), đồng thời các thành phần dữ liệu thực tế (bảng, hàng, thẻ bento) lần lượt trượt nhẹ lên theo nhịp bậc thang vi mô (stagger delay 45ms).

#### Sơ đồ nhịp thời gian
```
Timeline:  0ms       45ms      90ms      135ms     180ms
Skeleton: [Fade Out ─────────────► Unmount]
Card 1:   [Slide up & fade in]
Card 2:             [Slide up & fade in]
Card 3:                       [Slide up & fade in]
Card 4:                                 [Slide up & fade in]
```

#### Code Mẫu Chuẩn (Dashboard Bento Grid):
```tsx
import { motion, AnimatePresence } from "framer-motion"
import {
  staggerContainerVariants,
  staggerItemVariants,
  durations,
} from "@/lib/motion"
import { DashboardSkeleton } from "@/components/common/ReuiSkeletons"

export function DashboardContentWrapper({
  loading,
  kpiItems,
}: {
  loading: boolean
  kpiItems: Array<{ id: string; title: string; value: string }>
}) {
  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="dashboard-skeleton-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: durations.skeletonExit, ease: "easeInOut" }}
          className="w-full"
        >
          <DashboardSkeleton />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard-real-content"
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {kpiItems.map((item) => (
            <motion.div
              key={item.id}
              variants={staggerItemVariants}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow"
            >
              <div className="text-xs font-medium text-slate-500">{item.title}</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{item.value}</div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

---

### 3.4. Pattern 4: Tactile Feedback & Micro-Interactions (Spring Bounce & Hover Lift)

#### Mục đích
Tạo phản hồi cảm ứng thị giác (tactile feedback) sống động khi tương tác với các nút bấm, icon button, thẻ công việc và cần gạt.

#### A. Tactile Button & Icon Button
```tsx
import { motion } from "framer-motion"
import { tactileProps } from "@/lib/motion"

export function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      {...tactileProps.button}
      className="px-4 py-2 rounded-xl bg-[#1057FB] text-white font-semibold text-sm shadow-sm hover:bg-[#0b46d1] cursor-pointer"
    >
      {label}
    </motion.button>
  )
}
```

#### B. Thẻ Công Việc Với Nâng Nhẹ (Hover Lift & Dynamic Spotlight)
Để tránh hiện tượng giật khung hình do gọi `setState` liên tục khi di chuột qua thẻ (layout thrashing), sử dụng biến CSS (`--mouse-x`, `--mouse-y`) thay vì render lại React:
```tsx
import { useRef } from "react"
import { motion } from "framer-motion"
import { tactileProps } from "@/lib/motion"

export function RequestCardInteractive({ children }: { children: React.ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    cardRef.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`)
    cardRef.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`)
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      {...tactileProps.card}
      className="group relative rounded-2xl border border-slate-200/90 bg-white p-4 overflow-hidden transition-shadow duration-200 hover:shadow-xl hover:border-slate-300"
    >
      {/* Vệt sáng hội tụ theo con trỏ với hiệu năng 60 FPS */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: "radial-gradient(400px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(16, 87, 251, 0.08), transparent 40%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
```

---

## 4. TỐI ƯU HIỆU NĂNG & CAM KẾT 60+ FPS (PERFORMANCE ENGINEERING)

1. **Chỉ tác động lên các thuộc tính Composite (GPU Accelerated)**:
   - ✅ CHẤP NHẬN: `transform` (`scale`, `translate3d`, `rotate`) và `opacity`.
   - ❌ NGHIÊM CẤM HOẠT HÓA: `width`, `height`, `top`, `left`, `margin`, `padding`, `border-width`. Hoạt hóa các thuộc tính này kích hoạt chu trình Layout & Paint trên luồng chính của trình duyệt (Main Thread), gây sụt giảm khung hình nghiêm trọng.

2. **Áp dụng Hardware Acceleration**:
   - Sử dụng `will-change: transform` hoặc class `contain-paint` cho các bảng dữ liệu lớn.
   - Luồng ánh sáng Shimmer trên Skeleton dùng pseudo-element `after:absolute` với `translateX(-100%)` tới `translateX(100%)` chạy trên GPU compositor.

3. **Chống Layout Thrashing Trong Sự Kiện Chuột**:
   - Tuyệt đối không gọi `getBoundingClientRect()` hoặc đọc các thuộc tính `offsetTop`/`clientWidth` bên trong các vòng lặp hoặc sự kiện `onMouseMove`.
   - Lưu trữ kích thước trong `useLayoutEffect` hoặc truyền thẳng tọa độ chuột qua biến CSS.

---

## 5. QUY CHUẨN KHẢ NĂNG TIẾP CẬN (WCAG 2.2 SC 2.3.3 COMPLIANCE)

Tiêu chuẩn WCAG 2.2 Success Criterion 2.3.3 (Animation from Interactions) quy định rõ: *Người dùng phải có khả năng vô hiệu hóa các chuyển động không thiết yếu từ tương tác mà không làm mất đi thông tin hoặc chức năng của ứng dụng.*

### 5.1. Tích Hợp Toàn Cục Tại Cấp Ứng Dụng (`App.tsx`)
Framer Motion bỏ qua thuộc tính thời lượng CSS thuần. Do đó, gốc ứng dụng tại `src/App.tsx` bắt buộc phải được bọc trong `<MotionConfig reducedMotion="user">`:

```tsx
import { MotionConfig } from "framer-motion"

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#FCFCFD]">
        {/* Mọi hoạt ảnh lò xo và di chuyển x/y bên trong tự động làm phẳng */}
      </div>
    </MotionConfig>
  )
}
```

### 5.2. Đồng Bộ Hóa Với CSS Media Query (`index.css`)
```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 5.3. Quy Định Cho Screen Readers
Mọi thẻ Skeleton trong quá trình nạp dữ liệu bắt buộc gắn thuộc tính `aria-hidden="true"` để phần mềm đọc màn hình không đọc các khối placeholder vô nghĩa. Bộ chứa danh sách đang tải phải có `aria-busy="true"`.

---

## 6. BẢNG TRA CỨU TÁI SỬ DỤNG (IMPLEMENTATION CATALOG)

| Thành phần UI | Tệp tin đích | Token / Variant Áp Dụng | Hiệu Ứng Quy Chuẩn |
|---|---|---|---|
| **Sidebar Navigation** | `src/components/Sidebar.tsx` | `layoutId="sidebar-active-indicator"`, `springs.floating` | Nền trượt bám dọc theo menu item active |
| **View Switcher** | `src/pages/TrackRequestPage.tsx` | `layoutId="view-mode-pill"`, `springs.snappy` | Viên thuốc trắng lướt êm giữa Bảng/Kanban/Lưới/Gantt |
| **Component Tabs** | `src/components/ui/tabs.tsx` | `layoutId="tabs-active-${id}"`, `springs.floating` | Gạch chân (line) hoặc viên thuốc (pill) trượt layout |
| **Bộ lọc Popover** | `src/components/reui/task-filter-popover.tsx` | `originPopoverVariants`, `useAnchorOrigin` | Bung nở và thu lại theo đúng tọa độ nút "Lọc" |
| **User Menu & Apps** | `src/components/common/AppHeader.tsx` | `<AnimatePresence>`, `originPopoverVariants` | Nở ra từ tâm avatar / icon grid, đóng có exit fade |
| **Hộp thoại Thêm TV** | `src/components/common/AddMemberModal.tsx` | `dialogOverlayVariants`, `dialogContentVariants` | Sửa lỗi `if (!open) return null`, backdrop mờ dần |
| **Khung xương Skeleton**| `src/components/ui/skeleton.tsx` | Shimmer wave gradient ngang | Sóng phản quang radiant 1.6s, GPU accelerated |
| **Tổng quan Dashboard** | `src/pages/TongQuanPage.tsx` | `staggerContainerVariants`, `staggerItemVariants` | Skeleton fade-out, 4 KPI bento cards trượt lên tuần tự |
| **Hàng Bảng Dữ Liệu** | `src/components/track/SolutionAgentsTable.tsx`| `staggerItemVariants`, `tactileProps.button` | Hàng lướt vào nhịp nhàng, click có active tap |
| **Nút bấm Hành động** | `src/components/ui/button.tsx` | `tactileProps.button` (`whileHover`, `whileTap`) | Đàn hồi xúc giác nhạy bén, micro bounce |

---

*Tài liệu này là quy chuẩn kỹ thuật bắt buộc cho toàn bộ các mốc phát triển tiếp theo của dự án UXMB Task Request.*
