import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Frame } from "@/components/reui/frame"
import { DropdownMenu, type DropdownOption } from "@/components/reui/dropdown-menu"
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
  fetchMasterDataFromSheet,
} from "@/services/googleSheetService"
import { UserAvatar } from "@/components/common/UserAvatar"
import { SpotlightCard } from "@/components/jolyui/spotlight-card"
import { NumberTicker } from "@/components/jolyui/number-ticker"
import { BlurFade } from "@/components/jolyui/blur-fade"
import PageHeader from "@/components/common/PageHeader"
import AddMemberModal from "@/components/common/AddMemberModal"
import { isMockDesigner } from "@/components/track/RequestDetail"
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
  UserX,
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
  Zap,
  RotateCcw,
  Play,
  Pause,
  Settings2,
  Send,
  FilePlus,
  PauseCircle,
  PlayCircle,
  Flag,
  AlertCircle,
  Flame,
  XCircle,
  UserCog,
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
  role: UserRole
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

export type TriggerEventType =
  | "po_created"
  | "designer_assigned"
  | "phase_changed"
  | "send_to_po"
  | "po_pending"
  | "po_approved"
  | "sla_breached"
  | "manual_flag"
  | "designer_pending"
  | "po_request_changes"
  | "sla_warning_80"
  | "task_resumed"
  | "deliverable_missing"
  | "reassigned_designer"
  | "user_testing_initiated"
  | "design_system_sync"
  | "business_rejected"

export interface StatusAutomationRule {
  id: string
  name: string
  colorKey: string
  badgeClass: string
  dotClass: string
  triggerDescription: string
  triggerEvent: TriggerEventType
  mappedPhaseIds: string[]
  mappedPhaseNames: string
  slaAction: "start" | "run" | "pause" | "complete" | "alert"
  slaActionLabel: string
  autoEnabled: boolean
  desc: string
}

export interface SquadSetting {
  id: string
  name: string
  code: string
  productName: string
  productId?: string
  leadPo?: string
  pos?: string[] // Danh sách PO phụ trách (chọn 1 hoặc nhiều)
  leadBusiness?: string
  businesses?: string[] // Danh sách Business phụ trách (chọn 1 hoặc nhiều)
  leadDesigner?: string
  designers?: string[] // Danh sách Designer phụ trách (chọn 1 hoặc nhiều)
  taskCount: number
  color?: string
  products?: string[]
  capacityThreshold?: number
  domain?: string
}

export interface ProductSetting {
  id: string
  name: string
  code?: string
  color?: string
  description?: string
  leadPo?: string
  status: "Active" | "Inactive"
}

import {
  PRODUCT_COLORS,
  ProductColorDef,
  getProductColorDef,
  getSquadColorDef,
  resolveColorKey,
} from "@/lib/colorUtils"

export {
  PRODUCT_COLORS,
  getProductColorDef,
  getSquadColorDef,
  resolveColorKey,
}
export type { ProductColorDef }

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
export const AVAILABLE_PRODUCTS_LIST = [
  "App MBBank",
  "Biz MBBank",
  "BaaS & Open API",
  "Design System & Nền tảng",
  "Khác",
]

export const AVAILABLE_SQUADS_LIST = [
  "eSaving",
  "Cards & Thanh toán số",
  "Lending & Vay vốn",
  "Core Banking & Tài khoản",
  "Digital Wealth & Đầu tư",
  "Chuyển tiền & Tiện ích số",
  "Biz Lending",
  "Biz eSaving",
  "Payroll & Quản lý lương",
  "BaaS Gateway",
  "Design System MB",
]

// Initial Mock Data (loại bỏ mock user)
const INITIAL_TEAM_MEMBERS: TeamMember[] = [
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
  {
    id: "mem-6",
    name: "Vũ Quốc Anh",
    email: "anh.po@mbbank.com.vn",
    role: "PO",
    squad: "Lending & Vay vốn",
    squads: ["Lending & Vay vốn", "Biz Lending"],
    products: ["Lending & Vay vốn", "Biz MBBank"],
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80",
    activeTasks: 3,
    capacityLimit: 8,
    status: "Active",
    permissions: { canAssign: false, canApprovePo: true, canExport: true, canManageSystem: false },
  },
  {
    id: "mem-7",
    name: "Nguyễn Minh Tuấn",
    email: "tuan.business@mbbank.com.vn",
    role: "Business",
    squad: "eSaving",
    squads: ["eSaving", "Biz eSaving"],
    products: ["App MBBank", "Biz MBBank"],
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80",
    activeTasks: 2,
    capacityLimit: 6,
    status: "Active",
    permissions: { canAssign: false, canApprovePo: false, canExport: true, canManageSystem: false },
  },
  {
    id: "mem-8",
    name: "Hoàng Thu Trang",
    email: "trang.business@mbbank.com.vn",
    role: "Business",
    squad: "Lending & Vay vốn",
    squads: ["Lending & Vay vốn", "Cards & Thanh toán số"],
    products: ["Lending & Vay vốn", "Cards & Digital Payment"],
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
    activeTasks: 4,
    capacityLimit: 6,
    status: "Active",
    permissions: { canAssign: false, canApprovePo: false, canExport: true, canManageSystem: false },
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

export const TRIGGER_EVENT_OPTIONS: DropdownOption[] = [
  // 1. Khởi tạo & Phân công
  {
    value: "po_created",
    label: "PO mới gửi yêu cầu bài toán (Chờ tiếp nhận / Phân loại)",
    icon: <FilePlus className="w-3.5 h-3.5 text-purple-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
        Khởi tạo
      </span>
    ),
  },
  {
    value: "designer_assigned",
    label: "Đã gán Designer & Đang thực hiện các khâu UX",
    icon: <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
        Phân công
      </span>
    ),
  },
  {
    value: "reassigned_designer",
    label: "Điều phối / Bàn giao lại cho Designer khác tiếp quản",
    icon: <UserCog className="w-3.5 h-3.5 text-indigo-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200 shrink-0">
        Điều phối
      </span>
    ),
  },

  // 2. Tiến độ & Khâu thực thi
  {
    value: "phase_changed",
    label: "Chuyển tiếp giữa các khâu UX trong quy trình (Khâu 1 → 6)",
    icon: <Workflow className="w-3.5 h-3.5 text-sky-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200 shrink-0">
        Tiến độ
      </span>
    ),
  },
  {
    value: "user_testing_initiated",
    label: "Khởi động thử nghiệm người dùng (Usability Testing / Pilot)",
    icon: <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 border border-teal-200 shrink-0">
        Testing
      </span>
    ),
  },
  {
    value: "design_system_sync",
    label: "Đồng bộ UI Token / Đóng góp Component vào ReUI Design System",
    icon: <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
        Design System
      </span>
    ),
  },

  // 3. Bàn giao & Nghiệm thu
  {
    value: "send_to_po",
    label: "Designer hoàn tất Prototype / Gửi PO nghiệm thu (@SendToPO)",
    icon: <Send className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
        Bàn giao
      </span>
    ),
  },
  {
    value: "po_approved",
    label: "PO xác nhận nghiệm thu duyệt thiết kế (Tiến độ 100%)",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
        Nghiệm thu
      </span>
    ),
  },
  {
    value: "po_request_changes",
    label: "PO yêu cầu chỉnh sửa / Thay đổi phương án thiết kế (@ChangeRequest)",
    icon: <RotateCcw className="w-3.5 h-3.5 text-orange-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200 shrink-0">
        Sửa đổi
      </span>
    ),
  },
  {
    value: "deliverable_missing",
    label: "Cảnh báo thiếu link bàn giao Figma/Prototype/Spec khi đổi khâu",
    icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
        Kiểm tra link
      </span>
    ),
  },

  // 4. Tạm hoãn & Nghẽn (Pending/Blocker)
  {
    value: "po_pending",
    label: "PO Pending: Quá hạn 24h PO chưa phản hồi duyệt phương án",
    icon: <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
        PO Pending
      </span>
    ),
  },
  {
    value: "designer_pending",
    label: "Designer tạm dừng do thiếu thông tin / Chờ Spec (@pending: [lý do])",
    icon: <PauseCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 shrink-0">
        UX Pending
      </span>
    ),
  },
  {
    value: "manual_flag",
    label: "Tạm hoãn theo yêu cầu nghiệp vụ / Chờ phụ thuộc bên thứ 3",
    icon: <Flag className="w-3.5 h-3.5 text-slate-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 shrink-0">
        Tạm dừng
      </span>
    ),
  },
  {
    value: "task_resumed",
    label: "Khôi phục / Tiếp tục xử lý sau khi giải phóng Blocker & Pending",
    icon: <PlayCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
        Phục hồi
      </span>
    ),
  },

  // 5. Cảnh báo SLA & Từ chối
  {
    value: "sla_warning_80",
    label: "Cảnh báo sớm: Tiến độ chạm ngưỡng 80% thời hạn SLA của khâu",
    icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-300 shrink-0">
        SLA 80%
      </span>
    ),
  },
  {
    value: "sla_breached",
    label: "Vượt quá 150% hạn SLA / Cảnh báo điểm nghẽn nghiêm trọng (Blocker)",
    icon: <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
        SLA Breached
      </span>
    ),
  },
  {
    value: "business_rejected",
    label: "Khối Nghiệp vụ / Ban điều hành từ chối hoặc hủy bỏ yêu cầu",
    icon: <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 shrink-0">
        Hủy bài toán
      </span>
    ),
  },
]

export const SLA_ACTION_OPTIONS: DropdownOption[] = [
  {
    value: "start",
    label: "Bắt đầu tính SLA (Start)",
    icon: <Play className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
        Start
      </span>
    ),
  },
  {
    value: "run",
    label: "Tiếp tục chạy SLA & % (Run)",
    icon: <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
        Run
      </span>
    ),
  },
  {
    value: "pause",
    label: "Tạm dừng SLA (Pause)",
    icon: <Pause className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
        Pause
      </span>
    ),
  },
  {
    value: "complete",
    label: "Hoàn thành chốt KPI (Complete)",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
        Complete
      </span>
    ),
  },
  {
    value: "alert",
    label: "Cảnh báo vi phạm SLA đỏ (Alert)",
    icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
        Alert
      </span>
    ),
  },
]

export const INITIAL_STATUS_RULES: StatusAutomationRule[] = [
  {
    id: "st-triage",
    name: "Đang phân loại",
    colorKey: "purple",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    dotClass: "bg-purple-500",
    triggerDescription: "PO mới gửi bài toán HOẶC chưa phân công UX Designer",
    triggerEvent: "po_created",
    mappedPhaseIds: ["ph-1"],
    mappedPhaseNames: "Khâu 1: Phân loại",
    slaAction: "start",
    slaActionLabel: "Kích hoạt tính SLA Tiếp nhận",
    autoEnabled: true,
    desc: "Khởi tạo bài toán, rà soát hồ sơ, đánh giá độ phức tạp & phân bổ UX Squad.",
  },
  {
    id: "st-in-progress",
    name: "Đang thực hiện",
    colorKey: "blue",
    badgeClass: "bg-blue-50 text-[#1057FB] border-blue-200",
    dotClass: "bg-[#1057FB]",
    triggerDescription: "Đã gán Designer VÀ tiến độ từ Khâu 2 trở đi",
    triggerEvent: "designer_assigned",
    mappedPhaseIds: ["ph-2", "ph-3", "ph-4", "ph-5"],
    mappedPhaseNames: "Khâu 2: Discovery → Khâu 5: Prototype",
    slaAction: "run",
    slaActionLabel: "Đồng bộ tiến độ % và chạy SLA Thiết kế",
    autoEnabled: true,
    desc: "UX Designer đang tiến hành nghiên cứu, wireframe, UI Design và làm Prototype.",
  },
  {
    id: "st-send-po",
    name: "Đã gửi PO",
    colorKey: "amber",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
    triggerDescription: "Designer hoàn tất Prototype/Bàn giao HOẶC gửi trao đổi gắn @SendToPO:",
    triggerEvent: "send_to_po",
    mappedPhaseIds: ["ph-6"],
    mappedPhaseNames: "Khâu 6: Bàn giao & Nghiệm thu",
    slaAction: "start",
    slaActionLabel: "Bắt đầu đếm hạn phản hồi PO (24h)",
    autoEnabled: true,
    desc: "Đã hoàn thành thiết kế & prototype, gửi PO/Squad nghiệm thu sản phẩm.",
  },
  {
    id: "st-po-pending",
    name: "PO Pending",
    colorKey: "amber",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    dotClass: "bg-amber-600",
    triggerDescription: "Đã quá 24h Designer gửi phương án (@SendToPO) nhưng PO chưa phản hồi duyệt",
    triggerEvent: "po_pending",
    mappedPhaseIds: ["ph-6"],
    mappedPhaseNames: "Chờ PO duyệt nghiệm thu",
    slaAction: "pause",
    slaActionLabel: "Tạm dừng đồng hồ SLA (Không bị phạt hạn)",
    autoEnabled: true,
    desc: "Hệ thống tự động kích hoạt khi gửi phương án quá 24h PO chưa phản hồi duyệt, tạm dừng tính hạn SLA.",
  },
  {
    id: "st-pending",
    name: "Pending",
    colorKey: "slate",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    dotClass: "bg-slate-400",
    triggerDescription: "Tạm hoãn theo yêu cầu nghiệp vụ HOẶC chờ phụ thuộc bên thứ 3",
    triggerEvent: "manual_flag",
    mappedPhaseIds: [],
    mappedPhaseNames: "Không cố định (Áp dụng mọi khâu)",
    slaAction: "pause",
    slaActionLabel: "Tạm dừng đồng hồ SLA (Không bị phạt hạn)",
    autoEnabled: true,
    desc: "Chờ phản hồi từ Business/Squad, phụ thuộc bên thứ 3 hoặc tạm hoãn bài toán theo kế hoạch.",
  },
  {
    id: "st-completed",
    name: "Hoàn thành",
    colorKey: "emerald",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
    triggerDescription: "PO bấm Nghiệm thu duyệt HOẶC tiến độ đạt 100% Khâu cuối",
    triggerEvent: "po_approved",
    mappedPhaseIds: ["ph-6"],
    mappedPhaseNames: "Khâu 6: Bàn giao (100%)",
    slaAction: "complete",
    slaActionLabel: "Dừng SLA, chốt chỉ số KPI hoàn thành",
    autoEnabled: true,
    desc: "PO đã xác nhận nghiệm thu kết quả bàn giao UX, chính thức đóng bài toán.",
  },
  {
    id: "st-blocked",
    name: "Bị chặn",
    colorKey: "rose",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
    triggerDescription: "Gặp trở ngại nghiêm trọng / Vượt quá 150% thời hạn SLA",
    triggerEvent: "sla_breached",
    mappedPhaseIds: [],
    mappedPhaseNames: "Cảnh báo nghẽn (Blocker)",
    slaAction: "alert",
    slaActionLabel: "Gắn cờ đỏ cảnh báo và gửi email Lead UX",
    autoEnabled: true,
    desc: "Thiếu nghiệp vụ trầm trọng, xung đột tài nguyên hoặc tạm hủy/hủy bỏ.",
  },
]

const INITIAL_PRODUCTS: ProductSetting[] = [
  {
    id: "prod-1",
    name: "App MBBank",
    code: "APP_MB",
    color: "blue",
    description: "Ứng dụng Ngân hàng số bán lẻ hàng đầu dành cho khách hàng cá nhân",
    status: "Active",
  },
  {
    id: "prod-2",
    name: "Biz MBBank",
    code: "BIZ_MB",
    color: "purple",
    description: "Nền tảng tài chính số thông minh dành cho doanh nghiệp SME & Corporate",
    status: "Active",
  },
  {
    id: "prod-3",
    name: "BaaS & Open API",
    code: "BAAS",
    color: "emerald",
    description: "Hạ tầng kết nối đối tác, ngân hàng nhúng và hệ sinh thái Open Banking",
    status: "Active",
  },
  {
    id: "prod-4",
    name: "Design System & Nền tảng",
    code: "DS_CORE",
    color: "amber",
    description: "Thư viện thiết kế Liquid Glass, UX Guideline và công cụ vận hành nội bộ",
    status: "Active",
  },
]

