import { useState, lazy, Suspense, useEffect } from "react"
import Sidebar, { Page } from "./components/Sidebar"
import LoginGate from "./components/auth/LoginGate"
import { Skeleton } from "@/components/ui/skeleton"
import { Frame } from "@/components/reui/frame"
import { getStoredSession, UserSession } from "./services/otpAuthService"

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
  const [page, setPage] = useState<Page>("overview")

  // Lắng nghe sự kiện thay đổi phiên (Đăng nhập / Đăng xuất)
  useEffect(() => {
    const handleAuthChange = () => {
      setSession(getStoredSession())
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

  // NẾU CHƯA ĐĂNG NHẬP HOẶC HẾT HẠN PHIÊN -> HIỂN THỊ MÀN HÌNH LOGIN GATE
  if (!session) {
    return <LoginGate onAuthSuccess={(newSession) => setSession(newSession)} />
  }

  return (
    <div className="min-h-screen bg-[#FCFCFD]">
      <Sidebar currentPage={page} onNavigate={setPage} />
      {/* Desktop: offset for sidebar; Mobile: offset for top bar */}
      <div className="md:ml-60 pt-14 md:pt-0 min-h-screen">
        <Suspense fallback={<PageLoadingSkeleton />}>
          {page === "overview" && <TongQuanPage />}
          {page === "create" && <CreateRequestPage />}
          {page === "track" && <TrackRequestPage onNavigateToCreate={() => setPage("create")} />}
          {page === "manage" && <QuanLyPage />}
        </Suspense>
      </div>
    </div>
  )
}
