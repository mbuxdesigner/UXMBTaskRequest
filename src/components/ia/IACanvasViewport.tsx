import React, { useRef, useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react"
import { tactileProps } from "@/lib/motion"
import { CanvasTransform } from "@/hooks/useCanvasTransform"
import { LayoutNode, LayoutConnector } from "@/hooks/useIATreeState"
import { IANode, IAPortPosition, IAPortDragState } from "@/types/ia"
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
  onConnectNodes?: (sourceNodeId: string, targetNodeId: string) => void
  onCreateConnectedNodeAt?: (
    sourceNodeId: string,
    position: { x: number; y: number },
    sourcePort: IAPortPosition
  ) => void
  onEditNode: (node: IANode) => void
  onDeleteNode: (node: IANode) => void
  onNodePositionChange?: (nodeId: string, x: number, y: number, persist?: boolean) => void
  onNodeDrag?: (nodeId: string, x: number, y: number) => void
  onNodeDragEnd?: (nodeId: string, x: number, y: number) => void
  onNodeResize?: (nodeId: string, width: number, height: number) => void
  onNodeResizeEnd?: (nodeId: string, width: number, height: number) => void
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
  onConnectNodes,
  onCreateConnectedNodeAt,
  onEditNode,
  onDeleteNode,
  onNodePositionChange,
  onNodeDrag,
  onNodeDragEnd,
  onNodeResize,
  onNodeResizeEnd,
  onAutoAlign,
}: IACanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Active port wire drag state for dynamic bezier preview & connection
  const [activeWireDrag, setActiveWireDrag] = useState<IAPortDragState | null>(null)
  const wireDragRef = useRef<{
    sourceNodeId: string
    sourcePort: IAPortPosition
    startCanvasX: number
    startCanvasY: number
    startScreenX: number
    startScreenY: number
    hasMovedBeyondThreshold: boolean
  } | null>(null)

  const handlePortDragStart = useCallback(
    (nodeId: string, port: IAPortPosition, e: React.PointerEvent) => {
      const sourceLayout = layoutNodes.find((ln) => ln.node.id === nodeId)
      if (!sourceLayout) return

      let startCanvasX = sourceLayout.x + sourceLayout.width / 2
      let startCanvasY = sourceLayout.y + sourceLayout.height / 2
      if (port === "top") startCanvasY = sourceLayout.y
      else if (port === "bottom") startCanvasY = sourceLayout.y + sourceLayout.height
      else if (port === "left") startCanvasX = sourceLayout.x
      else if (port === "right") startCanvasX = sourceLayout.x + sourceLayout.width

      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const currentCanvasX = Number(((e.clientX - rect.left - transform.x) / transform.scale).toFixed(2))
      const currentCanvasY = Number(((e.clientY - rect.top - transform.y) / transform.scale).toFixed(2))

      wireDragRef.current = {
        sourceNodeId: nodeId,
        sourcePort: port,
        startCanvasX,
        startCanvasY,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        hasMovedBeyondThreshold: false,
      }

      setActiveWireDrag({
        sourceNodeId: nodeId,
        sourcePort: port,
        startCanvasX,
        startCanvasY,
        currentCanvasX,
        currentCanvasY,
        hoveredTargetNodeId: null,
      })
    },
    [layoutNodes, transform]
  )

  // Listen to window pointer movements & release during active wire dragging
  useEffect(() => {
    if (!activeWireDrag) return

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!wireDragRef.current || !containerRef.current) return

      const dist = Math.hypot(
        e.clientX - wireDragRef.current.startScreenX,
        e.clientY - wireDragRef.current.startScreenY
      )
      if (dist >= 6) {
        wireDragRef.current.hasMovedBeyondThreshold = true
      }

      const rect = containerRef.current.getBoundingClientRect()
      const canvasX = Number(((e.clientX - rect.left - transform.x) / transform.scale).toFixed(2))
      const canvasY = Number(((e.clientY - rect.top - transform.y) / transform.scale).toFixed(2))

      // Identify hovered card for connection target highlight
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const targetCard = el?.closest("[data-node-id]") as HTMLElement | null
      const hoveredId = targetCard?.getAttribute("data-node-id") || null
      const validHoveredId =
        hoveredId && hoveredId !== wireDragRef.current.sourceNodeId ? hoveredId : null

      setActiveWireDrag((prev) =>
        prev
          ? {
              ...prev,
              currentCanvasX: canvasX,
              currentCanvasY: canvasY,
              hoveredTargetNodeId: validHoveredId,
            }
          : null
      )
    }

    const handleWindowPointerUp = (e: PointerEvent) => {
      const drag = wireDragRef.current
      wireDragRef.current = null
      setActiveWireDrag(null)

      if (!drag) return

      // Quick click (< 6px movement) triggers standard directional child creation
      if (!drag.hasMovedBeyondThreshold) {
        onAddChildInDirection?.(drag.sourceNodeId, drag.sourcePort)
        return
      }

      // Dragged wire drop
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const targetCard = el?.closest("[data-node-id]") as HTMLElement | null
      const targetId = targetCard?.getAttribute("data-node-id")

      if (targetId && targetId !== drag.sourceNodeId) {
        // Connect to existing target node
        onConnectNodes?.(drag.sourceNodeId, targetId)
      } else {
        // Drop on empty canvas -> Create connected node at drop position
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          const dropCanvasX = Number(((e.clientX - rect.left - transform.x) / transform.scale).toFixed(2))
          const dropCanvasY = Number(((e.clientY - rect.top - transform.y) / transform.scale).toFixed(2))
          onCreateConnectedNodeAt?.(
            drag.sourceNodeId,
            { x: dropCanvasX, y: dropCanvasY },
            drag.sourcePort
          )
        }
      }
    }

    window.addEventListener("pointermove", handleWindowPointerMove)
    window.addEventListener("pointerup", handleWindowPointerUp)
    window.addEventListener("pointercancel", handleWindowPointerUp)

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove)
      window.removeEventListener("pointerup", handleWindowPointerUp)
      window.removeEventListener("pointercancel", handleWindowPointerUp)
    }
  }, [activeWireDrag, transform, onAddChildInDirection, onConnectNodes, onCreateConnectedNodeAt])

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
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
      className={`relative flex-1 w-full h-full min-h-[640px] overflow-hidden select-none bg-slate-50/50 rounded-2xl border border-slate-200/80 shadow-inner ${
        activeWireDrag
          ? "cursor-crosshair"
          : isPanning
          ? "cursor-grabbing"
          : "cursor-grab"
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
        <IABezierConnectors
          connectors={connectors}
          highlightedIds={matchedIds}
          activeWireDrag={activeWireDrag}
        />

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
              requestsMap={requestsMap}
              isHighlighted={layoutNode.isHighlighted}
              isWireDropTarget={activeWireDrag?.hoveredTargetNodeId === layoutNode.node.id}
              scale={transform.scale}
              onToggleCollapse={onToggleCollapse}
              onOpenDetail={onOpenDetail}
              onAddChild={onAddChild}
              onAddChildInDirection={onAddChildInDirection}
              onPortDragStart={handlePortDragStart}
              onEditNode={onEditNode}
              onDeleteNode={onDeleteNode}
              onNodeDrag={onNodeDrag || ((id, x, y) => onNodePositionChange?.(id, x, y, false))}
              onNodeDragEnd={onNodeDragEnd || ((id, x, y) => onNodePositionChange?.(id, x, y, true))}
              onNodeResize={onNodeResize}
              onNodeResizeEnd={onNodeResizeEnd}
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
