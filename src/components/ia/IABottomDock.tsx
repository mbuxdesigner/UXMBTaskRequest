import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  Plus,
  Code2,
  CloudUpload,
  FileCode,
  SlidersHorizontal,
  Copy,
  RotateCcw,
  MousePointer,
  Hand,
  X,
  LayoutGrid,
  Grid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Maximize,
  Minimize,
  Map as MapIcon,
  ChevronDown,
  Check,
  Database,
  Download,
  RefreshCw,
} from "lucide-react"
import { Tooltip } from "@/components/ui/tooltip"
import { tactileProps } from "@/lib/motion"

export type IADockTool = "add-node" | "data-system" | "settings" | "cloud" | "json" | null

export interface IABottomDockProps {
  activeTool: IADockTool
  onSelectTool: (tool: IADockTool) => void
  toolMode?: "select" | "pan"
  onSelectToolMode?: (mode: "select" | "pan") => void
  onAutoAlign?: () => void
  snapToGrid?: boolean
  onToggleSnapToGrid?: () => void
  isSyncingCloud?: boolean
  isPullingCloud?: boolean
  onPullCloud?: () => void
  onCopyJson?: () => void
  onResetToDefault?: () => void
  readOnly?: boolean
  zoomIn: () => void
  zoomOut: () => void
  zoomPercent: number
  resetZoom: () => void
  onFitToView: () => void
  onZoomToSelection?: () => void
  hasSelectedNodes?: boolean
  isFullscreen: boolean
  toggleFullscreen: () => void
  showMinimap?: boolean
  onToggleMinimap?: () => void
}

