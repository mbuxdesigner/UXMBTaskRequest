import { getGoogleSheetConfig } from "../config/googleSheetConfig"
import { UserRole } from "../data/mockData"
import {
  fetchRequestsFromSheet,
  fetchMasterDataFromSheet,
  fetchTeamMembersFromSheet,
  fetchSelectionsFromSheet,
} from "./googleSheetService"

export type SessionPolicyType = "fixed_8h" | "sliding_24h"
export type UserSessionPolicyOverride = "inherit" | "fixed_8h" | "sliding_24h"
export type RoleSessionPolicies = Record<UserRole, SessionPolicyType>

export const ROLE_SESSION_POLICIES_KEY = "mbbank_role_session_policies"
export const DEFAULT_ROLE_SESSION_POLICIES: RoleSessionPolicies = {
  Admin: "fixed_8h",
  "Design Owner": "sliding_24h",
  Designer: "sliding_24h",
  PO: "sliding_24h",
  Business: "sliding_24h",
}

export const SESSION_DURATION_HOURS = 8
export const SESSION_DURATION_SECONDS = SESSION_DURATION_HOURS * 3600 // 8 tiếng = 28,800s
export const SESSION_DURATION_SLIDING_HOURS = 24
export const SESSION_DURATION_SLIDING_SECONDS = SESSION_DURATION_SLIDING_HOURS * 3600 // 24 tiếng = 86,400s
export const INACTIVITY_LIMIT_24H_MS = SESSION_DURATION_SLIDING_HOURS * 3600 * 1000 // 86,400,000ms

export interface UserSession {
  sessionToken: string
  personalEmail: string
  teamsEmail: string
  displayName: string
  avatarUrl?: string
  role: UserRole
  squad?: string // Legacy single squad fallback
  squads?: string[] // Danh sách các Squads được phân công (1 Designer -> nhiều Squad, 1 PO -> nhiều Squad)
  products?: string[] // Danh sách các Sản phẩm phụ trách (1 PO -> nhiều Sản phẩm)
  expiresAt: number // Timestamp in ms
  sessionPolicy: SessionPolicyType // "fixed_8h" | "sliding_24h"
  loginAt: number // Timestamp in ms when authenticated
  lastActiveAt: number // Timestamp in ms of last user activity/app exit
  isImpersonating?: boolean
  originalRole?: UserRole
  originalDisplayName?: string
}

// Lưu trong sessionStorage & localStorage
export const SESSION_STORAGE_KEY = "ux_portal_session_auth"
export const ORIGINAL_SESSION_BACKUP_KEY = "ux_portal_admin_original_session"

export const DEMO_ACCOUNTS: Array<{
  name: string
  personalEmail: string
  teamsEmail: string
  displayName: string
  avatarUrl?: string
  role: UserRole
  squad?: string
  squads?: string[]
  products?: string[]
}> = [
  {
    name: "Admin Quản Trị",
    displayName: "Admin MB UX Team",
    personalEmail: "admin@gmail.com",
    teamsEmail: "admin@mbbank.com.vn",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    role: "Admin",
    squad: "All Squads",
    squads: ["Design System & Core", "Lending & Vay vốn", "Cards & Thanh toán số", "Core Banking & Tài khoản", "Digital Wealth & Đầu tư", "BaaS & Open API"],
    products: ["App MBBank", "Lending & Vay vốn", "Cards & Digital Payment", "Digital Wealth", "Private Banking & VIP", "SME Banking"],
  },
  {
    name: "Nguyễn Văn Cường",
    displayName: "Nguyễn Văn Cường",
    personalEmail: "lead.cuong@gmail.com",
    teamsEmail: "lead.cuong@mbbank.com.vn",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    role: "Design Owner",
    squad: "Daily Banking Squad",
    squads: ["Design System & Core", "Core Banking & Tài khoản", "Lending & Vay vốn"],
    products: ["App MBBank", "Core Banking & Tài khoản", "Design System MB"],
  },
  {
    name: "Lê Hoàng Nam",
    displayName: "Lê Hoàng Nam",
    personalEmail: "nam.designer@gmail.com",
    teamsEmail: "nam.designer@mbbank.com.vn",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    role: "Designer",
    squad: "Daily Banking Squad",
    squads: ["Lending & Vay vốn", "Cards & Thanh toán số", "BaaS & Open API"],
    products: ["Lending & Vay vốn", "Cards & Digital Payment"],
  },
  {
    name: "Trần Mai Lan",
    displayName: "Trần Mai Lan",
    personalEmail: "lan.po@gmail.com",
    teamsEmail: "lan.po@mbbank.com.vn",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    role: "PO",
    squad: "App/Core Product",
    squads: ["Lending & Vay vốn", "Cards & Thanh toán số"],
    products: ["Lending & Vay vốn", "Cards & Digital Payment"],
  },
  {
    name: "Phạm Hoàng Bách",
    displayName: "Phạm Hoàng Bách (Business)",
    personalEmail: "bach.biz@gmail.com",
    teamsEmail: "bachph@mbbank.com.vn",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    role: "Business",
    squad: "Lending & Vay vốn",
    squads: ["Lending & Vay vốn", "Cards & Thanh toán số"],
    products: ["Lending & Vay vốn", "Cards & Digital Payment"],
  },
]

