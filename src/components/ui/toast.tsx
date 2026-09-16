"use client"

import React from "react"
import { toast as sonnerToast, Toaster as SonnerToaster } from "@/components/reui/sonner"

export interface ToastItem {
  id: string
  type: "success" | "error" | "info" | "loading" | "warning"
  title: string
  description?: string
  duration?: number
  onClick?: () => void
}

export interface ToastOptions {
  id?: string | number
  duration?: number
  action?: {
    label: React.ReactNode
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  }
  cancel?: {
    label: React.ReactNode
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  }
  onClick?: () => void
  onDismiss?: () => void
  onAutoClose?: () => void
  description?: React.ReactNode
  icon?: React.ReactNode
  important?: boolean
  closeButton?: boolean
}

let lastToastSig = ""
let lastToastTime = 0

function isRecentDuplicate(title: string, type: string): boolean {
  const now = Date.now()
  const sig = `${type}::${title}`
  if (sig === lastToastSig && now - lastToastTime < 300) {
    return true
  }
  lastToastSig = sig
  lastToastTime = now
  return false
}

function normalizeOptions(
  descriptionOrOptions?: string | React.ReactNode | ToastOptions,
  options?: ToastOptions
): ToastOptions {
  if (descriptionOrOptions === undefined || descriptionOrOptions === null) {
    return options || {}
  }
  if (
    typeof descriptionOrOptions === "string" ||
    React.isValidElement(descriptionOrOptions)
  ) {
    const merged: ToastOptions = {
      description: descriptionOrOptions,
      ...options,
    }
    if (options?.onClick && !merged.action) {
      merged.action = {
        label: "Xem chi tiết",
        onClick: () => options.onClick!(),
      }
    }
    return merged
  }
  const opts = descriptionOrOptions as ToastOptions
  if (opts.onClick && !opts.action) {
    return {
      ...opts,
      action: {
        label: "Xem chi tiết",
        onClick: () => opts.onClick!(),
      },
    }
  }
  return opts
}

export const toast = Object.assign(
  (message: React.ReactNode, options?: ToastOptions) => {
    return sonnerToast(message, options as any)
  },
  {
    success: (
      title: string | React.ReactNode,
      descriptionOrOptions?: string | React.ReactNode | ToastOptions,
      options?: ToastOptions
    ) => {
      const titleStr = typeof title === "string" ? title : ""
      if (titleStr && isRecentDuplicate(titleStr, "success")) {
        return lastToastSig
      }
      const opts = normalizeOptions(descriptionOrOptions, options)
      return sonnerToast.success(title, opts as any)
    },

    error: (
      title: string | React.ReactNode,
      descriptionOrOptions?: string | React.ReactNode | ToastOptions,
      options?: ToastOptions
    ) => {
      const titleStr = typeof title === "string" ? title : ""
      if (titleStr && isRecentDuplicate(titleStr, "error")) {
        return lastToastSig
      }
      const opts = normalizeOptions(descriptionOrOptions, options)
      return sonnerToast.error(title, opts as any)
    },

    warning: (
      title: string | React.ReactNode,
      descriptionOrOptions?: string | React.ReactNode | ToastOptions,
      options?: ToastOptions
    ) => {
      const opts = normalizeOptions(descriptionOrOptions, options)
      return sonnerToast.warning(title, opts as any)
    },

    info: (
      title: string | React.ReactNode,
      descriptionOrOptions?: string | React.ReactNode | ToastOptions,
      options?: ToastOptions
    ) => {
      const opts = normalizeOptions(descriptionOrOptions, options)
      return sonnerToast.info(title, opts as any)
    },

    loading: (
      title: string | React.ReactNode,
      descriptionOrOptions?: string | React.ReactNode | ToastOptions,
      options?: ToastOptions
    ) => {
      const opts = normalizeOptions(descriptionOrOptions, options)
      return sonnerToast.loading(title, opts as any)
    },

    promise: sonnerToast.promise,
    custom: sonnerToast.custom,
    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
    clear: () => sonnerToast.dismiss(),
  }
)

if (typeof window !== "undefined") {
  (window as any).appToast = toast
}

export { Toaster } from "@/components/reui/sonner"
