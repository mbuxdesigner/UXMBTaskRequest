export interface ProductColorDef {
  key: string
  label: string
  dotClass: string
  badgeClass: string
  borderClass: string
  bgSoft: string
  hex: string
}

export const PRODUCT_COLORS: Record<string, ProductColorDef> = {
  blue: {
    key: "blue",
    label: "Xanh MB",
    dotClass: "bg-blue-600",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    borderClass: "border-blue-300",
    bgSoft: "bg-blue-50/60",
    hex: "#2563EB",
  },
  purple: {
    key: "purple",
    label: "Tím Đậm",
    dotClass: "bg-purple-600",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    borderClass: "border-purple-300",
    bgSoft: "bg-purple-50/60",
    hex: "#9333EA",
  },
  emerald: {
    key: "emerald",
    label: "Xanh Lá",
    dotClass: "bg-emerald-600",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    borderClass: "border-emerald-300",
    bgSoft: "bg-emerald-50/60",
    hex: "#059669",
  },
  amber: {
    key: "amber",
    label: "Vàng Cam",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    borderClass: "border-amber-300",
    bgSoft: "bg-amber-50/60",
    hex: "#D97706",
  },
  rose: {
    key: "rose",
    label: "Đỏ Hồng",
    dotClass: "bg-rose-500",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    borderClass: "border-rose-300",
    bgSoft: "bg-rose-50/60",
    hex: "#E11D48",
  },
  cyan: {
    key: "cyan",
    label: "Xanh Biển",
    dotClass: "bg-cyan-500",
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
    borderClass: "border-cyan-300",
    bgSoft: "bg-cyan-50/60",
    hex: "#06B6D4",
  },
  indigo: {
    key: "indigo",
    label: "Chàm",
    dotClass: "bg-indigo-600",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    borderClass: "border-indigo-300",
    bgSoft: "bg-indigo-50/60",
    hex: "#4F46E5",
  },
  teal: {
    key: "teal",
    label: "Xanh Ngọc",
    dotClass: "bg-teal-500",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
    borderClass: "border-teal-300",
    bgSoft: "bg-teal-50/60",
    hex: "#0D9488",
  },
  violet: {
    key: "violet",
    label: "Tím Violet",
    dotClass: "bg-violet-600",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    borderClass: "border-violet-300",
    bgSoft: "bg-violet-50/60",
    hex: "#7C3AED",
  },
  sky: {
    key: "sky",
    label: "Xanh Trời",
    dotClass: "bg-sky-500",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    borderClass: "border-sky-300",
    bgSoft: "bg-sky-50/60",
    hex: "#0284C7",
  },
  slate: {
    key: "slate",
    label: "Xám Chì",
    dotClass: "bg-slate-600",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    borderClass: "border-slate-300",
    bgSoft: "bg-slate-50/60",
    hex: "#475569",
  },
}

/**
 * Phân tích chuỗi class hoặc key màu để lấy định nghĩa ProductColorDef tương ứng
 */
export function resolveColorKey(colorOrClass?: string): ProductColorDef | null {
  if (!colorOrClass) return null
  const str = colorOrClass.toLowerCase().trim()

  if (PRODUCT_COLORS[str]) {
    return PRODUCT_COLORS[str]
  }

  // Hỗ trợ mã màu HEX trực tiếp (#2563EB, ...)
  if (str.startsWith("#")) {
    const found = Object.values(PRODUCT_COLORS).find(c => c.hex.toLowerCase() === str)
    if (found) return found
    return {
      key: "custom",
      label: "Custom",
      dotClass: "",
      badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
      borderClass: "border-slate-300",
      bgSoft: "bg-slate-50/60",
      hex: colorOrClass,
    }
  }

  // Nếu là chuỗi class tailwind (ví dụ: "bg-emerald-50 text-emerald-700 border-emerald-200")
  if (str.includes("emerald") || str.includes("green")) return PRODUCT_COLORS.emerald
  if (str.includes("amber") || str.includes("yellow") || str.includes("orange")) return PRODUCT_COLORS.amber
  if (str.includes("purple")) return PRODUCT_COLORS.purple
  if (str.includes("violet")) return PRODUCT_COLORS.violet
  if (str.includes("rose") || str.includes("red") || str.includes("pink")) return PRODUCT_COLORS.rose
  if (str.includes("cyan")) return PRODUCT_COLORS.cyan
  if (str.includes("teal")) return PRODUCT_COLORS.teal
  if (str.includes("sky")) return PRODUCT_COLORS.sky
  if (str.includes("indigo")) return PRODUCT_COLORS.indigo
  if (str.includes("blue")) return PRODUCT_COLORS.blue
  if (str.includes("slate") || str.includes("gray") || str.includes("zinc")) return PRODUCT_COLORS.slate

  return null
}

/**
 * Đọc cấu hình sản phẩm từ localStorage để lấy màu sắc đã lưu trong phần Quản lý (Setting)
 */
