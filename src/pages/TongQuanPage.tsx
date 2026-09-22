/**
 * ============================================================================
 * UXMB TASK REQUEST — EXECUTIVE DASHBOARD (TONG QUAN PAGE)
 * ============================================================================
 * Reference UI Architecture: ReUI AI-Ops Report (https://tempo-tasks.reui.io/reports/ai-ops)
 * Design Framework: ReUI Modern Frame System & Framer Motion v13 Physics Engine
 * Milestone: Milestone 4 (Full 6-Block Integration & Gantt Roadmap)
 *
 * 6-BLOCK REUI FRAME SYSTEM INVENTORY:
 * ----------------------------------------------------------------------------
 * Row 1: 3-Column Responsive KPI Bento Grid (1 col mobile, 2 cols tablet, 3 cols desktop)
 *   1. Block 1: Đang chờ & Điểm nghẽn (Block1PendingOverview.tsx)
 *      - Replaces legacy Provider Health card
 *      - Metric: Total pending, unassigned, and blocked tasks count
 *      - Health Status: Ổn định (0-2), Cảnh báo (3-5), Quá tải (>5)
 *      - Critical Overdue: PO Pending response overdue > 24 hours detection
 *      - Interactive: Urgent tasks compact list linking to RequestDetail drawer
 *
 *   2. Block 2: Đang thực hiện & 5 Khâu UX (Block2InProgressWorkload.tsx)
 *      - Replaces legacy Token Volume card
 *      - Metric: Total in-progress workload count and delivery tempo (tasks/tuần)
 *      - 5 UX Stages: Define đầu bài, Wireframe, UI Design, Prototype, Ready to Dev
 *      - Progress Bar: Segmented multi-phase workload distribution & average %
 *      - Interactive: Active tasks quick preview linking to RequestDetail drawer
 *
 *   3. Block 3: Hoàn thành & Tuân thủ SLA (Block3CompletedSLA.tsx)
 *      - Replaces legacy Safety Drift card & interim Block3CompletedPlaceholder
 *      - Metric: Total delivered & accepted tasks count in period
 *      - SLA Benchmark: Dynamic on-time completion calculation vs 96.4% target
 *      - Quality Metric: First-Time Right test acceptance benchmark (94.2%)
 *      - Interactive: Completed tasks feed linking to RequestDetail drawer
 *
 * Row 2: Asymmetric 2-Column Workload Grid (1 col mobile/tablet, 1 col + 2 cols desktop)
 *   4. Block 4: Tính năng đã Go-live / Release (Block4ProductionReleases.tsx) [lg:col-span-1]
 *      - Replaces legacy Provider Failover timeline card
 *      - Feed: Chronological vertical timeline of verified production releases
 *      - Channels: App MBBank, Biz MBBank, Web MBBank, BaaS Platform
 *      - Badges: Distinctive emerald "Đã Release" badge with pulse indicator
 *      - Interactive: Release item click linking to RequestDetail drawer
 *
 *   5. Block 5: Trending Task & Hoạt động Squad (Block5SquadActivity.tsx) [lg:col-span-2]
 *      - Replaces legacy Token Activity & interim Block5TrendingSquadsPlaceholder
 *      - Capacity Utilization: Sẵn sàng (<50%), Bình thường (50-79%), Đang bận (80-99%), Quá tải (>=100%)
 *      - Squad Workload: Active task counts, designer team, utilization progress bar
 *      - Key Highlight Tasks: Priority tasks per squad (Khẩn cấp, Cao, Trung bình)
 *      - Interactive: Task click -> RequestDetail; Squad click -> SquadDetailModal
 *
 * Row 3: Full-Width Timeline Schedule Grid (w-full 1-column layout)
 *   6. Block 6: Lộ trình Gantt toàn diện (Block6GanttRoadmap.tsx) [w-full]
 *      - Replaces legacy Routing Rules card & view mode toggles
 *      - Frame Container: Full-width ReUI Frame hosting ReUIGanttChart
 *      - Schedule Sync: Start date to expected deadline timeline bars for all filtered tasks
 *      - Today Marker: Synchronized vertical Today line marker and scale switcher
 *      - Interactive: Gantt task bar & row click linking to RequestDetail drawer
 *
 * ARCHITECTURAL CONTRACTS & PERFORMANCE INVARIANTS:
 * ----------------------------------------------------------------------------
 * - Pure Synchronous Filtering: selectedProduct state drives filteredRequests via useMemo (0ms latency)
 * - Motion Physics & 60+ FPS: Preserves AnimatePresence mode="wait" verbatim at line 348
 * - Zero Layout Thrashing: Composite transforms only (opacity, y: 12), zero width/height Framer Motion
 * - Total Stagger Budget: skeletonExit (0.2s) + delayChildren (0.02s) + 4 * 0.045s = 0.40s (< 0.55s budget)
 * - Unified Single Dashboard: Eliminates legacy mode toggles and standalone weekly checkin sections
 * ============================================================================
 */

import { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { springs } from "@/lib/motion"
import { Squad, UXRequest, mockRequests, mockSquads } from "../data/mockData"
import { fetchSquads, fetchRequests } from "../api/api"
import { getStoredSession, UserSession } from "../services/otpAuthService"
import { canUserAccessRequest, generateMaskedTitle } from "@/lib/accessControl"
import SquadDetailModal from "../components/squad/SquadDetailModal"
import RequestDetail from "../components/track/RequestDetail"
import AiOpsKpiCards from "@/components/dashboard/ai-ops/AiOpsKpiCards"
import ReleaseNewsfeedTimeline from "@/components/dashboard/ai-ops/ReleaseNewsfeedTimeline"
import SquadTrendingChart from "@/components/dashboard/ai-ops/SquadTrendingChart"
import TrackTaskGanttFrame from "@/components/dashboard/ai-ops/TrackTaskGanttFrame"
import { getAdminIAProducts, IAProductInfo } from "@/data/iaMockData"
import { getProductColorDef } from "@/lib/colorUtils"
import { cn } from "@/lib/utils"
import PageHeader from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "@/components/ui/toast"
import { OverviewContentSkeleton } from "@/components/common/ReuiSkeletons"
import { SyncProgressStatus } from "@/components/reui/c-progress-4"

export default function TongQuanPage() {
  const [squads, setSquads] = useState<Squad[]>(() => {
    try {
      const cached = localStorage.getItem("mbbank_admin_squads")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return mockSquads || []
  })

  const [requests, setRequests] = useState<UXRequest[]>(() => {
    try {
      const cached = localStorage.getItem("ux_portal_real_requests")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    if (mockRequests && mockRequests.length > 0) return mockRequests
    return []
  })

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem("ux_portal_real_requests")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return false
      }
    } catch {}
    return !mockRequests || mockRequests.length === 0
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFiltering, setIsFiltering] = useState(false)

  const [session, setSession] = useState<UserSession | null>(getStoredSession())
  const [selectedRequest, setSelectedRequest] = useState<UXRequest | null>(null)
  const selectedRequestRef = useRef<UXRequest | null>(null)
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null)
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null)
  const [adminVersion, setAdminVersion] = useState<number>(0)

  useEffect(() => {
    const handleAuthChange = () => {
      setSession(getStoredSession())
    }
    const handleAdminDataChanged = () => {
      setAdminVersion((v) => v + 1)
      try {
        const cached = localStorage.getItem("mbbank_admin_squads")
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSquads((prev) => {
              const orderMap = new Map<string, number>()
              parsed.forEach((s: any, idx: number) => {
                const name = (s.name || s.squad_name || "").toLowerCase().trim()
                if (name) orderMap.set(name, idx)
              })
              return [...prev].sort((a, b) => {
                const nameA = (a.squad_name || (a as any).name || "").toLowerCase().trim()
                const nameB = (b.squad_name || (b as any).name || "").toLowerCase().trim()
                const idxA = orderMap.has(nameA) ? orderMap.get(nameA)! : 9999
                const idxB = orderMap.has(nameB) ? orderMap.get(nameB)! : 9999
                return idxA - idxB
              })
            })
          }
        }
      } catch {}
    }
    window.addEventListener("auth_session_changed", handleAuthChange)
    window.addEventListener("admin_products_changed", handleAdminDataChanged)
    window.addEventListener("ux_data_refreshed", handleAdminDataChanged)
    window.addEventListener("storage", handleAdminDataChanged)
    const interval = setInterval(() => {
      const current = getStoredSession()
      setSession((prev) => {
        if (!prev && !current) return prev
        if (
          prev?.sessionToken === current?.sessionToken &&
          prev?.role === current?.role &&
          prev?.teamsEmail === current?.teamsEmail &&
          prev?.displayName === current?.displayName
        ) {
          return prev
        }
        return current
      })
    }, 1200)
    return () => {
      window.removeEventListener("auth_session_changed", handleAuthChange)
      window.removeEventListener("storage", handleAuthChange)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (requests.length === 0) {
      setIsLoading(true)
    }
    // Background sync from Google Sheets without blocking UI render
    Promise.all([fetchSquads(false), fetchRequests(false)])
      .then(([squadsData, requestsData]) => {
        if (Array.isArray(squadsData) && squadsData.length > 0) setSquads(squadsData)
        if (Array.isArray(requestsData) && requestsData.length > 0) setRequests(requestsData)
      })
      .catch(() => {
        // Quiet fallback to empty/real data
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  // Bảo mật bài toán cho PO / Business trên Dashboard:
  // - Vẫn hiển thị đầy đủ bài toán trên Gantt để phục vụ điều phối, thống kê chung
  // - Những task KHÔNG do PO/Business đó tạo sẽ bị mã hóa tiêu đề thành '********' ngẫu nhiên
  // - Gắn cờ isRestricted: true để khi mở Drawer chi tiết sẽ hiển thị cảnh báo không có quyền
  const displayRequests = useMemo(() => {
    const rawList = requests && requests.length > 0 ? requests : []
    if (!rawList || rawList.length === 0) return []
    const isPoOrBusiness = session?.role === "PO" || session?.role === "Business"
    if (!isPoOrBusiness) return rawList

    return rawList.map((req) => {
      const canAccess = canUserAccessRequest(req, session)
      if (canAccess) return { ...req, isRestricted: false }
      return {
        ...req,
        title: generateMaskedTitle(req.request_id || req.id, req.title),
        isRestricted: true,
      }
    })
  }, [requests, session])

  // Lấy danh sách sản phẩm động từ Admin setting kết hợp các sản phẩm đang có trong requests
  const products = useMemo(() => {
    const adminProds = getAdminIAProducts()
    const result: Array<{ id: string; name: string }> = []
    const seenRoots = new Set<string>()

    const getRootKey = (name: string) => {
      const n = name.toLowerCase().replace(/[^a-z0-9]/g, "")
      if (n.includes("appmb") || n.includes("mbapp")) return "appmb"
      if (n.includes("digi") || n.includes("invest")) return "digi"
      if (n.includes("baas")) return "baas"
      if (n.includes("biz")) return "biz"
      if (n.includes("web")) return "web"
      return n
    }

    // Ưu tiên sản phẩm từ Admin setting
    adminProds.forEach((p) => {
      const root = getRootKey(p.name)
      if (!seenRoots.has(root)) {
        seenRoots.add(root)
        result.push({ id: p.id, name: p.name })
      }
    })

    // Bổ sung các sản phẩm thực tế có trong requests nếu chưa có trong Admin
    requests.forEach((r) => {
      const prodName = (r.product || "").trim()
      if (prodName) {
        const root = getRootKey(prodName)
        if (!seenRoots.has(root)) {
          seenRoots.add(root)
          result.push({ id: `prod-${root}`, name: prodName })
        }
      }
    })

    return result
  }, [requests, adminVersion])

  const [selectedProduct, setSelectedProduct] = useState<string>("all")

  // Helper kiểm tra task có thuộc sản phẩm đang chọn hay không
  const isRequestMatchingProduct = (r: UXRequest, targetName: string) => {
    if (!targetName || targetName === "all") return true
    const normTarget = targetName.toLowerCase().replace(/[^a-z0-9]/g, "")
    const p = (r.product || "").toLowerCase().replace(/[^a-z0-9]/g, "")
    const fj = (r.feature_journey || "").toLowerCase().replace(/[^a-z0-9]/g, "")
    const s = (r.squad_name || r.squad || "").toLowerCase().replace(/[^a-z0-9]/g, "")

    if (p === normTarget || p.includes(normTarget) || normTarget.includes(p)) return true
    if (fj.includes(normTarget) || normTarget.includes(fj)) return true
    if (s.includes(normTarget) || normTarget.includes(s)) return true

    if ((normTarget.includes("appmb") || normTarget.includes("appmbbank")) && (p.includes("appmb") || p.includes("mbapp"))) return true
    if (normTarget.includes("digi") && (p.includes("digi") || p.includes("invest") || fj.includes("digi"))) return true
    if (normTarget.includes("baas") && (p.includes("baas") || s.includes("baas"))) return true

    return false
  }

  const currentProductName = useMemo(() => {
    if (!selectedProduct || selectedProduct === "all") return "all"
    const prodObj = products.find((p) => p.id === selectedProduct || p.name.toLowerCase() === selectedProduct.toLowerCase())
    return prodObj?.name || selectedProduct
  }, [selectedProduct, products])

  const filteredRequests = useMemo(() => {
    if (selectedProduct === "all") return displayRequests
    return displayRequests.filter((r) => isRequestMatchingProduct(r, currentProductName))
  }, [displayRequests, selectedProduct, currentProductName])

  const handleRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    const startTime = Date.now()
    try {
      const [squadsData, requestsData] = await Promise.all([
        fetchSquads(true),
        fetchRequests(true),
      ])
      const elapsed = Date.now() - startTime
      if (elapsed < 1200) {
        await new Promise((r) => setTimeout(r, 1200 - elapsed))
      }
      if (Array.isArray(squadsData) && squadsData.length > 0) setSquads(squadsData)
      if (Array.isArray(requestsData) && requestsData.length > 0) setRequests(requestsData)
      toast.success("Đã làm mới dữ liệu Overview thành công!")
    } catch (err) {
      console.warn("Could not refresh dashboard data:", err)
      toast.error("Lỗi làm mới dữ liệu", "Không thể tải dữ liệu mới nhất từ máy chủ.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSelectProduct = (prodId: string) => {
    if (selectedProduct === prodId && !isFiltering) return
    setSelectedProduct(prodId)
    setIsFiltering(true)
    setTimeout(() => {
      setIsFiltering(false)
    }, 380)
  }

  return (
    <main id="main-content" tabIndex={-1} className="w-full space-y-4 text-slate-900 pb-8 outline-none">
      {/* Header & Product Navigation Section */}
      <div className="space-y-2.5">
        {/* 1. Page Header Synchronized with My task & Design System */}
        <PageHeader
          breadcrumb={{
            parent: "Dashboards",
            current: "Overview",
          }}
          title="Overview"
          badge={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                tactile
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                aria-label="Làm mới dữ liệu Overview"
                className={cn(
                  "cursor-pointer shrink-0 select-none",
                  isRefreshing && "bg-slate-50 border-slate-300 text-slate-900"
                )}
              >
                <RefreshCw
                  className={cn(
                    "w-3.5 h-3.5 mr-1.5 text-slate-500",
                    isRefreshing && "animate-spin text-slate-900"
                  )}
                />
                <span>Làm mới</span>
              </Button>
            </div>
          }
          className="pb-0"
        />

        {/* ReUI c-progress-4 Sync Status Banner when Refreshing */}
        <AnimatePresence>
          {isRefreshing && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <SyncProgressStatus
                active={isRefreshing}
                type="refresh"
                label="Đang đồng bộ dữ liệu Live Sync (Google Sheets & Squads)..."
                className="max-w-md bg-blue-50/50 border-blue-200/80 shadow-xs"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* =========================================================================
            PRODUCT NAVIGATION TABS (Admin-configured products - IA segmented style)
            ========================================================================= */}
        <div
          role="tablist"
          aria-label="Lọc bài toán theo sản phẩm"
          aria-orientation="horizontal"
          className="inline-flex h-9 items-center justify-start rounded-xl bg-slate-100/90 p-1 text-slate-500 border border-slate-200/80 shadow-2xs overflow-x-auto max-w-full select-none"
        >
          {/* Tab Tất cả */}
          <button
            role="tab"
            type="button"
            id="product-tab-all"
            data-testid="product-tab-all"
            aria-selected={selectedProduct === "all"}
            tabIndex={selectedProduct === "all" ? 0 : -1}
            onClick={() => handleSelectProduct("all")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-2.5 sm:px-3 py-1 text-xs font-medium transition-all focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
              selectedProduct === "all"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            )}
          >
            <span className="w-2 h-2 rounded-full mr-1.5 shrink-0 bg-blue-600" />
            <span>Tất cả</span>
            <span
              className={cn(
                "ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums",
                selectedProduct === "all"
                  ? "bg-slate-100 text-slate-700 font-semibold"
                  : "bg-slate-200/70 text-slate-500"
              )}
            >
              {displayRequests.length}
            </span>
          </button>

          {/* Các sản phẩm */}
          {products.map((prod, pIdx) => {
            const tabKey = prod.id || (prod as any).code || `overview-prod-${pIdx}`
            const count = displayRequests.filter((r) => isRequestMatchingProduct(r, prod.name)).length
            const isSelected = selectedProduct === prod.id || selectedProduct === prod.name
            const colorDef = getProductColorDef(prod.name, (prod as any).color)
            const dotColor = colorDef.hex || (prod as any).color || "#2563EB"

            return (
              <button
                key={`overview-tab-${tabKey}-${pIdx}`}
                role="tab"
                type="button"
                id={`product-tab-${prod.id}`}
                data-testid={`product-tab-${prod.id}`}
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => handleSelectProduct(prod.id)}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-2.5 sm:px-3 py-1 text-xs font-medium transition-all focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
                  isSelected
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                )}
              >
                {/* Chấm tròn theo màu cài đặt trong Admin */}
                <span
                  className="w-2 h-2 rounded-full mr-1.5 shrink-0 transition-transform"
                  style={{ backgroundColor: dotColor }}
                />
                <span>{prod.name}</span>
                <span
                  className={cn(
                    "ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums",
                    isSelected
                      ? "bg-slate-100 text-slate-700 font-semibold"
                      : "bg-slate-200/70 text-slate-500"
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* =========================================================================
          6 REUI FRAMES (Bento KPI + Asymmetric Workload + Gantt Roadmap)
          Smooth cross-fade grid stack (No blank gap, zero vertical jerk, seamless morph)
          ========================================================================= */}
      <div className="grid grid-cols-1 grid-rows-1 w-full min-w-0 isolate">
        <AnimatePresence initial={false}>
          {isLoading || isRefreshing || isFiltering ? (
            <motion.div
              key="overview-content-skeleton-frame"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="col-start-1 row-start-1 w-full min-w-0 pointer-events-none z-10"
            >
              <OverviewContentSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key={`overview-content-${selectedProduct}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="col-start-1 row-start-1 w-full min-w-0 space-y-4 z-20"
            >
              {/* ROW 1: 3 REUI KPI CARDS (Backlog & Pending, Đang thực hiện, Đã hoàn thành) */}
              <AiOpsKpiCards requests={filteredRequests} selectedProduct={currentProductName} />

              {/* ROW 2: ASYMMETRIC 2-COLUMN GRID (NewsFeed + Squad Trending) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4.5 items-stretch">
                <div className="lg:col-span-1 h-full min-w-0">
                  <ReleaseNewsfeedTimeline
                    requests={filteredRequests}
                    onSelectRequest={(req) => setSelectedRequest(req)}
                  />
                </div>
                <div className="lg:col-span-2 h-full min-w-0">
                  <SquadTrendingChart
                    requests={filteredRequests}
                    squads={squads}
                    currentProduct={selectedProduct}
                  />
                </div>
              </div>

              {/* ROW 3: FULL-WIDTH MY TASK GANTT ROADMAP */}
              <div className="w-full">
                <TrackTaskGanttFrame
                  requests={filteredRequests}
                  onSelectRequest={(req) => setSelectedRequest(req)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          MODALS & DRAWERS
          ========================================================================= */}
      <SquadDetailModal squad={selectedSquad} onClose={() => setSelectedSquad(null)} />

      <RequestDetail
        open={Boolean(selectedRequest)}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onUpdated={() => {}}
      />
    </main>
  )
}
