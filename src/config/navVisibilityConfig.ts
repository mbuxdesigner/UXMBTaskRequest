import { UserRole } from "../data/mockData"

export interface RoleNavVisibility {
  overview: boolean
  track: boolean
  calendar: boolean
  aichat?: boolean
  create: boolean
  test: boolean
  compressor: boolean
  manage: boolean
  invite: boolean
  ia: boolean
}

export type RoleNavConfig = Record<UserRole, RoleNavVisibility>

export const STORAGE_KEY_NAV_VISIBILITY = "ux_portal_nav_visibility"

export const DEFAULT_ROLE_NAV_CONFIG: RoleNavConfig = {
  Admin: {
    overview: true,
    track: true,
    calendar: true,
    aichat: true,
    create: true,
    test: true,
    compressor: true,
    manage: true,
    invite: true,
    ia: true,
  },
  "Design Owner": {
    overview: true,
    track: true,
    calendar: true,
    aichat: true,
    create: true,
    test: true,
    compressor: true,
    manage: false,
    invite: true,
    ia: true,
  },
  Designer: {
    overview: true,
    track: true,
    calendar: true,
    aichat: true,
    create: true,
    test: true,
    compressor: true,
    manage: false,
    invite: false,
    ia: true,
  },
  PO: {
    overview: true,
    track: true,
    calendar: true,
    aichat: true,
    create: true,
    test: true,
    compressor: false,
    manage: false,
    invite: false,
    ia: true,
  },
  Business: {
    overview: true,
    track: true,
    calendar: true,
    aichat: true,
    create: true,
    test: true,
    compressor: false,
    manage: false,
    invite: false,
    ia: true,
  },
}

export function normalizeRoleNavConfig(raw: any): RoleNavConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_ROLE_NAV_CONFIG
  const roles: UserRole[] = ["Admin", "Design Owner", "Designer", "PO", "Business"]
  const result: RoleNavConfig = { ...DEFAULT_ROLE_NAV_CONFIG }

  for (const role of roles) {
    const defaults = DEFAULT_ROLE_NAV_CONFIG[role] || DEFAULT_ROLE_NAV_CONFIG.Designer
    const roleData = raw[role] || {}
    result[role] = {
      ...defaults,
      ...roleData,
      overview: roleData.overview !== undefined ? roleData.overview : defaults.overview,
      track: roleData.track !== undefined ? roleData.track : defaults.track,
      calendar: roleData.calendar !== undefined ? roleData.calendar : defaults.calendar,
      aichat: roleData.aichat !== undefined ? roleData.aichat : defaults.aichat,
      create: roleData.create !== undefined ? roleData.create : defaults.create,
      test: role === "Admin" ? (roleData.test ?? true) : (roleData.test !== undefined ? roleData.test : defaults.test),
      compressor: role === "Admin" ? (roleData.compressor ?? true) : (roleData.compressor !== undefined ? roleData.compressor : defaults.compressor),
      invite: roleData.invite !== undefined ? roleData.invite : defaults.invite,
      manage: role === "Admin" ? (raw.Admin?.manage ?? true) : false,
      ia: roleData.ia !== undefined ? roleData.ia : defaults.ia,
    }
  }

  return result
}

export function getRoleNavConfig(): RoleNavConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NAV_VISIBILITY)
    if (!raw) return DEFAULT_ROLE_NAV_CONFIG
    const parsed = JSON.parse(raw)
    const normalized = normalizeRoleNavConfig(parsed)
    if (JSON.stringify(normalized) !== raw) {
      try {
        localStorage.setItem(STORAGE_KEY_NAV_VISIBILITY, JSON.stringify(normalized))
      } catch {}
    }
    return normalized
  } catch {
    return DEFAULT_ROLE_NAV_CONFIG
  }
}

export type PlatformNavItemKey = "overview" | "track" | "calendar" | "aichat" | "create" | "ia"
export type ResourceNavItemKey = "compressor" | "test" | "manage" | "invite"
export type NavItemKey = PlatformNavItemKey | ResourceNavItemKey

