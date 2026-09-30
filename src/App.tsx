import { useState, lazy, Suspense, useEffect, useRef } from "react"

import type { Page } from "./components/Sidebar"

import LoginGate from "./components/auth/LoginGate"
import SessionExpiredModal from "./components/auth/SessionExpiredModal"

import { Skeleton } from "@/components/ui/skeleton"

import {
  PageSkeleton,
  DashboardSkeleton,
  GridCardsSkeleton,
  FormSkeleton,
  ManagementSkeleton,
} from "@/components/common/ReuiSkeletons"

import { motion, AnimatePresence, MotionConfig } from "framer-motion"
import { pageContainerVariants } from "@/lib/motion"

import { Frame } from "@/components/reui/frame"

import { Button } from "@/components/ui/button"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { Plus, ArrowLeft, LogOut } from "lucide-react"

import BrandLogo from "@/components/common/BrandLogo"

import { Toaster, toast } from "@/components/ui/toast"

import AppHeader from "@/components/common/AppHeader"
import GlobalAnnouncementBanner from "@/components/common/GlobalAnnouncementBanner"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"

import {
  getStoredSession,
  logoutTeamsSession,
  clearSession,
  getUserInitials,
  UserSession,
  syncSessionRoleFromSheet,
  refreshAllDataOnLogin,
} from "./services/otpAuthService"

import Sidebar from "./components/Sidebar"
import { RolePreviewBanner } from "./components/common/RolePreviewBanner"
import { getRoleNavConfig, DEFAULT_ROLE_NAV_CONFIG } from "@/config/navVisibilityConfig"
import { canRoleAccessCapability } from "@/lib/accessControl"
import type { UserRole } from "./data/mockData"

const TongQuanPage = lazy(() => import("./pages/TongQuanPage"))
const CreateRequestPage = lazy(() => import("./pages/CreateRequestPage"))
const TrackRequestPage = lazy(() => import("./pages/TrackRequestPage"))
const QuanLyPage = lazy(() => import("./pages/QuanLyPage"))
const TestAssessmentPage = lazy(() => import("./pages/TestAssessmentPage"))
const ImageCompressorPage = lazy(() => import("./pages/ImageCompressorPage"))
const IAPage = lazy(() => import("./pages/IAPage"))
const CalendarPage = lazy(() => import("./pages/DesignerPlannerPage"))

// Route Preloaders (dynamic import on demand)
export const preloadPage = (targetPage: Page) => {
  switch (targetPage) {
    case "overview":
      import("./pages/TongQuanPage")
      break
    case "create":
      import("./pages/CreateRequestPage")
      break
    case "track":
      import("./pages/TrackRequestPage")
      break
    case "calendar":
      import("./pages/DesignerPlannerPage")
      break
    case "manage":
      import("./pages/QuanLyPage")
      break
    case "test":
      import("./pages/TestAssessmentPage")
      break
    case "compressor":
      import("./pages/ImageCompressorPage")
      break
    case "ia":
      import("./pages/IAPage")
      break
  }
}

