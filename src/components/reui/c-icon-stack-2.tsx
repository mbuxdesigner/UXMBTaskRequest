// Title: Icon stack sizes (c-icon-stack-2)
// Description: ReUI c-icon-stack-2 variant and component

import * as React from "react"
import { IconStack } from "./icon-stack"
import { Layers } from "lucide-react"
import { cn } from "@/lib/utils"

export interface IconStackLargeProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode
  stackClassName?: string
}

export function IconStackLarge({
  icon = <Layers className="size-6 text-slate-500 group-hover:text-[#1057FB] transition-colors" />,
  className,
  stackClassName,
  ...props
}: IconStackLargeProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center", className)} {...props}>
      <IconStack
        aria-hidden="true"
        className={cn("h-28 w-24", stackClassName)}
      >
        {icon}
      </IconStack>
    </div>
  )
}

export const iconStackSizes = [
  {
    label: "Small",
    className: "h-16 w-14",
    iconSize: "size-3.5",
  },
  {
    label: "Default",
    className: "h-20 w-18",
    iconSize: "size-4",
  },
  {
    label: "Large",
    className: "h-28 w-24",
    iconSize: "size-6",
  },
] as const
