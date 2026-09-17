import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Kbd } from "@/components/ui/kbd"

export interface TooltipProps {
  /** Tooltip label or rich React content */
  content: React.ReactNode
  /** Optional keyboard shortcut (e.g. "V", "⌘ +", "Esc", ["Ctrl", "K"]) */
  shortcut?: string | string[]
  /** Preferred placement */
  side?: "top" | "bottom" | "left" | "right"
  /** Alignment on cross axis */
  align?: "start" | "center" | "end"
  /** Hover open delay in ms (default: 200) */
  delayDuration?: number
  /** Additional CSS classes for the tooltip bubble */
  className?: string
  /** Whether the tooltip is disabled */
  disabled?: boolean
  /** The trigger element (must accept ref and mouse handlers) */
  children: React.ReactNode
}

export function Tooltip({
  content,
  shortcut,
  side = "top",
  align = "center",
  delayDuration = 200,
  className,
  disabled = false,
  children,
}: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [coords, setCoords] = React.useState<{ top: number; left: number; actualSide: string } | null>(null)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const tooltipRef = React.useRef<HTMLDivElement | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const tooltipEl = tooltipRef.current
    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 120
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 32
    const PADDING = 8

    let targetSide = side
    let top = 0
    let left = 0

    // Collision detection & auto-flip
    if (targetSide === "top" && rect.top - tooltipHeight - PADDING < 0) {
      targetSide = "bottom"
    } else if (targetSide === "bottom" && rect.bottom + tooltipHeight + PADDING > window.innerHeight) {
      targetSide = "top"
    } else if (targetSide === "left" && rect.left - tooltipWidth - PADDING < 0) {
      targetSide = "right"
    } else if (targetSide === "right" && rect.right + tooltipWidth + PADDING > window.innerWidth) {
      targetSide = "left"
    }

    // Calculate Coordinates
    if (targetSide === "top") {
      top = rect.top - tooltipHeight - 6
      left =
        align === "start"
          ? rect.left
          : align === "end"
          ? rect.right - tooltipWidth
          : rect.left + rect.width / 2 - tooltipWidth / 2
    } else if (targetSide === "bottom") {
      top = rect.bottom + 6
      left =
        align === "start"
          ? rect.left
          : align === "end"
          ? rect.right - tooltipWidth
          : rect.left + rect.width / 2 - tooltipWidth / 2
    } else if (targetSide === "left") {
      top =
        align === "start"
          ? rect.top
          : align === "end"
          ? rect.bottom - tooltipHeight
          : rect.top + rect.height / 2 - tooltipHeight / 2
      left = rect.left - tooltipWidth - 6
    } else if (targetSide === "right") {
      top =
        align === "start"
          ? rect.top
          : align === "end"
          ? rect.bottom - tooltipHeight
          : rect.top + rect.height / 2 - tooltipHeight / 2
      left = rect.right + 6
    }

    // Viewport Boundary Clamping
    left = Math.max(PADDING, Math.min(window.innerWidth - tooltipWidth - PADDING, left))
    top = Math.max(PADDING, Math.min(window.innerHeight - tooltipHeight - PADDING, top))

    setCoords({ top, left, actualSide: targetSide })
  }, [side, align])

  const handleMouseEnter = () => {
    if (disabled || !content) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setIsOpen(true)
    }, delayDuration)
  }

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsOpen(false)
  }

  React.useEffect(() => {
    if (isOpen) {
      updatePosition()
      // Re-measure after tooltip renders in DOM
      const raf = requestAnimationFrame(() => {
        updatePosition()
      })
      window.addEventListener("scroll", updatePosition, true)
      window.addEventListener("resize", updatePosition)
      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener("scroll", updatePosition, true)
        window.removeEventListener("resize", updatePosition)
      }
    }
  }, [isOpen, updatePosition])

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const shortcuts = Array.isArray(shortcut) ? shortcut : shortcut ? [shortcut] : []

  // Ensure children is a valid single element or wrap it
  const childElement = React.isValidElement(children) ? (
    children
  ) : (
    <span className="inline-flex">{children}</span>
  )

  const trigger = React.cloneElement(childElement as React.ReactElement<any>, {
    ref: (el: HTMLElement | null) => {
      triggerRef.current = el
      const childRef = (childElement as any).ref
      if (typeof childRef === "function") {
        childRef(el)
      } else if (childRef && typeof childRef === "object" && "current" in childRef) {
        childRef.current = el
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter()
      ;(childElement as any).props.onMouseEnter?.(e)
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave()
      ;(childElement as any).props.onMouseLeave?.(e)
    },
    onFocus: (e: React.FocusEvent) => {
      handleMouseEnter()
      ;(childElement as any).props.onFocus?.(e)
    },
    onBlur: (e: React.FocusEvent) => {
      handleMouseLeave()
      ;(childElement as any).props.onBlur?.(e)
    },
  })

  return (
    <>
      {trigger}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && coords && (
              <motion.div
                ref={tooltipRef}
                role="tooltip"
                initial={{
                  opacity: 0,
                  scale: 0.94,
                  y: coords.actualSide === "top" ? 3 : coords.actualSide === "bottom" ? -3 : 0,
                  x: coords.actualSide === "left" ? 3 : coords.actualSide === "right" ? -3 : 0,
                }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                style={{
                  position: "fixed",
                  top: coords.top,
                  left: coords.left,
                  zIndex: 99999,
                  pointerEvents: "none",
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/95 text-white backdrop-blur-md rounded-xl border border-slate-700/80 shadow-xl shadow-slate-950/20 text-xs font-medium select-none max-w-xs break-words",
                  className
                )}
              >
                <span>{content}</span>
                {shortcuts.length > 0 && (
                  <div className="flex items-center gap-1 ml-1 shrink-0">
                    {shortcuts.map((sc, i) => (
                      <Kbd
                        key={i}
                        variant="dark"
                        size="xs"
                        className="text-[10px] px-1 py-0.5"
                      >
                        {sc}
                      </Kbd>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}

// Low-level shadcn/ui compound compatibility wrappers
interface TooltipContextValue {
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
}
const TooltipContext = React.createContext<TooltipContextValue | null>(null)

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function TooltipRoot({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      {children}
    </TooltipContext.Provider>
  )
}

export function TooltipTrigger({
  asChild,
  children,
  className,
  ...props
}: {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  [key: string]: any
}) {
  const ctx = React.useContext(TooltipContext)
  if (!ctx) return <>{children}</>

  const childElement = React.isValidElement(children) ? (
    children
  ) : (
    <span className={cn("inline-flex", className)}>{children}</span>
  )

  return React.cloneElement(childElement as React.ReactElement<any>, {
    ref: (el: HTMLElement | null) => {
      ;(ctx.triggerRef as React.MutableRefObject<HTMLElement | null>).current = el
      const childRef = (childElement as any).ref
      if (typeof childRef === "function") childRef(el)
      else if (childRef && typeof childRef === "object") childRef.current = el
    },
    onMouseEnter: (e: React.MouseEvent) => {
      ctx.setIsOpen(true)
      ;(childElement as any).props.onMouseEnter?.(e)
    },
    onMouseLeave: (e: React.MouseEvent) => {
      ctx.setIsOpen(false)
      ;(childElement as any).props.onMouseLeave?.(e)
    },
    ...props,
  })
}

export function TooltipContent({
  children,
  side = "top",
  align = "center",
  className,
  ...props
}: {
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
  className?: string
  [key: string]: any
}) {
  const ctx = React.useContext(TooltipContext)
  if (!ctx || !ctx.isOpen || typeof document === "undefined") return null

  const rect = ctx.triggerRef.current?.getBoundingClientRect()
  if (!rect) return null

  let top = rect.top - 36
  let left = rect.left + rect.width / 2 - 40
  if (side === "bottom") top = rect.bottom + 6
  if (side === "left") {
    top = rect.top + rect.height / 2 - 16
    left = rect.left - 80
  }
  if (side === "right") {
    top = rect.top + rect.height / 2 - 16
    left = rect.right + 6
  }

  return createPortal(
    <div
      role="tooltip"
      style={{ position: "fixed", top, left, zIndex: 99999, pointerEvents: "none" }}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/95 text-white backdrop-blur-md rounded-xl border border-slate-700/80 shadow-xl shadow-slate-950/20 text-xs font-medium select-none max-w-xs break-words",
        className
      )}
      {...props}
    >
      {children}
    </div>,
    document.body
  )
}

export default Tooltip