export function getProductColorDef(productName?: string, customColorKey?: string): ProductColorDef {
  if (customColorKey) {
    const resolved = resolveColorKey(customColorKey)
    if (resolved) return resolved
  }

  const rawName = (productName || "").trim()
  if (!rawName) return PRODUCT_COLORS.blue

  // 1. Tìm trong danh sách Sản phẩm đã lưu trong Setting
  try {
    const saved = localStorage.getItem("mbbank_admin_products") || localStorage.getItem("ux_portal_products_v2")
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        const matched = parsed.find(
          (p: any) => p.name && p.name.trim().toLowerCase() === rawName.toLowerCase()
        )
        if (matched && matched.color) {
          const resolved = resolveColorKey(matched.color)
          if (resolved) return resolved
        }
      }
    }
  } catch {}

  // 2. Fallback heuristic theo từ khóa tên sản phẩm
  const name = rawName.toLowerCase()
  if (name.includes("app")) return PRODUCT_COLORS.blue
  if (name.includes("biz")) return PRODUCT_COLORS.purple
  if (name.includes("baas") || name.includes("api") || name.includes("open")) return PRODUCT_COLORS.cyan
  if (name.includes("invest") || name.includes("digi") || name.includes("wealth") || name.includes("đầu tư")) return PRODUCT_COLORS.amber
  if (name.includes("backoffice") || name.includes("nội bộ") || name.includes("vận hành")) return PRODUCT_COLORS.teal
  if (name.includes("crm")) return PRODUCT_COLORS.violet
  if (name.includes("design") || name.includes("nền tảng")) return PRODUCT_COLORS.slate
  if (name.includes("lending") || name.includes("vay")) return PRODUCT_COLORS.indigo
  if (name.includes("saving") || name.includes("tiết kiệm")) return PRODUCT_COLORS.emerald

  // 3. Deterministic hash theo tên
  const colorsList = [
    PRODUCT_COLORS.blue,
    PRODUCT_COLORS.emerald,
    PRODUCT_COLORS.purple,
    PRODUCT_COLORS.amber,
    PRODUCT_COLORS.cyan,
    PRODUCT_COLORS.violet,
    PRODUCT_COLORS.rose,
    PRODUCT_COLORS.teal,
  ]
  let hash = 0
  for (let i = 0; i < rawName.length; i++) {
    hash = (hash << 5) - hash + rawName.charCodeAt(i)
    hash |= 0
  }
  return colorsList[Math.abs(hash) % colorsList.length]
}

/**
 * Đọc cấu hình Squad từ localStorage để lấy màu sắc đã lưu trong phần Quản lý (Setting)
 */
export function getSquadColorDef(squadName?: string, productName?: string): ProductColorDef {
  const rawSq = (squadName || "").trim()
  if (!rawSq || rawSq === "Chưa phân squad" || rawSq === "Chưa phân công") {
    return PRODUCT_COLORS.slate
  }

  // 1. Tìm trong danh sách Squads đã lưu trong Setting
  try {
    const savedSquads = localStorage.getItem("mbbank_admin_squads") || localStorage.getItem("ux_portal_squads_v2")
    if (savedSquads) {
      const parsed = JSON.parse(savedSquads)
      if (Array.isArray(parsed)) {
        const sqLower = rawSq.toLowerCase()
        const matched = parsed.find((s: any) => {
          const sName = String(s.name || s.squad_name || "").trim().toLowerCase()
          return sName === sqLower
        }) || parsed.find((s: any) => {
          const sName = String(s.name || s.squad_name || "").trim().toLowerCase()
          return sName && (sName.includes(sqLower) || sqLower.includes(sName))
        })

        if (matched) {
          // Nếu squad có màu riêng được cấu hình
          if (matched.color) {
            const resolved = resolveColorKey(matched.color)
            if (resolved) return resolved
          }
          // Nếu không có màu riêng, kế thừa màu từ Sản phẩm trực thuộc
          if (matched.productName || matched.product_name) {
            return getProductColorDef(matched.productName || matched.product_name)
          }
        }
      }
    }
  } catch {}

  // 2. Nếu có productName kèm theo, lấy màu theo sản phẩm đó
  if (productName && productName.trim()) {
    return getProductColorDef(productName)
  }

  // 3. Fallback heuristic theo từ khóa
  const name = rawSq.toLowerCase()
  if (name.includes("saving") || name.includes("tiết kiệm")) return PRODUCT_COLORS.emerald
  if (name.includes("cards") || name.includes("thẻ")) return PRODUCT_COLORS.purple
  if (name.includes("lending") || name.includes("vay")) return PRODUCT_COLORS.blue
  if (name.includes("core") || name.includes("tài khoản")) return PRODUCT_COLORS.indigo
  if (name.includes("wealth") || name.includes("đầu tư") || name.includes("trái phiếu") || name.includes("chứng chỉ") || name.includes("beerich") || name.includes("gold")) return PRODUCT_COLORS.amber
  if (name.includes("transfer") || name.includes("chuyển tiền")) return PRODUCT_COLORS.sky
  if (name.includes("gateway") || name.includes("baas") || name.includes("api")) return PRODUCT_COLORS.cyan
  if (name.includes("partner") || name.includes("tích hợp")) return PRODUCT_COLORS.teal
  if (name.includes("payroll") || name.includes("lương")) return PRODUCT_COLORS.violet
  if (name.includes("design") || name.includes("nền tảng") || name.includes("ux")) return PRODUCT_COLORS.slate

  // 4. Deterministic hash theo tên squad
  const colorsList = [
    PRODUCT_COLORS.emerald,
    PRODUCT_COLORS.purple,
    PRODUCT_COLORS.blue,
    PRODUCT_COLORS.amber,
    PRODUCT_COLORS.cyan,
    PRODUCT_COLORS.violet,
    PRODUCT_COLORS.rose,
    PRODUCT_COLORS.teal,
    PRODUCT_COLORS.sky,
  ]
  let hash = 0
  for (let i = 0; i < rawSq.length; i++) {
    hash = (hash << 5) - hash + rawSq.charCodeAt(i)
    hash |= 0
  }
  return colorsList[Math.abs(hash) % colorsList.length]
}