/**
 * Trích xuất 1 chữ cái đầu của tên (Tên chính) để làm Avatar dự phòng
 */
export function getUserInitials(name?: string): string {
  if (!name || !name.trim()) return "U"
  const parts = name.trim().split(/\s+/)
  const mainName = parts[parts.length - 1]
  return (mainName[0] || parts[0][0] || "U").toUpperCase()
}

/**
 * Lấy cấu hình chính sách phiên theo vai trò (Role Session Policies)
 */
export function getRoleSessionPolicies(): RoleSessionPolicies {
  try {
    const raw = localStorage.getItem(ROLE_SESSION_POLICIES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return {
          ...DEFAULT_ROLE_SESSION_POLICIES,
          ...parsed,
        }
      }
    }
  } catch (e) {
    console.warn("Could not load role session policies:", e)
  }
  return { ...DEFAULT_ROLE_SESSION_POLICIES }
}

/**
 * Lưu cấu hình chính sách phiên theo vai trò vào localStorage
 */
export function saveRoleSessionPolicies(policies: RoleSessionPolicies): void {
  try {
    localStorage.setItem(ROLE_SESSION_POLICIES_KEY, JSON.stringify(policies))
    window.dispatchEvent(new CustomEvent("role_session_policies_changed", { detail: policies }))
    window.dispatchEvent(new Event("storage"))
  } catch (e) {
    console.warn("Could not save role session policies:", e)
  }
}

/**
 * Tra cứu chính sách phiên hiệu lực cho một người dùng:
 * Ưu tiên override cá nhân (nếu khác "inherit"), fallback về vai trò tương ứng trong RBAC
 */
export function resolveEffectiveSessionPolicy(
  email?: string,
  role?: UserRole,
  directOverride?: UserSessionPolicyOverride
): SessionPolicyType {
  if (directOverride && directOverride !== "inherit") {
    return directOverride
  }
  const targetRole = role || "Designer"
  if (email) {
    const clean = email.trim().toLowerCase()
    try {
      const rawMembers =
        localStorage.getItem("mbbank_admin_team") ||
        localStorage.getItem("mbbank_team_members")
      if (rawMembers) {
        const members: any[] = JSON.parse(rawMembers)
        if (Array.isArray(members)) {
          const found = members.find((m) => {
            const pEmail = (m.personalEmail || "").trim().toLowerCase()
            const tEmail = (m.teamsEmail || "").trim().toLowerCase()
            const mEmail = (m.email || "").trim().toLowerCase()
            return pEmail === clean || tEmail === clean || mEmail === clean
          })
          if (found && found.sessionPolicy && found.sessionPolicy !== "inherit") {
            return found.sessionPolicy as SessionPolicyType
          }
        }
      }
    } catch {}
  }
  const rolePolicies = getRoleSessionPolicies()
  return rolePolicies[targetRole] || "fixed_8h"
}

/**
 * Làm tươi mốc hoạt động gần nhất (Touch lastActiveAt) của phiên làm việc
 */
export function touchSessionActivity(forceSave = false): boolean {
  try {
    // localStorage là nguồn dữ liệu chuẩn (single source of truth) dùng chung giữa các tab
    let raw: string | null = null
    let isLocalStorageAccessible = true
    try {
      raw = localStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem("ux_portal_session")
    } catch {
      isLocalStorageAccessible = false
      try {
        raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
      } catch {}
    }

    if (!raw) {
      // Nếu localStorage trống nhưng sessionStorage còn dữ liệu -> phiên đã bị đăng xuất ở tab khác
      if (isLocalStorageAccessible) {
        try {
          sessionStorage.removeItem(SESSION_STORAGE_KEY)
          sessionStorage.removeItem(ORIGINAL_SESSION_BACKUP_KEY)
        } catch {}
      }
      return false
    }

    const session: UserSession = JSON.parse(raw)
    if (!session || typeof session !== "object" || !session.sessionToken) {
      clearSession()
      return false
    }

    const now = Date.now()
    const SKEW_THRESHOLD_MS = 15 * 60 * 1000 // 15 phút tối đa sai lệch đồng hồ tương lai

    // Bỏ qua ghi đĩa liên tục nếu không bắt buộc (forceSave) và mới ghi gần đây (< 5 giây)
    const prevLastActive = Number(session.lastActiveAt) || Number(session.loginAt) || 0
    if (!forceSave && prevLastActive > 0 && now - prevLastActive < 5000 && now >= prevLastActive) {
      return true
    }

    // Tự động kiểm tra và thích ứng theo chính sách phiên hiệu lực (RBAC hoặc User Override)
    const effectivePolicy = resolveEffectiveSessionPolicy(
      session.teamsEmail || session.personalEmail,
      session.role
    )
    if (session.sessionPolicy !== effectivePolicy) {
      session.sessionPolicy = effectivePolicy
    }

    if (session.sessionPolicy === "sliding_24h") {
      let lastActive = Number(session.lastActiveAt) || Number(session.loginAt) || now

      // Phát hiện lệch đồng hồ nghiêm trọng về quá khứ (lastActive nằm sâu trong tương lai)
      if (lastActive > now + SKEW_THRESHOLD_MS) {
        clearSession()
        return false
      }
      if (lastActive > now) {
        lastActive = now
      }

      if (now - lastActive > INACTIVITY_LIMIT_24H_MS) {
        clearSession()
        return false
      }
      session.lastActiveAt = now
      session.expiresAt = now + INACTIVITY_LIMIT_24H_MS
    } else {
      const loginAt = Number(session.loginAt) || 0
      if (loginAt > now + SKEW_THRESHOLD_MS) {
        clearSession()
        return false
      }
      if (now > session.expiresAt || (loginAt > 0 && now - loginAt > SESSION_DURATION_SECONDS * 1000)) {
        clearSession()
        return false
      }
      session.lastActiveAt = now
    }

    const serialized = JSON.stringify(session)
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, serialized)
      localStorage.setItem("ux_portal_session", serialized)
    } catch {}
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, serialized)
    } catch {}
    return true
  } catch {
    return false
  }
}

