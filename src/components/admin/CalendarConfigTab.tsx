import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Frame } from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  CalendarConfig,
  EventCategoryConfig,
  CalendarViewMode,
  getSystemConfig,
  saveSystemConfig,
  DEFAULT_CALENDAR_CONFIG,
  SYSTEM_CONFIG_EVENT_NAME,
} from "@/config/systemConfig"
import { fetchTeamLeaves, TeamLeaveRecord } from "@/services/leaveService"
import { UserRole } from "@/data/mockData"
import {
  Calendar as CalendarIcon,
  ShieldCheck,
  Tag,
  Palmtree,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit3,
  X,
  Sliders,
  RefreshCw,
  Sparkles,
} from "lucide-react"

interface CalendarConfigTabProps {
  onLogAction?: (action: string, target: string, details: string, type: "workflow" | "masterdata" | "security") => void
}

const ALL_ROLES: UserRole[] = ["Admin", "Design Owner", "Designer", "PO", "Business"]

const COLOR_PRESETS = [
  { label: "Blue", hex: "#3b82f6" },
  { label: "Amber", hex: "#f59e0b" },
  { label: "Purple", hex: "#8b5cf6" },
  { label: "Emerald", hex: "#10b981" },
  { label: "Cyan", hex: "#06b6d4" },
  { label: "Rose", hex: "#f43f5e" },
  { label: "Indigo", hex: "#6366f1" },
  { label: "Teal", hex: "#14b8a6" },
]

