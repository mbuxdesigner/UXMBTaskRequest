import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, CheckCircle2, AlertCircle, Info, X } from "lucide-react"

export interface ToastItem {
  id: string
  type: "loading" | "success" | "error" | "info"
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
  loading: (title: string, description?: string, options?: { id?: string }): string => {
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

  success: (title: string, description?: string, options?: { id?: string; duration?: number }): string => {
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

  error: (title: string, description?: string, options?: { id?: string; duration?: number }): string => {
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

  info: (title: string, description?: string, options?: { id?: string; duration?: number }): string => {
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
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
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
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 10, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-md transition-all ${
                isLoading
                  ? "bg-white/95 text-slate-900 border-blue-200 shadow-blue-500/5 ring-1 ring-blue-500/10"
                  : isSuccess
                  ? "bg-white/95 text-slate-900 border-emerald-200 shadow-emerald-500/5 ring-1 ring-emerald-500/10"
                  : isError
                  ? "bg-white/95 text-slate-900 border-rose-200 shadow-rose-500/5 ring-1 ring-rose-500/10"
                  : "bg-white/95 text-slate-900 border-slate-200 shadow-slate-500/5"
              }`}
            >
              {/* Icon */}
              <div className="shrink-0 mt-0.5">
                {isLoading && (
                  <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#1057FB] flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}
                {isSuccess && (
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  </div>
                )}
                {isError && (
                  <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                  </div>
                )}
                {!isLoading && !isSuccess && !isError && (
                  <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pr-1">
                <p className="text-xs font-bold text-slate-900 leading-snug">
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Close button */}
              {!isLoading && (
                <button
                  type="button"
                  onClick={() => toast.dismiss(item.id)}
                  className="shrink-0 -mr-1 -mt-1 w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
