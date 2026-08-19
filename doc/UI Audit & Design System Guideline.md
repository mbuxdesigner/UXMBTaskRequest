# 🎨 UI AUDIT & DESIGN SYSTEM GUIDELINE
## UX Request Portal — MBBank Digital

> **Auditor**: Senior Product Designer / UI Design System Lead
> **Date**: 20/08/2026
> **Version**: 1.0
> **Screens audited**: Login · PO Track List · Create Request Form · Designer Dashboard · Quản Lý (Grid/Table) · Request Detail Modal

---

## A. TỔNG QUAN ĐÁNH GIÁ

| Tiêu chí                | Score | Nhận xét |
|--------------------------|:-----:|----------|
| Visual Consistency       | 6/10  | Token system tốt nhưng chưa apply nhất quán vào component. Nhiều hard-coded Tailwind values thay vì dùng CSS custom properties |
| Hierarchy                | 7/10  | Page title → Section title phân cấp khá rõ. Tuy nhiên card-level quá đồng đều, metadata và primary info chưa tách biệt đủ |
| Density                  | 5/10  | Form quá thoáng (vertical spacing lớn), QuanLy card cao bất thường, Track list vừa phải |
| Aesthetic Quality        | 7/10  | Login page premium. Inner pages sạch nhưng thiếu personality. Animation border beam là điểm nhấn tốt |
| Usability                | 7/10  | Flow rõ ràng, CTA vị trí hợp lý. Tuy nhiên empty state filter reset chưa smooth |

**Verdict**: Sản phẩm có foundation tốt (token system, color palette, font stack). Vấn đề chính là **inconsistency giữa các màn hình** — mỗi page tự quyết spacing, radius, card style riêng. Cần chuẩn hóa thành system rules.

---

## B. TOP ISSUES (P0–P1)

---

### P0 — Typography không được apply từ token system

**Hiện tại**
- `index.css` đã định nghĩa đầy đủ typography tokens (`.text-token-h1-semibold`, `.text-token-body-md`, v.v.)
- Nhưng trong code, hầu hết dùng **Tailwind arbitrary values** (`text-lg font-extrabold`, `text-sm font-semibold`, `text-2xl font-black`)
- Không file nào reference các CSS class `text-token-*`

**Vấn đề**
- Token system tồn tại nhưng **không có ai sử dụng** → "Dead tokens"
- Mỗi developer/designer tự chọn font-size + weight → inconsistency xuyên suốt

**Đề xuất**
- Chuyển typography tokens từ CSS classes thành **Tailwind theme extensions** hoặc tạo `@apply` shortcuts
- Enforce: Mọi text phải reference 1 trong các preset đã định nghĩa

**Rule → UI-01**

---

### P0 — Border Radius thiếu system logic

**Hiện tại**
| Component          | Radius hiện tại    | File               |
|--------------------|--------------------|--------------------|
| Page container card| `rounded-2xl` (16px)| TrackRequestPage   |
| Filter input       | `rounded-xl` (12px) | TrackRequestPage   |
| CTA button         | `rounded-xl` (12px) | TrackRequestPage   |
| Pagination button  | `rounded-lg` (8px)  | TrackRequestPage   |
| Request Card       | `rounded-2xl` (16px)| Frame component    |
| Floating sidebar card | `rounded-3xl` (24px) | RequestForm    |
| Status badge       | `rounded-full` (pill)| Everywhere        |
| View toggle        | `rounded-lg` (8px)  | QuanLyPage        |
| Search input       | `rounded-xl` (12px) | QuanLyPage        |
| Avatar             | `rounded-full`      | Everywhere        |
| Arrow button (card)| `rounded-xl` (12px) | RequestCard       |

**Vấn đề**
- 5+ radius values đang được dùng **tùy tiện** (`lg`, `xl`, `2xl`, `3xl`, `full`)
- Không có quy tắc: khi nào 8px, khi nào 12px, khi nào 16px
- Container dùng `2xl`, nhưng child button cũng `xl` — hierarchy radius không rõ

