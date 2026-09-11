import React, { useState, useRef, useEffect } from "react"
import { 
  ChevronRight, 
  Search, 
  Bell, 
  LayoutGrid, 
  Menu, 
  X, 
  Home, 
  CheckSquare, 
  PlusCircle, 
  ShieldCheck, 
  Camera, 
  LogOut, 
  Layers, 
  Check, 
  Sparkles,
  ExternalLink,
  Eye,
  User,
  Palette,
  Crown,
  Briefcase,
  Building2,
  Edit3,
  Loader2,
} from "lucide-react"
import type { Page } from "../Sidebar"
import { UserRole } from "@/data/mockData"
import { UserSession, logoutTeamsSession, startRolePreview, stopRolePreview, getStoredSession } from "@/services/otpAuthService"
import { uploadAvatarToDrive } from "@/services/googleSheetService"
import { UserAvatar } from "./UserAvatar"
import { toast } from "@/components/ui/toast"
import { motion, AnimatePresence } from "framer-motion"
import { springs, originPopoverVariants, dialogOverlayVariants, dialogContentVariants } from "@/lib/motion"
import NotificationDropdown from "../notification/NotificationDropdown"
import { useNotifications } from "@/services/notificationService"

interface AppHeaderProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  session: UserSession | null
  onToggleMobileMenu?: () => void
}

const PAGE_METADATA: Record<Page, { title: string; section: string }> = {
  overview: { title: "Dashboard", section: "Dashboards" },
  track: { title: "Track Task", section: "Dashboards" },
  create: { title: "Tạo task mới", section: "Workspace" },
  manage: { title: "Quản trị hệ thống", section: "Workspace" },
  test: { title: "Khảo sát & Đánh giá UX", section: "Resources" },
  compressor: { title: "Nén & Tối ưu ảnh", section: "Resources" },
}