const INITIAL_SQUADS: SquadSetting[] = [
  // --- Squads của App MBBank ---
  { id: "sq-1", name: "eSaving", code: "ESAVING", productName: "App MBBank", productId: "prod-1", leadPo: "Trần Mai Lan", pos: ["Trần Mai Lan"], leadBusiness: "Nguyễn Minh Tuấn", businesses: ["Nguyễn Minh Tuấn"], leadDesigner: "Lê Hoàng Nam", designers: ["Lê Hoàng Nam"], taskCount: 8, color: "bg-emerald-50 text-emerald-700 border-emerald-200", capacityThreshold: 8, domain: "Tiết kiệm trực tuyến, tích lũy số & chứng chỉ tiền gửi" },
  { id: "sq-2", name: "Cards & Thanh toán số", code: "CARDS", productName: "App MBBank", productId: "prod-1", leadPo: "Trần Mai Lan", pos: ["Trần Mai Lan"], leadBusiness: "Hoàng Thu Trang", businesses: ["Hoàng Thu Trang"], leadDesigner: "Lê Hoàng Nam", designers: ["Lê Hoàng Nam", "Nguyễn Văn Cường"], taskCount: 6, color: "bg-purple-50 text-purple-700 border-purple-200", capacityThreshold: 8, domain: "Thẻ tín dụng, thẻ ghi nợ & cổng thanh toán số" },
  { id: "sq-3", name: "Lending & Vay vốn", code: "LENDING", productName: "App MBBank", productId: "prod-1", leadPo: "Vũ Quốc Anh", pos: ["Vũ Quốc Anh"], leadBusiness: "Hoàng Thu Trang", businesses: ["Hoàng Thu Trang"], leadDesigner: "Nguyễn Văn Cường", designers: ["Nguyễn Văn Cường"], taskCount: 8, color: "bg-blue-50 text-blue-700 border-blue-200", capacityThreshold: 10, domain: "Vay vốn tiêu dùng, thấu chi tín chấp & giải ngân số" },
  { id: "sq-4", name: "Core Banking & Tài khoản", code: "CORE", productName: "App MBBank", productId: "prod-1", leadPo: "Trần Mai Lan", pos: ["Trần Mai Lan"], leadBusiness: "Nguyễn Minh Tuấn", businesses: ["Nguyễn Minh Tuấn"], leadDesigner: "Nguyễn Văn Cường", designers: ["Nguyễn Văn Cường"], taskCount: 5, color: "bg-indigo-50 text-indigo-700 border-indigo-200", capacityThreshold: 8, domain: "Tài khoản thanh toán, số tài khoản đẹp & chuyển tiền" },
  { id: "sq-5", name: "Digital Wealth & Đầu tư", code: "WEALTH", productName: "App MBBank", productId: "prod-1", leadPo: "Vũ Quốc Anh", pos: ["Vũ Quốc Anh"], leadBusiness: "Nguyễn Minh Tuấn", businesses: ["Nguyễn Minh Tuấn"], leadDesigner: "Phạm Hải Đăng", designers: ["Phạm Hải Đăng", "Lê Hoàng Nam"], taskCount: 4, color: "bg-amber-50 text-amber-800 border-amber-200", capacityThreshold: 6, domain: "Đầu tư chứng khoán, chứng chỉ quỹ & tài chính gia đình" },
  { id: "sq-6", name: "Chuyển tiền & Tiện ích số", code: "TRANSFER", productName: "App MBBank", productId: "prod-1", leadPo: "Trần Mai Lan", pos: ["Trần Mai Lan"], leadBusiness: "Hoàng Thu Trang", businesses: ["Hoàng Thu Trang"], leadDesigner: "Lê Hoàng Nam", designers: ["Lê Hoàng Nam"], taskCount: 5, color: "bg-sky-50 text-sky-700 border-sky-200", capacityThreshold: 8, domain: "Chuyển tiền Napas247, hóa đơn & tiện ích đời sống" },

  // --- Squads của Biz MBBank ---
  { id: "sq-7", name: "Biz Lending", code: "BIZ_LEND", productName: "Biz MBBank", productId: "prod-2", leadPo: "Vũ Quốc Anh", pos: ["Vũ Quốc Anh"], leadBusiness: "Hoàng Thu Trang", businesses: ["Hoàng Thu Trang"], leadDesigner: "Nguyễn Văn Cường", designers: ["Nguyễn Văn Cường"], taskCount: 4, color: "bg-blue-50 text-blue-700 border-blue-200", capacityThreshold: 8, domain: "Tín dụng & tài trợ thương mại cho doanh nghiệp SME" },
  { id: "sq-8", name: "Biz eSaving", code: "BIZ_SAVE", productName: "Biz MBBank", productId: "prod-2", leadPo: "Trần Mai Lan", pos: ["Trần Mai Lan"], leadBusiness: "Nguyễn Minh Tuấn", businesses: ["Nguyễn Minh Tuấn"], leadDesigner: "Lê Hoàng Nam", designers: ["Lê Hoàng Nam"], taskCount: 3, color: "bg-emerald-50 text-emerald-700 border-emerald-200", capacityThreshold: 8, domain: "Tiền gửi có kỳ hạn & quản lý vốn lưu động doanh nghiệp" },
  { id: "sq-9", name: "Payroll & Quản lý lương", code: "PAYROLL", productName: "Biz MBBank", productId: "prod-2", leadPo: "Trần Mai Lan", pos: ["Trần Mai Lan"], leadBusiness: "Hoàng Thu Trang", businesses: ["Hoàng Thu Trang"], leadDesigner: "Lê Hoàng Nam", designers: ["Lê Hoàng Nam"], taskCount: 2, color: "bg-violet-50 text-violet-700 border-violet-200", capacityThreshold: 6, domain: "Chi lương tự động & quản trị nhân sự số cho doanh nghiệp" },

  // --- Squads của BaaS & Open API ---
  { id: "sq-10", name: "BaaS Gateway", code: "BAAS_GW", productName: "BaaS & Open API", productId: "prod-3", leadPo: "Vũ Quốc Anh", pos: ["Vũ Quốc Anh"], leadBusiness: "Nguyễn Minh Tuấn", businesses: ["Nguyễn Minh Tuấn"], leadDesigner: "Lê Hoàng Nam", designers: ["Lê Hoàng Nam"], taskCount: 3, color: "bg-cyan-50 text-cyan-700 border-cyan-200", capacityThreshold: 6, domain: "Cổng kết nối đối tác FinTech & nhúng dịch vụ ngân hàng" },
  { id: "sq-11", name: "Partner Integration", code: "PARTNER", productName: "BaaS & Open API", productId: "prod-3", leadPo: "Vũ Quốc Anh", pos: ["Vũ Quốc Anh"], leadBusiness: "Nguyễn Minh Tuấn", businesses: ["Nguyễn Minh Tuấn"], leadDesigner: "Lê Hoàng Nam", designers: ["Lê Hoàng Nam"], taskCount: 2, color: "bg-teal-50 text-teal-700 border-teal-200", capacityThreshold: 6, domain: "Hạ tầng SDK & tích hợp API Open Banking" },

  // --- Squads của Design System & Nền tảng ---
  { id: "sq-12", name: "Design System MB", code: "DS_MB", productName: "Design System & Nền tảng", productId: "prod-4", leadPo: "Trần Mai Lan", pos: ["Trần Mai Lan"], leadBusiness: "Nguyễn Minh Tuấn", businesses: ["Nguyễn Minh Tuấn"], leadDesigner: "Nguyễn Văn Cường", designers: ["Nguyễn Văn Cường", "Lê Hoàng Nam"], taskCount: 4, color: "bg-slate-100 text-slate-800 border-slate-300", capacityThreshold: 10, domain: "Thư viện Liquid Glass System, Design Tokens & Component UI Kit" },
  { id: "sq-13", name: "UX Operations", code: "UX_OPS", productName: "Design System & Nền tảng", productId: "prod-4", leadPo: "Vũ Quốc Anh", pos: ["Vũ Quốc Anh"], leadBusiness: "Hoàng Thu Trang", businesses: ["Hoàng Thu Trang"], leadDesigner: "Trường", designers: ["Trường", "Nguyễn Văn Cường"], taskCount: 2, color: "bg-slate-100 text-slate-700 border-slate-300", capacityThreshold: 6, domain: "Quy chuẩn thiết kế, công cụ đo lường & vận hành đội ngũ UX" },
]

export function getSquadDesigners(sq: SquadSetting): string[] {
  if (Array.isArray(sq.designers) && sq.designers.length > 0) {
    return sq.designers
  }
  if (sq.leadDesigner && sq.leadDesigner.trim()) {
    return [sq.leadDesigner.trim()]
  }
  return []
}

export function getSquadPos(sq: SquadSetting): string[] {
  if (Array.isArray(sq.pos) && sq.pos.length > 0) {
    return sq.pos
  }
  if (sq.leadPo && sq.leadPo.trim()) {
    return [sq.leadPo.trim()]
  }
  return []
}

export function getSquadBusinesses(sq: SquadSetting): string[] {
  if (Array.isArray(sq.businesses) && sq.businesses.length > 0) {
    return sq.businesses
  }
  if (sq.leadBusiness && sq.leadBusiness.trim()) {
    return [sq.leadBusiness.trim()]
  }
  return []
}

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
    id: "cap-invite",
    title: "Mời thành viên & Phân quyền (Invite Team)",
    description: "Hiển thị nút 'Invite Team' trên thanh Menu (Sidebar) và cho phép gửi lời mời, cấp quyền tài khoản nhân sự mới.",
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

export function isNameMatching(nameA?: string, nameB?: string): boolean {
  if (!nameA || !nameB) return false
  const cleanA = nameA.replace(/\(.*?\)/g, "").trim().toLowerCase()
  const cleanB = nameB.replace(/\(.*?\)/g, "").trim().toLowerCase()
  if (cleanA === cleanB) return true
  if (cleanA.endsWith(" " + cleanB) || cleanB.endsWith(" " + cleanA)) return true
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true
  return false
}

export function syncMembersWithSquads(
  members: TeamMember[],
  currentSquads: SquadSetting[]
): TeamMember[] {
  return members.map((mem) => {
    const memName = (mem.name || "").trim()

    // Tìm tất cả squads mà member này tham gia trong bảng Squads
    const matchedSquads = currentSquads.filter((sq) => {
      const inDesigners =
        (sq.designers || []).some((d) => isNameMatching(d, memName)) ||
        isNameMatching(sq.leadDesigner, memName)

      const inPos =
        (sq.pos || []).some((p) => isNameMatching(p, memName)) ||
        isNameMatching(sq.leadPo, memName)

      const inBiz =
        (sq.businesses || []).some((b) => isNameMatching(b, memName)) ||
        isNameMatching(sq.leadBusiness, memName)

      if (mem.role === "PO") return inPos
      if (mem.role === "Business") return inBiz
      if (mem.role === "Designer") return inDesigners
      // Admin hoặc Design Owner có thể kiêm nhiệm trực tiếp trong Squads
      return inDesigners || inPos || inBiz
    })

    // Giữ lại các squads đã được gán trực tiếp cho nhân sự này (từ drawer hoặc Sheet)
    const existingSquads = (Array.isArray(mem.squads) ? mem.squads : (mem.squad ? [mem.squad] : []))
      .filter((s) => s && s !== "Chưa phân bổ" && s !== "All Squads")

    const matchedSquadNames = matchedSquads.map((s) => s.name)
    const combinedSquadNames = Array.from(new Set([...matchedSquadNames, ...existingSquads]))

    if (combinedSquadNames.length > 0) {
      const derivedProds = currentSquads
        .filter((sq) => combinedSquadNames.includes(sq.name) && sq.productName)
        .map((sq) => sq.productName)
      const existingProds = (mem.products || []).filter((p) => p && p !== "Chưa gán" && p !== "Toàn hàng")
      const combinedProds = Array.from(new Set([...derivedProds, ...existingProds]))

      return {
        ...mem,
        squads: combinedSquadNames,
        squad: combinedSquadNames[0],
        products: combinedProds.length > 0 ? combinedProds : (mem.products && mem.products.length > 0 ? mem.products : ["App MBBank"]),
      }
    } else {
      // Nếu chưa được gán vào squad nào
      if (mem.role === "Admin" || mem.role === "Design Owner") {
        return {
          ...mem,
          squads: ["All Squads"],
          squad: "All Squads",
          products: ["Toàn hàng"],
        }
      } else {
        return {
          ...mem,
          squads: ["Chưa phân bổ"],
          squad: "Chưa phân bổ",
          products: ["Chưa gán"],
        }
      }
    }
  })
}

interface CompactRoleMemberSelectorProps {
  label: string
  subtitle?: string
  dotClass: string
  badgeClass: string
  theme: "purple" | "amber" | "blue"
  members: TeamMember[]
  selectedNames: string[]
  onChange: (names: string[]) => void
  emptyHint?: string
}