**Đề xuất**
- Chuẩn hóa **4 levels** (xem UI-07)

**Rule → UI-07**

---

### P1 — Card density quá thấp (QuanLy Page)

**Hiện tại**
- Mỗi Request Card trong grid mode chiếm ~200px height
- Metadata row (UX Squad, Giai đoạn, Cập nhật, Deadline) dùng horizontal layout nhưng font-size quá nhỏ → wasted vertical space
- Với 5 items, phải scroll. Với 20 items sẽ cần scroll rất nhiều

**Vấn đề**
- Internal tool ưu tiên **information density** nhưng card hiện tại quá "airy"
- Grid 2 columns chỉ hiển thị 4 cards/viewport
- So sánh: Linear hiển thị 15-20 items/viewport

**Đề xuất**
- Default view nên là **Table** (compact), Grid là secondary view
- Card height giảm bằng cách:
  - Merge ID + Status vào 1 line
  - Giảm padding từ `p-5 sm:p-6` → `p-4`
  - Metadata row chuyển thành inline badges

**Rule → UI-12, UI-18**

---

### P1 — Status badge color mapping thiếu nhất quán cross-screen

**Hiện tại**
| Status          | TrackRequestPage       | QuanLyPage / RequestCard |
|-----------------|------------------------|--------------------------|
| Đang thực hiện  | `bg-amber-50 text-amber-700` (amber) | `variant="navy"` (dark blue) |
| Đang phân loại  | `bg-emerald-50 text-emerald-700` (green) | `variant="warning"` (amber/yellow) |
| Hoàn thành      | `bg-purple-50 text-purple-700` (purple) | `variant="success"` (green) |
| Mới tạo         | `bg-slate-50 text-slate-600` (grey) | `variant="secondary"` (grey) |

**Vấn đề**
- **"Đang thực hiện" = amber ở trang PO, nhưng navy ở trang Designer** — cognitive conflict
- **"Đang phân loại" = green ở PO, amber ở Designer** — đảo ngược hoàn toàn
- Người dùng switching giữa 2 views sẽ **confused** vì cùng 1 trạng thái nhưng màu khác nhau

**Đề xuất**
- Tạo 1 file `statusConfig.ts` duy nhất, export status color mapping
- Mọi component reference cùng 1 source of truth
- Mapping đề xuất:

| Status          | Color    | Semantic                |
|-----------------|----------|-------------------------|
| Đã gửi yêu cầu | Slate    | Neutral / waiting       |
| Đang phân loại  | Amber    | Processing / attention  |
| Đang thực hiện  | Blue     | Active / in progress    |
| Đang review     | Purple   | Review stage            |
| Hoàn thành      | Green    | Success / done          |
| Bị chặn         | Red      | Blocked / error         |

**Rule → UI-13**

---

### P1 — Button system chưa consistent

**Hiện tại**
| Button             | Style                                 | Screen             |
|--------------------|---------------------------------------|--------------------|
| + Tạo yêu cầu (PO)| `bg-slate-900 text-white rounded-xl`  | TrackRequestPage   |
| + Tạo yêu cầu (Designer) | `bg-slate-900 text-white rounded-xl` | Designer Dashboard |
| Gửi yêu cầu UX    | `ShimmerButton` (blue gradient)       | RequestForm        |
| Làm mới            | `ghost` with icon                     | Multiple           |
| Gửi link / Tải file| `variant="outline"` (tabs)           | RequestForm        |
| Cập nhật tiến độ   | `gradient-brand text-white`           | RequestDetail      |
| Chia sẻ            | `ghost`                               | RequestDetail      |

**Vấn đề**
- Primary CTA dùng **3 styles khác nhau**: solid dark, shimmer gradient, gradient-brand
- "Tạo yêu cầu" dùng `slate-900` (near-black) nhưng "Gửi yêu cầu" dùng blue shimmer → khác tinh thần
- Pagination buttons dùng `rounded-lg` nhưng filter buttons dùng `rounded-xl`

