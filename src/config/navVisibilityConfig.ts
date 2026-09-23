import { UserRole } from "../data/mockData"

export interface RoleNavVisibility {
  overview: boolean
  track: boolean
  calendar: boolean
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
    create: true,
    test: true,
    compressor: false,
    manage: false,
    invite: false,
    ia: true,
  },
}

export function getRoleNavConfig(): RoleNavConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NAV_VISIBILITY)
    if (!raw) return DEFAULT_ROLE_NAV_CONFIG
    const parsed = JSON.parse(raw)
    const resolveRole = (role: UserRole) => {
      const defaults = DEFAULT_ROLE_NAV_CONFIG[role] || DEFAULT_ROLE_NAV_CONFIG.Designer
      const roleData = parsed[role] || {}
      return {
        ...defaults,
        ...roleData,
        overview: roleData.overview !== undefined ? roleData.overview : defaults.overview,
        track: roleData.track !== undefined ? roleData.track : defaults.track,
        calendar: roleData.calendar !== undefined ? roleData.calendar : defaults.calendar,
        create: roleData.create !== undefined ? roleData.create : defaults.create,
        test: role === "Admin" ? (roleData.test ?? true) : (roleData.test !== undefined ? roleData.test : defaults.test),
        compressor: role === "Admin" ? (roleData.compressor ?? true) : (roleData.compressor !== undefined ? roleData.compressor : defaults.compressor),
        invite: roleData.invite !== undefined ? roleData.invite : defaults.invite,
        manage: role === "Admin" ? (parsed.Admin?.manage ?? true) : false,
        ia: roleData.ia !== undefined ? roleData.ia : defaults.ia,
      }
    }

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

export type PlatformNavItemKey = "overview" | "track" | "calendar" | "create" | "ia"
export type ResourceNavItemKey = "compressor" | "test" | "manage" | "invite"
export type NavItemKey = PlatformNavItemKey | ResourceNavItemKey

export interface NavOrderConfig {
  platform: PlatformNavItemKey[]
  resources: ResourceNavItemKey[]
}

export const DEFAULT_NAV_ORDER: NavOrderConfig = {
  platform: ["overview", "track", "calendar", "create", "ia"],
  resources: ["compressor", "test", "manage", "invite"],
}

export const STORAGE_KEY_NAV_ORDER = "ux_portal_nav_order"

export function getNavOrderConfig(): NavOrderConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NAV_ORDER)
    if (!raw) return DEFAULT_NAV_ORDER
    const parsed = JSON.parse(raw)
    let platform = Array.isArray(parsed.platform) && parsed.platform.length > 0 ? [...parsed.platform] : [...DEFAULT_NAV_ORDER.platform]
    if (!platform.includes("calendar")) {
      const trackIdx = platform.indexOf("track")
      if (trackIdx !== -1) {
        platform.splice(trackIdx + 1, 0, "calendar")
      } else {
        platform.push("calendar")
      }
    }
    if (!platform.includes("ia")) {
      platform.push("ia")
    }
    let resources = Array.isArray(parsed.resources) && parsed.resources.length > 0 ? [...parsed.resources] : [...DEFAULT_NAV_ORDER.resources]
    if (!resources.includes("compressor")) {
      resources.unshift("compressor")
    }
    if (!resources.includes("test")) {
      const compIdx = resources.indexOf("compressor")
      if (compIdx !== -1) {
        resources.splice(compIdx + 1, 0, "test")
      } else {
        resources.unshift("test")
      }
    }
    if (!resources.includes("manage")) {
      resources.push("manage")
    }
    if (!resources.includes("invite")) {
      resources.push("invite")
    }
    return {
      platform,
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
