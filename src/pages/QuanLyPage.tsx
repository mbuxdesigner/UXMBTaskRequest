import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Frame } from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { getStoredSession, startRolePreview, stopRolePreview } from "@/services/otpAuthService"
import {
  uploadAvatarToDrive,
  syncTeamMembersToSheet,
  syncMasterDataToSheet,
  fetchTeamMembersFromSheet,
} from "@/services/googleSheetService"
import { UserAvatar } from "@/components/common/UserAvatar"
import { SpotlightCard } from "@/components/jolyui/spotlight-card"
import { NumberTicker } from "@/components/jolyui/number-ticker"
import { BlurFade } from "@/components/jolyui/blur-fade"
import PageHeader from "@/components/common/PageHeader"
import {
  Users,
  Eye,
  ShieldCheck,
  Workflow,
  Sliders,
  Database,
  Tag,
  History,
  Plus,
  Trash2,
  Edit3,
  Save,
  Check,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  Lock,
  Key,
  Bell,
  Layers,
  Sparkles,
  Download,
  UploadCloud,
  FileSpreadsheet,
  Cpu,
  UserPlus,
  UserCheck,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Clock,
  Camera,
  Boxes,
  Package,
  Activity,
  Briefcase,
  X,
  Home,
  CheckSquare,
  PlusCircle,
  GripVertical,
  ArrowUp,
  ArrowDown,
  FolderKanban,
  Wrench,
  BookOpen,
} from "lucide-react"
import TestManagementView from "@/components/test-assessment/TestManagementView"
import TestRunnerView from "@/components/test-assessment/TestRunnerView"
import { TestExam } from "@/types/testAssessment"
import {
  getRoleNavConfig,
  saveRoleNavConfig,
  getNavOrderConfig,
  saveNavOrderConfig,
  RoleNavConfig,
  RoleNavVisibility,
  NavOrderConfig,
  PlatformNavItemKey,
  ResourceNavItemKey,
  DEFAULT_ROLE_NAV_CONFIG,
  DEFAULT_NAV_ORDER,
} from "@/config/navVisibilityConfig"
import { UserRole } from "@/data/mockData"

// Types
export interface TeamMember {
  id: string
  name: string
  email: string
  role: "Admin" | "Design Owner" | "Designer" | "PO"
  squad?: string // Legacy fallback
  squads: string[] // 1 Designer -> nhiều Squads, 1 PO -> nhiều Squads
  products?: string[] // 1 PO -> nhiều Sản phẩm phụ trách
  avatarUrl: string
  activeTasks: number
  capacityLimit: number
  status: "Active" | "On Leave" | "Busy"
  permissions: {
    canAssign: boolean
    canApprovePo: boolean
    canExport: boolean
    canManageSystem: boolean
  }
}

export interface UxPhaseSetting {
  id: string
  step: number
  name: string
  description: string
  defaultProgress: number
  slaDays: number
  requiredDeliverable: string
}

export interface SquadSetting {
  id: string
  name: string
  code: string
  leadPo?: string
  leadDesigner?: string
  taskCount: number
  color: string
  products?: string[]
  capacityThreshold?: number
  domain?: string
}

export interface ProductSetting {
  id: string
  name: string
  code: string
  squad: string
  leadPo: string
  status: "Active" | "Inactive"
}

export interface AuditLogItem {
  id: string
  timestamp: string
  actor: string
  action: string
  target: string
  details: string
  type: "user" | "workflow" | "integration" | "security" | "masterdata"
}

// Master Predefined Lists
export const AVAILABLE_SQUADS_LIST = [
  "Lending & Vay vốn",
  "Cards & Thanh toán số",
  "Core Banking & Tài khoản",
  "Digital Wealth & Đầu tư",
  "BaaS & Open API",
  "Design System & Core",
]

export const AVAILABLE_PRODUCTS_LIST = [
  "App MBBank",
  "Lending & Vay vốn",
  "Cards & Digital Payment",
  "Digital Wealth",
  "Private Banking & VIP",
  "SME Banking",
  "Core Banking",
  "BaaS Gateway",
  "Design System MB",
]

// Initial Mock Data
const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "mem-1",
    name: "Nguyễn Văn Cường",
    email: "cuong.designowner@mbbank.com.vn",
    role: "Design Owner",
    squad: "Design System & Core",
    squads: ["Design System & Core", "Core Banking & Tài khoản", "Lending & Vay vốn"],
    products: ["App MBBank", "Core Banking", "Design System MB"],
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    activeTasks: 4,
    capacityLimit: 6,
    status: "Active",
    permissions: { canAssign: true, canApprovePo: true, canExport: true, canManageSystem: true },
  },
  {
    id: "mem-2",
    name: "Lê Hoàng Nam",
    email: "nam.designer@mbbank.com.vn",
    role: "Designer",
    squad: "Lending Squad",
    squads: ["Lending & Vay vốn", "Cards & Thanh toán số", "BaaS & Open API"],
    products: ["Lending & Vay vốn", "Cards & Digital Payment"],
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    activeTasks: 3,
    capacityLimit: 5,
    status: "Active",
    permissions: { canAssign: false, canApprovePo: false, canExport: true, canManageSystem: false },
  },
  {
    id: "mem-3",
    name: "Trần Mai Lan",
    email: "lan.po@mbbank.com.vn",
    role: "PO",
    squad: "Cards & Digital Payment",
    squads: ["Lending & Vay vốn", "Cards & Thanh toán số"],
    products: ["Lending & Vay vốn", "Cards & Digital Payment"],
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    activeTasks: 5,
    capacityLimit: 8,
    status: "Active",
    permissions: { canAssign: false, canApprovePo: true, canExport: true, canManageSystem: false },
  },
  {
    id: "mem-4",
    name: "Phạm Hải Đăng",
    email: "dang.designer@mbbank.com.vn",
    role: "Designer",
    squad: "Digital Wealth",
    squads: ["Digital Wealth & Đầu tư", "Core Banking & Tài khoản"],
    products: ["Digital Wealth", "Private Banking & VIP"],
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
    activeTasks: 2,
    capacityLimit: 5,
    status: "Active",
    permissions: { canAssign: false, canApprovePo: false, canExport: true, canManageSystem: false },
  },
  {
    id: "mem-5",
    name: "Admin Quản Trị",
    email: "admin@mbbank.com.vn",
    role: "Admin",
    squad: "Toàn hàng (Enterprise)",
    squads: ["Design System & Core", "Lending & Vay vốn", "Cards & Thanh toán số", "Core Banking & Tài khoản", "Digital Wealth & Đầu tư", "BaaS & Open API"],
    products: ["App MBBank", "Lending & Vay vốn", "Cards & Digital Payment", "Digital Wealth", "Private Banking & VIP", "SME Banking"],
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
    activeTasks: 1,
    capacityLimit: 10,
    status: "Active",
    permissions: { canAssign: true, canApprovePo: true, canExport: true, canManageSystem: true },
  },
]

const INITIAL_UX_PHASES: UxPhaseSetting[] = [
  { id: "ph-1", step: 1, name: "Phân loại", description: "Tiếp nhận đầu bài từ PO, đánh giá độ phức tạp & phân loại", defaultProgress: 15, slaDays: 1, requiredDeliverable: "Tiêu chuẩn đầu bài (PRD/Spec Check)" },
  { id: "ph-2", step: 2, name: "Discovery", description: "Nghiên cứu nhu cầu kinh doanh, khảo sát user & phân tích benchmark", defaultProgress: 35, slaDays: 3, requiredDeliverable: "UX Research Brief / Benchmark Note" },
  { id: "ph-3", step: 3, name: "User Flow", description: "Dựng sơ đồ luồng người dùng (Wireflow & Information Architecture)", defaultProgress: 55, slaDays: 3, requiredDeliverable: "FigJam / User Flow diagram link" },
  { id: "ph-4", step: 4, name: "UI Design", description: "Thiết kế giao diện Hi-Fi tuân thủ MBBank Liquid Glass Design System", defaultProgress: 75, slaDays: 5, requiredDeliverable: "Figma UI Components & Screen Link" },
  { id: "ph-5", step: 5, name: "Prototype", description: "Ghép tương tác vi mô, luồng prototype để test trải nghiệm", defaultProgress: 90, slaDays: 2, requiredDeliverable: "Interactive Prototype Link" },
  { id: "ph-6", step: 6, name: "Bàn giao", description: "Đóng gói UI Kit, chuẩn bị Design Token & bàn giao sang đội Dev", defaultProgress: 100, slaDays: 1, requiredDeliverable: "Hand-off Figma Spec & Token checklist" },
]

const INITIAL_SQUADS: SquadSetting[] = [
  { id: "sq-1", name: "Lending & Vay vốn", code: "LENDING", leadPo: "Trần Mai Lan", leadDesigner: "Lê Hoàng Nam", taskCount: 8, color: "bg-blue-50 text-[#1057FB] border-blue-200", products: ["Lending & Vay vốn", "SME Banking"], capacityThreshold: 10 },
  { id: "sq-2", name: "Cards & Thanh toán số", code: "CARDS", leadPo: "Trần Mai Lan", leadDesigner: "Lê Hoàng Nam", taskCount: 6, color: "bg-purple-50 text-purple-700 border-purple-200", products: ["Cards & Digital Payment", "App MBBank"], capacityThreshold: 8 },
  { id: "sq-3", name: "Core Banking & Tài khoản", code: "CORE", leadPo: "Nguyễn Văn Cường", leadDesigner: "Nguyễn Văn Cường", taskCount: 5, color: "bg-emerald-50 text-emerald-700 border-emerald-200", products: ["Core Banking", "App MBBank"], capacityThreshold: 8 },
  { id: "sq-4", name: "Digital Wealth & Đầu tư", code: "WEALTH", leadPo: "Phạm Hải Đăng", leadDesigner: "Phạm Hải Đăng", taskCount: 4, color: "bg-amber-50 text-amber-800 border-amber-200", products: ["Digital Wealth", "Private Banking & VIP"], capacityThreshold: 6 },
  { id: "sq-5", name: "BaaS & Open API", code: "BAAS", leadPo: "Admin Quản Trị", leadDesigner: "Lê Hoàng Nam", taskCount: 3, color: "bg-cyan-50 text-cyan-700 border-cyan-200", products: ["BaaS Gateway"], capacityThreshold: 6 },
  { id: "sq-6", name: "Design System & Core", code: "DS_CORE", leadPo: "Nguyễn Văn Cường", leadDesigner: "Nguyễn Văn Cường", taskCount: 4, color: "bg-indigo-50 text-indigo-700 border-indigo-200", products: ["Design System MB"], capacityThreshold: 10 },
]

const INITIAL_PRODUCTS: ProductSetting[] = [
  { id: "prod-1", name: "App MBBank", code: "APP_MB", squad: "Cards & Thanh toán số", leadPo: "Trần Mai Lan", status: "Active" },
  { id: "prod-2", name: "Lending & Vay vốn", code: "LENDING", squad: "Lending & Vay vốn", leadPo: "Trần Mai Lan", status: "Active" },
  { id: "prod-3", name: "Cards & Digital Payment", code: "CARDS", squad: "Cards & Thanh toán số", leadPo: "Trần Mai Lan", status: "Active" },
  { id: "prod-4", name: "Digital Wealth", code: "WEALTH", squad: "Digital Wealth & Đầu tư", leadPo: "Phạm Hải Đăng", status: "Active" },
  { id: "prod-5", name: "Private Banking & VIP", code: "VIP_BANKING", squad: "Digital Wealth & Đầu tư", leadPo: "Phạm Hải Đăng", status: "Active" },
  { id: "prod-6", name: "SME Banking", code: "SME", squad: "Lending & Vay vốn", leadPo: "Trần Mai Lan", status: "Active" },
  { id: "prod-7", name: "Core Banking", code: "CORE", squad: "Core Banking & Tài khoản", leadPo: "Nguyễn Văn Cường", status: "Active" },
  { id: "prod-8", name: "BaaS Gateway", code: "BAAS", squad: "BaaS & Open API", leadPo: "Admin Quản Trị", status: "Active" },
  { id: "prod-9", name: "Design System MB", code: "DS_MB", squad: "Design System & Core", leadPo: "Nguyễn Văn Cường", status: "Active" },
]

const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  { id: "log-1", timestamp: "22/08/2026 10:30", actor: "Admin Quản Trị", action: "Cập nhật Multi-Squad", target: "Lê Hoàng Nam", details: "Phân bổ phụ trách 3 Squad: Lending, Cards và BaaS", type: "user" },
  { id: "log-2", timestamp: "22/08/2026 09:15", actor: "Admin Quản Trị", action: "Cập nhật SLA Khâu", target: "UI Design", details: "Cam kết SLA 5 ngày làm việc", type: "workflow" },
  { id: "log-3", timestamp: "21/08/2026 19:40", actor: "Nguyễn Văn Cường", action: "Phân bổ Sản phẩm", target: "Trần Mai Lan (PO)", details: "Gán quyền tạo đề bài cho sản phẩm Lending & Cards", type: "user" },
  { id: "log-4", timestamp: "21/08/2026 16:20", actor: "Hệ thống Google Sheet", action: "Đồng bộ Realtime", target: "RAW_SETTINGS", details: "Lưu trữ thành công cấu hình USERS_LIST & SQUADS_LIST", type: "integration" },
]

