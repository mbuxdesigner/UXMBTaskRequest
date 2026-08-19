import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string
  borderRadius?: string
  shimmerDuration?: string
  background?: string
  className?: string
  children?: React.ReactNode
}

export function ShimmerButton({
  shimmerColor = "#ffffff",
  shimmerDuration = "3s",
  borderRadius = "1rem",
  background = "rgba(16, 87, 251, 1)",
  className,
  children,
  ...props
}: ShimmerButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "group relative flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap px-6 py-3 text-white font-semibold shadow-md transition-all duration-300",
        className
      )}
      style={{
        borderRadius,
        background,
      }}
      {...(props as any)}
    >
      {/* Shimmer sweep layer */}
      <div
        className="pointer-events-none absolute inset-0 -z-0 opacity-40 group-hover:opacity-80 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${shimmerColor} 50%, transparent 100%)`,
          animation: `shimmer Sweep ${shimmerDuration} infinite linear`,
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2 w-full">{children}</span>
    </motion.button>
  )
}
