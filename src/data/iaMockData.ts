import { IANode, IAProductInfo } from "@/types/ia"
export type { IAProductInfo } from "@/types/ia"

/**
 * Danh mục 4 sản phẩm số trọng điểm của MBBank
 */
export const IA_PRODUCTS: IAProductInfo[] = [
  {
    id: "app-mbbank",
    name: "App MBBank",
    code: "APP_MB",
    description: "Ứng dụng Ngân hàng số Khách hàng Cá nhân",
    color: "blue",
    iconName: "Smartphone",
  },
  {
    id: "biz-mb",
    name: "Biz MB",
    code: "BIZ_MB",
    description: "Nền tảng Ngân hàng số Khách hàng Doanh nghiệp SME & Corp",
    color: "emerald",
    iconName: "Building2",
  },
  {
    id: "web-portal",
    name: "Web Portal",
    code: "WEB_PORTAL",
    description: "Cổng Thông tin & Internet Banking Bán lẻ",
    color: "purple",
    iconName: "Globe",
  },
  {
    id: "baas",
    name: "BaaS Open API",
    code: "BAAS",
    description: "Hạ tầng Ngân hàng Nhúng & Đối tác Sinh thái API",
    color: "amber",
    iconName: "Cpu",
  },
]

/**
 * Tự động nhận diện biểu tượng icon phù hợp cho sản phẩm
 */
export function getProductIconName(name: string, code?: string): string {
  const lower = `${name || ""} ${code || ""}`.toLowerCase()
  if (lower.includes("app") || lower.includes("mobile") || lower.includes("ios") || lower.includes("android")) {
    return "Smartphone"
  }
  if (
    lower.includes("biz") ||
    lower.includes("enterprise") ||
    lower.includes("corp") ||
    lower.includes("doanh nghiệp") ||
    lower.includes("sme")
  ) {
    return "Building2"
  }
  if (lower.includes("web") || lower.includes("portal") || lower.includes("internet")) {
    return "Globe"
  }
  if (lower.includes("baas") || lower.includes("api") || lower.includes("hạ tầng") || lower.includes("core")) {
    return "Cpu"
  }
  return "Layers"
}

/**
 * Khởi tạo Tier 1 Clean Root Node chuẩn cho sản phẩm bất kỳ
 */
export function createCleanRootNodeForProduct(prod: IAProductInfo): IANode {
  return {
    id: `node-${prod.id}-root`,
    tier: 1,
    name: prod.name,
    code: prod.code || prod.name.toUpperCase().replace(/\s+/g, "_"),
    description: prod.description || `Kiến trúc Thông tin ${prod.name}`,
    parentId: null,
    colorTheme: prod.color || "blue",
    collapsed: false,
    children: [],
  }
}

/**
 * Đọc danh mục Sản phẩm động từ Quản trị hệ thống (mbbank_admin_products)
 */
export function getAdminIAProducts(): IAProductInfo[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return IA_PRODUCTS
  }
  try {
    const raw =
      window.localStorage.getItem("mbbank_admin_products") ||
      window.localStorage.getItem("ux_portal_products_v2")
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const activeList = parsed.filter((p: any) => p && p.status !== "Inactive" && p.name)
        if (activeList.length > 0) {
          const seenIds = new Set<string>()
          const prods: IAProductInfo[] = []
          for (const p of activeList) {
            const rawId = (p.id && String(p.id).trim()) || `prod-${p.code || p.name || ""}`.toLowerCase().replace(/[^a-z0-9_-]/g, "-")
            const id = rawId || `prod-${Math.random().toString(36).slice(2, 6)}`
            if (seenIds.has(id)) continue
            seenIds.add(id)
            const name = p.name
            const code = p.code || p.name.toUpperCase().replace(/\s+/g, "_")
            const description = p.description || `Sản phẩm số MBBank: ${name}`
            const color = p.color || "blue"
            const iconName = getProductIconName(name, code)
            prods.push({
              id,
              name,
              code,
              description,
              color,
              iconName,
            })
          }
          if (prods.length > 0) return prods
        }
      }
    }
  } catch (err) {
    console.warn("Error loading admin products for IA:", err)
  }
  return IA_PRODUCTS
}

