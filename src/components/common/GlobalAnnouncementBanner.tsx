import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X, ExternalLink } from "lucide-react"
import { getSystemConfig, SYSTEM_CONFIG_EVENT_NAME, GlobalAnnouncementBanner as BannerConfig } from "@/config/systemConfig"

export default function GlobalAnnouncementBanner() {
  const [bannerConfig, setBannerConfig] = useState<BannerConfig>(() => getSystemConfig().portal.announcement)
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem("ux_announcement_dismissed") === "true"
    }
    return false
  })

  useEffect(() => {
    const handleConfigChange = (e: any) => {
      if (e.detail?.portal?.announcement) {
        setBannerConfig(e.detail.portal.announcement)
        // Khi admin cập nhật nội dung mới, tự động mở lại nếu bị đóng trước đó
        setIsDismissed(false)
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem("ux_announcement_dismissed")
        }
      }
    }

    window.addEventListener(SYSTEM_CONFIG_EVENT_NAME, handleConfigChange)
    return () => window.removeEventListener(SYSTEM_CONFIG_EVENT_NAME, handleConfigChange)
  }, [])

  if (!bannerConfig?.enabled || isDismissed || !bannerConfig?.message?.trim()) {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("ux_announcement_dismissed", "true")
    }
  }

  const styleMap = {
    info: {
      bg: "bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white",
      badge: "bg-blue-500/20 text-blue-200 border-blue-400/30",
      icon: <Info className="w-4 h-4 text-blue-300 shrink-0" />,
      link: "text-blue-300 hover:text-white border-blue-400/40 hover:border-white",
    },
    warning: {
      bg: "bg-gradient-to-r from-amber-900 via-amber-800 to-slate-900 text-amber-50",
      badge: "bg-amber-500/20 text-amber-200 border-amber-400/30",
      icon: <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />,
      link: "text-amber-200 hover:text-white border-amber-400/40 hover:border-white",
    },
    success: {
      bg: "bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-emerald-50",
      badge: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />,
      link: "text-emerald-200 hover:text-white border-emerald-400/40 hover:border-white",
    },
    destructive: {
      bg: "bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 text-rose-50",
      badge: "bg-rose-500/20 text-rose-200 border-rose-400/30",
      icon: <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />,
      link: "text-rose-200 hover:text-white border-rose-400/40 hover:border-white",
    },
  }

  const theme = styleMap[bannerConfig.type] || styleMap.info

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Thông báo hệ thống"
        role="region"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className={`w-full overflow-hidden border-b border-white/10 ${theme.bg} shadow-md relative z-40 select-none`}
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {theme.icon}
            <span className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border ${theme.badge}`}>
              Thông báo hệ thống
            </span>
            <p className="truncate font-medium tracking-tight">
              {bannerConfig.message}
            </p>
            {bannerConfig.linkUrl && (
              <a
                href={bannerConfig.linkUrl}
                target="_blank"
                rel="noreferrer"
                className={`hidden md:inline-flex items-center gap-1 font-semibold underline underline-offset-4 shrink-0 transition-colors ml-1 ${theme.link}`}
              >
                <span>{bannerConfig.linkText || "Chi tiết"}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {bannerConfig.linkUrl && (
              <a
                href={bannerConfig.linkUrl}
                target="_blank"
                rel="noreferrer"
                className={`md:hidden inline-flex items-center gap-1 font-semibold underline shrink-0 ${theme.link}`}
              >
                <span>{bannerConfig.linkText || "Chi tiết"}</span>
              </a>
            )}
            {bannerConfig.dismissible && (
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}
