import { useState, lazy, Suspense, useEffect } from "react"

import type { Page } from "./components/Sidebar"

import LoginGate from "./components/auth/LoginGate"

import { Skeleton } from "@/components/ui/skeleton"

import {
  PageSkeleton,
  DashboardSkeleton,
  GridCardsSkeleton,
  FormSkeleton,
  ManagementSkeleton,
} from "@/components/common/ReuiSkeletons"

import { motion, AnimatePresence, MotionConfig } from "framer-motion"

import { Frame } from "@/components/reui/frame"

import { Button } from "@/components/ui/button"

import { Badge } from "@/components/ui/badge"

import { Plus, ArrowLeft, LogOut } from "lucide-react"

import BrandLogo from "@/components/common/BrandLogo"

import { Toaster } from "@/components/ui/toast"

import AppHeader from "@/components/common/AppHeader"

import {
  getStoredSession,
  logoutTeamsSession,
  getUserInitials,
  UserSession,
  syncSessionRoleFromSheet,
} from "./services/otpAuthService"

import Sidebar from "./components/Sidebar"
import { RolePreviewBanner } from "./components/common/RolePreviewBanner"
import TongQuanPage from "./pages/TongQuanPage"
import CreateRequestPage from "./pages/CreateRequestPage"
import TrackRequestPage from "./pages/TrackRequestPage"
import QuanLyPage from "./pages/QuanLyPage"
import TestAssessmentPage from "./pages/TestAssessmentPage"
import ImageCompressorPage from "./pages/ImageCompressorPage"

// Route Preloaders (maintained for interface compatibility)
export const preloadPage = (_page: Page) => {}

function PageLoadingSkeleton({ page }: { page: Page }) {
  switch (page) {
    case "overview":
      return <DashboardSkeleton />

    case "track":
      return <GridCardsSkeleton cardCount={6} />

    case "create":
      return <FormSkeleton />

    case "manage":
      return <ManagementSkeleton />

    default:
      return <PageSkeleton />
  }
}

