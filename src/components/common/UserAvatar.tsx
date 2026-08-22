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

interface UserAvatarProps {
  name?: string
  avatarUrl?: string | null
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
  className?: string
  showBorder?: boolean
}

/**
 * Component Avatar chuẩn hóa:
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

  React.useEffect(() => {
    setImgError(false)
  }, [avatarUrl])

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

  if (avatarUrl && !imgError && avatarUrl.trim() !== "") {
    return (
      <img
        src={avatarUrl}
        alt={name}
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
