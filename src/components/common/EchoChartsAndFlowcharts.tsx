import React, { useState, useEffect, useRef, useId, useMemo } from "react"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  GitBranch,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Table as TableIcon,
  Download,
  Code as CodeIcon,
  Eye,
  Maximize2,
  Minimize2,
  LayoutList,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { toast } from "sonner"
import mermaid from "mermaid"

// Khởi tạo cấu hình Mermaid chuẩn Figma & MBBank Design System (hiện đại, bo góc mềm, màu sắc phân cấp rõ nét)
mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  securityLevel: "strict",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  themeVariables: {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: "13px",
    darkMode: false,
    primaryColor: "#FFFFFF",
    primaryBorderColor: "#93C5FD",
    primaryTextColor: "#0F172A",
    secondaryColor: "#EFF6FF",
    secondaryBorderColor: "#3B82F6",
    secondaryTextColor: "#1E3A8A",
    tertiaryColor: "#FEF3C7",
    tertiaryBorderColor: "#F59E0B",
    tertiaryTextColor: "#92400E",
    lineColor: "#64748B",
    edgeLabelBackground: "#FFFFFF",
    edgeLabelTextColor: "#334155",
    clusterBkg: "#F8FAFC",
    clusterBorder: "#CBD5E1",
    nodeBorder: "#93C5FD",
    mainBkg: "#FFFFFF",
  },
  flowchart: {
    useMaxWidth: true,
    htmlLabels: false,
    curve: "basis",
    nodeSpacing: 45,
    rankSpacing: 55,
    padding: 16,
  },
})

export function enhanceMermaidSvg(rawSvg: string): string {
  if (!rawSvg) return rawSvg
  let enhanced = rawSvg

  // Bo góc mềm cho các thẻ rect của nodes (rx="12" ry="12")
  enhanced = enhanced.replace(/<rect(?![^>]*\brx=)([^>]*?)>/g, '<rect rx="12" ry="12"$1>')

  // Chèn CSS tùy biến chuẩn Figma / FigJam vào SVG
  const customCss = `
<style>
  .mermaid text {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    letter-spacing: -0.01em !important;
  }
  .mermaid .node rect,
  .mermaid .node circle,
  .mermaid .node ellipse,
  .mermaid .node polygon {
    stroke-width: 1.5px !important;
    filter: drop-shadow(0 4px 14px rgba(15, 23, 42, 0.08)) !important;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
  .mermaid .node:hover rect,
  .mermaid .node:hover polygon {
    stroke: #1057FB !important;
    stroke-width: 2.2px !important;
    filter: drop-shadow(0 8px 24px rgba(16, 87, 251, 0.22)) !important;
    cursor: pointer !important;
  }
  .mermaid .edgePath path.path {
    stroke: #64748B !important;
    stroke-width: 2px !important;
    stroke-linecap: round !important;
    stroke-linejoin: round !important;
  }
  .mermaid .edgePath marker path {
    fill: #64748B !important;
    stroke: #64748B !important;
  }
  .mermaid .edgeLabel {
    background-color: #FFFFFF !important;
    border: 1px solid #E2E8F0 !important;
    border-radius: 9999px !important;
    padding: 3px 10px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    color: #475569 !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05) !important;
  }
  @media (prefers-color-scheme: dark) {
    .mermaid text { fill: #F8FAFC !important; }
    .mermaid .node rect { fill: #1E293B !important; stroke: #3B82F6 !important; }
    .mermaid .edgePath path.path { stroke: #94A3B8 !important; }
    .mermaid .edgePath marker path { fill: #94A3B8 !important; stroke: #94A3B8 !important; }
    .mermaid .edgeLabel { background-color: #0F172A !important; border-color: #334155 !important; color: #CBD5E1 !important; }
  }
</style>`

  if (enhanced.includes("<defs>")) {
    enhanced = enhanced.replace("<defs>", `<defs>${customCss}`)
  } else {
    enhanced = enhanced.replace(/(<svg[^>]*>)/, `$1${customCss}`)
  }

  return enhanced
}