/**
 * Danh sách các Squads chuẩn theo từng Sản phẩm trọng điểm MBBank (khớp 100% với QuanLyPage)
 */
export const DEFAULT_PRODUCT_SQUADS: Record<string, string[]> = {
  APP_MB: [
    "Lending",
    "eSaving",
    "Core",
    "Card",
    "Onboarding",
    "Base",
    "Upsale",
    "Partnership",
    "Billing",
    "CSOP",
    "Junior",
    "VietQR",
    "Sub",
  ],
  DIGI_INVEST: [
    "TransferD",
    "Gold",
    "Trái phiếu",
    "Chứng chỉ quỹ",
    "BeeRich",
  ],
  BACKOFFICE: [
    "Visual",
    "Designe system",
    "Nội bộ",
    "AI",
  ],
  BAAS: [
    "BaaS",
  ],
  BIZ_MB: [
    "Biz Core",
    "Biz Payment",
    "Biz Lending",
    "Biz FX",
    "Biz Card",
  ],
}

/**
 * Kiểm tra xem một Squad từ Quản trị hệ thống có thuộc về Sản phẩm đang xét hay không
 */
export function isSquadMatchingProduct(
  squadItem: any,
  productInfoOrName?: IAProductInfo | string | null
): boolean {
  if (!squadItem || !productInfoOrName) return true

  const pName = (
    typeof productInfoOrName === "string"
      ? productInfoOrName
      : productInfoOrName.name || ""
  ).toLowerCase().trim()

  const pCode = (
    typeof productInfoOrName === "string"
      ? productInfoOrName
      : productInfoOrName.code || ""
  ).toUpperCase().trim()

  const pId = (
    typeof productInfoOrName === "string"
      ? productInfoOrName
      : productInfoOrName.id || ""
  ).toLowerCase().trim()

  // 1. Khớp theo ID sản phẩm trực tiếp
  const sProdId = (squadItem.productId || squadItem.product_id || "").toLowerCase().trim()
  if (sProdId && pId && sProdId === pId) return true

  // 2. Khớp thông minh theo tên / mã sản phẩm MBBank
  const sProdName = (
    squadItem.productName ||
    squadItem.product ||
    squadItem.product_name ||
    ""
  ).toLowerCase().trim()

  // App MBBank
  if (
    pName.includes("app mb") ||
    pCode === "APP_MB" ||
    pId === "app-mbbank" ||
    pId === "prod-1"
  ) {
    if (
      sProdName.includes("app mb") ||
      sProdId === "prod-1" ||
      sProdId === "app-mbbank" ||
      squadItem.code === "APP_MB"
    ) {
      return true
    }
  }

  // Digi invest
  if (pName.includes("digi") || pCode === "DIGI_INVEST" || pId === "prod-3") {
    if (sProdName.includes("digi") || sProdId === "prod-3") return true
  }

  // Backoffice
  if (
    pName.includes("backoffice") ||
    pName.includes("design system") ||
    pCode === "BACKOFFICE" ||
    pId === "prod-4"
  ) {
    if (
      sProdName.includes("backoffice") ||
      sProdName.includes("design system") ||
      sProdId === "prod-4"
    ) {
      return true
    }
  }

  // BaaS
  if (pName.includes("baas") || pCode === "BAAS" || pId === "baas" || pId === "prod-1788765119809") {
    if (sProdName.includes("baas") || sProdId === "prod-1788765119809" || sProdId === "baas") return true
  }

  // Biz MB
  if (pName.includes("biz") || pCode === "BIZ_MB" || pId === "biz-mb") {
    if (sProdName.includes("biz") || sProdId === "biz-mb") return true
  }

  // CRM
  if (pName.includes("crm") || pCode === "CRM" || pId === "prod-1788708686958") {
    if (sProdName.includes("crm") || sProdId === "prod-1788708686958") return true
  }

  // Khớp theo chuỗi tên chính xác hoặc bao hàm
  if (sProdName && pName && (sProdName === pName || sProdName.includes(pName) || pName.includes(sProdName))) {
    return true
  }

  // Mảng products nếu squad phụ trách nhiều sản phẩm
  if (Array.isArray(squadItem.products)) {
    if (squadItem.products.some((p: any) => {
      const pStr = String(p || "").toLowerCase().trim()
      return pStr === pName || (pName && pStr.includes(pName)) || (pStr && pName.includes(pStr))
    })) {
      return true
    }
  }

  return false
}

