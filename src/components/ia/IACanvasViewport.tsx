import React, { useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react"
import { tactileProps } from "@/lib/motion"
import { CanvasTransform } from "@/hooks/useCanvasTransform"
import { LayoutNode, LayoutConnector } from "@/hooks/useIATreeState"
import { IANode, IAPortPosition } from "@/types/ia"
import { UXRequest } from "@/data/mockData"
import IABezierConnectors from "./IABezierConnectors"
import IATreeNodeCard from "./IATreeNodeCard"

interface IACanvasViewportProps {
  transform: CanvasTransform
  isPanning: boolean
  layoutNodes: LayoutNode[]
  connectors: LayoutConnector[]
  matchedIds: Set<string>
  requestsMap: Map<string, UXRequest>
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onWheel: (e: WheelEvent, containerRect: DOMRect) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  onFitToView: () => void
  onToggleCollapse: (nodeId: string) => void
  onOpenDetail?: (request: UXRequest) => void
  onAddChild: (parentNode: IANode) => void
  onAddChildInDirection?: (parentId: string, direction: IAPortPosition) => void
  onEditNode: (node: IANode) => void
  onDeleteNode: (node: IANode) => void
  onNodePositionChange?: (nodeId: string, x: number, y: number, persist?: boolean) => void
  onNodeDrag?: (nodeId: string, x: number, y: number) => void
  onNodeDragEnd?: (nodeId: string, x: number, y: number) => void
  onAutoAlign?: () => void
}

export default function IACanvasViewport({
  transform,
  isPanning,
  layoutNodes,
  connectors,
  matchedIds,
  requestsMap,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  zoomIn,
  zoomOut,
  resetZoom,
  onFitToView,
  onToggleCollapse,
  onOpenDetail,
  onAddChild,
  onAddChildInDirection,
  onEditNode,
  onDeleteNode,
  onNodePositionChange,
  onNodeDrag,
  onNodeDragEnd,
  onAutoAlign,
}: IACanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Attach native non-passive wheel listener for smooth cursor-centric zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault()
      const rect = container.getBoundingClientRect()
      onWheel(e, rect)
    }

    container.addEventListener("wheel", handleWheelNative, { passive: false })
    return () => {
      container.removeEventListener("wheel", handleWheelNative)
    }
  }, [onWheel])

  const zoomPercent = Math.round(transform.scale * 100)

  return (
    <div
      ref={containerRef}
      data-testid="ia-canvas-viewport"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`relative flex-1 w-full h-full min-h-[640px] overflow-hidden select-none bg-slate-50/50 rounded-2xl border border-slate-200/80 shadow-inner ${
        isPanning ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{
        backgroundImage: "radial-gradient(circle, #cbd5e1 1.2px, transparent 1.2px)",
        backgroundSize: "28px 28px",
        backgroundPosition: `${transform.x % 28}px ${transform.y % 28}px`,
      }}
    >
      {/* Hardware-Accelerated 60+ FPS Mindmap Canvas Transformation Layer */}
      <div
        data-testid="ia-canvas-transform-layer"
        className="absolute inset-0"
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {/* SVG Cubic Bezier Connectors Layer */}
        <IABezierConnectors connectors={connectors} highlightedIds={matchedIds} />

        {/* 4-Tier Interactive Node Cards Layer */}
        {layoutNodes.map((layoutNode) => {
          const linkedRequest = layoutNode.node.requestId
            ? requestsMap.get(layoutNode.node.requestId)
            : undefined

          return (
            <IATreeNodeCard
              key={layoutNode.node.id}
              layoutNode={layoutNode}
              linkedRequest={linkedRequest}
              isHighlighted={layoutNode.isHighlighted}
              scale={transform.scale}
              onToggleCollapse={onToggleCollapse}
              onOpenDetail={onOpenDetail}
              onAddChild={onAddChild}
              onAddChildInDirection={onAddChildInDirection}
              onEditNode={onEditNode}
              onDeleteNode={onDeleteNode}
              onNodeDrag={onNodeDrag || ((id, x, y) => onNodePositionChange?.(id, x, y, false))}
              onNodeDragEnd={onNodeDragEnd || ((id, x, y) => onNodePositionChange?.(id, x, y, true))}
            />
          )
        })}
      </div>

      {/* Floating Bottom-Right Canvas Control Toolbar */}
      <div
        data-testid="ia-canvas-floating-controls"
        className="absolute bottom-5 right-5 z-30 flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg text-slate-700"
      >
        {onAutoAlign && (
          <>
            <button
              type="button"
              data-testid="ia-auto-align-btn"
              onClick={onAutoAlign}
              title="Tự động sắp xếp lại cây (Auto Align)"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer select-none"
              {...tactileProps.button}
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
              <span>Sắp xếp tự động</span>
            </button>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
          </>
        )}

        <button
          type="button"
          data-testid="ia-zoom-in-btn"
          onClick={zoomIn}
          title="Phóng to (Zoom In)"
          className="p-1.5 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          {...tactileProps.button}
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          data-testid="ia-zoom-out-btn"
          onClick={zoomOut}
          title="Thu nhỏ (Zoom Out)"
          className="p-1.5 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          {...tactileProps.button}
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          data-testid="ia-zoom-reset-btn"
          onClick={resetZoom}
          title="Khôi phục tỉ lệ 100%"
          className="px-2.5 py-1 text-xs font-bold font-mono text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer select-none"
          {...tactileProps.button}
        >
          {zoomPercent}%
        </button>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        <button
          type="button"
          data-testid="ia-fit-view-btn"
          onClick={onFitToView}
          title="Căn giữa toàn bộ cây (Fit to View)"
          className="p-1.5 rounded-xl hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
          {...tactileProps.button}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
