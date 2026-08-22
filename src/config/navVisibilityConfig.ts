import { UserRole } from "../data/mockData"

export interface RoleNavVisibility {
  overview: boolean
  track: boolean
  create: boolean
  compressor: boolean
  manage: boolean
}

export type RoleNavConfig = Record<UserRole, RoleNavVisibility>

export const STORAGE_KEY_NAV_VISIBILITY = "ux_portal_nav_visibility"

export const DEFAULT_ROLE_NAV_CONFIG: RoleNavConfig = {
  Admin: {
    overview: true,
    track: true,
    create: true,
    compressor: true,
    manage: true,
  },
  "Design Owner": {
    overview: true,
    track: true,
    create: true,
    compressor: true,
    manage: true,
  },
  Designer: {
    overview: true,
    track: true,
    create: true,
    compressor: true,
    manage: false,
  },
  PO: {
    overview: true,
    track: true,
    create: true,
    compressor: true,
    manage: false,
  },
}

export function getRoleNavConfig(): RoleNavConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NAV_VISIBILITY)
    if (!raw) return DEFAULT_ROLE_NAV_CONFIG
    const parsed = JSON.parse(raw)
    return {
      Admin: { ...DEFAULT_ROLE_NAV_CONFIG.Admin, ...parsed.Admin },
      "Design Owner": { ...DEFAULT_ROLE_NAV_CONFIG["Design Owner"], ...parsed["Design Owner"] },
      Designer: { ...DEFAULT_ROLE_NAV_CONFIG.Designer, ...parsed.Designer },
      PO: { ...DEFAULT_ROLE_NAV_CONFIG.PO, ...parsed.PO },
    }
  } catch {
    return DEFAULT_ROLE_NAV_CONFIG
  }
}

export type PlatformNavItemKey = "overview" | "track" | "create"
export type ResourceNavItemKey = "compressor" | "manage"
export type NavItemKey = PlatformNavItemKey | ResourceNavItemKey

export interface NavOrderConfig {
  platform: PlatformNavItemKey[]
  resources: ResourceNavItemKey[]
}

export const DEFAULT_NAV_ORDER: NavOrderConfig = {
  platform: ["overview", "track", "create"],
  resources: ["compressor", "manage"],
}

export const STORAGE_KEY_NAV_ORDER = "ux_portal_nav_order"

export function getNavOrderConfig(): NavOrderConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NAV_ORDER)
    if (!raw) return DEFAULT_NAV_ORDER
    const parsed = JSON.parse(raw)
    return {
      platform: Array.isArray(parsed.platform) && parsed.platform.length > 0 ? parsed.platform : DEFAULT_NAV_ORDER.platform,
      resources: Array.isArray(parsed.resources) && parsed.resources.length > 0 ? parsed.resources : DEFAULT_NAV_ORDER.resources,
    }
  } catch {
    return DEFAULT_NAV_ORDER
  }
}

export function saveNavOrderConfig(order: NavOrderConfig) {
  try {
    localStorage.setItem(STORAGE_KEY_NAV_ORDER, JSON.stringify(order))
    window.dispatchEvent(new Event("nav_visibility_changed"))
  } catch (err) {
    console.error("Failed to save nav order config:", err)
  }
}

export function saveRoleNavConfig(config: RoleNavConfig) {
  try {
    localStorage.setItem(STORAGE_KEY_NAV_VISIBILITY, JSON.stringify(config))
    // Phát event đồng bộ Realtime cho Sidebar Navigation trên toàn App
    window.dispatchEvent(new Event("nav_visibility_changed"))
  } catch (err) {
    console.error("Failed to save role nav config:", err)
  }
}