function PageLoadingSkeleton({ page }: { page: Page }) {
  switch (page) {
    case "overview":
    case "calendar":
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

  // Rehydrate cloud-backed admin configuration on every browser/device.
  // localStorage is origin- and device-specific, so it cannot be the source
  // of truth for navigation visibility, ordering, members, or task data.
  useEffect(() => {
    if (!session?.sessionToken) return
    refreshAllDataOnLogin().catch(() => {})
    // Fresh logins already trigger the same bootstrap from LoginGate. This
    // effect is intentionally mount-only for restored sessions after reload.
  }, [])

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("app_sidebar_collapsed") === "true"
  })

  const isPageAllowedForRole = (targetPage: Page, role?: UserRole): boolean => {
    if (!role) return true
    if (targetPage === "ia") {
      const canView = canRoleAccessCapability(role, "cap-ia-view")
      const navConfig = getRoleNavConfig()
      const visibility = navConfig[role] || DEFAULT_ROLE_NAV_CONFIG[role] || DEFAULT_ROLE_NAV_CONFIG.Designer
      return canView && Boolean(visibility.ia)
    }
    if (targetPage === "test") return true
    const navConfig = getRoleNavConfig()
    const visibility = navConfig[role] || DEFAULT_ROLE_NAV_CONFIG[role] || DEFAULT_ROLE_NAV_CONFIG.Designer
    if (targetPage === "manage") return Boolean(visibility.manage)
    return Boolean(visibility[targetPage])
  }

  const [page, setPage] = useState<Page>(() => {
    const s = getStoredSession()
    const rawHash = window.location.hash.replace(/^#/, "").split("?")[0] as Page
    const validPages: Page[] = ["track", "overview", "create", "test", "compressor", "manage", "ia", "calendar"]
    const targetPage = validPages.includes(rawHash)
      ? rawHash
      : (s?.role === "PO" || s?.role === "Business"
          ? (isPageAllowedForRole("overview", s.role) ? "overview" : "track")
          : "overview")

    if (s?.role && !isPageAllowedForRole(targetPage, s.role)) {
      return isPageAllowedForRole("track", s.role) ? "track" : "create"
    }

    return targetPage
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
    const userRole = session?.role
    if (userRole && !isPageAllowedForRole(newPage, userRole)) {
      const fallback = isPageAllowedForRole("track", userRole) ? "track" : "create"
      setPage(fallback)
      window.location.hash = `#${fallback}`
      return
    }
    if (page === newPage) return
    setPage(newPage)
    window.location.hash = `#${newPage}`
  }

  // Lắng nghe sự kiện thay đổi cấu hình điều hướng (RBAC Navigation) & phân quyền
  const [navVersion, setNavVersion] = useState(0)
  useEffect(() => {
    const handleNavChange = () => setNavVersion((v) => v + 1)
    window.addEventListener("nav_visibility_changed", handleNavChange)
    window.addEventListener("rbac_permissions_changed", handleNavChange)
    return () => {
      window.removeEventListener("nav_visibility_changed", handleNavChange)
      window.removeEventListener("rbac_permissions_changed", handleNavChange)
    }
  }, [])

  // Tự động chuyển về trang hợp lệ nếu vai trò hiện tại không được cấp quyền xem trang đang đứng
  useEffect(() => {
    const userRole = session?.role
    if (userRole && !isPageAllowedForRole(page, userRole)) {
      const fallback = isPageAllowedForRole("track", userRole) ? "track" : "create"
      setPage(fallback)
      window.location.hash = `#${fallback}`
    }
  }, [session?.role, page, navVersion])

  // Đồng bộ tiêu đề trang (Document Title) theo từng ngữ cảnh nghiệp vụ

  useEffect(() => {
    const pageTitles: Record<Page, string> = {
      overview: "Tổng quan & Tiến độ — MB UX Request Portal",

      track: "My task — MB UX Request Portal",

      create: "Tạo yêu cầu thiết kế mới — MB UX Request Portal",

      manage: "Quản trị hệ thống & Cấu hình — MB UX Request Portal",

      test: "Khảo sát & Đánh giá năng lực UX — MB UX Request Portal",

      compressor: "Công cụ nén ảnh Client-side — MB UX Request Portal",

      ia: "Information Architecture — MB UX Request Portal",

      calendar: "Planner cá nhân — MB UX Request Portal",
    }

    document.title =
      pageTitles[page] || "MB UX Request Portal - MB Bank UX Team"
  }, [page])

  // Quản lý Modal thông báo hết hạn phiên làm việc kèm hiệu ứng blur UI nền
  const [sessionExpiredState, setSessionExpiredState] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  })
  const isSessionExpiredModalOpenRef = useRef(false)

  // Cung cấp hàm testSessionExpired trên window để người dùng/tester có thể kích hoạt thử nghiệm nhanh
  useEffect(() => {
    ;(window as any).testSessionExpired = (msg?: string) => {
      window.dispatchEvent(
        new CustomEvent("session_expired", {
          detail: {
            message:
              msg ||
              "Phiên làm việc đã hết hạn để đảm bảo an toàn dữ liệu. Vui lòng bấm đăng nhập lại để tiếp tục làm việc.",
          },
        })
      )
    }
  }, [])

  // Lắng nghe sự kiện thay đổi phiên (Đăng nhập / Đăng xuất)
  useEffect(() => {
    const handleAuthChange = () => {
      if (isSessionExpiredModalOpenRef.current) return
      const current = getStoredSession()
      setSession(current)
      if (current?.role && !isPageAllowedForRole(page, current.role)) {
        const fallback = isPageAllowedForRole("track", current.role) ? "track" : "create"
        setPage(fallback)
        window.location.hash = `#${fallback}`
      }
    }

    const handleSessionExpired = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>
      const message = customEvent.detail?.message || "Phiên đăng nhập đã hết hạn. Vui lòng xác thực lại qua Teams."
      isSessionExpiredModalOpenRef.current = true
      setSessionExpiredState({
        open: true,
        message,
      })
      // Không văng ra màn hình đăng nhập đột ngột; giữ UI nền và hiển thị popup kèm blur
    }

    const handleWindowFocus = () => {
      if (isSessionExpiredModalOpenRef.current) return
      const current = getStoredSession()
      if (current && !current.isImpersonating) {
        syncSessionRoleFromSheet().catch(() => {})
      }
    }

    window.addEventListener("auth_session_changed", handleAuthChange)
    window.addEventListener("storage", handleAuthChange)
    window.addEventListener("session_expired", handleSessionExpired)
    window.addEventListener("focus", handleWindowFocus)

    const interval = setInterval(() => {
      if (isSessionExpiredModalOpenRef.current) return
      const current = getStoredSession()

      if (!current && session) {
        setSession(null)
      }
    }, 5000)

    return () => {
      window.removeEventListener("auth_session_changed", handleAuthChange)
      window.removeEventListener("storage", handleAuthChange)
      window.removeEventListener("session_expired", handleSessionExpired)
      window.removeEventListener("focus", handleWindowFocus)

      clearInterval(interval)
    }
  }, [session])

  // Tự động kiểm tra và đồng bộ vai trò mới nhất từ Google Sheet USERS khi có phiên đăng nhập
  useEffect(() => {
    if (session && !session.isImpersonating && !isSessionExpiredModalOpenRef.current) {
      syncSessionRoleFromSheet().then((synced) => {
        if (!synced) {
          // Do not kick out directly; if expired, handleSessionExpired already handles modal
        } else if (synced.role !== session.role) {
          setSession(synced)
        }
      }).catch(() => {})
    }
  }, [session?.sessionToken])

  // Lắng nghe và đồng bộ URL Hash (#track, #overview, #create, #admin) và Custom Navigation Event

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, "").split("?")[0]

      const current = getStoredSession()

      if (hash === "manage" || hash === "admin") {
        // Chỉ tài khoản có vai trò Admin mới được phép vào trang quản trị hệ thống

        if (!current || current.role !== "Admin") {
          const fallback: Page = isPageAllowedForRole("overview", current?.role)
            ? "overview"
            : (isPageAllowedForRole("track", current?.role) ? "track" : "create")

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
        hash === "compressor" ||
        hash === "ia" ||
        hash === "calendar"
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

  // Chặn non-Admin vào manage và điều hướng về trang phù hợp với quyền hạn
  useEffect(() => {
    const userRole = session?.role
    if (session && userRole !== "Admin" && page === "manage") {
      const fallback: Page = isPageAllowedForRole("overview", userRole)
        ? "overview"
        : (isPageAllowedForRole("track", userRole) ? "track" : "create")

      setPage(fallback)
      window.location.hash = `#${fallback}`
    } else if (userRole && !isPageAllowedForRole(page, userRole)) {
      const fallback = isPageAllowedForRole("track", userRole) ? "track" : "create"
      setPage(fallback)
      window.location.hash = `#${fallback}`
    }
  }, [session?.role, page, navVersion])

  // Background prefetch remaining pages during browser idle time
  useEffect(() => {
    if (typeof window !== "undefined") {
      const prefetch = () => {
        import("./pages/TongQuanPage")
        import("./pages/TrackRequestPage")
      }
      if ("requestIdleCallback" in window) {
        const id = (window as any).requestIdleCallback(prefetch)
        return () => (window as any).cancelIdleCallback(id)
      } else {
        const timer = setTimeout(prefetch, 1200)
        return () => clearTimeout(timer)
      }
    }
  }, [])



  const handleLogout = async () => {
    await logoutTeamsSession()

    setSession(null)

    setPage("overview")

    window.location.hash = "#overview"
  }

  // NẾU CHƯA ĐĂNG NHẬP HOẶC HẾT HẠN PHIÊN -> HIỂN THỊ MÀN HÌNH LOGIN GATE

  if (!session) {
    return (
      <MotionConfig reducedMotion="never">
        <LoginGate
          onAuthSuccess={(newSession) => {
            setSession(newSession)

            // Mặc định đăng nhập: PO/Business về My task (#track), Designer/Admin/Khác về Tổng quan Dashboard (#overview)

            // Tuyệt đối không giữ URL cũ #manage từ phiên trước

            const defaultPage: Page =
              newSession.role === "PO" || newSession.role === "Business"
                ? (isPageAllowedForRole("overview", newSession.role) ? "overview" : "track")
                : "overview"

            setPage(defaultPage)

            window.location.hash = `#${defaultPage}`
          }}
        />
      </MotionConfig>
    )
  }

  const handleLoginAgain = () => {
    isSessionExpiredModalOpenRef.current = false
    setSessionExpiredState({ open: false, message: "" })
    clearSession()
    setSession(null)
  }

  return (
    <MotionConfig reducedMotion="never">
      <div
        className={cn(
          "min-h-screen bg-[#FCFCFD] w-full max-w-full overflow-x-clip relative transition-all duration-300",
          sessionExpiredState.open && "filter blur-[2px] pointer-events-none select-none"
        )}
      >
        {/* Role Impersonation / Preview Floating Controller */}
        <RolePreviewBanner session={session} />

        <Sidebar
          currentPage={page}
          onNavigate={handleNavigate}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />

        {/* Container chính: Offset theo sidebar w-60 (240px) */}
        <div className="md:ml-60 min-h-screen bg-[#FCFCFD] flex flex-col min-w-0 max-w-full flex-1">
          {/* Global System Announcement Banner (Admin Controlled) */}
          <GlobalAnnouncementBanner />

          {/* ReUI App Shell 12 Global Sticky Header */}
          <AppHeader
            currentPage={page}
            onNavigate={handleNavigate}
            session={session}
            onToggleMobileMenu={() =>
              window.dispatchEvent(new Event("toggle_mobile_sidebar"))
            }
          />

          {/* Main Content View: Tách biệt IA Canvas toàn màn hình và các trang cuộn tiêu chuẩn */}
          <Suspense fallback={<PageLoadingSkeleton page={page} />}>
            {page === "ia" ? (
              <div className="flex-1 w-full min-w-0 max-w-full p-0 flex flex-col h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden">
                <ErrorBoundary>
                  <IAPage />
                </ErrorBoundary>
              </div>
            ) : (
              <div className="flex-1 w-full min-w-0 max-w-full flex flex-col justify-between">
                <div className="flex-1 w-full min-w-0 max-w-full px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                  <ErrorBoundary>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={page}
                        variants={pageContainerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        style={{ willChange: "opacity, transform, filter" }}
                        className="w-full flex-1"
                      >
                        {page === "calendar" && <CalendarPage />}
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
                  </ErrorBoundary>
                </div>

                {/* ReUI App Shell 12 Footer */}
                <footer className="w-full border-t border-slate-200/80 px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center text-xs text-slate-500 bg-white/50">
                  <div>2026 © MBBank UX Platform</div>
                </footer>
              </div>
            )}
          </Suspense>
        </div>

        {/* Global Toast Provider */}
        <Toaster />
      </div>

      {/* Modal thông báo hết hạn phiên làm việc kèm hiệu ứng blur UI nền */}
      <AnimatePresence>
        {sessionExpiredState.open && (
          <SessionExpiredModal
            message={sessionExpiredState.message}
            onLoginAgain={handleLoginAgain}
          />
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}
