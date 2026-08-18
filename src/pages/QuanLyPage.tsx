import { useState } from "react"
import { mockRequests, UXRequest } from "../data/mockData"
import RequestCard from "../components/track/RequestCard"
import RequestDetail from "../components/track/RequestDetail"

const STATUS_FILTERS = ["Tất cả", "Đang thực hiện", "Đang phân loại", "Hoàn thành"]

export default function QuanLyPage() {
  const [selectedRequest, setSelectedRequest] = useState<UXRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState("Tất cả")

  if (selectedRequest) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-10">
        <RequestDetail request={selectedRequest} onBack={() => setSelectedRequest(null)} />
      </main>
    )
  }

  const filtered =
    statusFilter === "Tất cả"
      ? mockRequests
      : mockRequests.filter((r) => r.status === statusFilter)

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý yêu cầu</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Toàn bộ yêu cầu UX đang được theo dõi. Nhấn vào yêu cầu để xem chi tiết.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 flex-shrink-0">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                statusFilter === f
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 6V10M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
                stroke="#94A3B8"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="font-medium text-slate-700 mb-1">Không có yêu cầu nào</p>
          <p className="text-sm text-slate-400">Không có yêu cầu nào với trạng thái "{statusFilter}".</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RequestCard key={r.request_id} request={r} onClick={setSelectedRequest} />
          ))}
        </div>
      )}
    </main>
  )
}
