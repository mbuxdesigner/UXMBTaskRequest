import { UXRequest } from "../../data/mockData"
import UXProgressTimeline from "./UXProgressTimeline"

interface RequestDetailProps {
  request: UXRequest
  onBack: () => void
}

const statusColors: Record<string, string> = {
  "Đang thực hiện": "text-blue-600 bg-blue-50 border-blue-200",
  "Đang phân loại": "text-amber-600 bg-amber-50 border-amber-200",
  "Đang khám phá": "text-purple-600 bg-purple-50 border-purple-200",
  "Hoàn thành": "text-emerald-600 bg-emerald-50 border-emerald-200",
  "Đã gửi": "text-slate-600 bg-slate-100 border-slate-200",
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-0 grid grid-cols-5 gap-4">
      <p className="text-xs text-slate-500 col-span-2 pt-0.5">{label}</p>
      <p className="text-sm text-slate-800 col-span-3">{value || "—"}</p>
    </div>
  )
}

export default function RequestDetail({ request, onBack }: RequestDetailProps) {
  const statusCls =
    statusColors[request.status] ?? "text-slate-600 bg-slate-100 border-slate-200"

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="mt-0.5 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-all flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 13L5 8L10 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="font-mono text-xs text-slate-400">{request.request_id}</p>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusCls}`}>
              {request.status}
            </span>
          </div>
          <h1 className="font-bold text-2xl text-slate-900">{request.title}</h1>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium text-slate-700">Tiến độ tổng thể</p>
          <p className="text-sm font-semibold text-slate-900">{request.progress}%</p>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              request.progress === 100 ? "bg-emerald-500" : "bg-navy"
            }`}
            style={{ width: `${request.progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">Giai đoạn hiện tại: {request.current_phase}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Thông tin yêu cầu */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Thông tin yêu cầu
            </p>
            <InfoRow label="Người gửi" value={request.requester_email} />
            <InfoRow label="Sản phẩm" value={request.product} />
            <InfoRow label="Loại yêu cầu" value={request.request_type} />
            <InfoRow label="Tính năng / Hành trình" value={request.feature_journey} />
            <InfoRow label="Mô tả" value={request.description} />
            <InfoRow label="Bối cảnh kinh doanh" value={request.business_need} />
            <InfoRow label="Vấn đề người dùng" value={request.user_problem} />
            <InfoRow label="Đối tượng mục tiêu" value={request.target_user} />
            {request.expected_output.length > 0 && (
              <div className="py-3 border-b border-slate-100 grid grid-cols-5 gap-4">
                <p className="text-xs text-slate-500 col-span-2 pt-0.5">Output kỳ vọng</p>
                <div className="col-span-3 flex flex-wrap gap-1.5">
                  {request.expected_output.map((o) => (
                    <span key={o} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <InfoRow label="Thời hạn dự kiến" value={request.expected_deadline} />
            <InfoRow label="Ngày gửi" value={request.submitted_at} />
          </div>

          {/* Cập nhật mới nhất */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Cập nhật mới nhất
            </p>
            <div className="bg-navy-50 border border-navy-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500 font-mono">{request.latest_update.date}</p>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <p className="text-xs font-medium text-navy">{request.latest_update.phase}</p>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{request.latest_update.message}</p>
            </div>
          </div>

          {/* Tài liệu bàn giao */}
          {(request.deliverables.figma_url ||
            request.deliverables.prototype_url ||
            request.deliverables.spec_url) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                Tài liệu bàn giao
              </p>
              <div className="flex flex-wrap gap-3">
                {request.deliverables.figma_url && (
                  <a
                    href={request.deliverables.figma_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="1" width="5.5" height="5.5" rx="2" fill="#F24E1E" />
                      <rect x="7.5" y="1" width="5.5" height="5.5" rx="2" fill="#A259FF" />
                      <rect x="1" y="7.5" width="5.5" height="5.5" rx="2" fill="#0ACF83" />
                      <circle cx="10.25" cy="10.25" r="2.75" fill="#1ABCFE" />
                    </svg>
                    Xem trong Figma
                  </a>
                )}
                {request.deliverables.prototype_url && (
                  <a
                    href={request.deliverables.prototype_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5 4.5L9.5 7L5 9.5V4.5Z" fill="currentColor" />
                    </svg>
                    Xem Prototype
                  </a>
                )}
                {request.deliverables.spec_url && (
                  <a
                    href={request.deliverables.spec_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M4.5 4.5H9.5M4.5 7H9.5M4.5 9.5H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Xem UX Specification
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* UX Progress */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">
              Tiến độ UX
            </p>
            <UXProgressTimeline phases={request.phases} />
          </div>

          {/* UX Team */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              UX Team
            </p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Squad</p>
                <p className="text-sm font-medium text-slate-800">{request.squad_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">UX Owner</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-navy-50 border border-navy-100 flex items-center justify-center text-navy text-xs font-semibold">
                    {request.ux_owner
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <p className="text-sm font-medium text-slate-800">{request.ux_owner}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
