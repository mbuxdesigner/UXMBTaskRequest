import React, { useState, useMemo, useRef } from "react"
import { ChevronDown, Check } from "lucide-react"
import { tokenActivityData, TokenActivityPoint } from "@/data/aiOpsMockData"

type TimeRange = "7d" | "30d" | "90d"

const RANGE_LABELS: Record<TimeRange, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
}

// Generate smooth cubic bezier SVG path from points
function createSplinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ""
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = i != points.length - 2 ? points[i + 2] : p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6

    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return path
}

export default function AiOpsTokenActivity() {
  const [range, setRange] = useState<TimeRange>("30d")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const data = useMemo(() => tokenActivityData[range], [range])

  // Chart dimensions & scaling
  const width = 800
  const height = 260
  const padLeft = 45
  const padRight = 20
  const padTop = 15
  const padBottom = 35

  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom

  // Find max value across all 3 series to scale nicely
  const maxY = useMemo(() => {
    let max = 0
    data.forEach(d => {
      if (d.input > max) max = d.input
      if (d.output > max) max = d.output
      if (d.blocked > max) max = d.blocked
    })
    // Round up to nearest nice number
    if (max <= 50) return 50
    if (max <= 100) return 100
    if (max <= 200) return 200
    if (max <= 500) return 500
    return Math.ceil(max / 100) * 100
  }, [data])

  const yTicks = [0, maxY * 0.25, maxY * 0.5, maxY * 0.75, maxY]

  // Coordinate mapper
  const getX = (idx: number) => {
    if (data.length <= 1) return padLeft + chartW / 2
    return padLeft + (idx / (data.length - 1)) * chartW
  }

  const getY = (val: number) => {
    return padTop + chartH - (val / maxY) * chartH
  }

  // Generate paths
  const inputPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.input) }))
  const outputPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.output) }))
  const blockedPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.blocked) }))

  const inputPath = createSplinePath(inputPoints)
  const outputPath = createSplinePath(outputPoints)
  const blockedPath = createSplinePath(blockedPoints)

  return (
    <div
      data-testid="ai-ops-token-activity"
      className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col h-full min-w-0"
    >
      {/* Header on gray background */}
      <div className="px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold text-neutral-900">Token Activity</h3>
          <p className="text-xs text-neutral-400 font-normal">Input, output, and blocked calls</p>
        </div>

        {/* Dropdown Range Switcher */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="inline-flex items-center justify-between gap-2 px-3 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors cursor-pointer shadow-2xs min-w-[120px]"
          >
            <span>{RANGE_LABELS[range]}</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
              {(["7d", "30d", "90d"] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRange(r)
                    setIsDropdownOpen(false)
                    setHoveredIdx(null)
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 cursor-pointer text-left"
                >
                  <span className={range === r ? "font-semibold text-neutral-900" : ""}>{RANGE_LABELS[r]}</span>
                  {range === r && <Check className="w-3.5 h-3.5 text-neutral-900" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inner White Card */}
      <div className="rounded-xl border border-neutral-200/70 bg-white p-5 shadow-2xs flex-1 flex flex-col justify-between">
        {/* SVG Interactive Multi-line Spline Chart */}
        <div className="relative w-full overflow-hidden my-auto select-none" style={{ minHeight: "260px" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Horizontal Grid lines & Y-Axis Labels */}
          {yTicks.map((tick, i) => {
            const y = getY(tick)
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 6"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[11px] fill-slate-400 font-mono select-none"
                >
                  {tick}
                </text>
              </g>
            )
          })}

          {/* X-Axis Labels */}
          {data.map((d, i) => {
            const x = getX(i)
            return (
              <text
                key={i}
                x={x}
                y={height - 8}
                textAnchor="middle"
                className="text-[11px] fill-slate-400 font-medium select-none"
              >
                {d.time}
              </text>
            )
          })}

          {/* Spline Lines */}
          {/* 1. Input (Blue #2563eb) */}
          <path
            d={inputPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 2. Output (Orange #f97316) */}
          <path
            d={outputPath}
            fill="none"
            stroke="#f97316"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 3. Blocked (Slate #475569) */}
          <path
            d={blockedPath}
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover Crosshair Column & Circles */}
          {data.map((d, i) => {
            const x = getX(i)
            const isHovered = hoveredIdx === i

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                className="cursor-pointer"
              >
                {/* Invisible hit column */}
                <rect
                  x={x - chartW / (data.length * 2)}
                  y={padTop}
                  width={chartW / data.length}
                  height={chartH}
                  fill="transparent"
                />

                {isHovered && (
                  <>
                    {/* Vertical guideline */}
                    <line
                      x1={x}
                      y1={padTop}
                      x2={x}
                      y2={padTop + chartH}
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />

                    {/* Data dots */}
                    <circle cx={x} cy={getY(d.input)} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                    <circle cx={x} cy={getY(d.output)} r="4.5" fill="#f97316" stroke="#ffffff" strokeWidth="2" />
                    <circle cx={x} cy={getY(d.blocked)} r="4" fill="#64748b" stroke="#ffffff" strokeWidth="2" />
                  </>
                )}
              </g>
            )
          })}
        </svg>

        {/* Hover Tooltip Popup */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div
            className="absolute top-2 pointer-events-none z-20 transform -translate-x-1/2 bg-slate-900/95 text-white backdrop-blur-md rounded-xl px-3 py-2 shadow-xl border border-slate-700/80 text-xs min-w-[120px]"
            style={{
              left: `${(getX(hoveredIdx) / width) * 100}%`,
            }}
          >
            <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-300">
              {data[hoveredIdx].time}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between gap-3 text-blue-400">
                <span>Input:</span>
                <span className="font-mono font-bold">{data[hoveredIdx].input}M</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-orange-400">
                <span>Output:</span>
                <span className="font-mono font-bold">{data[hoveredIdx].output}M</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-slate-400">
                <span>Blocked:</span>
                <span className="font-mono font-bold">{data[hoveredIdx].blocked}M</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Chart Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-blue-600" />
          <span className="text-xs font-medium text-neutral-600">Input</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-orange-500" />
          <span className="text-xs font-medium text-neutral-600">Output</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-slate-600" />
          <span className="text-xs font-medium text-neutral-600">Blocked</span>
        </div>
      </div>
    </div>
  </div>
)
}


