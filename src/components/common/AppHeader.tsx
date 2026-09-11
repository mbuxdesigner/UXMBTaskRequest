import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
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
  ArrowRight,
  CornerDownLeft,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Hash,
  SearchX,
  Shield,
} from "lucide-react"
import type { Page } from "../Sidebar"
import { UserRole, UXRequest } from "@/data/mockData"
import { UserSession, logoutTeamsSession, startRolePreview, stopRolePreview, getStoredSession } from "@/services/otpAuthService"
import { uploadAvatarToDrive } from "@/services/googleSheetService"
import { fetchRequests } from "@/api/api"
import { canUserAccessRequest, filterRequestsByRole, normalizeVietnameseString, canRoleAccessCapability } from "@/lib/accessControl"
import RequestDetail from "../track/RequestDetail"
import { UserAvatar } from "./UserAvatar"
import { toast } from "@/components/ui/toast"
import { motion, AnimatePresence } from "framer-motion"
import { 
  springs, 
  originPopoverVariants, 
  dialogOverlayVariants, 
  dialogContentVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/motion"
import NotificationDropdown from "../notification/NotificationDropdown"
import { useNotifications } from "@/services/notificationService"
import { IconStack } from "@/components/reui/icon-stack"
import { getRoleNavConfig, RoleNavConfig, DEFAULT_ROLE_NAV_CONFIG } from "@/config/navVisibilityConfig"

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
  const [categoryFilter, setCategoryFilter] = useState<"all" | "tasks" | "members" | "actions">("all")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [allRequests, setAllRequests] = useState<UXRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [activeDetailRequest, setActiveDetailRequest] = useState<UXRequest | null>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const [isChangeNameOpen, setIsChangeNameOpen] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [navConfig, setNavConfig] = useState<RoleNavConfig>(() => getRoleNavConfig())

  const appsRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const headerAvatarInputRef = useRef<HTMLInputElement>(null)

  // Đồng bộ cấu hình hiển thị phân quyền Realtime với Quản trị
  useEffect(() => {
    const handleNavChange = () => {
      setNavConfig(getRoleNavConfig())
    }
    window.addEventListener("nav_visibility_changed", handleNavChange)
    window.addEventListener("storage", handleNavChange)
    return () => {
      window.removeEventListener("nav_visibility_changed", handleNavChange)
      window.removeEventListener("storage", handleNavChange)
    }
  }, [])

  // Tải danh sách bài toán (có cache 0ms memory & 1ms localStorage)
  const loadRequestsData = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoadingRequests(true)
      const data = await fetchRequests(forceRefresh)
      if (Array.isArray(data)) {
        setAllRequests(data)
      }
    } catch (err) {
      console.warn("Could not load requests for smart search:", err)
    } finally {
      setIsLoadingRequests(false)
    }
  }, [])

  useEffect(() => {
    loadRequestsData()
    const onRefresh = () => loadRequestsData(true)
    window.addEventListener("refresh_requests_cache", onRefresh)
    window.addEventListener("storage", onRefresh)
    return () => {
      window.removeEventListener("refresh_requests_cache", onRefresh)
      window.removeEventListener("storage", onRefresh)
    }
  }, [loadRequestsData])

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
        if (searchOpen) {
          setSearchOpen(false)
        }
        setUserMenuOpen(false)
        setAppsOpen(false)
        setNotifOpen(false)
        setIsChangeNameOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [searchOpen])

  useEffect(() => {
    if (searchOpen) {
      if (allRequests.length === 0) {
        loadRequestsData()
      }
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 60)
    } else {
      setSearchQuery("")
      setSelectedIndex(0)
      setCategoryFilter("all")
    }
  }, [searchOpen, allRequests.length, loadRequestsData])

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

  // Cấu hình trạng thái bài toán cho Smart Search
  const getTaskStatusBadgeConfig = (status: string) => {
    switch (status) {
      case "Hoàn thành":
        return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 }
      case "Đang thực hiện":
        return { bg: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Clock }
      case "Đang phân loại":
        return { bg: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertCircle }
      case "Chờ duyệt":
        return { bg: "bg-purple-50 text-purple-700 border-purple-200", icon: ShieldCheck }
      case "Chờ tiếp nhận":
      case "Mới tạo":
        return { bg: "bg-blue-50 text-blue-700 border-blue-200", icon: Sparkles }
      case "Hủy":
        return { bg: "bg-rose-50 text-rose-700 border-rose-200", icon: X }
      default:
        return { bg: "bg-slate-50 text-slate-700 border-slate-200", icon: FileText }
    }
  }

  // Danh sách thành viên team
  const teamMembers = useMemo(() => {
    try {
      const raw = localStorage.getItem("mbbank_admin_team") || localStorage.getItem("mbbank_team_members")
      if (raw) {
        const list = JSON.parse(raw)
        if (Array.isArray(list) && list.length > 0) return list
      }
    } catch {}
    return []
  }, [])

  // Danh sách Quick Actions & Phím tắt (được bảo vệ nghiêm ngặt theo RBAC và cấu hình phân quyền Menu Navigation)
  const quickActions = useMemo(() => {
    const list: Array<{
      kind: "action"
      id: string
      title: string
      subtitle: string
      icon: React.ElementType
      badge?: string
      onSelect: () => void
    }> = []
    const role = session?.role || "Designer"
    const visibility = navConfig[role] || DEFAULT_ROLE_NAV_CONFIG[role] || DEFAULT_ROLE_NAV_CONFIG.Designer

    // 1. Tạo bài toán mới (Chỉ hiển thị nếu được phân quyền 'create' và có capability 'cap-request')
    if (visibility.create && canRoleAccessCapability(role, "cap-request")) {
      list.push({
        kind: "action",
        id: "action-create",
        title: "Tạo bài toán UX mới",
        subtitle: "Gửi đề bài thiết kế hoặc khảo sát tới UX Team",
        icon: PlusCircle,
        badge: "Workspace",
        onSelect: () => onNavigate("create"),
      })
    }

    // 2. Bảng theo dõi bài toán (Chỉ hiển thị nếu được phân quyền 'track')
    if (visibility.track) {
      list.push({
        kind: "action",
        id: "action-track",
        title: "Theo dõi bài toán (Track Task)",
        subtitle: "Bảng Kanban và danh sách bài toán chi tiết",
        icon: CheckSquare,
        badge: "Dashboard",
        onSelect: () => onNavigate("track"),
      })
    }

    // 3. Báo cáo tổng quan (Chỉ hiển thị nếu được phân quyền 'overview')
    if (visibility.overview) {
      list.push({
        kind: "action",
        id: "action-overview",
        title: "Báo cáo tổng quan (Dashboard)",
        subtitle: "Số liệu KPI, tiến độ và tải công việc đội ngũ",
        icon: Home,
        badge: "Dashboard",
        onSelect: () => onNavigate("overview"),
      })
    }

    // 4. Khảo sát & Đánh giá UX (Chỉ hiển thị nếu được phân quyền 'test' và có capability 'cap-test')
    if (visibility.test && (canRoleAccessCapability(role, "cap-test") || role === "Admin" || role === "Design Owner")) {
      list.push({
        kind: "action",
        id: "action-test",
        title: "Khảo sát & Đánh giá UX",
        subtitle: "Đánh giá mức độ hài lòng và năng lực trải nghiệm",
        icon: Layers,
        badge: "Resources",
        onSelect: () => onNavigate("test"),
      })
    }

    // 5. Nén & Tối ưu ảnh (Chỉ hiển thị nếu được phân quyền 'compressor')
    if (visibility.compressor) {
      list.push({
        kind: "action",
        id: "action-compressor",
        title: "Nén & Tối ưu ảnh",
        subtitle: "Tối ưu dung lượng ảnh tải lên tài liệu và báo cáo",
        icon: Camera,
        badge: "Tools",
        onSelect: () => onNavigate("compressor"),
      })
    }

    // 6. Quản trị hệ thống (Chỉ hiển thị nếu được phân quyền 'manage' và là Admin/Design Owner)
    if (visibility.manage && (role === "Admin" || role === "Design Owner" || canRoleAccessCapability(role, "cap-workflow"))) {
      list.push({
        kind: "action",
        id: "action-manage",
        title: "Quản trị hệ thống & Cấu hình Squad",
        subtitle: "Quản lý nhân sự, phân quyền RBAC và cấu hình hệ thống",
        icon: ShieldCheck,
        badge: "Admin",
        onSelect: () => onNavigate("manage"),
      })
    }

    // 7. Thao tác người dùng cá nhân
    list.push({
      kind: "action",
      id: "action-rename",
      title: "Đổi tên hiển thị",
      subtitle: "Cập nhật tên hiển thị của tài khoản hiện tại",
      icon: Edit3,
      badge: "User",
      onSelect: () => setIsChangeNameOpen(true),
    })

    list.push({
      kind: "action",
      id: "action-avatar",
      title: "Cập nhật ảnh đại diện",
      subtitle: "Tải ảnh mới từ máy tính lên Google Drive",
      icon: User,
      badge: "User",
      onSelect: () => headerAvatarInputRef.current?.click(),
    })

    list.push({
      kind: "action",
      id: "action-logout",
      title: "Đăng xuất tài khoản",
      subtitle: "Xóa phiên làm việc hiện tại và thoát khỏi hệ thống",
      icon: LogOut,
      badge: "Auth",
      onSelect: () => handleLogout(),
    })

    return list
  }, [session?.role, navConfig, onNavigate])

  // Lọc danh sách bài toán THEO QUYỀN TRUY CẬP (RBAC) trước khi áp dụng tìm kiếm
  const roleFilteredRequests = useMemo(() => {
    return filterRequestsByRole(allRequests, session)
  }, [allRequests, session])

  // Kết quả tìm kiếm đa đối tượng (Bài toán, Nhân sự, Tác vụ)
  const { matchedTasks, matchedMembers, matchedActions } = useMemo(() => {
    const trimmed = searchQuery.trim()
    const norm = normalizeVietnameseString(trimmed)

    if (!trimmed) {
      // Khi ô tìm kiếm rỗng: hiển thị các bài toán gần nhất mà user có quyền xem + các tác vụ
      const recentTasks = roleFilteredRequests.slice(0, 5).map((r) => ({
        kind: "task" as const,
        id: `task-${r.request_id || r.id}`,
        task: r,
        title: r.title || "Bài toán không tên",
        requestId: r.request_id || "",
        product: r.product || "",
        squad: r.preferred_squad || r.squad_name || r.squad || "",
        status: r.status || "Mới tạo",
        designer: r.assigned_designer || "",
        requester: r.requester_name || "",
      }))

      return {
        matchedTasks: categoryFilter === "members" || categoryFilter === "actions" ? [] : recentTasks,
        matchedMembers: [],
        matchedActions: categoryFilter === "tasks" || categoryFilter === "members" ? [] : quickActions.slice(0, 6),
      }
    }

    // 1. Tìm kiếm Tasks (Đã được lọc qua RBAC roleFilteredRequests)
    const taskResults: Array<{
      kind: "task"
      id: string
      task: UXRequest
      title: string
      requestId: string
      product: string
      squad: string
      status: string
      designer: string
      requester: string
    }> = []

    if (categoryFilter === "all" || categoryFilter === "tasks") {
      for (const r of roleFilteredRequests) {
        const normTitle = normalizeVietnameseString(r.title)
        const normId = normalizeVietnameseString(r.request_id || "")
        const normProduct = normalizeVietnameseString(r.product || "")
        const normSquad = normalizeVietnameseString(r.preferred_squad || r.squad_name || r.squad || "")
        const normDesigner = normalizeVietnameseString(r.assigned_designer || "")
        const normRequester = normalizeVietnameseString(r.requester_name || "")
        const normStatus = normalizeVietnameseString(r.status || "")

        if (
          normTitle.includes(norm) ||
          normId.includes(norm) ||
          normProduct.includes(norm) ||
          normSquad.includes(norm) ||
          normDesigner.includes(norm) ||
          normRequester.includes(norm) ||
          normStatus.includes(norm)
        ) {
          taskResults.push({
            kind: "task",
            id: `task-${r.request_id || r.id}`,
            task: r,
            title: r.title || "Bài toán không tên",
            requestId: r.request_id || "",
            product: r.product || "",
            squad: r.preferred_squad || r.squad_name || r.squad || "",
            status: r.status || "Mới tạo",
            designer: r.assigned_designer || "",
            requester: r.requester_name || "",
          })
          if (taskResults.length >= 10) break
        }
      }
    }

    // 2. Tìm kiếm Nhân sự
    const memberResults: Array<{
      kind: "member"
      id: string
      name: string
      email: string
      role: string
      squad: string
      avatarUrl?: string
    }> = []

    if (categoryFilter === "all" || categoryFilter === "members") {
      for (const m of teamMembers) {
        const normName = normalizeVietnameseString(m.name || "")
        const normEmail = (m.email || m.teamsEmail || "").toLowerCase()
        const normRole = normalizeVietnameseString(m.role || "")
        const normSquad = normalizeVietnameseString(m.squad || "")

        if (
          normName.includes(norm) ||
          normEmail.includes(trimmed.toLowerCase()) ||
          normRole.includes(norm) ||
          normSquad.includes(norm)
        ) {
          memberResults.push({
            kind: "member",
            id: `member-${m.id || m.email || m.name}`,
            name: m.name || "Thành viên",
            email: m.email || m.teamsEmail || "",
            role: m.role || "Designer",
            squad: m.squad || "",
            avatarUrl: m.avatarUrl,
          })
          if (memberResults.length >= 6) break
        }
      }
    }

    // 3. Tìm kiếm Tác vụ
    const actionResults: typeof quickActions = []
    if (categoryFilter === "all" || categoryFilter === "actions") {
      for (const act of quickActions) {
        const normTitle = normalizeVietnameseString(act.title)
        const normSub = normalizeVietnameseString(act.subtitle)
        if (normTitle.includes(norm) || normSub.includes(norm)) {
          actionResults.push(act)
        }
      }
    }

    return {
      matchedTasks: taskResults,
      matchedMembers: memberResults,
      matchedActions: actionResults,
    }
  }, [searchQuery, roleFilteredRequests, teamMembers, quickActions, categoryFilter])

  // Danh sách phẳng để phục vụ duyệt phím mũi tên ↑ / ↓
  const flatResults = useMemo(() => {
    return [...matchedTasks, ...matchedMembers, ...matchedActions]
  }, [matchedTasks, matchedMembers, matchedActions])

  // Reset selectedIndex khi danh sách thay đổi
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery, categoryFilter])

  // Xử lý khi chọn một mục bất kỳ trong Smart Search
  const handleSelectSmartItem = useCallback(
    (item: (typeof flatResults)[number]) => {
      setSearchOpen(false)

      if (item.kind === "task") {
        // Mở trực tiếp Drawer xem chi tiết bài toán
        setActiveDetailRequest(item.task)
      } else if (item.kind === "member") {
        // Điều hướng đến Track page và lọc theo tên thành viên
        if (currentPage !== "track") {
          onNavigate("track")
        }
        setTimeout(() => {
          const searchInputs = document.querySelectorAll<HTMLInputElement>('input[placeholder*="Tìm kiếm task"]')
          if (searchInputs.length > 0) {
            searchInputs[0].value = item.name
            searchInputs[0].dispatchEvent(new Event("input", { bubbles: true }))
            searchInputs[0].focus()
          }
        }, 150)
        toast.info(`Đang lọc bài toán của "${item.name}"`)
      } else if (item.kind === "action") {
        item.onSelect()
      }
    },
    [currentPage, onNavigate]
  )

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (flatResults.length > 0 && flatResults[selectedIndex]) {
      handleSelectSmartItem(flatResults[selectedIndex])
      return
    }
    if (!searchQuery.trim()) return
    setSearchOpen(false)
    if (currentPage !== "track") {
      onNavigate("track")
    }
    setTimeout(() => {
      const searchInputs = document.querySelectorAll<HTMLInputElement>('input[placeholder*="Tìm kiếm task"]')
      if (searchInputs.length > 0) {
        searchInputs[0].value = searchQuery
        searchInputs[0].dispatchEvent(new Event("input", { bubbles: true }))
        searchInputs[0].focus()
      }
    }, 200)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (flatResults.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = (selectedIndex + 1) % flatResults.length
      setSelectedIndex(next)
      setTimeout(() => {
        const el = document.getElementById(`smart-search-item-${next}`)
        el?.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }, 10)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const prev = (selectedIndex - 1 + flatResults.length) % flatResults.length
      setSelectedIndex(prev)
      setTimeout(() => {
        const el = document.getElementById(`smart-search-item-${prev}`)
        el?.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }, 10)
    } else if (e.key === "Enter") {
      e.preventDefault()
      const target = flatResults[selectedIndex]
      if (target) {
        handleSelectSmartItem(target)
      }
    }
  }

  const appGridItems = useMemo(() => {
    const role = session?.role || "Designer"
    const visibility = navConfig[role] || DEFAULT_ROLE_NAV_CONFIG[role] || DEFAULT_ROLE_NAV_CONFIG.Designer
    const items: { id: Page; title: string; subtitle: string; icon: React.ElementType }[] = []

    if (visibility.overview) {
      items.push({ id: "overview", title: "Dashboard", subtitle: "Bảng điều hành", icon: Home })
    }
    if (visibility.track) {
      items.push({ id: "track", title: "Track Task", subtitle: "Bảng theo dõi tiến độ", icon: CheckSquare })
    }
    if (visibility.create && canRoleAccessCapability(role, "cap-request")) {
      items.push({ id: "create", title: "Tạo task mới", subtitle: "Gửi đề bài UX", icon: PlusCircle })
    }
    if (visibility.compressor) {
      items.push({ id: "compressor", title: "Nén ảnh", subtitle: "Tối ưu dung lượng", icon: Camera })
    }
    if (visibility.test && (canRoleAccessCapability(role, "cap-test") || role === "Admin" || role === "Design Owner")) {
      items.push({ id: "test", title: "Khảo sát UX", subtitle: "Đánh giá năng lực", icon: Layers })
    }
    if (visibility.manage && (role === "Admin" || (role === "Design Owner" && canRoleAccessCapability(role, "cap-workflow")))) {
      items.push({ id: "manage", title: "Quản trị", subtitle: "Cấu hình hệ thống", icon: ShieldCheck })
    }
    return items
  }, [session?.role, navConfig])

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
          {/* 1. Search Trigger Button (ReUI App Shell 12 style with tactile spring) */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.94 }}
            transition={springs.snappy}
            onClick={() => setSearchOpen(true)}
            aria-label="Tìm kiếm nhanh (⌘K)"
            className="h-8 w-8 sm:w-auto sm:px-2.5 sm:gap-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center text-xs font-medium cursor-pointer select-none"
            title="Tìm kiếm bài toán, designer, squad... (⌘K)"
          >
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="hidden sm:inline text-slate-400 font-normal">Tìm kiếm...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded">
              ⌘K
            </kbd>
          </motion.button>

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

      {/* Global Smart Search & Command Palette Modal (⌘K Dialog) */}
      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-3 sm:px-4 select-none">
            {/* Backdrop */}
            <motion.div
              variants={dialogOverlayVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs cursor-pointer"
              onClick={() => setSearchOpen(false)}
            />

            {/* Modal Dialog Content */}
            <motion.div
              variants={dialogContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springs.modal}
              className="relative z-10 w-full max-w-2xl bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Form Header */}
              <form onSubmit={handleGlobalSearch} className="flex items-center px-4 py-3 border-b border-slate-100 gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                  {isLoadingRequests ? (
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Tìm kiếm bài toán, mã task, nhân sự, squad, tác vụ..."
                  className="w-full text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent font-medium"
                />
                <AnimatePresence>
                  {searchQuery && (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.85 }}
                      transition={springs.snappy}
                      onClick={() => {
                        setSearchQuery("")
                        searchInputRef.current?.focus()
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
                      title="Xóa tìm kiếm"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded">
                    ESC
                  </kbd>
                </button>
              </form>

              {/* Category Filter Tabs with Sliding Active Pill */}
              <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 bg-slate-50/60 overflow-x-auto no-scrollbar text-xs">
                {([
                  { id: "all" as const, label: "Tất cả" },
                  { id: "tasks" as const, label: "Bài toán", icon: FileText, count: matchedTasks.length },
                  { id: "members" as const, label: "Nhân sự", icon: Users, count: matchedMembers.length },
                  { id: "actions" as const, label: "Tác vụ", icon: Sparkles, count: matchedActions.length },
                ]).map((tab) => {
                  const isActive = categoryFilter === tab.id
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCategoryFilter(tab.id)}
                      className={`relative px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        isActive ? "text-indigo-700 font-semibold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="smart-search-category-pill"
                          className="absolute inset-0 bg-white rounded-lg shadow-xs ring-1 ring-slate-200"
                          transition={springs.floating}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        {tab.label} {tab.count !== undefined ? `(${tab.count})` : ""}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Scrollable Results List with Staggered Entrance and Smooth Hover/Keyboard Nav */}
              <div ref={resultsContainerRef} className="flex-1 overflow-y-auto p-2 max-h-[55vh]">
                {flatResults.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={springs.modal}
                    className="py-10 px-4 text-center select-none"
                  >
                    {/* ReUI c-icon-stack isometric 3D card illustration matching compress image */}
                    <div className="mb-4 flex items-center justify-center pointer-events-none">
                      <IconStack className="h-20 w-18">
                        <Layers className="size-5 text-[#1057FB]" />
                      </IconStack>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">Không tìm thấy kết quả phù hợp</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
                      {searchQuery
                        ? `Không có bài toán, nhân sự hoặc tác vụ nào khớp với từ khóa "${searchQuery}".`
                        : "Chưa có kết quả tìm kiếm nào phù hợp."}{" "}
                      Lưu ý: Hệ thống chỉ hiển thị các bài toán bạn được phân quyền truy cập.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`${categoryFilter}-${searchQuery ? "filtered" : "all"}`}
                    variants={staggerContainerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    {/* Section 1: Bài toán UX */}
                    {matchedTasks.length > 0 && (
                      <div>
                        <div className="px-2 pb-1.5 pt-1 flex items-center justify-between text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                          <span>Bài toán UX ({matchedTasks.length})</span>
                          <span className="text-[10px] font-normal lowercase text-slate-400">Enter để mở drawer chi tiết</span>
                        </div>
                        <div className="space-y-1">
                          {matchedTasks.map((item) => {
                            const flatIdx = flatResults.indexOf(item)
                            const isSelected = flatIdx === selectedIndex
                            const statusCfg = getTaskStatusBadgeConfig(item.status)
                            const StatusIcon = statusCfg.icon

                            return (
                              <motion.div
                                key={item.id}
                                variants={staggerItemVariants}
                                whileHover={{ x: 3 }}
                                whileTap={{ scale: 0.98 }}
                                transition={springs.snappy}
                                id={`smart-search-item-${flatIdx}`}
                                onClick={() => handleSelectSmartItem(item)}
                                onMouseEnter={() => setSelectedIndex(flatIdx)}
                                className={`group relative p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                                  isSelected
                                    ? "border-indigo-200/80 shadow-xs"
                                    : "border-transparent hover:border-slate-100"
                                }`}
                              >
                                {isSelected && (
                                  <motion.div
                                    layoutId="smart-search-row-active"
                                    className="absolute inset-0 rounded-xl bg-indigo-50/80 -z-0 pointer-events-none"
                                    transition={springs.floating}
                                  />
                                )}
                                <div className="relative z-10 flex items-start gap-3 min-w-0 flex-1">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${statusCfg.bg}`}
                                    title={item.status}
                                  >
                                    <StatusIcon className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                        {item.requestId || "TASK"}
                                      </span>
                                      <p className="text-xs font-semibold text-slate-900 truncate">
                                        {item.title}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                                      {item.squad && (
                                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                          {item.squad}
                                        </span>
                                      )}
                                      {item.product && (
                                        <span className="text-slate-400">· {item.product}</span>
                                      )}
                                      {item.designer && (
                                        <span className="text-slate-500">
                                          · Designer: <strong className="text-slate-700 font-medium">{item.designer}</strong>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="relative z-10 flex items-center gap-2 shrink-0">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.bg}`}>
                                    {item.status}
                                  </span>
                                  {isSelected && (
                                    <motion.span
                                      initial={{ opacity: 0, scale: 0.85 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={springs.snappy}
                                      className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded"
                                    >
                                      <span>Mở</span>
                                      <CornerDownLeft className="w-3 h-3" />
                                    </motion.span>
                                  )}
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Section 2: Nhân sự Team */}
                    {matchedMembers.length > 0 && (
                      <div>
                        <div className="px-2 pb-1.5 pt-1 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                          Thành viên UX Team ({matchedMembers.length})
                        </div>
                        <div className="space-y-1">
                          {matchedMembers.map((item) => {
                            const flatIdx = flatResults.indexOf(item)
                            const isSelected = flatIdx === selectedIndex

                            return (
                              <motion.div
                                key={item.id}
                                variants={staggerItemVariants}
                                whileHover={{ x: 3 }}
                                whileTap={{ scale: 0.98 }}
                                transition={springs.snappy}
                                id={`smart-search-item-${flatIdx}`}
                                onClick={() => handleSelectSmartItem(item)}
                                onMouseEnter={() => setSelectedIndex(flatIdx)}
                                className={`group relative p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                                  isSelected
                                    ? "border-indigo-200/80 shadow-xs"
                                    : "border-transparent hover:border-slate-100"
                                }`}
                              >
                                {isSelected && (
                                  <motion.div
                                    layoutId="smart-search-row-active"
                                    className="absolute inset-0 rounded-xl bg-indigo-50/80 -z-0 pointer-events-none"
                                    transition={springs.floating}
                                  />
                                )}
                                <div className="relative z-10 flex items-center gap-3 min-w-0 flex-1">
                                  <UserAvatar
                                    name={item.name}
                                    avatarUrl={item.avatarUrl}
                                    size="sm"
                                    className="w-8 h-8 rounded-full ring-1 ring-slate-200 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-semibold text-slate-900 truncate">
                                        {item.name}
                                      </p>
                                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                        {item.role}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                      {item.email} {item.squad ? `· Squad: ${item.squad}` : ""}
                                    </p>
                                  </div>
                                </div>

                                <div className="relative z-10 flex items-center gap-2 shrink-0">
                                  {isSelected && (
                                    <motion.span
                                      initial={{ opacity: 0, scale: 0.85 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={springs.snappy}
                                      className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded"
                                    >
                                      <span>Lọc task</span>
                                      <CornerDownLeft className="w-3 h-3" />
                                    </motion.span>
                                  )}
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Section 3: Điều hướng & Tác vụ nhanh */}
                    {matchedActions.length > 0 && (
                      <div>
                        <div className="px-2 pb-1.5 pt-1 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                          Điều hướng & Phím tắt
                        </div>
                        <div className="space-y-1">
                          {matchedActions.map((item) => {
                            const flatIdx = flatResults.indexOf(item)
                            const isSelected = flatIdx === selectedIndex
                            const Icon = item.icon

                            return (
                              <motion.div
                                key={item.id}
                                variants={staggerItemVariants}
                                whileHover={{ x: 3 }}
                                whileTap={{ scale: 0.98 }}
                                transition={springs.snappy}
                                id={`smart-search-item-${flatIdx}`}
                                onClick={() => handleSelectSmartItem(item)}
                                onMouseEnter={() => setSelectedIndex(flatIdx)}
                                className={`group relative p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                                  isSelected
                                    ? "border-indigo-200/80 shadow-xs"
                                    : "border-transparent hover:border-slate-100"
                                }`}
                              >
                                {isSelected && (
                                  <motion.div
                                    layoutId="smart-search-row-active"
                                    className="absolute inset-0 rounded-xl bg-indigo-50/80 -z-0 pointer-events-none"
                                    transition={springs.floating}
                                  />
                                )}
                                <div className="relative z-10 flex items-center gap-3 min-w-0 flex-1">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-600 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-slate-900 truncate">
                                      {item.title}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                      {item.subtitle}
                                    </p>
                                  </div>
                                </div>

                                <div className="relative z-10 flex items-center gap-2 shrink-0">
                                  {item.badge && (
                                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                      {item.badge}
                                    </span>
                                  )}
                                  {isSelected && (
                                    <motion.span
                                      initial={{ opacity: 0, scale: 0.85 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={springs.snappy}
                                      className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded"
                                    >
                                      <span>Chọn</span>
                                      <CornerDownLeft className="w-3 h-3" />
                                    </motion.span>
                                  )}
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Modal Footer Info Bar */}
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Quyền truy cập:</span>
                  <span className="font-semibold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                    {session?.role || "Khách"}
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↑</kbd>
                    <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↓</kbd>
                    <span>di chuyển</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↵</kbd>
                    <span>chọn</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]">ESC</kbd>
                    <span>đóng</span>
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Slide-over Drawer xem chi tiết bài toán khi bấm từ Smart Search */}
      <RequestDetail
        open={Boolean(activeDetailRequest)}
        request={activeDetailRequest}
        onClose={() => setActiveDetailRequest(null)}
        onUpdated={async () => {
          const updated = await fetchRequests(true)
          setAllRequests(updated || [])
          if (activeDetailRequest) {
            const fresh = updated?.find((r) => r.request_id === activeDetailRequest.request_id)
            if (fresh) {
              setActiveDetailRequest(fresh)
            }
          }
          window.dispatchEvent(new Event("refresh_requests_cache"))
          window.dispatchEvent(new Event("storage"))
        }}
      />

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
