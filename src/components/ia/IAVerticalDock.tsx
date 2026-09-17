import React from "react"
import { motion } from "framer-motion"
import {
  Sparkles,
  CloudUpload,
  FileCode,
  SlidersHorizontal,
  Copy,
  RotateCcw,
  MousePointer,
  Hand,
  X,
} from "lucide-react"
import { Tooltip } from "@/components/ui/tooltip"
import { tactileProps } from "@/lib/motion"

export type IADockTool = "add-node" | "settings" | "cloud" | "json" | null

export interface IAVerticalDockProps {
  activeTool: IADockTool
  onSelectTool: (tool: IADockTool) => void
  toolMode?: "select" | "pan"
  onSelectToolMode?: (mode: "select" | "pan") => void
  onAutoAlign?: () => void
  onCopyJson?: () => void
  onResetToDefault?: () => void
  isSyncingCloud?: boolean
  isPullingCloud?: boolean
  readOnly?: boolean
  snapToGrid?: boolean
  onToggleSnapToGrid?: () => void
  onFitToView?: () => void
  zoomIn?: () => void
  zoomOut?: () => void
}

export const DOCK_TOOLS = [
  { id: "add-node", label: "Thêm Node", icon: Sparkles, hasSheet: true, shortcut: "A" },
  { id: "settings", label: "Cài đặt sơ đồ", icon: SlidersHorizontal, hasSheet: true, shortcut: "S" },
  { id: "cloud", label: "Đồng bộ Cloud", icon: CloudUpload, hasSheet: true, shortcut: "C" },
  { id: "json", label: "Nhập/Xuất JSON", icon: FileCode, hasSheet: true, shortcut: "J" },
  { id: "copy-json", label: "Sao chép sơ đồ", icon: Copy, hasSheet: false, shortcut: "Cmd+C" },
  { id: "reset", label: "Khôi phục mặc định", icon: RotateCcw, hasSheet: false },
]

export default function IAVerticalDock({
  activeTool,
  onSelectTool,
  toolMode = "select",
  onSelectToolMode,
  onAutoAlign,
  onCopyJson,
  onResetToDefault,
  isSyncingCloud = false,
  isPullingCloud = false,
  readOnly = false,
  snapToGrid = false,
  onToggleSnapToGrid,
  onFitToView,
  zoomIn,
  zoomOut,
}: IAVerticalDockProps) {
  const handleToolClick = (toolId: string) => {
    switch (toolId) {
      case "add-node":
      case "settings":
      case "cloud":
      case "json":
        onSelectTool(activeTool === toolId ? null : (toolId as IADockTool))
        break
      case "auto-align":
        onAutoAlign?.()
        break
      case "copy-json":
        onCopyJson?.()
        break
      case "reset":
        onResetToDefault?.()
        break
    }
  }

  return (
    <aside
      data-testid="ia-vertical-dock"
      aria-label="Thanh công cụ bên trái (Magnific Lateral Dock)"
      className="absolute left-3.5 top-1/2 -translate-y-1/2 z-30 w-14 h-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl rounded-2xl flex flex-col items-center py-2 px-1.5 select-none"
    >
      {/* Core Tools Section */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        {/* Pointer Mode Switcher: Trỏ chuột (V) vs Kéo nền (H) */}
        {!readOnly && (
          <>
            <div className="flex flex-col items-center gap-1 p-1 bg-slate-100/90 rounded-xl w-full">
              <Tooltip content="Công cụ quét chọn thẻ" shortcut="V" side="right">
                <motion.button
                  type="button"
                  data-testid="ia-tool-select-btn"
                  onClick={() => onSelectToolMode?.("select")}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    toolMode === "select"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                  {...tactileProps.button}
                >
                  <MousePointer className="w-4 h-4" />
                </motion.button>
              </Tooltip>

              <Tooltip content="Công cụ bàn tay kéo nền" shortcut="H" side="right">
                <motion.button
                  type="button"
                  data-testid="ia-tool-pan-btn"
                  onClick={() => onSelectToolMode?.("pan")}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    toolMode === "pan"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                  {...tactileProps.button}
                >
                  <Hand className="w-4 h-4" />
                </motion.button>
              </Tooltip>
            </div>

            <div className="w-8 h-px bg-slate-200/80 my-0.5" />
          </>
        )}

        {/* 7 Core Tools */}
        {DOCK_TOOLS.map((tool) => {
          const hasSheet = "hasSheet" in tool && tool.hasSheet
          const isActive = activeTool === tool.id
          const isToolActiveWithSheet = isActive && Boolean(hasSheet)
          const IconComponent = isToolActiveWithSheet ? X : tool.icon
          const isCloudTool = tool.id === "cloud"
          const isSyncing = isCloudTool && (isSyncingCloud || isPullingCloud)

          // Hide mutation tools if readOnly
          if (readOnly && (tool.id === "add-node" || tool.id === "settings" || tool.id === "reset" || tool.id === "cloud")) {
            return null
          }

          return (
            <React.Fragment key={tool.id}>
              {tool.id === "copy-json" && (
                <div className="w-8 h-px bg-slate-200/80 my-0.5" />
              )}
              <Tooltip
                content={isToolActiveWithSheet ? `Đóng ${tool.label} (Esc)` : tool.label}
                shortcut={isToolActiveWithSheet ? "Esc" : ("shortcut" in tool ? (tool as any).shortcut : undefined)}
                side="right"
                delayDuration={120}
              >
                <motion.button
                  type="button"
                  data-testid={`ia-dock-tool-${tool.id}`}
                  onClick={() => handleToolClick(tool.id)}
                  className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isToolActiveWithSheet
                      ? "bg-slate-900 text-white shadow-md ring-2 ring-slate-900/20 active:scale-95"
                      : isActive
                      ? "bg-[#1057FB] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 active:scale-95"
                  }`}
                  {...tactileProps.button}
                >
                  <IconComponent className={`w-4 h-4 ${isToolActiveWithSheet ? "stroke-[2.5]" : isSyncing ? "animate-pulse text-amber-300" : ""}`} />

                  {/* Cloud indicator dot (ẩn khi đang active chuyển thành X) */}
                  {isCloudTool && !isToolActiveWithSheet && (
                    <span
                      className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                        isSyncing
                          ? "bg-amber-400 animate-ping"
                          : "bg-emerald-500 ring-2 ring-white"
                      }`}
                    />
                  )}
                </motion.button>
              </Tooltip>
            </React.Fragment>
          )
        })}
      </div>
    </aside>
  )
}