export interface NavOrderConfig {
  platform: PlatformNavItemKey[]
  resources: ResourceNavItemKey[]
}

export const DEFAULT_NAV_ORDER: NavOrderConfig = {
  platform: ["calendar", "overview", "track", "aichat", "create", "ia"],
  resources: ["compressor", "test", "manage", "invite"],
}

export const STORAGE_KEY_NAV_ORDER = "ux_portal_nav_order"

export function normalizeNavOrderConfig(order: any): NavOrderConfig {
  if (!order || typeof order !== "object") return DEFAULT_NAV_ORDER

  const validPlatformKeys: PlatformNavItemKey[] = ["calendar", "overview", "track", "aichat", "create", "ia"]
  let platform: PlatformNavItemKey[] = Array.isArray(order.platform) && order.platform.length > 0
    ? [...order.platform]
    : [...DEFAULT_NAV_ORDER.platform]

  // Loại bỏ các key không hợp lệ và trùng lặp
  platform = platform.filter((k, idx) => validPlatformKeys.includes(k) && platform.indexOf(k) === idx)

  // Bắt buộc phải có aichat (vị trí ngay sau calendar hoặc track)
  if (!platform.includes("aichat")) {
    const calIdx = platform.indexOf("calendar")
    const trackIdx = platform.indexOf("track")
    if (calIdx !== -1) {
      platform.splice(calIdx + 1, 0, "aichat")
    } else if (trackIdx !== -1) {
      platform.splice(trackIdx + 1, 0, "aichat")
    } else {
      platform.push("aichat")
    }
  }

  // Bắt buộc phải có đủ tất cả các platform keys
  for (const k of validPlatformKeys) {
    if (!platform.includes(k)) {
      platform.push(k)
    }
  }

  // Resources
  const validResourceKeys: ResourceNavItemKey[] = ["compressor", "test", "manage", "invite"]
  let resources: ResourceNavItemKey[] = Array.isArray(order.resources) && order.resources.length > 0
    ? [...order.resources]
    : [...DEFAULT_NAV_ORDER.resources]

  resources = resources.filter((k, idx) => validResourceKeys.includes(k) && resources.indexOf(k) === idx)
  for (const k of validResourceKeys) {
    if (!resources.includes(k)) {
      resources.push(k)
    }
  }

  return {
    platform,
    resources,
  }
}

export function getNavOrderConfig(): NavOrderConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NAV_ORDER)
    if (!raw) return DEFAULT_NAV_ORDER
    const parsed = JSON.parse(raw)
    const normalized = normalizeNavOrderConfig(parsed)
    if (JSON.stringify(normalized) !== raw) {
      try {
        localStorage.setItem(STORAGE_KEY_NAV_ORDER, JSON.stringify(normalized))
      } catch {}
    }
    return normalized
  } catch {
    return DEFAULT_NAV_ORDER
  }
}

export function saveNavOrderConfig(order: NavOrderConfig) {
  try {
    const normalized = normalizeNavOrderConfig(order)
    localStorage.setItem(STORAGE_KEY_NAV_ORDER, JSON.stringify(normalized))
    window.dispatchEvent(new Event("nav_visibility_changed"))
    return normalized
  } catch (err) {
    console.error("Failed to save nav order config:", err)
    return DEFAULT_NAV_ORDER
  }
}

export function saveRoleNavConfig(config: RoleNavConfig) {
  try {
    const normalized = normalizeRoleNavConfig(config)
    localStorage.setItem(STORAGE_KEY_NAV_VISIBILITY, JSON.stringify(normalized))
    // Phát event đồng bộ Realtime cho Sidebar Navigation trên toàn App
    window.dispatchEvent(new Event("nav_visibility_changed"))
    return normalized
  } catch (err) {
    console.error("Failed to save role nav config:", err)
    return DEFAULT_ROLE_NAV_CONFIG
  }
}