export default function AppHeader({
  currentPage,
  onNavigate,
  session,
  onToggleMobileMenu,
}: AppHeaderProps) {
  const [appsOpen, setAppsOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { unreadCount } = useNotifications()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isChangeNameOpen, setIsChangeNameOpen] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const appsRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const headerAvatarInputRef = useRef<HTMLInputElement>(null)

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (appsRef.current && !appsRef.current.contains(target)) setAppsOpen(false)
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setUserMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Keyboard shortcut: Cmd+K, Shift+Cmd+P, Shift+Cmd+Q, Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      } else if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault()
        setUserMenuOpen(false)
        headerAvatarInputRef.current?.click()
      } else if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "q") {
        e.preventDefault()
        handleLogout()
      } else if (e.key === "Escape") {
        setUserMenuOpen(false)
        setAppsOpen(false)
        setNotifOpen(false)
        setIsChangeNameOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  const meta = PAGE_METADATA[currentPage] || { title: "Trang chủ", section: "Platform" }
  const displayName = session?.displayName || "Lê Hoàng Nam"
  const userRole = session?.role || "Designer"

  // 5 Role options for "View theo role"
  const ROLE_OPTIONS: { id: UserRole; label: string; icon: React.ElementType }[] = [
    { id: "Admin", label: "Admin", icon: ShieldCheck },
    { id: "Design Owner", label: "Design Owner", icon: Crown },
    { id: "Designer", label: "Design", icon: Palette },
    { id: "PO", label: "PO", icon: Briefcase },
    { id: "Business", label: "Business", icon: Building2 },
  ]

  const handleSelectRole = (targetRole: UserRole, label: string) => {
    if (targetRole === "Admin") {
      stopRolePreview()
      toast.success("Đã chuyển sang vai trò: Admin")
    } else {
      startRolePreview(targetRole)
      toast.success(`Đã chuyển sang vai trò: ${label}`)
    }
    setUserMenuOpen(false)
  }

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    const currentSess = getStoredSession() || session
    const userEmail = currentSess?.teamsEmail || currentSess?.personalEmail || "user@mbbank.com.vn"
    setUploadingAvatar(true)
    toast.info("Đang tải ảnh đại diện lên Google Drive...")

    try {
      const res = await uploadAvatarToDrive(file, userEmail)
      let newUrl = res.avatarUrl
      if (!newUrl) {
        newUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
      }
      if (newUrl) {
        const updated = { ...(currentSess || {}), avatarUrl: newUrl }
        sessionStorage.setItem("ux_portal_session_auth", JSON.stringify(updated))
        localStorage.setItem("ux_portal_session_auth", JSON.stringify(updated))
        localStorage.setItem("ux_portal_session", JSON.stringify(updated))

        try {
          const updateStorage = (key: string) => {
            const raw = localStorage.getItem(key)
            if (raw) {
              const list = JSON.parse(raw)
              const found = list.find((m: any) => m.email === userEmail || m.teamsEmail === userEmail)
              if (found) {
                found.avatarUrl = newUrl
                localStorage.setItem(key, JSON.stringify(list))
              }
            }
          }
          updateStorage("mbbank_team_members")
          updateStorage("mbbank_admin_team")
        } catch {}

        window.dispatchEvent(new Event("auth_session_changed"))
        window.dispatchEvent(new Event("storage"))
        toast.success("Đã cập nhật ảnh đại diện thành công!")
      }
    } catch (err) {
      toast.error("Không thể cập nhật ảnh đại diện. Vui lòng thử lại.")
    } finally {
      setUploadingAvatar(false)
      setUserMenuOpen(false)
    }
  }

  const handleSaveDisplayName = (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed) {
      toast.error("Vui lòng nhập tên hiển thị")
      return
    }

    const currentSess = getStoredSession() || session
    const updated = { 
      ...(currentSess || {}), 
      displayName: trimmed,
      originalDisplayName: trimmed,
    }

    sessionStorage.setItem("ux_portal_session_auth", JSON.stringify(updated))
    localStorage.setItem("ux_portal_session_auth", JSON.stringify(updated))
    localStorage.setItem("ux_portal_session", JSON.stringify(updated))

    try {
      const backupRaw = sessionStorage.getItem("ux_portal_admin_original_session") || localStorage.getItem("ux_portal_admin_original_session")
      if (backupRaw) {
        const backup = JSON.parse(backupRaw)
        backup.displayName = trimmed
        backup.originalDisplayName = trimmed
        sessionStorage.setItem("ux_portal_admin_original_session", JSON.stringify(backup))
        localStorage.setItem("ux_portal_admin_original_session", JSON.stringify(backup))
      }
    } catch {}

    try {
      const updateStorage = (key: string) => {
        const raw = localStorage.getItem(key)
        if (raw) {
          const list = JSON.parse(raw)
          const userEmail = updated.teamsEmail || updated.personalEmail
          const found = list.find((m: any) => m.email === userEmail || m.teamsEmail === userEmail)
          if (found) {
            found.name = trimmed
            localStorage.setItem(key, JSON.stringify(list))
          }
        }
      }
      updateStorage("mbbank_team_members")
      updateStorage("mbbank_admin_team")
    } catch {}

    window.dispatchEvent(new Event("auth_session_changed"))
    window.dispatchEvent(new Event("storage"))
    toast.success(`Đã đổi tên hiển thị thành "${trimmed}"`)
    setIsChangeNameOpen(false)
  }

  const handleLogout = async () => {
    await logoutTeamsSession()
    window.location.hash = "#overview"
    window.location.reload()
  }

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearchOpen(false)
    if (currentPage !== "track") {
      onNavigate("track")
    }
    // Broadcast query to track page search input
    setTimeout(() => {
      const searchInputs = document.querySelectorAll<HTMLInputElement>('input[placeholder*="Tìm kiếm task"]')
      if (searchInputs.length > 0) {
        searchInputs[0].value = searchQuery
        searchInputs[0].dispatchEvent(new Event("input", { bubbles: true }))
        searchInputs[0].focus()
      }
    }, 200)
  }

  const appGridItems: { id: Page; title: string; subtitle: string; icon: React.ElementType }[] = [
    { id: "overview", title: "Dashboard", subtitle: "Bảng điều hành", icon: Home },
    { id: "track", title: "Track Task", subtitle: "Bảng theo dõi tiến độ", icon: CheckSquare },
    { id: "create", title: "Tạo task mới", subtitle: "Gửi đề bài UX", icon: PlusCircle },
    { id: "compressor", title: "Nén ảnh", subtitle: "Tối ưu dung lượng", icon: Camera },
    { id: "test", title: "Khảo sát UX", subtitle: "Đánh giá năng lực", icon: Layers },
    { id: "manage", title: "Quản trị", subtitle: "Cấu hình hệ thống", icon: ShieldCheck },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 lg:px-8 flex items-center justify-between select-none">
        {/* Left: Mobile hamburger + ReUI Breadcrumb (Dashboards > Overview style) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              aria-label="Mở menu điều hướng"
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 -ml-1"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Breadcrumb matching ReUI app-shell-12: Dashboards > Overview */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 truncate">
            <span className="hover:text-slate-700 transition-colors truncate">
              {meta.section}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-900 font-semibold truncate">
              {meta.title}
            </span>
          </nav>
        </div>

        {/* Right: Utilities (Search, Notifications, Apps, Avatar) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* 1. Search Trigger Button (ReUI App Shell 12 style) */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Tìm kiếm nhanh (⌘K)"
            className="h-8 w-8 sm:w-auto sm:px-2.5 sm:gap-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center text-xs font-medium cursor-pointer"
            title="Tìm kiếm bài toán, designer, squad... (⌘K)"
          >
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="hidden sm:inline text-slate-400 font-normal">Tìm kiếm...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded">
              ⌘K
            </kbd>
          </button>

          {/* 2. Notifications Bell (ReUI App Shell 12 style) */}
          <div className="relative" ref={notifRef}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                setNotifOpen(!notifOpen)
                setAppsOpen(false)
                setUserMenuOpen(false)
              }}
              aria-label="Thông báo hệ thống"
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors relative cursor-pointer ${
                notifOpen ? "bg-slate-100 text-slate-900" : ""
              }`}
              title="Thông báo"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs animate-in zoom-in">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </motion.button>

            {/* Notifications Popover */}
            <AnimatePresence>
              {notifOpen && (
                <NotificationDropdown
                  isOpen={notifOpen}
                  onClose={() => setNotifOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* 3. Apps Grid Switcher (ReUI App Shell 12 style) */}
          <div className="relative" ref={appsRef}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                setAppsOpen(!appsOpen)
                setNotifOpen(false)
                setUserMenuOpen(false)
              }}
              aria-label="Các ứng dụng & phân hệ"
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer ${
                appsOpen ? "bg-slate-100 text-slate-900" : ""
              }`}
              title="Ứng dụng & Phân hệ"
            >
              <LayoutGrid className="w-4 h-4" />
            </motion.button>

            {/* Apps Grid Popover */}
            <AnimatePresence>
              {appsOpen && (
                <motion.div
                  variants={originPopoverVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={springs.popover}
                  style={{ transformOrigin: "top right" }}
                  className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-3 z-50 select-none"
                >
                  <div className="px-2 py-1.5 mb-1.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">Ứng dụng & Phân hệ</p>
                    <p className="text-[11px] text-slate-400">Chuyển đổi nhanh giữa các module</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {appGridItems.map((item, aIdx) => {
                      const Icon = item.icon
                      const isActive = currentPage === item.id
                      return (
                        <button
                          key={item.id || `app-item-${aIdx}`}
                          type="button"
                          onClick={() => {
                            onNavigate(item.id)
                            setAppsOpen(false)
                          }}
                          className={`p-2.5 rounded-xl text-left transition-all flex flex-col gap-1 cursor-pointer ${
                            isActive
                              ? "bg-blue-50/80 border border-blue-200/80 text-blue-900"
                              : "hover:bg-slate-50 border border-transparent text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <Icon className={`w-4 h-4 ${isActive ? "text-[#1057FB]" : "text-slate-500"}`} />
                            {isActive && <Check className="w-3 h-3 text-[#1057FB]" />}
                          </div>
                          <span className="text-xs font-semibold leading-tight truncate">{item.title}</span>
                          <span className="text-[10px] text-slate-400 leading-tight truncate">{item.subtitle}</span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />

          {/* 4. User Profile Avatar & Dropdown (ReUI App Shell 12 style) */}
          <div className="relative" ref={userMenuRef}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                setUserMenuOpen(!userMenuOpen)
                setAppsOpen(false)
                setNotifOpen(false)
              }}
              aria-label={`Tài khoản: ${displayName}`}
              className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-slate-200 transition-all cursor-pointer"
            >
              <UserAvatar
                name={displayName}
                avatarUrl={session?.avatarUrl}
                size="sm"
                className="w-7 h-7 sm:w-8 sm:h-8"
              />
            </motion.button>

            {/* Profile Dropdown (ReUI App Shell 12 Exact Replica) */}
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  variants={originPopoverVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={springs.popover}
                  style={{ transformOrigin: "top right" }}
                  className="absolute right-0 top-full mt-2 w-[260px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-1 z-50 select-none"
                >
                  {/* 1. Header: Avatar + Name + Email */}
                  <div className="flex items-center gap-3 p-3 border-b border-slate-100">
                    <UserAvatar
                      name={displayName}
                      avatarUrl={session?.avatarUrl}
                      size="sm"
                      className="w-9 h-9 rounded-full ring-1 ring-slate-200/80 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
                        {displayName}
                      </p>
                      <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">
                        {session?.teamsEmail || session?.personalEmail || "theo@reui.io"}
                      </p>
                    </div>
                  </div>

                  {/* 2. View theo role Section (thay thế Organizations) */}
                  <div className="py-2 border-b border-slate-100">
                    <div className="px-3 pb-1.5 text-xs font-semibold text-slate-500 select-none">
                      View theo role
                    </div>
                    <div className="space-y-0.5 px-1.5">
                      {ROLE_OPTIONS.map((role, rIdx) => {
                        const isSelected = userRole === role.id
                        const Icon = role.icon
                        return (
                          <button
                            key={role.id || `role-${rIdx}`}
                            type="button"
                            onClick={() => handleSelectRole(role.id, role.label)}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors text-left cursor-pointer group ${
                              isSelected ? "bg-slate-100/80 font-semibold" : "hover:bg-slate-50 font-normal"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-[#1057FB]" : "text-slate-500 group-hover:text-slate-700"}`} />
                              <span className={`text-xs ${isSelected ? "text-slate-900 font-semibold" : "text-slate-700"}`}>
                                {role.label}
                              </span>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-[#1057FB] shrink-0 ml-2" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 3. Account Section (chỉ để lại Đổi ảnh đại diện và Đổi tên hiển thị) */}
                  <div className="py-2 border-b border-slate-100">
                    <div className="px-3 pb-1.5 text-xs font-semibold text-slate-500 select-none">
                      Account
                    </div>
                    <div className="space-y-0.5 px-1.5">
                      {/* Đổi ảnh đại diện */}
                      <button
                        type="button"
                        disabled={uploadingAvatar}
                        onClick={() => headerAvatarInputRef.current?.click()}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer text-slate-900"
                      >
                        <div className="flex items-center gap-2.5">
                          {uploadingAvatar ? (
                            <Loader2 className="w-4 h-4 text-[#1057FB] animate-spin shrink-0" />
                          ) : (
                            <Camera className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <span className="text-xs font-medium text-slate-900">
                            {uploadingAvatar ? "Đang tải ảnh lên..." : "Đổi ảnh đại diện"}
                          </span>
                        </div>
                      </button>

                      {/* Đổi tên hiển thị */}
                      <button
                        type="button"
                        onClick={() => {
                          setNameInput(displayName)
                          setIsChangeNameOpen(true)
                          setUserMenuOpen(false)
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer text-slate-900"
                      >
                        <div className="flex items-center gap-2.5">
                          <Edit3 className="w-4 h-4 text-slate-600 shrink-0" />
                          <span className="text-xs font-medium text-slate-900">Đổi tên hiển thị</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 4. Sign Out Section */}
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer text-slate-900"
                    >
                      <div className="flex items-center gap-2.5">
                        <LogOut className="w-4 h-4 text-slate-700 shrink-0" />
                        <span className="text-xs font-medium text-slate-900">Sign Out</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-sans tracking-wide">⇧⌘Q</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Global Quick Search Modal (⌘K Dialog) */}
      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 select-none">
            {/* Backdrop */}
            <motion.div
              variants={dialogOverlayVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
              onClick={() => setSearchOpen(false)}
            />

            {/* Content */}
            <motion.div 
              variants={dialogContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springs.modal}
              className="relative z-10 w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleGlobalSearch} className="flex items-center px-4 border-b border-slate-200">
                <Search className="w-4 h-4 text-slate-400 shrink-0 mr-3" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm bài toán, designer, squad... (Enter để tìm)"
                  className="w-full h-12 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded">
                    ESC
                  </kbd>
                </button>
              </form>
              <div className="p-3 text-xs text-slate-500 bg-slate-50 flex items-center justify-between">
                <span>Bấm <strong className="text-slate-700">Enter</strong> để chuyển đến bảng lọc bài toán</span>
                <span className="text-[11px] text-slate-400">MB UX Portal</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden File Input for Avatar Upload */}
      <input
        ref={headerAvatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploadingAvatar}
        onChange={handleUploadAvatar}
      />

      {/* Modal Đổi tên hiển thị */}
      <AnimatePresence>
        {isChangeNameOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
            {/* Backdrop */}
            <motion.div
              variants={dialogOverlayVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
              onClick={() => setIsChangeNameOpen(false)}
            />

            {/* Content */}
            <motion.div 
              variants={dialogContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springs.modal}
              className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1057FB] shrink-0 shadow-2xs">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">Đổi tên hiển thị</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-normal">Cập nhật họ và tên của bạn hiển thị trên toàn hệ thống</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangeNameOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveDisplayName} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Tên hiển thị mới</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Nhập tên hiển thị mới..."
                    autoFocus
                    className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#1057FB] focus:ring-2 focus:ring-[#1057FB]/20 outline-none transition-all text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsChangeNameOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1057FB] hover:bg-blue-600 shadow-sm rounded-xl transition-colors cursor-pointer"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
