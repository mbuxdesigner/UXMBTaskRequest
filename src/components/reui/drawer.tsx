import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { springs } from "@/lib/motion"

export type DrawerSide = "right" | "left" | "top" | "bottom"
export type DrawerSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full"

interface DrawerContextValue {
  onClose: () => void
  side: DrawerSide
}

const DrawerContext = React.createContext<DrawerContextValue | null>(null)

export function useDrawer() {
  const context = React.useContext(DrawerContext)
  if (!context) {
    throw new Error("useDrawer must be used within a Drawer component")
  }
  return context
}

export interface DrawerProps {
  open: boolean
  onClose: () => void
  side?: DrawerSide
  size?: DrawerSize
  children: React.ReactNode
  className?: string
  overlayClassName?: string
  hideCloseButton?: boolean
}

const sideVariants: Record<DrawerSide, Variants> = {
  right: {
    initial: { x: "100%", opacity: 0.5 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  },
  left: {
    initial: { x: "-100%", opacity: 0.5 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  },
  top: {
    initial: { y: "-100%", opacity: 0.5 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "-100%", opacity: 0 },
  },
  bottom: {
    initial: { y: "100%", opacity: 0.5 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  },
}

const horizontalSizes: Record<DrawerSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "2xl": "max-w-3xl",
  full: "max-w-full",
}

const verticalSizes: Record<DrawerSize, string> = {
  sm: "max-h-60",
  md: "max-h-96",
  lg: "max-h-[60vh]",
  xl: "max-h-[80vh]",
  "2xl": "max-h-[90vh]",
  full: "h-screen",
}

export function Drawer({
  open,
  onClose,
  side = "right",
  size = "md",
  children,
  className,
  overlayClassName,
}: DrawerProps) {
  // Lock body scroll and handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose()
      }
    }

    if (open) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.body.style.overflow = "unset"
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onClose])

  const isHorizontal = side === "left" || side === "right"
  const sizeClass = isHorizontal ? horizontalSizes[size] : verticalSizes[size]

  const positionClasses = {
    right: "inset-y-0 right-0 border-l",
    left: "inset-y-0 left-0 border-r",
    top: "inset-x-0 top-0 border-b",
    bottom: "inset-x-0 bottom-0 border-t",
  }[side]

  const content = (
    <DrawerContext.Provider value={{ onClose, side }}>
      <AnimatePresence>
        {open && (
          <motion.div
            key="reui-drawer-root"
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-50 overflow-hidden select-none"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "fixed inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer",
                overlayClassName
              )}
              onClick={onClose}
              aria-hidden="true"
            />

            {/* Slide-over Container */}
            <motion.div
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              variants={sideVariants[side]}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springs.gentle}
              className={cn(
                "fixed flex flex-col bg-white shadow-2xl border-slate-200 w-full focus:outline-none",
                positionClasses,
                sizeClass,
                className
              )}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DrawerContext.Provider>
  )

  if (typeof document !== "undefined") {
    return createPortal(content, document.body)
  }
  return content
}

export function DrawerHeader({
  className,
  children,
  showClose = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { showClose?: boolean }) {
  const { onClose } = useDrawer()

  return (
    <div
      className={cn(
        "px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0 bg-white",
        className
      )}
      {...props}
    >
      <div className="min-w-0 flex-1 space-y-0.5">{children}</div>
      {showClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 -mr-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

export function DrawerTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-bold text-slate-900 tracking-tight", className)}
      {...props}
    />
  )
}

export function DrawerDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-slate-500 font-normal leading-relaxed", className)}
      {...props}
    />
  )
}

export function DrawerBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("p-6 overflow-y-auto flex-1 space-y-4", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function DrawerFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DrawerClose({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onClose } = useDrawer()

  return (
    <button
      type="button"
      onClick={onClose}
      className={cn("cursor-pointer select-none", className)}
      {...props}
    >
      {children}
    </button>
  )
}

export default Drawer
