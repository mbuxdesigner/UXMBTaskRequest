import React, { useEffect } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface RightSheetProps {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  bodyClassName?: string
  closeDisabled?: boolean
}

const WIDTHS = {
  sm: "sm:w-[420px]",
  md: "sm:w-[520px]",
  lg: "sm:w-[720px]",
  xl: "sm:w-[920px]",
}

export function RightSheet({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "md",
  className,
  bodyClassName,
  closeDisabled = false,
}: RightSheetProps) {
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closeDisabled) onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onClose, closeDisabled])

  if (typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <motion.button
            type="button"
            aria-label="Đóng"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 h-full w-full bg-slate-950/30 backdrop-blur-[2px]"
            onClick={() => !closeDisabled && onClose()}
          />
          <div className="pointer-events-none absolute inset-0 flex justify-end sm:p-3 sm:pl-16">
            <motion.aside
              role="dialog"
              aria-modal="true"
              initial={{ x: "100%", opacity: 0.65 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.65 }}
              transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.9 }}
              className={cn(
                "pointer-events-auto flex h-full w-full max-w-full flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl sm:border sm:border-slate-200/90",
                WIDTHS[size],
                className,
              )}
            >
              <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  {icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">{icon}</span>}
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-slate-950">{title}</h2>
                    {description && <p className="mt-0.5 truncate text-xs text-slate-500">{description}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={closeDisabled}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Đóng sheet"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
              <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName)}>{children}</div>
              {footer && <footer className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">{footer}</footer>}
            </motion.aside>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