/**
 * Lấy thông tin phiên làm việc hiện tại từ localStorage / sessionStorage
 * Áp dụng logic 2 cơ chế:
 * 1. Fixed 8h: Hết hạn sau đúng 8 giờ kể từ lúc xác thực OTP
 * 2. Sliding 24h: Duy trì nếu thời gian vắng mặt (inactivity) < 24 giờ kể từ lastActiveAt
 */
export function getStoredSession(): UserSession | null {
  try {
    // Ưu tiên đọc từ localStorage để đồng bộ tức thì giữa tất cả tab và sau khi tắt trình duyệt
    let raw: string | null = null
    let isLocalStorageAccessible = true
    try {
      raw = localStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem("ux_portal_session")
    } catch {
      isLocalStorageAccessible = false
      try {
        raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
      } catch {}
    }

    if (!raw) {
      // Nếu localStorage đã bị xóa (do tab khác logout), dọn dẹp sessionStorage mồ côi
      if (isLocalStorageAccessible) {
        try {
          sessionStorage.removeItem(SESSION_STORAGE_KEY)
          sessionStorage.removeItem(ORIGINAL_SESSION_BACKUP_KEY)
        } catch {}
      }
      return null
    }

    const session: UserSession = JSON.parse(raw)
    if (!session || typeof session !== "object" || !session.sessionToken) {
      clearSession()
      return null
    }

    const now = Date.now()
    const SKEW_THRESHOLD_MS = 15 * 60 * 1000 // 15 phút tối đa

    // Điền và chuẩn hóa an toàn các mốc thời gian (phòng chống giá trị NaN / rỗng)
    let loginAt = Number(session.loginAt)
    let lastActiveAt = Number(session.lastActiveAt)
    let expiresAt = Number(session.expiresAt)

    if (isNaN(expiresAt) || expiresAt <= 0) {
      expiresAt = now + (session.sessionPolicy === "sliding_24h" ? INACTIVITY_LIMIT_24H_MS : SESSION_DURATION_SECONDS * 1000)
    }
    if (isNaN(loginAt) || loginAt <= 0) {
      loginAt = expiresAt - (session.sessionPolicy === "sliding_24h" ? INACTIVITY_LIMIT_24H_MS : SESSION_DURATION_SECONDS * 1000)
    }
    if (isNaN(lastActiveAt) || lastActiveAt <= 0) {
      lastActiveAt = loginAt
    }

    // Kiểm tra sai lệch đồng hồ hệ thống nghiêm trọng (clock skew / tampering)
    if (lastActiveAt > now + SKEW_THRESHOLD_MS || loginAt > now + SKEW_THRESHOLD_MS) {
      clearSession()
      return null
    }
    // Lệch nhẹ theo NTP (vài giây): nắn lại về now
    if (lastActiveAt > now) {
      lastActiveAt = now
    }

    session.loginAt = loginAt
    session.lastActiveAt = lastActiveAt
    session.expiresAt = expiresAt

    // Tự động làm mới chính sách phiên hiệu lực nếu cấu hình RBAC hoặc override thay đổi
    const effectivePolicy = resolveEffectiveSessionPolicy(
      session.teamsEmail || session.personalEmail,
      session.role
    )
    if (session.sessionPolicy !== effectivePolicy) {
      session.sessionPolicy = effectivePolicy
      if (effectivePolicy === "sliding_24h") {
        session.expiresAt = session.lastActiveAt + INACTIVITY_LIMIT_24H_MS
      } else {
        session.expiresAt = session.loginAt + SESSION_DURATION_SECONDS * 1000
      }
    }

    // 1. Kiểm tra cơ chế trượt 24 tiếng khi thoát (Sliding Inactivity 24h)
    if (session.sessionPolicy === "sliding_24h") {
      const inactivityMs = now - session.lastActiveAt
      if (inactivityMs > INACTIVITY_LIMIT_24H_MS) {
        // Vắng mặt quá 24h -> Buộc hết hạn phiên
        clearSession()
        return null
      }
      // Quay lại trong vòng 24h -> Phiên tự động duy trì hợp lệ, làm mới mốc 24h
      session.lastActiveAt = now
      session.expiresAt = now + INACTIVITY_LIMIT_24H_MS
      try {
        const serialized = JSON.stringify(session)
        sessionStorage.setItem(SESSION_STORAGE_KEY, serialized)
        localStorage.setItem(SESSION_STORAGE_KEY, serialized)
        localStorage.setItem("ux_portal_session", serialized)
      } catch {}
      return session
    }

    // 2. Kiểm tra cơ chế cố định 8 tiếng (Fixed 8h)
    const totalElapsedMs = now - session.loginAt
    if (now > session.expiresAt || totalElapsedMs > SESSION_DURATION_SECONDS * 1000) {
      clearSession()
      return null
    }
    return session
  } catch {
    clearSession()
    return null
  }
}

