/**
 * ══════════════════════════════════════════════════════════════════════════════
 * AI ARTIFACTS SERVICE — QUẢN LÝ TÀI LIỆU, QUY CHUẨN & ARTIFACTS ĐẨY LÊN
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Lưu trữ và xử lý các Artifacts do người dùng đẩy lên (hoặc sinh ra):
 * - Hỗ trợ các định dạng: Markdown (.md), Văn bản (.txt), PDF (.pdf), Code (.ts, .json), Bảng dữ liệu (.csv)
 * - Tự động đồng bộ localStorage
 * - Cung cấp sẵn bộ tài liệu chuẩn UX MBBank làm Knowledge Base ban đầu
 */

export interface UXArtifact {
  id: string
  name: string
  fileType: "markdown" | "pdf" | "code" | "csv" | "text" | "json"
  size: string
  updatedAt: string
  content: string
  summary?: string
  tags?: string[]
  isCustomUploaded?: boolean
  driveUrl?: string
  driveFileId?: string
  driveThumbnailUrl?: string
  driveDownloadUrl?: string
  uploadedBy?: string
}

const STORAGE_ARTIFACTS_KEY = "ux_mb_ai_artifacts"

// Danh mục tài liệu chuẩn ban đầu của UX MBBank
export const SEED_UX_ARTIFACTS: UXArtifact[] = [
  {
    id: "art-nhom-1-san-pham-tien-gui",
    name: "Nhom-1-San-pham-tien-gui.md",
    fileType: "markdown",
    size: "1.4 KB",
    updatedAt: "Vừa xong",
    tags: ["Sản phẩm", "Tiền gửi", "Savings"],
    summary: "Đặc tả UX nhóm sản phẩm tiền gửi: TK Siêu Lãi Ngày, Chứng chỉ tiền gửi với thông số cốt lõi và tính chất sản phẩm.",
    content: `# NHÓM 1: SẢN PHẨM TIỀN GỬI (Savings Products)

Nhóm sản phẩm cốt lõi mang lại nguồn vốn cho ngân hàng, hiển thị đầy đủ các thông số về Lãi suất, Số tiền bắt đầu, Thông điệp và Nút hành động trực tiếp.

1.1. TK Siêu Lãi Ngày

- Định vị UX: Sản phẩm tiền gửi sinh lời. Nhắm tới nhóm khách hàng muốn tối ưu hóa tiền nhàn rỗi ngắn ngày mà không bị giam vốn.
- Thông số cốt lõi:
  ◦ Lãi suất: %/năm (tính lãi và cộng dồn gốc theo ngày).
  ◦ Số tiền tối thiểu: Từ 20.000.000 đ.
- Tính chất sản phẩm
  ◦ *Thông tin chính*:
    ▪ Nhận lãi cộng dồn vào tài khoản mỗi ngày.
    ▪ Nạp/rút linh hoạt 24/7 chỉ trong 3 giây.
    ▪ Không lo giam vốn, không yêu cầu kỳ hạn gửi.
    ▪ Phù hợp làm quỹ dự phòng khẩn cấp hoặc tích trữ vốn ngắn hạn.

---

1.2. Chứng chỉ tiền gửi

- Định vị UX: sản phẩm dành cho khách hàng có nhu cầu gửi ngắn hạn vài ngày đến 6 tháng, lãi suất tất toán sớm được tính theo số ngày nắm giữ. Thích hợp cho khách hàng có dòng tiền nhàn rỗi trong khoảng thời gian ngắn hạn vài tháng từ ngày đến 6 tháng
- Thông số cốt lõi:
`,
  },
  {
    id: "art-huong-dan-git-local",
    name: "Huong-dan-lay-code-chay-local-va-Git.md",
    fileType: "markdown",
    size: "2.1 KB",
    updatedAt: "Vừa xong",
    tags: ["Git", "Local Dev", "Hướng dẫn"],
    summary: "Hướng dẫn lấy code, chạy local và đẩy code lên Git chuẩn theo quy trình phát triển.",
    content: `# Hướng dẫn lấy code, chạy local và đẩy code lên Git

Xác định dự án nằm ở đâu:

\`\`\`
D:\\Working\\TaskUXTeam\\Deploy App
\`\`\`

Nhánh làm việc là gì:

\`\`\`
develop
\`\`\`

## 1. Mở terminal PowerShell trong VS Code

Trong VS Code:
- Chọn **Terminal** → **New Terminal**
- Hoặc nhấn **Ctrl** + \` \`
- Nếu terminal chưa phải PowerShell, nhấn dấu ▼ cạnh nút + và chọn **PowerShell**

Di chuyển vào thư mục dự án:

\`\`\`powershell
cd "D:\\Working\\TaskUXTeam\\Deploy App"
\`\`\`

## 2. Lấy code mới nhất từ nhánh \`develop\`
- Kiểm tra nhánh hiện tại:
\`\`\`powershell
git branch
\`\`\`
- Chuyển sang nhánh \`develop\` nếu đang ở nhánh khác:
\`\`\`powershell
git checkout develop
\`\`\`
- Kéo code mới nhất về máy:
\`\`\`powershell
git pull origin develop
\`\`\`

## 3. Chạy dự án ở môi trường Local
- Cài đặt các gói phụ thuộc (nếu có bổ sung thư viện mới):
\`\`\`powershell
npm install
\`\`\`
- Khởi động server phát triển:
\`\`\`powershell
npm run dev
\`\`\`

## 4. Đẩy code lên Git
- Kiểm tra các file đã thay đổi:
\`\`\`powershell
git status
\`\`\`
- Đóng gói và tạo commit:
\`\`\`powershell
git add .
git commit -m "feat: cập nhật giao diện Notion style cho file viewer"
\`\`\`
- Đẩy lên nhánh làm việc:
\`\`\`powershell
git push origin develop
\`\`\`
`,
  },
  {
    id: "art-quy-trinh-7-khau",
    name: "Quy-trinh-7-khau-UX-MBBank.md",
    fileType: "markdown",
    size: "4.8 KB",
    updatedAt: "Hôm nay",
    tags: ["Quy trình", "Chuẩn vận hành", "MBBank"],
    summary: "Quy trình thiết kế trải nghiệm 7 khâu chính thức tại MBBank từ Tiếp nhận tới Bàn giao & Nghiệm thu UAT.",
    content: `# QUY TRÌNH THIẾT KẾ TRẢI NGHIỆM NGƯỜI DÙNG (UX) — MBBANK

## 1. Mục tiêu và Phạm vi
Quy trình này áp dụng cho toàn bộ các sản phẩm trong hệ sinh thái số của MBBank:
- **App MBBank** (Khách hàng cá nhân)
- **Biz MBBank** (Khách hàng doanh nghiệp)
- **MB Portal / BaaS** (Nền tảng ngân hàng mở & nội bộ)

---

## 2. Chi tiết 7 khâu vận hành chuẩn

### Khâu 1: Chờ tiếp nhận (Backlog)
- **Đầu vào:** Yêu cầu từ Khối kinh doanh / PO / BA qua cổng tiếp nhận UX Portal.
- **Tiêu chuẩn:** Đầy đủ thông tin mục tiêu kinh doanh, nhóm người dùng mục tiêu, tài liệu BRD/URD sơ bộ.

### Khâu 2: Phân loại & Đánh giá sơ bộ
- **Trách nhiệm:** Lead Designer / Design Owner.
- **Hành động:** Xác định mức độ phức tạp (S/M/L/XL), gán cấp độ ưu tiên (Lv1 Hotfix, Lv2 Tuần này, Lv3 Tiêu chuẩn) và phân bổ nhân sự phụ trách.

### Khâu 3: Nghiên cứu & Định nghĩa (Discovery & Define)
- **Hoạt động:** Phỏng vấn người dùng, benchmark ngân hàng đối thủ (Techcombank, VPBank, Vietcombank, TPBank), vẽ hành trình khách hàng (Customer Journey Map).
- **Đầu ra:** UX Problem Statement & Bản kiến trúc chức năng.

### Khâu 4: Cấu trúc thông tin & Wireframe (IA & User Flow)
- **Hoạt động:** Thiết kế luồng đi màn hình (Flowchart), bố cục khung dây (Wireframe đen trắng).
- **Hành động:** Gửi PO review luồng chính (/sentopo) trước khi lên UI màu chi tiết.

### Khâu 5: Thiết kế giao diện chi tiết (UI Design / Design System)
- **Quy chuẩn:** Bắt buộc sử dụng 100% Token và Component từ **MBBank Design System v3.0**.
- **Tiêu chuẩn kỹ thuật:** Auto-layout responsive, đủ 4 trạng thái (Default, Hover, Active, Disabled, Loading, Error).

### Khâu 6: Làm mẫu tương tác & Kiểm thử (Prototype & Testing)
- **Hoạt động:** Nối tương tác Figma Prototype có độ phân giải cao (Hi-Fi Prototype).
- **Đánh giá:** Usability Testing trên ít nhất 5 người dùng nội bộ/khách hàng thật. Đạt tỷ lệ hoàn thành tác vụ > 85%.

### Khâu 7: Bàn giao & Nghiệm thu thiết kế (Ready for Dev & UAT)
- **Đầu ra:** Bàn giao Figma Link có gắn khung thông số (Redlines/Dev Mode) và UX Specs.
- **Theo dõi:** Designer tham gia kiểm thử giao diện môi trường UAT trước khi tính năng chính thức **Go-Live**.

---

## 3. SLA & Phản hồi liên chức năng
- Thời gian chờ PO phản hồi tối đa: **24 giờ**.
- Nếu sau 24h PO chưa phản hồi, hệ thống tự động gắn trạng thái **PO Pending** (Màu Amber) để đưa vào danh sách điểm nghẽn của tuần.
`,
  },
  {
    id: "art-design-handoff-spec",
    name: "Tieu-chuan-Design-Handoff-MB.md",
    fileType: "markdown",
    size: "3.2 KB",
    updatedAt: "Hôm qua",
    tags: ["Figma", "Handoff", "Dev Specs"],
    summary: "Checklist quy chuẩn bàn giao file Figma cho lập trình viên Frontend / Mobile App và PO.",
    content: `# TIÊU CHUẨN DESIGN HAND-OFF CHO DEV & PO — MBBANK

## 1. Cấu trúc tổ chức trang (Page Structure) trong file Figma
Mỗi file dự án trên Figma của MBBank phải tuân thủ cấu trúc trang chuẩn:
- 📌 **Cover & Info**: Tên bài toán, ID task, Designer phụ trách, PO, Ngày bàn giao, Trạng thái.
- 📐 **Flow & Overview**: Sơ đồ tổng thể toàn bộ luồng màn hình.
- 🚀 **Ready for Dev**: Các màn hình chính thức đã nghiệm thu, sẵn sàng cho Dev bóc tách code.
- 🧪 **Prototype**: Mẫu tương tác dùng để demo và test luồng.
- 🗄️ **Archive / Explorations**: Các phương án nháp cũ, không áp dụng.

## 2. Quy chuẩn kỹ thuật Layer & Auto-Layout
- **100% Auto-layout:** Không sử dụng nhóm Group tự do; mọi container phải dùng Auto-layout (Fill container / Hug contents).
- **Design Tokens:** Sử dụng màu sắc và kiểu chữ từ MB Design System library. Tuyệt đối không dùng mã hex tự do (hardcoded color).
- **Naming Convention:** Đặt tên frame theo format chuẩn: \`[Feature]_[ScreenName]_[State]\` (ví dụ: \`Card_OpenJCB_Success\`).

## 3. Checklist các trạng thái màn hình bắt buộc
1. **Empty State:** Khi người dùng chưa có dữ liệu giao dịch hoặc danh sách trống.
2. **Loading State:** Shimmer / Skeleton loading mượt mà, không giật màn hình.
3. **Error State:** Lỗi mất kết nối mạng, lỗi timeout gateway, lỗi nhập sai form.
4. **Edge Cases:** Tên người dùng quá dài (> 30 ký tự), số tiền lớn (> 10 chữ số), màn hình nhỏ (iPhone SE 375px) vs lớn (Pro Max 430px).

## 4. Ghi chú tương tác (Interaction Notes)
- Bổ sung ghi chú trực tiếp cạnh màn hình: thời gian animation (Ease-out 250ms), điều kiện disable nút bấm, quy tắc validate form.
`,
  },
  {
    id: "art-sla-po-pending",
    name: "Chinh-sach-SLA-va-PO-Pending.md",
    fileType: "markdown",
    size: "2.6 KB",
    updatedAt: "3 ngày trước",
    tags: ["SLA", "PO Pending", "Quy tắc"],
    summary: "Chính sách quản lý thời gian phản hồi giữa Designer và Product Owner, cơ chế gắn tag /sentopo.",
    content: `# CHÍNH SÁCH SLA VÀ CƠ CHẾ PO PENDING — UX MBBANK

## 1. Định nghĩa PO Pending
**PO Pending** là trạng thái phát sinh khi Designer đã hoàn thiện phương án thiết kế (Wireframe hoặc UI) và gửi đường dẫn bàn giao cho Product Owner (PO), nhưng sau **24 giờ làm việc** PO vẫn chưa có ý kiến phê duyệt hoặc yêu cầu chỉnh sửa.

## 2. Tác hại của việc tồn đọng PO Pending
- Gây nghẽn dòng chảy công việc (Workflow Bottleneck).
- Designer phải chuyển đổi bối cảnh liên tục (Context switching), giảm thời gian Deep Work.
- Nguy cơ trễ hạn ngày phát hành tính năng (Go-Live Deadline).

## 3. Cú pháp lệnh điều hướng trên hệ thống
Khi trao đổi trong ô thảo luận bài toán:
- **Gửi duyệt PO:** Gõ lệnh \`/sentopo: [Link Figma] [Ghi chú nội dung cần duyệt]\`
  * Hệ thống sẽ lập tức kích hoạt bộ đếm SLA 24 giờ.
  * Tự động gửi thông báo trực tiếp tới PO phụ trách.
- **Tạm dừng do lý do khách quan:** Gõ lệnh \`/pending: [Lý do tạm dừng]\` (Ví dụ: \`/pending: Chờ BA chốt tài liệu API từ đối tác\`).

## 4. Xử lý khi quá hạn 24 giờ
- Trợ lý AI sẽ tự động gắn cờ cảnh báo màu Amber trong **Bản tin điều hành buổi sáng**.
- Đề xuất Designer liên hệ trực tiếp qua Teams hoặc nhắc nhở trong buổi Daily Standup.
`,
  },
  {
    id: "art-design-system-tokens",
    name: "MBBank-Design-System-Tokens.json",
    fileType: "json",
    size: "3.5 KB",
    updatedAt: "Tuần trước",
    tags: ["Design System", "Tokens", "Brand"],
    summary: "Bảng mã màu thương hiệu, màu ngữ nghĩa và thông số khoảng cách chuẩn MBBank Design System.",
    content: `{
  "system": "MBBank Design System v3.0",
  "brand": {
    "primary": "#1057FB",
    "primaryNavy": "#0B2056",
    "starRed": "#ED1C24",
    "pureWhite": "#FFFFFF"
  },
  "semantic": {
    "success": {
      "light": "#ECFDF5",
      "main": "#10B981",
      "dark": "#047857"
    },
    "warning": {
      "light": "#FFFBEB",
      "main": "#F59E0B",
      "dark": "#B45309"
    },
    "error": {
      "light": "#FEF2F2",
      "main": "#EF4444",
      "dark": "#B91C1C"
    },
    "info": {
      "light": "#EFF6FF",
      "main": "#3B82F6",
      "dark": "#1D4ED8"
    }
  },
  "spacing": {
    "unit": 4,
    "scale": [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64]
  },
  "typography": {
    "fontFamily": "Inter, Outfit, Be Vietnam Pro, sans-serif",
    "scales": {
      "display": "32px",
      "h1": "24px",
      "h2": "20px",
      "h3": "16px",
      "body": "14px",
      "caption": "12px",
      "tiny": "10px"
    }
  }
}`,
  },
]

