import { useState } from "react"
import { mockRequests, UXRequest } from "../data/mockData"
import RequestCard from "../components/track/RequestCard"
import RequestDetail from "../components/track/RequestDetail"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { FolderKanban, Inbox, Sparkles, Filter } from "lucide-react"

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

  const getCount = (status: string) => {
    if (status === "Tất cả") return mockRequests.length
    return mockRequests.filter((r) => r.status === status).length
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="navy" size="sm">Quản lý</Badge>
            <span className="text-xs text-slate-400">Danh mục yêu cầu UX</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Quản lý danh sách yêu cầu</h1>
          <p className="text-sm text-slate-500 mt-1">
            Toàn bộ các yêu cầu thiết kế trải nghiệm đang được điều phối và theo dõi.
          </p>
        </div>

        {/* ReUI Tabs for Status Filter */}
        <div className="flex-shrink-0">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList variant="pill">
              {STATUS_FILTERS.map((f) => (
                <TabsTrigger
                  key={f}
                  value={f}
                  badge={getCount(f)}
                >
                  {f}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="max-w-md mx-auto text-center p-10 border-dashed">
          <CardContent className="p-0 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Không có yêu cầu nào</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Hiện không có yêu cầu nào thuộc trạng thái "{statusFilter}".
            </p>
          </CardContent>
        </Card>
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