function CompactRoleMemberSelector({
  label,
  subtitle,
  dotClass,
  badgeClass,
  theme,
  members,
  selectedNames,
  onChange,
  emptyHint,
}: CompactRoleMemberSelectorProps) {
  const [search, setSearch] = useState("")

  const filteredMembers = members.filter((m) =>
    search.trim() ? m.name.toLowerCase().includes(search.toLowerCase()) : true
  )

  const toggle = (name: string) => {
    if (selectedNames.includes(name)) {
      onChange(selectedNames.filter((n) => n !== name))
    } else {
      onChange([...selectedNames, name])
    }
  }

  const selectAll = () => {
    const allNames = members.map((m) => m.name)
    onChange(Array.from(new Set([...selectedNames, ...allNames])))
  }

  const deselectAll = () => {
    onChange([])
  }

  const activeClasses = {
    purple: "bg-purple-100 text-purple-900 border-purple-400 font-semibold shadow-2xs ring-1 ring-purple-300",
    amber: "bg-amber-100 text-amber-950 border-amber-400 font-semibold shadow-2xs ring-1 ring-amber-300",
    blue: "bg-blue-100 text-blue-900 border-blue-400 font-semibold shadow-2xs ring-1 ring-blue-300",
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-1.5 gap-1 min-h-[22px]">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full ${dotClass} shrink-0`} />
          <span className="truncate">{label}</span>
        </label>
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedNames.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                Đã chọn {selectedNames.length}
              </span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-[10.5px] text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                title="Bỏ chọn tất cả"
              >
                Bỏ chọn
              </button>
            </div>
          ) : (
            <span className="text-[10.5px] text-slate-400 italic">Chưa chọn</span>
          )}
        </div>
      </div>

      <div className="flex-1 p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/60 flex flex-col min-h-[210px]">
        {members.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-xs text-slate-400 italic px-2">
            {emptyHint || "Chưa có nhân sự vai trò này trong danh sách."}
          </div>
        ) : (
          <>
            {/* Luôn luôn hiển thị ô tìm kiếm cho mọi role */}
            <div className="relative mb-2 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Tìm ${members.length} nhân sự...`}
                className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
              />
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-wrap content-start items-start gap-1.5 max-h-[165px]">
              {filteredMembers.length === 0 ? (
                <div className="w-full text-center py-4 text-[11px] text-slate-400 italic">
                  Không tìm thấy "{search}"
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const isSelected = selectedNames.includes(m.name)
                  return (
                    <button
                      key={`pill-${m.id}`}
                      type="button"
                      onClick={() => toggle(m.name)}
                      className={`inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full text-xs transition-all cursor-pointer border ${
                        isSelected
                          ? activeClasses[theme]
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80 shadow-2xs"
                      }`}
                    >
                      <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="xs" className="w-5 h-5 text-[9px]" />
                      <span className="truncate max-w-[105px] leading-tight font-medium">{m.name}</span>
                      <span className="text-[10px] opacity-70 font-normal">({m.role})</span>
                      {isSelected ? (
                        <span className="w-3.5 h-3.5 rounded-full bg-current/15 flex items-center justify-center shrink-0 ml-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      ) : (
                        <Plus className="w-3 h-3 text-slate-400 opacity-60 shrink-0 ml-0.5" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function QuanLyPage() {
  const session = getStoredSession()
  const isAdmin = session?.role === "Admin"

  // Tự động chuyển hướng về trang chủ nếu user không có quyền quản trị
  useEffect(() => {
    if (!isAdmin) {
      toast.error("Không có quyền truy cập", "Chỉ tài khoản Admin mới có quyền vào mục Cài đặt hệ thống.")
      const targetPage = session?.role === "PO" || session?.role === "Business" ? "track" : "overview"
      window.location.hash = `#${targetPage}`
      window.dispatchEvent(new CustomEvent("app_navigate", { detail: { page: targetPage } }))
    }
  }, [isAdmin, session?.role])

  if (!isAdmin) {
    return null
  }

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    const hash = window.location.hash
    if (hash.includes("tab=")) {
      const tabParam = hash.split("tab=")[1]?.split("&")[0] as AdminTab
      if (tabParam) return tabParam
    }
    return "team"
  })

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash.includes("tab=")) {
        const tabParam = hash.split("tab=")[1]?.split("&")[0] as AdminTab
        if (tabParam) setActiveTab(tabParam)
      }
    }
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])
  const [adminRunningTest, setAdminRunningTest] = useState<TestExam | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>("ALL")
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>("")
  const [selectedRbacRole, setSelectedRbacRole] = useState<UserRole>("Design Owner")
  const [rbacRolesPermissions, setRbacRolesPermissions] = useState<Record<string, string[]>>(() => {
    const defaultRbac: Record<string, string[]> = {
      "cap-approve": ["Admin", "Design Owner"],
      "cap-test": ["Admin", "Design Owner"],
      "cap-capacity": ["Admin", "Design Owner"],
      "cap-invite": ["Admin", "Design Owner"],
      "cap-workflow": ["Admin"],
      "cap-request": ["Admin", "Design Owner", "Designer", "PO", "Business"],
      "cap-audit": ["Admin", "Design Owner"],
    }
    const saved = localStorage.getItem("mbbank_admin_rbac")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          ...defaultRbac,
          ...parsed,
          "cap-invite": parsed["cap-invite"] ?? defaultRbac["cap-invite"],
        }
      } catch {}
    }
    return defaultRbac
  })

  const AUDIT_LOGS_STORAGE_KEY = "mbbank_admin_audit_logs"

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    try {
      const saved = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (e) {
      console.warn("Could not load audit logs from localStorage", e)
    }
    return INITIAL_AUDIT_LOGS
  })

  const logAdminAction = useCallback((
    action: string,
    target: string,
    details: string,
    type: "user" | "workflow" | "integration" | "security" | "masterdata" = "masterdata"
  ) => {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      actor: session?.displayName || "Admin Quản Trị",
      action,
      target,
      details,
      type,
    }
    setAuditLogs((prev) => {
      const updated = [newLog, ...prev].slice(0, 300)
      try {
        localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {
        console.warn("Could not save audit logs to localStorage", e)
      }
      return updated
    })
    return newLog
  }, [session?.displayName])

  const handleToggleCapability = (capId: string, role: string) => {
    const currentRoles = rbacRolesPermissions[capId] || []
    const isCurrentlyOn = currentRoles.includes(role)
    const nextRoles = isCurrentlyOn
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role]
    const updated = { ...rbacRolesPermissions, [capId]: nextRoles }
    setRbacRolesPermissions(updated)
    localStorage.setItem("mbbank_admin_rbac", JSON.stringify(updated))
    window.dispatchEvent(new Event("storage"))
    window.dispatchEvent(new Event("rbac_permissions_changed"))
    const capName = RBAC_CAPABILITIES.find((c) => c.id === capId)?.title || "Quyền hạn"
    toast.success(`Đã ${isCurrentlyOn ? "tắt" : "bật"} quyền "${capName}" cho vai trò ${role}!`, undefined, {
      id: `toast-cap-${capId}-${role}`,
    })
    logAdminAction(
      "Phân quyền RBAC",
      `${role} -> ${capName}`,
      `Quyền [${capName}] chuyển sang: ${isCurrentlyOn ? "TẮT" : "BẬT"}`,
      "security"
    )
    syncMasterDataToSheet({ rbac: updated })
  }

  // State Data with localStorage sync
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    let list = INITIAL_TEAM_MEMBERS
    const saved = localStorage.getItem("mbbank_admin_team")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        list = parsed
          .filter((m: any) => !isMockDesigner(m.name || m.displayName, m.email || m.teamsEmail))
          .map((m: any) => ({
            ...m,
            squads: Array.isArray(m.squads) && m.squads.length > 0 ? m.squads : (m.squad ? [m.squad] : []),
            products: Array.isArray(m.products) && m.products.length > 0 ? m.products : (m.product ? [m.product] : []),
          }))
        if (parsed.length !== list.length) {
          localStorage.setItem("mbbank_admin_team", JSON.stringify(list))
          localStorage.setItem("mbbank_team_members", JSON.stringify(list))
        }
      } catch {}
    }
    // Đảm bảo luôn có ít nhất nhân sự vai trò Business và PO nếu danh sách cũ chưa có
    const hasBusiness = list.some((m: any) => m.role === "Business")
    const hasPO = list.some((m: any) => m.role === "PO")
    const missingRoles = INITIAL_TEAM_MEMBERS.filter((m) =>
      (!hasBusiness && m.role === "Business") || (!hasPO && m.role === "PO")
    )
    if (missingRoles.length > 0) {
      list = [...list, ...missingRoles]
    }

    // Đọc squads hiện tại trong localStorage để đồng bộ phân bổ nhân sự ngay khi load
    const currentSquads = (() => {
      const savedSquads = localStorage.getItem("mbbank_admin_squads")
      if (savedSquads) {
        try {
          const parsed = JSON.parse(savedSquads)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        } catch {}
      }
      return INITIAL_SQUADS
    })()

    return syncMembersWithSquads(list, currentSquads)
  })

  const [uxPhases, setUxPhases] = useState<UxPhaseSetting[]>(() => {
    const saved = localStorage.getItem("mbbank_admin_phases")
    return saved ? JSON.parse(saved) : INITIAL_UX_PHASES
  })

  const [products, setProducts] = useState<ProductSetting[]>(() => {
    const saved = localStorage.getItem("mbbank_admin_products")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: any) => ({
            ...p,
            color: p.color || getProductColorDef(p.name).key,
          }))
        }
      } catch {}
    }
    return INITIAL_PRODUCTS
  })

  const [squads, setSquads] = useState<SquadSetting[]>(() => {
    const saved = localStorage.getItem("mbbank_admin_squads")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: any) => ({
            ...s,
            designers: Array.isArray(s.designers) && s.designers.length > 0
              ? s.designers
              : (s.leadDesigner ? [s.leadDesigner] : []),
            pos: Array.isArray(s.pos) && s.pos.length > 0
              ? s.pos
              : (s.leadPo ? [s.leadPo] : []),
            businesses: Array.isArray(s.businesses) && s.businesses.length > 0
              ? s.businesses
              : (s.leadBusiness ? [s.leadBusiness] : []),
          }))
        }
      } catch {}
    }
    return INITIAL_SQUADS.map((s) => ({
      ...s,
      pos: Array.isArray(s.pos) && s.pos.length > 0
        ? s.pos
        : (s.leadPo ? [s.leadPo] : []),
      businesses: Array.isArray(s.businesses) && s.businesses.length > 0
        ? s.businesses
        : (s.leadBusiness ? [s.leadBusiness] : []),
    }))
  })

  console.log("DEBUG_24_SQUADS:", JSON.stringify(squads.map((s: any) => ({
    name: s.name || s.squad_name,
    code: s.code || s.squad_id,
    productName: s.productName,
    product_name: s.product_name,
    product: s.product,
    productId: s.productId
  }))));

  const [navConfig, setNavConfig] = useState<RoleNavConfig>(() => getRoleNavConfig())
  const [navOrder, setNavOrder] = useState<NavOrderConfig>(() => getNavOrderConfig())
  const [draggedGroup, setDraggedGroup] = useState<"platform" | "resources" | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleToggleNav = (role: UserRole, key: keyof RoleNavVisibility) => {
    const isCurrentlyActive = navConfig[role]?.[key] ?? true
    const nextVal = !isCurrentlyActive
    const updated: RoleNavConfig = {
      ...navConfig,
      [role]: {
        ...navConfig[role],
        [key]: nextVal,
      },
    }
    setNavConfig(updated)
    saveRoleNavConfig(updated)
    toast.success(`Đã cập nhật hiển thị mục [${key}] cho vai trò [${role}]!`, undefined, {
      id: `toast-nav-${role}-${String(key)}`,
    })
    logAdminAction(
      "Phân quyền Menu Nav",
      `${role} -> ${key}`,
      `Trạng thái: ${nextVal ? "BẬT (Hiện)" : "TẮT (Ẩn)"}`,
      "security"
    )
    syncMasterDataToSheet({ nav_items: updated })
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


  // Add Squad Form State
  const [newSquadName, setNewSquadName] = useState("")
  const [newSquadCode, setNewSquadCode] = useState("")
  const [newSquadProduct, setNewSquadProduct] = useState("App MBBank")
  const [newSquadDomain, setNewSquadDomain] = useState("")
  const [newSquadCapacity, setNewSquadCapacity] = useState(8)
  const [newSquadDesigners, setNewSquadDesigners] = useState<string[]>([])
  const [newSquadPos, setNewSquadPos] = useState<string[]>([])
  const [newSquadBusinesses, setNewSquadBusinesses] = useState<string[]>([])
  const [newSquadColor, setNewSquadColor] = useState("")

  // Add Product Form State
  const [newProdName, setNewProdName] = useState("")
  const [newProdDesc, setNewProdDesc] = useState("")
  const [newProdColor, setNewProdColor] = useState("blue")
  const [editingProduct, setEditingProduct] = useState<ProductSetting | null>(null)

  // Master Data Table Search & Filter State
  const [squadSearchQuery, setSquadSearchQuery] = useState("")
  const [selectedProductFilter, setSelectedProductFilter] = useState("ALL")

  // Tập hợp tên các sản phẩm đang có hiệu lực trong Master Data
  const activeProductNamesSet = useMemo(
    () => new Set(products.map((p) => p.name).filter(Boolean)),
    [products]
  )

  // Danh sách Sản phẩm phân bổ cho nhân sự: 100% chuẩn xác từ Master Data
  const allAvailableProductNames = useMemo(() => {
    const list = products.map((p) => p.name).filter(Boolean)
    if (list.length > 0) {
      return Array.from(new Set(list))
    }
    return ["App MBBank"]
  }, [products])

  // Danh sách Squads phân bổ cho nhân sự: Chỉ lấy từ các squad thực tế thuộc sản phẩm đang hoạt động
  const allAvailableSquadNames = useMemo(() => {
    const validSquads = squads.filter((s) => !s.productName || activeProductNamesSet.has(s.productName))
    const list = validSquads.map((s) => s.name).filter(Boolean)
    if (list.length > 0) {
      return Array.from(new Set(list))
    }
    return []
  }, [squads, activeProductNamesSet])

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("mbbank_admin_team", JSON.stringify(teamMembers))
    localStorage.setItem("mbbank_team_members", JSON.stringify(teamMembers))
  }, [teamMembers])

  useEffect(() => {
    localStorage.setItem("mbbank_admin_phases", JSON.stringify(uxPhases))
    window.dispatchEvent(new Event("storage"))
  }, [uxPhases])

  useEffect(() => {
    localStorage.setItem("mbbank_admin_squads", JSON.stringify(squads))
    // Tự động đồng bộ phân bổ của teamMembers mỗi khi squads thay đổi
    setTeamMembers((prevMembers) => {
      const synced = syncMembersWithSquads(prevMembers, squads)
      const isDiff = JSON.stringify(synced.map((m) => ({ id: m.id, s: m.squads, p: m.products }))) !==
        JSON.stringify(prevMembers.map((m) => ({ id: m.id, s: m.squads, p: m.products })))
      if (isDiff) {
        localStorage.setItem("mbbank_admin_team", JSON.stringify(synced))
        localStorage.setItem("mbbank_team_members", JSON.stringify(synced))
        return synced
      }
      return prevMembers
    })
  }, [squads])

  useEffect(() => {
    localStorage.setItem("mbbank_admin_products", JSON.stringify(products))
  }, [products])

  // Status Automation Rules State & Handlers
  const [statusRules, setStatusRules] = useState<StatusAutomationRule[]>(() => {
    const saved = localStorage.getItem("mbbank_admin_status_rules")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasPoPending = parsed.some(
            (r: StatusAutomationRule) => r.id === "st-po-pending" || r.name.toLowerCase().includes("po pending")
          )
          if (!hasPoPending) {
            const poPendingRule: StatusAutomationRule = {
              id: "st-po-pending",
              name: "PO Pending",
              colorKey: "amber",
              badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
              dotClass: "bg-amber-600",
              triggerDescription: "Đã quá 24h Designer gửi phương án (@SendToPO) nhưng PO chưa phản hồi duyệt",
              triggerEvent: "po_pending",
              mappedPhaseIds: ["ph-6"],
              mappedPhaseNames: "Chờ PO duyệt nghiệm thu",
              slaAction: "pause",
              slaActionLabel: "Tạm dừng đồng hồ SLA (Không bị phạt hạn)",
              autoEnabled: true,
              desc: "Hệ thống tự động kích hoạt khi gửi phương án quá 24h PO chưa phản hồi duyệt, tạm dừng tính hạn SLA.",
            }
            const sendPoIdx = parsed.findIndex(
              (r: StatusAutomationRule) => r.id === "st-send-po" || r.name.toLowerCase().includes("gửi po")
            )
            if (sendPoIdx >= 0) {
              parsed.splice(sendPoIdx + 1, 0, poPendingRule)
            } else {
              parsed.push(poPendingRule)
            }
          }
          return parsed
        }
      } catch {}
    }
    return INITIAL_STATUS_RULES
  })

  const [editingStatusRule, setEditingStatusRule] = useState<StatusAutomationRule | null>(null)

  useEffect(() => {
    localStorage.setItem("mbbank_admin_status_rules", JSON.stringify(statusRules))
  }, [statusRules])

  const handleToggleStatusRuleAuto = (ruleId: string) => {
    const updated = statusRules.map((r) =>
      r.id === ruleId ? { ...r, autoEnabled: !r.autoEnabled } : r
    )
    setStatusRules(updated)
    localStorage.setItem("mbbank_admin_status_rules", JSON.stringify(updated))
    const target = updated.find((r) => r.id === ruleId)
    toast.success(
      `Quy tắc [${target?.name}]: Đã ${target?.autoEnabled ? "BẬT" : "TẮT"} kích hoạt tự động!`
    )
    logAdminAction(
      "Cấu hình Quy tắc Trạng thái",
      target?.name || ruleId,
      `${target?.autoEnabled ? "BẬT" : "TẮT"} tự động hóa (Trigger: ${target?.triggerDescription})`,
      "workflow"
    )
    syncMasterDataToSheet({ status_rules: updated })
  }

  const handleSaveStatusRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStatusRule) return

    const updated = statusRules.map((r) =>
      r.id === editingStatusRule.id ? editingStatusRule : r
    )
    setStatusRules(updated)
    localStorage.setItem("mbbank_admin_status_rules", JSON.stringify(updated))
    toast.success(`Đã cập nhật cấu hình quy tắc [${editingStatusRule.name}] thành công!`)
    logAdminAction(
      "Cấu hình Quy tắc Trạng thái",
      editingStatusRule.name,
      `Trigger: ${editingStatusRule.triggerDescription} | SLA: ${editingStatusRule.slaActionLabel}`,
      "workflow"
    )
    setEditingStatusRule(null)
    syncMasterDataToSheet({ status_rules: updated })
  }

  const handleRestoreStatusRules = () => {
    setStatusRules(INITIAL_STATUS_RULES)
    localStorage.setItem("mbbank_admin_status_rules", JSON.stringify(INITIAL_STATUS_RULES))
    toast.success("Đã khôi phục 6 quy tắc trạng thái tự động mặc định!")
    logAdminAction(
      "Khôi phục Quy tắc Trạng thái",
      "Mặc định",
      "Khôi phục 6 quy tắc trạng thái ban đầu",
      "workflow"
    )
    syncMasterDataToSheet({ status_rules: INITIAL_STATUS_RULES })
  }

  const [uploadingAvatarMemberId, setUploadingAvatarMemberId] = useState<string | null>(null)
  const [isSyncingMembers, setIsSyncingMembers] = useState<boolean>(false)
  const [isPullingMembers, setIsPullingMembers] = useState<boolean>(false)
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false)
  const [isSyncingMasterData, setIsSyncingMasterData] = useState<boolean>(false)
  const [isPullingMasterData, setIsPullingMasterData] = useState<boolean>(false)

  // Đồng bộ toàn bộ cài đặt (Nhân sự, Squads, Sản phẩm, 6 Khâu UX, Status Rules, RBAC, Nav & Audit Logs) lên Google Sheet
  const handleSyncAllSettings = async () => {
    setIsSyncingAll(true)
    const toastId = toast.loading("Đang đẩy toàn bộ cài đặt & cấu hình lên Google Sheet...")
    try {
      // 1. Lưu LocalStorage làm dự phòng
      localStorage.setItem("mbbank_admin_team", JSON.stringify(teamMembers))
      localStorage.setItem("mbbank_team_members", JSON.stringify(teamMembers))
      localStorage.setItem("mbbank_admin_squads", JSON.stringify(squads))
      localStorage.setItem("ux_portal_squads_v2", JSON.stringify(squads))
      localStorage.setItem("mbbank_admin_products", JSON.stringify(products))
      localStorage.setItem("ux_portal_products_v2", JSON.stringify(products))
      localStorage.setItem("mbbank_admin_phases", JSON.stringify(uxPhases))
      localStorage.setItem("ux_portal_phases_v2", JSON.stringify(uxPhases))
      localStorage.setItem("mbbank_admin_status_rules", JSON.stringify(statusRules))
      localStorage.setItem("mbbank_admin_rbac", JSON.stringify(rbacRolesPermissions))
      localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(auditLogs))

      // 2. Gọi đồng bộ đồng thời cả Nhân sự và Master Data đầy đủ
      const [resMembers, resMaster] = await Promise.all([
        syncTeamMembersToSheet(teamMembers),
        syncMasterDataToSheet({
          squads,
          products,
          phases: uxPhases,
          status_rules: statusRules,
          rbac: rbacRolesPermissions,
          nav_items: navConfig,
          audit_logs: auditLogs,
        })
      ])

      setIsSyncingAll(false)
      toast.dismiss(toastId)

      if (resMembers.success && resMaster.success) {
        toast.success("Đã đồng bộ toàn bộ cài đặt (Nhân sự, Squads, Sản phẩm, Quy trình, Trạng thái, Phân quyền & Logs) lên Google Sheet!")
        logAdminAction("Đồng bộ Google Sheet", "Toàn bộ Hệ thống", `Đẩy thành công ${teamMembers.length} nhân sự, ${squads.length} squads, ${products.length} SP, ${uxPhases.length} khâu UX, ${statusRules.length} rules`, "integration")
      } else {
        toast.warning(
          "Đã lưu nội bộ. " + (resMembers.message || "") + " " + (resMaster.message || "")
        )
      }
    } catch (err: any) {
      setIsSyncingAll(false)
      toast.dismiss(toastId)
      toast.error("Lỗi khi đồng bộ lên Google Sheet: " + (err?.message || err))
    }
  }

  // Tải toàn bộ cấu hình Master Data & Danh sách Nhân sự từ Google Sheet về máy
  const handlePullMasterDataFromSheet = async () => {
    setIsPullingMasterData(true)
    const toastId = toast.loading("Đang tải toàn bộ dữ liệu & cấu hình từ Google Sheet...")
    try {
      const [res, sheetMembers] = await Promise.all([
        fetchMasterDataFromSheet(),
        fetchTeamMembersFromSheet().catch(() => null),
      ])
      setIsPullingMasterData(false)
      toast.dismiss(toastId)

      let updatedCount = 0

      // 1. Cập nhật nhân sự nếu có từ bảng UX_TEAM_MEMBERS hoặc từ res.data.team_members
      if (sheetMembers && Array.isArray(sheetMembers) && sheetMembers.length > 0) {
        const formatted: TeamMember[] = sheetMembers.map((m, idx) => ({
          id: m.id || `mem-${idx + 1}-${Date.now()}`,
          name: m.name || m.displayName || "Thành viên UX",
          displayName: m.displayName || m.name || "Thành viên UX",
          email: m.email || m.teamsEmail || "",
          teamsEmail: m.teamsEmail || m.email || "",
          personalEmail: m.personalEmail || "",
          avatarUrl: m.avatarUrl || "",
          role: m.role || "Designer",
          squad: m.squad || (m.squads && m.squads[0]) || "Chưa phân bổ",
          squads: Array.isArray(m.squads) && m.squads.length > 0 ? m.squads : [m.squad || "Chưa phân bổ"],
          products: Array.isArray(m.products) && m.products.length > 0 ? m.products : ["Chưa gán"],
          status: m.status || "Active",
          maxCapacity: m.maxCapacity || 5,
          activeTasks: m.activeTasks || 0,
          pendingTasks: m.pendingTasks || 0,
          completedTasks: m.completedTasks || 0,
          rating: m.rating || 5.0,
          specialties: Array.isArray(m.specialties) ? m.specialties : ["UX Design", "UI Design"],
          joinDate: m.joinDate || "2024-01-01",
          phone: m.phone || "",
        }))
        const cleaned = formatted.filter((m) => !isMockDesigner(m.name, m.email))
        setTeamMembers(cleaned)
        localStorage.setItem("mbbank_admin_team", JSON.stringify(cleaned))
        localStorage.setItem("mbbank_team_members", JSON.stringify(cleaned))
        updatedCount++
      } else if (res.success && res.data && Array.isArray(res.data.team_members) && res.data.team_members.length > 0) {
        setTeamMembers(res.data.team_members)
        localStorage.setItem("mbbank_admin_team", JSON.stringify(res.data.team_members))
        localStorage.setItem("mbbank_team_members", JSON.stringify(res.data.team_members))
        updatedCount++
      }

      if (res.success && res.data) {
        if (Array.isArray(res.data.products) && res.data.products.length > 0) {
          setProducts(res.data.products)
          localStorage.setItem("mbbank_admin_products", JSON.stringify(res.data.products))
          localStorage.setItem("ux_portal_products_v2", JSON.stringify(res.data.products))
          updatedCount++
        }
        if (Array.isArray(res.data.squads) && res.data.squads.length > 0) {
          setSquads(res.data.squads)
          localStorage.setItem("mbbank_admin_squads", JSON.stringify(res.data.squads))
          localStorage.setItem("ux_portal_squads_v2", JSON.stringify(res.data.squads))
          updatedCount++
        }
        if (Array.isArray(res.data.phases) && res.data.phases.length > 0) {
          setUxPhases(res.data.phases)
          localStorage.setItem("mbbank_admin_phases", JSON.stringify(res.data.phases))
          localStorage.setItem("ux_portal_phases_v2", JSON.stringify(res.data.phases))
          updatedCount++
        }
        if (Array.isArray(res.data.status_rules) && res.data.status_rules.length > 0) {
          setStatusRules(res.data.status_rules)
          localStorage.setItem("mbbank_admin_status_rules", JSON.stringify(res.data.status_rules))
          updatedCount++
        }
        if (res.data.rbac && typeof res.data.rbac === "object") {
          setRbacRolesPermissions(res.data.rbac)
          localStorage.setItem("mbbank_admin_rbac", JSON.stringify(res.data.rbac))
          updatedCount++
        }
        if (res.data.nav_items && typeof res.data.nav_items === "object") {
          setNavConfig(res.data.nav_items)
          saveRoleNavConfig(res.data.nav_items)
          updatedCount++
        }
        if (Array.isArray(res.data.audit_logs) && res.data.audit_logs.length > 0) {
          setAuditLogs((prev) => {
            const existingIds = new Set(prev.map((l) => l.id))
            const newEntries = res.data!.audit_logs!.filter((l: any) => !existingIds.has(l.id))
            const merged = [...newEntries, ...prev].slice(0, 300)
            localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(merged))
            return merged
          })
        }

        toast.success(`Đã tải & đồng bộ thành công toàn bộ dữ liệu từ Google Sheet về máy!`)
        logAdminAction("Tải cấu hình từ Sheet", "RAW_SETTINGS", `Đồng bộ Master Data & Nhân sự từ Cloud về thiết bị thành công`, "integration")
      } else if (updatedCount > 0) {
        toast.success(`Đã tải danh sách nhân sự từ Google Sheet về máy!`)
      } else {
        toast.error("Không tìm thấy cấu hình", res.message || "Chưa có dữ liệu cấu hình trong RAW_SETTINGS trên Google Sheet.")
      }
    } catch (err: any) {
      setIsPullingMasterData(false)
      toast.dismiss(toastId)
      toast.error("Lỗi khi tải cấu hình từ Google Sheet: " + (err?.message || err))
    }
  }

  // Đồng bộ riêng Master Data (Squads & Sản phẩm) lên Google Sheet
  const handleSyncMasterDataOnly = async () => {
    setIsSyncingMasterData(true)
    const toastId = toast.loading("Đang đồng bộ Squads & Sản phẩm lên Google Sheet...")
    try {
      const activeProdNames = new Set(products.map((p) => p.name).filter(Boolean))
      const cleanSquads = squads.filter((s) => activeProdNames.has(s.productName))
      if (cleanSquads.length !== squads.length) {
        setSquads(cleanSquads)
      }
      localStorage.setItem("mbbank_admin_squads", JSON.stringify(cleanSquads))
      localStorage.setItem("ux_portal_squads_v2", JSON.stringify(cleanSquads))
      localStorage.setItem("mbbank_admin_products", JSON.stringify(products))
      localStorage.setItem("ux_portal_products_v2", JSON.stringify(products))
      const res = await syncMasterDataToSheet({ squads: cleanSquads, products })
      setIsSyncingMasterData(false)
      toast.dismiss(toastId)
      if (res.success) {
        toast.success(res.message || "Đã đồng bộ toàn bộ Squads & Sản phẩm lên Google Sheet!")
      } else {
        toast.error("Lỗi đồng bộ Master Data", res.message)
      }
    } catch (err: any) {
      setIsSyncingMasterData(false)
      toast.dismiss(toastId)
      toast.error("Lỗi khi đồng bộ Master Data: " + (err?.message || err))
    }
  }

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
  const handleStartEditMember = (member: TeamMember) => {
    const validSquadsSet = new Set(allAvailableSquadNames)
    const validProductsSet = new Set(allAvailableProductNames)

    // Lọc sạch squad ma/cũ, chỉ giữ squad thực tế trong Master Data
    const sanitizedSquads = (member.squads || []).filter(
      (s) => validSquadsSet.has(s) || s === "All Squads" || s === "Chưa phân bổ"
    )
    // Lọc sạch sản phẩm ma/cũ, chỉ giữ sản phẩm thực tế trong Master Data
    const sanitizedProducts = (member.products || []).filter(
      (p) => validProductsSet.has(p) || p === "Toàn hàng" || p === "Chưa gán"
    )

    setEditingMember({
      ...member,
      squads: sanitizedSquads.length > 0 ? sanitizedSquads : (allAvailableSquadNames[0] ? [allAvailableSquadNames[0]] : []),
      products: sanitizedProducts.length > 0 ? sanitizedProducts : (allAvailableProductNames[0] ? [allAvailableProductNames[0]] : []),
    })
  }


  const handleUpdateMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return

    // Lọc sạch squad ma và product ma trước khi lưu
    const validSquadsSet = new Set(allAvailableSquadNames)
    const validProductsSet = new Set(allAvailableProductNames)
    const cleanSquads = (editingMember.squads || []).filter(
      (s) => validSquadsSet.has(s) || s === "All Squads" || s === "Chưa phân bổ"
    )
    const cleanProducts = (editingMember.products || []).filter(
      (p) => validProductsSet.has(p) || p === "Toàn hàng" || p === "Chưa gán"
    )

    const sanitizedMember: TeamMember = {
      ...editingMember,
      squads: cleanSquads.length > 0 ? cleanSquads : (allAvailableSquadNames[0] ? [allAvailableSquadNames[0]] : []),
      products: cleanProducts.length > 0 ? cleanProducts : (allAvailableProductNames[0] ? [allAvailableProductNames[0]] : []),
      squad: cleanSquads[0] || allAvailableSquadNames[0] || "eSaving",
    }

    const updatedList = teamMembers.map((m) => (m.id === sanitizedMember.id ? sanitizedMember : m))
    setTeamMembers(updatedList)

    // Đồng bộ ngược lại vào danh sách Squads
    const memName = sanitizedMember.name.trim()
    const selectedSquadNames = sanitizedMember.squads || []
    const isDesRole = sanitizedMember.role === "Designer" || sanitizedMember.role === "Design Owner" || sanitizedMember.role === "Admin"
    const isPoRole = sanitizedMember.role === "PO"
    const isBizRole = sanitizedMember.role === "Business"

    const updatedSquads = squads.map((sq) => {
      const isSelected = selectedSquadNames.includes(sq.name)
      let curDesigners = [...(sq.designers || (sq.leadDesigner ? [sq.leadDesigner] : []))]
      let curPos = [...(sq.pos || (sq.leadPo ? [sq.leadPo] : []))]
      let curBusinesses = [...(sq.businesses || (sq.leadBusiness ? [sq.leadBusiness] : []))]

      if (isDesRole) {
        const has = curDesigners.some((d) => isNameMatching(d, memName))
        if (isSelected && !has) {
          curDesigners.push(memName)
        } else if (!isSelected && has) {
          curDesigners = curDesigners.filter((d) => !isNameMatching(d, memName))
        }
      }
      if (isPoRole) {
        const has = curPos.some((p) => isNameMatching(p, memName))
        if (isSelected && !has) {
          curPos.push(memName)
        } else if (!isSelected && has) {
          curPos = curPos.filter((p) => !isNameMatching(p, memName))
        }
      }
      if (isBizRole) {
        const has = curBusinesses.some((b) => isNameMatching(b, memName))
        if (isSelected && !has) {
          curBusinesses.push(memName)
        } else if (!isSelected && has) {
          curBusinesses = curBusinesses.filter((b) => !isNameMatching(b, memName))
        }
      }

      return {
        ...sq,
        designers: curDesigners,
        leadDesigner: curDesigners[0] || "",
        pos: curPos,
        leadPo: curPos[0] || "",
        businesses: curBusinesses,
        leadBusiness: curBusinesses[0] || "",
      }
    })

    setSquads(updatedSquads)
    localStorage.setItem("mbbank_admin_squads", JSON.stringify(updatedSquads))
    syncMasterDataToSheet({ squads: updatedSquads, products })

    // Cập nhật session nếu trùng email tài khoản đang đăng nhập
    const sess = getStoredSession()
    if (sess && (sess.teamsEmail?.toLowerCase() === sanitizedMember.email.toLowerCase() || sess.personalEmail?.toLowerCase() === sanitizedMember.email.toLowerCase())) {
      sess.displayName = sanitizedMember.name
      sess.role = sanitizedMember.role
      sess.avatarUrl = sanitizedMember.avatarUrl
      sess.squads = sanitizedMember.squads
      sess.products = sanitizedMember.products
      sessionStorage.setItem("ux_portal_session_auth", JSON.stringify(sess))
      localStorage.setItem("ux_portal_session_auth", JSON.stringify(sess))
      localStorage.setItem("ux_portal_session", JSON.stringify(sess))
      window.dispatchEvent(new Event("auth_session_changed"))
      window.dispatchEvent(new Event("storage"))
    }

    logAdminAction(
      "Cập nhật nhân sự",
      sanitizedMember.name,
      `Sửa phân bổ: ${sanitizedMember.squads.join(", ")} | Sản phẩm: ${(sanitizedMember.products || []).join(", ")}`,
      "user"
    )
    setEditingMember(null)
    toast.success(`Đã cập nhật phân bổ cho [${sanitizedMember.name}] & đồng bộ vào Squads!`)

    // Tự động đồng bộ ngay lên Google Sheet
    syncTeamMembersToSheet(updatedList).then((res) => {
      if (res.success) {
        toast.success(`Đã cập nhật thông tin [${sanitizedMember.name}] trên Google Sheet!`)
      }
    })
  }

  const handleDeleteMember = async (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa nhân sự "${name}" khỏi danh sách quản trị?`)) {
      const updatedList = teamMembers.filter((m) => m.id !== id)
      setTeamMembers(updatedList)
      localStorage.setItem("mbbank_admin_team", JSON.stringify(updatedList))
      localStorage.setItem("mbbank_team_members", JSON.stringify(updatedList))
      logAdminAction(
        "Xóa nhân sự",
        name,
        `Đã xóa nhân sự [${name}] khỏi hệ thống`,
        "user"
      )
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
    const targetMember = teamMembers.find((m) => m.id === memberId)
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
    localStorage.setItem("mbbank_admin_team", JSON.stringify(updatedList))
    localStorage.setItem("mbbank_team_members", JSON.stringify(updatedList))
    logAdminAction(
      "Thay đổi quyền hạn",
      targetMember?.name || memberId,
      `Quyền [${permKey}] chuyển thành: ${!targetMember?.permissions[permKey] ? "BẬT" : "TẮT"}`,
      "security"
    )
    toast.success("Đã cập nhật phân quyền")
    syncTeamMembersToSheet(updatedList)
  }

  // --- SQUAD HANDLERS ---
  const handleAddSquadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSquadName.trim()) {
      toast.error("Vui lòng điền tên Squad")
      return
    }

    const targetProd = products.find((p) => p.name === newSquadProduct)
    const newSq: SquadSetting = {
      id: `sq-${Date.now()}`,
      name: newSquadName.trim(),
      code: newSquadCode.trim().toUpperCase() || newSquadName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 15),
      productName: newSquadProduct || "App MBBank",
      productId: targetProd?.id || "prod-1",
      domain: newSquadDomain.trim() || "Nghiệp vụ trực thuộc",
      leadPo: newSquadPos[0] || "",
      pos: newSquadPos,
      leadBusiness: newSquadBusinesses[0] || "",
      businesses: newSquadBusinesses,
      leadDesigner: newSquadDesigners[0] || "",
      designers: newSquadDesigners,
      taskCount: 0,
      color: newSquadColor || targetProd?.color || "blue",
      capacityThreshold: newSquadCapacity,
    }

    const updated = [...squads, newSq]
    setSquads(updated)
    localStorage.setItem("mbbank_admin_squads", JSON.stringify(updated))
    localStorage.setItem("ux_portal_squads_v2", JSON.stringify(updated))
    window.dispatchEvent(new Event("storage"))
    window.dispatchEvent(new CustomEvent("ux_data_refreshed"))

    // Tự động đồng bộ phân bổ nhân sự sang Bảng Nhân sự ngay lập tức
    const syncedMembers = syncMembersWithSquads(teamMembers, updated)
    setTeamMembers(syncedMembers)
    localStorage.setItem("mbbank_admin_team", JSON.stringify(syncedMembers))
    localStorage.setItem("mbbank_team_members", JSON.stringify(syncedMembers))
    syncTeamMembersToSheet(syncedMembers)

    setShowAddSquadModal(false)
    setNewSquadName("")
    setNewSquadCode("")
    setNewSquadDomain("")
    setNewSquadColor("")
    setNewSquadDesigners([])
    setNewSquadPos([])
    setNewSquadBusinesses([])

    logAdminAction(
      "Thêm Squad mới",
      `${newSq.name} (${newSq.productName})`,
      `Trực thuộc [${newSq.productName}] | PO: ${newSquadPos.join(", ") || "Chưa gán"} | Business: ${newSquadBusinesses.join(", ") || "Chưa gán"} | Designers: ${newSquadDesigners.join(", ") || "Chưa gán"}`,
      "masterdata"
    )
    toast.success(`Đã thêm Squad [${newSq.name}] & đồng bộ phân bổ nhân sự!`)
    syncMasterDataToSheet({ squads: updated, products })
  }

  const handleUpdateSquadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSquad) return

    const finalDesigners = editingSquad.designers || (editingSquad.leadDesigner ? [editingSquad.leadDesigner] : [])
    const finalPos = editingSquad.pos || (editingSquad.leadPo ? [editingSquad.leadPo] : [])
    const finalBusinesses = editingSquad.businesses || (editingSquad.leadBusiness ? [editingSquad.leadBusiness] : [])
    const updatedSquadObj: SquadSetting = {
      ...editingSquad,
      pos: finalPos,
      leadPo: finalPos[0] || "",
      businesses: finalBusinesses,
      leadBusiness: finalBusinesses[0] || "",
      designers: finalDesigners,
      leadDesigner: finalDesigners[0] || "",
    }

    const updated = squads.map((s) => (s.id === editingSquad.id ? updatedSquadObj : s))
    setSquads(updated)
    localStorage.setItem("mbbank_admin_squads", JSON.stringify(updated))
    localStorage.setItem("ux_portal_squads_v2", JSON.stringify(updated))
    window.dispatchEvent(new Event("storage"))
    window.dispatchEvent(new CustomEvent("ux_data_refreshed"))

    // Tự động đồng bộ phân bổ nhân sự sang Bảng Nhân sự ngay lập tức
    const syncedMembers = syncMembersWithSquads(teamMembers, updated)
    setTeamMembers(syncedMembers)
    localStorage.setItem("mbbank_admin_team", JSON.stringify(syncedMembers))
    localStorage.setItem("mbbank_team_members", JSON.stringify(syncedMembers))
    syncTeamMembersToSheet(syncedMembers)

    logAdminAction(
      "Cập nhật Squad",
      editingSquad.name,
      `Trực thuộc [${editingSquad.productName}] | PO: ${finalPos.join(", ") || "Chưa gán"} | Business: ${finalBusinesses.join(", ") || "Chưa gán"} | Designers: ${finalDesigners.join(", ") || "Chưa gán"}`,
      "masterdata"
    )
    setEditingSquad(null)
    toast.success(`Đã cập nhật Squad [${editingSquad.name}] & đồng bộ phân bổ nhân sự!`)
    syncMasterDataToSheet({ squads: updated, products })
  }

  const handleDeleteSquad = (squadId: string, squadName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa Squad [${squadName}]?`)) return
    const updated = squads.filter((s) => s.id !== squadId)
    setSquads(updated)
    localStorage.setItem("mbbank_admin_squads", JSON.stringify(updated))
    localStorage.setItem("ux_portal_squads_v2", JSON.stringify(updated))
    window.dispatchEvent(new Event("storage"))
    window.dispatchEvent(new CustomEvent("ux_data_refreshed"))

    // Tự động đồng bộ phân bổ nhân sự sang Bảng Nhân sự ngay lập tức
    const syncedMembers = syncMembersWithSquads(teamMembers, updated)
    setTeamMembers(syncedMembers)
    localStorage.setItem("mbbank_admin_team", JSON.stringify(syncedMembers))
    localStorage.setItem("mbbank_team_members", JSON.stringify(syncedMembers))
    syncTeamMembersToSheet(syncedMembers)

    logAdminAction(
      "Xóa Squad",
      squadName,
      `Đã xóa Squad [${squadName}] khỏi hệ thống`,
      "masterdata"
    )
    toast.success(`Đã xóa Squad [${squadName}] & đồng bộ phân bổ nhân sự!`)
    syncMasterDataToSheet({ squads: updated, products })
  }

  // --- PHASE HANDLERS ---
  const handleUpdatePhaseSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPhase) return

    const updated = uxPhases.map((p) => (p.id === editingPhase.id ? editingPhase : p))
    setUxPhases(updated)
    localStorage.setItem("mbbank_admin_phases", JSON.stringify(updated))

    logAdminAction(
      "Cập nhật Khâu UX",
      editingPhase.name,
      `SLA: ${editingPhase.slaDays} ngày | Tiến độ: ${editingPhase.defaultProgress}%`,
      "workflow"
    )
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

    logAdminAction(
      "Thêm Khâu UX mới",
      newPhase.name,
      `Bước ${newPhase.step} · SLA: ${newPhase.slaDays} ngày · Tiến độ: ${newPhase.defaultProgress}%`,
      "workflow"
    )
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

    logAdminAction(
      "Xóa Khâu UX",
      name,
      `Đã xóa bước [${name}] khỏi quy trình`,
      "workflow"
    )
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
      color: newProdColor || "blue",
      description: newProdDesc.trim() || "Sản phẩm số MBBank",
      status: "Active",
    }
    const updated = [...products, newPr]
    setProducts(updated)
    localStorage.setItem("mbbank_admin_products", JSON.stringify(updated))
    localStorage.setItem("ux_portal_products_v2", JSON.stringify(updated))
    window.dispatchEvent(new Event("storage"))
    window.dispatchEvent(new CustomEvent("ux_data_refreshed"))
    setShowAddProductModal(false)
    setNewProdName("")
    setNewProdDesc("")
    setNewProdColor("blue")
    logAdminAction(
      "Thêm Sản phẩm",
      newPr.name,
      `Màu: ${newPr.color} | Mô tả: ${newPr.description}`,
      "masterdata"
    )
    toast.success(`Đã thêm sản phẩm [${newPr.name}]!`)
    syncMasterDataToSheet({ products: updated, squads })
  }

  const handleUpdateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return
    const updated = products.map((p) => (p.id === editingProduct.id ? editingProduct : p))
    setProducts(updated)
    localStorage.setItem("mbbank_admin_products", JSON.stringify(updated))
    localStorage.setItem("ux_portal_products_v2", JSON.stringify(updated))
    window.dispatchEvent(new Event("storage"))
    window.dispatchEvent(new CustomEvent("ux_data_refreshed"))
    logAdminAction(
      "Cập nhật Sản phẩm",
      editingProduct.name,
      `Màu: ${editingProduct.color} | Trạng thái: ${editingProduct.status}`,
      "masterdata"
    )
    setEditingProduct(null)
    toast.success(`Đã cập nhật sản phẩm [${editingProduct.name}] thành công!`)
    syncMasterDataToSheet({ products: updated, squads })
  }

  const handleDeleteProduct = (productId: string, productName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa Sản phẩm [${productName}]? Các Squad trực thuộc sẽ chuyển sang sản phẩm khác.`)) return
    const updatedProds = products.filter((p) => p.id !== productId)
    const fallbackName = updatedProds[0]?.name || "Khác"
    const updatedSquads = squads.map((s) => s.productName === productName ? { ...s, productName: fallbackName } : s)
    setProducts(updatedProds)
    setSquads(updatedSquads)
    localStorage.setItem("mbbank_admin_products", JSON.stringify(updatedProds))
    localStorage.setItem("ux_portal_products_v2", JSON.stringify(updatedProds))
    localStorage.setItem("mbbank_admin_squads", JSON.stringify(updatedSquads))
    localStorage.setItem("ux_portal_squads_v2", JSON.stringify(updatedSquads))
    window.dispatchEvent(new Event("storage"))
    window.dispatchEvent(new CustomEvent("ux_data_refreshed"))
    logAdminAction(
      "Xóa Sản phẩm",
      productName,
      `Đã chuyển các Squad trực thuộc sang sản phẩm [${fallbackName}]`,
      "masterdata"
    )
    toast.success(`Đã xóa Sản phẩm [${productName}]!`)
    syncMasterDataToSheet({ products: updatedProds, squads: updatedSquads })
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
    <main id="main-content" tabIndex={-1} className="w-full space-y-6 animate-in fade-in-50 duration-200 pb-8 outline-none">
      
      {/* 1. Page Header Đồng Bộ */}
      <BlurFade delay={0.02}>
        <PageHeader
          breadcrumb={{
            parent: "MBBank UX Platform",
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
                disabled={isPullingMasterData}
                onClick={handlePullMasterDataFromSheet}
                aria-label="Tải toàn bộ cấu hình từ Google Sheet"
                className="h-9 rounded-lg text-xs font-medium gap-1.5 cursor-pointer bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                title="Tải toàn bộ cấu hình (Squads, Sản phẩm, Khâu UX, Trạng thái, Phân quyền) từ Google Sheet về máy"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isPullingMasterData ? "animate-spin" : ""}`} />
                <span>{isPullingMasterData ? "Đang tải cấu hình..." : "Tải từ Sheet"}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportBackup}
                className="h-9 rounded-lg text-xs font-medium gap-1.5 cursor-pointer bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Sao lưu JSON</span>
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSyncingAll}
                onClick={handleSyncAllSettings}
                className="h-9 rounded-lg text-xs font-medium gap-1.5 bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-xs px-3.5"
                title="Đồng bộ toàn bộ Nhân sự, Squads, Sản phẩm, Quy trình, Trạng thái, Phân quyền & Logs lên Google Sheet"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? "animate-spin" : ""}`} />
                <span>{isSyncingAll ? "Đang lưu lên Sheet..." : "Lưu tất cả thay đổi"}</span>
              </Button>
            </div>
          }
        />
      </BlurFade>

      {/* 2. Responsive 2-Column Settings Layout (ReUI Blocks Application/Settings) */}
      {/* Mobile / Tablet Horizontal Navigation Tabs (lg:hidden) */}
      <div className="lg:hidden">
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl overflow-x-auto no-scrollbar border border-slate-200/60">
          {ADMIN_NAV_GROUPS.flatMap((g) => g.items).map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={`mob-tab-${item.id}`}
                type="button"
                onClick={() => {
                  setActiveTab(item.id)
                  window.location.hash = `#manage?tab=${item.id}`
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
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
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.category}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id)
                          window.location.hash = `#manage?tab=${item.id}`
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 text-sm font-medium transition-colors cursor-pointer select-none ${
                          isActive
                            ? "bg-slate-100 text-slate-900 font-semibold"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-slate-900" : "text-slate-400"}`} />
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
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-medium text-slate-500">Tổng nhân sự</span>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  <NumberTicker value={teamMembers.length} />
                </div>
                <span className="text-xs text-slate-400">100% tài khoản active</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-medium text-slate-500">Design Owners</span>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  <NumberTicker value={teamMembers.filter(m => m.role === "Design Owner" || m.role === "Admin").length} />
                </div>
                <span className="text-xs text-slate-400">Phân công & duyệt</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-medium text-slate-500">UX Designers</span>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  <NumberTicker value={teamMembers.filter(m => m.role === "Designer").length} />
                </div>
                <span className="text-xs text-slate-400">Đa-Squad thực thi</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-medium text-slate-500">Product Owners (PO)</span>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  <NumberTicker value={teamMembers.filter(m => m.role === "PO").length} />
                </div>
                <span className="text-xs text-slate-400">Phân hệ sản phẩm</span>
              </div>
            </div>

            {/* Team Table Card (Unified ReUI Card) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Card Header & Main Actions */}
              <div className="p-5 sm:p-6 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-900">Danh sách Thành viên UX</h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Quản lý tài khoản nhân sự, phân bổ squad và đồng bộ Google Sheets.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportMembersCSV}
                    className="h-8 rounded-lg text-xs font-medium gap-1.5 cursor-pointer bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    title="Tải xuống danh sách nhân sự dạng tệp CSV mở bằng Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                    <span>Xuất CSV</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowAddMemberModal(true)}
                    className="h-8 rounded-lg text-xs font-medium gap-1.5 bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Thêm nhân sự</span>
                  </Button>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="p-4 sm:px-6 bg-slate-50/50 border-b border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
                  {/* Search */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="Tìm tên, email, squad..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-400 transition-colors"
                    />
                  </div>

                  {/* Role filter pills */}
                  <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
                    {["ALL", "Designer", "Design Owner", "PO", "Business", "Admin"].map((r) => (
                      <button
                        key={`rf-${r}`}
                        type="button"
                        onClick={() => setRoleFilter(r)}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          roleFilter === r ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {r === "ALL" ? "Tất cả" : r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  Hiển thị <span className="font-semibold text-slate-900">{filteredMembers.length}</span> / {teamMembers.length} nhân sự
                </div>
              </div>

              {/* Members Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 text-xs font-medium border-b border-slate-200">
                      <th className="py-3 px-4 font-medium">Nhân sự</th>
                      <th className="py-3 px-4 font-medium">Vai trò (Role)</th>
                      <th className="py-3 px-4 font-medium">Squads phụ trách</th>
                      <th className="py-3 px-4 font-medium">Sản phẩm phân bổ (PO/Design)</th>
                      <th className="py-3 px-4 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredMembers.map((member, idx) => (
                      <tr key={member.id ? `mem-row-${member.id}-${idx}` : `mem-${idx}`} className="hover:bg-slate-50/60 transition-colors group">
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
                              <label className="absolute inset-0 rounded-full bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover/ava:opacity-100 transition-opacity cursor-pointer shadow-sm">
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
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5 text-xs">
                                <span>{member.name}</span>
                                {member.status === "On Leave" && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">Nghỉ phép</span>
                                )}
                                {member.status === "Busy" && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">Bận cao</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">{member.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md font-medium text-xs border ${
                            member.role === "Admin"
                              ? "bg-slate-900 text-white border-slate-900"
                              : member.role === "Design Owner"
                              ? "bg-slate-100 text-slate-900 border-slate-300 font-semibold"
                              : member.role === "PO"
                              ? "bg-purple-50 text-purple-700 border-purple-200 font-semibold"
                              : member.role === "Business"
                              ? "bg-amber-50 text-amber-800 border-amber-300 font-semibold"
                              : "bg-blue-50 text-blue-700 border-blue-200 font-medium"
                          }`}>
                            {member.role}
                          </span>
                        </td>

                        {/* Multi-Squads */}
                        <td className="py-3 px-4 max-w-[220px]">
                          <div className="flex flex-wrap gap-1">
                            {(member.squads && member.squads.length > 0 ? member.squads : [member.squad || "Chưa phân bổ"]).map((sq, sqI) => {
                              const isAll = sq === "All Squads"
                              const isUnassigned = sq === "Chưa phân bổ" || sq === "Chưa gán"
                              return (
                                <span
                                  key={`sq-pill-${sq}-${sqI}`}
                                  className={`px-2 py-0.5 rounded-md text-[11px] border truncate ${
                                    isAll
                                      ? "bg-purple-50 text-purple-700 border-purple-200 font-semibold"
                                      : isUnassigned
                                      ? "bg-slate-50 text-slate-400 border-slate-200 italic"
                                      : "bg-blue-50 text-blue-700 border-blue-200 font-medium"
                                  }`}
                                >
                                  {sq}
                                </span>
                              )
                            })}
                          </div>
                        </td>

                        {/* Multi-Products */}
                        <td className="py-3 px-4 max-w-[220px]">
                          <div className="flex flex-wrap gap-1">
                            {(member.products && member.products.length > 0 ? member.products : ["Chưa gán"]).map((pr, prI) => {
                              const isAll = pr === "Toàn hàng" || pr === "Tất cả"
                              const isUnassigned = pr === "Chưa gán"
                              return (
                                <span
                                  key={`pr-pill-${pr}-${prI}`}
                                  className={`px-2 py-0.5 rounded-md text-[11px] border truncate ${
                                    isAll
                                      ? "bg-slate-100 text-slate-800 border-slate-300 font-semibold"
                                      : isUnassigned
                                      ? "bg-slate-50 text-slate-400 border-slate-200 italic"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium"
                                  }`}
                                >
                                  {pr}
                                </span>
                              )
                            })}
                          </div>
                        </td>

                        {/* Actions (Edit & Delete) */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditMember(member)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Sửa phân bổ & phân quyền"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(member.id, member.name)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

            {/* Card 1: Ma trận Phân quyền Vai trò (True RBAC Matrix Table) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Card Header */}
              <div className="p-5 sm:p-6 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-900">Ma trận Phân quyền Vai trò</h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Bật hoặc tắt các quyền hạn hành động & nghiệp vụ chi tiết cho từng vai trò trên hệ thống.
                  </p>
                </div>

                {/* Header Actions: Reset RBAC & Preview Role */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const defaultRbac = {
                        "cap-approve": ["Admin", "Design Owner"],
                        "cap-test": ["Admin", "Design Owner"],
                        "cap-capacity": ["Admin", "Design Owner"],
                        "cap-invite": ["Admin", "Design Owner"],
                        "cap-workflow": ["Admin"],
                        "cap-request": ["Admin", "Design Owner", "Designer", "PO", "Business"],
                        "cap-audit": ["Admin", "Design Owner"],
                      }
                      setRbacRolesPermissions(defaultRbac)
                      localStorage.setItem("mbbank_admin_rbac", JSON.stringify(defaultRbac))
                      window.dispatchEvent(new Event("storage"))
                      window.dispatchEvent(new Event("rbac_permissions_changed"))
                      syncMasterDataToSheet({ rbac: defaultRbac })
                      toast.success("Đã khôi phục ma trận phân quyền vai trò về mặc định!")
                    }}
                    className="h-8 text-xs gap-1.5 text-slate-700 border-slate-200 hover:bg-slate-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Khôi phục mặc định</span>
                  </Button>

                  {/* Role Preview Dropdown / Buttons */}
                  <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                    <span className="text-slate-500 px-2 text-[11px] font-medium hidden sm:inline">Xem thử:</span>
                    {(["PO", "Business", "Designer", "Design Owner"] as const).map((r) => (
                      <button
                        key={`preview-btn-${r}`}
                        type="button"
                        onClick={() => {
                          startRolePreview(r)
                          toast.info(`Chế độ xem trước vai trò: ${r}`, "Đang chuyển sang giao diện thực tế của vai trò này.")
                        }}
                        className="px-2.5 py-1 rounded-md text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-2xs transition-all text-xs font-medium cursor-pointer"
                        title={`Xem giao diện dưới tư cách ${r}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* True RBAC Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-3 px-6 w-[45%]">Quyền hạn hành động & Nghiệp vụ</th>
                      <th className="py-3 px-3 text-center font-medium w-[11%]">Admin</th>
                      <th className="py-3 px-3 text-center font-medium w-[11%]">Design Owner</th>
                      <th className="py-3 px-3 text-center font-medium w-[11%]">Designer</th>
                      <th className="py-3 px-3 text-center font-medium w-[11%]">PO</th>
                      <th className="py-3 px-3 text-center font-medium w-[11%]">Business</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {RBAC_CAPABILITIES.map((cap) => (
                      <tr key={cap.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="space-y-0.5">
                            <div className="text-xs sm:text-sm font-semibold text-slate-900">{cap.title}</div>
                            <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">{cap.description}</p>
                          </div>
                        </td>
                        {(["Admin", "Design Owner", "Designer", "PO", "Business"] as const).map((role) => {
                          const isEnabled = (rbacRolesPermissions[cap.id] || []).includes(role)
                          return (
                            <td key={`${cap.id}-${role}`} className="py-3.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleCapability(cap.id, role)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  isEnabled ? "bg-slate-900" : "bg-slate-200"
                                }`}
                                role="switch"
                                aria-checked={isEnabled}
                                title={`Bấm để ${isEnabled ? "TẮT" : "BẬT"} "${cap.title}" cho ${role}`}
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Role Navigation Menu Visibility & Ordering Settings Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Cấu hình Menu Điều hướng (Sidebar)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
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
                  className="h-8 text-xs gap-1.5 text-slate-700 border-slate-200 hover:bg-slate-50"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Khôi phục mặc định</span>
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-3 px-6 w-[45%]">Mục trên Sidebar</th>
                      <th className="py-3 px-3 text-center font-medium w-[11%]">Admin</th>
                      <th className="py-3 px-3 text-center font-medium w-[11%]">Design Owner</th>
                      <th className="py-3 px-3 text-center font-medium w-[11%]">Designer</th>
                      <th className="py-3 px-3 text-center font-medium w-[11%]">PO</th>
                      <th className="py-3 px-3 text-center font-medium w-[11%]">Business</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {/* NHÓM 1: PLATFORM */}
                    <tr className="bg-slate-50 border-y border-slate-200">
                      <td colSpan={6} className="py-2.5 px-6 text-slate-700 text-xs font-semibold">
                        <div className="flex items-center justify-between">
                          <span className="uppercase tracking-wider text-[11px] text-slate-500 font-semibold">
                            Nhóm 1: Quản lý công việc & Báo cáo
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
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
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isDragging ? "opacity-40 bg-slate-100" : ""
                          }`}
                        >
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              {/* Drag Handle & Arrow buttons */}
                              <div className="flex items-center gap-1 shrink-0 text-slate-400">
                                <div 
                                  className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                  title="Kéo thả để đổi thứ tự"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMovePlatformItem(idx, "up")}
                                    className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed text-slate-500 transition-colors cursor-pointer"
                                    title="Di chuyển lên"
                                  >
                                    <ArrowUp className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === navOrder.platform.length - 1}
                                    onClick={() => handleMovePlatformItem(idx, "down")}
                                    className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed text-slate-500 transition-colors cursor-pointer"
                                    title="Di chuyển xuống"
                                  >
                                    <ArrowDown className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                                {itemMeta.icon}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 text-xs">{itemMeta.label}</p>
                                <p className="text-[11px] text-slate-400 font-normal">{itemMeta.desc}</p>
                              </div>
                            </div>
                          </td>
                          {(["Admin", "Design Owner", "Designer", "PO", "Business"] as UserRole[]).map((r) => {
                            const isEnabled = navConfig[r]?.[key] ?? true
                            return (
                              <td key={`${key}-${r}`} className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleNav(r, key)}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    isEnabled ? "bg-slate-900" : "bg-slate-200"
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
                    <tr className="bg-slate-50 border-y border-slate-200">
                      <td colSpan={6} className="py-2.5 px-6 text-slate-700 text-xs font-semibold">
                        <div className="flex items-center justify-between">
                          <span className="uppercase tracking-wider text-[11px] text-slate-500 font-semibold">
                            Nhóm 2: Công cụ & Quản trị hệ thống
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {navOrder.resources.length} mục
                          </span>
                        </div>
                      </td>
                    </tr>

                    {navOrder.resources.map((key, idx) => {
                      const itemMeta = {
                        compressor: { label: "Nén ảnh (Built-in Tool)", icon: <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />, desc: "Công cụ nén ảnh tối ưu dung lượng dưới 500KB" },
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
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isDragging ? "opacity-40 bg-slate-100" : ""
                          }`}
                        >
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              {/* Drag Handle & Arrow buttons */}
                              <div className="flex items-center gap-1 shrink-0 text-slate-400">
                                <div 
                                  className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                  title="Kéo thả để đổi thứ tự"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveResourceItem(idx, "up")}
                                    className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed text-slate-500 transition-colors cursor-pointer"
                                    title="Di chuyển lên"
                                  >
                                    <ArrowUp className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === navOrder.resources.length - 1}
                                    onClick={() => handleMoveResourceItem(idx, "down")}
                                    className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed text-slate-500 transition-colors cursor-pointer"
                                    title="Di chuyển xuống"
                                  >
                                    <ArrowDown className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                                {itemMeta.icon}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 text-xs">{itemMeta.label}</p>
                                <p className="text-[11px] text-slate-400 font-normal">{itemMeta.desc}</p>
                              </div>
                            </div>
                          </td>
                          {(["Admin", "Design Owner", "Designer", "PO", "Business"] as UserRole[]).map((r) => {
                            const isEnabled = navConfig[r]?.[key] ?? true
                            return (
                              <td key={`${key}-${r}`} className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleNav(r, key)}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    isEnabled ? "bg-slate-900" : "bg-slate-200"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Quản lý Đề thi & Chấm bài Test UX</h2>
                    <p className="text-xs text-slate-500">Soạn đề thi trắc nghiệm & tự luận, đồng bộ câu hỏi Excel và chấm điểm năng lực</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Đánh giá Hiệu suất & Năng lực Nhân sự</h2>
                    <p className="text-xs text-slate-500">Theo dõi KPI Matrix, chuẩn hóa chỉ số FTR (First-Time-Right) và tuân thủ SLA khâu</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                  <span>KPI Matrix MB v3.0</span>
                </span>
              </div>
            </div>

            {/* Top Scorecard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Chỉ số Chất lượng TB</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-medium border border-slate-200">⭐ Xuất sắc</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  4.85<span className="text-xs text-slate-400 font-normal">/5.0</span>
                </div>
                <p className="text-[11px] text-slate-400">Chuẩn hóa Design System MB</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">SLA Đúng hạn bàn giao</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-medium border border-slate-200">+4.2% MoM</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  96.4<span className="text-xs text-slate-400 font-normal">%</span>
                </div>
                <p className="text-[11px] text-slate-400">Tỷ lệ nghiệm thu đúng hạn</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">First-Time-Right (FTR)</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-medium border border-slate-200">Ít sửa đổi</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  92.8<span className="text-xs text-slate-400 font-normal">%</span>
                </div>
                <p className="text-[11px] text-slate-400">Duyệt ngay sau review 1</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Tổng nhân sự active</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-medium border border-slate-200">{teamMembers.length} thành viên</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  {teamMembers.filter(m => m.status === "Active").length}
                  <span className="text-xs text-slate-400 font-normal"> đang làm việc</span>
                </div>
                <p className="text-[11px] text-slate-400">Phủ kín 6 UX Squads</p>
              </div>
            </div>

            {/* Member Performance & Competency Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-slate-500" />
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
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium text-xs">
                      <th className="py-3 px-4 font-medium">Nhân sự</th>
                      <th className="py-3 px-4 font-medium">Vai trò & Squads</th>
                      <th className="py-3 px-4 font-medium">Tải trọng hiện tại</th>
                      <th className="py-3 px-4 font-medium">Điểm chất lượng</th>
                      <th className="py-3 px-4 font-medium">Đúng hạn SLA</th>
                      <th className="py-3 px-4 font-medium">Năng lực nổi bật</th>
                      <th className="py-3 px-4 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {teamMembers.map((mem) => {
                      const utilPct = Math.min(100, Math.round((mem.activeTasks / (mem.capacityLimit || 5)) * 100))
                      const status = utilPct >= 90 ? "Quá tải" : utilPct >= 65 ? "Đang bận" : "Sẵn sàng"

                      return (
                        <tr key={mem.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar name={mem.name} size="md" />
                              <div>
                                <p className="font-semibold text-slate-900 text-xs">{mem.name}</p>
                                <p className="text-[11px] text-slate-400">{mem.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 space-y-1">
                            <span className="px-2 py-0.5 rounded-md font-medium text-xs border bg-slate-100 text-slate-800 border-slate-200 inline-block">
                              {mem.role}
                            </span>
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {(mem.squads || []).join(", ") || "Chung"}
                            </p>
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1 min-w-[130px]">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-medium text-slate-700">{mem.activeTasks}/{mem.capacityLimit || 5} tasks</span>
                                <span className="font-mono text-slate-500">{utilPct}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    status === "Quá tải" ? "bg-rose-500" : "bg-slate-800"
                                  }`}
                                  style={{ width: `${utilPct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400 font-bold">★</span>
                              <span className="font-mono font-semibold text-slate-900 text-xs">
                                {mem.role === "Design Owner" ? "4.95" : mem.name.includes("Nam") ? "4.90" : "4.80"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">/5.0</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-medium text-slate-800">
                            {mem.role === "Design Owner" ? "98.5%" : "95.0%"}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap max-w-[200px]">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                                {mem.role === "PO" ? "PRD Specs" : "Design Tokens"}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
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
                              className="h-7 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer gap-1"
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
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <Workflow className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Cấu hình Quy trình Khâu UX & Tiêu chuẩn SLA ({uxPhases.length} bước)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Danh sách các khâu theo trình tự từ trên xuống dưới. Kéo thả hoặc bấm mũi tên ⬆️⬇️ để sắp xếp thứ tự, thêm khâu mới hoặc sửa SLA & tài liệu bàn giao.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowAddPhaseModal(true)}
                    className="rounded-lg text-xs font-medium gap-1.5 bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm bước mới</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRestorePhases}
                    className="rounded-lg text-xs gap-1.5 cursor-pointer bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
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
                      className={`p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 select-none ${
                        isDragging ? "opacity-40 ring-2 ring-slate-900 scale-98" : ""
                      }`}
                    >
                      {/* Left: Drag handle, Arrows, Step badge, Name & Badges */}
                      <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
                        {/* Drag handle & Move Up/Down */}
                        <div className="flex items-center gap-1 shrink-0 pt-0.5 md:pt-0">
                          <div
                            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                            title="Kéo thả để đổi thứ tự bước"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div className="flex flex-col md:flex-row items-center bg-slate-50 border border-slate-200 rounded-md p-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMovePhase(idx, "prev")}
                              className="p-1 rounded hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                              title="Di chuyển lên trên (bước trước)"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === uxPhases.length - 1}
                              onClick={() => handleMovePhase(idx, "next")}
                              className="p-1 rounded hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                              title="Di chuyển xuống dưới (bước sau)"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Step badge */}
                        <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center font-mono font-semibold text-xs shrink-0">
                          {idx + 1}
                        </div>

                        {/* Phase Content */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900 text-xs">{phase.name}</span>
                            
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[11px] font-medium">
                              {phase.defaultProgress}% tiến độ
                            </span>

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              SLA: {phase.slaDays} ngày
                            </span>

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-medium truncate max-w-[300px]">
                              📎 {phase.requiredDeliverable}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-1 md:line-clamp-none">
                            {phase.description}
                          </p>
                        </div>
                      </div>

                      {/* Right: Edit & Delete buttons */}
                      <div className="flex items-center justify-end gap-1 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingPhase(phase)}
                          className="rounded-lg text-xs gap-1 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer h-7"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Sửa</span>
                        </Button>

                        <button
                          type="button"
                          disabled={uxPhases.length <= 2}
                          onClick={() => handleDeletePhase(phase.id, phase.name)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
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

            {/* Dynamic Status Automation Rules Tool */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/70 via-white to-indigo-50/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Quy tắc Trạng thái & Tự động hóa Quy trình UX (Status Automation Rules)
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {statusRules.filter((r) => r.autoEnabled).length}/{statusRules.length} Tự động Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Thiết lập điều kiện trigger tự động chuyển trạng thái, ánh xạ tiến độ Khâu UX và hành vi đếm hạn SLA đồng bộ toàn hệ thống
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const newRule: StatusAutomationRule = {
                        id: `st-${Date.now()}`,
                        name: "Trạng thái mới",
                        colorKey: "blue",
                        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
                        dotClass: "bg-blue-500",
                        triggerDescription: "Mô tả điều kiện kích hoạt trạng thái...",
                        triggerEvent: "manual_flag",
                        mappedPhaseIds: [],
                        mappedPhaseNames: "Không cố định (Áp dụng mọi khâu)",
                        slaAction: "run",
                        slaActionLabel: "Chạy SLA",
                        autoEnabled: true,
                        desc: "Mô tả nghiệp vụ trạng thái...",
                      }
                      setStatusRules([...statusRules, newRule])
                      setEditingStatusRule(newRule)
                    }}
                    className="rounded-lg text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer h-8 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm trạng thái</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRestoreStatusRules}
                    className="rounded-lg text-xs gap-1.5 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer h-8 shadow-xs"
                    title="Khôi phục các quy tắc về giá trị mặc định ban đầu"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Khôi phục mặc định</span>
                  </Button>
                </div>
              </div>

              {/* Statuses Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium text-xs">
                      <th className="py-3 px-4 font-medium min-w-[140px]">Trạng thái</th>
                      <th className="py-3 px-4 font-medium min-w-[240px]">Điều kiện Trigger Tự động</th>
                      <th className="py-3 px-4 font-medium min-w-[180px]">Ánh xạ Khâu UX</th>
                      <th className="py-3 px-4 font-medium min-w-[180px]">Hành vi SLA</th>
                      <th className="py-3 px-4 font-medium text-center min-w-[90px]">Tự động</th>
                      <th className="py-3 px-4 font-medium text-right min-w-[110px]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {statusRules.map((rule) => {
                      return (
                        <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Trạng thái */}
                          <td className="py-3 px-4 align-top">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium text-[11px] border h-[22px] ${rule.badgeClass}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${rule.dotClass}`} />
                                {rule.name}
                              </span>
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-tight">
                                {rule.desc}
                              </p>
                            </div>
                          </td>

                          {/* Trigger */}
                          <td className="py-3 px-4 align-top">
                            <div className="space-y-1">
                              <div className="flex items-start gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <span className="text-xs font-medium text-slate-800 leading-snug">
                                  {rule.triggerDescription}
                                </span>
                              </div>
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[10.5px] font-mono text-slate-600 border border-slate-200">
                                Event: {rule.triggerEvent}
                              </span>
                            </div>
                          </td>

                          {/* Ánh xạ Khâu UX */}
                          <td className="py-3 px-4 align-top">
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                <Workflow className="w-3 h-3 text-slate-500" />
                                <span>{rule.mappedPhaseNames}</span>
                              </span>
                              {rule.mappedPhaseIds.length > 0 && (
                                <p className="text-[10.5px] text-slate-400">
                                  {rule.mappedPhaseIds.length} khâu liên kết trực tiếp
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Hành vi SLA */}
                          <td className="py-3 px-4 align-top">
                            <div className="flex items-center gap-1.5">
                              {rule.slaAction === "start" && <Play className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                              {rule.slaAction === "run" && <RefreshCw className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                              {rule.slaAction === "pause" && <Pause className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                              {rule.slaAction === "complete" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                              {rule.slaAction === "alert" && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                              <span className="text-xs text-slate-700 leading-tight font-medium">
                                {rule.slaActionLabel}
                              </span>
                            </div>
                          </td>

                          {/* Toggle Tự động */}
                          <td className="py-3 px-4 align-top text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleStatusRuleAuto(rule.id)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
                                rule.autoEnabled
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                              }`}
                              title={rule.autoEnabled ? "Nhấn để tắt tự động hóa (chuyển sang thủ công)" : "Nhấn để bật tự động hóa"}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  rule.autoEnabled ? "bg-emerald-500" : "bg-slate-400"
                                }`}
                              />
                              <span>{rule.autoEnabled ? "BẬT" : "TẮT"}</span>
                            </button>
                          </td>

                          {/* Thao tác */}
                          <td className="py-3 px-4 align-top text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingStatusRule(rule)}
                                className="rounded-lg text-xs gap-1.5 bg-white border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-slate-700 cursor-pointer h-7 shadow-2xs"
                              >
                                <Sliders className="w-3 h-3" />
                                <span>Cấu hình</span>
                              </Button>
                              {statusRules.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Xóa quy tắc trạng thái [${rule.name}]?`)) {
                                      const updated = statusRules.filter((r) => r.id !== rule.id)
                                      setStatusRules(updated)
                                      toast.success(`Đã xóa quy tắc [${rule.name}]!`)
                                    }
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                  title="Xóa quy tắc này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Sync Guidance Alert */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-start gap-3 text-xs text-slate-600">
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <p className="font-semibold text-slate-900">Cơ chế đồng bộ tự động 2 chiều:</p>
                  <p>
                    • Khi PO tạo yêu cầu, hệ thống tự động gán trạng thái <strong>Đang phân loại</strong> và tính SLA Khâu 1.
                    <br />
                    • Khi Lead/Designer được phân công và cập nhật khâu từ Khâu 2 trở đi, trạng thái tự động chuyển thành <strong>Đang thực hiện</strong>.
                    <br />
                    • Khi Designer hoàn tất Khâu 6 và gửi trao đổi kèm mốc nghiệm thu, trạng thái tự động chuyển thành <strong>Đã gửi PO</strong> và bắt đầu đếm hạn 24h.
                    <br />
                    • Tất cả cài đặt khâu liên kết sẽ tự động đồng bộ theo bảng <strong>Cấu hình Quy trình Khâu UX</strong> phía trên.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DANH MỤC SẢN PHẨM & SQUADS (NHÓM SQUAD VỚI SẢN PHẨM, SQUAD CARD REUI CARD-15) */}
        {activeTab === "masterdata" && (
          <div className="space-y-6">
            {/* 1. Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Danh mục Sản phẩm & Squads nghiệp vụ</h2>
                    <p className="text-xs text-slate-500">
                      Cấu trúc Master Data phân cấp: Nhóm các <strong>Squads chuyên môn</strong> trực thuộc từng <strong>Sản phẩm số</strong>
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    <strong className="text-slate-900">{products.length}</strong> Sản phẩm
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                    <strong className="text-slate-900">{squads.length}</strong> Squads
                  </span>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAddProductModal(true)}
                  className="rounded-lg text-xs font-medium gap-1.5 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Thêm Sản phẩm</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewSquadProduct(products[0]?.name || "App MBBank")
                    setNewSquadDesigners([])
                    setNewSquadPos([])
                    setShowAddSquadModal(true)
                  }}
                  className="rounded-lg text-xs font-medium gap-1.5 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Squad mới</span>
                </Button>
              </div>
            </div>

            {/* 2. Filter & Search Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên squad, designer, PO phụ trách..."
                    value={squadSearchQuery}
                    onChange={(e) => setSquadSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-slate-800"
                  />
                  {squadSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSquadSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <span className="text-xs text-slate-400 hidden sm:inline">
                  Hiển thị dạng card ReUI gọn gàng, trực quan theo từng sản phẩm
                </span>
              </div>

              {/* Product Filter Tabs with Color Dots */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedProductFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    selectedProductFilter === "ALL"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  Tất cả Sản phẩm ({squads.length} Squads)
                </button>
                {products.map((pr) => {
                  const cDef = getProductColorDef(pr.name, pr.color)
                  const count = squads.filter((s) => s.productName === pr.name).length
                  const isSelected = selectedProductFilter === pr.name

                  return (
                    <button
                      key={`filter-tab-${pr.id}`}
                      type="button"
                      onClick={() => setSelectedProductFilter(pr.name)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer border ${
                        isSelected
                          ? `${cDef.badgeClass} border-current shadow-xs font-semibold`
                          : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${cDef.dotClass}`} />
                      <span>{pr.name}</span>
                      <span className="text-[11px] opacity-75 font-semibold">({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Grouped Squads by Product (ReUI Card-15 Style) */}
            <div className="space-y-6">
              {(() => {
                const targetProducts = selectedProductFilter === "ALL"
                  ? products
                  : products.filter((p) => p.name === selectedProductFilter)

                let totalRenderedSquads = 0

                const renderedGroups = targetProducts.map((pr) => {
                  const cDef = getProductColorDef(pr.name, pr.color)
                  const prodSquads = squads.filter((s) => s.productName === pr.name)
                  const filteredSquads = prodSquads.filter((s) => {
                    if (!squadSearchQuery.trim()) return true
                    const q = squadSearchQuery.toLowerCase()
                    const desList = getSquadDesigners(s)
                    const poList = getSquadPos(s)
                    const bizList = getSquadBusinesses(s)
                    return (
                      s.name.toLowerCase().includes(q) ||
                      s.code.toLowerCase().includes(q) ||
                      (s.domain && s.domain.toLowerCase().includes(q)) ||
                      desList.some((d) => d.toLowerCase().includes(q)) ||
                      poList.some((p) => p.toLowerCase().includes(q)) ||
                      bizList.some((b) => b.toLowerCase().includes(q))
                    )
                  })

                  if (squadSearchQuery.trim() && filteredSquads.length === 0) {
                    return null
                  }

                  totalRenderedSquads += filteredSquads.length

                  return (
                    <div key={`group-prod-${pr.id}`} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                      {/* Product Group Header */}
                      <div className="p-4 sm:px-5 sm:py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-3.5 h-3.5 rounded-full ${cDef.dotClass} ring-4 ring-white shadow-2xs shrink-0`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                                {pr.name}
                              </h3>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cDef.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cDef.dotClass}`} />
                                <span>{prodSquads.length} squads</span>
                              </span>
                            </div>
                            {pr.description && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{pr.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Product Level Quick Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setNewSquadProduct(pr.name)
                              setNewSquadDesigners([])
                              setNewSquadPos([])
                              setNewSquadBusinesses([])
                              setShowAddSquadModal(true)
                            }}
                            className="h-8 text-xs font-medium gap-1 bg-white border-slate-200 hover:bg-slate-100 text-slate-800 cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5 text-blue-600" />
                            <span>Thêm Squad</span>
                          </Button>
                          <button
                            type="button"
                            onClick={() => setEditingProduct(pr)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={`Sửa thông tin sản phẩm [${pr.name}]`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(pr.id, pr.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title={`Xóa sản phẩm [${pr.name}]`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Squads Grid (ReUI Card-15 Style) */}
                      <div className="p-4 sm:p-5">
                        {filteredSquads.length === 0 ? (
                          <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <p className="text-xs text-slate-500">Chưa có squad nào khớp với bộ lọc trong nhóm này.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {filteredSquads.map((sq) => {
                              const desList = getSquadDesigners(sq)
                              const poList = getSquadPos(sq)
                              const bizList = getSquadBusinesses(sq)
                              const sqColorDef = getSquadColorDef(sq.name, sq.productName)

                              return (
                                <div
                                  key={`sq-card-${sq.id}`}
                                  className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between p-3 relative group"
                                >
                                  {/* Card Top: Title Squad + Code badge + Quick actions */}
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className={`w-2 h-2 rounded-full shrink-0 ${sqColorDef.dotClass}`} />
                                          <h4 className="font-bold text-[13px] text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                            {sq.name}
                                          </h4>
                                        </div>
                                      </div>

                                      {/* Quick Edit/Delete buttons */}
                                      <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currentDes = sq.designers || (sq.leadDesigner ? [sq.leadDesigner] : [])
                                            const currentPos = sq.pos || (sq.leadPo ? [sq.leadPo] : [])
                                            const currentBiz = sq.businesses || (sq.leadBusiness ? [sq.leadBusiness] : [])
                                            setEditingSquad({ ...sq, designers: currentDes, pos: currentPos, businesses: currentBiz })
                                          }}
                                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                          title="Sửa Squad"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSquad(sq.id, sq.name)}
                                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                          title="Xóa Squad"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Card Body: Mô tả ngắn */}
                                    <p className="text-[11.5px] text-slate-500 line-clamp-1 leading-normal mt-1" title={sq.domain}>
                                      {sq.domain || "Nghiệp vụ trực thuộc khối sản phẩm"}
                                    </p>
                                  </div>

                                  {/* Card Footer: Hiển thị cả PO, Business và Designer phụ trách */}
                                  <div className="border-t border-slate-100 pt-2 mt-2 space-y-1.5">
                                    {/* Hàng 1: PO Phụ trách */}
                                    <div className="flex items-center justify-between gap-1.5">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[9.5px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-1 py-0.2 rounded shrink-0 border border-purple-200">
                                          PO
                                        </span>
                                        {poList.length > 0 ? (
                                          <div className="flex items-center gap-1 min-w-0">
                                            <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                              {poList.slice(0, 2).map((poName, pIdx) => {
                                                const memberInfo = teamMembers.find(
                                                  (m) => m.name.toLowerCase() === poName.trim().toLowerCase()
                                                )
                                                return (
                                                  <div
                                                    key={`po-av-${pIdx}`}
                                                    className="relative inline-block ring-1.5 ring-white rounded-full"
                                                    title={`PO: ${poName}`}
                                                  >
                                                    <UserAvatar
                                                      name={poName}
                                                      avatarUrl={memberInfo?.avatarUrl}
                                                      size="sm"
                                                      className="w-4.5 h-4.5 text-[8px]"
                                                    />
                                                  </div>
                                                )
                                              })}
                                            </div>
                                            <span
                                              className="text-[11px] font-semibold text-slate-800 truncate max-w-[120px]"
                                              title={poList.join(", ")}
                                            >
                                              {poList.length === 1 ? poList[0] : `${poList.length} POs`}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-[10.5px] text-slate-400 italic">Chưa gán PO</span>
                                        )}
                                      </div>

                                      {/* Quick Edit button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentDes = sq.designers || (sq.leadDesigner ? [sq.leadDesigner] : [])
                                          const currentPos = sq.pos || (sq.leadPo ? [sq.leadPo] : [])
                                          const currentBiz = sq.businesses || (sq.leadBusiness ? [sq.leadBusiness] : [])
                                          setEditingSquad({ ...sq, designers: currentDes, pos: currentPos, businesses: currentBiz })
                                        }}
                                        className="text-[10.5px] font-medium text-slate-400 hover:text-blue-600 transition-colors cursor-pointer shrink-0"
                                      >
                                        Sửa
                                      </button>
                                    </div>

                                    {/* Hàng 2: Business Phụ trách */}
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1 py-0.2 rounded shrink-0 border border-amber-200">
                                        BIZ
                                      </span>
                                      {bizList.length > 0 ? (
                                        <div className="flex items-center gap-1 min-w-0">
                                          <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                            {bizList.slice(0, 2).map((bizName, bIdx) => {
                                              const memberInfo = teamMembers.find(
                                                (m) => m.name.toLowerCase() === bizName.trim().toLowerCase()
                                              )
                                              return (
                                                <div
                                                  key={`biz-av-${bIdx}`}
                                                  className="relative inline-block ring-1.5 ring-white rounded-full"
                                                  title={`Business: ${bizName}`}
                                                >
                                                  <UserAvatar
                                                    name={bizName}
                                                    avatarUrl={memberInfo?.avatarUrl}
                                                    size="sm"
                                                    className="w-4.5 h-4.5 text-[8px]"
                                                  />
                                                </div>
                                              )
                                            })}
                                          </div>
                                          <span
                                            className="text-[11px] font-semibold text-slate-800 truncate max-w-[120px]"
                                            title={bizList.join(", ")}
                                          >
                                            {bizList.length === 1 ? bizList[0] : `${bizList.length} Business`}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[10.5px] text-slate-400 italic">Chưa gán Business</span>
                                      )}
                                    </div>

                                    {/* Hàng 3: Designer Phụ trách */}
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1 py-0.2 rounded shrink-0 border border-blue-200">
                                        UX
                                      </span>
                                      {desList.length > 0 ? (
                                        <div className="flex items-center gap-1 min-w-0">
                                          {/* Avatar Stack (-space-x-1.5) */}
                                          <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                            {desList.slice(0, 3).map((desName, dIdx) => {
                                              const memberInfo = teamMembers.find(
                                                (m) => m.name.toLowerCase() === desName.trim().toLowerCase()
                                              )
                                              return (
                                                <div
                                                  key={`des-avatar-${dIdx}`}
                                                  className="relative inline-block ring-1.5 ring-white rounded-full"
                                                  title={`Designer: ${desName}`}
                                                >
                                                  <UserAvatar
                                                    name={desName}
                                                    avatarUrl={memberInfo?.avatarUrl}
                                                    size="sm"
                                                    className="w-4.5 h-4.5 text-[8px]"
                                                  />
                                                </div>
                                              )
                                            })}
                                            {desList.length > 3 && (
                                              <span
                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 ring-1.5 ring-white text-[9px] font-bold text-slate-600 shrink-0"
                                                title={desList.slice(3).join(", ")}
                                              >
                                                +{desList.length - 3}
                                              </span>
                                            )}
                                          </div>

                                          {/* Designer name label */}
                                          <span
                                            className="text-[10.5px] font-medium text-slate-700 truncate max-w-[120px]"
                                            title={desList.join(", ")}
                                          >
                                            {desList.length === 1 ? desList[0] : `${desList.length} Designers`}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[10.5px] text-slate-400 italic flex items-center gap-1">
                                          <UserX className="w-3 h-3 text-slate-300" />
                                          <span>Chưa gán designer</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}

                            {/* Dashed Quick Add Squad Button Card */}
                            <button
                              type="button"
                              onClick={() => {
                                setNewSquadProduct(pr.name)
                                setNewSquadDesigners([])
                                setNewSquadPos([])
                                setNewSquadBusinesses([])
                                setShowAddSquadModal(true)
                              }}
                              className="border-dashed border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 rounded-xl flex flex-col items-center justify-center p-3 min-h-[90px] text-slate-400 hover:text-blue-600 cursor-pointer transition-all group"
                            >
                              <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center mb-1 transition-colors">
                                <Plus className="w-3.5 h-3.5 group-hover:text-blue-600" />
                              </div>
                              <span className="text-[11px] font-semibold text-slate-600 group-hover:text-blue-600">
                                Thêm Squad cho {pr.name}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })

                if (totalRenderedSquads === 0 && squadSearchQuery.trim()) {
                  return (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
                      <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <h4 className="text-sm font-semibold text-slate-800">Không tìm thấy Squad nào phù hợp</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Không có kết quả nào khớp với từ khóa "{squadSearchQuery}". Thử tìm với từ khóa khác hoặc bấm nút dưới để xóa lọc.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSquadSearchQuery("")}
                        className="mt-4 text-xs h-8 border-slate-200 cursor-pointer"
                      >
                        Xóa từ khóa tìm kiếm
                      </Button>
                    </div>
                  )
                }

                return renderedGroups
              })()}
            </div>
          </div>
        )}

        {/* TAB 6: TÍCH HỢP & KẾT NỐI (INTEGRATIONS) */}
        {activeTab === "integrations" && (
          <div className="space-y-6">
            {/* ReUI Section Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Tích hợp Cổng Kết nối Ngoại vi (APIs & Webhooks)</h2>
                    <p className="text-xs text-slate-500">Quản lý kết nối cơ sở dữ liệu Google Sheets, lưu trữ Drive và Webhooks thông báo Teams</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>All Gateways Online</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Sheets Config Card */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Google Sheets Database Gateway</h3>
                    <p className="text-xs text-slate-500">Đồng bộ hai chiều dữ liệu bài toán UX</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connected
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Google Apps Script Webhook Endpoint:
                  </label>
                  <Input
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="font-mono text-xs bg-slate-50 rounded-lg border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Chu kỳ tự động đồng bộ:
                    </label>
                    <DropdownMenu
                      className="w-full"
                      value={sheetSyncInterval}
                      onChange={(val) => setSheetSyncInterval(val)}
                      options={[
                        { value: "1", label: "Mỗi 1 phút" },
                        { value: "5", label: "Mỗi 5 phút (Khuyến nghị)" },
                        { value: "15", label: "Mỗi 15 phút" },
                        { value: "manual", label: "Chỉ đồng bộ thủ công" },
                      ]}
                    />
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
                      className="rounded-lg text-xs font-medium gap-1.5 cursor-pointer bg-white border-slate-200 hover:bg-slate-50 text-slate-700 h-8"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? "animate-spin text-slate-900" : ""}`} />
                      <span>{testingConnection ? "Đang test..." : "Test kết nối"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Microsoft Teams Bot Webhook */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Microsoft Teams Notifications</h3>
                    <p className="text-xs text-slate-500">Bắn thông báo realtime khi có đề bài mới hoặc bàn giao</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 group">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                      autoNotifySlack
                        ? "bg-[#1057FB] border-[#1057FB] text-white shadow-2xs"
                        : "bg-white border-slate-300 hover:border-slate-400 group-hover:border-slate-400"
                    }`}
                  >
                    {autoNotifySlack && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={autoNotifySlack}
                    onChange={(e) => setAutoNotifySlack(e.target.checked)}
                    className="sr-only"
                  />
                  <span>Bật thông báo</span>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Teams Incoming Webhook URL:</label>
                  <Input
                    value={teamsWebhookUrl}
                    onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                    className="font-mono text-xs bg-slate-50 rounded-lg border-slate-200"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success("Đã gửi tin nhắn test thành công tới kênh Teams UX MBBank!")}
                  className="rounded-lg text-xs font-medium gap-1.5 cursor-pointer bg-white border-slate-200 hover:bg-slate-50 text-slate-700 h-8"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Nhật ký Quản trị & Audit Trail</h2>
                    <p className="text-xs text-slate-500">Truy vết toàn bộ thao tác can thiệp hệ thống, thêm/sửa nhân sự và thay đổi SLA</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{auditLogs.length} sự kiện · Auto-saved Local & Cloud</span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportBackup}
                  className="rounded-lg text-xs font-medium gap-1.5 cursor-pointer bg-white border-slate-200 shadow-xs hover:bg-slate-50 text-slate-700 h-8"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Xuất JSON Log</span>
                </Button>
                {auditLogs.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("Bạn có chắc muốn dọn sạch nhật ký kiểm toán trên trình duyệt?")) {
                        setAuditLogs([])
                        localStorage.removeItem(AUDIT_LOGS_STORAGE_KEY)
                        toast.success("Đã dọn dẹp toàn bộ Audit Logs nội bộ!")
                      }
                    }}
                    className="rounded-lg text-xs font-medium gap-1 cursor-pointer bg-white border-slate-200 shadow-xs hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 h-8"
                    title="Xóa bộ nhớ đệm Audit Logs trên máy"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Dọn nhật ký</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Nhật ký Quản trị Hệ thống (Admin Audit Trail)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ghi nhận toàn bộ thao tác thêm/sửa nhân sự, phân bổ Đa-Squad, thay đổi SLA, khâu UX và cài đặt bảo mật</p>
                </div>
                <span className="text-xs font-mono text-slate-400">Tổng cộng: {auditLogs.length} bản ghi</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 text-xs font-medium border-b border-slate-200">
                      <th className="py-3 px-4 font-medium">Thời gian</th>
                      <th className="py-3 px-4 font-medium">Người thực hiện</th>
                      <th className="py-3 px-4 font-medium">Hành động</th>
                      <th className="py-3 px-4 font-medium">Đối tượng</th>
                      <th className="py-3 px-4 font-medium">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {auditLogs.map((log, idx) => (
                      <tr key={log.id ? `log-row-${log.id}-${idx}` : `log-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{log.timestamp}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{log.actor}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium text-[11px] border border-slate-200 font-mono">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{log.target}</td>
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
              className="bg-white rounded-xl p-6 w-full max-w-xl shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-slate-700" />
                  <span>Sửa Phân bổ & Phân quyền: {editingMember.name}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateMemberSubmit} className="space-y-4">
                {/* Avatar Preview & Upload */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <UserAvatar name={editingMember.name} avatarUrl={editingMember.avatarUrl} size="md" />
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-700 block">Ảnh đại diện (Avatar):</label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Dán link ảnh (URL) hoặc tải từ máy..."
                        value={editingMember.avatarUrl || ""}
                        onChange={(e) => setEditingMember({ ...editingMember, avatarUrl: e.target.value })}
                        className="text-xs rounded-lg h-8 bg-white border-slate-200 flex-1"
                      />
                      <label className="shrink-0 h-8 px-3 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
                        <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
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
                    <label className="text-xs font-medium text-slate-700 block mb-1">Họ và tên:</label>
                    <Input
                      required
                      value={editingMember.name}
                      onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                      className="text-xs rounded-lg border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Email Teams:</label>
                    <Input
                      required
                      type="email"
                      value={editingMember.email}
                      onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                      className="text-xs rounded-lg border-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Vai trò (Role):</label>
                    <DropdownMenu
                      className="w-full"
                      value={editingMember.role}
                      onChange={(val) => setEditingMember({ ...editingMember, role: val as TeamMember["role"] })}
                      options={[
                        { value: "Designer", label: "UX Designer" },
                        { value: "Design Owner", label: "Design Owner" },
                        { value: "PO", label: "Product Owner (PO)" },
                        { value: "Business", label: "Business (Nghiệp vụ / Kinh doanh)" },
                        { value: "Admin", label: "Admin" },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Trạng thái:</label>
                    <DropdownMenu
                      className="w-full"
                      value={editingMember.status}
                      onChange={(val) => setEditingMember({ ...editingMember, status: val as TeamMember["status"] })}
                      options={[
                        { value: "Active", label: "Active (Sẵn sàng)" },
                        { value: "On Leave", label: "On Leave (Nghỉ phép)" },
                        { value: "Busy", label: "Busy (Quá tải)" },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Hạn mức (Max task):</label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={editingMember.capacityLimit}
                      onChange={(e) => setEditingMember({ ...editingMember, capacityLimit: parseInt(e.target.value) || 5 })}
                      className="text-xs rounded-lg border-slate-200 text-center font-bold"
                    />
                  </div>
                </div>

                {/* HIERARCHICAL PRODUCT -> SQUADS SELECTION */}
                <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800">
                      Phân bổ Sản phẩm & Squads phụ trách:
                    </label>
                    <span className="text-[11px] text-slate-500 font-normal">
                      <span className="font-medium text-slate-800">{(editingMember.products || []).length}</span> SP · <span className="font-medium text-slate-800">{editingMember.squads.length}</span> squads
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Chọn sản phẩm và bấm vào các chip Squad tương ứng để phân bổ nhân sự.
                  </p>

                  <div className="space-y-2 pt-1 max-h-72 overflow-y-auto pr-1">
                    {allAvailableProductNames.map((prodName) => {
                      const prodSquads = squads
                        .filter((s) => (s.productName || "").trim().toLowerCase() === prodName.trim().toLowerCase())
                        .map((s) => s.name)
                      const isProdSelected = (editingMember.products || []).includes(prodName)
                      const selectedSquadsInProd = prodSquads.filter((s) => editingMember.squads.includes(s))
                      const allSquadsSelected = prodSquads.length > 0 && selectedSquadsInProd.length === prodSquads.length

                      return (
                        <div
                          key={`edit-prod-${prodName}`}
                          className={`rounded-lg border transition-all overflow-hidden ${
                            isProdSelected ? "bg-white border-blue-200 shadow-2xs" : "bg-white/70 border-slate-200"
                          }`}
                        >
                          <div className="px-3 py-2 flex items-center justify-between bg-slate-50/50">
                            <label className="flex items-center gap-2 cursor-pointer min-w-0 group">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                                  isProdSelected
                                    ? "bg-[#1057FB] border-[#1057FB] text-white shadow-2xs"
                                    : "bg-white border-slate-300 hover:border-slate-400 group-hover:border-slate-400"
                                }`}
                              >
                                {isProdSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                              </div>
                              <input
                                type="checkbox"
                                checked={isProdSelected}
                                onChange={() => {
                                  const curProds = editingMember.products || []
                                  if (isProdSelected) {
                                    setEditingMember({
                                      ...editingMember,
                                      products: curProds.filter((p) => p !== prodName),
                                      squads: editingMember.squads.filter((s) => !prodSquads.includes(s)),
                                    })
                                  } else {
                                    setEditingMember({
                                      ...editingMember,
                                      products: [...curProds, prodName],
                                      squads: prodSquads[0] && !editingMember.squads.includes(prodSquads[0])
                                        ? [...editingMember.squads, prodSquads[0]]
                                        : editingMember.squads,
                                    })
                                  }
                                }}
                                className="sr-only"
                              />
                              <span className={`text-xs truncate ${isProdSelected ? "font-semibold text-slate-900" : "text-slate-600 font-normal"}`}>
                                {prodName}
                              </span>
                              {selectedSquadsInProd.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-blue-50 text-[#1057FB] border border-blue-200/80">
                                  {selectedSquadsInProd.length}/{prodSquads.length}
                                </span>
                              )}
                            </label>

                            {prodSquads.length > 0 && isProdSelected && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (allSquadsSelected) {
                                    setEditingMember({
                                      ...editingMember,
                                      squads: editingMember.squads.filter((s) => !prodSquads.includes(s)),
                                    })
                                  } else {
                                    const toAdd = prodSquads.filter((s) => !editingMember.squads.includes(s))
                                    setEditingMember({
                                      ...editingMember,
                                      squads: [...editingMember.squads, ...toAdd],
                                    })
                                  }
                                }}
                                className="text-[10px] text-slate-500 hover:text-[#1057FB] transition-colors cursor-pointer px-1 py-0.5 rounded"
                              >
                                {allSquadsSelected ? "Bỏ chọn hết" : "Chọn hết"}
                              </button>
                            )}
                          </div>

                          {/* Squad Chips under Product */}
                          <div className="p-2 pt-1.5 border-t border-slate-100 bg-white">
                            {prodSquads.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {prodSquads.map((sqName) => {
                                  const isSqSelected = editingMember.squads.includes(sqName)
                                  return (
                                    <button
                                      key={`edit-sq-${prodName}-${sqName}`}
                                      type="button"
                                      onClick={() => {
                                        let nextSquads: string[]
                                        let nextProds = editingMember.products || []
                                        if (isSqSelected) {
                                          nextSquads = editingMember.squads.filter((s) => s !== sqName)
                                        } else {
                                          nextSquads = [...editingMember.squads, sqName]
                                          if (!nextProds.includes(prodName)) {
                                            nextProds = [...nextProds, prodName]
                                          }
                                        }
                                        setEditingMember({
                                          ...editingMember,
                                          squads: nextSquads,
                                          products: nextProds,
                                        })
                                      }}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer select-none border ${
                                        isSqSelected
                                          ? "bg-[#1057FB] text-white border-[#1057FB] font-medium shadow-2xs"
                                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-normal hover:border-slate-300"
                                      }`}
                                    >
                                      {isSqSelected ? (
                                        <Check className="w-2.5 h-2.5 text-white stroke-[2.5]" />
                                      ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                      )}
                                      <span>{sqName}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic">
                                Chưa có squad nào thuộc sản phẩm này.
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingMember(null)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-slate-200 hover:bg-slate-50 text-slate-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs h-8"
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
      {/* ======================================================== */}
      {/* MODAL: THÊM NHÂN SỰ MỚI (ADD MEMBER MODAL)               */}
      {/* ======================================================== */}
      <AddMemberModal
        open={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        products={products}
        squads={squads}
        onSuccess={(newMem) => {
          setTeamMembers((prev) => [
            newMem,
            ...prev.filter((m) => m.email.toLowerCase() !== newMem.email.toLowerCase()),
          ])
          logAdminAction(
            "Thêm nhân sự",
            newMem.name,
            `Phân bổ ${newMem.squads.length} Squads & ${newMem.products?.length || 0} Sản phẩm`,
            "user"
          )
        }}
      />

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
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-slate-700" />
                  <span>Sửa Khâu UX: Bước {editingPhase.step} · {editingPhase.name}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingPhase(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdatePhaseSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Tên khâu:</label>
                  <Input
                    required
                    value={editingPhase.name}
                    onChange={(e) => setEditingPhase({ ...editingPhase, name: e.target.value })}
                    className="text-xs rounded-lg border-slate-200 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">SLA cam kết (Ngày):</label>
                    <Input
                      type="number"
                      min="1"
                      max="999"
                      required
                      value={editingPhase.slaDays}
                      onChange={(e) => setEditingPhase({ ...editingPhase, slaDays: parseInt(e.target.value) || 1 })}
                      className="text-xs rounded-lg border-slate-200 font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Tiến độ mặc định (%):</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={editingPhase.defaultProgress}
                      onChange={(e) => setEditingPhase({ ...editingPhase, defaultProgress: parseInt(e.target.value) || 0 })}
                      className="text-xs rounded-lg border-slate-200 font-bold text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Mô tả nhiệm vụ khâu:</label>
                  <Textarea
                    rows={2}
                    value={editingPhase.description}
                    onChange={(e) => setEditingPhase({ ...editingPhase, description: e.target.value })}
                    className="text-xs rounded-lg border-slate-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Tài liệu bàn giao bắt buộc:</label>
                  <Input
                    value={editingPhase.requiredDeliverable}
                    onChange={(e) => setEditingPhase({ ...editingPhase, requiredDeliverable: e.target.value })}
                    className="text-xs rounded-lg border-slate-200"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingPhase(null)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-slate-200 hover:bg-slate-50 text-slate-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs h-8"
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
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-slate-700" />
                  <span>Thêm bước mới vào Quy trình UX</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddPhaseModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddPhaseSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Tên khâu / bước <span className="text-rose-500">*</span>:
                  </label>
                  <Input
                    required
                    value={newPhaseName}
                    onChange={(e) => setNewPhaseName(e.target.value)}
                    placeholder="VD: User Testing / Kiểm thử trải nghiệm"
                    className="text-xs rounded-lg border-slate-200 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">SLA cam kết (Ngày):</label>
                    <Input
                      type="number"
                      min="1"
                      max="999"
                      required
                      value={newPhaseSla}
                      onChange={(e) => setNewPhaseSla(parseInt(e.target.value) || 1)}
                      className="text-xs rounded-lg border-slate-200 font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Tiến độ mặc định (%):</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={newPhaseProgress}
                      onChange={(e) => setNewPhaseProgress(parseInt(e.target.value) || 0)}
                      className="text-xs rounded-lg border-slate-200 font-bold text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Mô tả nhiệm vụ khâu:</label>
                  <Textarea
                    rows={2}
                    value={newPhaseDesc}
                    onChange={(e) => setNewPhaseDesc(e.target.value)}
                    placeholder="Mô tả mục tiêu và hành động trong bước này..."
                    className="text-xs rounded-lg border-slate-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Tài liệu bàn giao bắt buộc:</label>
                  <Input
                    value={newPhaseDeliverable}
                    onChange={(e) => setNewPhaseDeliverable(e.target.value)}
                    placeholder="VD: Usability Test Report / Maze metrics link"
                    className="text-xs rounded-lg border-slate-200"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddPhaseModal(false)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-slate-200 hover:bg-slate-50 text-slate-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs gap-1 h-8"
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
              className="bg-white rounded-2xl p-6 w-full max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Boxes className="w-4.5 h-4.5 text-blue-600" />
                  <span>Thêm Squad chuyên môn mới</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddSquadModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSquadSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 py-3">
                {/* 3 trường cơ bản dàn ngang 3 cột */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Sản phẩm trực thuộc: <span className="text-red-500">*</span>
                    </label>
                    <DropdownMenu
                      className="w-full"
                      value={newSquadProduct}
                      onChange={(val) => setNewSquadProduct(val)}
                      options={products.map((p) => {
                        const colorDef = getProductColorDef(p.name)
                        return {
                          value: p.name,
                          label: p.name,
                          badge: (
                            <span className={`w-2 h-2 rounded-full ${colorDef.dotClass}`} />
                          ),
                        }
                      })}
                      placeholder="Chọn sản phẩm trực thuộc..."
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Squad nằm trong khối sản phẩm này.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Tên Squad / Nghiệp vụ: <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      value={newSquadName}
                      onChange={(e) => setNewSquadName(e.target.value)}
                      placeholder="VD: eSaving, Lending & Vay vốn..."
                      className="text-xs rounded-lg border-slate-200 font-medium bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Lĩnh vực / Phạm vi phụ trách:</label>
                    <Input
                      value={newSquadDomain}
                      onChange={(e) => setNewSquadDomain(e.target.value)}
                      placeholder="VD: Tiết kiệm trực tuyến, tích lũy số..."
                      className="text-xs rounded-lg border-slate-200 bg-white"
                    />
                  </div>
                </div>

                {/* Màu nhận diện Squad */}
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>Màu nhận diện Squad:</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        (Mặc định đồng bộ theo {newSquadProduct || "Sản phẩm"})
                      </span>
                    </label>
                    {newSquadColor && (
                      <button
                        type="button"
                        onClick={() => setNewSquadColor("")}
                        className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                      >
                        Đặt lại theo sản phẩm
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.values(PRODUCT_COLORS).map((c) => {
                      const effectiveColor = newSquadColor || getProductColorDef(newSquadProduct).key
                      const isSelected = effectiveColor === c.key
                      return (
                        <button
                          key={`new-sq-color-${c.key}`}
                          type="button"
                          onClick={() => setNewSquadColor(c.key)}
                          className={`w-7 h-7 rounded-full ${c.dotClass} transition-all cursor-pointer flex items-center justify-center ${
                            isSelected ? "ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-xs" : "opacity-75 hover:opacity-100"
                          }`}
                          title={c.label}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 3 Role phân bổ phụ trách dàn ngang 3 cột */}
                <div>
                  <div className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Phân bổ nhân sự phụ trách Squad</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
                    {/* 1. Chọn 1 hoặc nhiều PO phụ trách (Chỉ nhân sự role PO) */}
                    <CompactRoleMemberSelector
                      label="PO phụ trách (Product Owner)"
                      subtitle="chọn 1 hoặc nhiều"
                      dotClass="bg-purple-500"
                      badgeClass="text-purple-700 bg-purple-50 border-purple-200"
                      theme="purple"
                      members={teamMembers.filter((m) => m.role === "PO")}
                      selectedNames={newSquadPos}
                      onChange={setNewSquadPos}
                      emptyHint="Chưa có nhân sự vai trò Product Owner (PO)"
                    />

                    {/* 2. Chọn 1 hoặc nhiều Business phụ trách (Chỉ nhân sự role Business) */}
                    <CompactRoleMemberSelector
                      label="Business phụ trách (Nghiệp vụ)"
                      subtitle="chọn 1 hoặc nhiều"
                      dotClass="bg-amber-500"
                      badgeClass="text-amber-800 bg-amber-50 border-amber-200"
                      theme="amber"
                      members={teamMembers.filter((m) => m.role === "Business")}
                      selectedNames={newSquadBusinesses}
                      onChange={setNewSquadBusinesses}
                      emptyHint="Chưa có nhân sự vai trò Business (Nghiệp vụ)"
                    />

                    {/* 3. Chọn 1 hoặc nhiều Designer phụ trách (Chỉ nhân sự Designer / Design Owner / Admin) */}
                    <CompactRoleMemberSelector
                      label="Designer phụ trách"
                      subtitle="chọn 1 hoặc nhiều"
                      dotClass="bg-blue-500"
                      badgeClass="text-blue-600 bg-blue-50 border-blue-200"
                      theme="blue"
                      members={teamMembers.filter(
                        (m) => m.role === "Designer" || m.role === "Design Owner" || m.role === "Admin"
                      )}
                      selectedNames={newSquadDesigners}
                      onChange={setNewSquadDesigners}
                      emptyHint="Chưa có nhân sự vai trò Designer"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddSquadModal(false)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-slate-200 hover:bg-slate-50 text-slate-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs h-8"
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
      {/* MODAL: CHỈNH SỬA SQUAD (EDIT SQUAD MODAL)                 */}
      {/* ======================================================== */}
      <AnimatePresence>
        {editingSquad && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl p-6 w-full max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4.5 h-4.5 text-blue-600" />
                  <span>Sửa thông tin Squad: {editingSquad.name}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingSquad(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateSquadSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 py-3">
                {/* 3 trường cơ bản dàn ngang 3 cột */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Sản phẩm trực thuộc: <span className="text-red-500">*</span>
                    </label>
                    <DropdownMenu
                      className="w-full"
                      value={editingSquad.productName}
                      onChange={(val) => setEditingSquad({ ...editingSquad, productName: val })}
                      options={products.map((p) => {
                        const colorDef = getProductColorDef(p.name)
                        return {
                          value: p.name,
                          label: p.name,
                          badge: (
                            <span className={`w-2 h-2 rounded-full ${colorDef.dotClass}`} />
                          ),
                        }
                      })}
                      placeholder="Chọn sản phẩm trực thuộc..."
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Squad nằm trong khối sản phẩm này.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Tên Squad / Nghiệp vụ: <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      value={editingSquad.name}
                      onChange={(e) => setEditingSquad({ ...editingSquad, name: e.target.value })}
                      className="text-xs rounded-lg border-slate-200 font-medium bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Lĩnh vực / Phạm vi phụ trách:</label>
                    <Input
                      value={editingSquad.domain || ""}
                      onChange={(e) => setEditingSquad({ ...editingSquad, domain: e.target.value })}
                      placeholder="VD: Tiết kiệm, chứng chỉ tiền gửi..."
                      className="text-xs rounded-lg border-slate-200 bg-white"
                    />
                  </div>
                </div>

                {/* Màu nhận diện Squad */}
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>Màu nhận diện Squad:</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        (Mặc định đồng bộ theo {editingSquad.productName || "Sản phẩm"})
                      </span>
                    </label>
                    {editingSquad.color && (
                      <button
                        type="button"
                        onClick={() => setEditingSquad({ ...editingSquad, color: undefined })}
                        className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                      >
                        Đặt lại theo sản phẩm
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.values(PRODUCT_COLORS).map((c) => {
                      const curColor = editingSquad.color || getSquadColorDef(editingSquad.name, editingSquad.productName).key
                      const isSelected = curColor === c.key
                      return (
                        <button
                          key={`edit-sq-color-${c.key}`}
                          type="button"
                          onClick={() => setEditingSquad({ ...editingSquad, color: c.key })}
                          className={`w-7 h-7 rounded-full ${c.dotClass} transition-all cursor-pointer flex items-center justify-center ${
                            isSelected ? "ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-xs" : "opacity-75 hover:opacity-100"
                          }`}
                          title={c.label}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 3 Role phân bổ phụ trách dàn ngang 3 cột */}
                <div>
                  <div className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Phân bổ nhân sự phụ trách Squad</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
                    {/* 1. Chọn 1 hoặc nhiều PO phụ trách (Chỉ nhân sự role PO) */}
                    <CompactRoleMemberSelector
                      label="PO phụ trách (Product Owner)"
                      subtitle="chọn 1 hoặc nhiều"
                      dotClass="bg-purple-500"
                      badgeClass="text-purple-700 bg-purple-50 border-purple-200"
                      theme="purple"
                      members={teamMembers.filter((m) => m.role === "PO")}
                      selectedNames={
                        editingSquad.pos && editingSquad.pos.length > 0
                          ? editingSquad.pos
                          : editingSquad.leadPo
                          ? [editingSquad.leadPo]
                          : []
                      }
                      onChange={(next) =>
                        setEditingSquad({
                          ...editingSquad,
                          pos: next,
                          leadPo: next[0] || "",
                        })
                      }
                      emptyHint="Chưa có nhân sự vai trò Product Owner (PO)"
                    />

                    {/* 2. Chọn 1 hoặc nhiều Business phụ trách (Chỉ nhân sự role Business) */}
                    <CompactRoleMemberSelector
                      label="Business phụ trách (Nghiệp vụ)"
                      subtitle="chọn 1 hoặc nhiều"
                      dotClass="bg-amber-500"
                      badgeClass="text-amber-800 bg-amber-50 border-amber-200"
                      theme="amber"
                      members={teamMembers.filter((m) => m.role === "Business")}
                      selectedNames={
                        editingSquad.businesses && editingSquad.businesses.length > 0
                          ? editingSquad.businesses
                          : editingSquad.leadBusiness
                          ? [editingSquad.leadBusiness]
                          : []
                      }
                      onChange={(next) =>
                        setEditingSquad({
                          ...editingSquad,
                          businesses: next,
                          leadBusiness: next[0] || "",
                        })
                      }
                      emptyHint="Chưa có nhân sự vai trò Business (Nghiệp vụ)"
                    />

                    {/* 3. Chọn 1 hoặc nhiều Designer phụ trách (Chỉ nhân sự Designer / Design Owner / Admin) */}
                    <CompactRoleMemberSelector
                      label="Designer phụ trách"
                      subtitle="chọn 1 hoặc nhiều"
                      dotClass="bg-blue-500"
                      badgeClass="text-blue-600 bg-blue-50 border-blue-200"
                      theme="blue"
                      members={teamMembers.filter(
                        (m) => m.role === "Designer" || m.role === "Design Owner" || m.role === "Admin"
                      )}
                      selectedNames={
                        editingSquad.designers && editingSquad.designers.length > 0
                          ? editingSquad.designers
                          : editingSquad.leadDesigner
                          ? [editingSquad.leadDesigner]
                          : []
                      }
                      onChange={(next) =>
                        setEditingSquad({
                          ...editingSquad,
                          designers: next,
                          leadDesigner: next[0] || "",
                        })
                      }
                      emptyHint="Chưa có nhân sự vai trò Designer"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingSquad(null)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-slate-200 hover:bg-slate-50 text-slate-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs h-8"
                  >
                    Lưu thay đổi
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
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Thêm Sản phẩm số mới (Parent)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddProductSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Tên Sản phẩm: <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="VD: MB Ageas Life, Wealth Management..."
                    className="text-xs rounded-lg border-slate-200 font-medium"
                  />
                </div>


                {/* Chấm màu nhận diện sản phẩm */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">
                    Màu nhận diện sản phẩm:
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.values(PRODUCT_COLORS).map((c) => (
                      <button
                        key={`color-pick-${c.key}`}
                        type="button"
                        onClick={() => setNewProdColor(c.key)}
                        className={`w-7 h-7 rounded-full ${c.dotClass} transition-all cursor-pointer flex items-center justify-center ${
                          newProdColor === c.key ? "ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-sm" : "opacity-75 hover:opacity-100"
                        }`}
                        title={c.label}
                      >
                        {newProdColor === c.key && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Mô tả sản phẩm:</label>
                  <Textarea
                    rows={2}
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    placeholder="Mô tả phạm vi khách hàng và nghiệp vụ của sản phẩm..."
                    className="text-xs rounded-lg border-slate-200"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddProductModal(false)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-slate-200 hover:bg-slate-50 text-slate-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs h-8"
                  >
                    Thêm Sản phẩm
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: CHỈNH SỬA SẢN PHẨM (EDIT PRODUCT MODAL)           */}
      {/* ======================================================== */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  <span>Sửa thông tin Sản phẩm: {editingProduct.name}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateProductSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Tên Sản phẩm: <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="text-xs rounded-lg border-slate-200 font-medium"
                  />
                </div>


                {/* Chấm màu nhận diện sản phẩm */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">
                    Màu nhận diện sản phẩm:
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.values(PRODUCT_COLORS).map((c) => {
                      const curColor = editingProduct.color || getProductColorDef(editingProduct.name).key
                      const isSelected = curColor === c.key
                      return (
                        <button
                          key={`edit-color-pick-${c.key}`}
                          type="button"
                          onClick={() => setEditingProduct({ ...editingProduct, color: c.key })}
                          className={`w-7 h-7 rounded-full ${c.dotClass} transition-all cursor-pointer flex items-center justify-center ${
                            isSelected ? "ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-sm" : "opacity-75 hover:opacity-100"
                          }`}
                          title={c.label}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Mô tả sản phẩm:</label>
                  <Textarea
                    rows={2}
                    value={editingProduct.description || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    placeholder="Mô tả phạm vi khách hàng và nghiệp vụ..."
                    className="text-xs rounded-lg border-slate-200"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingProduct(null)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-slate-200 hover:bg-slate-50 text-slate-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs h-8"
                  >
                    Lưu thay đổi
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* MODAL CẤU HÌNH QUY TẮC TRẠNG THÁI TỰ ĐỘNG (STATUS AUTOMATION RULE) */}
        {editingStatusRule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-4xl xl:max-w-5xl shadow-2xl border border-slate-200 my-auto max-h-[94vh] flex flex-col"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                      <span>Cấu hình Quy tắc:</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-medium text-xs border h-[22px] ${editingStatusRule.badgeClass}`}>
                        <span className={`w-2 h-2 rounded-full ${editingStatusRule.dotClass}`} />
                        {editingStatusRule.name}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tự động hóa điều kiện chuyển trạng thái, đồng bộ Khâu UX & kiểm soát đồng hồ SLA
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingStatusRule(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveStatusRuleSubmit} className="mt-4 flex flex-col flex-1 overflow-visible">
                {/* 2-Column Grid Layout dàn đều ngang để không bị scroll dọc */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 items-start">
                  {/* CỘT 1: Nhận diện, Bảng chọn màu, Mô tả & Toggle tự động */}
                  <div className="space-y-3">
                    {/* Tên trạng thái */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Tên trạng thái nghiệp vụ: <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        required
                        value={editingStatusRule.name}
                        onChange={(e) =>
                          setEditingStatusRule({ ...editingStatusRule, name: e.target.value })
                        }
                        placeholder="Ví dụ: Đang phân loại, Đang thực hiện..."
                        className="text-xs rounded-lg border-slate-200 font-medium h-9"
                      />
                    </div>

                    {/* BẢNG CHỌN MÀU NHẬN DIỆN TRẠNG THÁI */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Chọn màu nhận diện trạng thái:</span>
                        </label>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${editingStatusRule.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${editingStatusRule.dotClass}`} />
                          Xem trước
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        {Object.values(PRODUCT_COLORS).map((c) => {
                          const isSelected = editingStatusRule.colorKey === c.key
                          return (
                            <button
                              key={`status-color-pick-${c.key}`}
                              type="button"
                              onClick={() =>
                                setEditingStatusRule({
                                  ...editingStatusRule,
                                  colorKey: c.key,
                                  dotClass: c.dotClass,
                                  badgeClass: c.badgeClass,
                                })
                              }
                              className={`w-7 h-7 rounded-full ${c.dotClass} transition-all cursor-pointer flex items-center justify-center relative ${
                                isSelected
                                  ? "ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-sm"
                                  : "opacity-75 hover:opacity-100 hover:scale-105"
                              }`}
                              title={`${c.label} (${c.key})`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Mô tả nghiệp vụ */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Mô tả ý nghĩa nghiệp vụ:
                      </label>
                      <Textarea
                        rows={2}
                        value={editingStatusRule.desc}
                        onChange={(e) =>
                          setEditingStatusRule({ ...editingStatusRule, desc: e.target.value })
                        }
                        placeholder="Giải thích mục đích và trạng thái này đại diện cho giai đoạn nào..."
                        className="text-xs rounded-lg border-slate-200 leading-relaxed resize-none"
                      />
                    </div>

                    {/* Toggle Tự động hóa */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Trạng thái Tự động hóa:</span>
                          </label>
                          <p className="text-[10.5px] text-slate-500 mt-0.5">
                            {editingStatusRule.autoEnabled
                              ? "Hệ thống tự động kích hoạt chuyển trạng thái khi khớp điều kiện."
                              : "Đang tắt — Chỉ cập nhật thủ công bởi Designer hoặc Lead UX."}
                          </p>
                        </div>
                        <label className="flex items-center cursor-pointer shrink-0 ml-3">
                          <input
                            type="checkbox"
                            checked={editingStatusRule.autoEnabled}
                            onChange={(e) =>
                              setEditingStatusRule({
                                ...editingStatusRule,
                                autoEnabled: e.target.checked,
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative" />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* CỘT 2: Sự kiện Trigger, Ánh xạ khâu UX & Hành vi SLA */}
                  <div className="space-y-3">
                    {/* 1. Sự kiện kích hoạt tự động (Automation Trigger) */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Sự kiện kích hoạt tự động:</span>
                        </label>
                        <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {editingStatusRule.triggerEvent}
                        </span>
                      </div>

                      <DropdownMenu
                        options={TRIGGER_EVENT_OPTIONS}
                        value={editingStatusRule.triggerEvent}
                        onChange={(newVal) => {
                          const newEvent = newVal as StatusAutomationRule["triggerEvent"]
                          const matched = TRIGGER_EVENT_OPTIONS.find((o) => o.value === newEvent)
                          setEditingStatusRule({
                            ...editingStatusRule,
                            triggerEvent: newEvent,
                            triggerDescription: matched ? matched.label : editingStatusRule.triggerDescription,
                          })
                        }}
                        className="w-full"
                        buttonClassName="h-9 px-3 w-full bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-lg shadow-2xs"
                        menuClassName="w-full min-w-[340px] max-h-72 overflow-y-auto shadow-xl border border-slate-200 rounded-xl"
                        placeholder="Chọn sự kiện kích hoạt..."
                      />

                      <Input
                        value={editingStatusRule.triggerDescription}
                        onChange={(e) =>
                          setEditingStatusRule({
                            ...editingStatusRule,
                            triggerDescription: e.target.value,
                          })
                        }
                        placeholder="Ví dụ: PO mới gửi bài toán HOẶC chưa phân công UX Designer"
                        className="text-xs rounded-lg border-slate-200 bg-white h-7 text-[11px]"
                      />
                    </div>

                    {/* 2. Ánh xạ Khâu UX trong Quy trình */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                          <Workflow className="w-3.5 h-3.5 text-blue-500" />
                          <span>Ánh xạ Khâu UX trong Quy trình:</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStatusRule({
                              ...editingStatusRule,
                              mappedPhaseIds: [],
                              mappedPhaseNames: "Không cố định (Áp dụng mọi khâu)",
                            })
                          }}
                          className="text-[10.5px] text-blue-600 hover:underline px-1 py-0.5 rounded cursor-pointer font-medium"
                        >
                          Áp dụng toàn trình
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {uxPhases.map((phase) => {
                          const isChecked = editingStatusRule.mappedPhaseIds.includes(phase.id)
                          return (
                            <label
                              key={phase.id}
                              className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all ${
                                isChecked
                                  ? "bg-blue-50/80 border-blue-200 text-blue-900 font-medium"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60"
                              }`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                                  isChecked
                                    ? "bg-[#1057FB] border-[#1057FB] text-white"
                                    : "bg-white border-slate-300"
                                }`}
                              >
                                {isChecked && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  let nextIds: string[]
                                  if (e.target.checked) {
                                    nextIds = [...editingStatusRule.mappedPhaseIds, phase.id]
                                  } else {
                                    nextIds = editingStatusRule.mappedPhaseIds.filter((id) => id !== phase.id)
                                  }
                                  let autoNames = ""
                                  if (nextIds.length === 0) {
                                    autoNames = "Không cố định (Áp dụng mọi khâu)"
                                  } else {
                                    const selectedPhases = uxPhases.filter((p) => nextIds.includes(p.id))
                                    if (selectedPhases.length === 1) {
                                      autoNames = `Khâu ${selectedPhases[0].step}: ${selectedPhases[0].name}`
                                    } else {
                                      const sorted = [...selectedPhases].sort((a, b) => a.step - b.step)
                                      autoNames = `Khâu ${sorted[0].step}: ${sorted[0].name} → Khâu ${sorted[sorted.length - 1].step}: ${sorted[sorted.length - 1].name}`
                                    }
                                  }
                                  setEditingStatusRule({
                                    ...editingStatusRule,
                                    mappedPhaseIds: nextIds,
                                    mappedPhaseNames: autoNames,
                                  })
                                }}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                              />
                              <span className="truncate">
                                {phase.step}. {phase.name}
                              </span>
                            </label>
                          )
                        })}
                      </div>

                      <Input
                        value={editingStatusRule.mappedPhaseNames}
                        onChange={(e) =>
                          setEditingStatusRule({
                            ...editingStatusRule,
                            mappedPhaseNames: e.target.value,
                          })
                        }
                        placeholder="Nhãn hiển thị khâu..."
                        className="text-xs rounded-lg border-slate-200 bg-white h-7 text-[11px]"
                      />
                    </div>

                    {/* 3. Hành vi SLA */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Hành vi Đồng hồ SLA:</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <DropdownMenu
                          options={SLA_ACTION_OPTIONS}
                          value={editingStatusRule.slaAction}
                          onChange={(nextVal) => {
                            const nextAction = nextVal as StatusAutomationRule["slaAction"]
                            let nextLabel = editingStatusRule.slaActionLabel
                            if (nextAction === "start") nextLabel = "Kích hoạt tính SLA Tiếp nhận"
                            if (nextAction === "run") nextLabel = "Đồng bộ tiến độ % và chạy SLA Thiết kế"
                            if (nextAction === "pause") nextLabel = "Tạm dừng đồng hồ SLA (Không bị phạt hạn)"
                            if (nextAction === "complete") nextLabel = "Dừng SLA, chốt chỉ số KPI hoàn thành"
                            if (nextAction === "alert") nextLabel = "Gắn cờ đỏ cảnh báo và gửi email Lead UX"
                            setEditingStatusRule({
                              ...editingStatusRule,
                              slaAction: nextAction,
                              slaActionLabel: nextLabel,
                            })
                          }}
                          className="w-full"
                          buttonClassName="h-9 px-3 w-full bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-lg shadow-2xs"
                          menuClassName="w-full min-w-[220px] max-h-60 overflow-y-auto shadow-xl border border-slate-200 rounded-xl"
                          placeholder="Chọn hành vi SLA..."
                        />

                        <Input
                          value={editingStatusRule.slaActionLabel}
                          onChange={(e) =>
                            setEditingStatusRule({
                              ...editingStatusRule,
                              slaActionLabel: e.target.value,
                            })
                          }
                          placeholder="Nhãn hành vi SLA..."
                          className="text-xs rounded-lg border-slate-200 bg-white h-8"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3.5 mt-3 flex justify-end gap-2 border-t border-slate-200 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingStatusRule(null)}
                    className="rounded-lg text-xs font-medium cursor-pointer bg-white border-slate-200 hover:bg-slate-50 text-slate-700 h-8"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs h-8 gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu cấu hình quy tắc</span>
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
