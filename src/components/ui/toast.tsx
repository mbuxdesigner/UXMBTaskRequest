import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, AlertTriangle, Loader2, Info, Sparkles } from "lucide-react"

export interface ToastItem {
  id: string
  type: "success" | "error" | "info" | "loading"
  title: string
  description?: string
  duration?: number
}

type ToastListener = (toasts: ToastItem[]) => void

let toasts: ToastItem[] = []
const listeners = new Set<ToastListener>()

function notify() {
  listeners.forEach((listener) => listener([...toasts]))
}

export const toast = {
  loading: (title: string, description?: string, options?: { id?: string }) => {
    const id = options?.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const existingIndex = toasts.findIndex((t) => t.id === id)
    const newToast: ToastItem = { id, type: "loading", title, description }

    if (existingIndex >= 0) {
      toasts[existingIndex] = newToast
    } else {
      toasts.push(newToast)
    }
    notify()
    return id
  },

  success: (title: string, description?: string, options?: { id?: string; duration?: number }) => {
    const id = options?.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const duration = options?.duration ?? 3500
    const existingIndex = toasts.findIndex((t) => t.id === id)
    const newToast: ToastItem = { id, type: "success", title, description, duration }

    if (existingIndex >= 0) {
      toasts[existingIndex] = newToast
    } else {
      toasts.push(newToast)
    }
    notify()

    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id)
      }, duration)
    }
    return id
  },

  error: (title: string, description?: string, options?: { id?: string; duration?: number }) => {
    const id = options?.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const duration = options?.duration ?? 4500
    const existingIndex = toasts.findIndex((t) => t.id === id)
    const newToast: ToastItem = { id, type: "error", title, description, duration }

    if (existingIndex >= 0) {
      toasts[existingIndex] = newToast
    } else {
      toasts.push(newToast)
    }
    notify()

    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id)
      }, duration)
    }
    return id
  },

  info: (title: string, description?: string, options?: { id?: string; duration?: number }) => {
    const id = options?.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const duration = options?.duration ?? 3500
    const existingIndex = toasts.findIndex((t) => t.id === id)
    const newToast: ToastItem = { id, type: "info", title, description, duration }

    if (existingIndex >= 0) {
      toasts[existingIndex] = newToast
    } else {
      toasts.push(newToast)
    }
    notify()

    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id)
      }, duration)
    }
    return id
  },

  dismiss: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id)
    notify()
  },

  clear: () => {
    toasts = []
    notify()
  }
}

/**
 * Premium ReUI / Sonner-Grade Toast Notification Container
 */
export function Toaster() {
  const [activeToasts, setActiveToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const handleUpdate = (updated: ToastItem[]) => {
      setActiveToasts(updated)
    }
    listeners.add(handleUpdate)
    return () => {
      listeners.delete(handleUpdate)
    }
  }, [])

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {activeToasts.map((item) => {
          const isSuccess = item.type === "success"
          const isLoading = item.type === "loading"
          const isError = item.type === "error"

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88, y: 12, transition: { duration: 0.18, ease: "easeOut" } }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="pointer-events-auto relative group flex items-start gap-3 p-3.5 bg-[#0F172A]/95 text-slate-100 rounded-2xl border border-slate-700/60 shadow-2xl shadow-slate-950/60 backdrop-blur-xl ring-1 ring-white/10 select-none overflow-hidden"
            >
              {/* Subtle Top Glow Gradient */}
              <div 
                className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${
                  isLoading
                    ? "from-transparent via-blue-400 to-transparent"
                    : isSuccess
                    ? "from-transparent via-emerald-400 to-transparent"
                    : isError
                    ? "from-transparent via-rose-400 to-transparent"
                    : "from-transparent via-indigo-400 to-transparent"
                }`} 
              />

              {/* Status Icon with Glow Backlight */}
              <div className="shrink-0 mt-0.5">
                {isLoading && (
                  <div className="w-6 h-6 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-xs shadow-blue-500/20">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                )}
                {isSuccess && (
                  <div className="w-6 h-6 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-xs shadow-emerald-500/20">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
                {isError && (
                  <div className="w-6 h-6 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-xs shadow-rose-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                )}
                {!isLoading && !isSuccess && !isError && (
                  <div className="w-6 h-6 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-xs shadow-indigo-500/20">
                    <Info className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0 pr-1">
                <p className="text-xs font-semibold text-slate-100 leading-snug tracking-tight">
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-normal">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Dismiss Close Button */}
              {!isLoading && (
                <button
                  type="button"
                  onClick={() => toast.dismiss(item.id)}
                  className="shrink-0 -mr-1 -mt-0.5 w-5 h-5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                  title="Đóng thông báo"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
