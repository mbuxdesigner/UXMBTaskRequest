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

  const isPo = session.role === "PO"
  // Role PO KHÔNG BAO GIỜ HIỂN THỊ SIDEBAR NAV!
  // Tất cả các role khác (Designer, Design Owner, Admin): BẮT BUỘC có Sidebar kể cả trang Tạo yêu cầu (create)!
  const showSidebar = !isPo

  return (
    <div className="min-h-screen bg-[#FCFCFD]">
      {showSidebar && (
        <Sidebar
          currentPage={page}
          onNavigate={setPage}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
      )}

      {/* Header riêng cho Role PO (Không có Sidebar Navigation) */}
      {isPo && (
        <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            {/* Logo & Brand + Back button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage("track")}
                className="hover:opacity-85 transition-opacity text-left cursor-pointer"
                title="Về danh sách yêu cầu"
              >
                <BrandLogo size="sm" />
              </button>

              {page === "create" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage("track")}
                  className="text-slate-600 hover:text-slate-900 font-semibold gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 hover:bg-slate-100 px-3 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-[#1057FB]" />
                  <span>Quay lại</span>
                </Button>
              )}
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs">
                {session.avatarUrl ? (
                  <img
                    src={session.avatarUrl}
                    alt={session.displayName}
                    className="w-6 h-6 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-[#1057FB] text-white font-bold text-[10px] flex items-center justify-center">
                    {getUserInitials(session.displayName)}
                  </div>
                )}
                <span className="font-bold text-slate-900 hidden md:inline">
                  {session.displayName}
                </span>
                <Badge variant="navy" size="xs" className="text-[10px] font-bold px-1.5 py-0 bg-blue-50 text-[#1057FB] border-blue-200">
                  PO
                </Badge>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/70 flex items-center justify-center transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Container chính: Offset theo sidebar w-60 (240px) */}
      <div
        className={`${
          showSidebar ? "md:ml-60 pt-14 md:pt-0" : "w-full"
        } min-h-screen bg-[#FCFCFD]`}
      >
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
