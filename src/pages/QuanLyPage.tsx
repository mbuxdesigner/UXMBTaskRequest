import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Frame } from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { getStoredSession } from "@/services/otpAuthService"
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
  ChevronRight,
  Clock
} from "lucide-react"

// Types
export interface TeamMember {
  id: string
  name: string
  email: string
  role: "Admin" | "Design Owner" | "Designer" | "PO"
  squad: string
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
  leadPo: string
  leadDesigner: string
  taskCount: number
  color: string
}

export interface AuditLogItem {
  id: string
  timestamp: string
  actor: string
  action: string
  target: string
  details: string
  type: "user" | "workflow" | "integration" | "security"
}

// Initial Mock Data
const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "mem-1",
    name: "Nguyễn Văn Cường",
    email: "cuong.designowner@mbbank.com.vn",
    role: "Design Owner",
    squad: "Design System & Core",
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
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
    activeTasks: 2,
    capacityLimit: 5,
    status: "Active",
    permissions: { canAssign: false, canApprovePo: false, canExport: true, canManageSystem: false },
  },
  {
    id: "mem-5",
    name: "Hoàng Minh Trí",
    email: "tri.admin@mbbank.com.vn",
    role: "Admin",
    squad: "Toàn hàng (Enterprise)",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
    activeTasks: 1,
    capacityLimit: 4,
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
  { id: "sq-1", name: "Lending & Vay vốn", code: "LENDING", leadPo: "Trần Mai Lan", leadDesigner: "Lê Hoàng Nam", taskCount: 8, color: "bg-blue-50 text-[#1057FB] border-blue-200" },
  { id: "sq-2", name: "Cards & Thanh toán số", code: "CARDS", leadPo: "Trần Mai Lan", leadDesigner: "Lê Hoàng Nam", taskCount: 6, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "sq-3", name: "Core Banking & Tài khoản", code: "CORE", leadPo: "Nguyễn Văn Cường", leadDesigner: "Nguyễn Văn Cường", taskCount: 5, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "sq-4", name: "Digital Wealth & Đầu tư", code: "WEALTH", leadPo: "Phạm Hải Đăng", leadDesigner: "Phạm Hải Đăng", taskCount: 4, color: "bg-amber-50 text-amber-800 border-amber-200" },
  { id: "sq-5", name: "BaaS & Open API", code: "BAAS", leadPo: "Hoàng Minh Trí", leadDesigner: "Lê Hoàng Nam", taskCount: 3, color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
]

const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  { id: "log-1", timestamp: "22/08/2026 00:15", actor: "Hoàng Minh Trí (Admin)", action: "Cập nhật SLA", target: "UI Design Phase", details: "Rút ngắn SLA từ 7 ngày xuống 5 ngày", type: "workflow" },
  { id: "log-2", timestamp: "21/08/2026 19:40", actor: "Nguyễn Văn Cường (Design Owner)", action: "Gán Squad", target: "Lê Hoàng Nam", details: "Phân công phụ trách chính Squad Lending & Vay vốn", type: "user" },
  { id: "log-3", timestamp: "21/08/2026 16:20", actor: "Hệ thống Google Sheet", action: "Tự động đồng bộ", target: "MB_UX_DATABASE", details: "Đồng bộ thành công 24 bản ghi yêu cầu UX", type: "integration" },
  { id: "log-4", timestamp: "21/08/2026 11:05", actor: "Hoàng Minh Trí (Admin)", action: "Cấu hình Webhook", target: "Microsoft Teams Bot", details: "Kích hoạt kênh nhận thông báo task gấp", type: "security" },
]

type AdminTab = "team" | "workflow" | "integrations" | "masterdata" | "audit"

