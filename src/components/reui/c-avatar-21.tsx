// Title: Avatar group with social proof text (c-avatar-21)
// Description: ReUI c-avatar-21 component displaying stacked avatars with count circle and task info text

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { getUserInitials } from "@/services/otpAuthService"
import { getAvatarColorClass, getDesignerAvatar } from "@/components/common/UserAvatar"
import { NumberTicker } from "@/components/jolyui/number-ticker"

export {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
}

export interface CAvatar21Member {
  id?: string
  name: string
  avatarUrl?: string
  role?: string
}

export interface CAvatar21Props extends React.HTMLAttributes<HTMLDivElement> {
  members?: CAvatar21Member[]
  maxVisible?: number
  totalCount?: number
  taskCount?: number
  textPrefix?: React.ReactNode
  textSuffix?: React.ReactNode
  size?: "sm" | "md"
}

export function CAvatar21({
  members = [],
  maxVisible = 3,
  totalCount,
  taskCount,
  textPrefix = "designer thực hiện",
  textSuffix = "task",
  size = "sm",
  className,
  ...props
}: CAvatar21Props) {
  // Take up to maxVisible members for the avatar group
  const visibleMembers = members.slice(0, maxVisible)

  // Calculate remaining count for the circle (+N)
  const effectiveTotal = typeof totalCount === "number" ? totalCount : members.length
  const remainingCount = Math.max(0, effectiveTotal - visibleMembers.length)

  const sizeClasses = size === "sm" ? "size-6 text-[10px]" : "size-7 text-[11px]"

  return (
    <div
      className={cn(
        "flex items-center gap-2 min-w-0 select-none",
        className
      )}
      {...props}
    >
      {visibleMembers.length > 0 && (
        <AvatarGroup className="-space-x-2 shrink-0">
          {visibleMembers.map((m, index) => {
            const initials = getUserInitials(m.name || "User")
            const colorClass = getAvatarColorClass(m.name || "User")
            const tooltip = m.role ? `${m.name} (${m.role})` : m.name
            const avatarSrc = m.avatarUrl || getDesignerAvatar(m.name)

            return (
              <Avatar
                key={m.id || `${m.name}-${index}`}
                title={tooltip}
                className={cn(
                  sizeClasses,
                  "ring-2 ring-white transition-transform hover:scale-110 hover:z-10 shrink-0 cursor-default"
                )}
              >
                {avatarSrc ? (
                  <AvatarImage src={avatarSrc} alt={m.name} />
                ) : null}
                <AvatarFallback
                  className={cn(
                    "font-bold uppercase select-none flex items-center justify-center border",
                    size === "sm" ? "text-[10px]" : "text-[11px]",
                    colorClass
                  )}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            )
          })}

          {remainingCount > 0 && (
            <AvatarGroupCount
              title={`Còn ${remainingCount} designer khác đang thực hiện task`}
              className={cn(
                sizeClasses,
                "ring-2 ring-white bg-slate-100/90 text-slate-600 font-semibold transition-transform hover:scale-110 shrink-0 cursor-default"
              )}
            >
              +{remainingCount}
            </AvatarGroupCount>
          )}
        </AvatarGroup>
      )}

      <p className="text-slate-500 text-[11px] sm:text-xs truncate font-normal">
        {textPrefix}{" "}
        <span className="font-semibold text-slate-900 font-mono tabular-nums">
          {typeof taskCount === "number" ? (
            <NumberTicker value={taskCount} />
          ) : (
            taskCount
          )}
        </span>{" "}
        {textSuffix}
      </p>
    </div>
  )
}
