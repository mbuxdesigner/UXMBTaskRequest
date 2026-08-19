import { useState } from "react"
import { UXRequest, TaskUpdateRecord } from "../../data/mockData"
import UXProgressTimeline from "./UXProgressTimeline"
import UpdateProgressModal from "./UpdateProgressModal"
import { getStoredSession } from "../../services/otpAuthService"
import { Frame, FrameHeader, FrameTitle, FrameDescription, FrameBody, FrameActions } from "@/components/reui/frame"
import { IconTile } from "@/components/reui/icon-tile"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { getStatusConfig } from "@/config/statusConfig"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  ExternalLink, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Layers, 
  Calendar, 
  Mail,
  PlaySquare,
  BookOpen,
  Share2,
  Check,
  Tag,
  Building,
  Target,
  Edit3,
  Shield,
  MessageSquareQuote
} from "lucide-react"

interface RequestDetailProps {
  request: UXRequest
  onBack: () => void
  onUpdated?: () => void
}



function DetailRow({
  icon,
  label,
  value,
  children,
}: {
  icon?: React.ReactNode
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="py-3 border-b border-slate-100/90 last:border-0 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
      <div className="flex items-center gap-2 text-slate-500 sm:col-span-1 font-semibold">
        {icon}
        <span>{label}</span>
      </div>
      <div className="sm:col-span-3 text-slate-800 font-medium leading-relaxed">
        {children || value || "—"}
      </div>
    </div>
  )
}