/**
 * Lưu phiên làm việc mới (hỗ trợ Dual Session Policy: Fixed 8h & Sliding 24h)
 */
export function saveSession(
  sessionToken: string,
  personalEmail: string,
  teamsEmail: string,
  role: UserRole = "Designer",
  squad?: string,
  displayName?: string,
  avatarUrl?: string,
  expiresInSeconds?: number,
  squads?: string[],
  products?: string[],
  sessionPolicy?: SessionPolicyType
): UserSession {
  const finalDisplayName = displayName || (teamsEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
  const resolvedPolicy: SessionPolicyType = sessionPolicy || resolveEffectiveSessionPolicy(teamsEmail || personalEmail, role)
  const now = Date.now()
  const durationSeconds = resolvedPolicy === "sliding_24h"
    ? SESSION_DURATION_SLIDING_SECONDS
    : (expiresInSeconds || SESSION_DURATION_SECONDS)

  const session: UserSession = {
    sessionToken,
    personalEmail,
    teamsEmail,
    displayName: finalDisplayName,
    avatarUrl,
    role,
    squad: squad || (squads && squads.length > 0 ? squads[0] : undefined),
    squads: squads || (squad ? [squad] : undefined),
    products: products,
    sessionPolicy: resolvedPolicy,
    loginAt: now,
    lastActiveAt: now,
    expiresAt: now + durationSeconds * 1000,
  }
  try {
    const serialized = JSON.stringify(session)
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, serialized)
      localStorage.setItem("ux_portal_session", serialized)
    } catch (lsErr) {
      console.warn("Could not save session to localStorage:", lsErr)
    }
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, serialized)
    } catch (ssErr) {
      console.warn("Could not save session to sessionStorage:", ssErr)
    }
    window.dispatchEvent(new Event("auth_session_changed"))
    window.dispatchEvent(new Event("storage"))
  } catch (err) {
    console.warn("Could not serialize session:", err)
  }
  return session
}

/**
 * Xóa phiên làm việc (Đăng xuất)
 */
export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    localStorage.removeItem(SESSION_STORAGE_KEY)
    localStorage.removeItem("ux_portal_session")
    sessionStorage.removeItem(ORIGINAL_SESSION_BACKUP_KEY)
    localStorage.removeItem(ORIGINAL_SESSION_BACKUP_KEY)
    window.dispatchEvent(new Event("auth_session_changed"))
    window.dispatchEvent(new Event("storage"))
  } catch (err) {
    console.warn("Could not clear session:", err)
  }
}

/**
 * Bắt đầu xem giao diện dưới dạng một vai trò khác (Dành cho Admin/Design Owner kiểm thử hiển thị)
 */
export function startRolePreview(targetRole: UserRole): UserSession | null {
  const current = getStoredSession()
  if (!current) return null

  // Lưu backup phiên admin gốc nếu chưa lưu
  if (!current.isImpersonating) {
    try {
      sessionStorage.setItem(ORIGINAL_SESSION_BACKUP_KEY, JSON.stringify(current))
      localStorage.setItem(ORIGINAL_SESSION_BACKUP_KEY, JSON.stringify(current))
    } catch (e) {
      console.warn("Could not backup original session:", e)
    }
  }

  const originalRole = current.originalRole || (current.isImpersonating ? "Admin" : current.role)
  const originalDisplayName = current.originalDisplayName || current.displayName

  // Nếu chọn lại chính vai trò Admin/Original role -> dừng preview
  if (targetRole === "Admin" || targetRole === originalRole) {
    return stopRolePreview()
  }

  const matchedDemo = DEMO_ACCOUNTS.find((a) => a.role === targetRole)

  const updatedSession: UserSession = {
    ...current,
    role: targetRole,
    isImpersonating: true,
    originalRole,
    originalDisplayName,
    displayName: matchedDemo?.displayName || current.displayName,
    teamsEmail: matchedDemo?.teamsEmail || current.teamsEmail,
    personalEmail: matchedDemo?.personalEmail || current.personalEmail,
    squad: matchedDemo?.squad || current.squad,
    squads: matchedDemo?.squads || current.squads,
    products: matchedDemo?.products || current.products,
  }

  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession))
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession))
    localStorage.setItem("ux_portal_session", JSON.stringify(updatedSession))
    window.dispatchEvent(new Event("auth_session_changed"))
    window.dispatchEvent(new Event("storage"))
  } catch (err) {
    console.warn("Could not save impersonation session:", err)
  }

  return updatedSession
}