**Đề xuất**
- **1 primary button style** cho toàn sản phẩm
- Hierarchy: Primary (solid) → Secondary (outline) → Ghost (text-only)
- CTA gradient/shimmer chỉ dùng cho **hero actions** (login submit, onboarding), không dùng trong form thông thường

**Rule → UI-09**

---

### P1 — Page header format không nhất quán

**Hiện tại**
| Screen          | Title                              | Subtitle                  | CTA position |
|-----------------|-------------------------------------|--------------------------|-------------|
| Track Request (PO) | "Danh sách yêu cầu của bạn" `text-2xl font-black` | Counter stats | Right |
| Track Request (Designer) | "Danh sách yêu cầu" `text-2xl font-black` | Counter stats | Right |
| Quản Lý         | "Quản lý yêu cầu & Tiến độ UX" `text-2xl font-black` | Description paragraph | Right (Làm mới only) |
| Create Request  | "Gửi yêu cầu UX" `text-2xl font-black` | _(none)_ | _(none)_ |
| Login           | "MBBank UX Request Portal" `text-3xl font-bold` | Subtitle | _(none)_ |

**Vấn đề**
- Quản Lý có thêm breadcrumb badge ("Quản lý tổng thể") phía trên, các page khác không có
- Quản Lý có description paragraph, TrackRequest chỉ có counter → format khác nhau
- Create Request page title nằm **ngoài card container**, nhưng Track và Quản Lý nằm **trong card container**

**Đề xuất**
- Chuẩn hóa PageHeader pattern:
  ```
  [Breadcrumb] (optional)
  Page Title (24px / semibold)
  Subtitle or Counter (14px / text-subdued)
  ```
- CTA luôn nằm ở góc phải cùng hàng với title

**Rule → UI-02, UI-03**

---

### P2 — Form spacing quá thoáng

**Hiện tại**
- Form sections dùng `space-y-6` (24px) giữa các section
- Section title dùng `space-y-4` (16px) gap đến first field
- Giữa label và input: `space-y-1.5` (6px)
- Giữa 2 field groups: `space-y-5` (20px)

**Vấn đề**
- 24px giữa sections + 20px giữa fields → form dài, phải scroll nhiều
- Section separator không rõ (chỉ là spacing, không có line/divider)
- Right floating card chiếm vertical space nhưng information density thấp

**Đề xuất**
- Section gap: 24px → 20px
- Field gap: 20px → 16px
- Thêm subtle divider hoặc section background tint để phân tách
- Right card: compact layout, merge date + reason vào 1 section

**Rule → UI-05, UI-10**

---

## C. UI DETAIL AUDIT

### Layout

| Issue | Detail |
|-------|--------|
| **Keep** ✅ | 12-column grid (8 left + 4 right) cho Create Request — proportions tốt |
| **Keep** ✅ | Sidebar width (200px) cho Designer — đủ cho menu items |
| **Keep** ✅ | Full-width layout cho PO (no sidebar) — đúng RBAC logic |
| ⚠️ Fix | Quản Lý grid gap quá lớn (`gap-6` = 24px) cho card grid |
| ⚠️ Fix | Container max-width chưa nhất quán: TrackRequest content full-bleed, CreateRequest có margin |

### Typography

| Role | Hiện tại | Vấn đề | Đề xuất |
|------|----------|--------|---------|
| Page title | `text-2xl font-black` (~24px/900) | `font-black` (900) quá nặng cho body content | 24px / 700 (bold) |
| Section title | `text-base font-black uppercase` (~16px/900) | Uppercase + black weight = quá aggressive | 14px / 600 (semibold) uppercase |
| Card title | `text-sm sm:text-base font-bold` | OK but responsive size tạo inconsistency | 15px / 600 fixed |
| Body text | `text-sm` (14px) | Correct ✅ | Keep |
| Label | `text-sm font-semibold text-primary-600` | Green color cho required label → visual noise | `text-sm font-medium text-slate-700` |
| Metadata | `text-xs text-slate-500` (12px) | Correct ✅ | Keep |
| Badge text | `text-xs font-semibold` (12px/600) | Correct ✅ | Keep |
| Table header | `text-xs uppercase tracking-wider text-primary-600` | Blue + uppercase OK but too colorful | `text-xs uppercase text-slate-500` |

