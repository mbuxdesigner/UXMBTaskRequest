import { UserRole } from "../data/mockData"

export interface RoleNavVisibility {
  overview: boolean
  track: boolean
  create: boolean
  test: boolean
  compressor: boolean
  manage: boolean
  invite: boolean
}

export type RoleNavConfig = Record<UserRole, RoleNavVisibility>

export const STORAGE_KEY_NAV_VISIBILITY = "ux_portal_nav_visibility"

export const DEFAULT_ROLE_NAV_CONFIG: RoleNavConfig = {
  Admin: {
    overview: true,
    track: true,
    create: true,
    test: true,
    compressor: true,
    manage: true,
    invite: true,
  },
  "Design Owner": {
    overview: true,
    track: true,
    create: true,
    test: true,
    compressor: true,
    manage: false,
    invite: true,
  },
  Designer: {
    overview: true,
    track: true,
    create: true,
    test: true,
    compressor: true,
    manage: false,
    invite: false,
  },
  PO: {
    overview: false,
    track: true,
    create: true,
    test: false,
    compressor: false,
    manage: false,
    invite: false,
  },
  Business: {
    overview: false,
    track: true,
    create: true,
    test: false,
    compressor: false,
    manage: false,
    invite: false,
  },
}

export function getRoleNavConfig(): RoleNavConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NAV_VISIBILITY)
    if (!raw) return DEFAULT_ROLE_NAV_CONFIG
    const parsed = JSON.parse(raw)
    const resolveRole = (role: UserRole) => ({
      ...DEFAULT_ROLE_NAV_CONFIG[role],
      ...(parsed[role] || {}),
      invite: parsed[role]?.invite !== undefined ? parsed[role].invite : DEFAULT_ROLE_NAV_CONFIG[role].invite,
      manage: role === "Admin" ? (parsed.Admin?.manage ?? true) : false,
    })

    return {
      Admin: resolveRole("Admin"),
      "Design Owner": resolveRole("Design Owner"),
      Designer: resolveRole("Designer"),
      PO: resolveRole("PO"),
      Business: resolveRole("Business"),
    }
  } catch {
    return DEFAULT_ROLE_NAV_CONFIG
  }
}

export type PlatformNavItemKey = "overview" | "track" | "create"
export type ResourceNavItemKey = "compressor" | "test" | "manage" | "invite"
export type NavItemKey = PlatformNavItemKey | ResourceNavItemKey

export interface NavOrderConfig {
  platform: PlatformNavItemKey[]
  resources: ResourceNavItemKey[]
}

export const DEFAULT_NAV_ORDER: NavOrderConfig = {
  platform: ["overview", "track", "create"],
  resources: ["compressor", "test", "manage", "invite"],
}

export const STORAGE_KEY_NAV_ORDER = "ux_portal_nav_order"

export function getNavOrderConfig(): NavOrderConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NAV_ORDER)
    if (!raw) return DEFAULT_NAV_ORDER
    const parsed = JSON.parse(raw)
    let resources = Array.isArray(parsed.resources) && parsed.resources.length > 0 ? [...parsed.resources] : [...DEFAULT_NAV_ORDER.resources]
    if (!resources.includes("invite")) {
      resources.push("invite")
    }
    if (!resources.includes("manage")) {
      resources.push("manage")
    }
    return {
      platform: Array.isArray(parsed.platform) && parsed.platform.length > 0 ? parsed.platform : DEFAULT_NAV_ORDER.platform,
      resources,
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
