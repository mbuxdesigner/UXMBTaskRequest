"use client"

import React, { useState, useMemo, type CSSProperties } from "react"
import { TrendingUp } from "lucide-react"
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { UXRequest, Squad } from "@/data/mockData"

interface SquadTrendingChartProps {
  requests?: UXRequest[]
  squads?: Squad[]
  currentProduct?: string
}

export default function SquadTrendingChart({
  requests = [],
  squads = [],
  currentProduct = "all",
}: SquadTrendingChartProps) {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d")

  const chartConfig = useMemo(() => {
    if (currentProduct === "all") {
      return {
        app_mb: { label: "APP MB", color: "var(--chart-1)" },
        digi_invest: { label: "Digi invest", color: "var(--chart-2)" },
        backoffice: { label: "Backoffice", color: "var(--chart-3)" },
        crm: { label: "CRM", color: "var(--chart-4)" },
        baas: { label: "BaaS", color: "var(--chart-5)" },
      } satisfies ChartConfig
    } else {
      return {
        in_progress: { label: "Đang thực hiện", color: "var(--chart-1)" },
        pending: { label: "Chờ tiếp nhận", color: "var(--chart-3)" },
        completed: { label: "Đã hoàn thành", color: "var(--chart-2)" },
      } satisfies ChartConfig
    }
  }, [currentProduct])

  const chartData = useMemo(() => {
    const periods =
      range === "7d"
        ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
        : range === "90d"
        ? ["Tháng 7", "Tháng 8", "Tháng 9"]
        : ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4", "Tuần 5", "Tuần 6"]

    if (currentProduct === "all") {
      const countAppMb = requests.filter((r) => (r.product || "").toLowerCase().includes("app")).length
      const countDigi = requests.filter((r) => (r.product || "").toLowerCase().includes("digi") || (r.product || "").toLowerCase().includes("invest")).length
      const countBackoffice = requests.filter((r) => (r.product || "").toLowerCase().includes("backoffice") || (r.product || "").toLowerCase().includes("nội bộ") || (r.product || "").toLowerCase().includes("visual") || (r.product || "").toLowerCase().includes("system") || (r.product || "").toLowerCase().includes("ai")).length
      const countCrm = requests.filter((r) => (r.product || "").toLowerCase().includes("crm")).length
      const countBaas = requests.filter((r) => (r.product || "").toLowerCase().includes("baas")).length

      return periods.map((period, idx) => {
        const ratio = (idx + 1) / periods.length
        const appMb = Math.round(countAppMb * ratio)
        const digi = Math.round(countDigi * ratio)
        const backoffice = Math.round(countBackoffice * ratio)
        const crm = Math.round(countCrm * ratio)
        const baas = Math.round(countBaas * ratio)
        return {
          period,
          app_mb: appMb,
          digi_invest: digi,
          backoffice,
          crm,
          baas,
          forecastArea: appMb,
        }
      })
    } else {
      let inProgress = 0
      let pending = 0
      let completed = 0

      requests.forEach((r) => {
        const s = (r.status || "").toLowerCase()
        if (s.includes("hoàn thành") || s.includes("bàn giao") || s.includes("release") || s.includes("nghiệm thu")) {
          completed++
        } else if (s.includes("đang thực hiện") || s.includes("tiến hành") || s.includes("thiết kế")) {
          inProgress++
        } else {
          pending++
        }
      })

      return periods.map((period, idx) => {
        const ratio = (idx + 1) / periods.length
        const prog = Math.round(inProgress * ratio)
        const pend = Math.round(pending * ratio)
        const comp = Math.round(completed * ratio)
        return {
          period,
          in_progress: prog,
          pending: pend,
          completed: comp,
          forecastArea: prog,
        }
      })
    }
  }, [requests, currentProduct, range])

  return (
    <div
      data-testid="ai-ops-squad-trending"
      className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col h-full min-w-0"
    >
      {/* Header on gray background */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-neutral-900">Squad Trending</h3>
          {requests.length > 0 ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <TrendingUp className="size-3" />
              <span><span className="font-mono font-bold tabular-nums">{requests.length}</span> bài toán thực tế</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/60">
              <span><span className="font-mono font-bold tabular-nums">0</span> bài toán</span>
            </span>
          )}
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center rounded-lg border border-neutral-200/80 bg-white/90 p-0.5 text-xs shadow-2xs">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs ${
                range === r
                  ? "bg-neutral-900 font-medium text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {r === "7d" ? "7 ngày" : r === "30d" ? "30 ngày" : "90 ngày"}
            </button>
          ))}
        </div>
      </div>

      {/* Inner White Card */}
      <div className="rounded-xl border border-neutral-200/70 bg-white p-4 shadow-2xs flex-1 flex flex-col justify-between">
        <div className="w-full flex-1">
          <ChartContainer config={chartConfig} className="w-full aspect-auto h-[240px]">
            <ComposedChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 15, right: 10, bottom: 0, left: -20 }}
            >
              <defs>
                <linearGradient id="gradient-trending-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                  <stop offset="60%" stopColor="#2563eb" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.00} />
                </linearGradient>
                <pattern
                  id="chart17-forecast-stripe"
                  patternUnits="userSpaceOnUse"
                  width="6"
                  height="6"
                >
                  <rect
                    width="6"
                    height="6"
                    fill="#2563eb"
                    opacity="0.05"
                  />
                  <path
                    d="M0,6 L6,0"
                    stroke="#2563eb"
                    strokeWidth="0.9"
                    opacity="0.22"
                  />
                </pattern>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    className="min-w-44 gap-2.5 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl text-slate-800"
                    labelFormatter={(value) => (
                      <div className="border-slate-100 mb-0.5 border-b pb-2">
                        <span className="text-xs font-semibold text-slate-900">{value} - Task Trending</span>
                      </div>
                    )}
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="rounded-xs h-2.5 w-2.5 shrink-0"
                            style={
                              {
                                "--color-bg": `var(--color-${name})`,
                                backgroundColor: `var(--color-${name})`,
                              } as CSSProperties
                            }
                          />
                          <span className="text-slate-600 text-xs">
                            {chartConfig[name as keyof typeof chartConfig]?.label || name}
                          </span>
                        </div>
                        <span className="text-slate-900 font-normal font-mono tabular-nums text-xs">
                          {value != null ? `${Number(value).toLocaleString()} tasks` : "—"}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} className="pt-2 text-xs" />

              {currentProduct === "all" ? (
                <>
                  <Area
                    dataKey="forecastArea"
                    type="natural"
                    fill="url(#gradient-trending-fill)"
                    stroke="none"
                    connectNulls
                    legendType="none"
                    tooltipType="none"
                  />
                  <Area
                    dataKey="forecastArea"
                    type="natural"
                    fill="url(#chart17-forecast-stripe)"
                    stroke="none"
                    connectNulls
                    legendType="none"
                    tooltipType="none"
                  />
                  <Line
                    dataKey="app_mb"
                    type="natural"
                    stroke="var(--color-app_mb)"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    dataKey="digi_invest"
                    type="natural"
                    stroke="var(--color-digi_invest)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    dataKey="backoffice"
                    type="natural"
                    stroke="var(--color-backoffice)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    dataKey="crm"
                    type="natural"
                    stroke="var(--color-crm)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    dataKey="baas"
                    type="natural"
                    stroke="var(--color-baas)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </>
              ) : (
                <>
                  <Area
                    dataKey="forecastArea"
                    type="natural"
                    fill="url(#gradient-trending-fill)"
                    stroke="none"
                    connectNulls
                    legendType="none"
                    tooltipType="none"
                  />
                  <Area
                    dataKey="forecastArea"
                    type="natural"
                    fill="url(#chart17-forecast-stripe)"
                    stroke="none"
                    connectNulls
                    legendType="none"
                    tooltipType="none"
                  />
                  <Line
                    dataKey="in_progress"
                    type="natural"
                    stroke="var(--color-in_progress)"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    dataKey="pending"
                    type="natural"
                    stroke="var(--color-pending)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    dataKey="completed"
                    type="natural"
                    stroke="var(--color-completed)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </>
              )}
            </ComposedChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  )
}
