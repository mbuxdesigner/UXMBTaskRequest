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
} from "lucide-react"
import { toast } from "sonner"
import mermaid from "mermaid"

// Khởi tạo cấu hình Mermaid chuẩn ngân hàng (clean, monochrome & neutral)
mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: "basis",
  },
})

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
    <div className="my-3 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/95 dark:bg-[#1C1C1E]/95 shadow-md overflow-hidden backdrop-blur-md">
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
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
              <h4 className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                {title}
              </h4>
              <span className="text-[10px] font-medium font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-700">
                {chartType}
              </span>
            </div>
            {description && (
              <p className="text-[11.5px] text-slate-400 dark:text-neutral-400 truncate">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* View toggle & Copy actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-neutral-800 p-0.5 border border-slate-200 dark:border-neutral-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === "chart"
                  ? "bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-neutral-400"
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
                  ? "bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-neutral-400"
              }`}
            >
              <TableIcon className="size-3" />
              Số liệu
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="size-7 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
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
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "10px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
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
                    label={(entry) => `${entry[xAxisKey]}: ${entry[dataKeys[0]]}${parsed.unit ? ` ${parsed.unit}` : ""}`}
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
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "10px",
                      border: "none",
                      color: "#fff",
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
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "10px",
                      border: "none",
                      color: "#fff",
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
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "10px",
                      border: "none",
                      color: "#fff",
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
          <div className="overflow-x-auto max-h-64 rounded-xl border border-slate-200/80 dark:border-neutral-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-neutral-800/80 border-b border-slate-200/80 dark:border-neutral-700">
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-neutral-300">
                    {xAxisKey}
                  </th>
                  {dataKeys.map((k) => (
                    <th key={k} className="px-3 py-2 font-semibold text-slate-700 dark:text-neutral-300 text-right">
                      {k} {parsed.unit ? `(${parsed.unit})` : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                {data.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-neutral-200">
                      {String(row[xAxisKey] ?? "")}
                    </td>
                    {dataKeys.map((k) => (
                      <td key={k} className="px-3 py-2 text-right font-mono text-slate-600 dark:text-neutral-400">
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

export function EchoMermaidFlowchart({ code }: { code: string }) {
  const [svgHtml, setSvgHtml] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState<number>(1)
  const [showCode, setShowCode] = useState<boolean>(false)
  const [isCopied, setIsCopied] = useState(false)
  const uniqueId = useId().replace(/:/g, "")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true

    async function renderMermaid() {
      try {
        setError(null)
        const id = `mermaid-${uniqueId}-${Date.now()}`
        const { svg } = await mermaid.render(id, code.trim())
        if (isMounted) {
          setSvgHtml(svg)
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
    toast.success("Đã sao chép mã nguồn Mermaid!")
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleDownloadSvg = () => {
    if (!svgHtml) return
    const blob = new Blob([svgHtml], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `so-do-luong-${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Đã tải xuống file SVG sơ đồ!")
  }

  return (
    <div className="my-3 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/95 dark:bg-[#1C1C1E]/95 shadow-md overflow-hidden backdrop-blur-md">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50 select-none">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <GitBranch className="size-4.5" />
          </div>
          <div>
            <h4 className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Sơ đồ luồng quy trình (Flowchart)
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-medium">
                Mermaid
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-neutral-400">
              Trực quan hóa luồng màn hình, quy trình 7 khâu & hành trình người dùng
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center rounded-lg bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2, Number((z + 0.15).toFixed(2))))}
              className="p-1 rounded text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              title="Phóng to"
            >
              <ZoomIn className="size-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 text-slate-500">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
              className="p-1 rounded text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              title="Thu nhỏ"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="p-1 rounded text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              title="Về mặc định 100%"
            >
              <RotateCcw className="size-3" />
            </button>
          </div>

          {/* Toggle Code / Diagram */}
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="h-7 px-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            {showCode ? <Eye className="size-3.5" /> : <CodeIcon className="size-3.5" />}
            {showCode ? "Sơ đồ" : "Mã"}
          </button>

          {/* Download SVG */}
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="size-7 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:text-blue-600 transition-colors cursor-pointer"
            title="Tải ảnh vector SVG"
          >
            <Download className="size-3.5" />
          </button>

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopyCode}
            className="size-7 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:text-emerald-600 transition-colors cursor-pointer"
            title="Sao chép cú pháp Mermaid"
          >
            {isCopied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Diagram Area */}
      <div className="p-4 overflow-auto min-h-[180px] max-h-[500px] flex items-center justify-center bg-slate-50/30 dark:bg-neutral-900/30">
        {showCode ? (
          <pre className="w-full text-xs font-mono p-3 rounded-xl bg-slate-900 text-slate-100 overflow-x-auto">
            {code}
          </pre>
        ) : error ? (
          <div className="text-center p-4">
            <p className="text-xs text-rose-500 font-medium mb-1">
              Đang phân tích cú pháp sơ đồ hoặc sơ đồ chưa hoàn thiện.
            </p>
            <pre className="text-[11px] font-mono text-slate-400 max-w-md mx-auto overflow-x-auto text-left bg-slate-100 dark:bg-neutral-800 p-2.5 rounded-lg">
              {code}
            </pre>
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
            className="transition-transform duration-200 ease-out flex items-center justify-center w-full"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        )}
      </div>
    </div>
  )
}
