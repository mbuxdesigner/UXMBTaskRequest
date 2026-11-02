import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { springs } from "@/lib/motion"
import { 
  BarChart3,
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
  Network,
  Calendar,
  Bot,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
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

export type Page = "overview" | "create" | "track" | "manage" | "test" | "compressor" | "ia" | "calendar" | "aichat"

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onLogout?: () => void
}

export function DynamicCalendarIcon({ className, day }: { className?: string; day?: number }) {
  const currentDay = day ?? new Date().getDate()
  const isDoubleDigit = currentDay > 9

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2.5" y="3.5" width="19" height="18" rx="4" />
      <line x1="16" y1="1.5" x2="16" y2="4.5" />
      <line x1="8" y1="1.5" x2="8" y2="4.5" />
      <text
        x="12"
        y="13.0"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        stroke="none"
        fontSize={isDoubleDigit ? "13.2" : "14.8"}
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        letterSpacing={isDoubleDigit ? "-0.8px" : "-0.2px"}
      >
        {currentDay}
      </text>
    </svg>
  )
}

export default function Sidebar({ 
  currentPage, 
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  onLogout,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [session, setSession] = useState<UserSession | null>(getStoredSession())
  const [activeTaskCount, setActiveTaskCount] = useState<number>(0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)
  const [canInvite, setCanInvite] = useState<boolean>(() => {
    const currentSession = getStoredSession()
    return canRoleAccessCapability(currentSession?.role, "cap-invite")
  })
  const [canViewIa, setCanViewIa] = useState<boolean>(() => {
    const currentSession = getStoredSession()
    return canRoleAccessCapability(currentSession?.role, "cap-ia-view")
  })
  const [canUseAi, setCanUseAi] = useState<boolean>(() => {
    const currentSession = getStoredSession()
    return canRoleAccessCapability(currentSession?.role, "cap-ai-use")
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
      setCanViewIa(canRoleAccessCapability(s?.role, "cap-ia-view"))
      setCanUseAi(canRoleAccessCapability(s?.role, "cap-ai-use"))
    }
    window.addEventListener("storage", handleStorage)
    window.addEventListener("auth_session_changed", handleStorage)
    window.addEventListener("nav_visibility_changed", handleStorage)
    window.addEventListener("rbac_permissions_changed", handleStorage)
    const interval = setInterval(handleStorage, 10000)
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

  // Lock body scroll when mobile drawer is open & auto-close on expand >= 768px (md)
  useEffect(() => {
    if (mobileOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      const handleResize = () => {
        if (window.innerWidth >= 768) {
          setMobileOpen(false)
        }
      }
      window.addEventListener("resize", handleResize)
      return () => {
        document.body.style.overflow = originalOverflow
        window.removeEventListener("resize", handleResize)
      }
    }
  }, [mobileOpen])

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
    setUserMenuOpen(false)
    await logoutTeamsSession()
    setSession(null)
    if (onLogout) {
      onLogout()
    } else {
      window.location.hash = "#overview"
      window.location.reload()
    }
  }

  const displayName = session?.displayName || "Lê Hoàng Nam"
  const userRole = session?.role || "Designer"
  const isAdmin = userRole === "Admin"
  const canSwitchRoles = userRole === "Admin" || Boolean(session?.isImpersonating) || session?.originalRole === "Admin"
  const currentRoleVisibility = navConfig[userRole] || DEFAULT_ROLE_NAV_CONFIG[userRole] || DEFAULT_ROLE_NAV_CONFIG.Designer
  const hasPlatformItems = currentRoleVisibility.overview || currentRoleVisibility.track || currentRoleVisibility.create || (currentRoleVisibility.ia && canViewIa) || ((currentRoleVisibility.aichat ?? true) && canUseAi)
  const hasResourceItems = Boolean(currentRoleVisibility.compressor) || (currentRoleVisibility.test ?? true) || isAdmin

  const renderSidebarContent = (isMobile = false) => {
    const collapsed = !isMobile && isCollapsed
    const activeLayoutId = `sidebar-active-indicator${isMobile ? "-mobile" : ""}`
    const hoverLayoutId = `sidebar-hover-indicator${isMobile ? "-mobile" : ""}`

    return (
      <nav
        aria-label="Menu điều hướng ứng dụng"
        data-collapsed={collapsed}
        className="flex flex-col h-full bg-[#F9FAFB] text-slate-800 select-none text-[13px] font-normal border-r border-slate-200/80"
      >
        
        {/* 1. Header / Workspace Brand */}
        <div className={collapsed ? "relative flex h-[72px] items-center justify-center px-2" : "relative flex h-[72px] items-center px-4"}>
          <button
            type="button"
            onClick={() => {
              onNavigate("overview")
              if (isMobile) setMobileOpen(false)
            }}
            aria-label="Về trang chủ MB UXTeam"
            className="flex items-center gap-2.5 font-bold text-slate-900 text-left cursor-pointer group select-none"
          >
            <img
              src="/img-logo-UXTeamRegDark.webp"
              alt="UX Team"
              width="28"
              height="28"
              className="w-7 h-7 object-contain rounded-lg shrink-0 group-hover:scale-105 transition-transform"
            />
            {!collapsed && (
              <span className="text-[15px] font-bold text-slate-900 tracking-tight">
                Workspace
              </span>
            )}
          </button>
          {!isMobile && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
              aria-expanded={!collapsed}
              title={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
              className="absolute -right-3 top-1/2 z-50 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1057FB]/30"
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
          )}
        </div>

        {/* 2. Scrollable Navigation Body */}
        <div 
          className={collapsed ? "flex-1 overflow-y-auto px-2 pt-3 pb-2 space-y-4" : "flex-1 overflow-y-auto px-3 pt-3 pb-2 space-y-6"}
          onMouseLeave={() => setHoveredNav(null)}
        >
          {/* SECTION 1: QUẢN LÝ CÔNG VIỆC (Platform) */}
          {hasPlatformItems && (
            <div className="space-y-1.5">
              {collapsed ? (
                <div className="mx-2 mb-2 h-px bg-slate-200/80" aria-hidden="true" />
              ) : (
                <p className="px-3 pt-1 pb-1.5 text-xs font-semibold text-slate-600 tracking-normal">
                  {APP_CONTENT.sidebar.sections.platform}
                </p>
              )}

              {navOrder.platform.map((itemKey) => {
                if (itemKey === "overview" && currentRoleVisibility.overview) {
                  const isActive = currentPage === "overview"
                  const isHovered = hoveredNav === "overview"
                  return (
                    <button
                      key="nav-overview"
                      type="button"
                      title={collapsed ? APP_CONTENT.sidebar.navItems.overview.title : undefined}
                      onClick={() => {
                        onNavigate("overview")
                        if (isMobile) setMobileOpen(false)
                      }}
                      onMouseEnter={() => {
                        setHoveredNav("overview")
                        preloadPage("overview")
                      }}
                      className={`relative isolate w-full flex items-center py-2 rounded-xl transition-colors text-left cursor-pointer text-sm font-medium ${collapsed ? "justify-center gap-0 px-0" : "gap-3 px-3"} ${
                        isActive ? "text-slate-900 font-semibold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId={activeLayoutId}
                          className="absolute inset-0 bg-[#E9EBEF] rounded-xl shadow-2xs -z-10"
                          transition={springs.floating}
                        />
                      )}
                      {isHovered && !isActive && (
                        <motion.div
                          layoutId={hoverLayoutId}
                          className="absolute inset-0 bg-slate-200/50 rounded-xl -z-10"
                          transition={springs.snappy}
                        />
                      )}
                      <BarChart3 className={`w-5 h-5 shrink-0 relative z-10 ${isActive ? "text-slate-900" : "text-slate-500"}`} />
                      {!collapsed && <span className="truncate relative z-10">{APP_CONTENT.sidebar.navItems.overview.title}</span>}
                    </button>
                  )
                }

                if (itemKey === "track" && currentRoleVisibility.track) {
                  const isActive = currentPage === "track"
                  const isHovered = hoveredNav === "track"
                  return (
                    <button
                      key="nav-track"
                      type="button"
                      title={collapsed ? APP_CONTENT.sidebar.navItems.track.title : undefined}
                      onClick={() => {
                        onNavigate("track")
                        if (isMobile) setMobileOpen(false)
                      }}
                      onMouseEnter={() => {
                        setHoveredNav("track")
                        preloadPage("track")
                      }}
                      className={`relative isolate w-full flex items-center py-2 rounded-xl transition-colors text-left cursor-pointer text-sm font-medium ${collapsed ? "justify-center px-0" : "justify-between px-3"} ${
                        isActive ? "text-slate-900 font-semibold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId={activeLayoutId}
                          className="absolute inset-0 bg-[#E9EBEF] rounded-xl shadow-2xs -z-10"
                          transition={springs.floating}
                        />
                      )}
                      {isHovered && !isActive && (
                        <motion.div
                          layoutId={hoverLayoutId}
                          className="absolute inset-0 bg-slate-200/50 rounded-xl -z-10"
                          transition={springs.snappy}
                        />
                      )}
                      <div className={`flex items-center min-w-0 relative z-10 ${collapsed ? "justify-center gap-0" : "gap-3"}`}>
                        <CheckSquare className={`w-5 h-5 shrink-0 ${isActive ? "text-slate-900" : "text-slate-500"}`} />
                        {!collapsed && <span className="truncate">{APP_CONTENT.sidebar.navItems.track.title}</span>}
                      </div>
                      <span className={collapsed
                        ? "absolute right-0.5 top-0 z-20 min-w-4 rounded-full bg-emerald-500 px-1 text-center text-[9px] font-semibold leading-4 text-white ring-2 ring-[#F9FAFB]"
                        : "px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium text-xs shrink-0 relative z-10"
                      }>
                        {activeTaskCount}
                      </span>
                    </button>
                  )
                }

                if (itemKey === "calendar" && currentRoleVisibility.calendar) {
                  const isActive = currentPage === "calendar"
                  const isHovered = hoveredNav === "calendar"
                  return (
                    <button
                      key="nav-calendar"
                      type="button"
                      title={collapsed ? "Planner" : undefined}
                      onClick={() => {
                        onNavigate("calendar")
                        if (isMobile) setMobileOpen(false)
                      }}
                      onMouseEnter={() => {
                        setHoveredNav("calendar")
                        preloadPage("calendar")
                      }}
                      className={`relative isolate w-full flex items-center py-2 rounded-xl transition-colors text-left cursor-pointer text-sm font-medium ${collapsed ? "justify-center gap-0 px-0" : "gap-3 px-3"} ${
                        isActive ? "text-slate-900 font-semibold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId={activeLayoutId}
                          className="absolute inset-0 bg-[#E9EBEF] rounded-xl shadow-2xs -z-10"
                          transition={springs.floating}
                        />
                      )}
                      {isHovered && !isActive && (
                        <motion.div
                          layoutId={hoverLayoutId}
                          className="absolute inset-0 bg-slate-200/50 rounded-xl -z-10"
                          transition={springs.snappy}
                        />
                      )}
                      <DynamicCalendarIcon className={`w-5 h-5 shrink-0 relative z-10 ${isActive ? "text-slate-900" : "text-slate-500"}`} />
                      {!collapsed && <span className="truncate relative z-10">Planner</span>}
                    </button>
                  )
                }

                if (itemKey === "aichat" && (currentRoleVisibility.aichat ?? true) && canUseAi) {
                  const isActive = currentPage === "aichat"
                  const isHovered = hoveredNav === "aichat"
                  return (
                    <button
                      key="nav-aichat"
                      type="button"
                      title={collapsed ? "AI Chats" : undefined}
                      onClick={() => {
                        onNavigate("aichat")
                        if (isMobile) setMobileOpen(false)
                      }}
                      onMouseEnter={() => {
                        setHoveredNav("aichat")
                        preloadPage("aichat")
                      }}
                      className={`relative isolate w-full flex items-center py-2 rounded-xl transition-colors text-left cursor-pointer text-sm font-medium ${collapsed ? "justify-center px-0" : "justify-between px-3"} ${
                        isActive ? "text-slate-900 font-semibold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId={activeLayoutId}
                          className="absolute inset-0 bg-[#E9EBEF] rounded-xl shadow-2xs -z-10"
                          transition={springs.floating}
                        />
                      )}
                      {isHovered && !isActive && (
                        <motion.div
                          layoutId={hoverLayoutId}
                          className="absolute inset-0 bg-slate-200/50 rounded-xl -z-10"
                          transition={springs.snappy}
                        />
                      )}
                      <div className={`flex items-center min-w-0 relative z-10 ${collapsed ? "justify-center gap-0" : "gap-3"}`}>
                        <img src="/ai-default.png" alt="AI" className="w-5 h-5 shrink-0 object-contain" />
                        {!collapsed && <span className="truncate">AI Chats</span>}
                      </div>
                    </button>
                  )
                }

                if (itemKey === "create" && currentRoleVisibility.create) {
                  const isActive = currentPage === "create"
                  const isHovered = hoveredNav === "create"
                  return (
                    <button
                      key="nav-create"
                      type="button"
                      title={collapsed ? APP_CONTENT.sidebar.navItems.create.title : undefined}
                      onClick={() => {
                        onNavigate("create")
                        if (isMobile) setMobileOpen(false)
                      }}
                      onMouseEnter={() => {
                        setHoveredNav("create")
                        preloadPage("create")
                      }}
                      className={`relative isolate w-full flex items-center py-2 rounded-xl transition-colors text-left cursor-pointer text-sm font-medium ${collapsed ? "justify-center gap-0 px-0" : "gap-3 px-3"} ${
                        isActive ? "text-slate-900 font-semibold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId={activeLayoutId}
                          className="absolute inset-0 bg-[#E9EBEF] rounded-xl shadow-2xs -z-10"
                          transition={springs.floating}
                        />
                      )}
                      {isHovered && !isActive && (
                        <motion.div
                          layoutId={hoverLayoutId}
                          className="absolute inset-0 bg-slate-200/50 rounded-xl -z-10"
                          transition={springs.snappy}
                        />
                      )}
                      <PlusCircle className={`w-5 h-5 shrink-0 relative z-10 ${isActive ? "text-slate-900" : "text-slate-500"}`} />
                      {!collapsed && <span className="truncate relative z-10">{APP_CONTENT.sidebar.navItems.create.title}</span>}
                    </button>
                  )
                }

                if (itemKey === "ia" && currentRoleVisibility.ia && canViewIa) {
                  const isActive = currentPage === "ia"
                  const isHovered = hoveredNav === "ia"
                  return (
                    <button
                      key="nav-ia"
                      type="button"
                      title={collapsed ? "IA Map" : undefined}
                      onClick={() => {
                        onNavigate("ia")
                        if (isMobile) setMobileOpen(false)
                      }}
                      onMouseEnter={() => {
                        setHoveredNav("ia")
                        preloadPage("ia")
                      }}
                      className={`relative isolate w-full flex items-center py-2 rounded-xl transition-colors text-left cursor-pointer text-sm font-medium ${collapsed ? "justify-center gap-0 px-0" : "gap-3 px-3"} ${
                        isActive ? "text-slate-900 font-semibold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId={activeLayoutId}
                          className="absolute inset-0 bg-[#E9EBEF] rounded-xl shadow-2xs -z-10"
                          transition={springs.floating}
                        />
                      )}
                      {isHovered && !isActive && (
                        <motion.div
                          layoutId={hoverLayoutId}
                          className="absolute inset-0 bg-slate-200/50 rounded-xl -z-10"
                          transition={springs.snappy}
                        />
                      )}
                      <Network className={`w-5 h-5 shrink-0 relative z-10 ${isActive ? "text-slate-900" : "text-slate-500"}`} />
                      {!collapsed && <span className="truncate relative z-10" title="IA Map">IA Map</span>}
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
              {collapsed ? (
                <div className="mx-2 my-2 h-px bg-slate-200/80" aria-hidden="true" />
              ) : (
                <p className="px-3 py-1 text-xs font-semibold text-slate-600 tracking-normal">
                  {APP_CONTENT.sidebar.sections.resources}
                </p>
              )}

              {navOrder.resources.map((itemKey) => {
                if (itemKey === "compressor" && currentRoleVisibility.compressor) {
                  const isActive = currentPage === "compressor"
                  const isHovered = hoveredNav === "compressor"
                  return (
                    <button
                      key="nav-compressor"
                      type="button"
                      title={collapsed ? APP_CONTENT.sidebar.navItems.compressor.title : undefined}
                      onClick={() => {
                        onNavigate("compressor")
                        if (isMobile) setMobileOpen(false)
                      }}
                      onMouseEnter={() => {
                        setHoveredNav("compressor")
                        preloadPage("compressor")
                      }}
                      className={`relative isolate w-full flex items-center py-2 rounded-xl transition-colors text-left cursor-pointer group text-sm font-medium ${collapsed ? "justify-center px-0" : "justify-between px-3"} ${
                        isActive ? "text-slate-900 font-semibold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId={activeLayoutId}
                          className="absolute inset-0 bg-[#E9EBEF] rounded-xl shadow-2xs -z-10"
                          transition={springs.floating}
                        />
                      )}
                      {isHovered && !isActive && (
                        <motion.div
                          layoutId={hoverLayoutId}
                          className="absolute inset-0 bg-slate-200/50 rounded-xl -z-10"
                          transition={springs.snappy}
                        />
                      )}
                      {collapsed ? (
                        <Camera className={`relative z-10 size-5 ${isActive ? "text-slate-900" : "text-slate-500"}`} />
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0 relative z-10">
                            <span className={`w-2 h-2 rounded-full shrink-0 bg-emerald-500 ${isActive ? "ring-2 ring-emerald-200" : ""}`} />
                            <span className="truncate text-slate-700 group-hover:text-slate-900">{APP_CONTENT.sidebar.navItems.compressor.title}</span>
                          </div>
                          <span className="px-1.5 py-0.2 rounded bg-slate-200/70 text-[10px] font-medium text-slate-600 relative z-10">
                            Tool
                          </span>
                        </>
                      )}
                    </button>
                  )
                }

                if (itemKey === "test" && (currentRoleVisibility.test !== false || isAdmin)) {
                  const isActive = currentPage === "test"
                  const isHovered = hoveredNav === "test"
                  return (
                    <button
                      key="nav-test"
                      type="button"
                      title={collapsed ? "Bài test" : undefined}
                      onClick={() => {
                        onNavigate("test")
                        if (isMobile) setMobileOpen(false)
                      }}
                      onMouseEnter={() => {
                        setHoveredNav("test")
                        preloadPage("test")
                      }}
                      className={`relative isolate w-full flex items-center py-2 rounded-xl transition-colors text-left cursor-pointer group text-sm font-medium ${collapsed ? "justify-center px-0" : "justify-between px-3"} ${
                        isActive ? "text-slate-900 font-semibold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId={activeLayoutId}
                          className="absolute inset-0 bg-[#E9EBEF] rounded-xl shadow-2xs -z-10"
                          transition={springs.floating}
                        />
                      )}
                      {isHovered && !isActive && (
                        <motion.div
                          layoutId={hoverLayoutId}
                          className="absolute inset-0 bg-slate-200/50 rounded-xl -z-10"
                          transition={springs.snappy}
                        />
                      )}
                      {collapsed ? (
                        <Layers className={`relative z-10 size-5 ${isActive ? "text-slate-900" : "text-slate-500"}`} />
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0 relative z-10">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <span className="truncate text-slate-700 group-hover:text-slate-900">Bài test</span>
                          </div>
                          <span className="px-1.5 py-0.2 rounded bg-blue-100 text-[10px] font-medium text-blue-700 relative z-10">
                            Exam
                          </span>
                        </>
                      )}
                    </button>
                  )
                }

                return null
              })}
            </div>
          )}
        </div>

        {/* 3. Bottom Footer (Admin Setting + User Profile Card) */}
        <div 
          className={collapsed ? "px-2 py-3 border-t border-slate-200/70 bg-[#F9FAFB] relative space-y-2" : "p-3 border-t border-slate-200/70 bg-[#F9FAFB] relative space-y-2"}
          ref={userMenuRef}
          onMouseLeave={() => setHoveredNav(null)}
        >
          {/* Render footer tools (Admin setting & Invite Team) based on navOrder.resources */}
          {navOrder.resources
            .filter((k) => k === "manage" || k === "invite")
            .map((itemKey) => {
              if (itemKey === "manage" && isAdmin && currentRoleVisibility.manage) {
                const isActive = currentPage === "manage"
                const isHovered = hoveredNav === "manage"
                return (
                  <button
                    key="nav-manage"
                    type="button"
                    title={collapsed ? "Admin setting" : undefined}
                    onClick={() => {
                      onNavigate("manage")
                      if (isMobile) setMobileOpen(false)
                    }}
                    onMouseEnter={() => setHoveredNav("manage")}
                    className={`relative isolate w-full flex items-center py-2 rounded-xl transition-colors text-left cursor-pointer text-sm font-medium ${collapsed ? "justify-center gap-0 px-0" : "gap-3 px-3"} ${
                      isActive ? "text-slate-900 font-semibold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId={activeLayoutId}
                        className="absolute inset-0 bg-[#E9EBEF] rounded-xl shadow-2xs -z-10"
                        transition={springs.floating}
                      />
                    )}
                    {isHovered && !isActive && (
                      <motion.div
                        layoutId={hoverLayoutId}
                        className="absolute inset-0 bg-slate-200/50 rounded-xl -z-10"
                        transition={springs.snappy}
                      />
                    )}
                    <ShieldCheck className={`w-5 h-5 shrink-0 relative z-10 ${isActive ? "text-slate-900" : "text-slate-500"}`} />
                    {!collapsed && <span className="truncate relative z-10">Admin setting</span>}
                  </button>
                )
              }

              if (itemKey === "invite" && currentRoleVisibility.invite) {
                const isHovered = hoveredNav === "invite"
                return (
                  <button
                    key="nav-invite"
                    type="button"
                    title={collapsed ? "Invite Team" : undefined}
                    onClick={() => {
                      setInviteOpen(true)
                      if (isMobile) setMobileOpen(false)
                    }}
                    onMouseEnter={() => setHoveredNav("invite")}
                    className={`relative isolate w-full flex items-center py-2 rounded-xl transition-colors text-left cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900 ${collapsed ? "justify-center gap-0 px-0" : "gap-3 px-3"}`}
                  >
                    {isHovered && (
                      <motion.div
                        layoutId={hoverLayoutId}
                        className="absolute inset-0 bg-slate-200/50 rounded-xl -z-10"
                        transition={springs.snappy}
                      />
                    )}
                    <UserPlus className="w-5 h-5 shrink-0 text-slate-500 relative z-10" />
                    {!collapsed && <span className="truncate relative z-10">Invite Team</span>}
                  </button>
                )
              }

              return null
            })}
        </div>
      </nav>
    )
  }

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

      {/* Mobile Drawer with AnimatePresence */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Mobile Overlay */}
            <motion.div
              key="mobile-sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40"
              onClick={() => setMobileOpen(false)}
            />

            {/* Mobile Sidebar Drawer */}
            <motion.aside
              key="mobile-sidebar-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={springs.gentle}
              className="md:hidden fixed top-0 left-0 h-full w-64 bg-[#F9FAFB] border-r border-slate-200/80 z-50 flex flex-col shadow-2xl"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (ReUI App Shell 1 Exact Style) */}
      <aside
        className={`hidden md:flex fixed top-0 left-0 h-full bg-[#F9FAFB] border-r border-slate-200/80 z-30 flex-col transition-[width] duration-300 ease-out ${isCollapsed ? "w-[72px]" : "w-60"}`}
      >
        {renderSidebarContent(false)}
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