type AdminTab = "team" | "rbac" | "evaluation" | "test_bank" | "workflow" | "masterdata" | "integrations" | "audit"

interface AdminNavItem {
  id: AdminTab
  title: string
  icon: any
}

interface AdminNavGroup {
  category: string
  items: AdminNavItem[]
}

const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    category: "Tổ chức & Phân quyền",
    items: [
      { id: "team", title: "Nhân sự UX", icon: Users },
      { id: "rbac", title: "Phân quyền (RBAC)", icon: ShieldCheck },
      { id: "evaluation", title: "Đánh giá Hiệu suất", icon: Sparkles },
    ],
  },
  {
    category: "Đào tạo & Quy trình",
    items: [
      { id: "test_bank", title: "Quản lý Đề thi", icon: BookOpen },
      { id: "workflow", title: "Quy trình & Khâu UX", icon: Workflow },
    ],
  },
  {
    category: "Hệ thống & Kết nối",
    items: [
      { id: "masterdata", title: "Squads & Sản phẩm", icon: Boxes },
      { id: "integrations", title: "Cổng kết nối APIs", icon: Database },
      { id: "audit", title: "Audit Logs", icon: History },
    ],
  },
]

const RBAC_CAPABILITIES = [
  {
    id: "cap-approve",
    title: "Duyệt đề bài & Nghiệm thu Task PO",
    description: "Chấp thuận, yêu cầu chỉnh sửa hoặc hoàn tất nghiệm thu kết quả thiết kế của các yêu cầu gửi từ PO.",
    category: "Nghiệp vụ Phê duyệt",
  },
  {
    id: "cap-test",
    title: "Chấm bài Test & Tạo đề thi UX",
    description: "Tạo ngân hàng đề thi trắc nghiệm & tự luận, nhập dữ liệu từ Excel và thực hiện chấm điểm bài làm ứng viên.",
    category: "Đào tạo & Đánh giá",
  },
  {
    id: "cap-capacity",
    title: "Phân bổ nhân sự Đa-Squad & Tải việc",
    description: "Chỉ định nhân sự vào nhiều Squad đồng thời, thiết lập hạn mức số task tối đa và phân quyền quản lý.",
    category: "Quản trị Nhân sự",
  },
  {
    id: "cap-workflow",
    title: "Tùy biến khâu quy trình & SLA",
    description: "Sắp xếp thứ tự các bước trong 6 khâu UX, thiết lập số ngày cam kết SLA và tài liệu bàn giao bắt buộc.",
    category: "Cấu hình Vận hành",
  },
  {
    id: "cap-request",
    title: "Gửi đề bài & Đặt lịch tư vấn UX",
    description: "Khởi tạo phiếu yêu cầu thiết kế mới, tải lên tài liệu mô tả bài toán và gửi thông báo tới Design Owner.",
    category: "Tương tác Đề bài",
  },
  {
    id: "cap-audit",
    title: "Truy cập Audit Trail & Sao lưu",
    description: "Kiểm tra lịch sử thay đổi của toàn hệ thống, tải tệp sao lưu dữ liệu JSON và kiểm tra kết nối Google Sheet.",
    category: "Bảo mật & Giám sát",
  },
]

