import { useState, lazy, Suspense, useEffect } from "react"
import Sidebar, { Page } from "./components/Sidebar"
import LoginGate from "./components/auth/LoginGate"
import { Skeleton } from "@/components/ui/skeleton"
import { Frame } from "@/components/reui/frame"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, ArrowLeft, LogOut } from "lucide-react"
import BrandLogo from "@/components/common/BrandLogo"
import { Toaster } from "@/components/ui/toast"
import { getStoredSession, logoutTeamsSession, getUserInitials, UserSession, syncSessionRoleFromSheet } from "./services/otpAuthService"
import { RolePreviewBanner } from "./components/common/RolePreviewBanner"

// Code-splitting via React.lazy
const TongQuanPage = lazy(() => import("./pages/TongQuanPage"))
const CreateRequestPage = lazy(() => import("./pages/CreateRequestPage"))
const TrackRequestPage = lazy(() => import("./pages/TrackRequestPage"))
const QuanLyPage = lazy(() => import("./pages/QuanLyPage"))
const TestAssessmentPage = lazy(() => import("./pages/TestAssessmentPage"))
const ImageCompressorPage = lazy(() => import("./pages/ImageCompressorPage"))

// Route Preloaders
export const preloadPage = (page: Page) => {
  switch (page) {
    case "overview":
      import("./pages/TongQuanPage")
      break
    case "create":
      import("./pages/CreateRequestPage")
      break
    case "track":
      import("./pages/TrackRequestPage")
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
  }
}

function PageLoadingSkeleton() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in-50 duration-200">
      <Frame className="p-6 space-y-3 bg-white">
        <Skeleton className="h-4 w-32 rounded-lg" />
        <Skeleton className="h-8 w-72 rounded-xl" />
        <Skeleton className="h-4 w-96 rounded-lg" />
      </Frame>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Frame key={i} className="p-5 space-y-3 bg-white">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-6 w-20 rounded-lg" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </Frame>
        ))}
      </div>
      <Frame className="p-6 space-y-4 bg-white">
        <Skeleton className="h-6 w-48 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </Frame>
    </main>
  )
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
    if (hash === "track" || hash === "overview" || hash === "create" || hash === "test" || hash === "compressor") {
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
        // Chưa đăng nhập hoặc PO không được tự động vào trang quản trị
        if (!current || current.role === "PO") {
          const fallback: Page = current?.role === "PO" ? "track" : "overview"
          setPage(fallback)
          window.location.hash = `#${fallback}`
          return
        }
        setPage("manage")
        return
      }

      if (hash === "track" || hash === "overview" || hash === "create" || hash === "test" || hash === "compressor") {
        setPage(hash as Page)
      }
    }
    syncFromHash()
    window.addEventListener("hashchange", syncFromHash)

    const handleCustomNav = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.page) {
        setPage(customEvent.detail.page)
      }
    }
    window.addEventListener("app_navigate", handleCustomNav)

    return () => {
      window.removeEventListener("hashchange", syncFromHash)
      window.removeEventListener("app_navigate", handleCustomNav)
    }
  }, [])

  // Tự động chuyển PO & Business về màn hình "Yêu cầu của tôi" khi đăng nhập
  useEffect(() => {
    if ((session?.role === "PO" || session?.role === "Business") && (page === "overview" || page === "manage")) {
      setPage("track")
      window.location.hash = "#track"
    }
  }, [session?.role, page])

  // Background prefetch remaining pages during browser idle time
  useEffect(() => {
    if (session) {
      const idleCallback = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1200))
      const handle = idleCallback(() => {
        import("./pages/CreateRequestPage")
        import("./pages/TrackRequestPage")
        import("./pages/QuanLyPage")
      })
      return () => {
        if ((window as any).cancelIdleCallback) {
          ;(window as any).cancelIdleCallback(handle)
        }
      }
    }
  }, [session])

  const handleLogout = async () => {
    await logoutTeamsSession()
    setSession(null)
    setPage("overview")
    window.location.hash = "#overview"
  }

  // NẾU CHƯA ĐĂNG NHẬP HOẶC HẾT HẠN PHIÊN -> HIỂN THỊ MÀN HÌNH LOGIN GATE
  if (!session) {
    return (
      <LoginGate
        onAuthSuccess={(newSession) => {
          setSession(newSession)
          // Mặc định đăng nhập: PO/Business về Track Task (#track), Designer/Admin/Khác về Tổng quan Dashboard (#overview)
          // Tuyệt đối không giữ URL cũ #manage từ phiên trước
          const defaultPage: Page =
            newSession.role === "PO" || newSession.role === "Business" ? "track" : "overview"
          setPage(defaultPage)
          window.location.hash = `#${defaultPage}`
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#FCFCFD]">
      {/* Role Impersonation / Preview Floating Controller */}
      <RolePreviewBanner session={session} />

      <Sidebar
        currentPage={page}
        onNavigate={setPage}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Container chính: Offset theo sidebar w-60 (240px) */}
      <div className="md:ml-60 pt-14 md:pt-0 min-h-screen bg-[#FCFCFD]">
        <Suspense fallback={<PageLoadingSkeleton />}>
          {page === "overview" && <TongQuanPage />}
          {page === "create" && (
            <CreateRequestPage onBack={() => setPage("track")} />
          )}
          {page === "track" && <TrackRequestPage onNavigateToCreate={() => setPage("create")} />}
          {page === "manage" && <QuanLyPage />}
          {page === "test" && <TestAssessmentPage />}
          {page === "compressor" && <ImageCompressorPage />}
        </Suspense>
      </div>

      {/* Global Toast Provider */}
      <Toaster />
    </div>
  )
}