/**
 * Dừng chế độ xem thử vai trò, phục hồi lại quyền Admin ban đầu
 */
export function stopRolePreview(): UserSession | null {
  try {
    const backupRaw = sessionStorage.getItem(ORIGINAL_SESSION_BACKUP_KEY) || localStorage.getItem(ORIGINAL_SESSION_BACKUP_KEY)
    let restoredSession: UserSession | null = null

    if (backupRaw) {
      restoredSession = JSON.parse(backupRaw)
    } else {
      const current = getStoredSession()
      if (current) {
        restoredSession = {
          ...current,
          role: current.originalRole || "Admin",
          displayName: current.originalDisplayName || current.displayName,
        }
      }
    }

    if (restoredSession) {
      delete restoredSession.isImpersonating
      delete restoredSession.originalRole
      delete restoredSession.originalDisplayName

      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(restoredSession))
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(restoredSession))
      localStorage.setItem("ux_portal_session", JSON.stringify(restoredSession))
      sessionStorage.removeItem(ORIGINAL_SESSION_BACKUP_KEY)
      localStorage.removeItem(ORIGINAL_SESSION_BACKUP_KEY)
      window.dispatchEvent(new Event("auth_session_changed"))
      window.dispatchEvent(new Event("storage"))
      return restoredSession
    }
  } catch (err) {
    console.warn("Could not stop role preview:", err)
  }
  return null
}

/**
 * Tính số giây còn lại của phiên làm việc (Tối đa 8 tiếng)
 */
export function getRemainingSessionSeconds(): number {
  const session = getStoredSession()
  if (!session) return 0
  const diff = Math.floor((session.expiresAt - Date.now()) / 1000)
  return Math.max(0, diff)
}

/**
 * Format thời gian còn lại (HH:MM:SS)
 */
