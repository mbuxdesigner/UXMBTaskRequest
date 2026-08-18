import { useState, FormEvent } from "react"
import { UXRequest } from "../data/mockData"
import { searchRequests } from "../api/api"
import RequestCard from "../components/track/RequestCard"
import RequestDetail from "../components/track/RequestDetail"

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
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Tra cứu yêu cầu</h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Nhập email hoặc Request ID để xem trạng thái yêu cầu UX của bạn.
        </p>
      </div>

      <form onSubmit={handleSearch} className="max-w-2xl mb-10">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="email@mbbank.com.vn hoặc UXMB-001"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navy-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang tìm…" : "Tìm kiếm"}
          </button>
        </div>
      </form>

      {loading && (
        <div className="space-y-4 max-w-3xl">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-36 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-1/4 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-6" />
              <div className="grid grid-cols-4 gap-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-8 bg-slate-100 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && hasSearched && results !== null && (
        <>
          {results.length === 0 ? (
            <div className="max-w-sm text-center py-16">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="7.5" stroke="#94A3B8" strokeWidth="1.5" />
                  <path d="M15 15L18.5 18.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M9 6V10M9 12.5V13" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="font-medium text-slate-700 mb-1">Không tìm thấy yêu cầu</p>
              <p className="text-sm text-slate-400">
                Không có kết quả cho "{query}". Thử nhập email MB hoặc Request ID hợp lệ như
                UXMB-001.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500 mb-4">
                Tìm thấy {results.length} yêu cầu
              </p>
              <div className="space-y-3 max-w-3xl">
                {results.map((r) => (
                  <RequestCard key={r.request_id} request={r} onClick={setSelectedRequest} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!hasSearched && (
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
            Thử tìm kiếm với
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "minhnb@mbbank.com.vn",
              "UXMB-001",
              "UXMB-002",
              "anhld@mbbank.com.vn",
            ].map((example) => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
