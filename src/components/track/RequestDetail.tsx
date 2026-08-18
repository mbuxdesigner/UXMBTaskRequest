import { UXRequest } from "../../data/mockData"
import UXProgressTimeline from "./UXProgressTimeline"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
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
  BookOpen
} from "lucide-react"

interface RequestDetailProps {
  request: UXRequest
  onBack: () => void
}

const statusBadgeVariant: Record<string, "info" | "warning" | "success" | "purple" | "secondary"> = {
  "Đang thực hiện": "info",
  "Đang phân loại": "warning",
  "Đang khám phá": "purple",
  "Hoàn thành": "success",
  "Đã gửi": "secondary",
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5 border-b border-slate-100 last:border-0 grid grid-cols-1 sm:grid-cols-5 gap-1.5 sm:gap-4 text-xs">
      <p className="text-slate-400 sm:col-span-2 font-medium">{label}</p>
      <p className="text-slate-800 sm:col-span-3 font-semibold leading-relaxed">{value || "—"}</p>
    </div>
  )
}

export default function RequestDetail({ request, onBack }: RequestDetailProps) {
  const badgeVariant = statusBadgeVariant[request.status] ?? "secondary"

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="rounded-xl flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="navy" className="font-mono font-bold">
                {request.request_id}
              </Badge>
              <Badge variant={badgeVariant} dot>
                {request.status}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              {request.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Progress card */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">Tiến độ thiết kế UX</span>
            <span className="font-bold text-navy text-sm">{request.progress}%</span>
          </div>
          <Progress
            value={request.progress}
            variant={request.progress === 100 ? "success" : "default"}
            size="md"
          />
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>Giai đoạn hiện tại: <strong className="text-navy">{request.current_phase}</strong></span>
            <span>Cập nhật ngày: {request.last_updated}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Request Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FileText className="w-4 h-4 text-navy" />
                Thông tin yêu cầu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <DetailRow label="Người gửi yêu cầu" value={request.requester_email} />
              <DetailRow label="Sản phẩm / Nền tảng" value={request.product} />
              <DetailRow label="Loại yêu cầu" value={request.request_type} />
              <DetailRow label="Tính năng / Hành trình" value={request.feature_journey || request.title} />
              <DetailRow label="Mô tả chi tiết" value={request.description} />
              <DetailRow label="Bối cảnh kinh doanh" value={request.business_need} />
              <DetailRow label="Vấn đề người dùng" value={request.user_problem} />
              <DetailRow label="Đối tượng mục tiêu" value={request.target_user || "Khách hàng cá nhân MBBank"} />
              
              {request.expected_output && request.expected_output.length > 0 && (
                <div className="py-2.5 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-5 gap-1.5 sm:gap-4 text-xs">
                  <p className="text-slate-400 sm:col-span-2 font-medium">Output kỳ vọng</p>
                  <div className="sm:col-span-3 flex flex-wrap gap-1.5">
                    {request.expected_output.map((o) => (
                      <Badge key={o} variant="secondary" size="sm">
                        {o}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <DetailRow label="Hạn release dự kiến" value={request.expected_deadline || "—"} />
              <DetailRow label="Ngày gửi" value={request.submitted_at || "—"} />
            </CardContent>
          </Card>

          {/* Latest Update Alert */}
          {request.latest_update && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal" />
                  Cập nhật tiến độ mới nhất
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert variant="navy" icon={<Sparkles className="w-4 h-4 text-navy" />}>
                  <div className="flex items-center justify-between gap-2">
                    <AlertTitle>{request.latest_update.phase}</AlertTitle>
                    <span className="text-[11px] text-slate-400 font-mono">{request.latest_update.date}</span>
                  </div>
                  <AlertDescription className="mt-1.5 text-slate-700">
                    {request.latest_update.message}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Deliverables */}
          {(request.deliverables?.figma_url ||
            request.deliverables?.prototype_url ||
            request.deliverables?.spec_url) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Sản phẩm bàn giao (Deliverables)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {request.deliverables.figma_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={request.deliverables.figma_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gap-2"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path d="M5 5.5C5 3.567 6.567 2 8.5 2H12V9H8.5C6.567 9 5 7.433 5 5.5Z" fill="#F24E1E"/>
                          <path d="M12 2H15.5C17.433 2 19 3.567 19 5.5C19 7.433 17.433 9 15.5 9H12V2Z" fill="#FF7262"/>
                          <path d="M12 9H15.5C17.433 9 19 10.567 19 12.5C19 14.433 17.433 16 15.5 16H12V9Z" fill="#1ABCFE"/>
                          <path d="M5 12.5C5 10.567 6.567 9 8.5 9H12V16H8.5C6.567 16 5 14.433 5 12.5Z" fill="#A259FF"/>
                          <path d="M5 19.5C5 17.567 6.567 16 8.5 16H12V19.5C12 21.433 10.433 23 8.5 23C6.567 23 5 21.433 5 19.5Z" fill="#0ACF83"/>
                        </svg>
                        <span>Mở file Figma</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </Button>
                  )}
                  {request.deliverables.prototype_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={request.deliverables.prototype_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gap-2"
                      >
                        <PlaySquare className="w-4 h-4 text-blue-600" />
                        <span>Xem Prototype</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </Button>
                  )}
                  {request.deliverables.spec_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={request.deliverables.spec_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gap-2"
                      >
                        <BookOpen className="w-4 h-4 text-teal" />
                        <span>UX Specification</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* UX Progress 7-phase timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Layers className="w-4 h-4 text-navy" />
                Tiến trình 7 Giai đoạn UX
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UXProgressTimeline phases={request.phases} />
            </CardContent>
          </Card>

          {/* UX Team Squad Assignment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal" />
                Đội ngũ UX phụ trách
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="text-[11px] text-slate-400 font-medium">UX Squad</p>
                <p className="text-sm font-bold text-slate-900">{request.squad_name}</p>
              </div>

              <div className="p-3 bg-navy-50/70 border border-navy-100 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-navy text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                  {request.ux_owner
                    ? request.ux_owner.split(" ").map((n) => n[0]).join("").slice(0, 2)
                    : "UX"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{request.ux_owner || "UX Designer phụ trách"}</p>
                  <p className="text-[11px] text-slate-500">UX Lead / Owner</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