export function formatSessionRemainingTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, "0")}m`
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

/**
 * Gửi yêu cầu mã OTP tới email Teams qua Google Apps Script
 */
export async function requestTeamsOtp(personalEmail: string): Promise<{
  success: boolean
  message: string
  expiresIn?: number
  cooldown?: boolean
}> {
  const config = getGoogleSheetConfig()
  const cleanEmail = personalEmail.trim().toLowerCase()

  if (!config.scriptUrl || !config.scriptUrl.trim()) {
    return {
      success: true,
      message: 'Vui lòng kiểm tra Teams "Workflowws" để lấy OTP truy cập',
      expiresIn: 180,
    }
  }

  try {
    const payload = {
      action: "request_otp",
      email: cleanEmail,
      timestamp: new Date().toISOString(),
    }

    const res = await fetch(config.scriptUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    return {
      success: data.status === "success" || data.status === "warning",
      message: data.message || 'Vui lòng kiểm tra Teams "Workflowws" để lấy OTP truy cập',
      expiresIn: data.expires_in || 180,
      cooldown: data.cooldown || false,
    }
  } catch (err) {
    console.error("Lỗi khi yêu cầu OTP:", err)
    return {
      success: true,
      message: 'Vui lòng kiểm tra Teams "Workflowws" để lấy OTP truy cập',
      expiresIn: 180,
    }
  }
}

/**
 * Xác thực mã OTP và nhận Session Token (Hiệu lực 8 tiếng, trong session)
 */
export async function verifyTeamsOtp(
  personalEmail: string,
  otp: string
): Promise<{
  success: boolean
  message: string
  session?: UserSession
  remainingAttempts?: number
}> {
  const config = getGoogleSheetConfig()
  const cleanEmail = personalEmail.trim().toLowerCase()
  const cleanOtp = otp.trim()

  if (!config.scriptUrl || !config.scriptUrl.trim()) {
    const matchedAccount = DEMO_ACCOUNTS.find(
      (a) =>
        a.personalEmail.toLowerCase() === cleanEmail ||
        a.teamsEmail.toLowerCase() === cleanEmail
    )

    let role: UserRole = "Designer"
    let teamsEmail = cleanEmail.includes("@mbbank.com.vn")
      ? cleanEmail
      : cleanEmail.replace("@gmail.com", "@mbbank.com.vn")
    let squad = "Daily Banking Squad"
    let displayName = "Chuyên viên Thiết kế UX"
    let avatarUrl = ""

    if (matchedAccount) {
      role = matchedAccount.role
      teamsEmail = matchedAccount.teamsEmail
      squad = matchedAccount.squad || squad
      displayName = matchedAccount.displayName
      avatarUrl = matchedAccount.avatarUrl || ""
    } else {
      const derivedName = cleanEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      if (cleanEmail.includes("admin")) {
        role = "Admin"
        displayName = "Quản trị viên Hệ thống"
      } else if (cleanEmail.includes("lead") || cleanEmail.includes("owner")) {
        role = "Design Owner"
        displayName = `${derivedName} (Design Owner)`
      } else if (cleanEmail.includes("po")) {
        role = "PO"
        displayName = `${derivedName} (PO)`
      } else if (cleanEmail.includes("biz") || cleanEmail.includes("business")) {
        role = "Business"
        displayName = `${derivedName} (Business)`
      } else {
        displayName = derivedName
      }
    }

    // Chế độ mô phỏng local
    if (cleanOtp === "123456" || cleanOtp === "583921" || cleanOtp.length === 6) {
      const effectivePolicy = resolveEffectiveSessionPolicy(cleanEmail, role)
      const mockSession = saveSession(
        "MOCK_TOKEN_" + Date.now(),
        cleanEmail,
        teamsEmail,
        role,
        squad,
        displayName,
        avatarUrl,
        undefined,
        matchedAccount?.squads,
        matchedAccount?.products,
        effectivePolicy
      )
      return {
        success: true,
        message: `Xác thực thành công với vai trò: ${role}! (Chính sách: ${effectivePolicy === "sliding_24h" ? "Trượt 24h" : "Cố định 8h"})`,
        session: mockSession,
      }
    }
    return {
      success: false,
      message: "Mã OTP không chính xác. Hãy thử 123456 hoặc 583921 trong chế độ mô phỏng.",
    }
  }

  try {
    const payload = {
      action: "verify_otp",
      email: cleanEmail,
      otp: cleanOtp,
      timestamp: new Date().toISOString(),
    }

    const res = await fetch(config.scriptUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (data.status === "success" && data.session_token) {
      const role: UserRole = data.role || "Designer"
      const displayName = data.display_name || data.full_name || cleanEmail.split("@")[0]
      const avatarUrl = data.avatar_url || ""
      const serverPolicy = (data.session_policy === "sliding_24h" || data.session_policy === "fixed_8h")
        ? data.session_policy
        : resolveEffectiveSessionPolicy(cleanEmail, role)
      let session = saveSession(
        data.session_token,
        data.personal_email || cleanEmail,
        data.teams_email || cleanEmail,
        role,
        data.squad,
        displayName,
        avatarUrl,
        data.expires_in,
        undefined,
        undefined,
        serverPolicy
      )

      // Luôn kiểm tra đối chiếu trực tiếp với tab USERS trên Sheet để đảm bảo Role đúng 100%
      try {
        const synced = await syncSessionRoleFromSheet()
        if (synced) session = synced
      } catch {}

      // Tải ngầm toàn bộ dữ liệu mới nhất từ Sheet (Requests, Master Data, Team Members, Selections)
      refreshAllDataOnLogin().catch((e) => console.warn("Background refresh on login:", e))

      return {
        success: true,
        message: data.message || "Xác thực thành công!",
        session,
      }
    }

    return {
      success: false,
      message: data.message || "Mã xác thực không chính xác.",
      remainingAttempts: data.remaining_attempts,
    }
  } catch (err) {
    console.error("Lỗi khi xác thực OTP:", err)
    return {
      success: false,
      message: "Lỗi kết nối tới máy chủ xác thực. Vui lòng thử lại.",
    }
  }
}

/**
 * Tìm kiếm dữ liệu bảo mật
 */
export async function searchProtectedData(query: string): Promise<{
  success: boolean
  data: any[]
  message?: string
  unauthorized?: boolean
}> {
  const session = getStoredSession()
  if (!session) {
    return {
      success: false,
      data: [],
      message: "Phiên đăng nhập đã hết hạn hoặc bạn chưa xác thực OTP.",
      unauthorized: true,
    }
  }

  const config = getGoogleSheetConfig()
  if (!config.scriptUrl || !config.scriptUrl.trim() || session.sessionToken.startsWith("MOCK_") || session.sessionToken.startsWith("DEMO_")) {
    return {
      success: true,
      data: [],
    }
  }

  try {
    const payload = {
      action: "search_data",
      session_token: session.sessionToken,
      query: query.trim(),
      timestamp: new Date().toISOString(),
    }

    const res = await fetch(config.scriptUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })

    const result = await res.json()
    if (result.status === "unauthorized") {
      // Chỉ hủy session nếu thời gian expiresAt thực sự đã trôi qua
      if (Date.now() > session.expiresAt) {
        clearSession()
        return {
          success: false,
          data: [],
          message: result.message || "Phiên đăng nhập đã hết hạn.",
          unauthorized: true,
        }
      }
      return {
        success: false,
        data: [],
        message: result.message || "Không thể truy cập dữ liệu trực tiếp.",
      }
    }

    if (result.status === "success" && Array.isArray(result.results)) {
      return {
        success: true,
        data: result.results,
      }
    }

    return {
      success: false,
      data: [],
      message: result.message || "Không thể tải dữ liệu.",
    }
  } catch (err) {
    console.error("Lỗi khi tìm kiếm dữ liệu bảo mật:", err)
    return {
      success: false,
      data: [],
      message: "Lỗi kết nối tới máy chủ Google Sheet.",
    }
  }
}

/**
 * Đăng xuất và hủy phiên trên server
 */
export async function logoutTeamsSession(): Promise<void> {
  const session = getStoredSession()
  const config = getGoogleSheetConfig()

  if (session && config.scriptUrl && config.scriptUrl.trim()) {
    try {
      fetch(config.scriptUrl.trim(), {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "logout",
          session_token: session.sessionToken,
        }),
      }).catch(() => {})
    } catch {}
  }
  clearSession()
}

/**
 * Tự động đồng bộ vai trò (Role) của phiên làm việc với Google Sheet USERS mới nhất
 */
export async function syncSessionRoleFromSheet(): Promise<UserSession | null> {
  const currentSession = getStoredSession()
  if (!currentSession) return null

  // Không ghi đè nếu đang ở chế độ xem trước vai trò (impersonating)
  if (currentSession.isImpersonating) return currentSession

  const config = getGoogleSheetConfig()
  const sheetId = config?.sheetId || "1gpe5W7whAMxIZLjsjVxEW23vcaa9ny0m9Qj327zKYzw"
  if (!sheetId) return currentSession

  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId.trim()}/gviz/tq?tqx=out:csv&sheet=USERS&_t=${Date.now()}`
    const res = await fetch(gvizUrl)
    if (!res.ok) return currentSession
    const text = await res.text()

    const lines = text.split(/\r?\n/)
    const myEmail = (currentSession.teamsEmail || currentSession.personalEmail || "").trim().toLowerCase()

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue
      const cols = line.split(",").map((c) => c.replace(/^["']|["']$/g, "").trim())
      const pEmail = (cols[2] || "").toLowerCase()
      const tEmail = (cols[3] || "").toLowerCase()

      if (
        pEmail === myEmail ||
        tEmail === myEmail ||
        (myEmail && (pEmail.includes(myEmail.split("@")[0]) || tEmail.includes(myEmail.split("@")[0])))
      ) {
        const rawRole = (cols[5] || "").toLowerCase()
        let newRole: UserRole = "Designer"
        if (rawRole.includes("admin")) newRole = "Admin"
        else if (rawRole.includes("owner")) newRole = "Design Owner"
        else if (rawRole.includes("po")) newRole = "PO"
        else if (rawRole.includes("biz") || rawRole.includes("business")) newRole = "Business"
        else newRole = "Designer"

        const rawPolicy = (cols[12] || "").toLowerCase().trim()
        let resolvedPolicy: SessionPolicyType = currentSession.sessionPolicy
        if (rawPolicy === "fixed_8h" || rawPolicy === "sliding_24h") {
          resolvedPolicy = rawPolicy
        } else {
          resolvedPolicy = getRoleSessionPolicies()[newRole] || "fixed_8h"
        }

        const newDisplayName = cols[0] || currentSession.displayName
        const newAvatar = cols[1] || currentSession.avatarUrl

        if (
          newRole !== currentSession.role ||
          resolvedPolicy !== currentSession.sessionPolicy ||
          (newAvatar && newAvatar !== currentSession.avatarUrl) ||
          (newDisplayName && newDisplayName !== currentSession.displayName)
        ) {
          const updated = saveSession(
            currentSession.sessionToken,
            currentSession.personalEmail,
            currentSession.teamsEmail,
            newRole,
            currentSession.squad,
            newDisplayName,
            newAvatar,
            Math.max(300, Math.floor((currentSession.expiresAt - Date.now()) / 1000)),
            currentSession.squads,
            currentSession.products,
            resolvedPolicy
          )
          return updated
        }
        break
      }
    }
  } catch (e) {
    console.warn("Could not sync role from sheet:", e)
  }
  return currentSession
}

