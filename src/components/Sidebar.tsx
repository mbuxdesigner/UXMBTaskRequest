import { useState, useEffect } from "react"
import { 
  LayoutDashboard, 
  PlusCircle, 
  Search, 
  FolderKanban, 
  Menu, 
  X,
  Sparkles,
  ShieldCheck,
  User,
  LogOut
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { preloadPage } from "../App"
import { getStoredSession, logoutTeamsSession, getUserInitials, UserSession } from "../services/otpAuthService"

export type Page = "overview" | "create" | "track" | "manage"

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const navItems: { page: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    page: "overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    page: "create",
    label: "Tạo yêu cầu",
    icon: PlusCircle,
  },
  {
    page: "track",
    label: "Yêu cầu của tôi",
    icon: Search,
  },
  {
    page: "manage",
    label: "Quản lý",
    icon: FolderKanban,
  },
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [session, setSession] = useState<UserSession | null>(getStoredSession())

  useEffect(() => {
    const handleStorage = () => {
      setSession(getStoredSession())
    }
    window.addEventListener("storage", handleStorage)
    const interval = setInterval(handleStorage, 2000)
    return () => {
      window.removeEventListener("storage", handleStorage)
      clearInterval(interval)
    }
  }, [])

  const handleLogout = async () => {
    await logoutTeamsSession()
    setSession(null)
  }

  const roleVariant = 
    session?.role === "Admin" ? "destructive" :
    session?.role === "Design Owner" ? "purple" :
    session?.role === "Designer" ? "navy" : "success"

  const SidebarContent = () => (
    <>
      {/* Brand Header */}
      <div className="px-6 py-5.5 border-b border-slate-100/90 flex-shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#1B3A6B] to-[#0D9B97] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-[#1B3A6B]/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 leading-tight tracking-tight">
              UX Portal
            </p>
            <p className="text-[11px] font-semibold text-slate-400 leading-tight mt-0.5">MB Bank Digital</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
          Phân hệ chức năng
        </p>
        {navItems.map(({ page, label, icon: Icon }) => {
          const active = currentPage === page
          return (
            <button
              key={page}
              onClick={() => {
                onNavigate(page)
                setMobileOpen(false)
              }}
              onMouseEnter={() => preloadPage(page)}
              onFocus={() => preloadPage(page)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all duration-150 text-left font-semibold select-none cursor-pointer group ${
                active
                  ? "bg-[#1B3A6B] text-white shadow-md shadow-[#1B3A6B]/20 font-bold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4.5 h-4.5 transition-colors ${active ? "text-[#0D9B97]" : "text-slate-400 group-hover:text-slate-700"}`} />
                <span>{label}</span>
              </div>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#0D9B97] shadow-xs shadow-[#0D9B97]" />
              )}
            </button>
          )
        })}
      </nav>

      {/* User Profile Card in Sidebar */}
      {session ? (
        <div className="p-3 mx-2 mb-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div className="flex items-center gap-2.5">
            {session.avatarUrl ? (
              <img
                src={session.avatarUrl}
                alt={session.displayName}
                className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-xs flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1B3A6B] to-[#0D9B97] text-white font-bold text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                {getUserInitials(session.displayName)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                {session.displayName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={roleVariant} size="xs" className="px-1.5 py-0 text-[9px] font-extrabold">
                  {session.role}
                </Badge>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 mx-2 mb-2 bg-blue-50/50 border border-blue-100 rounded-2xl text-[11px] text-slate-500">
          <div className="flex items-center gap-2 font-bold text-slate-800 mb-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0D9B97]" />
            <span>Chế độ Khách</span>
          </div>
          <p className="text-[10px] text-slate-400">Vào tab Tra cứu để xác thực OTP Teams.</p>
        </div>
      )}

      {/* Sidebar Footer */}
      <div className="p-3.5 border-t border-slate-100/90 flex-shrink-0 flex items-center justify-between text-[11px] text-slate-400 bg-slate-50/50">
        <span className="font-semibold text-slate-500">UX Portal MB</span>
        <Badge variant="navy" size="xs" className="font-bold">v3.0</Badge>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-tr from-[#1B3A6B] to-[#0D9B97] rounded-xl flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-extrabold text-slate-900">UX Portal</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
        >
          {mobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200/80 z-50 flex flex-col transition-transform duration-200 shadow-2xl ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-200/80 z-30 flex-col shadow-[4px_0_24px_-4px_rgba(0,0,0,0.02)]">
        <SidebarContent />
      </aside>
    </>
  )
}