export default function IABottomDock({
  activeTool,
  onSelectTool,
  toolMode = "select",
  onSelectToolMode,
  onAutoAlign,
  snapToGrid = false,
  onToggleSnapToGrid,
  isSyncingCloud = false,
  isPullingCloud = false,
  onPullCloud,
  onCopyJson,
  onResetToDefault,
  readOnly = false,
  zoomIn,
  zoomOut,
  zoomPercent,
  resetZoom,
  onFitToView,
  onZoomToSelection,
  hasSelectedNodes = false,
  isFullscreen,
  toggleFullscreen,
  showMinimap = false,
  onToggleMinimap,
}: IABottomDockProps) {
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false)
  const zoomMenuRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(target)) {
        setIsZoomMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleToolToggle = (toolId: IADockTool) => {
    onSelectTool(activeTool === toolId ? null : toolId)
  }

  const isSyncing = isSyncingCloud || isPullingCloud
  const isDataSystemActive =
    activeTool === "data-system" ||
    activeTool === "cloud" ||
    activeTool === "json" ||
    activeTool === "settings"

  return (
    <nav
      data-testid="ia-bottom-dock"
      aria-label="Thanh điều hướng công cụ sơ đồ IA"
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-xl text-slate-700 select-none max-w-[calc(100vw-2rem)] overflow-x-auto scrollbar-none"
    >
      {/* ======================================================== */}
      {/* 1. TƯƠNG TÁC CANVAS (Select V / Pan H)                    */}
      {/* View-only: Chỉ hiển thị Bàn tay Pan/Hand (H)            */}
      {/* ======================================================== */}
      {readOnly ? (
        <div className="flex items-center gap-0.5 p-0.5 bg-slate-100/90 rounded-xl">
          <Tooltip content="Công cụ bàn tay kéo nền (Pan)" shortcut="H" side="top">
            <motion.button
              type="button"
              data-testid="ia-tool-pan-btn"
              onClick={() => onSelectToolMode?.("pan")}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer bg-white text-slate-900 shadow-2xs font-semibold ring-1 ring-slate-200"
              {...tactileProps.button}
            >
              <Hand className="w-4 h-4" />
            </motion.button>
          </Tooltip>
        </div>
      ) : (
        <div className="flex items-center gap-0.5 p-0.5 bg-slate-100/90 rounded-xl">
          <Tooltip content="Công cụ chọn thẻ" shortcut="V" side="top">
            <motion.button
              type="button"
              data-testid="ia-tool-select-btn"
              onClick={() => onSelectToolMode?.("select")}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                toolMode === "select"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
              {...tactileProps.button}
            >
              <MousePointer className="w-4 h-4" />
            </motion.button>
          </Tooltip>

          <Tooltip content="Công cụ bàn tay kéo nền" shortcut="H" side="top">
            <motion.button
              type="button"
              data-testid="ia-tool-pan-btn"
              onClick={() => onSelectToolMode?.("pan")}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
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
      )}

      {/* Divider 1 */}
      <div className="w-px h-5 bg-slate-200/80 mx-0.5" />

      {/* ======================================================== */}
      {/* 2. THÊM NODE (Chỉ dành cho tài khoản có quyền Sửa)        */}
      {/* ======================================================== */}
      {!readOnly && (
        <>
          <Tooltip content="Thêm Node mới" shortcut="A" side="top">
            <motion.button
              type="button"
              data-testid="ia-tool-add-node-btn"
              onClick={() => handleToolToggle("add-node")}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                activeTool === "add-node"
                  ? "bg-blue-50 text-[#1057FB] ring-1 ring-blue-200/90 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              {...tactileProps.button}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </motion.button>
          </Tooltip>
          <div className="w-px h-5 bg-slate-200/80 mx-0.5" />
        </>
      )}

      {/* ======================================================== */}
      {/* ĐỒNG BỘ (View-only) HOẶC DỮ LIỆU & HỆ THỐNG (Edit)      */}
      {/* ======================================================== */}
      {readOnly ? (
        <Tooltip
          content={
            isPullingCloud
              ? "Đang đồng bộ dữ liệu từ Cloud..."
              : "Đồng bộ: Tải dữ liệu mới nhất từ Cloud về để làm mới sơ đồ"
          }
          side="top"
        >
          <motion.button
            type="button"
            data-testid="ia-tool-view-sync-btn"
            onClick={() => onPullCloud?.()}
            disabled={isPullingCloud}
            className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isPullingCloud
                ? "bg-slate-100 text-slate-800 border border-slate-300/80 shadow-2xs cursor-not-allowed"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            {...tactileProps.button}
          >
            <RefreshCw
              className={`w-4 h-4 ${isPullingCloud ? "animate-spin text-slate-700" : "text-slate-600"}`}
            />
            {/* Live status dot */}
            <span
              className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ring-1 ring-white shrink-0 ${
                isPullingCloud ? "bg-amber-500 animate-ping" : "bg-emerald-500"
              }`}
            />
          </motion.button>
        </Tooltip>
      ) : (
        <Tooltip
          content={
            isSyncing
              ? "Đang đồng bộ dữ liệu với Cloud..."
              : "Dữ liệu & Hệ thống (Nhập/Xuất JSON, Đồng bộ Cloud, Tải file)"
          }
          side="top"
        >
          <motion.button
            type="button"
            data-testid="ia-tool-data-system-btn"
            onClick={() => handleToolToggle("data-system")}
            className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isDataSystemActive
                ? "bg-blue-50 text-[#1057FB] ring-1 ring-blue-200/90 shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            {...tactileProps.button}
          >
            <Code2 className="w-4 h-4" />
            {/* Live status dot */}
            <span
              className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ring-1 ring-white shrink-0 ${
                isSyncing ? "bg-amber-500 animate-ping" : "bg-emerald-500"
              }`}
            />
          </motion.button>
        </Tooltip>
      )}

      {/* Divider */}
      <div className="w-px h-5 bg-slate-200/80 mx-0.5" />

      {/* ======================================================== */}
      {/* 4. AUTO LAYOUT & HÍT LƯỚI (Chỉ dành cho quyền Sửa)       */}
      {/* ======================================================== */}
      {!readOnly && (
        <>
          <div className="flex items-center gap-1">
            {/* Auto layout */}
            {onAutoAlign && (
              <Tooltip content="Tự động sắp xếp các nhánh sơ đồ (Auto layout)" shortcut="L" side="top">
                <motion.button
                  type="button"
                  data-testid="ia-auto-align-btn"
                  onClick={onAutoAlign}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer select-none"
                  {...tactileProps.button}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                  <span>Auto layout</span>
                </motion.button>
              </Tooltip>
            )}

            {/* Hít lưới (Snap to grid) */}
            {onToggleSnapToGrid && (
              <Tooltip
                content={snapToGrid ? "Đang bật hít lưới 20px (Click để tắt)" : "Đang tắt hít lưới (Click để bật)"}
                shortcut="G"
                side="top"
              >
                <motion.button
                  type="button"
                  data-testid="ia-snap-grid-btn"
                  onClick={onToggleSnapToGrid}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    snapToGrid
                      ? "bg-blue-50 text-[#1057FB] border border-blue-200/80 font-semibold"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  {...tactileProps.button}
                >
                  <Grid className="w-4 h-4" />
                </motion.button>
              </Tooltip>
            )}
          </div>
          <div className="w-px h-5 bg-slate-200/80 mx-0.5" />
        </>
      )}

      {/* ======================================================== */}
      {/* 5 (hoặc 3). KHUNG NHÌN & THU PHÓNG (Căn giữa bỏ text)     */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      <div className="flex items-center gap-1">
        {/* Zoom Out */}
        <Tooltip content="Thu nhỏ tỉ lệ (Zoom Out)" shortcut="-" side="top">
          <motion.button
            type="button"
            data-testid="ia-zoom-out-btn"
            onClick={zoomOut}
            className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            {...tactileProps.button}
          >
            <ZoomOut className="w-4 h-4" />
          </motion.button>
        </Tooltip>

        {/* Zoom Percent Popover */}
        <div className="relative" ref={zoomMenuRef}>
          <Tooltip content="Tùy chọn thu phóng (Click để mở)" side="top">
            <motion.button
              type="button"
              data-testid="ia-zoom-reset-btn"
              onClick={() => setIsZoomMenuOpen((v) => !v)}
              className={`px-2 py-1 text-xs font-bold font-mono rounded-xl transition-colors cursor-pointer select-none ${
                isZoomMenuOpen
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
              {...tactileProps.button}
            >
              {zoomPercent}%
            </motion.button>
          </Tooltip>

          {isZoomMenuOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs select-none">
              <button
                type="button"
                onClick={() => {
                  zoomIn()
                  setIsZoomMenuOpen(false)
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span>Zoom in</span>
                <span className="font-mono text-[10px] text-slate-400">⌘ +</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  zoomOut()
                  setIsZoomMenuOpen(false)
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span>Zoom out</span>
                <span className="font-mono text-[10px] text-slate-400">⌘ -</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  resetZoom()
                  setIsZoomMenuOpen(false)
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span>Zoom 100%</span>
                <span className="font-mono text-[10px] text-slate-400">⌘ 0</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onFitToView()
                  setIsZoomMenuOpen(false)
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer font-medium"
              >
                <span>Zoom to fit</span>
                <span className="font-mono text-[10px] text-slate-400">F</span>
              </button>
              {hasSelectedNodes && onZoomToSelection && (
                <button
                  type="button"
                  onClick={() => {
                    onZoomToSelection()
                    setIsZoomMenuOpen(false)
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer font-medium"
                >
                  <span>Phóng tới node đang chọn</span>
                  <span className="font-mono text-[10px] text-blue-400">D</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Zoom In */}
        <Tooltip content="Phóng to tỉ lệ (Zoom In)" shortcut="+" side="top">
          <motion.button
            type="button"
            data-testid="ia-zoom-in-btn"
            onClick={zoomIn}
            className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            {...tactileProps.button}
          >
            <ZoomIn className="w-4 h-4" />
          </motion.button>
        </Tooltip>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        {/* Căn giữa toàn bộ sơ đồ (BỎ TEXT theo yêu cầu, chỉ hiển thị icon Maximize2) */}
        <Tooltip content="Căn giữa toàn bộ sơ đồ (Fit to View)" shortcut="F" side="top">
          <motion.button
            type="button"
            data-testid="ia-fit-view-btn"
            onClick={onFitToView}
            className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            {...tactileProps.button}
          >
            <Maximize2 className="w-4 h-4 text-slate-600" />
          </motion.button>
        </Tooltip>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        {/* Toàn màn hình (Fullscreen) */}
        <Tooltip
          content={isFullscreen ? "Thu nhỏ (Thoát toàn màn hình)" : "Phóng to toàn màn hình"}
          side="top"
        >
          <motion.button
            type="button"
            data-testid="ia-fullscreen-btn"
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isFullscreen
                ? "bg-blue-50 text-blue-600 font-semibold"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            {...tactileProps.button}
          >
            {isFullscreen ? <Minimize className="w-4 h-4 text-blue-600" /> : <Maximize className="w-4 h-4" />}
          </motion.button>
        </Tooltip>

        {/* Bản đồ thu nhỏ (Minimap) */}
        {!readOnly && onToggleMinimap && (
          <Tooltip content="Bật/tắt bản đồ thu nhỏ (Minimap)" side="top">
            <motion.button
              type="button"
              data-testid="ia-toggle-minimap-btn"
              onClick={onToggleMinimap}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                showMinimap
                  ? "bg-blue-50 text-blue-600 font-semibold border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
              {...tactileProps.button}
            >
              <MapIcon className="w-4 h-4" />
            </motion.button>
          </Tooltip>
        )}
      </div>
    </nav>
  )
}