/**
 * Đọc danh mục Squads theo Sản phẩm từ Quản trị hệ thống
 */
export function getAdminSquadsForProduct(product?: IAProductInfo | string | null): string[] {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw =
        window.localStorage.getItem("ux_portal_squads_v2") ||
        window.localStorage.getItem("mbbank_admin_squads")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const matchedSquads = parsed
            .filter((s: any) => isSquadMatchingProduct(s, product))
            .map((s: any) => (typeof s === "string" ? s : s?.name))
            .filter((n: any) => Boolean(n && typeof n === "string" && n.trim()))
            .map((n: string) => n.trim())

          if (matchedSquads.length > 0) {
            return Array.from(new Set(matchedSquads))
          }
        }
      }
    } catch {}
  }

  // Fallback nếu LocalStorage chưa có dữ liệu hoặc không có squad nào khớp
  if (!product) {
    return DEFAULT_PRODUCT_SQUADS.APP_MB
  }

  const pName = (typeof product === "string" ? product : product.name || "").toLowerCase()
  const pCode = (typeof product === "string" ? product : product.code || "").toUpperCase()
  const pId = (typeof product === "string" ? product : product.id || "").toLowerCase()

  if (pName.includes("app mb") || pCode === "APP_MB" || pId === "app-mbbank" || pId === "prod-1") {
    return DEFAULT_PRODUCT_SQUADS.APP_MB
  }
  if (pName.includes("digi") || pCode === "DIGI_INVEST" || pId === "prod-3") {
    return DEFAULT_PRODUCT_SQUADS.DIGI_INVEST
  }
  if (pName.includes("backoffice") || pName.includes("design system") || pCode === "BACKOFFICE" || pId === "prod-4") {
    return DEFAULT_PRODUCT_SQUADS.BACKOFFICE
  }
  if (pName.includes("baas") || pCode === "BAAS" || pId === "baas" || pId === "prod-1788765119809") {
    return DEFAULT_PRODUCT_SQUADS.BAAS
  }
  if (pName.includes("biz") || pCode === "BIZ_MB" || pId === "biz-mb") {
    return DEFAULT_PRODUCT_SQUADS.BIZ_MB
  }

  return DEFAULT_PRODUCT_SQUADS.APP_MB
}

/**
 * Đọc danh mục Squads động từ Quản trị hệ thống (hỗ trợ lọc theo sản phẩm hoặc lấy toàn bộ)
 */
export function getAdminSquadsList(product?: IAProductInfo | string | null): string[] {
  if (product) {
    return getAdminSquadsForProduct(product)
  }
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw =
        window.localStorage.getItem("ux_portal_squads_v2") ||
        window.localStorage.getItem("mbbank_admin_squads")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const names = parsed
            .map((s: any) => (typeof s === "string" ? s : s?.name))
            .filter((n: any) => Boolean(n && typeof n === "string" && n.trim()))
            .map((n: string) => n.trim())
          if (names.length > 0) {
            return Array.from(new Set(names))
          }
        }
      }
    } catch {}
  }
  return STANDARD_SQUADS
}

/**
 * Danh sách các Squads chuẩn thực tế trong hệ thống UXMB (QuanLyPage)
 */
