import { getUserInitials, DEMO_ACCOUNTS } from "../services/otpAuthService.ts"

export const AVATAR_COLOR_PALETTES = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-sky-100 text-sky-700 border-sky-200",
]

/**
 * Tạo màu background và chữ hài hòa, xác định duy nhất theo tên / email
 */
export function getAvatarColorClass(name?: string): string {
  if (!name || !name.trim()) return AVATAR_COLOR_PALETTES[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_COLOR_PALETTES.length
  return AVATAR_COLOR_PALETTES[index]
}

/**
 * Tra cứu ảnh đại diện Designer / Thành viên từ localStorage, session hoặc danh bạ fallback
 */
export function getDesignerAvatar(name?: string, email?: string): string {
  if (!name || name === "Chưa phân công" || name === "unassigned" || name === "Chưa gán") return ""
  const clean = name.replace(/\(.*?\)/g, "").trim().normalize("NFC")
  const cleanLower = clean.toLowerCase()
  const emailLower = (email || "").trim().toLowerCase()

  try {
    const storageKeys = ["mbbank_team_members", "mbbank_admin_team"]
    for (const key of storageKeys) {
      const cached = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null
      if (cached) {
        const members: any[] = JSON.parse(cached)
        if (Array.isArray(members)) {
          const found = members.find((m: any) => {
            const mName = String(m.name || m.displayName || "").trim().normalize("NFC").toLowerCase()
            const mEmail = String(m.email || m.teamsEmail || m.personalEmail || "").trim().toLowerCase()
            if (mName && (mName === cleanLower || cleanLower.includes(mName) || mName.includes(cleanLower))) {
              return true
            }
            if (
              mEmail &&
              (cleanLower === mEmail ||
                cleanLower.includes(mEmail) ||
                (mEmail.includes("@") && cleanLower.includes(mEmail.split("@")[0])))
            ) {
              return true
            }
            if (emailLower && mEmail && (mEmail === emailLower || mEmail.includes(emailLower))) {
              return true
            }
            return false
          })
          if (found && found.avatarUrl) {
            const url = String(found.avatarUrl).trim()
            if (
              url &&
              url !== "undefined" &&
              (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:image/") || url.startsWith("/"))
            ) {
              return url
            }
          }
        }
      }
    }
  } catch {}

  // Kiểm tra phiên đăng nhập hiện tại nếu có ảnh avatar đã upload
  try {
    const sessRaw =
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem("ux_portal_session_auth")) ||
      (typeof localStorage !== "undefined" && localStorage.getItem("ux_portal_session_auth")) ||
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem("ux_portal_session")) ||
      (typeof localStorage !== "undefined" && localStorage.getItem("ux_portal_session"))
    if (sessRaw) {
      const sess = JSON.parse(sessRaw)
      const sessName = String(sess.displayName || sess.name || "").trim().normalize("NFC").toLowerCase()
      const sessEmail = String(sess.teamsEmail || sess.personalEmail || "").trim().toLowerCase()
      if (
        (sessName && (sessName === cleanLower || cleanLower.includes(sessName) || sessName.includes(cleanLower))) ||
        (sessEmail && (sessEmail === cleanLower || cleanLower.includes(sessEmail) || sessEmail.split("@")[0].includes(cleanLower))) ||
        (emailLower && sessEmail && (sessEmail === emailLower || sessEmail.includes(emailLower)))
      ) {
        if (sess.avatarUrl) return sess.avatarUrl
      }
    }
  } catch {}

  // Kiểm tra tài khoản mẫu chuẩn (Demo Accounts)
  try {
    const demo = DEMO_ACCOUNTS.find((acc) => {
      const accName = acc.name.toLowerCase()
      const accEmail = acc.teamsEmail.toLowerCase()
      return (
        accName === cleanLower ||
        cleanLower.includes(accName) ||
        accName.includes(cleanLower) ||
        (emailLower && (accEmail === emailLower || accEmail.includes(emailLower)))
      )
    })
    if (demo?.avatarUrl) return demo.avatarUrl
  } catch {}

  return ""
}

/**
 * Tra cứu tên hiển thị chuẩn nhất của Thành viên / PO từ Email hoặc Tên cũ
 * Tự động đồng bộ khi user đổi tên trong hệ thống hoặc Google Sheet
 */
export function getMemberDisplayName(name?: string, email?: string): string {
  const cleanName = (name || "").replace(/\(.*?\)/g, "").trim().normalize("NFC")
  const emailLower = (email || "").trim().toLowerCase()
  const nameLower = cleanName.toLowerCase()

  try {
    const storageKeys = ["mbbank_team_members", "mbbank_admin_team"]
    for (const key of storageKeys) {
      const cached = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null
      if (cached) {
        const members: any[] = JSON.parse(cached)
        if (Array.isArray(members)) {
          const found = members.find((m: any) => {
            const mEmail = String(m.email || m.teamsEmail || m.personalEmail || "").trim().toLowerCase()
            // 1. Khớp theo email chính xác hoặc prefix email
            if (emailLower && mEmail) {
              if (mEmail === emailLower) return true
              const emailPrefix = emailLower.split("@")[0]
              const mPrefix = mEmail.split("@")[0]
              if (emailPrefix && mPrefix && emailPrefix === mPrefix) return true
            }
            // 2. Khớp theo tên đầy đủ
            const mName = String(m.name || m.displayName || "").trim().normalize("NFC")
            const mNameLower = mName.toLowerCase()
            if (nameLower && mNameLower && nameLower === mNameLower) return true

            // 3. Khớp nếu email của member trùng với nameLower (trường hợp name truyền vào là email)
            if (mEmail && nameLower && (nameLower === mEmail || nameLower === mEmail.split("@")[0])) {
              return true
            }

            // 4. Nếu nameLower chỉ là tên gọi 1 từ (ví dụ "Huy"), kiểm tra xem có khớp với tên gọi cuối của member không
            if (nameLower && !nameLower.includes(" ") && mNameLower) {
              const parts = mNameLower.split(/\s+/).filter(Boolean)
              const lastName = parts[parts.length - 1]
              if (lastName === nameLower && emailLower && mEmail.includes(emailLower)) {
                return true
              }
            }

            return false
          })
          if (found && (found.name || found.displayName)) {
            return String(found.name || found.displayName).trim().normalize("NFC")
          }
        }
      }
    }
  } catch {}

  // Kiểm tra thêm phiên hiện tại nếu trùng email
  try {
    const sessRaw =
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem("ux_portal_session")) ||
      (typeof localStorage !== "undefined" && localStorage.getItem("ux_portal_session"))
    if (sessRaw) {
      const sess = JSON.parse(sessRaw)
      const sessEmail = String(sess.teamsEmail || sess.personalEmail || "").trim().toLowerCase()
      if (emailLower && sessEmail && (sessEmail === emailLower || sessEmail.split("@")[0] === emailLower.split("@")[0]) && sess.displayName) {
        return String(sess.displayName).trim().normalize("NFC")
      }
    }
  } catch {}

  return cleanName || (email ? email.split("@")[0] : "PO")
}