export default function App() {
  const [session, setSession] = useState<UserSession | null>(getStoredSession())

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("app_sidebar_collapsed") === "true"
  })

  const [page, setPage] = useState<Page>(() => {
    const s = getStoredSession()

    const hash = window.location.hash.replace(/^#/, "").split("?")[0]

    if (s?.role === "PO") return "track"

    // Nếu có hash cụ thể hợp lệ (khác manage khi chưa có quyền)

    if (
      hash === "track" ||
      hash === "overview" ||
      hash === "create" ||
      hash === "test" ||
      hash === "compressor"
    ) {
      return hash as Page
    }

    if (hash === "manage" || hash === "admin") {
      if (s) return "manage"
    }

    return "overview"
  })

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev

      localStorage.setItem("app_sidebar_collapsed", String(next))

      return next
    })
  }

  // Chuyển trang mượt mà bằng View Transitions API (Modern Web Guidance)

  const handleNavigate = (newPage: Page) => {
    if (page === newPage) return
    setPage(newPage)
    window.location.hash = `#${newPage}`
  }

  // Đồng bộ tiêu đề trang (Document Title) theo từng ngữ cảnh nghiệp vụ

  useEffect(() => {
    const pageTitles: Record<Page, string> = {
      overview: "Tổng quan & Tiến độ — MB UX Request Portal",

      track: "Quản lý & Theo dõi Task — MB UX Request Portal",

      create: "Tạo yêu cầu thiết kế mới — MB UX Request Portal",

      manage: "Quản trị hệ thống & Cấu hình — MB UX Request Portal",

      test: "Khảo sát & Đánh giá năng lực UX — MB UX Request Portal",

      compressor: "Công cụ nén ảnh Client-side — MB UX Request Portal",
    }

    document.title =
      pageTitles[page] || "MB UX Request Portal - MB Bank UX Team"
  }, [page])

  // Lắng nghe sự kiện thay đổi phiên (Đăng nhập / Đăng xuất)

  useEffect(() => {
    const handleAuthChange = () => {
      const current = getStoredSession()

      setSession(current)

      if (current?.role === "PO") {
        setPage("track")

        window.location.hash = "#track"
      }
    }

    window.addEventListener("auth_session_changed", handleAuthChange)

    const interval = setInterval(() => {
      const current = getStoredSession()

      if (!current && session) {
        setSession(null)
      }
    }, 5000)

    return () => {
      window.removeEventListener("auth_session_changed", handleAuthChange)

      clearInterval(interval)
    }
  }, [session])

  // Tự động kiểm tra và đồng bộ vai trò mới nhất từ Google Sheet USERS khi có phiên đăng nhập

  useEffect(() => {
    if (session && !session.isImpersonating) {
      syncSessionRoleFromSheet().then((synced) => {
        if (synced && synced.role !== session.role) {
          setSession(synced)
        }
      })
    }
  }, [session?.personalEmail, session?.teamsEmail])

  // Lắng nghe và đồng bộ URL Hash (#track, #overview, #create, #admin) và Custom Navigation Event

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, "").split("?")[0]

      const current = getStoredSession()

      if (hash === "manage" || hash === "admin") {
        // Chỉ tài khoản có vai trò Admin mới được phép vào trang quản trị hệ thống

        if (!current || current.role !== "Admin") {
          const fallback: Page =
            current?.role === "PO" || current?.role === "Business"
              ? "track"
              : "overview"

          setPage((prev) => (prev !== fallback ? fallback : prev))
          window.location.hash = `#${fallback}`
          return
        }

        setPage((prev) => (prev !== "manage" ? "manage" : prev))
        return
      }

      if (
        hash === "track" ||
        hash === "overview" ||
        hash === "create" ||
        hash === "test" ||
        hash === "compressor"
      ) {
        setPage((prev) => (prev !== (hash as Page) ? (hash as Page) : prev))
      }
    }

    syncFromHash()

    window.addEventListener("hashchange", syncFromHash)

    const handleCustomNav = (e: Event) => {
      const customEvent = e as CustomEvent

      if (customEvent.detail?.page) {
        const target = customEvent.detail.page as Page
        setPage((prev) => (prev !== target ? target : prev))
      }
    }

    window.addEventListener("app_navigate", handleCustomNav)

    return () => {
      window.removeEventListener("hashchange", syncFromHash)

      window.removeEventListener("app_navigate", handleCustomNav)
    }
  }, [])

  // Tự động chuyển PO & Business về màn hình "Yêu cầu của tôi" khi đăng nhập, chặn non-Admin vào manage

  useEffect(() => {
    if (session && session.role !== "Admin" && page === "manage") {
      const fallback: Page =
        session.role === "PO" || session.role === "Business"
          ? "track"
          : "overview"

      setPage(fallback)

      window.location.hash = `#${fallback}`
    } else if (
      (session?.role === "PO" || session?.role === "Business") &&
      page === "overview"
    ) {
      setPage("track")

      window.location.hash = "#track"
    }
  }, [session?.role, page])

  // Background prefetch remaining pages during browser idle time



  const handleLogout = async () => {
    await logoutTeamsSession()

    setSession(null)

    setPage("overview")

    window.location.hash = "#overview"
  }

  // NẾU CHƯA ĐĂNG NHẬP HOẶC HẾT HẠN PHIÊN -> HIỂN THỊ MÀN HÌNH LOGIN GATE

  if (!session) {
    return (
      <MotionConfig reducedMotion="user">
        <LoginGate
          onAuthSuccess={(newSession) => {
            setSession(newSession)

            // Mặc định đăng nhập: PO/Business về Track Task (#track), Designer/Admin/Khác về Tổng quan Dashboard (#overview)

            // Tuyệt đối không giữ URL cũ #manage từ phiên trước

            const defaultPage: Page =
              newSession.role === "PO" || newSession.role === "Business"
                ? "track"
                : "overview"

            setPage(defaultPage)

            window.location.hash = `#${defaultPage}`
          }}
        />
      </MotionConfig>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#FCFCFD]">
        {/* Role Impersonation / Preview Floating Controller */}
        <RolePreviewBanner session={session} />

        <Sidebar
          currentPage={page}
          onNavigate={handleNavigate}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />

        {/* Container chính: Offset theo sidebar w-60 (240px) */}
        <div className="md:ml-60 min-h-screen bg-[#FCFCFD] flex flex-col">
          {/* ReUI App Shell 12 Global Sticky Header */}
          <AppHeader
            currentPage={page}
            onNavigate={handleNavigate}
            session={session}
            onToggleMobileMenu={() =>
              window.dispatchEvent(new Event("toggle_mobile_sidebar"))
            }
          />

          {/* Main Content View */}
          <div className="flex-1 w-full px-6 py-6 lg:px-8 lg:py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="w-full"
              >
                {page === "overview" && <TongQuanPage />}
                {page === "create" && (
                  <CreateRequestPage onBack={() => handleNavigate("track")} />
                )}
                {page === "track" && (
                  <TrackRequestPage
                    onNavigateToCreate={() => handleNavigate("create")}
                  />
                )}
                {page === "manage" && <QuanLyPage />}
                {page === "test" && <TestAssessmentPage />}
                {page === "compressor" && <ImageCompressorPage />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ReUI App Shell 12 Footer */}
          <footer className="w-full border-t border-slate-200/80 px-6 lg:px-8 py-3.5 flex items-center text-xs text-slate-500 bg-white/50">
            <div>2026 © MBBank UX Platform</div>
          </footer>
        </div>

        {/* Global Toast Provider */}
        <Toaster />
      </div>
    </MotionConfig>
  )
}
