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
  Eye,
  UserPlus,
} from "lucide-react"
import { getStoredSession, logoutTeamsSession, UserSession, startRolePreview, stopRolePreview } from "../services/otpAuthService"
import { uploadAvatarToDrive } from "../services/googleSheetService"
import { fetchRequests } from "../api/api"
import { preloadPage } from "../App"
import { UserAvatar } from "@/components/common/UserAvatar"
import AddMemberModal from "@/components/common/AddMemberModal"
import { toast } from "@/components/ui/toast"
import { filterRequestsByRole, canRoleAccessCapability } from "@/lib/accessControl"
import {
  getRoleNavConfig,
  getNavOrderConfig,
  RoleNavConfig,
  NavOrderConfig,
  DEFAULT_ROLE_NAV_CONFIG,
  DEFAULT_NAV_ORDER,
} from "@/config/navVisibilityConfig"
import { APP_CONTENT } from "@/config/content"

export type Page = "overview" | "create" | "track" | "manage" | "test" | "compressor"

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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [canInvite, setCanInvite] = useState<boolean>(() => {
    const currentSession = getStoredSession()
    return canRoleAccessCapability(currentSession?.role, "cap-invite")
  })
  const [navConfig, setNavConfig] = useState<RoleNavConfig>(getRoleNavConfig())
  const [navOrder, setNavOrder] = useState<NavOrderConfig>(getNavOrderConfig())

  const userMenuRef = useRef<HTMLDivElement>(null)

  // Load session & live active task count & nav config
  useEffect(() => {
    const handleStorage = () => {
      const s = getStoredSession()
      setSession(s)
      setNavConfig(getRoleNavConfig())
      setNavOrder(getNavOrderConfig())
      setCanInvite(canRoleAccessCapability(s?.role, "cap-invite"))
    }
    window.addEventListener("storage", handleStorage)
    window.addEventListener("auth_session_changed", handleStorage)
    window.addEventListener("nav_visibility_changed", handleStorage)
    window.addEventListener("rbac_permissions_changed", handleStorage)
    const interval = setInterval(handleStorage, 1000)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("auth_session_changed", handleStorage)
      window.removeEventListener("nav_visibility_changed", handleStorage)
      window.removeEventListener("rbac_permissions_changed", handleStorage)
      clearInterval(interval)
    }
  }, [])

  // Listen for global mobile sidebar toggles from AppHeader
  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev)
    const handleClose = () => setMobileOpen(false)
    window.addEventListener("toggle_mobile_sidebar", handleToggle)
    window.addEventListener("close_mobile_sidebar", handleClose)
    return () => {
      window.removeEventListener("toggle_mobile_sidebar", handleToggle)
      window.removeEventListener("close_mobile_sidebar", handleClose)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
      .then((reqs) => {
        const list = filterRequestsByRole(reqs, session)
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
    window.location.hash = "#overview"
    window.location.reload()
  }

  const displayName = session?.displayName || "Lê Hoàng Nam"
  const userRole = session?.role || "Designer"
  const isAdmin = userRole === "Admin"
  const canSwitchRoles = userRole === "Admin" || Boolean(session?.isImpersonating) || session?.originalRole === "Admin"
  const currentRoleVisibility = navConfig[userRole] || DEFAULT_ROLE_NAV_CONFIG[userRole] || DEFAULT_ROLE_NAV_CONFIG.Designer
  const hasPlatformItems = currentRoleVisibility.overview || currentRoleVisibility.track || currentRoleVisibility.create
  const hasResourceItems = currentRoleVisibility.compressor || currentRoleVisibility.test

  const renderSidebarContent = () => (
    <nav aria-label="Menu điều hướng ứng dụng" className="flex flex-col h-full bg-[#F9FAFB] text-slate-800 select-none text-[13px] font-normal border-r border-slate-200/80">
      
      {/* 1. Header / Workspace Brand */}
      <div className="px-4 pt-5 pb-3">
        <button
          type="button"
          onClick={() => onNavigate("overview")}
          aria-label="Về trang chủ MB UXTeam"
          className="flex items-center gap-2.5 font-bold text-slate-900 text-left cursor-pointer group select-none"
        >
          <img
            src="/favicon.svg"
            alt="MB UXTeam"
            width="28"
            height="28"
            className="w-7 h-7 object-contain shrink-0 group-hover:scale-105 transition-transform"
          />
          <span className="text-[15px] font-bold text-slate-900 tracking-tight">
            MB UXTeam
          </span>
        </button>
      </div>

      {/* 2. Scrollable Navigation Body */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-2 space-y-6">
        
        {/* SECTION 1: QUẢN LÝ CÔNG VIỆC (Platform) */}
        {hasPlatformItems && (
          <div className="space-y-1.5">
            <p className="px-3 pt-1 pb-1.5 text-xs font-semibold text-slate-600 tracking-normal">
              {APP_CONTENT.sidebar.sections.platform}
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
                    <span className="truncate">{APP_CONTENT.sidebar.navItems.overview.title}</span>
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
                      <span className="truncate">{APP_CONTENT.sidebar.navItems.track.title}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium text-xs shrink-0">
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
                    <span className="truncate">{APP_CONTENT.sidebar.navItems.create.title}</span>
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
            <p className="px-3 py-1 text-xs font-semibold text-slate-600 tracking-normal">
              {APP_CONTENT.sidebar.sections.resources}
            </p>

            {navOrder.resources.map((itemKey) => {
              if (itemKey === "compressor" && currentRoleVisibility.compressor) {
                return (
                  <button
                    key="nav-compressor"
                    type="button"
                    onClick={() => onNavigate("compressor")}
                    onMouseEnter={() => preloadPage("compressor")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer group text-sm font-medium ${
                      currentPage === "compressor"
                        ? "bg-[#E9EBEF] text-slate-900 font-semibold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 bg-emerald-500 ${currentPage === "compressor" ? "ring-2 ring-emerald-200" : ""}`} />
                      <span className="truncate text-slate-700 group-hover:text-slate-900">{APP_CONTENT.sidebar.navItems.compressor.title}</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded bg-slate-200/70 text-[10px] font-medium text-slate-600">
                      Tool
                    </span>
                  </button>
                )
              }

              if (itemKey === "test" && currentRoleVisibility.test) {
                return (
                  <button
                    key="nav-test"
                    type="button"
                    onClick={() => onNavigate("test")}
                    onMouseEnter={() => preloadPage("test")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer group text-sm font-medium ${
                      currentPage === "test"
                        ? "bg-[#E9EBEF] text-slate-900 font-semibold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span className="truncate text-slate-700 group-hover:text-slate-900">Bài test</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded bg-blue-100 text-[10px] font-medium text-blue-700">
                      Exam
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
        {/* Render footer tools (Admin setting & Invite Team) based on navOrder.resources */}
        {navOrder.resources
          .filter((k) => k === "manage" || k === "invite")
          .map((itemKey) => {
            if (itemKey === "manage" && isAdmin && currentRoleVisibility.manage) {
              return (
                <button
                  key="nav-manage"
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
              )
            }

            if (itemKey === "invite" && currentRoleVisibility.invite) {
              return (
                <button
                  key="nav-invite"
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                >
                  <UserPlus className="w-4 h-4 shrink-0 text-slate-500" />
                  <span className="truncate">Invite Team</span>
                </button>
              )
            }

            return null
          })}
      </div>
    </nav>
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

      {/* Invite Team Modal - Đồng bộ hoàn toàn với Thêm nhân sự */}
      {(canInvite || currentRoleVisibility.invite) && (
        <AddMemberModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          title="Invite Team - Mời nhân sự mới"
          subtitle="Cấu hình thông tin tài khoản, vai trò và phân bổ Squad theo từng Sản phẩm"
          submitLabel="Gửi lời mời & Thêm nhân sự"
          initialRole="Designer"
        />
      )}
    </>
  )
}