/**
 * Mermaid output still originates from model-authored text. Keep a small
 * allow-list style sanitizer at the final DOM boundary as defence in depth.
 */
export function sanitizeMermaidSvg(rawSvg: string): string {
  if (!rawSvg || typeof DOMParser === "undefined") return ""

  const documentNode = new DOMParser().parseFromString(rawSvg, "image/svg+xml")
  if (documentNode.querySelector("parsererror")) return ""

  documentNode
    .querySelectorAll("script, foreignObject, iframe, object, embed, link, meta")
    .forEach((node) => node.remove())

  documentNode.querySelectorAll("*").forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      if (
        name.startsWith("on") ||
        ((name === "href" || name === "xlink:href") &&
          (value.startsWith("javascript:") || value.startsWith("data:text/html")))
      ) {
        node.removeAttribute(attribute.name)
      }
    }
  })

  return new XMLSerializer().serializeToString(documentNode.documentElement)
}

export const MB_CHART_COLORS = [
  "#1057FB", // MB Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#6366F1", // Indigo
]

export interface ChartDataPayload {
  type?: "bar" | "pie" | "donut" | "line" | "area"
  title?: string
  description?: string
  data: Array<Record<string, any>>
  xAxisKey?: string
  dataKeys?: string[]
  unit?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. COMPONENT BIỂU ĐỒ SỐ LIỆU TƯƠNG TÁC (RECHARTS)
// ─────────────────────────────────────────────────────────────────────────────

export function EchoInteractiveChart({ rawJson }: { rawJson: string }) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart")
  const [isCopied, setIsCopied] = useState(false)

  const parsed = useMemo<ChartDataPayload | null>(() => {
    try {
      const clean = rawJson.trim()
      const json = JSON.parse(clean)
      if (json && Array.isArray(json.data)) {
        return json
      }
    } catch {}
    return null
  }, [rawJson])

  if (!parsed || !parsed.data || parsed.data.length === 0) {
    return (
      <div className="p-3 rounded-xl border border-border/80 bg-muted/30 text-xs font-mono text-muted-foreground">
        {rawJson}
      </div>
    )
  }

  const chartType = parsed.type || "bar"
  const title = parsed.title || "Biểu đồ thống kê"
  const description = parsed.description
  const data = parsed.data
  const xAxisKey = parsed.xAxisKey || (data[0] ? Object.keys(data[0])[0] : "name")
  
  // Tìm các key dữ liệu số
  const autoDataKeys = Object.keys(data[0] || {}).filter(
    (k) => k !== xAxisKey && typeof data[0][k] === "number"
  )
  const dataKeys = parsed.dataKeys && parsed.dataKeys.length > 0 ? parsed.dataKeys : autoDataKeys.length > 0 ? autoDataKeys : ["value"]