const STORAGE_DELETED_ARTIFACTS_KEY = "ux_mb_deleted_artifact_ids"

/**
 * Lấy danh sách ID các artifact đã bị người dùng xóa
 */
export function getDeletedArtifactIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_ARTIFACTS_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return new Set(arr)
    }
  } catch {}
  return new Set()
}

/**
 * Đánh dấu artifact ID là đã xóa vĩnh viễn
 */
export function markArtifactAsDeleted(id: string): void {
  if (typeof window === "undefined" || !id) return
  try {
    const set = getDeletedArtifactIds()
    set.add(id)
    localStorage.setItem(STORAGE_DELETED_ARTIFACTS_KEY, JSON.stringify(Array.from(set)))
  } catch {}
}

/**
 * Lấy danh sách artifacts từ localStorage (hoặc seed data nếu chưa có)
 */
export function getStoredArtifacts(): UXArtifact[] {
  try {
    const deletedIds = getDeletedArtifactIds()
    const raw = localStorage.getItem(STORAGE_ARTIFACTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        // Loại bỏ các artifact đã bị đánh dấu xóa
        const filtered = parsed.filter((item: UXArtifact) => !deletedIds.has(item.id))
        const existingIds = new Set(filtered.map((item: UXArtifact) => item.id))
        // Chỉ bổ sung seed nếu seed đó CHƯA TỪNG bị người dùng xóa
        const missingSeeds = SEED_UX_ARTIFACTS.filter(
          (seed) => !existingIds.has(seed.id) && !deletedIds.has(seed.id)
        )
        if (missingSeeds.length > 0) {
          const merged = [...missingSeeds, ...filtered]
          localStorage.setItem(STORAGE_ARTIFACTS_KEY, JSON.stringify(merged))
          return merged
        }
        if (filtered.length !== parsed.length) {
          localStorage.setItem(STORAGE_ARTIFACTS_KEY, JSON.stringify(filtered))
        }
        return filtered
      }
    }
    // Lần đầu tải: Lấy seed loại trừ các id đã xóa (nếu có)
    const initial = SEED_UX_ARTIFACTS.filter((seed) => !deletedIds.has(seed.id))
    localStorage.setItem(STORAGE_ARTIFACTS_KEY, JSON.stringify(initial))
    return initial
  } catch (err) {
    console.error("[aiArtifactsService] Error loading artifacts:", err)
  }
  return SEED_UX_ARTIFACTS.filter((seed) => !getDeletedArtifactIds().has(seed.id))
}