export const STANDARD_SQUADS: string[] = [
  "Onboarding",
  "Base",
  "Upsale",
  "Partnership",
  "Billing",
  "CSOP",
  "Junior",
  "VietQR",
  "Sub",
  "Gold",
  "Lending",
  "eSaving",
  "Core",
  "Card",
  "TransferD",
  "Trái phiếu",
  "Chứng chỉ quỹ",
  "BeeRich",
  "Visual",
  "Design System MB",
  "Nội bộ",
  "AI",
  "BaaS",
]

// ---------------------------------------------------------------------------
// CẤU TRÚC GỐC SẠCH CHO 4 SẢN PHẨM (Clean Root Nodes - Người dùng tự tạo node)
// ---------------------------------------------------------------------------

export const APP_MBBANK_TREE: IANode = {
  id: "node-app-mb-root",
  tier: 1,
  name: "App MBBank",
  code: "APP_MB",
  description: "Kiến trúc Thông tin Tổng thể Ngân hàng số Cá nhân MBBank",
  parentId: null,
  colorTheme: "blue",
  collapsed: false,
  children: [],
}

export const BIZ_MB_TREE: IANode = {
  id: "node-biz-mb-root",
  tier: 1,
  name: "Biz MB",
  code: "BIZ_MB",
  description: "Nền tảng Ngân hàng số Khách hàng Doanh nghiệp SME & Corp",
  parentId: null,
  colorTheme: "emerald",
  collapsed: false,
  children: [],
}

export const WEB_PORTAL_TREE: IANode = {
  id: "node-web-portal-root",
  tier: 1,
  name: "Web Portal",
  code: "WEB_PORTAL",
  description: "Cổng Thông tin & Internet Banking Bán lẻ",
  parentId: null,
  colorTheme: "purple",
  collapsed: false,
  children: [],
}

export const BAAS_OPEN_API_TREE: IANode = {
  id: "node-baas-root",
  tier: 1,
  name: "BaaS Open API",
  code: "BAAS",
  description: "Hạ tầng Ngân hàng Nhúng & Đối tác Sinh thái API",
  parentId: null,
  colorTheme: "amber",
  collapsed: false,
  children: [],
}

/**
 * Bản đồ toàn bộ cây dữ liệu IA mặc định theo từng sản phẩm
 */
export const DEFAULT_IA_TREES: Record<string, IANode> = {
  "app-mbbank": APP_MBBANK_TREE,
  "biz-mb": BIZ_MB_TREE,
  "web-portal": WEB_PORTAL_TREE,
  baas: BAAS_OPEN_API_TREE,
}

// ---------------------------------------------------------------------------
// HELPER UTILITIES: Đếm tính năng, màn hình và tìm kiếm node
// ---------------------------------------------------------------------------

/**
 * Đếm tổng số luồng tính năng (Tier 3) trong cây IA
 */
export function countProductFeatures(tree: IANode | null | undefined): number {
  if (!tree) return 0
  let count = tree.tier === 3 ? 1 : 0
  if (tree.children && tree.children.length > 0) {
    for (const child of tree.children) {
      count += countProductFeatures(child)
    }
  }
  return count
}

/**
 * Đếm tổng số màn hình & điểm chạm (Tier 4) trong cây IA
 */
export function countProductScreens(tree: IANode | null | undefined): number {
  if (!tree) return 0
  let count = tree.tier === 4 ? 1 : 0
  if (tree.children && tree.children.length > 0) {
    for (const child of tree.children) {
      count += countProductScreens(child)
    }
  }
  return count
}

/**
 * Lấy bộ chỉ số [X luồng tính năng · Y màn hình] của cây sản phẩm
 */
export function getProductMetrics(tree: IANode | null | undefined): {
  featureCount: number
  screenCount: number
} {
  return {
    featureCount: countProductFeatures(tree),
    screenCount: countProductScreens(tree),
  }
}

/**
 * Tìm kiếm node theo ID trong cây phân cấp
 */
export function findNodeById(root: IANode | null | undefined, id: string): IANode | null {
  if (!root) return null
  if (root.id === id) return root
  if (root.children && root.children.length > 0) {
    for (const child of root.children) {
      const found = findNodeById(child, id)
      if (found) return found
    }
  }
  return null
}