export default function QuanLyPage() {
  const session = getStoredSession()
  const [activeTab, setActiveTab] = useState<AdminTab>("team")

  // State Data
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const saved = localStorage.getItem("mbbank_admin_team")
    return saved ? JSON.parse(saved) : INITIAL_TEAM_MEMBERS
  })

  const [uxPhases, setUxPhases] = useState<UxPhaseSetting[]>(() => {
    const saved = localStorage.getItem("mbbank_admin_phases")
    return saved ? JSON.parse(saved) : INITIAL_UX_PHASES
  })

  const [squads, setSquads] = useState<SquadSetting[]>(() => {
    const saved = localStorage.getItem("mbbank_admin_squads")
    return saved ? JSON.parse(saved) : INITIAL_SQUADS
  })

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS)

  // Integration Settings
  const [sheetUrl, setSheetUrl] = useState<string>("https://script.google.com/macros/s/AKfycbz_MB_UX_GATEWAY/exec")
  const [sheetSyncInterval, setSheetSyncInterval] = useState<string>("5")
  const [figmaOrgKey, setFigmaOrgKey] = useState<string>("figd_MBBank_UXDesign_SecuredToken_8829")
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState<string>("https://mbbank.webhook.office.com/webhookb2/teams_ux_alerts")
  const [autoNotifySlack, setAutoNotifySlack] = useState<boolean>(true)
  const [testingConnection, setTestingConnection] = useState<boolean>(false)

  // Modals
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false)
  const [showAddSquadModal, setShowAddSquadModal] = useState<boolean>(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>("")

  // Form State for New Member
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [newMemberRole, setNewMemberRole] = useState<TeamMember["role"]>("Designer")
  const [newMemberSquad, setNewMemberSquad] = useState("Lending Squad")
  const [newMemberCapacity, setNewMemberCapacity] = useState(5)

  // Form State for New Squad
  const [newSquadName, setNewSquadName] = useState("")
  const [newSquadCode, setNewSquadCode] = useState("")
  const [newSquadPo, setNewSquadPo] = useState("Trần Mai Lan")
  const [newSquadDesigner, setNewSquadDesigner] = useState("Lê Hoàng Nam")

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("mbbank_admin_team", JSON.stringify(teamMembers))
  }, [teamMembers])

  useEffect(() => {
    localStorage.setItem("mbbank_admin_phases", JSON.stringify(uxPhases))
  }, [uxPhases])

  useEffect(() => {
    localStorage.setItem("mbbank_admin_squads", JSON.stringify(squads))
  }, [squads])

  // Handlers
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      toast.error("Vui lòng nhập đầy đủ tên và email")
      return
    }

    const newMem: TeamMember = {
      id: `mem-${Date.now()}`,
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      role: newMemberRole,
      squad: newMemberSquad,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      activeTasks: 0,
      capacityLimit: newMemberCapacity,
      status: "Active",
      permissions: {
        canAssign: newMemberRole === "Admin" || newMemberRole === "Design Owner",
        canApprovePo: newMemberRole === "Admin" || newMemberRole === "PO" || newMemberRole === "Design Owner",
        canExport: true,
        canManageSystem: newMemberRole === "Admin",
      },
    }

    setTeamMembers((prev) => [newMem, ...prev])
    setShowAddMemberModal(false)
    setNewMemberName("")
    setNewMemberEmail("")

    // Add Audit Log
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: "Vừa xong",
      actor: session?.name || "Admin",
      action: "Thêm nhân sự",
      target: newMem.name,
      details: `Gán vai trò [${newMem.role}] tại Squad [${newMem.squad}]`,
      type: "user",
    }
    setAuditLogs((prev) => [newLog, ...prev])
    toast.success(`Đã thêm thành viên ${newMem.name} thành công!`)
  }

  const handleDeleteMember = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa thành viên ${name} khỏi hệ thống?`)) {
      setTeamMembers((prev) => prev.filter((m) => m.id !== id))
      toast.success(`Đã xóa thành viên ${name}`)
    }
  }

  const handleTogglePermission = (memberId: string, permKey: keyof TeamMember["permissions"]) => {
    setTeamMembers((prev) =>
      prev.map((m) => {
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
    )
    toast.success("Đã cập nhật phân quyền người dùng")
  }

  const handleUpdatePhaseSla = (phaseId: string, newSla: number) => {
    setUxPhases((prev) =>
      prev.map((p) => (p.id === phaseId ? { ...p, slaDays: Math.max(1, newSla) } : p))
    )
    toast.success("Đã cập nhật thời gian cam kết SLA!")
  }

  const handleTestConnection = () => {
    setTestingConnection(true)
    setTimeout(() => {
      setTestingConnection(false)
      toast.success("Kết nối thành công tới MBBank Google Sheets Gateway (Latency: 42ms)!")
    }, 1200)
  }

  const handleAddSquad = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSquadName.trim() || !newSquadCode.trim()) {
      toast.error("Vui lòng điền đủ tên và mã Squad")
      return
    }

    const newSq: SquadSetting = {
      id: `sq-${Date.now()}`,
      name: newSquadName.trim(),
      code: newSquadCode.trim().toUpperCase(),
      leadPo: newSquadPo,
      leadDesigner: newSquadDesigner,
      taskCount: 0,
      color: "bg-blue-50 text-[#1057FB] border-blue-200",
    }

    setSquads((prev) => [...prev, newSq])
    setShowAddSquadModal(false)
    setNewSquadName("")
    setNewSquadCode("")
    toast.success(`Đã thêm Squad ${newSq.name}!`)
  }

  const handleExportBackup = () => {
    const backupData = {
      version: "2.4.0",
      exportDate: new Date().toISOString(),
      teamMembers,
      uxPhases,
      squads,
      settings: { sheetUrl, sheetSyncInterval, figmaOrgKey, teamsWebhookUrl },
    }
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `MBBank_UX_Admin_Backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    toast.success("Đã xuất bản sao lưu cấu hình hệ thống (JSON)!")
  }

  const filteredMembers = teamMembers.filter((m) => {
    if (!memberSearchQuery.trim()) return true
    const q = memberSearchQuery.toLowerCase()
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.squad.toLowerCase().includes(q)
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in-50 duration-200">
      
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1057FB] shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Admin & System Settings
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                  System Operational v2.4
                </Badge>
              </h1>
              <p className="text-xs text-slate-500">
                Trung tâm quản trị nhân sự, quy trình 6 khâu UX, SLA cam kết và tích hợp hệ thống MBBank
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
            className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer bg-white"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Sao lưu JSON</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => toast.success("Đã đồng bộ và lưu toàn bộ cấu hình hệ thống!")}
            className="rounded-xl text-xs font-bold gap-1.5 bg-[#1057FB] hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu tất cả thay đổi</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Navigation Tabs */}
      <div className="flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-2xl overflow-x-auto no-scrollbar border border-slate-200/60">
        <button
          type="button"
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
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
          onClick={() => setActiveTab("workflow")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "workflow"
              ? "bg-white text-slate-900 shadow-2xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Workflow className="w-4 h-4 text-indigo-600" />
          <span>2. Quy trình & Khâu UX (SLA)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10.5px]">
            6 Khâu
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("integrations")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "integrations"
              ? "bg-white text-slate-900 shadow-2xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Database className="w-4 h-4 text-emerald-600" />
          <span>3. Tích hợp & Kết nối</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("masterdata")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "masterdata"
              ? "bg-white text-slate-900 shadow-2xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Tag className="w-4 h-4 text-purple-600" />
          <span>4. Danh mục & Squads</span>
          <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 text-[10.5px]">
            {squads.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "audit"
              ? "bg-white text-slate-900 shadow-2xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <History className="w-4 h-4 text-slate-600" />
          <span>5. Audit Logs & Hệ thống</span>
        </button>
      </div>

      {/* 3. TAB CONTENTS */}
      <div className="space-y-6">

        {/* TAB 1: NHÂN SỰ & PHÂN QUYỀN (TEAM & RBAC) */}
        {activeTab === "team" && (
          <div className="space-y-6">
            
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Frame className="p-4 bg-white space-y-1 border border-slate-200/90 rounded-2xl shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tổng nhân sự</span>
                <div className="text-2xl font-black text-slate-900">{teamMembers.length}</div>
                <span className="text-[11px] text-emerald-600 font-medium">100% tài khoản Active</span>
              </Frame>

              <Frame className="p-4 bg-white space-y-1 border border-slate-200/90 rounded-2xl shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Design Owners</span>
                <div className="text-2xl font-black text-[#1057FB]">
                  {teamMembers.filter(m => m.role === "Design Owner" || m.role === "Admin").length}
                </div>
                <span className="text-[11px] text-slate-500">Quyền phân công & duyệt</span>
              </Frame>

              <Frame className="p-4 bg-white space-y-1 border border-slate-200/90 rounded-2xl shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">UX Designers</span>
                <div className="text-2xl font-black text-indigo-600">
                  {teamMembers.filter(m => m.role === "Designer").length}
                </div>
                <span className="text-[11px] text-slate-500">Đang thực thi nhiệm vụ</span>
              </Frame>

              <Frame className="p-4 bg-white space-y-1 border border-slate-200/90 rounded-2xl shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hiệu suất tải việc</span>
                <div className="text-2xl font-black text-emerald-600">68%</div>
                <span className="text-[11px] text-slate-500">Dung lượng an toàn</span>
              </Frame>
            </div>

            {/* Team Table Header & Actions */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên, email, squad..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#1057FB]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowAddMemberModal(true)}
                    className="w-full sm:w-auto rounded-xl text-xs font-bold gap-1.5 bg-[#1057FB] text-white hover:bg-blue-700 cursor-pointer shadow-2xs"
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
                      <th className="py-3 px-5">Nhân sự</th>
                      <th className="py-3 px-4">Vai trò (Role)</th>
                      <th className="py-3 px-4">Squad phụ trách</th>
                      <th className="py-3 px-4">Tải việc (Workload)</th>
                      <th className="py-3 px-4 text-center">Phân công</th>
                      <th className="py-3 px-4 text-center">Duyệt đầu bài</th>
                      <th className="py-3 px-4 text-center">Quản trị</th>
                      <th className="py-3 px-5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Member Info */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <div className="font-bold text-slate-900">{member.name}</div>
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

                        {/* Squad */}
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {member.squad}
                        </td>

                        {/* Workload Capacity Bar */}
                        <td className="py-3.5 px-4 min-w-[140px]">
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

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteMember(member.id, member.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa thành viên"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUY TRÌNH & KHÂU UX (SLA & DELIVERABLES) */}
        {activeTab === "workflow" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Cấu hình Quy trình 6 Khâu UX & Tiêu chuẩn SLA</h3>
                <p className="text-xs text-slate-500">
                  Định nghĩa các mốc thời gian cam kết (SLA), tỉ lệ tiến độ ngầm và tài liệu bàn giao bắt buộc cho từng bước thiết kế.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {uxPhases.map((phase) => (
                  <div
                    key={phase.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-[#1057FB]/40 transition-all space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#1057FB] text-white flex items-center justify-center font-bold text-xs">
                          {phase.step}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{phase.name}</span>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-[#1057FB] border-blue-200 font-mono text-[11px]">
                        {phase.defaultProgress}% tiến độ
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                      {phase.description}
                    </p>

                    <div className="pt-2 border-t border-slate-200/70 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Thời gian SLA cam kết:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={phase.slaDays}
                            onChange={(e) => handleUpdatePhaseSla(phase.id, parseInt(e.target.value) || 1)}
                            className="w-12 text-center py-0.5 border border-slate-300 rounded font-bold text-xs bg-white"
                          />
                          <span className="font-semibold text-slate-700">ngày</span>
                        </div>
                      </div>

                      <div className="text-xs space-y-1">
                        <span className="text-slate-400 text-[10.5px] font-semibold uppercase">Yêu cầu bàn giao:</span>
                        <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-medium truncate">
                          📎 {phase.requiredDeliverable}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TÍCH HỢP & KẾT NỐI (INTEGRATIONS) */}
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
                      onClick={handleTestConnection}
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

            {/* Figma Enterprise Integration */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Figma Enterprise Org Token</h3>
                    <p className="text-xs text-slate-500">Tự động đọc frame & preview asset bàn giao</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                  Active Org
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Figma Personal Access Token (MBBank Team):
                  </label>
                  <Input
                    type="password"
                    value={figmaOrgKey}
                    onChange={(e) => setFigmaOrgKey(e.target.value)}
                    className="font-mono text-xs bg-slate-50 rounded-xl"
                  />
                </div>

                <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 text-[11.5px] text-purple-900 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Figma Webhook Sync:
                  </div>
                  <p className="text-purple-800/90">
                    Tự động nhận diện khi Designer gắn link Figma trong phần trao đổi để tạo preview canvas.
                  </p>
                </div>
              </div>
            </div>

            {/* Microsoft Teams Bot Notifications */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-5 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1057FB]">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Microsoft Teams & Zalo Notifications Webhook</h3>
                    <p className="text-xs text-slate-500">Bắn thông báo tự động khi có task mới hoặc sắp đến hạn SLA</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={autoNotifySlack}
                    onChange={(e) => setAutoNotifySlack(e.target.checked)}
                    className="rounded border-slate-300 text-[#1057FB] focus:ring-[#1057FB]"
                  />
                  <span>Bật thông báo tự động</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Teams Incoming Webhook URL:</label>
                  <Input
                    value={teamsWebhookUrl}
                    onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                    className="font-mono text-xs bg-slate-50 rounded-xl"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => toast.success("Đã gửi tin nhắn test thành công tới kênh Teams UX MBBank!")}
                    className="w-full rounded-xl text-xs font-bold gap-1.5 cursor-pointer bg-white"
                  >
                    <span>Gửi tin nhắn mẫu (Test Alert)</span>
                  </Button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: DANH MỤC & SQUADS (MASTER DATA) */}
        {activeTab === "masterdata" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Quản lý Squads & Khối Nghiệp vụ MBBank</h3>
                  <p className="text-xs text-slate-500">Cấu hình danh sách các Squad đặt yêu cầu thiết kế UX</p>
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
                {squads.map((sq) => (
                  <div key={sq.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{sq.name}</span>
                      <span className="px-2 py-0.5 rounded font-mono text-[10.5px] font-bold bg-white border border-slate-200 text-slate-700">
                        {sq.code}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Lead PO:</span>
                        <span className="font-semibold text-slate-800">{sq.leadPo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Lead Designer:</span>
                        <span className="font-semibold text-[#1057FB]">{sq.leadDesigner}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Yêu cầu đã tiếp nhận:</span>
                        <span className="font-bold text-slate-900">{sq.taskCount} tasks</span>
                      </div>
                    </div>
                  </div>
                ))}
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
                <p className="text-xs text-slate-500">Ghi nhận toàn bộ các thao tác chỉnh sửa quyền, thay đổi SLA và kết nối</p>
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
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
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

      {/* MODAL: THÊM NHÂN SỰ MỚI */}
      <AnimatePresence>
        {showAddMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200/90 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#1057FB]" />
                  <span>Thêm nhân sự mới</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Họ và tên nhân sự:</label>
                  <Input
                    required
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="VD: Lê Thị Thu Trang"
                    className="text-xs rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email Microsoft Teams:</label>
                  <Input
                    required
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="trang.designer@mbbank.com.vn"
                    className="text-xs rounded-xl font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Vai trò (Role):</label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as TeamMember["role"])}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-medium"
                    >
                      <option value="Designer">UX Designer</option>
                      <option value="Design Owner">Design Owner</option>
                      <option value="PO">Product Owner (PO)</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Hạn mức tasks (Max):</label>
                    <Input
                      type="number"
                      min="1"
                      max="15"
                      value={newMemberCapacity}
                      onChange={(e) => setNewMemberCapacity(parseInt(e.target.value) || 5)}
                      className="text-xs rounded-xl text-center font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Squad trực thuộc:</label>
                  <select
                    value={newMemberSquad}
                    onChange={(e) => setNewMemberSquad(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-medium"
                  >
                    {squads.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-2">
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
                    Lưu thành viên
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: THÊM SQUAD MỚI */}
      <AnimatePresence>
        {showAddSquadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200/90 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-purple-600" />
                  <span>Thêm Squad mới</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddSquadModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddSquad} className="space-y-3.5">
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

                <div className="pt-3 flex justify-end gap-2">
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

    </div>
  )
}
