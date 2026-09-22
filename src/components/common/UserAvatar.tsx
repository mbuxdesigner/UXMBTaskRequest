import React, { useState } from "react"
import { getUserInitials } from "../../services/otpAuthService"

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
 * Tra cứu ảnh đại diện Designer / Thành viên từ localStorage hoặc danh bạ fallback
 */
export function getDesignerAvatar(name?: string, email?: string): string {
  if (!name || name === "Chưa phân công" || name === "unassigned" || name === "Chưa gán") return ""
  const clean = name.replace(/\(.*?\)/g, "").trim().normalize("NFC")
  const cleanLower = clean.toLowerCase()
  const emailLower = (email || "").trim().toLowerCase()

  try {
    const storageKeys = ["mbbank_team_members", "mbbank_admin_team"]
    for (const key of storageKeys) {
      const cached = localStorage.getItem(key)
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
          if (found && (found.avatarUrl || found.avatar || found.avatar_url)) {
            const url = String(found.avatarUrl || found.avatar || found.avatar_url).trim()
            if (
              url &&
              url !== "null" &&
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

  // Người dùng chưa up avatar: Trả về "" để giữ nguyên Ava text (Initials) + Màu nền thương hiệu
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
      const cached = localStorage.getItem(key)
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
    const sessRaw = sessionStorage.getItem("ux_portal_session") || localStorage.getItem("ux_portal_session")
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

interface UserAvatarProps {
  name?: string
  avatarUrl?: string | null
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
  className?: string
  showBorder?: boolean
  role?: string
}

/**
 * Component Avatar chuẩn hóa:
 * - Tự động tra cứu avatarUrl từ danh bạ nếu không được truyền trực tiếp
 * - Nếu có avatarUrl hợp lệ -> Hiển thị ảnh kèm xử lý fallback khi lỗi load (onError)
 * - Nếu không có avatar -> Hiển thị Chữ cái viết tắt (Initials) + Màu nền background đẹp mắt xác định theo tên
 */
export function UserAvatar({
  name = "User",
  avatarUrl,
  size = "md",
  className = "",
  showBorder = true,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)

  // Tự động phân giải ảnh đại diện từ danh bạ nhân sự nếu không truyền avatarUrl
  const resolvedUrl = avatarUrl || getDesignerAvatar(name)

  React.useEffect(() => {
    setImgError(false)
  }, [resolvedUrl])

  const sizeClasses = {
    xs: "w-5 h-5 text-[10px]",
    sm: "w-6 h-6 text-[11px]",
    md: "w-7 h-7 text-xs",
    lg: "w-8 h-8 text-[13px]",
    xl: "w-10 h-10 text-sm font-extrabold",
    "2xl": "w-12 h-12 text-base font-extrabold",
  }[size]

  const initials = getUserInitials(name)
  const colorClass = getAvatarColorClass(name)

  if (resolvedUrl && !imgError && resolvedUrl.trim() !== "") {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        loading="lazy"
        decoding="async"
        width="40"
        height="40"
        onError={() => setImgError(true)}
        className={`${sizeClasses} rounded-full object-cover shrink-0 ${
          showBorder ? "border border-slate-200/80 shadow-2xs" : ""
        } ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses} rounded-full font-bold uppercase flex items-center justify-center shrink-0 tracking-tight select-none ${colorClass} ${
        showBorder ? "border shadow-2xs" : ""
      } ${className}`}
      title={name}
    >
      {initials}
    </div>
  )
}

export default UserAvatar