/**
 * Tải toàn bộ dữ liệu mới nhất khi đăng nhập (Requests, Master Data, Team Members, Selections)
 */
export async function refreshAllDataOnLogin(): Promise<void> {
  try {
    const promises: Promise<any>[] = []

    // 1. Tải danh sách yêu cầu mới nhất (force refresh)
    promises.push(
      fetchRequestsFromSheet(true).catch((e) => {
        console.warn("Could not force refresh requests on login:", e)
      })
    )

    // 2. Tải danh sách Selections mới nhất (force refresh)
    promises.push(
      fetchSelectionsFromSheet(true).catch((e) => {
        console.warn("Could not force refresh selections on login:", e)
      })
    )

    // 3. Tải Master Data (Squads, Products, Phases, Status Rules, RBAC, Team Members)
    promises.push(
      (async () => {
        try {
          const res = await fetchMasterDataFromSheet()
          if (res.success && res.data) {
            if (Array.isArray(res.data.products) && res.data.products.length > 0) {
              localStorage.setItem("mbbank_admin_products", JSON.stringify(res.data.products))
              localStorage.setItem("ux_portal_products_v2", JSON.stringify(res.data.products))
            }
            if (Array.isArray(res.data.squads) && res.data.squads.length > 0) {
              localStorage.setItem("mbbank_admin_squads", JSON.stringify(res.data.squads))
              localStorage.setItem("ux_portal_squads_v2", JSON.stringify(res.data.squads))
            }
            if (Array.isArray(res.data.phases) && res.data.phases.length > 0) {
              localStorage.setItem("mbbank_admin_phases", JSON.stringify(res.data.phases))
              localStorage.setItem("ux_portal_phases_v2", JSON.stringify(res.data.phases))
            }
            if (Array.isArray(res.data.status_rules) && res.data.status_rules.length > 0) {
              localStorage.setItem("mbbank_admin_status_rules", JSON.stringify(res.data.status_rules))
            }
            if (res.data.rbac && typeof res.data.rbac === "object") {
              localStorage.setItem("mbbank_admin_rbac", JSON.stringify(res.data.rbac))
            }
            if (Array.isArray(res.data.team_members) && res.data.team_members.length > 0) {
              localStorage.setItem("mbbank_admin_team", JSON.stringify(res.data.team_members))
              localStorage.setItem("mbbank_team_members", JSON.stringify(res.data.team_members))
            }
          }
        } catch (e) {
          console.warn("Could not fetch master data on login:", e)
        }
      })()
    )

    // 4. Tải Team Members nếu chưa có
    promises.push(
      (async () => {
        try {
          const members = await fetchTeamMembersFromSheet()
          if (members && Array.isArray(members) && members.length > 0) {
            localStorage.setItem("mbbank_admin_team", JSON.stringify(members))
            localStorage.setItem("mbbank_team_members", JSON.stringify(members))
          }
        } catch (e) {
          console.warn("Could not fetch team members on login:", e)
        }
      })()
    )

    await Promise.all(promises)

    // 5. Cập nhật Session nếu thông tin nhân sự (vai trò, squad, sản phẩm) của người đang đăng nhập có thay đổi trên Sheet
    await syncSessionRoleFromSheet()

    // 6. Phát event để toàn bộ giao diện đang mở cập nhật dữ liệu mới tức thì
    window.dispatchEvent(new CustomEvent("ux_data_refreshed"))
    window.dispatchEvent(new Event("storage"))
  } catch (err) {
    console.warn("Lỗi khi tải dữ liệu mới nhất sau đăng nhập:", err)
  }
}

