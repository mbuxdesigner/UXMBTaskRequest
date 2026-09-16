"use client"

import React from "react"
import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner"
import { Check, AlertTriangle, AlertCircle, Info, Loader2 } from "lucide-react"
import "sonner/dist/styles.css"

export type ToasterProps = React.ComponentProps<typeof SonnerToaster>

/**
 * ReUI Sonner Toaster Component
 * Chuẩn hóa theo thông số thiết kế ReUI (https://reui.io/components/sonner)
 * - Tự động xếp chồng (stacked cards) với chiều sâu 3D (expand={false}, visibleToasts={4})
 * - Bung mở mượt mà khi rê chuột (hover expand)
 * - Nút hành động Dark Navy (#0F172A), nút hủy Slate-100, nút đóng CloseButton bo tròn
 * - Icon trạng thái chuẩn token MB Bank UX (Emerald, Rose, Amber, Blue)
 */
export function Toaster({
  position = "bottom-right",
  visibleToasts = 4,
  expand = false,
  closeButton = true,
  duration = 4000,
  className = "toaster group",
  ...props
}: ToasterProps) {
  return (
    <SonnerToaster
      position={position}
      visibleToasts={visibleToasts}
      expand={expand}
      closeButton={closeButton}
      duration={duration}
      className={className}
      style={{
        '--toast-close-button-start': 'unset',
        '--toast-close-button-end': '10px',
        '--toast-close-button-transform': 'none',
      } as React.CSSProperties}
      icons={{
        success: (
          <div className="w-6 h-6 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs self-start mt-0.5">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        ),
        error: (
          <div className="w-6 h-6 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0 shadow-2xs self-start mt-0.5">
            <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        ),
        warning: (
          <div className="w-6 h-6 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs self-start mt-0.5">
            <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        ),
        info: (
          <div className="w-6 h-6 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0 shadow-2xs self-start mt-0.5">
            <Info className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        ),
        loading: (
          <div className="w-6 h-6 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs self-start mt-0.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </div>
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans rounded-2xl border border-slate-200/90 bg-white text-slate-900 shadow-xl shadow-slate-950/10 p-3.5 !flex !items-start gap-3 select-none transition-all duration-300 data-[styled=true]:bg-white data-[styled=true]:text-slate-900 hover:shadow-2xl hover:border-slate-300",
          title: "text-xs font-semibold text-slate-900 leading-snug tracking-tight",
          description: "text-[11px] text-slate-500 mt-0.5 leading-relaxed font-normal",
          actionButton:
            "inline-flex items-center justify-center font-semibold text-xs h-7 px-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-colors cursor-pointer shrink-0 active:scale-95",
          cancelButton:
            "inline-flex items-center justify-center font-medium text-xs h-7 px-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer shrink-0 active:scale-95",
          closeButton:
            "!w-6 !h-6 !rounded-lg !border !border-slate-200 !bg-white !text-slate-400 hover:!text-slate-900 hover:!bg-slate-100 !shadow-xs !transition-colors cursor-pointer !top-2.5 !right-2.5 !left-auto !transform-none",
          success: "!border-emerald-200/90 !bg-white",
          error: "!border-rose-200/90 !bg-white",
          warning: "!border-amber-200/90 !bg-white",
          info: "!border-blue-200/90 !bg-white",
        },
      }}
      {...props}
    />
  )
}

export { sonnerToast as toast }
