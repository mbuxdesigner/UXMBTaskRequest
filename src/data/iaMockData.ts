import { IANode, IAProductInfo } from "@/types/ia"

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
          return activeList.map((p: any) => {
            const id = p.id || `prod-${p.code || p.name}`
            const name = p.name
            const code = p.code || p.name.toUpperCase().replace(/\s+/g, "_")
            const description = p.description || `Sản phẩm số MBBank: ${name}`
            const color = p.color || "blue"
            const iconName = getProductIconName(name, code)
            return {
              id,
              name,
              code,
              description,
              color,
              iconName,
            }
          })
        }
      }
    }
  } catch (err) {
    console.warn("Error loading admin products for IA:", err)
  }
  return IA_PRODUCTS
}

/**
 * Đọc danh mục Squads động từ Quản trị hệ thống
 */
export function getAdminSquadsList(): string[] {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw =
        window.localStorage.getItem("mbbank_admin_squads") ||
        window.localStorage.getItem("ux_portal_squads_v2")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const names = parsed.map((s: any) => s.name).filter(Boolean)
          if (names.length > 0) {
            return Array.from(new Set([...names, ...STANDARD_SQUADS]))
          }
        }
      }
    } catch {}
  }
  return STANDARD_SQUADS
}

/**
 * Danh sách các Squads chuẩn trong hệ thống UXMB
 */
export const STANDARD_SQUADS: string[] = [
  "Lending & Vay vốn",
  "Cards & Thanh toán số",
  "Transfer & Payment",
  "eSaving & Tiết kiệm",
  "Core Banking & Tài khoản",
  "Digital Wealth & Đầu tư",
  "BaaS & Open API",
  "Biz Lending",
  "Payroll & Quản lý lương",
  "Design System MB",
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