### Spacing

| Pattern | Hiện tại | Chuẩn hóa |
|---------|----------|-----------|
| Page padding (horizontal) | `px-6` TrackRequest, `px-4 sm:px-8` CreateRequest | `px-6` nhất quán |
| Card padding | `p-6 sm:p-7` (RequestForm card), `p-5 sm:p-6` (RequestCard), `p-6` (page header) | `p-5` (20px) default |
| Section gap | `space-y-6` (24px) | `space-y-5` (20px) |
| Field gap | `space-y-4` or `space-y-5` | `space-y-4` (16px) |
| Label → Input | `space-y-1.5` (6px) | `space-y-1.5` (6px) — Keep ✅ |
| Filter bar gap | `gap-3` (12px) | Keep ✅ |
| Table row height | ~56px (14px padding) | Keep ✅ |

### Color

**Neutral palette — Good** ✅
- Background app: `#f6f8fa` — đúng token `--color-bg-app`
- Card background: `#ffffff` — clean
- Border: `border-slate-200/80` — subtle, appropriate

**Status palette — Inconsistent** ❌ (xem Top Issue #4)

**Brand usage — Controlled** ✅
- Brand blue `#1057FB` chỉ dùng cho CTA và link
- Teal `#1eb185` dùng cho accent/success

**Over-decoration warnings**:
- BorderBeam animation trên RequestForm card — đẹp nhưng **chỉ nên dùng cho 1 feature card**, không lạm dụng
- `gradient-brand` trên "Cập nhật tiến độ" button → gradient button chỉ nên dùng cho hero CTA

---

## D. NHỮNG GÌ NÊN GIỮ NGUYÊN (KEEP)

| Pattern | Đánh giá | Lý do |
|---------|----------|-------|
| Login page design | ✅ Excellent | Glassmorphism card, dark gradient background, role-based quick login — premium first impression |
| Sidebar navigation | ✅ Good | Clean, minimal, đúng hierarchy. Active state rõ ràng (primary-500 bg + dot indicator) |
| Progress bar inline | ✅ Good | 1.5px height progress bar dưới mỗi request — subtle, informative, không chiếm space |
| Table column headers | ✅ Good | Uppercase + tracking-wider + sort icon — clean data table pattern |
| Pagination | ✅ Good | Compact, số trang clear, disabled state rõ |
| Empty state 3D stacked cards | ✅ Good | Unique, on-brand, reui component — keep as is |
| Stepper timeline (6 Khâu UX) | ✅ Excellent | Vertical timeline trong Request Detail — very clear workflow visualization |
| Frame component | ✅ Good | Reusable card wrapper với consistent border/shadow — good foundation |
| Floating card sticky | ✅ Good | Right column sticky card trên Create page — smart UX for long forms |

---

## E. UI COMMON NOTES

---

### UI-01 — Typography Scale

**Rule**: Toàn sản phẩm chỉ dùng **7 typography levels** sau. Không tự tạo combination mới.

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| **Page Title** | 24px | 700 (Bold) | 1.28 | Tiêu đề trang chính |
| **Section Title** | 14px | 600 (Semibold) | 1.0 | Uppercase, tracking-wider. Phân tách section trong page/form |
| **Card Title** | 15px | 600 (Semibold) | 1.36 | Tiêu đề task/request trong list/card |
| **Body** | 14px | 400 (Regular) | 1.36 | Nội dung chính, description, detail text |
| **Label** | 14px | 500 (Medium) | 1.0 | Form label, metadata key |
| **Caption** | 12px | 400 (Regular) | 1.36 | Helper text, timestamp, secondary metadata |
| **Badge** | 12px | 600 (Semibold) | 1.0 | Status pill, tag, priority |

**Do**: Dùng `font-bold` (700) cho Page Title, `font-semibold` (600) cho Section/Card Title
**Don't**: Dùng `font-black` (900) hay `font-extrabold` (800) — quá nặng cho productivity tool

---

### UI-02 — Page Header

**Rule**: Mọi page-level screen đều có cùng structure:

```
┌─────────────────────────────────────────────────┐
│ Page Title (24px/bold)          [Primary CTA]   │
│ Subtitle / Counter (14px/text-subdued)          │
└─────────────────────────────────────────────────┘
```

**Recommended**
- Title: `text-2xl font-bold text-slate-900`
- Subtitle: `text-sm text-slate-500`
- CTA: Aligned right, same line as title
- Background: White card hoặc transparent (tùy page)
- Spacing: `mb-6` sau page header

**Do**: Keep counter stats ("5 bài toán · 1 đang thực hiện · 0 hoàn thành") — informative
**Don't**: Thêm breadcrumb badge phía trên title (chỉ QuanLy page đang làm vậy)

---

### UI-03 — Section Title (Form/Detail)

**Rule**: Section title trong form hoặc detail page dùng format:

```
01 · THÔNG TIN YÊU CẦU
```

**Recommended**
- Format: `{number} · {TITLE}`
- Style: `text-sm font-semibold uppercase tracking-wider text-slate-700`
- Bottom margin: `mb-4` (16px) đến first field

**Do**: Dùng numbered sections cho form dài (3+ sections)
**Don't**: Dùng `font-black` (900) cho section title — quá nặng

---

### UI-04 — Color System

**Rule**: Màu sắc chỉ dùng khi truyền tải meaning. Không dùng để decoration.

#### Neutral
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-app` | `#f6f8fa` | Page background |
| `bg-card` | `#ffffff` | Card, modal, popup |
| `border-normal` | `#ebeff3` | Default border |
| `text-primary` | `#0d0d12` | Headings, important text |
| `text-secondary` | `#37394a` | Body text |
| `text-subdued` | `#808898` | Metadata, placeholders |
| `text-disabled` | `#a3acb9` | Disabled states |

#### Semantic
| Purpose | Color | Hex |
|---------|-------|-----|
| Primary / Brand | Navy Blue | `#1057FB` |
| Success / Done | Teal Green | `#1EB185` |
| Warning / Attention | Amber | `#FDB022` |
| Error / Blocked | Red | `#ED0C0F` |
| Info / Review | Purple | `#8B5CF6` |

**Do**: Dùng semantic colors cho status, alerts, validation
**Don't**: Dùng `text-primary-600` (blue) cho form labels — quá colorful

---

### UI-05 — Spacing Scale

**Rule**: Chỉ dùng spacing từ scale: **4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48**

| Context | Spacing | Tailwind |
|---------|---------|----------|
| Icon → Text | 6px | `gap-1.5` |
| Badge padding (horizontal) | 8-10px | `px-2` or `px-2.5` |
| Label → Input | 6px | `space-y-1.5` |
| Between form fields | 16px | `space-y-4` |
| Between sections | 20px | `space-y-5` |
| Card padding | 20px | `p-5` |
| Page padding (horizontal) | 24px | `px-6` |
| Page section gap | 24px | `space-y-6` |

**Do**: Stick to the scale
**Don't**: Dùng `space-y-7` (28px) hoặc `p-7` (28px) — ngoài scale

---

### UI-06 — Surface & Shadow

**Rule**: Có 3 surface levels. Mỗi element chỉ thuộc 1 level.

| Level | Background | Border | Shadow | Usage |
|-------|-----------|--------|--------|-------|
| **Ground** | `#f6f8fa` | None | None | Page background |
| **Raised** | `#ffffff` | `border-slate-200/80` | `shadow-xs` | Cards, containers, tables |
| **Elevated** | `#ffffff` | `border-slate-200` | `shadow-lg` | Modals, popovers, floating cards |

**Do**: Modal/Dialog dùng Elevated. Page card dùng Raised.
**Don't**: Nested cards (card trong card) — gây visual clutter

---

### UI-07 — Border Radius System

**Rule**: 4 radius levels, chọn theo kích thước component.

| Level | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| **Small** | 8px | `rounded-lg` | Button, input, badge container, pagination, toggle |
| **Medium** | 12px | `rounded-xl` | Card, dropdown, popover, search input |
| **Large** | 16px | `rounded-2xl` | Page container, modal, sidebar panel |
| **Full** | 9999px | `rounded-full` | Avatar, status dot, pill badge |

**Logic**: Component càng lớn → radius càng lớn
**Do**: Container card dùng `rounded-2xl`, child button dùng `rounded-lg`
**Don't**: Container `rounded-2xl` nhưng child cũng `rounded-xl` — quá gần, thiếu hierarchy

---

### UI-08 — Icon System

**Rule**: Lucide React icons, consistent size across usage types.

| Context | Size | Tailwind |
|---------|------|----------|
| Inline with text (body) | 16px | `w-4 h-4` |
| Button icon | 16px | `w-4 h-4` |
| Sidebar menu icon | 18px | `w-[18px] h-[18px]` |
| Card feature icon | 20px | `w-5 h-5` |
| Empty state | 24px | `w-6 h-6` |
| Icon → Text gap | 6px | `gap-1.5` |

**Style**: Lucide outline only (stroke-width: 2)
**Do**: Consistent stroke-width across all icons
**Don't**: Mix filled + outlined icons. Don't use icon for pure decoration

---

### UI-09 — Button Hierarchy

**Rule**: Mỗi viewport chỉ có **1 Primary CTA**. Hierarchy rõ ràng.

| Level | Style | Usage |
|-------|-------|-------|
| **Primary** | `bg-slate-900 text-white rounded-lg` | Main action: "Tạo yêu cầu", "Gửi yêu cầu" |
| **Secondary** | `bg-white border-slate-200 text-slate-700 rounded-lg` | Alternate actions: "Làm mới", "Chia sẻ" |
| **Ghost** | `text-slate-600 hover:bg-slate-100` | Tertiary: "Quay lại", navigation |
| **Destructive** | `bg-red-50 text-red-700 border-red-200` | Delete, cancel dangerous action |

**Sizes**:
| Size | Height | Font | Padding |
|------|--------|------|---------|
| Small | 32px | 12px | `px-3` |
| Default | 36px | 14px | `px-4` |
| Large | 40px | 14px | `px-5` |

**Do**: "Gửi yêu cầu UX" dùng Primary solid (dark). Consistent với "Tạo yêu cầu"
**Don't**: Dùng ShimmerButton/gradient cho form submit — quá decorative cho internal tool

---

### UI-10 — Form System

**Rule**: Form elements dùng cùng 1 set dimensions và spacing.

| Element | Height | Radius | Border |
|---------|--------|--------|--------|
| Input | 40px | `rounded-lg` (8px) | `border-slate-200` |
| Select/Dropdown | 40px | `rounded-lg` (8px) | `border-slate-200` |
| Textarea | Min 100px | `rounded-lg` (8px) | `border-slate-200` |
| Date Picker | 40px | `rounded-lg` (8px) | `border-slate-200` |

**Label**: `text-sm font-medium text-slate-700`
**Placeholder**: `text-sm text-slate-400`
**Helper text**: `text-xs text-slate-500`
**Error text**: `text-xs text-red-600`
**Required indicator**: Red asterisk `*` after label text

**Layout**:
```
Label *                          ← font-medium, text-slate-700
┌──────────────────────┐         ← 6px gap (space-y-1.5)
│  Placeholder...      │         ← 40px height
└──────────────────────┘
Helper text                      ← 4px gap, text-xs text-slate-500
```

**Do**: Consistent 40px height across all inputs
**Don't**: Mix `h-10` (40px) và `h-9` (36px) trong cùng 1 form

---

### UI-11 — Filter Bar

**Rule**: Filter bar nằm giữa Page Header và Content. Consistent layout:

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Search...   │ 📦 Product ▾  │ 🏷 Status ▾  │ ↻ Refresh │
└─────────────────────────────────────────────────────────┘
```

- Height: 40px cho tất cả elements
- Gap: `gap-3` (12px) giữa các filter
- Radius: `rounded-xl` (12px) cho search input (larger), `rounded-lg` cho select buttons
- Background: None (inline), hoặc subtle `bg-white` card wrap

**Do**: Group tất cả filters trong 1 row
**Don't**: Scatter filters ở nhiều vị trí khác nhau

---

### UI-12 — Table / List

**Rule**: Table là default view cho danh sách > 5 items.

| Property | Value |
|----------|-------|
| Row height | 52-56px |
| Row padding | `py-3 px-4` |
| Header style | `text-xs uppercase tracking-wider font-semibold text-slate-500 bg-slate-50/50` |
| Hover | `bg-slate-50` |
| Selected | `bg-primary-50 border-l-2 border-primary-500` |
| Divider | `border-b border-slate-100` |

**Column priority**:
1. **Title** (primary, font-semibold)
2. **Assignee** (avatar + name)
3. **Status** (badge)
4. **Progress** (bar + %)
5. **Metadata** (date, ID) — secondary, text-subdued

**Do**: Truncate long titles (`line-clamp-1`), show full on hover/click
**Don't**: Wrap text in table cells — breaks row alignment

---

### UI-13 — Status Badge System

**Rule**: 1 source of truth cho status colors. Tạo `src/config/statusConfig.ts`.

```typescript
export const STATUS_CONFIG = {
  "Đã gửi yêu cầu": { color: "slate",   label: "Đã gửi yêu cầu" },
  "Đang phân loại":  { color: "amber",   label: "Đang phân loại"  },
  "Đang thực hiện":  { color: "blue",    label: "Đang thực hiện"  },
  "Đang review":     { color: "purple",  label: "Đang review"     },
  "Hoàn thành":      { color: "green",   label: "Hoàn thành"      },
  "Bị chặn":         { color: "red",     label: "Bị chặn"         },
}
```

**Badge format**: `dot + text`, pill shape (`rounded-full`)

**Do**: Import `STATUS_CONFIG` trong mọi component cần render status
**Don't**: Hard-code status colors trong từng component

---

### UI-14 — Modal / Dialog

**Rule**: Consistent modal format.

| Property | Value |
|----------|-------|
| Max width | `max-w-2xl` (672px) cho standard, `max-w-4xl` (896px) cho detail |
| Radius | `rounded-2xl` (16px) |
| Padding | `p-6` (24px) |
| Title | `text-lg font-semibold` (18px/600) |
| Close button | Top-right, `X` icon |
| Footer | Right-aligned CTAs, Primary → right, Secondary → left |

**Do**: Footer actions: `[Cancel]  [Primary Action]`
**Don't**: Center-align footer buttons

---

### UI-15 — Empty State

**Rule**: Dùng reui `empty-state-1` pattern (3D stacked cards).

| Element | Style |
|---------|-------|
| Icon | Lucide, 24px, `text-slate-400` |
| Title | `text-base font-semibold text-slate-800` |
| Description | `text-sm text-slate-500` |
| CTA | Primary button hoặc text link |

**When empty, hide**: Search bar / filter bar nên ẩn khi data = 0 (trừ khi user đang filter)

**Do**: Empty state có clear CTA ("Tạo yêu cầu đầu tiên")
**Don't**: Chỉ hiện "Không có dữ liệu" — unhelpful

---

### UI-16 — Loading State

**Rule**:

| Context | Pattern |
|---------|---------|
| Page load | Skeleton rows (3-5 items) |
| Button submit | Spinner + disabled state + "Đang gửi..." text |
| Refresh | Spinning icon trên Refresh button |
| Inline load | Skeleton placeholder matching final content shape |

**Do**: Skeleton shape matches actual content layout
**Don't**: Full-page spinner for partial content load

---

### UI-17 — Interaction Patterns

**Rule**: Same appearance → Same behavior.

| Pattern | Action | Behavior |
|---------|--------|----------|
| Table row click | Open detail | → Modal / slide-over |
| Card click | Open detail | → Modal / slide-over |
| Back arrow (←) | Navigate back | → Previous page |
| `↗` arrow button on card | Open detail | → Same as card click |
| Status badge | _(read only)_ | No action on PO view |
| Avatar | _(read only)_ | Show tooltip with full name |

**Do**: Click anywhere on a row/card opens detail (entire row is clickable)
**Don't**: Only title is clickable but row hover suggests full-row clickable

---

### UI-18 — Density Guidelines

**Rule**: Internal productivity tool → **Default density**, not Comfortable.

| Context | Density | Detail |
|---------|---------|--------|
| Table | Default (52px row) | Most information-dense |
| Card grid | Compact (reduce padding to `p-4`) | For visual browsing |
| Form | Default (16px field gap) | Balance between scan speed and breathing room |
| Modal detail | Comfortable (20px section gap) | Reading-heavy content |
| Sidebar | Compact (36px menu item height) | Maximize vertical menu items |

---

## F. CONSISTENCY MATRIX

| Component | TrackRequestPage | QuanLyPage | CreateRequestPage | RequestDetail | Recommendation |
|-----------|-----------------|------------|-------------------|---------------|----------------|
| Page title | `text-2xl font-black` | `text-2xl font-black` | `text-2xl font-black` | _(in modal)_ | `text-2xl font-bold` (700 instead of 900) |
| Card radius | `rounded-2xl` | `rounded-2xl` (Frame) | `rounded-3xl` (right card) | `rounded-2xl` (modal) | `rounded-2xl` everywhere. Right card → `rounded-2xl` |
| Input height | `h-10` (40px) | `h-9` (36px) | `h-10` (40px) | N/A | `h-10` (40px) everywhere |
| Card padding | `p-6` | `p-5 sm:p-6` | `p-6 sm:p-7` | `p-6` | `p-5` (20px) everywhere |
| Primary CTA | Dark solid | Dark solid | Shimmer gradient | Gradient brand | Dark solid everywhere |
| Status: "Đang thực hiện" | Amber badge | Navy badge | N/A | Navy badge | Blue badge (standardize) |
| Status: "Đang phân loại" | Green badge | Warning badge | N/A | Warning badge | Amber badge (standardize) |
| Filter search height | `h-10` | `h-9` | N/A | N/A | `h-10` |
| Table header color | `text-primary-600` (blue) | `text-primary-600` (blue) | N/A | N/A | `text-slate-500` (neutral) |

---

## G. HÀNH ĐỘNG TIẾP THEO (Recommended Roadmap)

### Phase 1 — Foundation Fix (Priority)
1. ✅ Tạo `src/config/statusConfig.ts` — Single source of truth cho status colors
2. ✅ Chuẩn hóa button style: Bỏ ShimmerButton trong form, dùng solid dark CTA
3. ✅ Fix QuanLy input height `h-9` → `h-10`
4. ✅ Fix card radius: `rounded-3xl` → `rounded-2xl` cho floating card

### Phase 2 — Typography & Spacing
5. Giảm `font-black` (900) → `font-bold` (700) cho page titles
6. Section title: Bỏ `font-black`, dùng `font-semibold`
7. Form label color: `text-primary-600` (blue) → `text-slate-700` (neutral)
8. Chuẩn hóa card padding → `p-5`

### Phase 3 — Density Optimization
9. QuanLy default view → Table mode
10. Card height reduction (giảm internal padding)
11. Form vertical spacing reduction

### Phase 4 — Polish
12. Animation BorderBeam: Chỉ dùng trên 1 highlight card (Keep)
13. Status badge color cross-screen audit
14. Remove dead CSS token classes hoặc migrate code to use them

---

> **"Nếu bỏ logo và tên sản phẩm đi, các màn hình này có còn trông như cùng một sản phẩm không?"**
>
> **Hiện tại: 70% — Yes.** Tinh thần chung (color palette, font family, surface treatment) là consistent. Nhưng **details diverge**: button style, status colors, spacing values, radius values. Sau khi apply guidelines trên → target **95%**.

---

_Document generated by UI Audit System · UX Request Portal v3.0_
