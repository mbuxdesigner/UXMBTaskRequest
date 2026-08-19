import { useState, useEffect } from "react"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IconTile } from "@/components/reui/icon-tile"
import { UXRequest, ALL_PHASES, UserRole } from "../../data/mockData"
import { updateTaskProgress } from "../../api/api"
import { UserSession } from "../../services/otpAuthService"
import {
  Edit3,
  X,
  CheckCircle2,
  Clock,
  Layers,
  Link,
  UserCheck,
  Activity,
  FileText,
  AlertCircle,
} from "lucide-react"

interface UpdateProgressModalProps {
  isOpen: boolean
  onClose: () => void
  request: UXRequest
  session: UserSession | null
  onUpdated: () => void
}

export default function UpdateProgressModal({
  isOpen,
  onClose,
  request,
  session,
  onUpdated,
}: UpdateProgressModalProps) {
  const [phase, setPhase] = useState(request.current_phase || "Discovery")
  const [status, setStatus] = useState(request.status || "Đang thực hiện")
  const [progress, setProgress] = useState(request.progress || 30)
  const [note, setNote] = useState("")
  const [figmaUrl, setFigmaUrl] = useState(request.deliverables?.figma_url || "")
  const [assignedDesigner, setAssignedDesigner] = useState(
    request.assigned_designer || request.ux_owner || ""
  )
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isOwnerOrAdmin =
    session?.role === "Admin" || session?.role === "Design Owner"

  useEffect(() => {
    if (isOpen) {
      setPhase(request.current_phase || "Discovery")
      setStatus(request.status || "Đang thực hiện")
      setProgress(request.progress || 30)
      setNote("")
      setFigmaUrl(request.deliverables?.figma_url || "")
      setAssignedDesigner(request.assigned_designer || request.ux_owner || "")
      setErrorMsg(null)
    }
  }, [isOpen, request])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) {
      setErrorMsg("Vui lòng nhập nội dung ghi chú / nhật ký bàn giao.")
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await updateTaskProgress(request.request_id, {
        new_phase: phase,
        new_status: status,
        new_progress: progress,
        note: note.trim(),
        figma_url: figmaUrl.trim(),
        assigned_designer: isOwnerOrAdmin ? assignedDesigner.trim() : undefined,
      })

      if (res.success) {
        onUpdated()
        onClose()
      } else {
        setErrorMsg(res.message)
      }
    } catch {
      setErrorMsg("Lỗi khi lưu cập nhật. Vui lòng thử lại.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <DialogHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <IconTile size="default" variant="navy">
            <Edit3 className="w-5 h-5 text-[#0D9B97]" />
          </IconTile>
          <div>
            <div className="flex items-center gap-2">
              <DialogTitle>Cập nhật Tiến độ & Ghi chú Bàn giao</DialogTitle>
              <Badge variant="navy" size="xs">
                {request.request_id}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              {request.title} — {request.product}
            </DialogDescription>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <DialogBody className="space-y-5 py-4">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Role disclaimer banner */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Cập nhật với tư cách: <strong className="text-slate-900">{session?.teamsEmail || "Designer"}</strong>
            </span>
            <Badge
              variant={
                session?.role === "Admin"
                  ? "destructive"
                  : session?.role === "Design Owner"
                  ? "purple"
                  : "navy"
              }
              size="xs"
            >
              {session?.role || "Designer"}
            </Badge>
          </div>

          {/* Khâu thiết kế UX & Trạng thái */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Giai đoạn UX hiện tại
              </label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/15"
              >
                {ALL_PHASES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Trạng thái tổng thể
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/15"
              >
                <option value="Đang phân loại">Đang phân loại</option>
                <option value="Đang thực hiện">Đang thực hiện</option>
                <option value="Hoàn thành">Hoàn thành</option>
              </select>
            </div>
          </div>

          {/* % Tiến độ */}
          <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#1B3A6B]" />
                % Tiến độ hoàn thành
              </span>
              <span className="text-sm font-bold text-[#1B3A6B]">{progress}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-[#1B3A6B] cursor-pointer"
            />
            <div className="flex justify-between gap-1 pt-1">
              {[15, 30, 50, 70, 90, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setProgress(preset)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                    progress === preset
                      ? "bg-[#1B3A6B] text-white"
                      : "bg-white text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>

          {/* Re-assign Designer (Chỉ Design Owner / Admin) */}
          {isOwnerOrAdmin && (
            <div className="space-y-1.5 p-3.5 bg-purple-50/60 border border-purple-100 rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                <UserCheck className="w-4 h-4 text-purple-700" />
                <span>Phân công Designer phụ trách (Đặc quyền Design Owner / Admin)</span>
              </div>
              <Input
                type="text"
                value={assignedDesigner}
                onChange={(e) => setAssignedDesigner(e.target.value)}
                placeholder="Email Designer phụ trách (VD: nam.designer@mbbank.com.vn)..."
                className="h-9 text-xs bg-white rounded-xl"
              />
            </div>
          )}

          {/* Ghi chú / Note bàn giao */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Ghi chú / Nhật ký bàn giao chi tiết (*)</span>
              <span className="text-[10px] text-slate-400 normal-case">Tạo mốc nhật ký mới</span>
            </label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Đã chốt xong luồng User Flow với PO Lan. Đang tiến hành vẽ Hi-Fi UI Design trên Figma..."
              required
              className="text-xs rounded-xl resize-none"
            />
          </div>

          {/* Deliverables Link (Figma / Prototype) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-slate-400" />
              <span>Link Sản phẩm bàn giao (Figma / Prototype / Specs)</span>
            </label>
            <Input
              type="url"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              placeholder="https://www.figma.com/design/..."
              className="h-9 text-xs rounded-xl font-mono"
            />
          </div>
        </DialogBody>

        <DialogFooter className="border-t border-slate-100 pt-4 flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="font-semibold text-xs">
            Hủy bỏ
          </Button>
          <Button type="submit" size="sm" loading={loading} className="gap-2 font-bold text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9B97]" />
            <span>Lưu cập nhật & Ghi nhật ký</span>
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