export default function CalendarConfigTab({ onLogAction }: CalendarConfigTabProps) {
  const [config, setConfig] = useState<CalendarConfig>(() => {
    const sys = getSystemConfig()
    const cal = sys?.calendar || DEFAULT_CALENDAR_CONFIG
    return {
      ...DEFAULT_CALENDAR_CONFIG,
      ...cal,
      rolePermissions: {
        ...DEFAULT_CALENDAR_CONFIG.rolePermissions,
        ...(cal?.rolePermissions || {}),
      },
      eventCategories: Array.isArray(cal?.eventCategories) && cal.eventCategories.length > 0
        ? cal.eventCategories
        : DEFAULT_CALENDAR_CONFIG.eventCategories,
      teamEvents: Array.isArray(cal?.teamEvents) ? cal.teamEvents : [],
    }
  })

  const [leavesList, setLeavesList] = useState<TeamLeaveRecord[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [isSyncingLeaves, setIsSyncingLeaves] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // State cho thêm/sửa Category
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState<{ name: string; color: string; description: string }>({
    name: "",
    color: "#3b82f6",
    description: "",
  })
  const [showAddCatModal, setShowAddCatModal] = useState(false)

  // Lắng nghe sự thay đổi system config từ các tab khác
  useEffect(() => {
    const handleConfigChange = () => {
      const sys = getSystemConfig()
      const cal = sys?.calendar || DEFAULT_CALENDAR_CONFIG
      setConfig({
        ...DEFAULT_CALENDAR_CONFIG,
        ...cal,
        rolePermissions: {
          ...DEFAULT_CALENDAR_CONFIG.rolePermissions,
          ...(cal?.rolePermissions || {}),
        },
        eventCategories: Array.isArray(cal?.eventCategories) && cal.eventCategories.length > 0
          ? cal.eventCategories
          : DEFAULT_CALENDAR_CONFIG.eventCategories,
        teamEvents: Array.isArray(cal?.teamEvents) ? cal.teamEvents : [],
      })
    }
    window.addEventListener(SYSTEM_CONFIG_EVENT_NAME, handleConfigChange)
    return () => window.removeEventListener(SYSTEM_CONFIG_EVENT_NAME, handleConfigChange)
  }, [])

  // Tải trạng thái lịch nghỉ hiện có
  useEffect(() => {
    fetchTeamLeaves(false).then((res) => {
      if (Array.isArray(res)) {
        setLeavesList(res)
      }
    })
  }, [])

  // Lưu cấu hình
  const handleSave = () => {
    setIsSaving(true)
    try {
      const currentFullConfig = getSystemConfig()
      const updated = {
        ...currentFullConfig,
        calendar: { ...config },
      }
      saveSystemConfig(updated)
      onLogAction?.("update_calendar_config", "UX Planner Settings", "Cập nhật cấu hình Calendar & phân quyền Role", "workflow")
      toast.success("Đã lưu cấu hình UX Team Planner thành công!")
    } catch {
      toast.error("Không thể lưu cấu hình, vui lòng thử lại!")
    } finally {
      setIsSaving(false)
    }
  }

  // Khôi phục mặc định
  const handleReset = () => {
    if (window.confirm("Bạn có chắc chắn muốn khôi phục toàn bộ cài đặt Calendar về mặc định?")) {
      setConfig(DEFAULT_CALENDAR_CONFIG)
      const currentFullConfig = getSystemConfig()
      saveSystemConfig({
        ...currentFullConfig,
        calendar: DEFAULT_CALENDAR_CONFIG,
      })
      onLogAction?.("reset_calendar_config", "UX Planner Settings", "Khôi phục cấu hình Calendar mặc định", "workflow")
      toast.success("Đã khôi phục cài đặt Calendar về mặc định!")
    }
  }

  // Thử đồng bộ lại lịch nghỉ phép
  const handleManualSyncLeaves = async () => {
    setIsSyncingLeaves(true)
    try {
      const res = await fetchTeamLeaves(true)
      const list = Array.isArray(res) ? res : []
      setLeavesList(list)
      setLastSyncTime(new Date().toISOString())
      toast.success(`Đã quét thành công ${list.length} bản ghi lịch nghỉ phép!`)
    } catch {
      toast.error("Lỗi khi kết nối tới nguồn dữ liệu lịch nghỉ phép!")
    } finally {
      setIsSyncingLeaves(false)
    }
  }

  // Toggle role permission
  const toggleRolePermission = (
    permissionType: "viewCalendar" | "manageEvents" | "modifyDeadlines",
    role: string
  ) => {
    setConfig((prev) => {
      const perms = prev.rolePermissions || DEFAULT_CALENDAR_CONFIG.rolePermissions
      const currentList = perms[permissionType] || []
      const exists = currentList.includes(role)
      const updated = exists ? currentList.filter((r) => r !== role) : [...currentList, role]
      return {
        ...prev,
        rolePermissions: {
          ...perms,
          [permissionType]: updated,
        },
      }
    })
  }

  // Thêm Category mới
  const handleCreateCategory = () => {
    if (!catForm.name.trim()) {
      toast.error("Vui lòng nhập tên loại sự kiện!")
      return
    }
    const newCat: EventCategoryConfig = {
      id: `cat-custom-${Date.now()}`,
      name: catForm.name.trim(),
      color: catForm.color,
      description: catForm.description.trim(),
      isSystem: false,
    }
    setConfig((prev) => ({
      ...prev,
      eventCategories: [...prev.eventCategories, newCat],
    }))
    setShowAddCatModal(false)
    setCatForm({ name: "", color: "#3b82f6", description: "" })
    toast.success("Đã thêm loại sự kiện mới!")
  }

  // Sửa Category
  const handleStartEditCategory = (cat: EventCategoryConfig) => {
    setEditingCatId(cat.id)
    setCatForm({
      name: cat.name,
      color: cat.color,
      description: cat.description || "",
    })
  }

  const handleSaveEditCategory = (catId: string) => {
    if (!catForm.name.trim()) {
      toast.error("Tên loại sự kiện không được để trống!")
      return
    }
    setConfig((prev) => ({
      ...prev,
      eventCategories: prev.eventCategories.map((c) =>
        c.id === catId
          ? {
              ...c,
              name: catForm.name.trim(),
              color: catForm.color,
              description: catForm.description.trim(),
            }
          : c
      ),
    }))
    setEditingCatId(null)
    setCatForm({ name: "", color: "#3b82f6", description: "" })
    toast.success("Đã cập nhật loại sự kiện!")
  }

  // Xóa Category
  const handleDeleteCategory = (catId: string) => {
    const cat = config.eventCategories.find((c) => c.id === catId)
    if (cat?.isSystem) {
      toast.error("Không thể xóa danh mục mặc định của hệ thống!")
      return
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa loại sự kiện "${cat?.name}"?`)) {
      setConfig((prev) => ({
        ...prev,
        eventCategories: prev.eventCategories.filter((c) => c.id !== catId),
      }))
      toast.success("Đã xóa loại sự kiện!")
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Cấu hình UX Team Planner & Lịch Làm Việc
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Thiết lập chế độ xem, phân quyền truy cập, danh mục sự kiện và quy tắc cảnh báo xung đột lịch nghỉ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Khôi phục</span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={isSaving}
            onClick={handleSave}
            className="gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</span>
          </Button>
        </div>
      </div>

      {/* 2. Grid 2 Cột: Cài đặt hiển thị + Phân quyền Role */}
      {/* 2. Cấu hình Hiển thị & Quy tắc Hoạt động */}
      <Frame variant="default" padding="default" className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Quy tắc Hiển thị & Hoạt động</h3>
              <p className="text-[11px] text-slate-500">Thiết lập chế độ xem mặc định, lịch làm việc và các quy tắc hiển thị lưới lịch</p>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
            <span>Phân quyền vai trò quản trị tại mục <strong>Quản lý &gt; Phân quyền</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Cột trái: Chế độ xem & Bắt đầu tuần */}
          <div className="space-y-4">
            {/* Chế độ xem mặc định */}
            <div>
              <label className="block font-semibold text-slate-700 mb-2">
                Chế độ xem mặc định khi mở màn hình:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "month", label: "Tháng (Month)" },
                  { id: "week", label: "Tuần (Week)" },
                  { id: "day", label: "Ngày (Day)" },
                ].map((mode) => {
                  const isActive = config.defaultView === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setConfig({ ...config, defaultView: mode.id as CalendarViewMode })}
                      className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer font-semibold ${
                        isActive
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {mode.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Ngày bắt đầu tuần */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block font-semibold text-slate-700 mb-2">
                Ngày bắt đầu trong tuần:
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="startOfWeek"
                    checked={config.startOfWeek === "monday"}
                    onChange={() => setConfig({ ...config, startOfWeek: "monday" })}
                    className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900/30 accent-slate-900"
                  />
                  <span className="text-slate-700 font-medium">Thứ Hai (Chuẩn ISO / MBBank)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="startOfWeek"
                    checked={config.startOfWeek === "sunday"}
                    onChange={() => setConfig({ ...config, startOfWeek: "sunday" })}
                    className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900/30 accent-slate-900"
                  />
                  <span className="text-slate-700 font-medium">Chủ Nhật</span>
                </label>
              </div>
            </div>

            {/* Khung giờ làm việc tiêu chuẩn */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giờ bắt đầu làm việc:</label>
                <Input
                  type="time"
                  value={config.workingHoursStart || "08:00"}
                  onChange={(e) => setConfig({ ...config, workingHoursStart: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giờ kết thúc làm việc:</label>
                <Input
                  type="time"
                  value={config.workingHoursEnd || "18:00"}
                  onChange={(e) => setConfig({ ...config, workingHoursEnd: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Cột phải: Các công tắc bật tắt */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
              <div className="pr-3">
                <div className="font-semibold text-slate-800">Cảnh báo xung đột lịch trình (Conflict Alert)</div>
                <div className="text-[11px] text-slate-500">Phát cảnh báo khi deadline task trùng ngày nhân sự nghỉ phép</div>
              </div>
              <Switch
                checked={config.enableConflictAlert}
                onCheckedChange={(checked) => setConfig({ ...config, enableConflictAlert: checked })}
                size="sm"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
              <div className="pr-3">
                <div className="font-semibold text-slate-800">Hiển thị ngày cuối tuần (Thứ 7 & Chủ Nhật)</div>
                <div className="text-[11px] text-slate-500">Bật để hiển thị 7 ngày trên lưới lịch tháng và tuần</div>
              </div>
              <Switch
                checked={config.showWeekends}
                onCheckedChange={(checked) => setConfig({ ...config, showWeekends: checked })}
                size="sm"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
              <div className="pr-3">
                <div className="font-semibold text-slate-800">Làm mờ giờ ngoài hành chính</div>
                <div className="text-[11px] text-slate-500">Làm nổi bật khoảng thời gian 08:00 - 18:00 trên chế độ xem Tuần/Ngày</div>
              </div>
              <Switch
                checked={config.lightenNonWorkingHours}
                onCheckedChange={(checked) => setConfig({ ...config, lightenNonWorkingHours: checked })}
                size="sm"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
              <div className="pr-3">
                <div className="font-semibold text-slate-800">Hiển thị số thứ tự tuần (Week numbers)</div>
                <div className="text-[11px] text-slate-500">Đánh số thứ tự các tuần (W1 → W52) ở cột đầu lưới tháng</div>
              </div>
              <Switch
                checked={config.showWeekNumbers}
                onCheckedChange={(checked) => setConfig({ ...config, showWeekNumbers: checked })}
                size="sm"
              />
            </div>
          </div>
        </div>
      </Frame>

      {/* 3. Card Quản lý Danh mục Sự kiện Team */}
      <Frame variant="default" padding="default" className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Danh mục Phân loại Sự kiện Team (Event Categories)</h3>
              <p className="text-[11px] text-slate-500">Định dạng màu sắc, biểu tượng và mục đích cho các loại cuộc họp, workshop, teambuilding</p>
            </div>
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              setCatForm({ name: "", color: "#3b82f6", description: "" })
              setShowAddCatModal(true)
            }}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm loại sự kiện</span>
          </Button>
        </div>

        {/* Danh sách categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(config.eventCategories || []).map((cat) => {
            const isEditing = editingCatId === cat.id

            if (isEditing) {
              return (
                <div key={cat.id} className="p-3.5 rounded-xl border-2 border-slate-900 bg-white shadow-xs space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tên loại sự kiện:</label>
                    <Input
                      type="text"
                      value={catForm.name}
                      onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mã màu đại diện:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={catForm.color}
                        onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                        className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0"
                      />
                      <Input
                        type="text"
                        value={catForm.color}
                        onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                        className="h-8 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mô tả:</label>
                    <Input
                      type="text"
                      value={catForm.description}
                      onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingCatId(null)}
                      className="h-7 text-xs px-2.5 text-slate-600"
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => handleSaveEditCategory(cat.id)}
                      className="h-7 text-xs px-3"
                    >
                      Lưu
                    </Button>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={cat.id}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-2 shadow-2xs group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs ring-1 ring-black/5"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="font-semibold text-xs text-slate-900 truncate">{cat.name}</div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditCategory(cat)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {!cat.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                        title="Xóa loại sự kiện"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 line-clamp-2">
                  {cat.description || "Chưa có mô tả chi tiết"}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{cat.color}</span>
                  {cat.isSystem && <Badge variant="secondary" size="xs">Hệ thống</Badge>}
                </div>
              </div>
            )
          })}
        </div>
      </Frame>

      {/* 4. Card Trạng Thái Đồng Bộ Lịch Nghỉ Phép (Team Leaves Gateway) */}
      <Frame variant="default" padding="default" className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-700 border border-pink-200/80 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Palmtree className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Trạng thái Cổng Lịch Nghỉ Phép (Team Leaves)</h3>
                <Badge variant="success" size="xs" dot>
                  Đang kết nối
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dữ liệu nghỉ phép đồng bộ tự động từ tab "Đăng ký nghỉ" (Cột C, D, E, G) trên Google Sheets
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSyncingLeaves}
            onClick={handleManualSyncLeaves}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncingLeaves ? "animate-spin" : ""}`} />
            <span>{isSyncingLeaves ? "Đang quét..." : "Quét & Đồng bộ lại ngay"}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <div className="text-slate-500 text-[11px] font-medium">Tổng số lượt nghỉ trong bộ nhớ:</div>
            <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
              {leavesList.length} <span className="text-xs font-sans font-normal text-slate-500">lượt</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <div className="text-slate-500 text-[11px] font-medium">Nhân sự đang nghỉ hôm nay:</div>
            <div className="text-xl font-bold text-pink-600 mt-1 font-mono">
              {leavesList.filter((l) => l.fromDate?.includes("2026") || l.date?.includes("2026")).length} <span className="text-xs font-sans font-normal text-slate-500">nhân sự</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <div className="text-slate-500 text-[11px] font-medium">Lần đồng bộ gần nhất:</div>
            <div className="text-xs font-semibold text-slate-700 mt-1.5">
              {lastSyncTime
                ? new Date(lastSyncTime).toLocaleTimeString("vi-VN") + " - " + new Date(lastSyncTime).toLocaleDateString("vi-VN")
                : "Vừa xong"}
            </div>
          </div>
        </div>
      </Frame>

      {/* Modal Thêm Category mới với Dialog chuẩn */}
      {typeof document !== "undefined" &&
        createPortal(
          <Dialog
            open={showAddCatModal}
            onClose={() => setShowAddCatModal(false)}
            size="sm"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-700" />
                <span>Thêm loại sự kiện mới</span>
              </DialogTitle>
              <button
                type="button"
                onClick={() => setShowAddCatModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </DialogHeader>

            <DialogBody className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên loại sự kiện *</label>
                <Input
                  type="text"
                  placeholder="Ví dụ: Demo Prototype với Khối Vận hành"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Màu sắc nhận diện:</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={catForm.color}
                    onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setCatForm({ ...catForm, color: p.hex })}
                        style={{ backgroundColor: p.hex }}
                        className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                          catForm.color === p.hex ? "scale-110 ring-2 ring-slate-900 ring-offset-1 border-white" : "border-transparent"
                        }`}
                        title={p.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả mục đích:</label>
                <Textarea
                  rows={3}
                  placeholder="Mô tả phạm vi hoặc đối tượng tham dự..."
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddCatModal(false)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleCreateCategory}
              >
                Tạo danh mục
              </Button>
            </DialogFooter>
          </Dialog>,
          document.body
        )}
    </div>
  )
}
