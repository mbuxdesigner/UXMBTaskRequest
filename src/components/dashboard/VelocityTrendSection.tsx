import React, { useState } from "react"
import { Frame, FrameHeader, FrameTitle, FrameDescription, FrameBody, FrameActions } from "@/components/reui/frame"
import { IconTile } from "@/components/reui/icon-tile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  Activity, 
  Zap, 
  Layers, 
  Target, 
  Sparkles,
  Info
} from "lucide-react"

export interface TrendWeekData {
  week: string
  inflow: number // Số task tiếp nhận
  outflow: number // Số task hoàn thành bàn giao
  onTimeRate: number // % đúng hạn
  avgLeadDays: number // Ngày trung bình hoàn thành
}

const DEFAULT_TREND_DATA: TrendWeekData[] = [
  { week: "Tuần W-5", inflow: 8, outflow: 7, onTimeRate: 85, avgLeadDays: 6.8 },
  { week: "Tuần W-4", inflow: 11, outflow: 9, onTimeRate: 82, avgLeadDays: 7.2 },
  { week: "Tuần W-3", inflow: 9, outflow: 10, onTimeRate: 89, avgLeadDays: 6.1 },
  { week: "Tuần W-2", inflow: 14, outflow: 12, onTimeRate: 88, avgLeadDays: 6.4 },
  { week: "Tuần W-1", inflow: 10, outflow: 13, onTimeRate: 92, avgLeadDays: 5.6 },
  { week: "Tuần này", inflow: 12, outflow: 11, onTimeRate: 94, avgLeadDays: 5.2 },
]