  const handleCopy = () => {
    navigator.clipboard.writeText(rawJson)
    setIsCopied(true)
    toast.success("Đã copy dữ liệu biểu đồ!")
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="my-3 rounded-2xl border border-slate-200/90 bg-white shadow-md overflow-hidden backdrop-blur-md">
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0">
            {chartType === "pie" || chartType === "donut" ? (
              <PieChartIcon className="size-4.5" />
            ) : chartType === "line" || chartType === "area" ? (
              <LineChartIcon className="size-4.5" />
            ) : (
              <BarChart3 className="size-4.5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-[13.5px] font-semibold text-slate-800 truncate">
                {title}
              </h4>
              <span className="text-[10px] font-medium font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {chartType}
              </span>
            </div>
            {description && (
              <p className="text-[11.5px] text-slate-400 truncate">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* View toggle & Copy actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === "chart"
                  ? "bg-white text-blue-600 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BarChart3 className="size-3" />
              Biểu đồ
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === "table"
                  ? "bg-white text-blue-600 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <TableIcon className="size-3" />
              Số liệu
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="size-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Sao chép dữ liệu JSON"
          >
            {isCopied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Chart Canvas or Data Table */}
      <div className="p-4">
        {viewMode === "chart" ? (
          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "pie" || chartType === "donut" ? (
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      color: "#1e293b",
                      fontSize: "12px",
                      boxShadow: "0 10px 25px rgba(15,23,42,0.12)",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "11px" }} />
                  <Pie
                    data={data}
                    dataKey={dataKeys[0]}
                    nameKey={xAxisKey}
                    cx="50%"
                    cy="45%"
                    innerRadius={chartType === "donut" ? 50 : 0}
                    outerRadius={80}
                    paddingAngle={3}
                    label={(entry) => {
                      const row = entry as unknown as Record<string, unknown>
                      return `${String(row[xAxisKey] ?? "")}: ${String(row[dataKeys[0]] ?? "")}${parsed.unit ? ` ${parsed.unit}` : ""}`
                    }}
                  >
                    {data.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={MB_CHART_COLORS[index % MB_CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              ) : chartType === "line" ? (
                <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      color: "#1e293b",
                      fontSize: "12px",
                    }}
                  />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px" }} />
                  {dataKeys.map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={MB_CHART_COLORS[index % MB_CHART_COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              ) : chartType === "area" ? (
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      color: "#1e293b",
                      fontSize: "12px",
                    }}
                  />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px" }} />
                  {dataKeys.map((key, index) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={MB_CHART_COLORS[index % MB_CHART_COLORS.length]}
                      fill={MB_CHART_COLORS[index % MB_CHART_COLORS.length]}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              ) : (
                <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      color: "#1e293b",
                      fontSize: "12px",
                    }}
                  />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px" }} />
                  {dataKeys.map((key, index) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      fill={MB_CHART_COLORS[index % MB_CHART_COLORS.length]}
                      radius={[6, 6, 0, 0]}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-64 rounded-xl border border-slate-200/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80">
                  <th className="px-3 py-2 font-semibold text-slate-700">
                    {xAxisKey}
                  </th>
                  {dataKeys.map((k) => (
                    <th key={k} className="px-3 py-2 font-semibold text-slate-700 text-right">
                      {k} {parsed.unit ? `(${parsed.unit})` : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {String(row[xAxisKey] ?? "")}
                    </td>
                    {dataKeys.map((k) => (
                      <td key={k} className="px-3 py-2 text-right font-mono text-slate-600">
                        {String(row[k] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMPONENT SƠ ĐỒ LUỒNG QUY TRÌNH (MERMAID FLOWCHART)
// ─────────────────────────────────────────────────────────────────────────────

interface FlowStepItem {
  id: string
  label: string
  isDecision: boolean
  isEnd: boolean
}

function parseFlowStepsFromCode(code: string): FlowStepItem[] {
  const steps: FlowStepItem[] = []
  const seen = new Set<string>()

  // Regex trích xuất các node dạng A["Title"], A[Title], A{"Decision"}, A(("End"))
  const nodeRegex = /([A-Za-z0-9_]+)\s*(?:\[["']?([^\]"']+)["']?\]|\{["']?([^}"']+)["']?\}|\(\(["']?([^)"']+)["']?\)\))/g
  let m: RegExpExecArray | null

  while ((m = nodeRegex.exec(code)) !== null) {
    const id = m[1]
    const label = (m[2] || m[3] || m[4] || id).trim()
    const isDecision = Boolean(m[3])
    const isEnd = Boolean(m[4])

    if (!seen.has(id) && label && !label.toLowerCase().includes("style")) {
      seen.add(id)
      steps.push({ id, label, isDecision, isEnd })
    }
  }

  return steps
}

export function EchoMermaidFlowchart({ code }: { code: string }) {
  const [svgHtml, setSvgHtml] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState<number>(0.9)
  const [viewMode, setViewMode] = useState<"canvas" | "cards" | "code">("canvas")
  const [isCopied, setIsCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const uniqueId = useId().replace(/:/g, "")
  const containerRef = useRef<HTMLDivElement>(null)

  // Phân tích các bước quy trình từ mã nguồn
  const flowSteps = useMemo(() => parseFlowStepsFromCode(code), [code])

  useEffect(() => {
    let isMounted = true

    async function renderMermaid() {
      try {
        setError(null)
        const id = `mermaid-${uniqueId}-${Date.now()}`
        const { svg } = await mermaid.render(id, code.trim())
        if (isMounted) {
          const enhanced = enhanceMermaidSvg(svg)
          const sanitized = sanitizeMermaidSvg(enhanced)
          if (!sanitized) throw new Error("Sơ đồ không vượt qua kiểm tra an toàn")
          setSvgHtml(sanitized)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Không thể vẽ sơ đồ Mermaid")
        }
      }
    }

    if (code.trim()) {
      renderMermaid()
    }

    return () => {
      isMounted = false
    }
  }, [code, uniqueId])

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code)
    setIsCopied(true)
    toast.success("Đã sao chép cú pháp Mermaid!")
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleDownloadSvg = () => {
    if (!svgHtml) return
    const blob = new Blob([svgHtml], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `so-do-quy-trinh-${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Đã tải xuống file SVG sơ đồ vector chất lượng cao!")
  }

  return (
    <div className="my-3 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-card shadow-sm overflow-hidden backdrop-blur-md">
      {/* Header Toolbar chuẩn Figma / FigJam */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-850/80 select-none flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
            <GitBranch className="size-4.5" />
          </div>
          <div>
            <h4 className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Sơ đồ luồng quy trình (Flowchart)
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-100/70 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200/60 dark:border-blue-800/60">
                Figma Canvas
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              Trực quan hóa luồng quy trình 7 khâu & bàn giao sản phẩm chuẩn MBBank
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Segmented View Mode Toggle */}
          <div className="flex items-center rounded-lg bg-slate-200/60 dark:bg-neutral-800 p-0.5 border border-slate-200/80 dark:border-neutral-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("canvas")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "canvas"
                  ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Xem dạng sơ đồ trực quan Canvas"
            >
              <GitBranch className="size-3" />
              Sơ đồ Canvas
            </button>
            {flowSteps.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === "cards"
                    ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title="Xem dạng thẻ quy trình từng khâu"
              >
                <LayoutList className="size-3" />
                Dạng thẻ ({flowSteps.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewMode("code")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "code"
                  ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Xem mã nguồn Mermaid"
            >
              <CodeIcon className="size-3" />
              Mã
            </button>
          </div>

          {/* Zoom Controls for Canvas */}
          {viewMode === "canvas" && (
            <div className="hidden sm:flex items-center rounded-lg bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 p-0.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2, Number((z + 0.15).toFixed(2))))}
                className="p-1 rounded text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="size-3.5" />
              </button>
              <span className="text-[10px] font-mono px-1.5 text-slate-600 dark:text-neutral-400 font-semibold">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                className="p-1 rounded text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(0.85)}
                className="p-1 rounded text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                title="Về tỉ lệ vừa mắt 85%"
              >
                <RotateCcw className="size-3" />
              </button>
            </div>
          )}

          {/* Fullscreen Expand Button */}
          {viewMode === "canvas" && (
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="size-7 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              title="Phóng to toàn màn hình"
            >
              <Maximize2 className="size-3.5" />
            </button>
          )}

          {/* Download SVG */}
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="size-7 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            title="Tải ảnh vector SVG chuẩn thiết kế"
          >
            <Download className="size-3.5" />
          </button>

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopyCode}
            className="size-7 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            title="Sao chép cú pháp Mermaid"
          >
            {isCopied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Diagram Area */}
      <div className="relative overflow-hidden">
        {viewMode === "code" ? (
          <div className="p-4 bg-slate-950 text-slate-100">
            <pre className="text-xs font-mono p-3 rounded-xl bg-slate-900 overflow-x-auto leading-relaxed border border-slate-800">
              {code}
            </pre>
          </div>
        ) : viewMode === "cards" ? (
          /* Dạng thẻ quy trình tương tác chuẩn Figma */
          <div className="p-4 bg-slate-50/50 dark:bg-neutral-900/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {flowSteps.map((step, sIdx) => {
                const isDecision = step.isDecision
                const isEnd = step.isEnd
                return (
                  <div
                    key={step.id}
                    className={`relative p-3.5 rounded-xl border transition-all hover:shadow-md ${
                      isDecision
                        ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60"
                        : isEnd
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60"
                        : "bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span
                        className={`size-6 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono ${
                          isDecision
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                            : isEnd
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300"
                        }`}
                      >
                        {String(sIdx + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                          isDecision
                            ? "bg-amber-200/60 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200"
                            : isEnd
                            ? "bg-emerald-200/60 text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200"
                            : "bg-slate-100 text-slate-600 dark:bg-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {isDecision ? "Kiểm tra / Review" : isEnd ? "Đích đến" : "Bước thực hiện"}
                      </span>
                    </div>
                    <h5 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                      {step.label}
                    </h5>
                    {sIdx < flowSteps.length - 1 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-neutral-700/60 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-neutral-400">
                        <span>Tiếp nối</span>
                        <ArrowRight className="size-3" />
                        <span className="font-medium text-slate-600 dark:text-neutral-300 truncate">
                          {flowSteps[sIdx + 1]?.label || "Khâu tiếp theo"}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : error ? (
          <div className="text-center p-6 bg-slate-50/50 dark:bg-neutral-900/30">
            <p className="text-xs text-rose-500 font-medium mb-1">
              Đang hoàn thiện cú pháp sơ đồ luồng.
            </p>
            <pre className="text-[11px] font-mono text-slate-500 max-w-md mx-auto overflow-x-auto text-left bg-slate-100 dark:bg-neutral-800 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-700">
              {code}
            </pre>
          </div>
        ) : (
          /* Canvas Figma / FigJam Dotted Canvas */
          <div className="p-4 sm:p-6 overflow-auto min-h-[300px] max-h-[580px] flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0F19] bg-[radial-gradient(#CBD5E1_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#1E293B_1.2px,transparent_1.2px)] [background-size:18px_18px] cursor-grab active:cursor-grabbing">
            <div
              ref={containerRef}
              style={{ transform: `scale(${zoom})`, transformOrigin: "center top" }}
              className="transition-transform duration-200 ease-out flex items-center justify-center w-full max-w-full"
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
          </div>
        )}
      </div>

      {/* Fullscreen Dialog Modal */}
      <Dialog open={isFullscreen} onClose={() => setIsFullscreen(false)} size="full">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden flex flex-col h-[90vh]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-850">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <GitBranch className="size-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Toàn cảnh sơ đồ luồng quy trình (Figma Canvas View)
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Không gian làm việc trực quan độ nét cao, dễ dàng kiểm tra toàn bộ luồng 7 khâu
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg bg-slate-200/70 dark:bg-neutral-800 p-0.5 border border-slate-300 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
                  className="p-1.5 rounded text-slate-700 dark:text-neutral-300 hover:text-slate-900 cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="size-4" />
                </button>
                <span className="text-xs font-mono px-2 text-slate-700 dark:text-neutral-300 font-semibold">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.3, Number((z - 0.15).toFixed(2))))}
                  className="p-1.5 rounded text-slate-700 dark:text-neutral-300 hover:text-slate-900 cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="p-1.5 rounded text-slate-700 dark:text-neutral-300 hover:text-slate-900 cursor-pointer"
                  title="100%"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownloadSvg}
                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-neutral-300 hover:text-blue-600 cursor-pointer"
              >
                <Download className="size-3.5" />
                <span>Tải SVG</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="size-8 rounded-lg hover:bg-slate-200/80 dark:hover:bg-neutral-800 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0F19] bg-[radial-gradient(#CBD5E1_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#1E293B_1.2px,transparent_1.2px)] [background-size:20px_20px]">
            <div
              style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
              className="transition-transform duration-200 ease-out"
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
