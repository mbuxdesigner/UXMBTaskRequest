"use client"

import React, { useMemo, type CSSProperties } from "react"
import { Clock } from "lucide-react"
import { Label, Pie, PieChart } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { UXRequest } from "@/data/mockData"
import { getRequestPendingClassification } from "@/config/statusConfig"

interface BacklogPendingDonutCardProps {
  requests?: UXRequest[]
}

const chartConfig = {
  count: { label: "Tasks" },
  cho_tiep_nhan: { label: "Chờ tiếp nhận", color: "var(--chart-2)" },
  po_pending: { label: "PO pending", color: "var(--chart-3)" },
  designer_pending: { label: "Designer/Khác", color: "var(--chart-4)" },
} satisfies ChartConfig

export default function BacklogPendingDonutCard({ requests = [] }: BacklogPendingDonutCardProps) {
  const stats = useMemo(() => {
    let choTiepNhan = 0
    let poPending = 0
    let designerPending = 0
    let overdueCount = 0

    requests.forEach((r) => {
      const cls = getRequestPendingClassification(r)
      if (cls.isPending) {
        if (cls.type === "po_pending") {
          poPending++
          if (cls.isOverdue) overdueCount++
        } else if (cls.type === "designer_pending") {
          designerPending++
        } else {
          choTiepNhan++
        }
      } else {
        const s = (r.status || "").toLowerCase()
        if (s.includes("chờ xác nhận") || s.includes("chờ tiếp nhận") || s.includes("mới tạo")) {
          choTiepNhan++
        } else if (s.includes("po pending") || s.includes("đã gửi po")) {
          poPending++
        } else if (s.includes("pending") || s.includes("tạm dừng")) {
          designerPending++
        }
      }
    })

    const total = choTiepNhan + poPending + designerPending
    return { choTiepNhan, poPending, designerPending, total, overdueCount }
  }, [requests])

  const chartData = useMemo(
    () => [
      { status: "cho_tiep_nhan", count: stats.choTiepNhan, fill: "var(--color-cho_tiep_nhan)" },
      { status: "po_pending", count: stats.poPending, fill: "var(--color-po_pending)" },
      { status: "designer_pending", count: stats.designerPending, fill: "var(--color-designer_pending)" },
    ],
    [stats]
  )

  return (
    <div
      data-testid="ai-ops-backlog-pending-card"
      className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col justify-between h-full min-w-0"
    >
      {/* Header on gray background */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-500">Backlog & Pending</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
            {stats.total} chờ
          </span>
        </div>
        <Clock className="size-4 text-neutral-400 stroke-[1.5]" />
      </div>

      {/* Inner White Card */}
      <div className="rounded-xl border border-neutral-200/70 bg-white p-4 shadow-2xs flex flex-col flex-1 justify-between">
        {/* Horizontal Layout: Donut Chart nhỏ bên trái + Danh sách trạng thái bên phải */}
        <div className="w-full flex-1 flex items-center justify-between gap-3 py-1">
          {/* Cột trái: Donut chart compact với cụm số nhỏ vừa vặn */}
          <div className="w-[105px] h-[105px] shrink-0 relative flex items-center justify-center">
            <ChartContainer
              config={chartConfig}
              className="w-[105px] h-[105px] aspect-square"
            >
              <PieChart accessibilityLayer width={105} height={105} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="min-w-36 gap-2"
                      formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-2 w-2 shrink-0 rounded-xs"
                              style={
                                {
                                  backgroundColor: `var(--color-${name})`,
                                } as CSSProperties
                              }
                            />
                            <span className="text-muted-foreground text-xs">
                              {chartConfig[name as keyof typeof chartConfig]?.label || name}
                            </span>
                          </div>
                          <span className="text-foreground font-semibold tabular-nums text-xs">
                            {Number(value).toLocaleString()}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                {/* Vòng ray nền (background track circle) */}
                <Pie
                  data={[{ value: 1 }]}
                  dataKey="value"
                  innerRadius={33}
                  outerRadius={45}
                  fill="#f1f5f9"
                  stroke="none"
                  isAnimationActive={false}
                  legendType="none"
                  tooltipType="none"
                />
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={33}
                  outerRadius={45}
                  cornerRadius={4}
                  paddingAngle={3}
                  stroke="var(--background)"
                  strokeWidth={2.5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-xl font-bold tabular-nums"
                            >
                              {stats.total.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 14}
                              className="fill-muted-foreground text-[10px] font-medium"
                            >
                              Task chờ
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>

          {/* Cột phải: Danh sách chỉ số các trạng thái với màu nền tinh tế */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-emerald-50/70 border border-emerald-100/90 text-emerald-950 transition-colors">
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className="size-2 rounded-xs shrink-0"
                  style={{ backgroundColor: "var(--chart-2)" }}
                />
                <span className="text-emerald-900 truncate text-[11px] font-medium">Chờ tiếp nhận</span>
              </div>
              <span className="font-semibold text-emerald-900 tabular-nums shrink-0 ml-1 text-xs">
                {stats.choTiepNhan}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-purple-50/70 border border-purple-100/90 text-purple-950 transition-colors">
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className="size-2 rounded-xs shrink-0"
                  style={{ backgroundColor: "var(--chart-4)" }}
                />
                <span className="text-purple-900 truncate text-[11px] font-medium">Designer/Khác</span>
              </div>
              <span className="font-semibold text-purple-900 tabular-nums shrink-0 ml-1 text-xs">
                {stats.designerPending}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-amber-50/70 border border-amber-100/90 text-amber-950 transition-colors">
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className="size-2 rounded-xs shrink-0"
                  style={{ backgroundColor: "var(--chart-3)" }}
                />
                <span className="text-amber-900 truncate text-[11px] font-medium">PO pending</span>
              </div>
              <span className="font-semibold text-amber-900 tabular-nums shrink-0 ml-1 text-xs">
                {stats.poPending}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
