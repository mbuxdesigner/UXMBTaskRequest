import { useState, FormEvent } from "react"
import { UXRequest } from "../data/mockData"
import { searchRequests } from "../api/api"
import RequestCard from "../components/track/RequestCard"
import RequestDetail from "../components/track/RequestDetail"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Inbox, AlertCircle, Sparkles, Clock, CheckCircle2 } from "lucide-react"

export default function TrackRequestPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UXRequest[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<UXRequest | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setHasSearched(true)
    setSelectedRequest(null)
    try {
      const r = await searchRequests(query)
      setResults(r)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  if (selectedRequest) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-10">
        <RequestDetail request={selectedRequest} onBack={() => setSelectedRequest(null)} />
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="navy" size="sm">Tra cứu</Badge>
          <span className="text-xs text-slate-400">Theo dõi tiến trình UX</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Tra cứu tiến độ yêu cầu</h1>
        <p className="text-sm text-slate-500 mt-1">
          Nhập Email MB hoặc Request ID (ví dụ <strong>UXMB-001</strong>) để theo dõi trạng thái tiếp nhận và kết quả bàn giao.
        </p>
      </div>

      <form onSubmit={handleSearch} className="max-w-2xl">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="email@mbbank.com.vn hoặc UXMB-001..."
              startIcon={<Search className="w-4 h-4" />}
              className="h-12 text-base"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={!query.trim()}
            loading={loading}
            className="gap-2 px-6 flex-shrink-0"
          >
            <Search className="w-4 h-4 text-teal" />
            <span>Tìm kiếm</span>
          </Button>
        </div>
      </form>

      {loading && (
        <div className="space-y-4 max-w-3xl">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="p-6 h-36 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/4 mb-3" />
              <div className="h-5 bg-slate-100 rounded w-3/4 mb-6" />
              <div className="grid grid-cols-4 gap-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-6 bg-slate-100 rounded" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && hasSearched && results !== null && (
        <>
          {results.length === 0 ? (
            <Card className="max-w-md text-center p-10 border-dashed">
              <CardContent className="p-0 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">Không tìm thấy yêu cầu nào</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Không tìm thấy kết quả phù hợp cho từ khóa "{query}". Bạn vui lòng kiểm tra lại email MB hoặc mã Request ID (VD: UXMB-001).
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Kết quả tìm kiếm ({results.length} yêu cầu)
                </p>
              </div>
              <div className="space-y-3">
                {results.map((r) => (
                  <RequestCard key={r.request_id} request={r} onClick={setSelectedRequest} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!hasSearched && (
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Gợi ý tìm kiếm nhanh
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "minhnb@mbbank.com.vn",
              "UXMB-001",
              "UXMB-002",
              "UXMB-003",
              "anhld@mbbank.com.vn",
            ].map((example) => (
              <Button
                key={example}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery(example)
                }}
                className="text-xs rounded-xl"
              >
                <Sparkles className="w-3 h-3 text-teal" />
                {example}
              </Button>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