export default function VelocityTrendSection() {
  const [trendData] = useState<TrendWeekData[]>(DEFAULT_TREND_DATA)
  const [hoveredWeek, setHoveredWeek] = useState<TrendWeekData | null>(null)

  const currentWeek = trendData[trendData.length - 1]
  const prevWeek = trendData[trendData.length - 2]
  const totalInflow = trendData.reduce((acc, d) => acc + d.inflow, 0)
  const totalOutflow = trendData.reduce((acc, d) => acc + d.outflow, 0)
  const maxVolume = Math.max(...trendData.flatMap((d) => [d.inflow, d.outflow]), 16)

  const onTimeTrendDiff = currentWeek.onTimeRate - prevWeek.onTimeRate
  const leadTimeTrendDiff = (prevWeek.avgLeadDays - currentWeek.avgLeadDays).toFixed(1)

  return (
    <div className="space-y-6">
      {/* 4 Summary Performance Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Throughput Efficiency */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tỷ lệ Xử lý (Net Flow)</span>
            <Badge variant="success" size="xs" className="font-bold gap-1">
              <TrendingUp className="w-3 h-3" />
              {Math.round((totalOutflow / totalInflow) * 100)}%
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{totalOutflow}</span>
            <span className="text-xs text-slate-500 font-medium">bàn giao / {totalInflow} tiếp nhận (6 tuần)</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Dòng việc cân bằng, không có hiện tượng tích tụ ứ đọng.
          </p>
        </div>

        {/* KPI 2: On-time Delivery Trend */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tỷ lệ đúng hạn (SLA)</span>
            <Badge variant="navy" size="xs" className="font-bold gap-1">
              +{onTimeTrendDiff}% tuần này
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600 font-mono">{currentWeek.onTimeRate}%</span>
            <span className="text-xs text-slate-400 font-medium">Mục tiêu: ≥ 90%</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đạt chỉ tiêu cam kết doanh nghiệp
          </p>
        </div>

        {/* KPI 3: Lead Time Velocity */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lead Time Trung bình</span>
            <Badge variant="teal" size="xs" className="font-bold">
              Nhanh hơn {leadTimeTrendDiff} ngày
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0D9B97] font-mono">{currentWeek.avgLeadDays}</span>
            <span className="text-xs text-slate-500 font-medium">ngày / yêu cầu</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Thời gian hoàn tất từ lúc nhận đến giao Spec.
          </p>
        </div>

        {/* KPI 4: First Time Right Quality Rate */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chất lượng (First-Time-Right)</span>
            <Badge variant="purple" size="xs" className="font-bold">
              Xuất sắc
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-600 font-mono">96.4%</span>
            <span className="text-xs text-slate-500 font-medium">không bị reject / revise</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Chất lượng đầu ra tuân thủ chuẩn MB Design System.
          </p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Inflow vs Outflow Dual Bar Chart (2 Cols) */}
        <div className="lg:col-span-2">
          <Frame variant="default" className="h-full flex flex-col justify-between">
            <FrameHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <FrameTitle>
                  <IconTile size="xs" variant="navy"><BarChart3 className="w-3.5 h-3.5" /></IconTile>
                  Biểu đồ Dòng việc: Tiếp nhận (Inflow) vs Bàn giao (Outflow)
                </FrameTitle>
                <FrameDescription>
                  Theo dõi sự tương quan giữa lượng công việc mới phát sinh và năng lực hoàn thành của Team theo tuần.
                </FrameDescription>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <span className="w-3 h-3 rounded-md bg-blue-500 inline-block" />
                  Tiếp nhận mới
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" />
                  Hoàn thành bàn giao
                </span>
              </div>
            </FrameHeader>

            <FrameBody className="space-y-4 pt-2">
              {/* Interactive SVG Bar Chart */}
              <div className="h-64 w-full relative flex items-end justify-between gap-2 sm:gap-4 px-2 sm:px-6 pt-6 pb-2 border-b border-slate-100">
                {/* Horizontal Grid lines */}
                <div className="absolute inset-x-0 top-6 border-b border-dashed border-slate-100" />
                <div className="absolute inset-x-0 top-24 border-b border-dashed border-slate-100" />
                <div className="absolute inset-x-0 top-44 border-b border-dashed border-slate-100" />

                {trendData.map((d, idx) => {
                  const inflowHeight = (d.inflow / maxVolume) * 100
                  const outflowHeight = (d.outflow / maxVolume) * 100
                  const isHovered = hoveredWeek?.week === d.week

                  return (
                    <div
                      key={d.week}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative cursor-pointer"
                      onMouseEnter={() => setHoveredWeek(d)}
                      onMouseLeave={() => setHoveredWeek(null)}
                    >
                      {/* Tooltip on Hover */}
                      {isHovered && (
                        <div className="absolute -top-12 z-20 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-lg animate-in fade-in zoom-in-95 pointer-events-none flex items-center gap-2">
                          <span className="text-blue-300">Vào: {d.inflow}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-emerald-300">Ra: {d.outflow}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-amber-300">{d.onTimeRate}% SLA</span>
                        </div>
                      )}

                      {/* Dual Bars Container */}
                      <div className="flex items-end gap-1.5 sm:gap-2 w-full justify-center h-48">
                        {/* Inflow Bar */}
                        <div
                          style={{ height: `${inflowHeight}%` }}
                          className={`w-4 sm:w-6 rounded-t-lg transition-all duration-300 relative ${
                            isHovered
                              ? "bg-blue-600 shadow-md shadow-blue-500/20"
                              : "bg-blue-400/90 hover:bg-blue-500"
                          }`}
                        >
                          <span className="absolute -top-5 inset-x-0 text-center text-[10px] font-bold text-slate-500 font-mono">
                            {d.inflow}
                          </span>
                        </div>

                        {/* Outflow Bar */}
                        <div
                          style={{ height: `${outflowHeight}%` }}
                          className={`w-4 sm:w-6 rounded-t-lg transition-all duration-300 relative ${
                            isHovered
                              ? "bg-emerald-600 shadow-md shadow-emerald-500/20"
                              : "bg-emerald-400/90 hover:bg-emerald-500"
                          }`}
                        >
                          <span className="absolute -top-5 inset-x-0 text-center text-[10px] font-bold text-emerald-600 font-mono">
                            {d.outflow}
                          </span>
                        </div>
                      </div>

                      {/* X-axis Label */}
                      <span
                        className={`text-[11px] font-semibold transition-colors truncate max-w-full ${
                          isHovered ? "text-blue-700 font-bold" : "text-slate-500"
                        }`}
                      >
                        {d.week}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Bottom Insight callout */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
                <Sparkles className="w-4 h-4 text-[#1057FB] shrink-0 mt-0.5" />
                <p>
                  <strong>Đánh giá Nhà quản lý:</strong> Nhịp độ bàn giao (Outflow) trong 3 tuần gần nhất liên tục bám sát và vượt lượng tiếp nhận (Inflow), cho thấy Team duy trì năng lực giải phóng Backlog rất tốt, không bị thắt nút.
                </p>
              </div>
            </FrameBody>
          </Frame>
        </div>

        {/* Right: Cycle Lead Time & SLA Trend */}
        <div className="lg:col-span-1">
          <Frame variant="default" className="h-full flex flex-col justify-between">
            <FrameHeader>
              <FrameTitle>
                <IconTile size="xs" variant="teal"><Clock className="w-3.5 h-3.5" /></IconTile>
                Lead Time từng Khâu Thiết kế
              </FrameTitle>
              <FrameDescription>
                Thời gian trung bình (ngày) để hoàn tất một phase trong quy trình.
              </FrameDescription>
            </FrameHeader>

            <FrameBody className="space-y-4">
              {/* Phase Lead Time Breakdown */}
              <div className="space-y-3">
                {[
                  { phase: "1. Discovery & Nghiên cứu", days: 2.1, benchmark: 2.5, color: "bg-amber-500" },
                  { phase: "2. User Flow & Journey", days: 2.8, benchmark: 3.0, color: "bg-blue-500" },
                  { phase: "3. UI Design & Component", days: 4.5, benchmark: 5.0, color: "bg-[#1057FB]" },
                  { phase: "4. Prototype & Interactive", days: 1.8, benchmark: 2.0, color: "bg-purple-500" },
                  { phase: "5. Bàn giao Dev & Design Spec", days: 0.9, benchmark: 1.0, color: "bg-emerald-500" },
                ].map((item) => (
                  <div key={item.phase} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{item.phase}</span>
                      <span className="font-mono font-bold text-slate-900">{item.days} ngày <span className="text-[10px] text-slate-400 font-normal">(chuẩn ≤ {item.benchmark}d)</span></span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${(item.days / 5.5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Tổng Lead Time trung bình:</span>
                  <span className="text-base text-slate-900 font-mono">12.1 ngày</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Đã tối ưu hóa giảm <strong className="text-emerald-600 font-semibold">18% thời gian</strong> so với quý trước nhờ ứng dụng MB Design Tokens v2.0.
                </p>
              </div>
            </FrameBody>
          </Frame>
        </div>
      </div>
    </div>
  )
}
