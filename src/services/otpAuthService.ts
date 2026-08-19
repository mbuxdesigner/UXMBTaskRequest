import { getGoogleSheetConfig } from "../config/googleSheetConfig"
import { UserRole } from "../data/mockData"

export interface UserSession {
  sessionToken: string
  personalEmail: string
  teamsEmail: string
  displayName: string
  avatarUrl?: string
  role: UserRole
  squad?: string
  expiresAt: number // Timestamp in ms
}

// Lưu trong sessionStorage: Tắt tab là tự động xóa phiên!
const SESSION_STORAGE_KEY = "ux_portal_session_auth"
export const SESSION_DURATION_HOURS = 8
export const SESSION_DURATION_SECONDS = SESSION_DURATION_HOURS * 3600 // 8 tiếng = 28,800s

export const DEMO_ACCOUNTS: Array<{
  name: string
  personalEmail: string
  teamsEmail: string
  displayName: string
  avatarUrl?: string
  role: UserRole
  squad?: string
}> = [
  {
    name: "Admin Quản Trị",
    displayName: "Admin MB UX Team",
    personalEmail: "admin@gmail.com",
    teamsEmail: "admin@mbbank.com.vn",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    role: "Admin",
    squad: "All Squads",
  },
  {
    name: "Nguyễn Văn Cường",
    displayName: "Nguyễn Văn Cường",
    personalEmail: "lead.cuong@gmail.com",
    teamsEmail: "lead.cuong@mbbank.com.vn",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    role: "Design Owner",
    squad: "Daily Banking Squad",
  },
  {
    name: "Lê Hoàng Nam",
    displayName: "Lê Hoàng Nam",
    personalEmail: "nam.designer@gmail.com",
    teamsEmail: "nam.designer@mbbank.com.vn",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    role: "Designer",
    squad: "Daily Banking Squad",
  },
  {
    name: "Trần Mai Lan",
    displayName: "Trần Mai Lan",
    personalEmail: "lan.po@gmail.com",
    teamsEmail: "lan.po@mbbank.com.vn",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    role: "PO",
    squad: "App/Core Product",
  },
]

/**
 * Trích xuất 2 chữ cái đầu của tên để làm Avatar dự phòng
 */
export function getUserInitials(name?: string): string {
  if (!name || !name.trim()) return "UX"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Lấy thông tin phiên làm việc hiện tại từ sessionStorage
 * (Tắt tab tự động mất, hoặc quá 8 tiếng tự hết hạn)
 */
export function getStoredSession(): UserSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const session: UserSession = JSON.parse(raw)
    // Kiểm tra quá 8 tiếng (expiresAt)
    if (Date.now() > session.expiresAt) {
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
 * Lưu phiên làm việc mới (Mặc định 8 tiếng, trong sessionStorage)
 */
export function saveSession(
  sessionToken: string,
  personalEmail: string,
  teamsEmail: string,
  role: UserRole = "Designer",
  squad?: string,
  displayName?: string,
  avatarUrl?: string,
  expiresInSeconds = SESSION_DURATION_SECONDS
): UserSession {
  const finalDisplayName = displayName || (teamsEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
  const session: UserSession = {
    sessionToken,
    personalEmail,
    teamsEmail,
    displayName: finalDisplayName,
    avatarUrl,
    role,
    squad,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  }
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    window.dispatchEvent(new Event("auth_session_changed"))
  } catch (err) {
    console.warn("Could not save session to sessionStorage:", err)
  }
  return session
}

/**
 * Xóa phiên làm việc (Đăng xuất)
 */
export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    window.dispatchEvent(new Event("auth_session_changed"))
  } catch (err) {
    console.warn("Could not clear session:", err)
  }
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
      message: "Chế độ Local: Nếu tài khoản hợp lệ, mã xác thực 6 số sẽ được gửi tới Teams.",
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
      message: data.message || "Nếu tài khoản hợp lệ, mã xác thực 6 số sẽ được gửi tới Teams.",
      expiresIn: data.expires_in || 180,
      cooldown: data.cooldown || false,
    }
  } catch (err) {
    console.error("Lỗi khi yêu cầu OTP:", err)
    return {
      success: true,
      message: "Nếu tài khoản hợp lệ, mã xác thực 6 số sẽ được gửi tới Teams.",
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
    } else if (cleanEmail.includes("admin")) {
      role = "Admin"
      displayName = "Quản trị viên Hệ thống"
    } else if (cleanEmail.includes("lead") || cleanEmail.includes("owner") || cleanEmail.includes("cuong")) {
      role = "Design Owner"
      displayName = "Nguyễn Văn Cường (Design Owner)"
    } else if (cleanEmail.includes("po") || cleanEmail.includes("lan")) {
      role = "PO"
      displayName = "Trần Mai Lan (PO)"
    } else {
      displayName = cleanEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    }

    // Chế độ mô phỏng local
    if (cleanOtp === "123456" || cleanOtp === "583921" || cleanOtp.length === 6) {
      const mockSession = saveSession(
        "MOCK_TOKEN_" + Date.now(),
        cleanEmail,
        teamsEmail,
        role,
        squad,
        displayName,
        avatarUrl,
        SESSION_DURATION_SECONDS
      )
      return {
        success: true,
        message: `Xác thực thành công với vai trò: ${role}!`,
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
      const session = saveSession(
        data.session_token,
        data.personal_email || cleanEmail,
        data.teams_email || cleanEmail,
        role,
        data.squad,
        displayName,
        avatarUrl,
        data.expires_in || SESSION_DURATION_SECONDS
      )
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
