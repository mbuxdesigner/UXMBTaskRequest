import { UXRequest } from "../../data/mockData"

interface RequestCardProps {
  request: UXRequest
  onClick: (request: UXRequest) => void
}

const statusColors: Record<string, string> = {
  "Đang thực hiện": "text-blue-600 bg-blue-50",
  "Đang phân loại": "text-amber-600 bg-amber-50",
  "Đang khám phá": "text-purple-600 bg-purple-50",
  "Hoàn thành": "text-emerald-600 bg-emerald-50",
  "Đã gửi": "text-slate-600 bg-slate-100",
}

export default function RequestCard({ request, onClick }: RequestCardProps) {
  const statusCls = statusColors[request.status] ?? "text-slate-600 bg-slate-100"

  return (
    <button
      onClick={() => onClick(request)}
      className="w-full text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate-400 mb-1">{request.request_id}</p>
          <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-navy transition-colors">
            {request.title}
          </h3>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${statusCls}`}>
          {request.status}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Sản phẩm</p>
          <p className="text-xs font-medium text-slate-700 truncate">{request.product}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">UX Squad</p>
          <p className="text-xs font-medium text-slate-700 truncate">{request.squad_name}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Giai đoạn hiện tại</p>
          <p className="text-xs font-medium text-slate-700 truncate">{request.current_phase}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Cập nhật lần cuối</p>
          <p className="text-xs font-medium text-slate-700">{request.last_updated}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">{request.current_phase}</span>
          <span className="text-xs font-medium text-slate-700">{request.progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              request.progress === 100 ? "bg-emerald-500" : "bg-navy"
            }`}
            style={{ width: `${request.progress}%` }}
          />
        </div>
      </div>
    </button>
  )
}