export default function RequestDetail({ request, onBack, onUpdated }: RequestDetailProps) {
  const [activeTab, setActiveTab] = useState<string>("info")
  const [copied, setCopied] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)

  const session = getStoredSession()
  const statusConfig = getStatusConfig(request.status)

  // RBAC Permission Check
  const canEdit = (() => {
    if (!session) return true // Local fallback
    if (session.role === "Admin" || session.role === "Design Owner") return true
    if (session.role === "Designer") {
      const email = session.teamsEmail.toLowerCase()
      const assigned = (request.assigned_designer || request.ux_owner || "").toLowerCase()
      return !assigned || assigned.includes(email) || email.includes("designer") || email.includes("nam")
    }
    return false // PO is read-only
  })()

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const updatesList: TaskUpdateRecord[] = request.task_updates && request.task_updates.length > 0
    ? request.task_updates
    : request.latest_update
    ? [
        {
          id: "INIT-1",
          request_id: request.request_id,
          timestamp: request.last_updated || request.submitted_at || "19/08/2026",
          updated_by: request.assigned_designer || request.ux_owner || "Hệ thống",
          author_role: "Designer",
          new_phase: request.current_phase,
          new_progress: request.progress,
          note: request.latest_update.message,
          deliverable_link: request.deliverables?.figma_url,
        },
      ]
    : []

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="rounded-xl shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="navy" size="xs" className="font-mono font-bold">
                {request.request_id}
              </Badge>
              <Badge
                variant={statusConfig.variant}
                dot
                dotColor={statusConfig.dotColor}
                size="xs"
              >
                {request.status}
              </Badge>
              <span className="text-xs text-slate-400 font-medium">
                • {request.product}
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              {request.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Action button for Designer / Design Owner / Admin */}
          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsUpdateModalOpen(true)}
              className="gap-2 text-xs font-bold shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#0D9B97]" />
              <span>Cập nhật tiến độ & Ghi Note</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-1.5 text-xs font-semibold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? "Đã sao chép" : "Chia sẻ"}</span>
          </Button>
        </div>
      </div>

      {/* Progress & Milestone Overview */}
      <Frame variant="accent" padding="default" className="bg-gradient-to-r from-white via-white to-slate-50">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-400">Tiến độ thiết kế UX & Bàn giao</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                Giai đoạn: <span className="text-[#1B3A6B]">{request.current_phase}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-[#1B3A6B]">{request.progress}%</span>
              <Badge variant={request.progress === 100 ? "success" : "navy"} size="sm">
                {request.progress === 100 ? "Hoàn tất" : "Đang xử lý"}
              </Badge>
            </div>
          </div>
          <Progress
            value={request.progress}
            variant={request.progress === 100 ? "success" : "default"}
            size="md"
          />
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Ngày gửi: <strong className="text-slate-700">{request.submitted_at || "19/08/2026"}</strong></span>
            <span>Cập nhật gần nhất: <strong className="text-slate-700">{request.last_updated}</strong></span>
          </div>
        </div>
      </Frame>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} variant="pills">
            <TabsList>
              <TabsTrigger value="info" icon={<FileText className="w-3.5 h-3.5" />}>
                Thông tin chi tiết
              </TabsTrigger>
              <TabsTrigger value="deliverables" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                Sản phẩm & Deliverables
              </TabsTrigger>
              <TabsTrigger value="updates" icon={<Clock className="w-3.5 h-3.5" />} badge={updatesList.length}>
                Nhật ký cập nhật ({updatesList.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Frame>
                <FrameHeader>
                  <FrameTitle>
                    <IconTile size="xs" variant="navy"><FileText className="w-3.5 h-3.5" /></IconTile>
                    Hồ sơ yêu cầu thiết kế UX
                  </FrameTitle>
                </FrameHeader>
                <FrameBody>
                  <DetailRow
                    icon={<Mail className="w-3.5 h-3.5 text-slate-400" />}
                    label="Người yêu cầu"
                    value={request.requester_email}
                  />
                  <DetailRow
                    icon={<Building className="w-3.5 h-3.5 text-slate-400" />}
                    label="Sản phẩm / Kênh"
                    value={request.product}
                  />
                  <DetailRow
                    icon={<Tag className="w-3.5 h-3.5 text-slate-400" />}
                    label="Loại yêu cầu"
                    value={request.request_type}
                  />
                  <DetailRow
                    icon={<Layers className="w-3.5 h-3.5 text-slate-400" />}
                    label="Tính năng / Hành trình"
                    value={request.feature_journey || request.title}
                  />
                  <DetailRow label="Mô tả chi tiết">
                    <p className="whitespace-pre-line text-slate-700 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs">
                      {request.description}
                    </p>
                  </DetailRow>
                  {request.business_need && (
                    <DetailRow label="Bối cảnh kinh doanh">
                      <p className="text-slate-700 leading-relaxed text-xs">
                        {request.business_need}
                      </p>
                    </DetailRow>
                  )}
                  {request.user_problem && (
                    <DetailRow label="Vấn đề người dùng">
                      <p className="text-slate-700 leading-relaxed text-xs">
                        {request.user_problem}
                      </p>
                    </DetailRow>
                  )}
                  <DetailRow
                    icon={<Target className="w-3.5 h-3.5 text-slate-400" />}
                    label="Đối tượng mục tiêu"
                    value={request.target_user || "Khách hàng cá nhân MBBank"}
                  />
                  {request.expected_output && request.expected_output.length > 0 && (
                    <DetailRow label="Output kỳ vọng">
                      <div className="flex flex-wrap gap-1.5">
                        {request.expected_output.map((out) => (
                          <Badge key={out} variant="secondary" size="xs">
                            {out}
                          </Badge>
                        ))}
                      </div>
                    </DetailRow>
                  )}
                  <DetailRow
                    icon={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
                    label="Hạn release dự kiến"
                    value={request.expected_deadline || "—"}
                  />
                </FrameBody>
              </Frame>
            </TabsContent>

            <TabsContent value="deliverables">
              <Frame>
                <FrameHeader>
                  <FrameTitle>
                    <IconTile size="xs" variant="emerald"><CheckCircle2 className="w-3.5 h-3.5" /></IconTile>
                    Liên kết bàn giao & Tài nguyên thiết kế
                  </FrameTitle>
                  <FrameDescription>
                    Tất cả tài liệu Figma, Prototype và Design Specs chính thức.
                  </FrameDescription>
                </FrameHeader>
                <FrameBody>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                    {/* Figma */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#1B3A6B]/40 hover:shadow-xs transition-all space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M5 5.5C5 3.567 6.567 2 8.5 2H12V9H8.5C6.567 9 5 7.433 5 5.5Z" fill="#F24E1E"/>
                            <path d="M12 2H15.5C17.433 2 19 3.567 19 5.5C19 7.433 17.433 9 15.5 9H12V2Z" fill="#FF7262"/>
                            <path d="M12 9H15.5C17.433 9 19 10.567 19 12.5C19 14.433 17.433 16 15.5 16H12V9Z" fill="#1ABCFE"/>
                            <path d="M5 12.5C5 10.567 6.567 9 8.5 9H12V16H8.5C6.567 16 5 14.433 5 12.5Z" fill="#A259FF"/>
                            <path d="M5 19.5C5 17.567 6.567 16 8.5 16H12V19.5C12 21.433 10.433 23 8.5 23C6.567 23 5 21.433 5 19.5Z" fill="#0ACF83"/>
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">File thiết kế Figma</h4>
                          <p className="text-[11px] text-slate-400">Design System & Screens</p>
                        </div>
                      </div>
                      {request.deliverables?.figma_url ? (
                        <Button variant="outline" size="sm" className="w-full justify-between font-semibold" asChild>
                          <a href={request.deliverables.figma_url} target="_blank" rel="noreferrer">
                            <span>Mở Figma Canvas</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </a>
                        </Button>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Chưa có liên kết</p>
                      )}
                    </div>

                    {/* Prototype */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#0D9B97]/40 hover:shadow-xs transition-all space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-[#0D9B97]">
                          <PlaySquare className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">Interactive Prototype</h4>
                          <p className="text-[11px] text-slate-400">Trải nghiệm tương tác luồng</p>
                        </div>
                      </div>
                      {request.deliverables?.prototype_url ? (
                        <Button variant="teal" size="sm" className="w-full justify-between font-semibold" asChild>
                          <a href={request.deliverables.prototype_url} target="_blank" rel="noreferrer">
                            <span>Chạy Prototype</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Đang xây dựng</p>
                      )}
                    </div>

                    {/* Specification */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">UX Spec & Handoff</h4>
                          <p className="text-[11px] text-slate-400">Quy chuẩn UI và tài liệu Dev</p>
                        </div>
                      </div>
                      {request.deliverables?.spec_url ? (
                        <Button variant="outline" size="sm" className="w-full justify-between font-semibold" asChild>
                          <a href={request.deliverables.spec_url} target="_blank" rel="noreferrer">
                            <span>Xem tài liệu Spec</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </a>
                        </Button>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Sẽ cập nhật ở khâu Handoff</p>
                      )}
                    </div>
                  </div>
                </FrameBody>
              </Frame>
            </TabsContent>

            <TabsContent value="updates">
              <Frame>
                <FrameHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <FrameTitle>
                        <IconTile size="xs" variant="amber"><Clock className="w-3.5 h-3.5" /></IconTile>
                        Nhật ký cập nhật tiến độ & Ghi chú
                      </FrameTitle>
                      <FrameDescription>
                        Toàn bộ lịch sử các mốc thay đổi khâu UX và ghi chú bàn giao từ Designer / Lead.
                      </FrameDescription>
                    </div>
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setIsUpdateModalOpen(true)}
                        className="gap-1 font-bold text-xs"
                      >
                        <Edit3 className="w-3 h-3 text-[#1B3A6B]" />
                        <span>Thêm Note</span>
                      </Button>
                    )}
                  </div>
                </FrameHeader>
                <FrameBody>
                  <div className="space-y-4">
                    {updatesList.map((log, idx) => (
                      <div
                        key={log.id || idx}
                        className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2 hover:border-[#1B3A6B]/30 transition-all"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="navy" size="xs">
                              {log.new_phase}
                            </Badge>
                            <Badge
                              variant={
                                log.author_role === "Admin"
                                  ? "destructive"
                                  : log.author_role === "Design Owner"
                                  ? "purple"
                                  : "secondary"
                              }
                              size="xs"
                            >
                              {log.author_role || "Designer"}
                            </Badge>
                            <span className="text-xs font-semibold text-slate-700">
                              {log.updated_by}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {log.timestamp}
                          </span>
                        </div>

                        <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line bg-white p-3 rounded-xl border border-slate-100">
                          {log.note}
                        </p>

                        {log.deliverable_link && (
                          <div className="pt-1 flex items-center justify-end">
                            <a
                              href={log.deliverable_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#1B3A6B] hover:underline font-bold inline-flex items-center gap-1"
                            >
                              <span>Xem đính kèm Figma / Deliverables</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </FrameBody>
              </Frame>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar: Timeline & Squad Team */}
        <div className="space-y-6">
          {/* UX Progress 6-phase Timeline */}
          <Frame>
            <FrameHeader>
              <FrameTitle>
                <IconTile size="xs" variant="navy"><Layers className="w-3.5 h-3.5" /></IconTile>
                Tiến trình 6 Khâu UX
              </FrameTitle>
            </FrameHeader>
            <FrameBody>
              <UXProgressTimeline phases={request.phases} />
            </FrameBody>
          </Frame>

          {/* Squad & UX Team */}
          <Frame>
            <FrameHeader>
              <FrameTitle>
                <IconTile size="xs" variant="teal"><UserCheck className="w-3.5 h-3.5" /></IconTile>
                Đội ngũ phụ trách
              </FrameTitle>
            </FrameHeader>
            <FrameBody className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="text-xs text-slate-400 font-bold">UX Squad đảm nhiệm</p>
                <p className="text-sm font-bold text-slate-900">{request.squad_name}</p>
              </div>

              {/* Assigned Designer */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="text-xs text-slate-400 font-bold">Designer chuyên trách</p>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#0D9B97]" />
                  <span>{request.assigned_designer || request.ux_owner || "Đang phân công"}</span>
                </p>
              </div>

              {/* Design Owner */}
              <div className="p-3.5 rounded-xl bg-[#1B3A6B]/5 border border-[#1B3A6B]/15 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1B3A6B] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  <Shield className="w-5 h-5 text-[#0D9B97]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {request.design_owner || "Nguyễn Văn Cường"}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">Design Owner / UX Lead</p>
                </div>
              </div>
            </FrameBody>
          </Frame>
        </div>
      </div>

      {/* Modal Cập nhật Tiến độ & Ghi Note */}
      {canEdit && (
        <UpdateProgressModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          request={request}
          session={session}
          onUpdated={() => {
            if (onUpdated) onUpdated()
          }}
        />
      )}
    </div>
  )
}