/**
 * Lưu danh sách artifacts vào localStorage
 */
export function saveStoredArtifacts(artifacts: UXArtifact[]): void {
  try {
    localStorage.setItem(STORAGE_ARTIFACTS_KEY, JSON.stringify(artifacts))
  } catch (err) {
    console.error("[aiArtifactsService] Error saving artifacts:", err)
  }
}

/**
 * Thêm một artifact mới do người dùng tải lên hoặc nhập vào
 */
export function addArtifact(artifact: Omit<UXArtifact, "id" | "updatedAt">): UXArtifact {
  const current = getStoredArtifacts()
  const newArtifact: UXArtifact = {
    ...artifact,
    id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    updatedAt: "Vừa xong",
    isCustomUploaded: true,
  }
  const updated = [newArtifact, ...current]
  saveStoredArtifacts(updated)
  return newArtifact
}

/**
 * Xóa một artifact theo ID (lưu vết để không tự hồi sinh)
 */
export function deleteArtifact(id: string): UXArtifact[] {
  markArtifactAsDeleted(id)
  const current = getStoredArtifacts()
  const updated = current.filter((a) => a.id !== id)
  saveStoredArtifacts(updated)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ux_mb_artifacts_changed", { detail: updated }))
  }
  return updated
}

/**
 * Cập nhật nội dung artifact
 */
