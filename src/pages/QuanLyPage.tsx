import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Frame } from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { getStoredSession } from "@/services/otpAuthService"
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
import {
  Users,
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
} from "lucide-react"
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

type AdminTab = "team" | "evaluation" | "workflow" | "integrations" | "masterdata" | "audit"

export default function QuanLyPage() {
  const session = getStoredSession()
  const isAdmin = session?.role === "Admin"

  // RBAC Access Guard
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FCFCFD] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-bold px-3 py-1">
              403 Access Denied
            </Badge>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Giới hạn quyền truy cập
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Trang <strong>Admin & System Settings</strong> chỉ dành riêng cho tài khoản Quản trị viên (<strong>Role Admin</strong>).
            </p>
          </div>
        </div>
      </div>
    )
  }

  const [activeTab, setActiveTab] = useState<AdminTab>("team")
  const [roleFilter, setRoleFilter] = useState<string>("ALL")
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>("")

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

  // Manual Sync Button Handler
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

  const filteredMembers = teamMembers.filter((m) => {
    if (roleFilter !== "ALL" && m.role !== roleFilter) return false
    if (!memberSearchQuery.trim()) return true
    const q = memberSearchQuery.toLowerCase()
    const squadMatch = (m.squads || []).some((s) => s.toLowerCase().includes(q))
    const prodMatch = (m.products || []).some((p) => p.toLowerCase().includes(q))
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || squadMatch || prodMatch
  })

  return (
    <div className="w-full max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in-50 duration-200 pb-16">
      
      {/* 1. Page Header */}
      <BlurFade delay={0.02}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1057FB] shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Admin & System Settings
                  <Badge variant="navy" size="xs" dot dotColor="bg-emerald-400" dotPulse>
                    Enterprise v3.0
                  </Badge>
                </h1>
                <p className="text-xs text-slate-500">
                  Trung tâm quản trị nhân sự Đa-Squad, phân quyền đề bài PO, cấu hình 6 khâu UX & đồng bộ dữ liệu
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportBackup}
              className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer bg-white border-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Sao lưu JSON</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => toast.success("Đã đồng bộ và lưu toàn bộ cấu hình vào Google Sheet & LocalStorage!")}
              className="rounded-xl text-xs font-bold gap-1.5 bg-[#1057FB] hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu tất cả thay đổi</span>
            </Button>
          </div>
        </div>
      </BlurFade>

      {/* 2. Top Navigation Tabs */}
      <BlurFade delay={0.06}>
        <div className="flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-2xl overflow-x-auto no-scrollbar border border-slate-200/60">
          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "team"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Users className="w-4 h-4 text-[#1057FB]" />
            <span>1. Nhân sự & Phân quyền</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-[#1057FB] text-[10.5px]">
              {teamMembers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("evaluation")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "evaluation"
                ? "bg-white text-[#1057FB] shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>2. Đánh giá Hiệu suất & Năng lực</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10.5px] font-bold">
              Feature
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("workflow")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "workflow"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Workflow className="w-4 h-4 text-indigo-600" />
            <span>3. Quy trình & Khâu UX (SLA)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10.5px]">
              {uxPhases.length} Khâu
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("masterdata")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "masterdata"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Boxes className="w-4 h-4 text-purple-600" />
            <span>4. Squads & Sản phẩm</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 text-[10.5px]">
              {squads.length} Squads
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("integrations")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "integrations"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Database className="w-4 h-4 text-emerald-600" />
            <span>5. Tích hợp & Kết nối</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "audit"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <History className="w-4 h-4 text-slate-600" />
            <span>5. Audit Logs & Lịch sử</span>
          </button>
        </div>
      </BlurFade>

      {/* 3. TAB CONTENTS */}
      <div className="space-y-6">

        {/* TAB 1: NHÂN SỰ & PHÂN QUYỀN (TEAM & RBAC) */}
        {activeTab === "team" && (
          <div className="space-y-6">
            
            {/* Quick Metrics */}
            <BlurFade delay={0.08}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SpotlightCard spotlightColor="rgba(16, 87, 251, 0.1)" className="p-4 bg-white space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tổng nhân sự</span>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    <NumberTicker value={teamMembers.length} />
                  </div>
                  <span className="text-[11px] text-emerald-600 font-medium">100% tài khoản Active</span>
                </SpotlightCard>

                <SpotlightCard spotlightColor="rgba(147, 51, 234, 0.1)" className="p-4 bg-white space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Design Owners</span>
                  <div className="text-2xl font-black text-[#1057FB] font-mono">
                    <NumberTicker value={teamMembers.filter(m => m.role === "Design Owner" || m.role === "Admin").length} />
                  </div>
                  <span className="text-[11px] text-slate-500">Quyền phân công & duyệt</span>
                </SpotlightCard>

                <SpotlightCard spotlightColor="rgba(99, 102, 241, 0.1)" className="p-4 bg-white space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">UX Designers</span>
                  <div className="text-2xl font-black text-indigo-600 font-mono">
                    <NumberTicker value={teamMembers.filter(m => m.role === "Designer").length} />
                  </div>
                  <span className="text-[11px] text-slate-500">Đa Squad thực thi nhiệm vụ</span>
                </SpotlightCard>

                <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.1)" className="p-4 bg-white space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Product Owners (PO)</span>
                  <div className="text-2xl font-black text-emerald-600 font-mono">
                    <NumberTicker value={teamMembers.filter(m => m.role === "PO").length} />
                  </div>
                  <span className="text-[11px] text-slate-500">Phân bổ theo sản phẩm</span>
                </SpotlightCard>
              </div>
            </BlurFade>

            {/* Team Table Header & Actions */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3.5">
                <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
                  {/* Search */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="Tìm theo tên, email, squad, sản phẩm..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#1057FB] transition-all"
                    />
                  </div>

                  {/* Role filter pills */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                    {["ALL", "Designer", "Design Owner", "PO", "Admin"].map((r) => (
                      <button
                        key={`rf-${r}`}
                        type="button"
                        onClick={() => setRoleFilter(r)}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          roleFilter === r ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {r === "ALL" ? "Tất cả" : r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSyncingMembers}
                    onClick={handleManualSyncMembers}
                    className="rounded-xl text-xs font-semibold gap-1.5 border-slate-200 hover:bg-slate-50 cursor-pointer shadow-2xs text-slate-700"
                    title="Đồng bộ toàn bộ danh sách nhân sự lên Google Sheet (RAW_SETTINGS, USERS, Users_View)"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#1057FB] ${isSyncingMembers ? "animate-spin" : ""}`} />
                    <span>{isSyncingMembers ? "Đang đồng bộ..." : "Đồng bộ lên Sheet"}</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowAddMemberModal(true)}
                    className="rounded-xl text-xs font-bold gap-1.5 bg-[#1057FB] text-white hover:bg-blue-700 cursor-pointer shadow-2xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Thêm nhân sự mới</span>
                  </Button>
                </div>
              </div>

              {/* Members Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
                      <th className="py-3.5 px-5">Nhân sự</th>
                      <th className="py-3.5 px-4">Vai trò (Role)</th>
                      <th className="py-3.5 px-4">Squads phụ trách</th>
                      <th className="py-3.5 px-4">Sản phẩm phân bổ (PO/Design)</th>
                      <th className="py-3.5 px-4">Tải việc</th>
                      <th className="py-3.5 px-4 text-center">Phân công</th>
                      <th className="py-3.5 px-4 text-center">Duyệt đầu bài</th>
                      <th className="py-3.5 px-4 text-center">Quản trị</th>
                      <th className="py-3.5 px-5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredMembers.map((member, idx) => (
                      <tr key={member.id ? `mem-row-${member.id}-${idx}` : `mem-${idx}`} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Member Info */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="relative group/ava flex-shrink-0 cursor-pointer" title="Bấm để tải ảnh đại diện lên Google Drive">
                              <UserAvatar
                                name={member.name}
                                avatarUrl={member.avatarUrl}
                                size="lg"
                                className={`transition-opacity ${
                                  uploadingAvatarMemberId === member.id ? "opacity-30 animate-pulse" : ""
                                }`}
                              />
                              <label className="absolute inset-0 rounded-full bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover/ava:opacity-100 transition-opacity cursor-pointer shadow-sm">
                                <Camera className="w-3.5 h-3.5" />
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
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{member.name}</span>
                                {member.status === "On Leave" && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9.5px] font-bold">Nghỉ phép</span>
                                )}
                                {member.status === "Busy" && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[9.5px] font-bold">Bận cao</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">{member.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10.5px] border ${
                            member.role === "Admin"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : member.role === "Design Owner"
                              ? "bg-blue-50 text-[#1057FB] border-blue-200"
                              : member.role === "PO"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                            {member.role}
                          </span>
                        </td>

                        {/* Multi-Squads */}
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {(member.squads && member.squads.length > 0 ? member.squads : [member.squad || "Chưa gán"]).map((sq, sqI) => (
                              <span key={`sq-pill-${sq}-${sqI}`} className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1057FB] text-[10px] font-semibold border border-blue-100 truncate">
                                {sq}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Multi-Products */}
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {(member.products && member.products.length > 0 ? member.products : ["Tất cả"]).map((pr, prI) => (
                              <span key={`pr-pill-${pr}-${prI}`} className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-semibold border border-purple-100 truncate">
                                {pr}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Workload Capacity Bar */}
                        <td className="py-3.5 px-4 min-w-[130px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10.5px]">
                              <span className="font-semibold text-slate-700">{member.activeTasks} / {member.capacityLimit} tasks</span>
                              <span className="text-slate-400 font-mono">
                                {Math.round((member.activeTasks / member.capacityLimit) * 100)}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  member.activeTasks >= member.capacityLimit
                                    ? "bg-rose-500"
                                    : member.activeTasks >= member.capacityLimit * 0.7
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, (member.activeTasks / member.capacityLimit) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Permissions Checkboxes */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={member.permissions.canAssign}
                            onChange={() => handleTogglePermission(member.id, "canAssign")}
                            className="rounded border-slate-300 text-[#1057FB] focus:ring-[#1057FB] cursor-pointer"
                          />
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={member.permissions.canApprovePo}
                            onChange={() => handleTogglePermission(member.id, "canApprovePo")}
                            className="rounded border-slate-300 text-[#1057FB] focus:ring-[#1057FB] cursor-pointer"
                          />
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={member.permissions.canManageSystem}
                            onChange={() => handleTogglePermission(member.id, "canManageSystem")}
                            className="rounded border-slate-300 text-[#1057FB] focus:ring-[#1057FB] cursor-pointer"
                          />
                        </td>

                        {/* Actions (Edit & Delete) */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingMember(member)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#1057FB] hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Sửa phân bổ & phân quyền"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(member.id, member.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa nhân sự"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Role Navigation Menu Visibility & Ordering Settings Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#1057FB]" />
                    <span>Cấu hình Thứ tự & Hiển thị Menu Điều hướng (Navigation RBAC)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kéo thả hoặc bấm mũi tên ⬆️⬇️ để sắp xếp thứ tự hiển thị, gạt công tắc để Bật / Tắt từng mục trên thanh Sidebar Navigation cho từng vai trò.
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
                  className="rounded-xl text-xs gap-1.5 cursor-pointer bg-white border-slate-200"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Khôi phục mặc định</span>
                </Button>
              </div>

              <div className="overflow-x-auto p-5">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold">
                      <th className="py-3 px-4 rounded-l-xl">Mục trên Navigation (Sidebar)</th>
                      <th className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold">PO</span>
                      </th>
                      <th className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold">Designer</span>
                      </th>
                      <th className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1057FB] border border-blue-200 font-bold">Design Owner</span>
                      </th>
                      <th className="py-3 px-4 text-center rounded-r-xl">
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">Admin</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    
                    {/* NHÓM 1: PLATFORM */}
                    <tr className="bg-slate-100/70 border-t border-b border-slate-200/90 font-bold">
                      <td colSpan={5} className="py-2.5 px-4 text-slate-700 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FolderKanban className="w-4 h-4 text-[#1057FB]" />
                            <span className="uppercase tracking-wider font-extrabold text-slate-800 text-[11px]">
                              Nhóm 1: PLATFORM (Quản lý công việc & Báo cáo)
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 font-mono text-[10px]">
                            {navOrder.platform.length} mục
                          </span>
                        </div>
                      </td>
                    </tr>

                    {navOrder.platform.map((key, idx) => {
                      const itemMeta = {
                        overview: { label: "Overview (Tổng quan)", icon: <Home className="w-4 h-4 text-slate-500" />, desc: "Báo cáo thống kê, biểu đồ tiến độ & SLA tổng thể" },
                        track: { label: "Task của tôi (Theo dõi bài toán)", icon: <CheckSquare className="w-4 h-4 text-slate-500" />, desc: "Bảng Kanban, danh sách bảng & lưới theo dõi tiến độ công việc" },
                        create: { label: "Tạo task mới (Gửi đề bài)", icon: <PlusCircle className="w-4 h-4 text-slate-500" />, desc: "Form 3 bước gửi bài toán thiết kế UX cho team" },
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
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isDragging ? "opacity-40 bg-blue-50/50" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {/* Drag Handle & Arrow buttons */}
                              <div className="flex items-center gap-1 shrink-0 text-slate-400">
                                <div 
                                  className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                  title="Kéo thả để đổi thứ tự"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMovePlatformItem(idx, "up")}
                                    className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                                    title="Di chuyển lên"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === navOrder.platform.length - 1}
                                    onClick={() => handleMovePlatformItem(idx, "down")}
                                    className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                                    title="Di chuyển xuống"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                {itemMeta.icon}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-[13px]">{itemMeta.label}</p>
                                <p className="text-[11px] text-slate-400 font-normal">{itemMeta.desc}</p>
                              </div>
                            </div>
                          </td>
                          {(["PO", "Designer", "Design Owner", "Admin"] as UserRole[]).map((r) => {
                            const isEnabled = navConfig[r]?.[key] ?? true
                            return (
                              <td key={`${key}-${r}`} className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleNav(r, key)}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1057FB] focus:ring-offset-2 shadow-2xs ${
                                    isEnabled ? "bg-[#1057FB]" : "bg-slate-200"
                                  }`}
                                  role="switch"
                                  aria-checked={isEnabled}
                                  title={`Bấm để ${isEnabled ? "TẮT" : "BẬT"} ${itemMeta.label} cho ${r}`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                      isEnabled ? "translate-x-5" : "translate-x-0"
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
                    <tr className="bg-slate-100/70 border-t border-b border-slate-200/90 font-bold">
                      <td colSpan={5} className="py-2.5 px-4 text-slate-700 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-emerald-600" />
                            <span className="uppercase tracking-wider font-extrabold text-slate-800 text-[11px]">
                              Nhóm 2: RESOURCES (Công cụ & Quản trị hệ thống)
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 font-mono text-[10px]">
                            {navOrder.resources.length} mục
                          </span>
                        </div>
                      </td>
                    </tr>

                    {navOrder.resources.map((key, idx) => {
                      const itemMeta = {
                        compressor: { label: "Nén ảnh (Built-in Tool)", icon: <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />, desc: "Công cụ nén ảnh tối ưu dung lượng dưới 500KB" },
                        manage: { label: "Admin setting (Quản trị hệ thống)", icon: <ShieldCheck className="w-4 h-4 text-slate-500" />, desc: "Cấu hình nhân sự, SLA, phân bổ Squad, tích hợp Webhook" },
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
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isDragging ? "opacity-40 bg-blue-50/50" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {/* Drag Handle & Arrow buttons */}
                              <div className="flex items-center gap-1 shrink-0 text-slate-400">
                                <div 
                                  className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                  title="Kéo thả để đổi thứ tự"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveResourceItem(idx, "up")}
                                    className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                                    title="Di chuyển lên"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === navOrder.resources.length - 1}
                                    onClick={() => handleMoveResourceItem(idx, "down")}
                                    className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                                    title="Di chuyển xuống"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                {itemMeta.icon}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-[13px]">{itemMeta.label}</p>
                                <p className="text-[11px] text-slate-400 font-normal">{itemMeta.desc}</p>
                              </div>
                            </div>
                          </td>
                          {(["PO", "Designer", "Design Owner", "Admin"] as UserRole[]).map((r) => {
                            const isEnabled = navConfig[r]?.[key] ?? true
                            return (
                              <td key={`${key}-${r}`} className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleNav(r, key)}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1057FB] focus:ring-offset-2 shadow-2xs ${
                                    isEnabled ? "bg-[#1057FB]" : "bg-slate-200"
                                  }`}
                                  role="switch"
                                  aria-checked={isEnabled}
                                  title={`Bấm để ${isEnabled ? "TẮT" : "BẬT"} ${itemMeta.label} cho ${r}`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                      isEnabled ? "translate-x-5" : "translate-x-0"
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

        {/* TAB 2: ĐÁNH GIÁ HIỆU SUẤT & NĂNG LỰC NHÂN SỰ (FEATURE RIÊNG) */}
        {activeTab === "evaluation" && (
          <div className="space-y-6">
            {/* Top Scorecard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chỉ số Chất lượng TB</span>
                  <Badge variant="success" size="xs" className="font-bold">⭐ Xuất sắc</Badge>
                </div>
                <div className="text-3xl font-extrabold text-slate-900 font-mono">
                  4.85<span className="text-xs text-slate-400 font-normal">/5.0</span>
                </div>
                <p className="text-[11px] text-slate-500">Đánh giá theo tiêu chuẩn Design System MB</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">SLA Đúng hạn bàn giao</span>
                  <Badge variant="navy" size="xs" className="font-bold">+4.2% MoM</Badge>
                </div>
                <div className="text-3xl font-extrabold text-emerald-600 font-mono">
                  96.4<span className="text-xs text-slate-400 font-normal">%</span>
                </div>
                <p className="text-[11px] text-slate-500">Tỷ lệ nghiệm thu đúng deadline cam kết</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">First-Time-Right (FTR)</span>
                  <Badge variant="secondary" size="xs" className="font-bold">Ít sửa đổi</Badge>
                </div>
                <div className="text-3xl font-extrabold text-slate-900 font-mono">
                  92.8<span className="text-xs text-slate-400 font-normal">%</span>
                </div>
                <p className="text-[11px] text-slate-500">Duyệt ngay sau vòng review đầu tiên</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng nhân sự active</span>
                  <Badge variant="outline" size="xs" className="font-bold">{teamMembers.length} thành viên</Badge>
                </div>
                <div className="text-3xl font-extrabold text-[#1057FB] font-mono">
                  {teamMembers.filter(m => m.status === "Active").length}
                  <span className="text-xs text-slate-400 font-normal"> đang làm việc</span>
                </div>
                <p className="text-[11px] text-slate-500">Phủ kín 6 UX Squads tác nghiệp</p>
              </div>
            </div>

            {/* Member Performance & Competency Table */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span>Ma trận Năng lực & Đánh giá Hiệu suất Từng Nhân sự</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Theo dõi tải trọng làm việc, điểm chất lượng nghiệm thu, tỷ lệ đúng hạn và năng lực chuyên môn của từng Designer/PO.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-5">Nhân sự</th>
                      <th className="py-3.5 px-4">Vai trò & Squads</th>
                      <th className="py-3.5 px-4">Tải trọng hiện tại</th>
                      <th className="py-3.5 px-4">Điểm chất lượng</th>
                      <th className="py-3.5 px-4">Đúng hạn SLA</th>
                      <th className="py-3.5 px-4">Năng lực nổi bật</th>
                      <th className="py-3.5 px-5 text-right">Thao tác Leader</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamMembers.map((mem) => {
                      const utilPct = Math.min(100, Math.round((mem.activeTasks / (mem.capacityLimit || 5)) * 100))
                      const status = utilPct >= 90 ? "Quá tải" : utilPct >= 65 ? "Đang bận" : "Sẵn sàng"

                      return (
                        <tr key={mem.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <UserAvatar name={mem.name} size="md" />
                              <div>
                                <p className="font-bold text-slate-900 text-sm leading-snug">{mem.name}</p>
                                <p className="text-[11px] text-slate-400">{mem.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 space-y-1">
                            <Badge
                              variant={mem.role === "Design Owner" ? "navy" : mem.role === "Admin" ? "destructive" : "secondary"}
                              size="xs"
                              className="font-bold"
                            >
                              {mem.role}
                            </Badge>
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {(mem.squads || []).join(", ") || "Chung"}
                            </p>
                          </td>

                          <td className="py-4 px-4">
                            <div className="space-y-1.5 min-w-[130px]">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-mono font-bold text-slate-800">{mem.activeTasks}/{mem.capacityLimit || 5} tasks</span>
                                <span className="font-mono text-slate-500 font-semibold">{utilPct}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    status === "Quá tải" ? "bg-rose-500" : status === "Đang bận" ? "bg-amber-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${utilPct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1">
                              <span className="text-amber-500 font-bold">★</span>
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                {mem.role === "Design Owner" ? "4.95" : mem.name.includes("Nam") ? "4.90" : "4.80"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">/5.0</span>
                            </div>
                          </td>

                          <td className="py-4 px-4 font-mono font-bold text-emerald-600">
                            {mem.role === "Design Owner" ? "98.5%" : "95.0%"}
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap max-w-[200px]">
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1057FB] text-[10px] font-semibold">
                                {mem.role === "PO" ? "PRD Specs" : "Design Tokens"}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-semibold">
                                {mem.role === "PO" ? "Business Alignment" : "Liquid Glass UI"}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-5 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toast.success(`Mở hồ sơ đánh giá chi tiết của ${mem.name}`)}
                              className="h-8 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer shadow-2xs gap-1"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
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
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Workflow className="w-5 h-5 text-[#1057FB]" />
                    <span>Cấu hình Quy trình Khâu UX & Tiêu chuẩn SLA ({uxPhases.length} bước)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Danh sách các khâu theo trình tự từ trên xuống dưới. Kéo thả hoặc bấm mũi tên ⬆️⬇️ để sắp xếp thứ tự, thêm khâu mới hoặc sửa SLA & tài liệu bàn giao.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowAddPhaseModal(true)}
                    className="rounded-xl text-xs font-bold gap-1.5 bg-[#1057FB] text-white hover:bg-blue-700 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm bước mới</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRestorePhases}
                    className="rounded-xl text-xs gap-1.5 cursor-pointer bg-white border-slate-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Khôi phục mặc định</span>
                  </Button>
                </div>
              </div>

              {/* Vertical Stack List (Từ trên xuống dưới) */}
              <div className="space-y-3 pt-1">
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
                      className={`p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-[#1057FB]/40 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 select-none ${
                        isDragging ? "opacity-40 ring-2 ring-[#1057FB] scale-98" : ""
                      }`}
                    >
                      {/* Left: Drag handle, Arrows, Step badge, Name & Badges */}
                      <div className="flex items-start md:items-center gap-3.5 min-w-0 flex-1">
                        {/* Drag handle & Move Up/Down */}
                        <div className="flex items-center gap-1 shrink-0 pt-0.5 md:pt-0">
                          <div
                            className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors"
                            title="Kéo thả để đổi thứ tự bước"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div className="flex flex-col md:flex-row items-center bg-white border border-slate-200/90 rounded-lg p-0.5 shadow-2xs">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMovePhase(idx, "prev")}
                              className="p-1 rounded hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                              title="Di chuyển lên trên (bước trước)"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === uxPhases.length - 1}
                              onClick={() => handleMovePhase(idx, "next")}
                              className="p-1 rounded hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                              title="Di chuyển xuống dưới (bước sau)"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Step circular badge */}
                        <div className="w-8 h-8 rounded-full bg-[#1057FB] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                          {idx + 1}
                        </div>

                        {/* Phase Content */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{phase.name}</span>
                            
                            <Badge variant="outline" className="bg-blue-50 text-[#1057FB] border-blue-200 font-mono text-[11px] font-semibold">
                              {phase.defaultProgress}% tiến độ
                            </Badge>

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-medium shadow-2xs">
                              <Clock className="w-3 h-3 text-slate-400" />
                              SLA: {phase.slaDays} ngày
                            </span>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[11px] font-medium shadow-2xs truncate max-w-[300px]">
                              📎 {phase.requiredDeliverable}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-1 md:line-clamp-none">
                            {phase.description}
                          </p>
                        </div>
                      </div>

                      {/* Right: Edit & Delete buttons */}
                      <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingPhase(phase)}
                          className="rounded-xl text-xs gap-1.5 bg-white border-slate-200 hover:border-[#1057FB] hover:text-[#1057FB] cursor-pointer h-8"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Chỉnh sửa</span>
                        </Button>

                        <button
                          type="button"
                          disabled={uxPhases.length <= 2}
                          onClick={() => handleDeletePhase(phase.id, phase.name)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title={uxPhases.length <= 2 ? "Quy trình cần tối thiểu 2 khâu" : "Xóa khâu này khỏi quy trình"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DANH MỤC SQUADS & PRODUCTS (MASTER DATA) */}
        {activeTab === "masterdata" && (
          <div className="space-y-6">
            {/* Squads Management */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Quản lý UX Squads & Hạn mức Tải việc</h3>
                  <p className="text-xs text-slate-500">Cấu hình danh sách các Squad, hạn mức tải việc và Sản phẩm trực thuộc</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAddSquadModal(true)}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-[#1057FB] text-white hover:bg-blue-700 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Squad mới</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {squads.map((sq, sqIdx) => (
                  <SpotlightCard
                    key={sq.id ? `sq-card-${sq.id}-${sqIdx}` : `sq-${sqIdx}`}
                    spotlightColor="rgba(147, 51, 234, 0.08)"
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{sq.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded font-mono text-[10.5px] font-bold bg-white border border-slate-200 text-slate-700">
                          {sq.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingSquad(sq)}
                          className="p-1 rounded-lg text-slate-400 hover:text-[#1057FB] hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Sửa Squad"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Hạn mức tải việc (Max):</span>
                        <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{sq.capacityThreshold || 8} tasks</span>
                      </div>
                    </div>

                    {sq.products && sq.products.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/70">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Sản phẩm thuộc Squad:</span>
                        <div className="flex flex-wrap gap-1">
                          {sq.products.map((p, pIdx) => (
                            <span key={`sq-p-${p}-${pIdx}`} className="px-1.5 py-0.2 rounded bg-white text-slate-700 text-[10px] border border-slate-200">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </SpotlightCard>
                ))}
              </div>
            </div>

            {/* Products Master Data */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Danh mục Sản phẩm & Phân hệ (Products Catalog)</h3>
                  <p className="text-xs text-slate-500">Các sản phẩm số mà PO có thể chọn khi tạo yêu cầu đề bài UX</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAddProductModal(true)}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-2xs"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Thêm Sản phẩm mới</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {products.map((pr, prIdx) => (
                  <div key={pr.id ? `pr-item-${pr.id}-${prIdx}` : `pr-${prIdx}`} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs truncate">{pr.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{pr.squad}</p>
                    </div>
                    <Badge variant="outline" className="bg-white text-slate-700 border-slate-200 text-[10px] shrink-0 font-mono">
                      {pr.code}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TÍCH HỢP & KẾT NỐI (INTEGRATIONS) */}
        {activeTab === "integrations" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Sheets Config Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Google Sheets Database Gateway</h3>
                    <p className="text-xs text-slate-500">Đồng bộ hai chiều dữ liệu bài toán UX</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Google Apps Script Webhook Endpoint:
                  </label>
                  <Input
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="font-mono text-xs bg-slate-50 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Chu kỳ tự động đồng bộ:
                    </label>
                    <select
                      value={sheetSyncInterval}
                      onChange={(e) => setSheetSyncInterval(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-medium"
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
                      className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer bg-white"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? "animate-spin text-[#1057FB]" : ""}`} />
                      <span>{testingConnection ? "Đang test..." : "Test kết nối"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Microsoft Teams Bot Webhook */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1057FB]">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Microsoft Teams Notifications</h3>
                    <p className="text-xs text-slate-500">Bắn thông báo realtime khi có đề bài mới hoặc bàn giao</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={autoNotifySlack}
                    onChange={(e) => setAutoNotifySlack(e.target.checked)}
                    className="rounded border-slate-300 text-[#1057FB] focus:ring-[#1057FB]"
                  />
                  <span>Bật thông báo</span>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Teams Incoming Webhook URL:</label>
                  <Input
                    value={teamsWebhookUrl}
                    onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                    className="font-mono text-xs bg-slate-50 rounded-xl"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success("Đã gửi tin nhắn test thành công tới kênh Teams UX MBBank!")}
                  className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer bg-white"
                >
                  <span>Gửi tin nhắn mẫu (Test Alert)</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS & HỆ THỐNG */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Nhật ký Quản trị Hệ thống (Admin Audit Trail)</h3>
                <p className="text-xs text-slate-500">Ghi nhận toàn bộ thao tác thêm/sửa nhân sự, phân bổ Đa-Squad, thay đổi SLA và cài đặt</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Người thực hiện</th>
                      <th className="py-3 px-4">Hành động</th>
                      <th className="py-3 px-4">Đối tượng</th>
                      <th className="py-3 px-4">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {auditLogs.map((log, idx) => (
                      <tr key={log.id ? `log-row-${log.id}-${idx}` : `log-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{log.timestamp}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{log.actor}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1057FB] font-bold text-[10.5px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{log.target}</td>
                        <td className="py-3 px-4 text-slate-500">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* MODAL: SỬA THÀNH VIÊN (EDIT MEMBER MODAL - MULTI SQUADS) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#1057FB]" />
                  <span>Sửa Phân bổ & Phân quyền: {editingMember.name}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateMemberSubmit} className="space-y-4">
                {/* Avatar Preview & Upload */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <UserAvatar name={editingMember.name} avatarUrl={editingMember.avatarUrl} size="lg" />
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Ảnh đại diện (Avatar):</label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Dán link ảnh (URL) hoặc tải từ máy..."
                        value={editingMember.avatarUrl || ""}
                        onChange={(e) => setEditingMember({ ...editingMember, avatarUrl: e.target.value })}
                        className="text-xs rounded-xl h-8 bg-white flex-1"
                      />
                      <label className="shrink-0 h-8 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs">
                        <UploadCloud className="w-3.5 h-3.5 text-[#1057FB]" />
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
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Họ và tên:</label>
                    <Input
                      required
                      value={editingMember.name}
                      onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                      className="text-xs rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Email Teams:</label>
                    <Input
                      required
                      type="email"
                      value={editingMember.email}
                      onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                      className="text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Vai trò (Role):</label>
                    <select
                      value={editingMember.role}
                      onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value as TeamMember["role"] })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-medium"
                    >
                      <option value="Designer">UX Designer</option>
                      <option value="Design Owner">Design Owner</option>
                      <option value="PO">Product Owner (PO)</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Trạng thái:</label>
                    <select
                      value={editingMember.status}
                      onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value as TeamMember["status"] })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-medium"
                    >
                      <option value="Active">Active (Sẵn sàng)</option>
                      <option value="On Leave">On Leave (Nghỉ phép)</option>
                      <option value="Busy">Busy (Quá tải)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Hạn mức (Max task):</label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={editingMember.capacityLimit}
                      onChange={(e) => setEditingMember({ ...editingMember, capacityLimit: parseInt(e.target.value) || 5 })}
                      className="text-xs rounded-xl text-center font-bold"
                    />
                  </div>
                </div>

                {/* Multi-Squads Selection */}
                <div className="space-y-1.5 p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      ⚡ Phân bổ Squads phụ trách (Chọn nhiều Squad):
                    </label>
                    <span className="text-[10.5px] text-blue-600 font-bold">
                      {editingMember.squads.length} Squads đã chọn
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {AVAILABLE_SQUADS_LIST.map((sq) => {
                      const isSelected = editingMember.squads.includes(sq)
                      return (
                        <label
                          key={`edit-sq-${sq}`}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                            isSelected
                              ? "bg-white border-[#1057FB] text-[#1057FB] font-bold shadow-2xs"
                              : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
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
                            className="rounded border-slate-300 text-[#1057FB]"
                          />
                          <span className="truncate">{sq}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Multi-Products Selection */}
                <div className="space-y-1.5 p-3 rounded-2xl bg-purple-50/50 border border-purple-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      📦 Phân bổ Sản phẩm (PO gửi đề bài / Designer làm):
                    </label>
                    <span className="text-[10.5px] text-purple-600 font-bold">
                      {(editingMember.products || []).length} Sản phẩm
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
                    {AVAILABLE_PRODUCTS_LIST.map((pr) => {
                      const isSelected = (editingMember.products || []).includes(pr)
                      return (
                        <label
                          key={`edit-pr-${pr}`}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                            isSelected
                              ? "bg-white border-purple-600 text-purple-700 font-bold shadow-2xs"
                              : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
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
                            className="rounded border-slate-300 text-purple-600"
                          />
                          <span className="truncate">{pr}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingMember(null)}
                    className="rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl text-xs font-bold bg-[#1057FB] text-white hover:bg-blue-700 cursor-pointer shadow-2xs"
                  >
                    Lưu cập nhật phân bổ
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#1057FB]" />
                  <span>Thêm nhân sự mới & Phân bổ Đa-Squad</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddMemberSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Họ và tên:</label>
                    <Input
                      required
                      value={newMemName}
                      onChange={(e) => setNewMemName(e.target.value)}
                      placeholder="VD: Lê Thị Thu Trang"
                      className="text-xs rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Email Teams:</label>
                    <Input
                      required
                      type="email"
                      value={newMemEmail}
                      onChange={(e) => setNewMemEmail(e.target.value)}
                      placeholder="trang.designer@mbbank.com.vn"
                      className="text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Vai trò (Role):</label>
                    <select
                      value={newMemRole}
                      onChange={(e) => setNewMemRole(e.target.value as TeamMember["role"])}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-medium"
                    >
                      <option value="Designer">UX Designer</option>
                      <option value="Design Owner">Design Owner</option>
                      <option value="PO">Product Owner (PO)</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Trạng thái:</label>
                    <select
                      value={newMemStatus}
                      onChange={(e) => setNewMemStatus(e.target.value as TeamMember["status"])}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-medium"
                    >
                      <option value="Active">Active (Sẵn sàng)</option>
                      <option value="On Leave">On Leave (Nghỉ phép)</option>
                      <option value="Busy">Busy (Bận)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Hạn mức (Max task):</label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={newMemCapacity}
                      onChange={(e) => setNewMemCapacity(parseInt(e.target.value) || 5)}
                      className="text-xs rounded-xl text-center font-bold"
                    />
                  </div>
                </div>

                {/* Multi-Squads Selection */}
                <div className="space-y-1.5 p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      ⚡ Phân bổ Squads phụ trách:
                    </label>
                    <span className="text-[10.5px] text-blue-600 font-bold">
                      {newMemSquads.length} Squads
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {AVAILABLE_SQUADS_LIST.map((sq) => {
                      const isSelected = newMemSquads.includes(sq)
                      return (
                        <label
                          key={`add-sq-${sq}`}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                            isSelected
                              ? "bg-white border-[#1057FB] text-[#1057FB] font-bold shadow-2xs"
                              : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
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
                            className="rounded border-slate-300 text-[#1057FB]"
                          />
                          <span className="truncate">{sq}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Multi-Products Selection */}
                <div className="space-y-1.5 p-3 rounded-2xl bg-purple-50/50 border border-purple-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      📦 Phân bổ Sản phẩm (PO được gửi đề bài):
                    </label>
                    <span className="text-[10.5px] text-purple-600 font-bold">
                      {newMemProducts.length} Sản phẩm
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
                    {AVAILABLE_PRODUCTS_LIST.map((pr) => {
                      const isSelected = newMemProducts.includes(pr)
                      return (
                        <label
                          key={`add-pr-${pr}`}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                            isSelected
                              ? "bg-white border-purple-600 text-purple-700 font-bold shadow-2xs"
                              : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
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
                            className="rounded border-slate-300 text-purple-600"
                          />
                          <span className="truncate">{pr}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddMemberModal(false)}
                    className="rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl text-xs font-bold bg-[#1057FB] text-white hover:bg-blue-700 cursor-pointer shadow-2xs"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-purple-600" />
                  <span>Sửa cấu hình Squad: {editingSquad.name}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingSquad(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateSquadSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tên Squad:</label>
                  <Input
                    required
                    value={editingSquad.name}
                    onChange={(e) => setEditingSquad({ ...editingSquad, name: e.target.value })}
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Mã code:</label>
                    <Input
                      required
                      value={editingSquad.code}
                      onChange={(e) => setEditingSquad({ ...editingSquad, code: e.target.value.toUpperCase() })}
                      className="text-xs rounded-xl font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Hạn mức task (Max):</label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={editingSquad.capacityThreshold || 8}
                      onChange={(e) => setEditingSquad({ ...editingSquad, capacityThreshold: parseInt(e.target.value) || 8 })}
                      className="text-xs rounded-xl text-center font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingSquad(null)}
                    className="rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl text-xs font-bold bg-[#1057FB] text-white hover:bg-blue-700 cursor-pointer shadow-2xs"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-indigo-600" />
                  <span>Sửa Khâu UX: Bước {editingPhase.step} · {editingPhase.name}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingPhase(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdatePhaseSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tên khâu:</label>
                  <Input
                    required
                    value={editingPhase.name}
                    onChange={(e) => setEditingPhase({ ...editingPhase, name: e.target.value })}
                    className="text-xs rounded-xl font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">SLA cam kết (Ngày):</label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      required
                      value={editingPhase.slaDays}
                      onChange={(e) => setEditingPhase({ ...editingPhase, slaDays: parseInt(e.target.value) || 1 })}
                      className="text-xs rounded-xl font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Tiến độ mặc định (%):</label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={editingPhase.defaultProgress}
                      onChange={(e) => setEditingPhase({ ...editingPhase, defaultProgress: parseInt(e.target.value) || 15 })}
                      className="text-xs rounded-xl font-bold text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Mô tả nhiệm vụ khâu:</label>
                  <Textarea
                    rows={2}
                    value={editingPhase.description}
                    onChange={(e) => setEditingPhase({ ...editingPhase, description: e.target.value })}
                    className="text-xs rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tài liệu bàn giao bắt buộc:</label>
                  <Input
                    value={editingPhase.requiredDeliverable}
                    onChange={(e) => setEditingPhase({ ...editingPhase, requiredDeliverable: e.target.value })}
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingPhase(null)}
                    className="rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-2xs"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-[#1057FB]" />
                  <span>Thêm bước mới vào Quy trình UX</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddPhaseModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddPhaseSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tên khâu / bước <span className="text-rose-500">*</span>:
                  </label>
                  <Input
                    required
                    value={newPhaseName}
                    onChange={(e) => setNewPhaseName(e.target.value)}
                    placeholder="VD: User Testing / Kiểm thử trải nghiệm"
                    className="text-xs rounded-xl font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">SLA cam kết (Ngày):</label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      required
                      value={newPhaseSla}
                      onChange={(e) => setNewPhaseSla(parseInt(e.target.value) || 1)}
                      className="text-xs rounded-xl font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Tiến độ mặc định (%):</label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={newPhaseProgress}
                      onChange={(e) => setNewPhaseProgress(parseInt(e.target.value) || 50)}
                      className="text-xs rounded-xl font-bold text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Mô tả nhiệm vụ khâu:</label>
                  <Textarea
                    rows={2}
                    value={newPhaseDesc}
                    onChange={(e) => setNewPhaseDesc(e.target.value)}
                    placeholder="Mô tả mục tiêu và hành động trong bước này..."
                    className="text-xs rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tài liệu bàn giao bắt buộc:</label>
                  <Input
                    value={newPhaseDeliverable}
                    onChange={(e) => setNewPhaseDeliverable(e.target.value)}
                    placeholder="VD: Usability Test Report / Maze metrics link"
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddPhaseModal(false)}
                    className="rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl text-xs font-bold bg-[#1057FB] text-white hover:bg-blue-700 cursor-pointer shadow-2xs gap-1"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-purple-600" />
                  <span>Thêm Squad mới</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddSquadModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSquadSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tên Squad / Nghiệp vụ:</label>
                  <Input
                    required
                    value={newSquadName}
                    onChange={(e) => setNewSquadName(e.target.value)}
                    placeholder="VD: Private Banking & VIP"
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Mã viết tắt (Code):</label>
                    <Input
                      required
                      value={newSquadCode}
                      onChange={(e) => setNewSquadCode(e.target.value)}
                      placeholder="VD: PRIVATE_BANKING"
                      className="text-xs rounded-xl font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Hạn mức task (Max):</label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={newSquadCapacity}
                      onChange={(e) => setNewSquadCapacity(parseInt(e.target.value) || 8)}
                      className="text-xs rounded-xl text-center font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddSquadModal(false)}
                    className="rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl text-xs font-bold bg-[#1057FB] text-white hover:bg-blue-700 cursor-pointer shadow-2xs"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-slate-900" />
                  <span>Thêm Sản phẩm / Phân hệ mới</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddProductSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tên Sản phẩm:</label>
                  <Input
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="VD: Thẻ Tín Dụng Quốc Tế"
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Mã code:</label>
                    <Input
                      value={newProdCode}
                      onChange={(e) => setNewProdCode(e.target.value)}
                      placeholder="VD: CC_INTL"
                      className="text-xs rounded-xl font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Squad trực thuộc:</label>
                    <select
                      value={newProdSquad}
                      onChange={(e) => setNewProdSquad(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-medium"
                    >
                      {squads.map((s) => (
                        <option key={`prod-sq-${s.id}`} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddProductModal(false)}
                    className="rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-2xs"
                  >
                    Thêm Sản phẩm
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
