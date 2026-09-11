import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { springs } from "@/lib/motion"

export interface SpotlightCardProps extends HTMLMotionProps<"div"> {
  spotlightColor?: string
  interactive?: boolean
  className?: string
  children?: React.ReactNode
}

export const SpotlightCard = React.forwardRef<HTMLDivElement, SpotlightCardProps>(
  (
    {
      spotlightColor = "rgba(16, 87, 251, 0.08)",
      interactive = true,
      className,
      children,
      onMouseMove,
      whileHover,
      whileTap,
      transition,
      ...props
    },
    forwardedRef
  ) => {
    const internalRef = React.useRef<HTMLDivElement | null>(null)

    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        internalRef.current = node
        if (typeof forwardedRef === "function") {
          forwardedRef(node)
        } else if (forwardedRef) {
          ;(forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        }
      },
      [forwardedRef]
    )

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const card = internalRef.current || (e.currentTarget as HTMLDivElement)
      if (card) {
        const rect = card.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        card.style.setProperty("--mouse-x", `${x}px`)
        card.style.setProperty("--mouse-y", `${y}px`)
      }
      onMouseMove?.(e)
    }

    const defaultWhileHover = interactive ? { y: -3 } : undefined
    const defaultWhileTap = interactive ? { scale: 0.99 } : undefined

    return (
      <motion.div
        ref={setRefs}
        onMouseMove={handleMouseMove}
        whileHover={whileHover !== undefined ? whileHover : defaultWhileHover}
        whileTap={whileTap !== undefined ? whileTap : defaultWhileTap}
        transition={transition !== undefined ? transition : springs.snappy}
        className={cn(
          "group relative rounded-2xl border border-slate-200/90 bg-white overflow-hidden select-none",
          "transition-shadow duration-200 hover:shadow-xl hover:border-slate-300/90",
          className
        )}
        {...props}
      >
        {/* Zero-render CSS variable spotlight beam (60+ FPS) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
          style={{
            background: `radial-gradient(600px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), ${spotlightColor}, transparent 40%)`,
          }}
        />
        <div className="relative z-20 rounded-2xl w-full h-full">{children}</div>
      </motion.div>
    )
  }
)

SpotlightCard.displayName = "SpotlightCard"

export default SpotlightCard