export function updateArtifact(id: string, updates: Partial<UXArtifact>): UXArtifact[] {
  const current = getStoredArtifacts()
  const updated = current.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: "Vừa sửa" } : a))
  saveStoredArtifacts(updated)
  return updated
}

/**
 * Định dạng dung lượng tệp
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Hợp nhất danh sách Artifacts lấy từ Google Sheet với bộ nhớ Local
 */
export function mergeCloudArtifacts(cloudArtifacts: UXArtifact[]): UXArtifact[] {
  if (!Array.isArray(cloudArtifacts) || cloudArtifacts.length === 0) {
    return getStoredArtifacts()
  }
  const deletedIds = getDeletedArtifactIds()
  const current = getStoredArtifacts()
  const localMap = new Map<string, UXArtifact>()
  current.forEach((a) => localMap.set(a.id, a))

  let hasNewOrUpdated = false
  cloudArtifacts.forEach((cloudArt) => {
    if (!cloudArt || !cloudArt.id || deletedIds.has(cloudArt.id)) return
    const existing = localMap.get(cloudArt.id)
    if (!existing) {
      localMap.set(cloudArt.id, cloudArt)
      hasNewOrUpdated = true
    } else if (cloudArt.updatedAt && cloudArt.updatedAt !== existing.updatedAt) {
      localMap.set(cloudArt.id, { ...existing, ...cloudArt })
      hasNewOrUpdated = true
    }
  })

  if (hasNewOrUpdated) {
    const merged = Array.from(localMap.values())
    saveStoredArtifacts(merged)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ux_mb_artifacts_changed", { detail: merged }))
    }
    return merged
  }
  return current
}