// Tự động theo dõi mốc hoạt động người dùng (User Inactivity Tracking cho Sliding 24h) & Đồng bộ đa Tab
if (typeof window !== "undefined") {
  // 1. Đồng bộ đa Tab (Cross-Tab Session Sync): Lắng nghe storage event từ trình duyệt
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === SESSION_STORAGE_KEY || e.key === "ux_portal_session" || e.key === null) {
      if (!e.newValue) {
        // Tab khác đã bấm Đăng xuất -> Ngay lập tức dọn sạch sessionStorage của tab hiện tại
        try {
          sessionStorage.removeItem(SESSION_STORAGE_KEY)
          sessionStorage.removeItem("ux_portal_session")
          sessionStorage.removeItem(ORIGINAL_SESSION_BACKUP_KEY)
        } catch {}
        window.dispatchEvent(new Event("auth_session_changed"))
      } else {
        // Tab khác đã đăng nhập mới hoặc làm mới phiên -> Đồng bộ sang sessionStorage
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, e.newValue)
        } catch {}
        window.dispatchEvent(new Event("auth_session_changed"))
      }
    } else if (e.key === ROLE_SESSION_POLICIES_KEY) {
      // Khi cấu hình chính sách phiên thay đổi từ tab quản trị
      window.dispatchEvent(new Event("auth_session_changed"))
    }
  })

  // 2. Khi người dùng đóng ứng dụng / chuyển tab ẩn / đóng ứng dụng mobile -> cập nhật ngay lập tức lastActiveAt
  const handleExitOrHide = () => {
    touchSessionActivity(true)
  }
  window.addEventListener("beforeunload", handleExitOrHide)
  window.addEventListener("pagehide", handleExitOrHide)
  // W3C Page Lifecycle API: Hỗ trợ đóng băng app trên Mobile (iOS Safari & Android Chrome)
  window.addEventListener("freeze", handleExitOrHide)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      touchSessionActivity(true)
    } else if (document.visibilityState === "visible") {
      touchSessionActivity(false)
    }
  })

  // 3. Thao tác người dùng định kỳ làm tươi lastActiveAt (throttled 30s)
  let lastTouch = 0
  const throttledTouch = () => {
    const now = Date.now()
    if (now - lastTouch > 30000) {
      lastTouch = now
      touchSessionActivity(false)
    }
  }
  window.addEventListener("mousemove", throttledTouch, { passive: true })
  window.addEventListener("keydown", throttledTouch, { passive: true })
  window.addEventListener("click", throttledTouch, { passive: true })
  window.addEventListener("touchstart", throttledTouch, { passive: true })
  window.addEventListener("scroll", throttledTouch, { passive: true })
}


