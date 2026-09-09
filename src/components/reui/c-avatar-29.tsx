// Title: Avatar group with count and add button (c-avatar-29)
// Description: ReUI c-avatar-29 variant for stacked avatars with count pill badge and add icon button

import * as React from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CAvatar29Props extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  count?: number
  onAddClick?: (e: React.MouseEvent) => void
  showAddButton?: boolean
  addTitle?: string
}

export function CAvatar29({
  children,
  count,
  onAddClick,
  showAddButton = true,
  addTitle = "Thêm người theo dõi",
  className,
  ...props
}: CAvatar29Props) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)} {...props}>
      {/* Stacked Avatars with negative space */}
      <div className="flex items-center -space-x-1.5 overflow-visible">
        {children}
      </div>

      {/* Pill Count Badge */}
      {typeof count === "number" && count > 0 && (
        <span className="inline-flex items-center justify-center min-w-5 h-5 px-2 rounded-full bg-[#DBEAFE] text-[#2563EB] text-xs font-bold leading-none select-none">
          {count}
        </span>
      )}

      {/* Add Button with Plus Icon */}
      {showAddButton && (
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-md transition-colors cursor-pointer"
          title={addTitle}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
        </button>
      )}
    </div>
  )
}

export default CAvatar29
