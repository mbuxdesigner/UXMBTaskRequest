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
import { getStoredSession, logoutTeamsSession, getUserInitials, UserSession } from "./services/otpAuthService"

// Code-splitting via React.lazy
const TongQuanPage = lazy(() => import("./pages/TongQuanPage"))
const CreateRequestPage = lazy(() => import("./pages/CreateRequestPage"))
const TrackRequestPage = lazy(() => import("./pages/TrackRequestPage"))
const QuanLyPage = lazy(() => import("./pages/QuanLyPage"))

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
    if (s?.role === "PO") return "track"
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

  // Lắng nghe và đồng bộ URL Hash (#track, #overview, #create, #admin) và Custom Navigation Event
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, "").split("?")[0]
      if (hash === "track" || hash === "overview" || hash === "create" || hash === "manage" || hash === "admin") {
        const targetPage = hash === "admin" ? "manage" : (hash as Page)
        setPage(targetPage)
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

  // Tự động chuyển PO về màn hình "Yêu cầu của tôi" khi đăng nhập
  useEffect(() => {
    if (session?.role === "PO" && page === "overview") {
      setPage("track")
    }
  }, [session?.role])

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
  }

  // NẾU CHƯA ĐĂNG NHẬP HOẶC HẾT HẠN PHIÊN -> HIỂN THỊ MÀN HÌNH LOGIN GATE
  if (!session) {
    return (
      <LoginGate
        onAuthSuccess={(newSession) => {
          setSession(newSession)
          if (newSession.role === "PO") {
            setPage("track")
          }
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#FCFCFD]">
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
        </Suspense>
      </div>

      {/* Global Toast Provider */}
      <Toaster />
    </div>
  )
}
