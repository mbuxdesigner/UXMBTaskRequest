import { useState, useEffect, useRef } from "react"
import { 
  Home,
  CheckSquare,
  PlusCircle,
  ShieldCheck,
  LogOut,
  MoreHorizontal,
  Menu,
  X,
  Layers,
  Wrench,
  Camera,
} from "lucide-react"
import { getStoredSession, logoutTeamsSession, UserSession } from "../services/otpAuthService"
import { uploadAvatarToDrive } from "../services/googleSheetService"
import { fetchRequests } from "../api/api"
import { preloadPage } from "../App"
import ImageCompressorModal from "./tools/ImageCompressorModal"
import { UserAvatar } from "@/components/common/UserAvatar"
import { toast } from "@/components/ui/toast"
import {
  getRoleNavConfig,
  getNavOrderConfig,
  RoleNavConfig,
  NavOrderConfig,
  DEFAULT_ROLE_NAV_CONFIG,
  DEFAULT_NAV_ORDER,
} from "@/config/navVisibilityConfig"

export type Page = "overview" | "create" | "track" | "manage"

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({ 
  currentPage, 
  onNavigate 
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [session, setSession] = useState<UserSession | null>(getStoredSession())
  const [activeTaskCount, setActiveTaskCount] = useState<number>(0)
  const [compressorOpen, setCompressorOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [navConfig, setNavConfig] = useState<RoleNavConfig>(getRoleNavConfig())
  const [navOrder, setNavOrder] = useState<NavOrderConfig>(getNavOrderConfig())

  const userMenuRef = useRef<HTMLDivElement>(null)

  // Load session & live active task count & nav config
  useEffect(() => {
    const handleStorage = () => {
      setSession(getStoredSession())
      setNavConfig(getRoleNavConfig())
      setNavOrder(getNavOrderConfig())
    }
    window.addEventListener("storage", handleStorage)
    window.addEventListener("auth_session_changed", handleStorage)
    window.addEventListener("nav_visibility_changed", handleStorage)
    const interval = setInterval(handleStorage, 1000)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("auth_session_changed", handleStorage)
      window.removeEventListener("nav_visibility_changed", handleStorage)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
      .then((reqs) => {
        let list = reqs
        if (session) {
          const userEmail = (session.teamsEmail || "").toLowerCase().trim()
          const userName = (session.displayName || "").toLowerCase().trim()
          if (session.role === "PO") {
            list = list.filter((r) => (r.requester_email || "").toLowerCase().includes(userEmail.split("@")[0]))
          } else if (session.role === "Designer") {
            list = list.filter((r) => {
              const a = (r.assigned_designer || r.ux_owner || "").toLowerCase()
              return a.includes(userEmail.split("@")[0]) || a.includes(userName)
            })
          }
        }
        const inProgress = list.filter((r) => r.status === "Đang thực hiện").length
        setActiveTaskCount(inProgress)
      })
      .catch(() => {})
  }, [currentPage, session])

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleUploadMyAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    const currentSess = getStoredSession() || session
    const userEmail = currentSess?.teamsEmail || currentSess?.personalEmail || "user@mbbank.com.vn"
    setUploadingAvatar(true)
    toast.info("Đang tải ảnh Avatar lên Google Drive...")

    const res = await uploadAvatarToDrive(file, userEmail)
    setUploadingAvatar(false)
    setUserMenuOpen(false)

    if (res.success && res.avatarUrl) {
      const updatedSess = { ...(currentSess || {}), avatarUrl: res.avatarUrl }
      setSession(updatedSess as any)
      sessionStorage.setItem("ux_portal_session_auth", JSON.stringify(updatedSess))
      localStorage.setItem("ux_portal_session_auth", JSON.stringify(updatedSess))
      localStorage.setItem("ux_portal_session", JSON.stringify(updatedSess))

      // Cập nhật ngay vào danh sách team members trong localStorage (cả mbbank_admin_team & mbbank_team_members)
      try {
        const updateStorageList = (key: string) => {
          const raw = localStorage.getItem(key)
          if (raw) {
            const list: any[] = JSON.parse(raw)
            const updated = list.map((m) =>
              (m.email && userEmail && m.email.toLowerCase() === userEmail.toLowerCase()) ||
              (m.name && currentSess?.displayName && m.name.toLowerCase() === currentSess.displayName.toLowerCase())
                ? { ...m, avatarUrl: res.avatarUrl }
                : m
            )
            localStorage.setItem(key, JSON.stringify(updated))
          }
        }
        updateStorageList("mbbank_admin_team")
        updateStorageList("mbbank_team_members")
      } catch {}

      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new Event("auth_session_changed"))
      toast.success("Đã cập nhật ảnh đại diện thành công!")
    } else {
      toast.error("Lỗi tải ảnh", res.error || "Không thể upload ảnh.")
    }
  }

  const handleLogout = async () => {
    await logoutTeamsSession()
    setSession(null)
    setUserMenuOpen(false)
    window.location.reload()
  }

  const displayName = session?.displayName || "Lê Hoàng Nam"
  const userRole = session?.role || "Designer"
  const currentRoleVisibility = navConfig[userRole] || DEFAULT_ROLE_NAV_CONFIG[userRole] || DEFAULT_ROLE_NAV_CONFIG.Designer
  const hasPlatformItems = currentRoleVisibility.overview || currentRoleVisibility.track || currentRoleVisibility.create
  const hasResourceItems = currentRoleVisibility.compressor

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#F9FAFB] text-slate-800 select-none text-[13px] font-normal border-r border-slate-200/80">
      
      {/* 1. Header / Workspace Brand */}
      <div className="px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={() => onNavigate("overview")}
          className="flex items-center gap-2.5 font-bold text-slate-900 text-left cursor-pointer group select-none"
        >
          <img
            src="/favicon.svg"
            alt="MB UXTeam"
            className="w-7 h-7 object-contain shrink-0 group-hover:scale-105 transition-transform"
          />
          <span className="text-[15px] font-bold text-slate-900 tracking-tight">
            MB UXTeam
          </span>
        </button>
      </div>

      {/* 2. Scrollable Navigation Body */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-5">
        
        {/* SECTION 1: QUẢN LÝ CÔNG VIỆC (Platform) */}
        {hasPlatformItems && (
          <div className="space-y-1">
            <p className="px-3 py-1 text-xs font-medium text-slate-400 tracking-normal">
              Platform
            </p>

            {navOrder.platform.map((itemKey) => {
              if (itemKey === "overview" && currentRoleVisibility.overview) {
                return (
                  <button
                    key="nav-overview"
                    type="button"
                    onClick={() => onNavigate("overview")}
                    onMouseEnter={() => preloadPage("overview")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left cursor-pointer text-sm ${
                      currentPage === "overview"
                        ? "bg-[#E9EBEF] text-slate-900 font-semibold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium"
                    }`}
                  >
                    <Home className={`w-4 h-4 shrink-0 ${currentPage === "overview" ? "text-slate-900" : "text-slate-500"}`} />
                    <span className="truncate">Overview</span>
                  </button>
                )
              }

              if (itemKey === "track" && currentRoleVisibility.track) {
                return (
                  <button
                    key="nav-track"
                    type="button"
                    onClick={() => onNavigate("track")}
                    onMouseEnter={() => preloadPage("track")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer text-sm ${
                      currentPage === "track"
                        ? "bg-[#E9EBEF] text-slate-900 font-semibold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckSquare className={`w-4 h-4 shrink-0 ${currentPage === "track" ? "text-slate-900" : "text-slate-500"}`} />
                      <span className="truncate">Task của tôi</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs shrink-0">
                      {activeTaskCount}
                    </span>
                  </button>
                )
              }

              if (itemKey === "create" && currentRoleVisibility.create) {
                return (
                  <button
                    key="nav-create"
                    type="button"
                    onClick={() => onNavigate("create")}
                    onMouseEnter={() => preloadPage("create")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left cursor-pointer text-sm ${
                      currentPage === "create"
                        ? "bg-[#E9EBEF] text-slate-900 font-semibold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium"
                    }`}
                  >
                    <PlusCircle className={`w-4 h-4 shrink-0 ${currentPage === "create" ? "text-slate-900" : "text-slate-500"}`} />
                    <span className="truncate">Tạo task mới</span>
                  </button>
                )
              }

              return null
            })}
          </div>
        )}

        {/* SECTION 2: TOOLS (Resources) */}
        {hasResourceItems && (
          <div className="space-y-1">
            <p className="px-3 py-1 text-xs font-medium text-slate-400 tracking-normal">
              Resources
            </p>

            {navOrder.resources.map((itemKey) => {
              if (itemKey === "compressor" && currentRoleVisibility.compressor) {
                return (
                  <button
                    key="nav-compressor"
                    type="button"
                    onClick={() => setCompressorOpen(true)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors text-left cursor-pointer group text-sm font-medium"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate text-slate-700 group-hover:text-slate-900">Nén ảnh</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded bg-slate-200/70 text-[10px] font-semibold text-slate-600">
                      Tool
                    </span>
                  </button>
                )
              }
              return null
            })}
          </div>
        )}
      </div>

      {/* 3. Bottom Footer (Admin Setting + User Profile Card) */}
      <div className="p-3 border-t border-slate-200/70 bg-[#F9FAFB] relative space-y-2" ref={userMenuRef}>
        {/* Admin setting - Hiển thị theo cấu hình phân quyền Nav */}
        {currentRoleVisibility.manage && (
          <button
            type="button"
            onClick={() => onNavigate("manage")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left cursor-pointer text-sm font-medium ${
              currentPage === "manage"
                ? "bg-[#E9EBEF] text-slate-900 font-semibold shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <ShieldCheck className={`w-4 h-4 shrink-0 ${currentPage === "manage" ? "text-slate-900" : "text-slate-500"}`} />
            <span className="truncate">Admin setting</span>
          </button>
        )}

        {/* User Profile Card (Y như ReUI App Shell 1) */}
        <div 
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="border border-slate-200/80 rounded-2xl p-2.5 bg-white hover:bg-slate-100/90 flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar name={displayName} avatarUrl={session?.avatarUrl} size="md" />
            <span className="font-semibold text-sm text-slate-900 truncate">
              {displayName}
            </span>
          </div>

          <button
            type="button"
            className="text-slate-400 hover:text-slate-700 transition-colors p-1"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* User Popup Menu */}
        {userMenuOpen && (
          <div className="absolute left-3 right-3 bottom-full mb-2 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="px-2.5 py-1.5 border-b border-slate-100 text-xs">
              <p className="font-bold text-slate-900">{displayName}</p>
              <p className="text-[11px] text-slate-400">{session?.teamsEmail || "user@mbbank.com.vn"}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                {userRole}
              </span>
            </div>
            <div className="pt-1 space-y-1">
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={(e) => {
                  e.stopPropagation()
                  const input = document.getElementById("global_sidebar_avatar_input") as HTMLInputElement | null
                  if (input) {
                    input.value = ""
                    input.click()
                  }
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-100 transition-colors text-left cursor-pointer font-medium ${uploadingAvatar ? "opacity-50 pointer-events-none" : ""}`}
              >
                <Camera className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{uploadingAvatar ? "Đang tải ảnh lên Drive..." : "Đổi ảnh đại diện (Drive)"}</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Built-in Tool Modal: Nén ảnh */}
      <ImageCompressorModal
        open={compressorOpen}
        onClose={() => setCompressorOpen(false)}
      />
    </div>
  )

  return (
    <>
      {/* Persistent Single Hidden Input for Avatar Upload */}
      <input
        id="global_sidebar_avatar_input"
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploadingAvatar}
        onChange={handleUploadMyAvatar}
      />

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#F9FAFB]/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 z-40">
        <button
          type="button"
          onClick={() => onNavigate("overview")}
          className="flex items-center gap-2.5 text-left cursor-pointer"
        >
          <img
            src="/favicon.svg"
            alt="MB UXTeam"
            className="w-7 h-7 object-contain shrink-0"
          />
          <span className="text-[15px] font-bold text-slate-900 tracking-tight">MB UXTeam</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200/60 cursor-pointer"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-[#F9FAFB] border-r border-slate-200/80 z-50 flex flex-col transition-transform duration-200 shadow-2xl ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderSidebarContent()}
      </aside>

      {/* Desktop Sidebar (ReUI App Shell 1 Exact Style) */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-60 bg-[#F9FAFB] border-r border-slate-200/80 z-30 flex-col">
        {renderSidebarContent()}
      </aside>
    </>
  )
}