export default function QuanLyPage() {
  const session = getStoredSession()
  const isAdmin = session?.role === "Admin" || session?.role === "Design Owner"

  // Tự động chuyển hướng về trang chủ nếu user không có quyền quản trị
  useEffect(() => {
    if (!isAdmin) {
      window.location.hash = session?.role === "PO" ? "track" : "overview"
      window.dispatchEvent(new CustomEvent("app_navigate", { detail: { page: session?.role === "PO" ? "track" : "overview" } }))
    }
  }, [isAdmin, session?.role])

  const [activeTab, setActiveTab] = useState<AdminTab>("team")
  const [adminRunningTest, setAdminRunningTest] = useState<TestExam | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>("ALL")
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>("")
  const [selectedRbacRole, setSelectedRbacRole] = useState<"Admin" | "Design Owner" | "Designer" | "PO">("Design Owner")
  const [rbacRolesPermissions, setRbacRolesPermissions] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem("mbbank_admin_rbac")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {}
    }
    return {
      "cap-approve": ["Admin", "Design Owner"],
      "cap-test": ["Admin", "Design Owner"],
      "cap-capacity": ["Admin", "Design Owner"],
      "cap-workflow": ["Admin"],
      "cap-request": ["Admin", "Design Owner", "Designer", "PO"],
      "cap-audit": ["Admin", "Design Owner"],
    }
  })

  const handleToggleCapability = (capId: string, role: string) => {
    setRbacRolesPermissions((prev) => {
      const currentRoles = prev[capId] || []
      const nextRoles = currentRoles.includes(role)
        ? currentRoles.filter((r) => r !== role)
        : [...currentRoles, role]
      const updated = { ...prev, [capId]: nextRoles }
      localStorage.setItem("mbbank_admin_rbac", JSON.stringify(updated))
      const capName = RBAC_CAPABILITIES.find((c) => c.id === capId)?.title || "Quyền hạn"
      toast.success(`Đã ${currentRoles.includes(role) ? "tắt" : "bật"} quyền "${capName}" cho vai trò ${role}!`)
      return updated
    })
  }

  // State Data with localStorage sync
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const saved = localStorage.getItem("mbbank_admin_team")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return parsed.map((m: any) => ({
          ...m,
          squads: m.squads || (m.squad ? [m.squad] : ["Lending & Vay vốn"]),
          products: m.products || ["Lending & Vay vốn"],
        }))
      } catch {}
    }
    return INITIAL_TEAM_MEMBERS
  })

  const [uxPhases, setUxPhases] = useState<UxPhaseSetting[]>(() => {
    const saved = localStorage.getItem("mbbank_admin_phases")
    return saved ? JSON.parse(saved) : INITIAL_UX_PHASES
  })

  const [squads, setSquads] = useState<SquadSetting[]>(() => {
    const saved = localStorage.getItem("mbbank_admin_squads")
    return saved ? JSON.parse(saved) : INITIAL_SQUADS
  })

  const [products, setProducts] = useState<ProductSetting[]>(() => {
    const saved = localStorage.getItem("mbbank_admin_products")
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS
  })

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS)
  const [navConfig, setNavConfig] = useState<RoleNavConfig>(() => getRoleNavConfig())
  const [navOrder, setNavOrder] = useState<NavOrderConfig>(() => getNavOrderConfig())
  const [draggedGroup, setDraggedGroup] = useState<"platform" | "resources" | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleToggleNav = (role: UserRole, key: keyof RoleNavVisibility) => {
    setNavConfig((prev) => {
      const updated: RoleNavConfig = {
        ...prev,
        [role]: {
          ...prev[role],
          [key]: !prev[role][key],
        },
      }
      saveRoleNavConfig(updated)
      toast.success(`Đã cập nhật hiển thị mục [${key}] cho vai trò [${role}]!`)
      const newLog: AuditLogItem = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        actor: session?.displayName || "Admin Quản Trị",
        action: "Phân quyền Menu Nav",
        target: `${role} -> ${key}`,
        details: `Trạng thái: ${!prev[role][key] ? "BẬT (Hiện)" : "TẮT (Ẩn)"}`,
        type: "security",
      }
      setAuditLogs((l) => [newLog, ...l])
      return updated
    })
  }

  const handleMovePlatformItem = (index: number, direction: "up" | "down") => {
    const newItems = [...navOrder.platform]
    const targetIdx = direction === "up" ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= newItems.length) return
    const temp = newItems[index]
    newItems[index] = newItems[targetIdx]
    newItems[targetIdx] = temp
    const updated: NavOrderConfig = { ...navOrder, platform: newItems }
    setNavOrder(updated)
    saveNavOrderConfig(updated)
    toast.success("Đã thay đổi thứ tự Menu Platform!")
  }

  const handleMoveResourceItem = (index: number, direction: "up" | "down") => {
    const newItems = [...navOrder.resources]
    const targetIdx = direction === "up" ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= newItems.length) return
    const temp = newItems[index]
    newItems[index] = newItems[targetIdx]
    newItems[targetIdx] = temp
    const updated: NavOrderConfig = { ...navOrder, resources: newItems }
    setNavOrder(updated)
    saveNavOrderConfig(updated)
    toast.success("Đã thay đổi thứ tự Menu Resources!")
  }

  const handleDragStart = (group: "platform" | "resources", index: number) => {
    setDraggedGroup(group)
    setDraggedIndex(index)
  }

  const handleDropItem = (group: "platform" | "resources", dropIndex: number) => {
    if (draggedGroup !== group || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedGroup(null)
      setDraggedIndex(null)
      return
    }
    if (group === "platform") {
      const newItems = [...navOrder.platform]
      const [removed] = newItems.splice(draggedIndex, 1)
      newItems.splice(dropIndex, 0, removed)
      const updated: NavOrderConfig = { ...navOrder, platform: newItems }
      setNavOrder(updated)
      saveNavOrderConfig(updated)
      toast.success("Đã sắp xếp lại thứ tự Menu Platform!")
    } else {
      const newItems = [...navOrder.resources]
      const [removed] = newItems.splice(draggedIndex, 1)
      newItems.splice(dropIndex, 0, removed)
      const updated: NavOrderConfig = { ...navOrder, resources: newItems }
      setNavOrder(updated)
      saveNavOrderConfig(updated)
      toast.success("Đã sắp xếp lại thứ tự Menu Resources!")
    }
    setDraggedGroup(null)
    setDraggedIndex(null)
  }

  const [draggedPhaseIndex, setDraggedPhaseIndex] = useState<number | null>(null)

  const handleMovePhase = (index: number, direction: "prev" | "next") => {
    const targetIdx = direction === "prev" ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= uxPhases.length) return
    const updated = [...uxPhases]
    const temp = updated[index]
    updated[index] = updated[targetIdx]
    updated[targetIdx] = temp
    const resynced = updated.map((p, i) => ({ ...p, step: i + 1 }))
    setUxPhases(resynced)
    localStorage.setItem("mbbank_admin_phases", JSON.stringify(resynced))
    toast.success(`Đã chuyển khâu [${temp.name}] sang bước ${targetIdx + 1}!`)
  }

  const handlePhaseDragStart = (index: number) => {
    setDraggedPhaseIndex(index)
  }

  const handlePhaseDrop = (dropIndex: number) => {
    if (draggedPhaseIndex === null || draggedPhaseIndex === dropIndex) {
      setDraggedPhaseIndex(null)
      return
    }
    const updated = [...uxPhases]
    const [removed] = updated.splice(draggedPhaseIndex, 1)
    updated.splice(dropIndex, 0, removed)
    const resynced = updated.map((p, i) => ({ ...p, step: i + 1 }))
    setUxPhases(resynced)
    localStorage.setItem("mbbank_admin_phases", JSON.stringify(resynced))
    toast.success(`Đã sắp xếp lại quy trình: khâu [${removed.name}] là bước ${dropIndex + 1}!`)
    setDraggedPhaseIndex(null)
  }

  const handleRestorePhases = () => {
    setUxPhases(INITIAL_UX_PHASES)
    localStorage.setItem("mbbank_admin_phases", JSON.stringify(INITIAL_UX_PHASES))
    toast.success("Đã khôi phục quy trình 6 khâu UX chuẩn ban đầu!")
  }

  // Integration Settings
  const [sheetUrl, setSheetUrl] = useState<string>("https://script.google.com/macros/s/AKfycbz_MB_UX_GATEWAY/exec")
  const [sheetSyncInterval, setSheetSyncInterval] = useState<string>("5")
  const [figmaOrgKey, setFigmaOrgKey] = useState<string>("figd_MBBank_UXDesign_SecuredToken_8829")
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState<string>("https://mbbank.webhook.office.com/webhookb2/teams_ux_alerts")
  const [autoNotifySlack, setAutoNotifySlack] = useState<boolean>(true)
  const [testingConnection, setTestingConnection] = useState<boolean>(false)

  // Modals state
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [showAddSquadModal, setShowAddSquadModal] = useState<boolean>(false)
  const [editingSquad, setEditingSquad] = useState<SquadSetting | null>(null)
  const [editingPhase, setEditingPhase] = useState<UxPhaseSetting | null>(null)
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false)
  const [showAddPhaseModal, setShowAddPhaseModal] = useState<boolean>(false)

  // Add Phase Form State
  const [newPhaseName, setNewPhaseName] = useState("")
  const [newPhaseSla, setNewPhaseSla] = useState<number>(2)
  const [newPhaseProgress, setNewPhaseProgress] = useState<number>(50)
  const [newPhaseDesc, setNewPhaseDesc] = useState("")
  const [newPhaseDeliverable, setNewPhaseDeliverable] = useState("")

  // Add Member Form State (Multi-Squad & Multi-Product)
  const [newMemName, setNewMemName] = useState("")
  const [newMemEmail, setNewMemEmail] = useState("")
  const [newMemRole, setNewMemRole] = useState<TeamMember["role"]>("Designer")
  const [newMemSquads, setNewMemSquads] = useState<string[]>(["Lending & Vay vốn"])
  const [newMemProducts, setNewMemProducts] = useState<string[]>(["Lending & Vay vốn"])
  const [newMemCapacity, setNewMemCapacity] = useState(5)
  const [newMemStatus, setNewMemStatus] = useState<TeamMember["status"]>("Active")

  // Add Squad Form State
  const [newSquadName, setNewSquadName] = useState("")
  const [newSquadCode, setNewSquadCode] = useState("")
  const [newSquadPo, setNewSquadPo] = useState("Trần Mai Lan")
  const [newSquadDesigner, setNewSquadDesigner] = useState("Lê Hoàng Nam")
  const [newSquadProducts, setNewSquadProducts] = useState<string[]>(["App MBBank"])
  const [newSquadCapacity, setNewSquadCapacity] = useState(8)

  // Add Product Form State
  const [newProdName, setNewProdName] = useState("")
  const [newProdCode, setNewProdCode] = useState("")
  const [newProdSquad, setNewProdSquad] = useState("Lending & Vay vốn")
  const [newProdPo, setNewProdPo] = useState("Trần Mai Lan")

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("mbbank_admin_team", JSON.stringify(teamMembers))
    localStorage.setItem("mbbank_team_members", JSON.stringify(teamMembers))
  }, [teamMembers])

  useEffect(() => {
    localStorage.setItem("mbbank_admin_phases", JSON.stringify(uxPhases))
  }, [uxPhases])

  useEffect(() => {
    localStorage.setItem("mbbank_admin_squads", JSON.stringify(squads))
  }, [squads])

  useEffect(() => {
    localStorage.setItem("mbbank_admin_products", JSON.stringify(products))
  }, [products])

  const [uploadingAvatarMemberId, setUploadingAvatarMemberId] = useState<string | null>(null)
  const [isSyncingMembers, setIsSyncingMembers] = useState<boolean>(false)
  const [isPullingMembers, setIsPullingMembers] = useState<boolean>(false)

  // Manual Sync Button Handler (Đẩy lên Google Sheet)
  const handleManualSyncMembers = async () => {
    setIsSyncingMembers(true)
    toast.info("Đang đồng bộ danh sách nhân sự lên Google Sheet...")
    const res = await syncTeamMembersToSheet(teamMembers)
    setIsSyncingMembers(false)
    if (res.success) {
      toast.success(res.message || `Đã đồng bộ ${teamMembers.length} nhân sự lên Google Sheet!`)
    } else {
      toast.error("Lỗi đồng bộ nhân sự", res.message)
    }
  }

  // Tải danh sách nhân sự từ Google Sheet về máy (Pull from Sheet)
  const handlePullMembersFromSheet = async () => {
    setIsPullingMembers(true)
    const toastId = toast.loading("Đang tải danh sách nhân sự từ Google Sheet...")
    try {
      const sheetMembers = await fetchTeamMembersFromSheet()
      setIsPullingMembers(false)
      if (sheetMembers && Array.isArray(sheetMembers) && sheetMembers.length > 0) {
        const formatted: TeamMember[] = sheetMembers.map((m, idx) => ({
          id: m.id || `mem-${idx + 1}-${Date.now()}`,
          name: m.name || m.displayName || "Thành viên UX",
          email: m.email || m.teamsEmail || m.personalEmail || "",
          personalEmail: m.personalEmail || m.email || "",
          teamsEmail: m.teamsEmail || m.email || "",
          role: m.role || "Designer",
          status: m.status || "Active",
          avatarUrl: m.avatarUrl || "",
          squad: m.squad || (Array.isArray(m.squads) && m.squads[0]) || "All Squads",
          squads: Array.isArray(m.squads) && m.squads.length > 0 ? m.squads : (m.squad ? [m.squad] : ["All Squads"]),
          products: Array.isArray(m.products) ? m.products : (m.product ? [m.product] : []),
          capacityLimit: m.capacityLimit || 8,
          activeTasks: m.activeTasks || 0,
          permissions: m.permissions || {
            canAssign: m.role === "Admin" || m.role === "Design Owner",
            canApprovePo: true,
            canExport: true,
            canManageSystem: m.role === "Admin",
          },
        }))

        setTeamMembers(formatted)
        localStorage.setItem("mbbank_admin_team", JSON.stringify(formatted))
        localStorage.setItem("mbbank_team_members", JSON.stringify(formatted))
        toast.success(`Đã đồng bộ ${formatted.length} nhân sự từ Google Sheet về ứng dụng thành công!`, undefined, { id: toastId })
      } else {
        toast.error("Không tìm thấy nhân sự", "Chưa có danh sách nhân sự trên Google Sheet (sheet USERS / RAW_SETTINGS).", { id: toastId })
      }
    } catch (err: any) {
      setIsPullingMembers(false)
      toast.error("Lỗi tải từ Google Sheet", err?.message || "Không thể kết nối Google Apps Script", { id: toastId })
    }
  }

  const handleAvatarUpload = async (memberId: string, email: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    setUploadingAvatarMemberId(memberId)
    toast.info("Đang tải ảnh Avatar lên Google Drive...")

    const res = await uploadAvatarToDrive(file, email)
    setUploadingAvatarMemberId(null)

    if (res.success && res.avatarUrl) {
      const updated = teamMembers.map((m) => (m.id === memberId ? { ...m, avatarUrl: res.avatarUrl! } : m))
      setTeamMembers(updated)
      syncTeamMembersToSheet(updated)
      
      const sess = getStoredSession()
      if (sess && (sess.teamsEmail?.toLowerCase() === email.toLowerCase() || sess.personalEmail?.toLowerCase() === email.toLowerCase())) {
        sess.avatarUrl = res.avatarUrl
        sessionStorage.setItem("ux_portal_session_auth", JSON.stringify(sess))
        localStorage.setItem("ux_portal_session_auth", JSON.stringify(sess))
        localStorage.setItem("ux_portal_session", JSON.stringify(sess))
        window.dispatchEvent(new Event("auth_session_changed"))
        window.dispatchEvent(new Event("storage"))
      }
      toast.success("Đã tải ảnh đại diện lên Google Drive & Google Sheet thành công!")
    } else {
      toast.error("Lỗi tải ảnh đại diện", res.error || "Không thể upload ảnh.")
    }
  }

  // --- MEMBER HANDLERS ---
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemName.trim() || !newMemEmail.trim()) {
      toast.error("Vui lòng nhập đầy đủ tên và email")
      return
    }

    const newMem: TeamMember = {
      id: `mem-${Date.now()}`,
      name: newMemName.trim(),
      email: newMemEmail.trim(),
      role: newMemRole,
      squad: newMemSquads[0] || "Lending & Vay vốn",
      squads: newMemSquads.length > 0 ? newMemSquads : ["Lending & Vay vốn"],
      products: newMemProducts.length > 0 ? newMemProducts : ["Lending & Vay vốn"],
      avatarUrl: "",
      activeTasks: 0,
      capacityLimit: newMemCapacity,
      status: newMemStatus,
      permissions: {
        canAssign: newMemRole === "Admin" || newMemRole === "Design Owner",
        canApprovePo: newMemRole === "Admin" || newMemRole === "Design Owner" || newMemRole === "PO",
        canExport: true,
        canManageSystem: newMemRole === "Admin",
      },
    }

    const updatedList = [newMem, ...teamMembers]
    setTeamMembers(updatedList)
    setShowAddMemberModal(false)
    setNewMemName("")
    setNewMemEmail("")
    setNewMemSquads(["Lending & Vay vốn"])
    setNewMemProducts(["Lending & Vay vốn"])

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      actor: session?.displayName || "Admin Quản Trị",
      action: "Thêm nhân sự",
      target: newMem.name,
      details: `Phân bổ ${newMem.squads.length} Squads & ${newMem.products?.length || 0} Sản phẩm`,
      type: "user",
    }
    setAuditLogs((prev) => [newLog, ...prev])
    toast.success(`Đã thêm nhân sự [${newMem.name}]!`)

    // Tự động đồng bộ ngay lên Google Sheet
    syncTeamMembersToSheet(updatedList).then((res) => {
      if (res.success) {
        toast.success(`Đã cập nhật nhân sự [${newMem.name}] vào Google Sheet!`)
      }
    })
  }

  const handleUpdateMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return

    const updatedList = teamMembers.map((m) => (m.id === editingMember.id ? editingMember : m))
    setTeamMembers(updatedList)

    // Cập nhật session nếu trùng email tài khoản đang đăng nhập
    const sess = getStoredSession()
    if (sess && (sess.teamsEmail?.toLowerCase() === editingMember.email.toLowerCase() || sess.personalEmail?.toLowerCase() === editingMember.email.toLowerCase())) {
      sess.displayName = editingMember.name
      sess.role = editingMember.role
      sess.avatarUrl = editingMember.avatarUrl
      sess.squads = editingMember.squads
      sess.products = editingMember.products
      sessionStorage.setItem("ux_portal_session_auth", JSON.stringify(sess))
      localStorage.setItem("ux_portal_session_auth", JSON.stringify(sess))
      localStorage.setItem("ux_portal_session", JSON.stringify(sess))
      window.dispatchEvent(new Event("auth_session_changed"))
      window.dispatchEvent(new Event("storage"))
    }

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      actor: session?.displayName || "Admin Quản Trị",
      action: "Cập nhật nhân sự",
      target: editingMember.name,
      details: `Sửa phân bổ: ${editingMember.squads.join(", ")} | Sản phẩm: ${(editingMember.products || []).join(", ")}`,
      type: "user",
    }
    setAuditLogs((prev) => [newLog, ...prev])
    setEditingMember(null)
    toast.success(`Đã cập nhật phân bổ cho [${editingMember.name}]!`)

    // Tự động đồng bộ ngay lên Google Sheet
    syncTeamMembersToSheet(updatedList).then((res) => {
      if (res.success) {
        toast.success(`Đã cập nhật thông tin [${editingMember.name}] trên Google Sheet!`)
      }
    })
  }

  const handleDeleteMember = async (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa nhân sự "${name}" khỏi danh sách quản trị?`)) {
      const updatedList = teamMembers.filter((m) => m.id !== id)
      setTeamMembers(updatedList)
      toast.success(`Đã xóa thành viên [${name}]`)

      // Tự động đồng bộ ngay lên Google Sheet
      syncTeamMembersToSheet(updatedList).then((res) => {
        if (res.success) {
          toast.success(`Đã xóa [${name}] khỏi Google Sheet!`)
        }
      })
    }
  }

  const handleTogglePermission = (memberId: string, permKey: keyof TeamMember["permissions"]) => {
    const updatedList = teamMembers.map((m) => {
      if (m.id === memberId) {
        return {
          ...m,
          permissions: {
            ...m.permissions,
            [permKey]: !m.permissions[permKey],
          },
        }
      }
      return m
    })
    setTeamMembers(updatedList)
    toast.success("Đã cập nhật phân quyền")
    syncTeamMembersToSheet(updatedList)
  }

  // --- SQUAD HANDLERS ---
  const handleAddSquadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSquadName.trim() || !newSquadCode.trim()) {
      toast.error("Vui lòng điền đủ tên và mã Squad")
      return
    }

    const newSq: SquadSetting = {
      id: `sq-${Date.now()}`,
      name: newSquadName.trim(),
      code: newSquadCode.trim().toUpperCase(),
      taskCount: 0,
      color: "bg-blue-50 text-[#1057FB] border-blue-200",
      products: newSquadProducts,
      capacityThreshold: newSquadCapacity,
    }

    const updated = [...squads, newSq]
    setSquads(updated)
    setShowAddSquadModal(false)
    setNewSquadName("")
    setNewSquadCode("")
    setNewSquadProducts(["App MBBank"])

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      actor: session?.displayName || "Admin Quản Trị",
      action: "Thêm Squad mới",
      target: newSq.name,
      details: `Hạn mức tải việc: ${newSq.capacityThreshold || 8} tasks`,
      type: "masterdata",
    }
    setAuditLogs((prev) => [newLog, ...prev])
    toast.success(`Đã tạo Squad [${newSq.name}]!`)
    syncMasterDataToSheet({ squads: updated })
  }

  const handleUpdateSquadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSquad) return

    const updated = squads.map((s) => (s.id === editingSquad.id ? editingSquad : s))
    setSquads(updated)

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      actor: session?.displayName || "Admin Quản Trị",
      action: "Cập nhật Squad",
      target: editingSquad.name,
      details: `Cập nhật Hạn mức tải việc: ${editingSquad.capacityThreshold || 8} tasks`,
      type: "masterdata",
    }
    setAuditLogs((prev) => [newLog, ...prev])
    setEditingSquad(null)
    toast.success(`Đã cập nhật Squad [${editingSquad.name}] thành công!`)
    syncMasterDataToSheet({ squads: updated })
  }

  // --- PHASE HANDLERS ---
  const handleUpdatePhaseSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPhase) return

    const updated = uxPhases.map((p) => (p.id === editingPhase.id ? editingPhase : p))
    setUxPhases(updated)

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      actor: session?.displayName || "Admin Quản Trị",
      action: "Cập nhật Khâu UX",
      target: editingPhase.name,
      details: `SLA: ${editingPhase.slaDays} ngày | Tiến độ: ${editingPhase.defaultProgress}%`,
      type: "workflow",
    }
    setAuditLogs((prev) => [newLog, ...prev])
    setEditingPhase(null)
    toast.success(`Đã lưu cấu hình Khâu [${editingPhase.name}]!`)
    syncMasterDataToSheet({ phases: updated })
  }

  const handleAddPhaseSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPhaseName.trim()) {
      toast.error("Vui lòng nhập tên khâu")
      return
    }

    const newPhase: UxPhaseSetting = {
      id: `phase-${Date.now()}`,
      step: uxPhases.length + 1,
      name: newPhaseName.trim(),
      slaDays: Number(newPhaseSla) || 2,
      defaultProgress: Number(newPhaseProgress) || 50,
      description: newPhaseDesc.trim() || `Khâu ${newPhaseName.trim()} trong quy trình thiết kế UX`,
      requiredDeliverable: newPhaseDeliverable.trim() || "Tài liệu bàn giao theo yêu cầu",
    }

    const updated = [...uxPhases, newPhase]
    setUxPhases(updated)
    localStorage.setItem("mbbank_admin_phases", JSON.stringify(updated))
    setShowAddPhaseModal(false)
    setNewPhaseName("")
    setNewPhaseSla(2)
    setNewPhaseProgress(50)
    setNewPhaseDesc("")
    setNewPhaseDeliverable("")

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      actor: session?.displayName || "Admin Quản Trị",
      action: "Thêm Khâu UX mới",
      target: newPhase.name,
      details: `Bước ${newPhase.step} · SLA: ${newPhase.slaDays} ngày · Tiến độ: ${newPhase.defaultProgress}%`,
      type: "workflow",
    }
    setAuditLogs((prev) => [newLog, ...prev])
    toast.success(`Đã thêm bước mới [${newPhase.name}] vào quy trình!`)
    syncMasterDataToSheet({ phases: updated })
  }

  const handleDeletePhase = (id: string, name: string) => {
    if (uxPhases.length <= 2) {
      toast.error("Quy trình cần tối thiểu 2 khâu.")
      return
    }
    const filtered = uxPhases.filter((p) => p.id !== id)
    const resynced = filtered.map((p, i) => ({ ...p, step: i + 1 }))
    setUxPhases(resynced)
    localStorage.setItem("mbbank_admin_phases", JSON.stringify(resynced))

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      actor: session?.displayName || "Admin Quản Trị",
      action: "Xóa Khâu UX",
      target: name,
      details: `Đã xóa bước khỏi quy trình`,
      type: "workflow",
    }
    setAuditLogs((prev) => [newLog, ...prev])
    toast.success(`Đã xóa khâu [${name}] khỏi quy trình!`)
    syncMasterDataToSheet({ phases: resynced })
  }

  // --- PRODUCT HANDLERS ---
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProdName.trim()) {
      toast.error("Vui lòng nhập tên Sản phẩm")
      return
    }
    const newPr: ProductSetting = {
      id: `prod-${Date.now()}`,
      name: newProdName.trim(),
      code: (newProdCode.trim() || newProdName.trim().replace(/\s+/g, "_")).toUpperCase(),
      squad: newProdSquad,
      leadPo: newProdPo,
      status: "Active",
    }
    const updated = [...products, newPr]
    setProducts(updated)
    setShowAddProductModal(false)
    setNewProdName("")
    setNewProdCode("")
    toast.success(`Đã thêm sản phẩm [${newPr.name}]!`)
    syncMasterDataToSheet({ products: updated })
  }

  const handleExportBackup = () => {
    const backupData = {
      version: "3.0.0",
      exportDate: new Date().toISOString(),
      teamMembers,
      uxPhases,
      squads,
      products,
      settings: { sheetUrl, sheetSyncInterval, figmaOrgKey, teamsWebhookUrl },
    }
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `MBBank_UX_Admin_Settings_Backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    toast.success("Đã xuất bản sao lưu cấu hình hệ thống (JSON)!")
  }

  const handleExportMembersCSV = () => {
    const headers = ["ID", "Họ và tên", "Email", "Vai trò", "Squads phụ trách", "Sản phẩm phụ trách", "Trạng thái", "Hạn mức việc (Tasks)", "Đang phụ trách (Tasks)"]
    const rows = teamMembers.map((m) => [
      m.id,
      `"${(m.name || "").replace(/"/g, '""')}"`,
      `"${(m.email || "").replace(/"/g, '""')}"`,
      `"${(m.role || "").replace(/"/g, '""')}"`,
      `"${(m.squads || []).join("; ").replace(/"/g, '""')}"`,
      `"${(m.products || []).join("; ").replace(/"/g, '""')}"`,
      `"${(m.status || "").replace(/"/g, '""')}"`,
      m.capacityLimit || 5,
      m.activeTasks || 0,
    ])
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Danh_Sach_Nhan_Su_UX_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast.success(`Đã tải xuống danh sách ${teamMembers.length} nhân sự dạng CSV (mở bằng Excel)!`)
  }

  const filteredMembers = teamMembers.filter((m) => {
    if (roleFilter !== "ALL" && m.role !== roleFilter) return false
    if (!memberSearchQuery.trim()) return true
    const q = memberSearchQuery.toLowerCase()
    const squadMatch = (m.squads || []).some((s) => s.toLowerCase().includes(q))
    const prodMatch = (m.products || []).some((p) => p.toLowerCase().includes(q))
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || squadMatch || prodMatch
  })

  if (!isAdmin) {
    return null
  }

  return (
    <main className="w-full max-w-[1720px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-h-screen animate-in fade-in-50 duration-200 pb-16">
      
      {/* 1. Page Header Đồng Bộ */}
      <BlurFade delay={0.02}>
        <PageHeader
          breadcrumb={{
            parent: "Hệ thống",
            current: "Cài đặt & Quản trị",
          }}
          title="Cài đặt Quản trị"
          subtitle="Quản trị nhân sự UX, ma trận phân quyền vai trò và quy trình bàn giao"
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportBackup}
                className="h-9 rounded-lg text-xs font-medium gap-1.5 cursor-pointer bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              >
                <Download className="w-3.5 h-3.5 text-zinc-500" />
                <span>Sao lưu JSON</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => toast.success("Đã đồng bộ và lưu toàn bộ cấu hình vào Google Sheet & LocalStorage!")}
                className="h-9 rounded-lg text-xs font-medium gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer shadow-xs px-3.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu tất cả thay đổi</span>
              </Button>
            </div>
          }
        />
      </BlurFade>

      {/* 2. Responsive 2-Column Settings Layout (ReUI Blocks Application/Settings) */}
      {/* Mobile / Tablet Horizontal Navigation Tabs (lg:hidden) */}
      <div className="lg:hidden">
        <div className="flex items-center gap-1.5 bg-zinc-100/90 p-1 rounded-xl overflow-x-auto no-scrollbar border border-zinc-200/60">
          {ADMIN_NAV_GROUPS.flatMap((g) => g.items).map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={`mob-tab-${item.id}`}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main 2-Column Grid (lg: and above) */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* CỘT 1: Navigation Rail (Minimalist ReUI Sidebar) */}
        <aside className="hidden lg:block w-60 xl:w-64 shrink-0 lg:sticky lg:top-6">
          <nav className="space-y-6">
            {ADMIN_NAV_GROUPS.map((group) => (
              <div key={group.category} className="space-y-1">
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  {group.category}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 text-sm font-medium transition-colors cursor-pointer select-none ${
                          isActive
                            ? "bg-zinc-100 text-zinc-900 font-semibold"
                            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                        }`}
                      >
                        <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-zinc-900" : "text-zinc-400"}`} />
                        <span className="truncate">{item.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* CỘT 2: Settings Main Panel */}
        <div className="flex-1 min-w-0 w-full space-y-6">

        {/* TAB 1: DANH SÁCH NHÂN SỰ UX */}
        {activeTab === "team" && (
          <div className="space-y-6">

            {/* Quick Metrics (Clean ReUI Stats) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-xs space-y-1">
                <span className="text-xs font-medium text-zinc-500">Tổng nhân sự</span>
                <div className="text-2xl font-bold text-zinc-900 font-mono">
                  <NumberTicker value={teamMembers.length} />
                </div>
                <span className="text-xs text-zinc-400">100% tài khoản active</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-xs space-y-1">
                <span className="text-xs font-medium text-zinc-500">Design Owners</span>
                <div className="text-2xl font-bold text-zinc-900 font-mono">
                  <NumberTicker value={teamMembers.filter(m => m.role === "Design Owner" || m.role === "Admin").length} />
                </div>
                <span className="text-xs text-zinc-400">Phân công & duyệt</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-xs space-y-1">
                <span className="text-xs font-medium text-zinc-500">UX Designers</span>
                <div className="text-2xl font-bold text-zinc-900 font-mono">
                  <NumberTicker value={teamMembers.filter(m => m.role === "Designer").length} />
                </div>
                <span className="text-xs text-zinc-400">Đa-Squad thực thi</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-xs space-y-1">
                <span className="text-xs font-medium text-zinc-500">Product Owners (PO)</span>
                <div className="text-2xl font-bold text-zinc-900 font-mono">
                  <NumberTicker value={teamMembers.filter(m => m.role === "PO").length} />
                </div>
                <span className="text-xs text-zinc-400">Phân hệ sản phẩm</span>
              </div>
            </div>

            {/* Team Table Card (Unified ReUI Card) */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
              {/* Card Header & Main Actions */}
              <div className="p-5 sm:p-6 border-b border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-zinc-900">Danh sách Thành viên UX</h3>
                  <p className="text-xs sm:text-sm text-zinc-500">
                    Quản lý tài khoản nhân sự, phân bổ squad và đồng bộ Google Sheets.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPullingMembers || isSyncingMembers}
                    onClick={handlePullMembersFromSheet}
                    className="h-8 rounded-lg text-xs font-medium gap-1.5 cursor-pointer bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    title="Tải và đồng bộ danh sách nhân sự từ Google Sheet về máy"
                  >
                    <Download className={`w-3.5 h-3.5 text-zinc-500 ${isPullingMembers ? "animate-bounce" : ""}`} />
                    <span>{isPullingMembers ? "Đang tải..." : "Tải từ Sheet"}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSyncingMembers || isPullingMembers}
                    onClick={handleManualSyncMembers}
                    className="h-8 rounded-lg text-xs font-medium gap-1.5 cursor-pointer bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    title="Đồng bộ danh sách nhân sự hiện tại lên Google Sheet"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${isSyncingMembers ? "animate-spin" : ""}`} />
                    <span>{isSyncingMembers ? "Đang đồng bộ..." : "Đồng bộ lên Sheet"}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportMembersCSV}
                    className="h-8 rounded-lg text-xs font-medium gap-1.5 cursor-pointer bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    title="Tải xuống danh sách nhân sự dạng tệp CSV mở bằng Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Xuất CSV</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowAddMemberModal(true)}
                    className="h-8 rounded-lg text-xs font-medium gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Thêm nhân sự</span>
                  </Button>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="p-4 sm:px-6 bg-zinc-50/50 border-b border-zinc-200/60 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
                  {/* Search */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="Tìm tên, email, squad..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none focus:border-zinc-400 transition-colors"
                    />
                  </div>

                  {/* Role filter pills */}
                  <div className="inline-flex items-center p-0.5 bg-zinc-100 rounded-lg text-xs font-medium">
                    {["ALL", "Designer", "Design Owner", "PO", "Admin"].map((r) => (
                      <button
                        key={`rf-${r}`}
                        type="button"
                        onClick={() => setRoleFilter(r)}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          roleFilter === r ? "bg-white text-zinc-900 shadow-2xs font-semibold" : "text-zinc-600 hover:text-zinc-900"
                        }`}
                      >
                        {r === "ALL" ? "Tất cả" : r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-zinc-500">
                  Hiển thị <span className="font-semibold text-zinc-900">{filteredMembers.length}</span> / {teamMembers.length} nhân sự
                </div>
              </div>

              {/* Members Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/80 text-zinc-500 text-xs font-medium border-b border-zinc-200">
                      <th className="py-3 px-4 font-medium">Nhân sự</th>
                      <th className="py-3 px-4 font-medium">Vai trò (Role)</th>
                      <th className="py-3 px-4 font-medium">Squads phụ trách</th>
                      <th className="py-3 px-4 font-medium">Sản phẩm phân bổ (PO/Design)</th>
                      <th className="py-3 px-4 font-medium">Tải việc</th>
                      <th className="py-3 px-4 font-medium text-center">Phân công</th>
                      <th className="py-3 px-4 font-medium text-center">Duyệt đầu bài</th>
                      <th className="py-3 px-4 font-medium text-center">Quản trị</th>
                      <th className="py-3 px-4 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {filteredMembers.map((member, idx) => (
                      <tr key={member.id ? `mem-row-${member.id}-${idx}` : `mem-${idx}`} className="hover:bg-zinc-50/60 transition-colors group">
                        {/* Member Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative group/ava flex-shrink-0 cursor-pointer" title="Bấm để tải ảnh đại diện lên Google Drive">
                              <UserAvatar
                                name={member.name}
                                avatarUrl={member.avatarUrl}
                                size="md"
                                className={`transition-opacity ${
                                  uploadingAvatarMemberId === member.id ? "opacity-30 animate-pulse" : ""
                                }`}
                              />
                              <label className="absolute inset-0 rounded-full bg-zinc-900/60 text-white flex items-center justify-center opacity-0 group-hover/ava:opacity-100 transition-opacity cursor-pointer shadow-sm">
                                <Camera className="w-3 h-3" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadingAvatarMemberId === member.id}
                                  onChange={(e) => handleAvatarUpload(member.id, member.email, e)}
                                />
                              </label>
                            </div>
                            <div>
                              <div className="font-semibold text-zinc-900 flex items-center gap-1.5 text-xs">
                                <span>{member.name}</span>
                                {member.status === "On Leave" && (
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-medium border border-zinc-200">Nghỉ phép</span>
                                )}
                                {member.status === "Busy" && (
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-medium border border-zinc-200">Bận cao</span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-400 font-mono">{member.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md font-medium text-xs border ${
                            member.role === "Admin"
                              ? "bg-zinc-900 text-white border-zinc-900"
                              : member.role === "Design Owner"
                              ? "bg-zinc-100 text-zinc-900 border-zinc-300 font-semibold"
                              : member.role === "PO"
                              ? "bg-zinc-100 text-zinc-800 border-zinc-200"
                              : "bg-zinc-50 text-zinc-600 border-zinc-200"
                          }`}>
                            {member.role}
                          </span>
                        </td>

                        {/* Multi-Squads */}
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {(member.squads && member.squads.length > 0 ? member.squads : [member.squad || "Chưa gán"]).map((sq, sqI) => (
                              <span key={`sq-pill-${sq}-${sqI}`} className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 text-[11px] font-medium border border-zinc-200 truncate">
                                {sq}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Multi-Products */}
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {(member.products && member.products.length > 0 ? member.products : ["Tất cả"]).map((pr, prI) => (
                              <span key={`pr-pill-${pr}-${prI}`} className="px-2 py-0.5 rounded-md bg-zinc-50 text-zinc-600 text-[11px] font-medium border border-zinc-200 truncate">
                                {pr}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Workload Capacity Bar */}
                        <td className="py-3 px-4 min-w-[130px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-medium text-zinc-700">{member.activeTasks} / {member.capacityLimit} tasks</span>
                              <span className="text-zinc-400 font-mono">
                                {Math.round((member.activeTasks / member.capacityLimit) * 100)}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  member.activeTasks >= member.capacityLimit
                                    ? "bg-rose-500"
                                    : "bg-zinc-800"
                                }`}
                                style={{ width: `${Math.min(100, (member.activeTasks / member.capacityLimit) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Permissions Checkboxes */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={member.permissions.canAssign}
                            onChange={() => handleTogglePermission(member.id, "canAssign")}
                            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                          />
                        </td>

                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={member.permissions.canApprovePo}
                            onChange={() => handleTogglePermission(member.id, "canApprovePo")}
                            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                          />
                        </td>

                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={member.permissions.canManageSystem}
                            onChange={() => handleTogglePermission(member.id, "canManageSystem")}
                            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                          />
                        </td>

                        {/* Actions (Edit & Delete) */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingMember(member)}
                              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                              title="Sửa phân bổ & phân quyền"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(member.id, member.name)}
                              className="p-1.5 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa nhân sự"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PHÂN QUYỀN (RBAC) */}
        {activeTab === "rbac" && (
          <div className="space-y-6">

            {/* Card 1: Permissions List */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
              {/* Card Header */}
              <div className="p-5 sm:p-6 border-b border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-zinc-900">Ma trận Phân quyền Vai trò</h3>
                  <p className="text-xs sm:text-sm text-zinc-500">
                    Bật hoặc tắt các quyền hạn hành động cho vai trò <span className="font-semibold text-zinc-800">{selectedRbacRole}</span>.
                  </p>
                </div>

                {/* Role Switcher & Preview Button */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="inline-flex items-center p-1 bg-zinc-100 rounded-lg text-xs font-medium">
                    {(["Admin", "Design Owner", "Designer", "PO"] as const).map((r) => (
                      <button
                        key={`rbac-tab-${r}`}
                        type="button"
                        onClick={() => setSelectedRbacRole(r)}
                        className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                          selectedRbacRole === r
                            ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                            : "text-zinc-600 hover:text-zinc-900"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  {selectedRbacRole !== "Admin" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        startRolePreview(selectedRbacRole)
                        toast.info(`Chế độ xem trước vai trò: ${selectedRbacRole}`, "Đang chuyển sang giao diện thực tế của vai trò này.")
                      }}
                      className="h-8 text-xs gap-1.5 text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                      title={`Xem giao diện hệ thống dưới tư cách vai trò ${selectedRbacRole}`}
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Xem thử vai trò</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Permissions Rows with Simple Dividers - ZERO nested cards! ZERO rainbow stickers! */}
              <div className="divide-y divide-zinc-100">
                {RBAC_CAPABILITIES.map((cap) => {
                  const isEnabled = (rbacRolesPermissions[cap.id] || []).includes(selectedRbacRole)
                  return (
                    <div
                      key={cap.id}
                      className="p-4 sm:px-6 flex items-center justify-between gap-6 hover:bg-zinc-50/60 transition-colors"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0 pr-4">
                        <div className="text-sm font-medium text-zinc-900">{cap.title}</div>
                        <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl">{cap.description}</p>
                      </div>

                      {/* Minimalist Switch Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleCapability(cap.id, selectedRbacRole)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isEnabled ? "bg-zinc-900" : "bg-zinc-200"
                        }`}
                        title={`Bật/tắt quyền cho ${selectedRbacRole}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Role Navigation Menu Visibility & Ordering Settings Card */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-zinc-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">
                    Cấu hình Menu Điều hướng (Sidebar)
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                    Kéo thả để đổi thứ tự, bật/tắt hiển thị menu trên Sidebar cho từng vai trò.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNavConfig(DEFAULT_ROLE_NAV_CONFIG)
                    saveRoleNavConfig(DEFAULT_ROLE_NAV_CONFIG)
                    setNavOrder(DEFAULT_NAV_ORDER)
                    saveNavOrderConfig(DEFAULT_NAV_ORDER)
                    toast.success("Đã khôi phục cài đặt & thứ tự Menu điều hướng mặc định!")
                  }}
                  className="h-8 text-xs gap-1.5 text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Khôi phục mặc định</span>
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold">
                      <th className="py-3 px-6">Mục trên Sidebar</th>
                      <th className="py-3 px-4 text-center font-medium">PO</th>
                      <th className="py-3 px-4 text-center font-medium">Designer</th>
                      <th className="py-3 px-4 text-center font-medium">Design Owner</th>
                      <th className="py-3 px-4 text-center font-medium">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {/* NHÓM 1: PLATFORM */}
                    <tr className="bg-zinc-50 border-y border-zinc-200">
                      <td colSpan={5} className="py-2.5 px-6 text-zinc-700 text-xs font-semibold">
                        <div className="flex items-center justify-between">
                          <span className="uppercase tracking-wider text-[11px] text-zinc-500 font-semibold">
                            Nhóm 1: Quản lý công việc & Báo cáo
                          </span>
                          <span className="text-zinc-400 font-mono text-[11px]">
                            {navOrder.platform.length} mục
                          </span>
                        </div>
                      </td>
                    </tr>

                    {navOrder.platform.map((key, idx) => {
                      const itemMeta = {
                        overview: { label: "Overview (Tổng quan)", icon: <Home className="w-3.5 h-3.5" />, desc: "Báo cáo thống kê, biểu đồ tiến độ & SLA tổng thể" },
                        track: { label: "Task của tôi (Theo dõi bài toán)", icon: <CheckSquare className="w-3.5 h-3.5" />, desc: "Bảng Kanban, danh sách bảng & lưới theo dõi tiến độ công việc" },
                        create: { label: "Tạo task mới (Gửi đề bài)", icon: <PlusCircle className="w-3.5 h-3.5" />, desc: "Form 3 bước gửi bài toán thiết kế UX cho team" },
                      }[key]

                      if (!itemMeta) return null
                      const isDragging = draggedGroup === "platform" && draggedIndex === idx

                      return (
                        <tr
                          key={`plat-${key}`}
                          draggable
                          onDragStart={() => handleDragStart("platform", idx)}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = "move"
                          }}
                          onDrop={() => handleDropItem("platform", idx)}
                          className={`hover:bg-zinc-50/70 transition-colors ${
                            isDragging ? "opacity-40 bg-zinc-100" : ""
                          }`}
                        >
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              {/* Drag Handle & Arrow buttons */}
                              <div className="flex items-center gap-1 shrink-0 text-zinc-400">
                                <div 
                                  className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                                  title="Kéo thả để đổi thứ tự"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMovePlatformItem(idx, "up")}
                                    className="p-0.5 rounded hover:bg-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed text-zinc-500 transition-colors cursor-pointer"
                                    title="Di chuyển lên"
                                  >
                                    <ArrowUp className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === navOrder.platform.length - 1}
                                    onClick={() => handleMovePlatformItem(idx, "down")}
                                    className="p-0.5 rounded hover:bg-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed text-zinc-500 transition-colors cursor-pointer"
                                    title="Di chuyển xuống"
                                  >
                                    <ArrowDown className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-500">
                                {itemMeta.icon}
                              </div>
                              <div>
                                <p className="font-medium text-zinc-900 text-xs">{itemMeta.label}</p>
                                <p className="text-[11px] text-zinc-400 font-normal">{itemMeta.desc}</p>
                              </div>
                            </div>
                          </td>
                          {(["PO", "Designer", "Design Owner", "Admin"] as UserRole[]).map((r) => {
                            const isEnabled = navConfig[r]?.[key] ?? true
                            return (
                              <td key={`${key}-${r}`} className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleNav(r, key)}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    isEnabled ? "bg-zinc-900" : "bg-zinc-200"
                                  }`}
                                  role="switch"
                                  aria-checked={isEnabled}
                                  title={`Bấm để ${isEnabled ? "TẮT" : "BẬT"} ${itemMeta.label} cho ${r}`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                      isEnabled ? "translate-x-4" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}

                    {/* NHÓM 2: RESOURCES */}
                    <tr className="bg-zinc-50 border-y border-zinc-200">
                      <td colSpan={5} className="py-2.5 px-6 text-zinc-700 text-xs font-semibold">
                        <div className="flex items-center justify-between">
                          <span className="uppercase tracking-wider text-[11px] text-zinc-500 font-semibold">
                            Nhóm 2: Công cụ & Quản trị hệ thống
                          </span>
                          <span className="text-zinc-400 font-mono text-[11px]">
                            {navOrder.resources.length} mục
                          </span>
                        </div>
                      </td>
                    </tr>

                    {navOrder.resources.map((key, idx) => {
                      const itemMeta = {
                        compressor: { label: "Nén ảnh (Built-in Tool)", icon: <span className="w-2 h-2 rounded-full bg-zinc-400 inline-block" />, desc: "Công cụ nén ảnh tối ưu dung lượng dưới 500KB" },
                        test: { label: "Bài test & Đánh giá (Khảo sát/Thi chuyên môn)", icon: <BookOpen className="w-3.5 h-3.5" />, desc: "Đánh giá năng lực chuyên môn, bài thi trắc nghiệm & tự luận" },
                        manage: { label: "Admin setting (Quản trị hệ thống)", icon: <ShieldCheck className="w-3.5 h-3.5" />, desc: "Cấu hình nhân sự, SLA, phân bổ Squad, tích hợp Webhook" },
                      }[key]

                      if (!itemMeta) return null
                      const isDragging = draggedGroup === "resources" && draggedIndex === idx

                      return (
                        <tr
                          key={`res-${key}`}
                          draggable
                          onDragStart={() => handleDragStart("resources", idx)}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = "move"
                          }}
                          onDrop={() => handleDropItem("resources", idx)}
                          className={`hover:bg-zinc-50/70 transition-colors ${
                            isDragging ? "opacity-40 bg-zinc-100" : ""
                          }`}
                        >
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              {/* Drag Handle & Arrow buttons */}
                              <div className="flex items-center gap-1 shrink-0 text-zinc-400">
                                <div 
                                  className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                                  title="Kéo thả để đổi thứ tự"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveResourceItem(idx, "up")}
                                    className="p-0.5 rounded hover:bg-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed text-zinc-500 transition-colors cursor-pointer"
                                    title="Di chuyển lên"
                                  >
                                    <ArrowUp className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === navOrder.resources.length - 1}
                                    onClick={() => handleMoveResourceItem(idx, "down")}
                                    className="p-0.5 rounded hover:bg-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed text-zinc-500 transition-colors cursor-pointer"
                                    title="Di chuyển xuống"
                                  >
                                    <ArrowDown className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-500">
                                {itemMeta.icon}
                              </div>
                              <div>
                                <p className="font-medium text-zinc-900 text-xs">{itemMeta.label}</p>
                                <p className="text-[11px] text-zinc-400 font-normal">{itemMeta.desc}</p>
                              </div>
                            </div>
                          </td>
                          {(["PO", "Designer", "Design Owner", "Admin"] as UserRole[]).map((r) => {
                            const isEnabled = navConfig[r]?.[key] ?? true
                            return (
                              <td key={`${key}-${r}`} className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleNav(r, key)}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    isEnabled ? "bg-zinc-900" : "bg-zinc-200"
                                  }`}
                                  role="switch"
                                  aria-checked={isEnabled}
                                  title={`Bấm để ${isEnabled ? "TẮT" : "BẬT"} ${itemMeta.label} cho ${r}`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                      isEnabled ? "translate-x-4" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUẢN LÝ ĐỀ THI & CHẤM BÀI TEST (EXCEL + SHEET) */}
        {activeTab === "test_bank" && (
          <div className="space-y-6">
            {/* ReUI Section Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900">Quản lý Đề thi & Chấm bài Test UX</h2>
                    <p className="text-xs text-zinc-500">Soạn đề thi trắc nghiệm & tự luận, đồng bộ câu hỏi Excel và chấm điểm năng lực</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-medium">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Excel + Google Sheet Gateway</span>
                </span>
              </div>
            </div>

            {adminRunningTest ? (
              <TestRunnerView
                test={adminRunningTest}
                user={{
                  name: session?.displayName || "Admin Quản Trị",
                  email: session?.teamsEmail || "admin@mbbank.com.vn",
                  role: "Admin",
                  squad: "Toàn hàng (Enterprise)",
                }}
                onFinish={() => {
                  toast.success("Đã hoàn tất làm thử đề thi!")
                }}
                onExit={() => setAdminRunningTest(null)}
              />
            ) : (
              <TestManagementView
                userRole="Admin"
                currentUserName={session?.displayName || "Admin Quản Trị"}
                currentUserEmail={session?.teamsEmail || "admin@mbbank.com.vn"}
                currentUserSquad="Toàn hàng (Enterprise)"
                onStartExam={(test) => setAdminRunningTest(test)}
              />
            )}
          </div>
        )}

        {/* TAB 3: ĐÁNH GIÁ HIỆU SUẤT & NĂNG LỰC NHÂN SỰ (FEATURE RIÊNG) */}
        {activeTab === "evaluation" && (
          <div className="space-y-6">
            {/* ReUI Section Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900">Đánh giá Hiệu suất & Năng lực Nhân sự</h2>
                    <p className="text-xs text-zinc-500">Theo dõi KPI Matrix, chuẩn hóa chỉ số FTR (First-Time-Right) và tuân thủ SLA khâu</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
                  <span>KPI Matrix MB v3.0</span>
                </span>
              </div>
            </div>

            {/* Top Scorecard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500">Chỉ số Chất lượng TB</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 text-[10px] font-medium border border-zinc-200">⭐ Xuất sắc</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 font-mono">
                  4.85<span className="text-xs text-zinc-400 font-normal">/5.0</span>
                </div>
                <p className="text-[11px] text-zinc-400">Chuẩn hóa Design System MB</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500">SLA Đúng hạn bàn giao</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 text-[10px] font-medium border border-zinc-200">+4.2% MoM</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 font-mono">
                  96.4<span className="text-xs text-zinc-400 font-normal">%</span>
                </div>
                <p className="text-[11px] text-zinc-400">Tỷ lệ nghiệm thu đúng hạn</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500">First-Time-Right (FTR)</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 text-[10px] font-medium border border-zinc-200">Ít sửa đổi</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 font-mono">
                  92.8<span className="text-xs text-zinc-400 font-normal">%</span>
                </div>
                <p className="text-[11px] text-zinc-400">Duyệt ngay sau review 1</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500">Tổng nhân sự active</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 text-[10px] font-medium border border-zinc-200">{teamMembers.length} thành viên</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 font-mono">
                  {teamMembers.filter(m => m.status === "Active").length}
                  <span className="text-xs text-zinc-400 font-normal"> đang làm việc</span>
                </div>
                <p className="text-[11px] text-zinc-400">Phủ kín 6 UX Squads</p>
              </div>
            </div>

            {/* Member Performance & Competency Table */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-zinc-500" />
                    <span>Ma trận Năng lực & Đánh giá Hiệu suất Từng Nhân sự</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Theo dõi tải trọng làm việc, điểm chất lượng nghiệm thu, tỷ lệ đúng hạn và năng lực chuyên môn của từng Designer/PO.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-medium text-xs">
                      <th className="py-3 px-4 font-medium">Nhân sự</th>
                      <th className="py-3 px-4 font-medium">Vai trò & Squads</th>
                      <th className="py-3 px-4 font-medium">Tải trọng hiện tại</th>
                      <th className="py-3 px-4 font-medium">Điểm chất lượng</th>
                      <th className="py-3 px-4 font-medium">Đúng hạn SLA</th>
                      <th className="py-3 px-4 font-medium">Năng lực nổi bật</th>
                      <th className="py-3 px-4 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {teamMembers.map((mem) => {
                      const utilPct = Math.min(100, Math.round((mem.activeTasks / (mem.capacityLimit || 5)) * 100))
                      const status = utilPct >= 90 ? "Quá tải" : utilPct >= 65 ? "Đang bận" : "Sẵn sàng"

                      return (
                        <tr key={mem.id} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar name={mem.name} size="md" />
                              <div>
                                <p className="font-semibold text-zinc-900 text-xs">{mem.name}</p>
                                <p className="text-[11px] text-zinc-400">{mem.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 space-y-1">
                            <span className="px-2 py-0.5 rounded-md font-medium text-xs border bg-zinc-100 text-zinc-800 border-zinc-200 inline-block">
                              {mem.role}
                            </span>
                            <p className="text-[11px] text-zinc-500 line-clamp-1">
                              {(mem.squads || []).join(", ") || "Chung"}
                            </p>
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1 min-w-[130px]">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-medium text-zinc-700">{mem.activeTasks}/{mem.capacityLimit || 5} tasks</span>
                                <span className="font-mono text-zinc-500">{utilPct}%</span>
                              </div>
                              <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    status === "Quá tải" ? "bg-rose-500" : "bg-zinc-800"
                                  }`}
                                  style={{ width: `${utilPct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <span className="text-zinc-400 font-bold">★</span>
                              <span className="font-mono font-semibold text-zinc-900 text-xs">
                                {mem.role === "Design Owner" ? "4.95" : mem.name.includes("Nam") ? "4.90" : "4.80"}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">/5.0</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-medium text-zinc-800">
                            {mem.role === "Design Owner" ? "98.5%" : "95.0%"}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap max-w-[200px]">
                              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[11px] font-medium border border-zinc-200">
                                {mem.role === "PO" ? "PRD Specs" : "Design Tokens"}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[11px] font-medium border border-zinc-200">
                                {mem.role === "PO" ? "Business Alignment" : "Liquid Glass UI"}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toast.success(`Mở hồ sơ đánh giá chi tiết của ${mem.name}`)}
                              className="h-7 text-xs font-medium rounded-lg bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700 cursor-pointer gap-1"
                            >
                              <span>Đánh giá</span>
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: QUY TRÌNH & KHÂU UX (SLA & DELIVERABLES) */}
        {activeTab === "workflow" && (
          <div className="space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-zinc-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold">
                    <Workflow className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">Cấu hình Quy trình Khâu UX & Tiêu chuẩn SLA ({uxPhases.length} bước)</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Danh sách các khâu theo trình tự từ trên xuống dưới. Kéo thả hoặc bấm mũi tên ⬆️⬇️ để sắp xếp thứ tự, thêm khâu mới hoặc sửa SLA & tài liệu bàn giao.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowAddPhaseModal(true)}
                    className="rounded-lg text-xs font-medium gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm bước mới</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRestorePhases}
                    className="rounded-lg text-xs gap-1.5 cursor-pointer bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Khôi phục mặc định</span>
                  </Button>
                </div>
              </div>

              {/* Vertical Stack List (Từ trên xuống dưới) */}
              <div className="space-y-2.5 pt-1">
                {uxPhases.map((phase, idx) => {
                  const isDragging = draggedPhaseIndex === idx

                  return (
                    <div
                      key={phase.id ? `ph-row-${phase.id}-${idx}` : `phase-${idx}`}
                      draggable
                      onDragStart={() => handlePhaseDragStart(idx)}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = "move"
                      }}
                      onDrop={() => handlePhaseDrop(idx)}
                      className={`p-3.5 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 select-none ${
                        isDragging ? "opacity-40 ring-2 ring-zinc-900 scale-98" : ""
                      }`}
                    >
                      {/* Left: Drag handle, Arrows, Step badge, Name & Badges */}
                      <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
                        {/* Drag handle & Move Up/Down */}
                        <div className="flex items-center gap-1 shrink-0 pt-0.5 md:pt-0">
                          <div
                            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                            title="Kéo thả để đổi thứ tự bước"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div className="flex flex-col md:flex-row items-center bg-zinc-50 border border-zinc-200 rounded-md p-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMovePhase(idx, "prev")}
                              className="p-1 rounded hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed text-zinc-600 transition-colors cursor-pointer"
                              title="Di chuyển lên trên (bước trước)"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === uxPhases.length - 1}
                              onClick={() => handleMovePhase(idx, "next")}
                              className="p-1 rounded hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed text-zinc-600 transition-colors cursor-pointer"
                              title="Di chuyển xuống dưới (bước sau)"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Step badge */}
                        <div className="w-7 h-7 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center font-mono font-semibold text-xs shrink-0">
                          {idx + 1}
                        </div>

                        {/* Phase Content */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-zinc-900 text-xs">{phase.name}</span>
                            
                            <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200 font-mono text-[11px] font-medium">
                              {phase.defaultProgress}% tiến độ
                            </span>

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-50 border border-zinc-200 text-zinc-600 text-[11px] font-medium">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              SLA: {phase.slaDays} ngày
                            </span>

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-50 border border-zinc-200 text-zinc-600 text-[11px] font-medium truncate max-w-[300px]">
                              📎 {phase.requiredDeliverable}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-1 md:line-clamp-none">
                            {phase.description}
                          </p>
                        </div>
                      </div>

                      {/* Right: Edit & Delete buttons */}
                      <div className="flex items-center justify-end gap-1 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingPhase(phase)}
                          className="rounded-lg text-xs gap-1 bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 cursor-pointer h-7"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Sửa</span>
                        </Button>

                        <button
                          type="button"
                          disabled={uxPhases.length <= 2}
                          onClick={() => handleDeletePhase(phase.id, phase.name)}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title={uxPhases.length <= 2 ? "Quy trình cần tối thiểu 2 khâu" : "Xóa khâu này khỏi quy trình"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Synchronized Task Statuses Dictionary */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900">Danh mục Trạng thái Bài toán (Đồng bộ Toàn hệ thống)</h3>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                      Live Sync
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Quy chuẩn 6 trạng thái nghiệp vụ đồng bộ trực tiếp giữa Chi tiết bài toán (Task Detail), Cột Kanban và Bộ đếm SLA
                  </p>
                </div>
              </div>

              {/* Statuses Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-medium text-xs">
                      <th className="py-3 px-4 font-medium">Trạng thái</th>
                      <th className="py-3 px-4 font-medium">Ánh xạ Quy trình</th>
                      <th className="py-3 px-4 font-medium">Mô tả nghiệp vụ</th>
                      <th className="py-3 px-4 font-medium">Hành động tự động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {[
                      {
                        name: "Đang phân loại",
                        phaseMapping: "Khâu 1: Phân loại (15%)",
                        desc: "Khởi tạo bài toán, rà soát hồ sơ, đánh giá độ phức tạp & phân bổ UX Squad.",
                        systemAction: "Kích hoạt tính SLA khởi tạo bài toán",
                      },
                      {
                        name: "Đang thực hiện",
                        phaseMapping: "Khâu 2: Discovery -> Khâu 5: Prototype",
                        desc: "UX Designer đang tiến hành nghiên cứu, wireframe, UI Design và làm Prototype.",
                        systemAction: "Đồng bộ tiến độ % và hiển thị trên Kanban",
                      },
                      {
                        name: "Đã gửi PO",
                        phaseMapping: "Khâu 6: Bàn giao (100%)",
                        desc: "Đã hoàn thành thiết kế & prototype, gửi PO/Squad nghiệm thu sản phẩm.",
                        systemAction: "Gửi thông báo chờ PO phê duyệt bàn giao",
                      },
                      {
                        name: "Pending",
                        phaseMapping: "Tạm dừng đếm thời gian SLA",
                        desc: "Chờ phản hồi từ Business/Squad, phụ thuộc bên thứ 3 hoặc hoãn theo kế hoạch.",
                        systemAction: "Dừng bộ đếm thời gian để không phạt SLA",
                      },
                      {
                        name: "Hoàn thành",
                        phaseMapping: "Hoàn tất 100% nghiệm thu",
                        desc: "PO đã xác nhận nghiệm thu kết quả bàn giao UX, chính thức đóng bài toán.",
                        systemAction: "Ghi nhận vào KPI hoàn thành đạt chuẩn SLA",
                      },
                      {
                        name: "Bị chặn",
                        phaseMapping: "Cảnh báo nghẽn (Blocker)",
                        desc: "Thiếu nghiệp vụ trầm trọng, xung đột tài nguyên hoặc tạm hủy/hủy bỏ.",
                        systemAction: "Gắn cờ đỏ cảnh báo và gửi email Lead UX",
                      },
                    ].map((st) => (
                      <tr key={st.name} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium text-xs border bg-zinc-100 text-zinc-800 border-zinc-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                            {st.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                          {st.phaseMapping}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 max-w-sm">
                          {st.desc}
                        </td>
                        <td className="py-3 px-4 text-zinc-500">
                          <div className="flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>{st.systemAction}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Sync Guidance Alert */}
              <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-start gap-3 text-xs text-zinc-600">
                <Sparkles className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <p className="font-semibold text-zinc-900">Cơ chế đồng bộ thời gian thực:</p>
                  <p>
                    • Mọi thay đổi về khâu quy trình UX bên trên sẽ tự động phản ánh trực tiếp vào <strong>Tiến trình 6 bước</strong> của Chi tiết bài toán và <strong>Cột bảng Kanban</strong> mà không cần cấu hình lại.
                    <br />
                    • Trạng thái <strong>Đang phân loại</strong> đã được chuẩn hóa và hiển thị đồng bộ trong menu chọn trạng thái của trang Chi tiết bài toán.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DANH MỤC SQUADS & PRODUCTS (MASTER DATA) */}
        {activeTab === "masterdata" && (
          <div className="space-y-6">
            {/* ReUI Section Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900">Danh mục Master Data: Squads & Sản phẩm</h2>
                    <p className="text-xs text-zinc-500">Quản lý các khối chuyên môn, phân hệ sản phẩm và trần hạn mức tiếp nhận đề bài</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAddSquadModal(true)}
                  className="rounded-lg text-xs font-medium gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Squad mới</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddProductModal(true)}
                  className="rounded-lg text-xs font-medium gap-1.5 bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Thêm Sản phẩm</span>
                </Button>
              </div>
            </div>

            {/* Squads Management */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-zinc-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Quản lý UX Squads & Hạn mức Tải việc</h3>
                  <p className="text-xs text-zinc-500">Cấu hình danh sách các Squad, hạn mức tải việc và Sản phẩm trực thuộc</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAddSquadModal(true)}
                  className="rounded-lg text-xs font-medium gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Squad mới</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {squads.map((sq, sqIdx) => (
                  <div
                    key={sq.id ? `sq-card-${sq.id}-${sqIdx}` : `sq-${sqIdx}`}
                    className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all shadow-xs space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-900 text-sm">{sq.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded font-mono text-[10.5px] font-medium bg-zinc-100 border border-zinc-200 text-zinc-700">
                          {sq.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingSquad(sq)}
                          className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                          title="Sửa Squad"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-zinc-600">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Hạn mức tải việc (Max):</span>
                        <span className="font-medium text-zinc-900 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">{sq.capacityThreshold || 8} tasks</span>
                      </div>
                    </div>

                    {sq.products && sq.products.length > 0 && (
                      <div className="pt-2 border-t border-zinc-100">
                        <span className="text-[10px] uppercase font-medium text-zinc-400 block mb-1">Sản phẩm thuộc Squad:</span>
                        <div className="flex flex-wrap gap-1">
                          {sq.products.map((p, pIdx) => (
                            <span key={`sq-p-${p}-${pIdx}`} className="px-1.5 py-0.5 rounded bg-zinc-50 text-zinc-600 text-[10px] border border-zinc-200 font-medium">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Products Master Data */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-zinc-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Danh mục Sản phẩm & Phân hệ (Products Catalog)</h3>
                  <p className="text-xs text-zinc-500">Các sản phẩm số mà PO có thể chọn khi tạo yêu cầu đề bài UX</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddProductModal(true)}
                  className="rounded-lg text-xs font-medium gap-1.5 bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Thêm Sản phẩm mới</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {products.map((pr, prIdx) => (
                  <div key={pr.id ? `pr-item-${pr.id}-${prIdx}` : `pr-${prIdx}`} className="p-3 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 transition-all flex items-center justify-between gap-2 shadow-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 text-xs truncate">{pr.name}</p>
                      <p className="text-[11px] text-zinc-400 truncate">{pr.squad}</p>
                    </div>
                    <span className="bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px] shrink-0 font-mono px-1.5 py-0.5 rounded font-medium">
                      {pr.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: TÍCH HỢP & KẾT NỐI (INTEGRATIONS) */}
        {activeTab === "integrations" && (
          <div className="space-y-6">
            {/* ReUI Section Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900">Tích hợp Cổng Kết nối Ngoại vi (APIs & Webhooks)</h2>
                    <p className="text-xs text-zinc-500">Quản lý kết nối cơ sở dữ liệu Google Sheets, lưu trữ Drive và Webhooks thông báo Teams</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>All Gateways Online</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Sheets Config Card */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-zinc-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">Google Sheets Database Gateway</h3>
                    <p className="text-xs text-zinc-500">Đồng bộ hai chiều dữ liệu bài toán UX</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200 text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connected
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1">
                    Google Apps Script Webhook Endpoint:
                  </label>
                  <Input
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="font-mono text-xs bg-zinc-50 rounded-lg border-zinc-200"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-zinc-700 block mb-1">
                      Chu kỳ tự động đồng bộ:
                    </label>
                    <select
                      value={sheetSyncInterval}
                      onChange={(e) => setSheetSyncInterval(e.target.value)}
                      className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 outline-none font-medium"
                    >
                      <option value="1">Mỗi 1 phút</option>
                      <option value="5">Mỗi 5 phút (Khuyến nghị)</option>
                      <option value="15">Mỗi 15 phút</option>
                      <option value="manual">Chỉ đồng bộ thủ công</option>
                    </select>
                  </div>

                  <div className="pt-5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTestingConnection(true)
                        setTimeout(() => {
                          setTestingConnection(false)
                          toast.success("Kết nối thành công tới MBBank Google Sheets Gateway (Latency: 38ms)!")
                        }, 1000)
                      }}
                      disabled={testingConnection}
                      className="rounded-lg text-xs font-medium gap-1.5 cursor-pointer bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 h-8"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? "animate-spin text-zinc-900" : ""}`} />
                      <span>{testingConnection ? "Đang test..." : "Test kết nối"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Microsoft Teams Bot Webhook */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-zinc-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">Microsoft Teams Notifications</h3>
                    <p className="text-xs text-zinc-500">Bắn thông báo realtime khi có đề bài mới hoặc bàn giao</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={autoNotifySlack}
                    onChange={(e) => setAutoNotifySlack(e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                  <span>Bật thông báo</span>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1">Teams Incoming Webhook URL:</label>
                  <Input
                    value={teamsWebhookUrl}
                    onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                    className="font-mono text-xs bg-zinc-50 rounded-lg border-zinc-200"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success("Đã gửi tin nhắn test thành công tới kênh Teams UX MBBank!")}
                  className="rounded-lg text-xs font-medium gap-1.5 cursor-pointer bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 h-8"
                >
                  <span>Gửi tin nhắn mẫu (Test Alert)</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* TAB 7: AUDIT LOGS & HỆ THỐNG */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            {/* ReUI Section Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900">Nhật ký Quản trị & Audit Trail</h2>
                    <p className="text-xs text-zinc-500">Truy vết toàn bộ thao tác can thiệp hệ thống, thêm/sửa nhân sự và thay đổi SLA</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportBackup}
                  className="rounded-lg text-xs font-medium gap-1.5 cursor-pointer bg-white border-zinc-200 shadow-xs hover:bg-zinc-50 text-zinc-700 h-8"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Xuất JSON Log</span>
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-zinc-200">
                <h3 className="text-sm font-semibold text-zinc-900">Nhật ký Quản trị Hệ thống (Admin Audit Trail)</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Ghi nhận toàn bộ thao tác thêm/sửa nhân sự, phân bổ Đa-Squad, thay đổi SLA và cài đặt</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/80 text-zinc-500 text-xs font-medium border-b border-zinc-200">
                      <th className="py-3 px-4 font-medium">Thời gian</th>
                      <th className="py-3 px-4 font-medium">Người thực hiện</th>
                      <th className="py-3 px-4 font-medium">Hành động</th>
                      <th className="py-3 px-4 font-medium">Đối tượng</th>
                      <th className="py-3 px-4 font-medium">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {auditLogs.map((log, idx) => (
                      <tr key={log.id ? `log-row-${log.id}-${idx}` : `log-${idx}`} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">{log.timestamp}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-900">{log.actor}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-medium text-[11px] border border-zinc-200 font-mono">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-800">{log.target}</td>
                        <td className="py-3 px-4 text-zinc-500">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: SỬA THÀNH VIÊN (EDIT MEMBER MODAL - MULTI SQUADS) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl p-6 w-full max-w-xl shadow-xl border border-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-zinc-700" />
                  <span>Sửa Phân bổ & Phân quyền: {editingMember.name}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateMemberSubmit} className="space-y-4">
                {/* Avatar Preview & Upload */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                  <UserAvatar name={editingMember.name} avatarUrl={editingMember.avatarUrl} size="md" />
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-zinc-700 block">Ảnh đại diện (Avatar):</label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Dán link ảnh (URL) hoặc tải từ máy..."
                        value={editingMember.avatarUrl || ""}
                        onChange={(e) => setEditingMember({ ...editingMember, avatarUrl: e.target.value })}
                        className="text-xs rounded-lg h-8 bg-white border-zinc-200 flex-1"
                      />
                      <label className="shrink-0 h-8 px-3 rounded-lg bg-white border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5 cursor-pointer">
                        <UploadCloud className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Tải ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0]
                            if (!f) return
                            e.target.value = ""
                            toast.info("Đang xử lý ảnh avatar...")
                            const res = await uploadAvatarToDrive(f, editingMember.email)
                            if (res.success && res.avatarUrl) {
                              setEditingMember({ ...editingMember, avatarUrl: res.avatarUrl })
                              toast.success("Đã tải ảnh đại diện thành công!")
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Họ và tên:</label>
                    <Input
                      required
                      value={editingMember.name}
                      onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                      className="text-xs rounded-lg border-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Email Teams:</label>
                    <Input
                      required
                      type="email"
                      value={editingMember.email}
                      onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                      className="text-xs rounded-lg border-zinc-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Vai trò (Role):</label>
                    <select
                      value={editingMember.role}
                      onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value as TeamMember["role"] })}
                      className="w-full text-xs bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none font-medium"
                    >
                      <option value="Designer">UX Designer</option>
                      <option value="Design Owner">Design Owner</option>
                      <option value="PO">Product Owner (PO)</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Trạng thái:</label>
                    <select
                      value={editingMember.status}
                      onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value as TeamMember["status"] })}
                      className="w-full text-xs bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none font-medium"
                    >
                      <option value="Active">Active (Sẵn sàng)</option>
                      <option value="On Leave">On Leave (Nghỉ phép)</option>
                      <option value="Busy">Busy (Quá tải)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Hạn mức (Max task):</label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={editingMember.capacityLimit}
                      onChange={(e) => setEditingMember({ ...editingMember, capacityLimit: parseInt(e.target.value) || 5 })}
                      className="text-xs rounded-lg border-zinc-200 text-center font-bold"
                    />
                  </div>
                </div>

                {/* Multi-Squads Selection */}
                <div className="space-y-1.5 p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-800">
                      Phân bổ Squads phụ trách (Chọn nhiều Squad):
                    </label>
                    <span className="text-[11px] text-zinc-500 font-medium font-mono">
                      {editingMember.squads.length} đã chọn
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {AVAILABLE_SQUADS_LIST.map((sq) => {
                      const isSelected = editingMember.squads.includes(sq)
                      return (
                        <label
                          key={`edit-sq-${sq}`}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                            isSelected
                              ? "bg-white border-zinc-900 text-zinc-900 font-medium shadow-xs"
                              : "bg-white/80 border-zinc-200 text-zinc-600 hover:border-zinc-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const nextSquads = isSelected
                                ? editingMember.squads.filter((s) => s !== sq)
                                : [...editingMember.squads, sq]
                              setEditingMember({ ...editingMember, squads: nextSquads })
                            }}
                            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                          />
                          <span className="truncate">{sq}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Multi-Products Selection */}
                <div className="space-y-1.5 p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-800">
                      Phân bổ Sản phẩm (PO gửi đề bài / Designer làm):
                    </label>
                    <span className="text-[11px] text-zinc-500 font-medium font-mono">
                      {(editingMember.products || []).length} sản phẩm
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
                    {AVAILABLE_PRODUCTS_LIST.map((pr) => {
                      const isSelected = (editingMember.products || []).includes(pr)
                      return (
                        <label
                          key={`edit-pr-${pr}`}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                            isSelected
                              ? "bg-white border-zinc-900 text-zinc-900 font-medium shadow-xs"
                              : "bg-white/80 border-zinc-200 text-zinc-600 hover:border-zinc-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const cur = editingMember.products || []
                              const nextProds = isSelected
                                ? cur.filter((p) => p !== pr)
                                : [...cur, pr]
                              setEditingMember({ ...editingMember, products: nextProds })
                            }}
                            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                          />
                          <span className="truncate">{pr}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingMember(null)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer shadow-xs h-8"
                  >
                    Lưu cập nhật
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: THÊM NHÂN SỰ MỚI (ADD MEMBER MODAL)               */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showAddMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl p-6 w-full max-w-xl shadow-xl border border-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-zinc-700" />
                  <span>Thêm nhân sự mới & Phân bổ Đa-Squad</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddMemberSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Họ và tên:</label>
                    <Input
                      required
                      value={newMemName}
                      onChange={(e) => setNewMemName(e.target.value)}
                      placeholder="VD: Lê Thị Thu Trang"
                      className="text-xs rounded-lg border-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Email Teams:</label>
                    <Input
                      required
                      type="email"
                      value={newMemEmail}
                      onChange={(e) => setNewMemEmail(e.target.value)}
                      placeholder="trang.designer@mbbank.com.vn"
                      className="text-xs rounded-lg border-zinc-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Vai trò (Role):</label>
                    <select
                      value={newMemRole}
                      onChange={(e) => setNewMemRole(e.target.value as TeamMember["role"])}
                      className="w-full text-xs bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none font-medium"
                    >
                      <option value="Designer">UX Designer</option>
                      <option value="Design Owner">Design Owner</option>
                      <option value="PO">Product Owner (PO)</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Trạng thái:</label>
                    <select
                      value={newMemStatus}
                      onChange={(e) => setNewMemStatus(e.target.value as TeamMember["status"])}
                      className="w-full text-xs bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none font-medium"
                    >
                      <option value="Active">Active (Sẵn sàng)</option>
                      <option value="On Leave">On Leave (Nghỉ phép)</option>
                      <option value="Busy">Busy (Bận)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Hạn mức (Max task):</label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={newMemCapacity}
                      onChange={(e) => setNewMemCapacity(parseInt(e.target.value) || 5)}
                      className="text-xs rounded-lg border-zinc-200 text-center font-bold"
                    />
                  </div>
                </div>

                {/* Multi-Squads Selection */}
                <div className="space-y-1.5 p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-800">
                      Phân bổ Squads phụ trách:
                    </label>
                    <span className="text-[11px] text-zinc-500 font-medium font-mono">
                      {newMemSquads.length} đã chọn
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {AVAILABLE_SQUADS_LIST.map((sq) => {
                      const isSelected = newMemSquads.includes(sq)
                      return (
                        <label
                          key={`add-sq-${sq}`}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                            isSelected
                              ? "bg-white border-zinc-900 text-zinc-900 font-medium shadow-xs"
                              : "bg-white/80 border-zinc-200 text-zinc-600 hover:border-zinc-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const nextSquads = isSelected
                                ? newMemSquads.filter((s) => s !== sq)
                                : [...newMemSquads, sq]
                              setNewMemSquads(nextSquads)
                            }}
                            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                          />
                          <span className="truncate">{sq}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Multi-Products Selection */}
                <div className="space-y-1.5 p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-800">
                      Phân bổ Sản phẩm (PO được gửi đề bài):
                    </label>
                    <span className="text-[11px] text-zinc-500 font-medium font-mono">
                      {newMemProducts.length} sản phẩm
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
                    {AVAILABLE_PRODUCTS_LIST.map((pr) => {
                      const isSelected = newMemProducts.includes(pr)
                      return (
                        <label
                          key={`add-pr-${pr}`}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                            isSelected
                              ? "bg-white border-zinc-900 text-zinc-900 font-medium shadow-xs"
                              : "bg-white/80 border-zinc-200 text-zinc-600 hover:border-zinc-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const nextProds = isSelected
                                ? newMemProducts.filter((p) => p !== pr)
                                : [...newMemProducts, pr]
                              setNewMemProducts(nextProds)
                            }}
                            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                          />
                          <span className="truncate">{pr}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddMemberModal(false)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer shadow-xs h-8"
                  >
                    Thêm nhân sự
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: SỬA SQUAD (EDIT SQUAD MODAL)                      */}
      {/* ======================================================== */}
      <AnimatePresence>
        {editingSquad && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-zinc-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-zinc-700" />
                  <span>Sửa cấu hình Squad: {editingSquad.name}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingSquad(null)}
                  className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateSquadSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1">Tên Squad:</label>
                  <Input
                    required
                    value={editingSquad.name}
                    onChange={(e) => setEditingSquad({ ...editingSquad, name: e.target.value })}
                    className="text-xs rounded-lg border-zinc-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Mã code:</label>
                    <Input
                      required
                      value={editingSquad.code}
                      onChange={(e) => setEditingSquad({ ...editingSquad, code: e.target.value.toUpperCase() })}
                      className="text-xs rounded-lg border-zinc-200 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Hạn mức task (Max):</label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={editingSquad.capacityThreshold || 8}
                      onChange={(e) => setEditingSquad({ ...editingSquad, capacityThreshold: parseInt(e.target.value) || 8 })}
                      className="text-xs rounded-lg border-zinc-200 text-center font-bold"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingSquad(null)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer shadow-xs h-8"
                  >
                    Lưu Squad
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: SỬA KHÂU UX (EDIT UX PHASE MODAL)                 */}
      {/* ======================================================== */}
      <AnimatePresence>
        {editingPhase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-zinc-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-zinc-700" />
                  <span>Sửa Khâu UX: Bước {editingPhase.step} · {editingPhase.name}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingPhase(null)}
                  className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdatePhaseSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1">Tên khâu:</label>
                  <Input
                    required
                    value={editingPhase.name}
                    onChange={(e) => setEditingPhase({ ...editingPhase, name: e.target.value })}
                    className="text-xs rounded-lg border-zinc-200 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">SLA cam kết (Ngày):</label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      required
                      value={editingPhase.slaDays}
                      onChange={(e) => setEditingPhase({ ...editingPhase, slaDays: parseInt(e.target.value) || 1 })}
                      className="text-xs rounded-lg border-zinc-200 font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Tiến độ mặc định (%):</label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={editingPhase.defaultProgress}
                      onChange={(e) => setEditingPhase({ ...editingPhase, defaultProgress: parseInt(e.target.value) || 15 })}
                      className="text-xs rounded-lg border-zinc-200 font-bold text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1">Mô tả nhiệm vụ khâu:</label>
                  <Textarea
                    rows={2}
                    value={editingPhase.description}
                    onChange={(e) => setEditingPhase({ ...editingPhase, description: e.target.value })}
                    className="text-xs rounded-lg border-zinc-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1">Tài liệu bàn giao bắt buộc:</label>
                  <Input
                    value={editingPhase.requiredDeliverable}
                    onChange={(e) => setEditingPhase({ ...editingPhase, requiredDeliverable: e.target.value })}
                    className="text-xs rounded-lg border-zinc-200"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingPhase(null)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer shadow-xs h-8"
                  >
                    Lưu cấu hình Khâu
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: THÊM KHÂU UX MỚI (ADD UX PHASE MODAL)             */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showAddPhaseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-zinc-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-zinc-700" />
                  <span>Thêm bước mới vào Quy trình UX</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddPhaseModal(false)}
                  className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddPhaseSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1">
                    Tên khâu / bước <span className="text-rose-500">*</span>:
                  </label>
                  <Input
                    required
                    value={newPhaseName}
                    onChange={(e) => setNewPhaseName(e.target.value)}
                    placeholder="VD: User Testing / Kiểm thử trải nghiệm"
                    className="text-xs rounded-lg border-zinc-200 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">SLA cam kết (Ngày):</label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      required
                      value={newPhaseSla}
                      onChange={(e) => setNewPhaseSla(parseInt(e.target.value) || 1)}
                      className="text-xs rounded-lg border-zinc-200 font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Tiến độ mặc định (%):</label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={newPhaseProgress}
                      onChange={(e) => setNewPhaseProgress(parseInt(e.target.value) || 50)}
                      className="text-xs rounded-lg border-zinc-200 font-bold text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1">Mô tả nhiệm vụ khâu:</label>
                  <Textarea
                    rows={2}
                    value={newPhaseDesc}
                    onChange={(e) => setNewPhaseDesc(e.target.value)}
                    placeholder="Mô tả mục tiêu và hành động trong bước này..."
                    className="text-xs rounded-lg border-zinc-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1">Tài liệu bàn giao bắt buộc:</label>
                  <Input
                    value={newPhaseDeliverable}
                    onChange={(e) => setNewPhaseDeliverable(e.target.value)}
                    placeholder="VD: Usability Test Report / Maze metrics link"
                    className="text-xs rounded-lg border-zinc-200"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddPhaseModal(false)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer shadow-xs gap-1 h-8"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm vào quy trình</span>
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: THÊM SQUAD MỚI (ADD SQUAD MODAL)                  */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showAddSquadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-zinc-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-zinc-700" />
                  <span>Thêm Squad mới</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddSquadModal(false)}
                  className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSquadSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1">Tên Squad / Nghiệp vụ:</label>
                  <Input
                    required
                    value={newSquadName}
                    onChange={(e) => setNewSquadName(e.target.value)}
                    placeholder="VD: Private Banking & VIP"
                    className="text-xs rounded-lg border-zinc-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Mã viết tắt (Code):</label>
                    <Input
                      required
                      value={newSquadCode}
                      onChange={(e) => setNewSquadCode(e.target.value)}
                      placeholder="VD: PRIVATE_BANKING"
                      className="text-xs rounded-lg border-zinc-200 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Hạn mức task (Max):</label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={newSquadCapacity}
                      onChange={(e) => setNewSquadCapacity(parseInt(e.target.value) || 8)}
                      className="text-xs rounded-lg border-zinc-200 text-center font-bold"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddSquadModal(false)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer shadow-xs h-8"
                  >
                    Tạo Squad
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: THÊM SẢN PHẨM MỚI (ADD PRODUCT MODAL)            */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showAddProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-zinc-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-zinc-700" />
                  <span>Thêm Sản phẩm / Phân hệ mới</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddProductSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1">Tên Sản phẩm:</label>
                  <Input
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="VD: Thẻ Tín Dụng Quốc Tế"
                    className="text-xs rounded-lg border-zinc-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Mã code:</label>
                    <Input
                      value={newProdCode}
                      onChange={(e) => setNewProdCode(e.target.value)}
                      placeholder="VD: CC_INTL"
                      className="text-xs rounded-lg border-zinc-200 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Squad trực thuộc:</label>
                    <select
                      value={newProdSquad}
                      onChange={(e) => setNewProdSquad(e.target.value)}
                      className="w-full text-xs bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none font-medium"
                    >
                      {squads.map((s) => (
                        <option key={`prod-sq-${s.id}`} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddProductModal(false)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer shadow-xs h-8"
                  >
                    Thêm Sản phẩm
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  )
}
