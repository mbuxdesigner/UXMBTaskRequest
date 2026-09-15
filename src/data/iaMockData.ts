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
