// Title: Avatar group with icon count and button (c-avatar-29)
// Description: ReUI c-avatar-29 variant for stacked avatars with count badge and circular outline add button

import * as React from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"

export {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
}

export interface CAvatar29Props extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  count?: number
  remainingCount?: number
  totalCount?: number
  onAddClick?: (e: React.MouseEvent) => void
  showAddButton?: boolean
  addTitle?: string
}

export function CAvatar29({
  children,
  count,
  remainingCount,
  totalCount,
  onAddClick,
  showAddButton = true,
  addTitle = "Thêm người theo dõi",
  className,
  ...props
}: CAvatar29Props) {
  // Calculate remaining overflow count
  const childCount = React.Children.count(children)
  let effectiveRemaining = 0

  if (typeof remainingCount === "number") {
    effectiveRemaining = remainingCount
  } else if (typeof totalCount === "number") {
    effectiveRemaining = Math.max(0, totalCount - childCount)
  } else if (typeof count === "number") {
    effectiveRemaining = count > childCount ? count - childCount : 0
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)} {...props}>
      {/* ReUI AvatarGroup with stacked avatars and count badge */}
      <AvatarGroup>
        {children}
        {effectiveRemaining > 0 && (
          <AvatarGroupCount>+{effectiveRemaining}</AvatarGroupCount>
        )}
      </AvatarGroup>

      {/* ReUI Add User Circular Outline Button */}
      {showAddButton && (
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex items-center justify-center size-7 rounded-full border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 text-slate-500 shadow-2xs transition-colors cursor-pointer"
          title={addTitle}
          aria-label={addTitle}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
        </button>
      )}
    </div>
  )
}

export default CAvatar29
