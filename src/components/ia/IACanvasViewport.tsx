import React, { useRef, useEffect, useState, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  MousePointer,
  Hand,
  LayoutGrid,
  Grid,
  Map as MapIcon,
  Maximize,
  Minimize,
  MoreHorizontal,
  Copy,
  FileCode,
  CheckSquare,
  Check,
} from "lucide-react"
import { tactileProps } from "@/lib/motion"
import { CanvasTransform } from "@/hooks/useCanvasTransform"
import { LayoutNode, LayoutConnector } from "@/hooks/useIATreeState"
import { IANode, IAPortPosition, IAPortDragState } from "@/types/ia"
import { UXRequest } from "@/data/mockData"
import IABezierConnectors from "./IABezierConnectors"
import IATreeNodeCard from "./IATreeNodeCard"
import IAMinimap from "./IAMinimap"
import IANodeFloatingToolbar from "./IANodeFloatingToolbar"

interface IACanvasViewportProps {
  transform: CanvasTransform
  setTransform?: React.Dispatch<React.SetStateAction<CanvasTransform>>
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
    sourcePort: IAPortPosition,
    nodeData?: Partial<IANode>
  ) => void
  onEditNode: (node: IANode) => void
  onDeleteNode: (node: IANode) => void
  onNodePositionChange?: (nodeId: string, x: number, y: number, persist?: boolean) => void
  onNodeDrag?: (nodeId: string, x: number, y: number) => void
  onNodeDragEnd?: (nodeId: string, x: number, y: number) => void
  onMultipleNodesDrag?: (positions: Array<{ nodeId: string; x: number; y: number }>, persist: boolean) => void
  onNodeResize?: (nodeId: string, width: number, height: number) => void
  onNodeResizeEnd?: (nodeId: string, width: number, height: number) => void
  onTrunkDrag?: (nodeId: string, offset: number, persist?: boolean) => void
  onAutoAlign?: () => void
  readOnly?: boolean
  bounds?: { minX: number; minY: number; maxX: number; maxY: number }
  onCopyJson?: () => void
  onOpenImportJson?: () => void
  onSelectNode?: (node: IANode | null) => void
  onAddNodeAtPosition?: (position: { x: number; y: number }, nodeData: Partial<IANode>) => void
  onOpenNodeDetail?: (node: IANode) => void
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
  onMultipleNodesDrag,
  onNodeResize,
  onNodeResizeEnd,
  onTrunkDrag,
  onAutoAlign,
  setTransform,
  bounds,
  onCopyJson,
  onOpenImportJson,
  onSelectNode,
  onAddNodeAtPosition,
  onOpenNodeDetail,
  readOnly = false,
}: IACanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Fullscreen Mode state
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Snap to Grid state (20px interval, default: true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  // Minimap state (default: false)
  const [showMinimap, setShowMinimap] = useState(false)
  // Canvas Menu dropdown state (...)
  const [isCanvasMenuOpen, setIsCanvasMenuOpen] = useState(false)
  const canvasMenuRef = useRef<HTMLDivElement>(null)

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen((prev) => !prev)
        })
      } else {
        setIsFullscreen((prev) => !prev)
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [])

  // Close canvas menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (canvasMenuRef.current && !canvasMenuRef.current.contains(e.target as Node)) {
        setIsCanvasMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Canvas Tool Mode: "select" (Marquee selection box) or "pan" (Hand pan)
  const [toolMode, setToolMode] = useState<"select" | "pan">("select")
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set())
  // Track active node dragging across all cards so animations are disabled globally during drag
  const [isDraggingNodes, setIsDraggingNodes] = useState(false)
  const handleCardDragStateChange = useCallback((isDragging: boolean) => {
    setIsDraggingNodes(isDragging)
  }, [])

  // Notify parent of selected node
  useEffect(() => {
    if (selectedNodeIds.size === 1) {
      const sId = Array.from(selectedNodeIds)[0]
      const target = layoutNodes.find((l) => l.node.id === sId)
      onSelectNode?.(target ? target.node : null)
    } else {
      onSelectNode?.(null)
    }
  }, [selectedNodeIds, layoutNodes, onSelectNode])

  // Marquee Box state in canvas-space coordinates
  const [marqueeBox, setMarqueeBox] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)

  const marqueeRef = useRef<{
    startCanvasX: number
    startCanvasY: number
    startScreenX: number
    startScreenY: number
    initialSelectedIds: Set<string>
    hasMoved: boolean
  } | null>(null)

  // Fast lookup of positions for currently selected nodes
  const selectedNodePositions = useMemo(() => {
    if (selectedNodeIds.size === 0) return undefined
    const map = new Map<string, { x: number; y: number }>()
    for (const ln of layoutNodes) {
      if (selectedNodeIds.has(ln.node.id)) {
        map.set(ln.node.id, { x: ln.x, y: ln.y })
      }
    }
    return map
  }, [selectedNodeIds, layoutNodes])

  // Clear selections when layoutNodes completely change or become empty
  useEffect(() => {
    if (layoutNodes.length === 0 && selectedNodeIds.size > 0) {
      setSelectedNodeIds(new Set())
    }
  }, [layoutNodes, selectedNodeIds.size])

  // Keyboard Shortcuts: Space to Pan, V for Select, H for Hand, Esc to Deselect, Ctrl/Cmd + A to Select All
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return
      }

      if (e.code === "Space" && !e.repeat) {
        setIsSpacePressed(true)
      } else if ((e.key === "v" || e.key === "V") && !e.ctrlKey && !e.metaKey) {
        setToolMode("select")
      } else if ((e.key === "h" || e.key === "H") && !e.ctrlKey && !e.metaKey) {
        setToolMode("pan")
      } else if (e.key === "Escape") {
        setSelectedNodeIds(new Set())
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        e.preventDefault()
        setSelectedNodeIds(new Set(layoutNodes.map((n) => n.node.id)))
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [layoutNodes])

  // Card Selection Handler (Click, Shift+Click, Maintain group selection)
  const handleCardSelect = useCallback(
    (nodeId: string, e: React.PointerEvent) => {
      if (readOnly) return

      setSelectedNodeIds((prev) => {
        if (e.shiftKey) {
          const next = new Set(prev)
          if (next.has(nodeId)) {
            next.delete(nodeId)
          } else {
            next.add(nodeId)
          }
          return next
        }

        // If already selected, maintain entire selection so dragging group works
        if (prev.has(nodeId)) {
          return prev
        }

        // Single card click selects that card exclusively
        return new Set([nodeId])
      })
    },
    [readOnly]
  )

  // Canvas Viewport Pointer Down: Intercept for Marquee Selection or Pan
  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement
      // Ignore if pointer down originated on a card, port, button, input, or floating toolbar
      if (
        target.closest(
          "[data-node-id], [data-port-action], [data-resize-handle], button, a, input, textarea, [data-testid='ia-canvas-floating-controls'], [data-testid='ia-canvas-selection-pill']"
        )
      ) {
        return
      }

      // In readOnly mode: Dragging empty canvas pans canvas. Clicking without dragging clears selection.
      if (readOnly) {
        if (e.button === 0) {
          const startX = e.clientX
          const startY = e.clientY
          let hasMoved = false
          const handleWindowMove = (moveEvt: PointerEvent) => {
            if (Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY) > 3) {
              hasMoved = true
            }
          }
          const handleWindowUp = () => {
            window.removeEventListener("pointermove", handleWindowMove)
            window.removeEventListener("pointerup", handleWindowUp)
            window.removeEventListener("pointercancel", handleWindowUp)
            if (!hasMoved) {
              setSelectedNodeIds(new Set())
            }
          }
          window.addEventListener("pointermove", handleWindowMove)
          window.addEventListener("pointerup", handleWindowUp)
          window.addEventListener("pointercancel", handleWindowUp)
        }
        onPointerDown(e)
        return
      }

      // In Pan mode, middle mouse button, or Space held down: Pan canvas
      if (e.button === 1 || toolMode === "pan" || isSpacePressed) {
        onPointerDown(e)
        return
      }

      // In Select mode with primary mouse button: Start Marquee Selection Box
      if (e.button === 0 && !readOnly) {
        const container = containerRef.current
        if (!container) return
        const rect = container.getBoundingClientRect()
        const startCanvasX = Number(((e.clientX - rect.left - transform.x) / transform.scale).toFixed(2))
        const startCanvasY = Number(((e.clientY - rect.top - transform.y) / transform.scale).toFixed(2))

        const initialSelectedIds = e.shiftKey ? new Set(selectedNodeIds) : new Set<string>()

        marqueeRef.current = {
          startCanvasX,
          startCanvasY,
          startScreenX: e.clientX,
          startScreenY: e.clientY,
          initialSelectedIds,
          hasMoved: false,
        }

        const handleWindowPointerMove = (moveEvt: PointerEvent) => {
          const m = marqueeRef.current
          if (!m || !containerRef.current) return

          const dist = Math.hypot(moveEvt.clientX - m.startScreenX, moveEvt.clientY - m.startScreenY)
          if (dist > 3) {
            m.hasMoved = true
          }

          if (m.hasMoved) {
            const cRect = containerRef.current.getBoundingClientRect()
            const currentCanvasX = Number(((moveEvt.clientX - cRect.left - transform.x) / transform.scale).toFixed(2))
            const currentCanvasY = Number(((moveEvt.clientY - cRect.top - transform.y) / transform.scale).toFixed(2))

            setMarqueeBox({
              startX: m.startCanvasX,
              startY: m.startCanvasY,
              currentX: currentCanvasX,
              currentY: currentCanvasY,
            })

            const minX = Math.min(m.startCanvasX, currentCanvasX)
            const maxX = Math.max(m.startCanvasX, currentCanvasX)
            const minY = Math.min(m.startCanvasY, currentCanvasY)
            const maxY = Math.max(m.startCanvasY, currentCanvasY)

            const newlySelected = new Set(m.initialSelectedIds)
            for (const ln of layoutNodes) {
              const nodeRight = ln.x + ln.width
              const nodeBottom = ln.y + ln.height
              // Bounding box intersection check
              const intersects = !(nodeRight < minX || ln.x > maxX || nodeBottom < minY || ln.y > maxY)
              if (intersects) {
                newlySelected.add(ln.node.id)
              }
            }
            setSelectedNodeIds(newlySelected)
          }
        }

        const handleWindowPointerUp = (upEvt: PointerEvent) => {
          window.removeEventListener("pointermove", handleWindowPointerMove)
          window.removeEventListener("pointerup", handleWindowPointerUp)
          window.removeEventListener("pointercancel", handleWindowPointerUp)

          const m = marqueeRef.current
          marqueeRef.current = null
          setMarqueeBox(null)

          // If user clicked on empty canvas without dragging and without Shift, clear selection
          if (m && !m.hasMoved && !upEvt.shiftKey) {
            setSelectedNodeIds(new Set())
          }
        }

        window.addEventListener("pointermove", handleWindowPointerMove)
        window.addEventListener("pointerup", handleWindowPointerUp)
        window.addEventListener("pointercancel", handleWindowPointerUp)
      }
    },
    [toolMode, isSpacePressed, readOnly, transform, selectedNodeIds, layoutNodes, onPointerDown]
  )

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
      if (readOnly) return
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
  const isHandMode = toolMode === "pan" || isSpacePressed
  const cursorClass = activeWireDrag
    ? "cursor-crosshair"
    : isPanning
    ? "cursor-grabbing"
    : isHandMode
    ? "cursor-grab"
    : "cursor-default"

  return (
    <div
      ref={containerRef}
      data-testid="ia-canvas-viewport"
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
      }}
      onDrop={(e) => {
        e.preventDefault()
        try {
          const raw = e.dataTransfer.getData("application/json")
          if (!raw) return
          const data = JSON.parse(raw)
          const container = containerRef.current
          if (!container) return
          const rect = container.getBoundingClientRect()
          const dropCanvasX = Number(((e.clientX - rect.left - transform.x) / transform.scale).toFixed(2))
          const dropCanvasY = Number(((e.clientY - rect.top - transform.y) / transform.scale).toFixed(2))

          const finalX = snapToGrid ? Math.round(dropCanvasX / 20) * 20 : dropCanvasX
          const finalY = snapToGrid ? Math.round(dropCanvasY / 20) * 20 : dropCanvasY

          onAddNodeAtPosition?.({ x: finalX, y: finalY }, data)
        } catch (err) {
          console.warn("Drop error:", err)
        }
      }}
      className={`${
        isFullscreen
          ? "fixed inset-0 z-50 w-screen h-screen rounded-none"
          : "relative flex-1 w-full h-full min-h-[640px] rounded-2xl border border-slate-200/80 shadow-inner"
      } overflow-hidden select-none bg-slate-50/50 ${cursorClass}`}
      style={{
        backgroundImage: "radial-gradient(circle, #cbd5e1 1.2px, transparent 1.2px)",
        backgroundSize: "28px 28px",
        backgroundPosition: `${transform.x % 28}px ${transform.y % 28}px`,
      }}
    >
      {/* Hardware-Accelerated Mindmap Canvas Transformation Layer */}
      <div
        data-testid="ia-canvas-transform-layer"
        className="absolute inset-0 antialiased [text-rendering:optimizeLegibility]"
        style={{
          transform: `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0) scale(${transform.scale})`,
          transformOrigin: "0 0",
          willChange: isPanning ? "transform" : "auto",
        }}
      >
        {/* SVG Cubic Bezier Connectors Layer */}
        <IABezierConnectors
          connectors={connectors}
          highlightedIds={matchedIds}
          activeWireDrag={activeWireDrag}
          scale={transform.scale}
          onTrunkDrag={onTrunkDrag}
          readOnly={readOnly}
        />

        {/* Real-time Marquee Selection Box Layer */}
        {marqueeBox && (
          <div
            data-testid="ia-marquee-selection-box"
            className="absolute border-2 border-blue-500 bg-blue-500/15 border-dashed rounded-lg pointer-events-none z-50 backdrop-blur-[0.5px] shadow-sm transition-none"
            style={{
              left: Math.min(marqueeBox.startX, marqueeBox.currentX),
              top: Math.min(marqueeBox.startY, marqueeBox.currentY),
              width: Math.max(1, Math.abs(marqueeBox.currentX - marqueeBox.startX)),
              height: Math.max(1, Math.abs(marqueeBox.currentY - marqueeBox.startY)),
            }}
          />
        )}

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
              isSelected={selectedNodeIds.has(layoutNode.node.id)}
              selectedNodePositions={selectedNodePositions}
              onCardSelect={handleCardSelect}
              onOpenNodeDetail={onOpenNodeDetail}
              onMultiNodeDrag={readOnly ? undefined : onMultipleNodesDrag}
              isWireDropTarget={activeWireDrag?.hoveredTargetNodeId === layoutNode.node.id}
              scale={transform.scale}
              onToggleCollapse={onToggleCollapse}
              onOpenDetail={onOpenDetail}
              onAddChild={onAddChild}
              onAddChildInDirection={readOnly ? undefined : onAddChildInDirection}
              onPortDragStart={readOnly ? undefined : handlePortDragStart}
              onEditNode={onEditNode}
              onDeleteNode={onDeleteNode}
              onNodeDrag={readOnly ? undefined : onNodeDrag || ((id, x, y) => onNodePositionChange?.(id, x, y, false))}
              onNodeDragEnd={readOnly ? undefined : onNodeDragEnd || ((id, x, y) => onNodePositionChange?.(id, x, y, true))}
              onNodeResize={readOnly ? undefined : onNodeResize}
              onNodeResizeEnd={readOnly ? undefined : onNodeResizeEnd}
              readOnly={readOnly}
              isAnyDragging={isDraggingNodes}
              onDragStateChange={readOnly ? undefined : handleCardDragStateChange}
              snapToGrid={snapToGrid}
            />
          )
        })}

        {/* Floating Contextual Action Toolbar for Selected Node (Requirement 7) */}
        {selectedNodeIds.size === 1 && (() => {
          const selectedId = Array.from(selectedNodeIds)[0]
          const target = layoutNodes.find((ln) => ln.node.id === selectedId)
          if (!target) return null
          const linkedReq = target.node.requestId ? requestsMap.get(target.node.requestId) : undefined
          return (
            <IANodeFloatingToolbar
              node={target.node}
              x={target.x}
              y={target.y}
              nodeWidth={target.width}
              scale={transform.scale}
              onAddChild={onAddChild}
              onEditNode={onEditNode}
              onDeleteNode={onDeleteNode}
              onViewDetail={onOpenNodeDetail || onEditNode}
              onOpenTask={onOpenDetail}
              linkedRequest={linkedReq}
              onCenterNode={() => {
                const vpWidth = containerRef.current ? containerRef.current.clientWidth : 1200
                const vpHeight = containerRef.current ? containerRef.current.clientHeight : 700
                const nodeCenterX = target.x + target.width / 2
                const nodeCenterY = target.y + target.height / 2
                const newPanX = vpWidth / 2 - nodeCenterX * transform.scale
                const newPanY = vpHeight / 2 - nodeCenterY * transform.scale
                if (setTransform) {
                  setTransform((prev) => ({
                    ...prev,
                    x: Number(newPanX.toFixed(2)),
                    y: Number(newPanY.toFixed(2)),
                  }))
                }
              }}
              readOnly={readOnly}
            />
          )
        })()}
      </div>

      {/* Interactive Minimap Layer (Chỉ hiển thị khi có quyền Edit, view-only ẩn) */}
      {!readOnly && bounds && (
        <IAMinimap
          isOpen={showMinimap}
          onToggle={() => setShowMinimap(!showMinimap)}
          layoutNodes={layoutNodes}
          bounds={bounds}
          transform={transform}
          viewportWidth={containerRef.current?.clientWidth || 1200}
          viewportHeight={containerRef.current?.clientHeight || 700}
          onPanTo={(tx, ty) => {
            const vpW = containerRef.current?.clientWidth || 1200
            const vpH = containerRef.current?.clientHeight || 700
            const newX = vpW / 2 - tx * transform.scale
            const newY = vpH / 2 - ty * transform.scale
            if (setTransform) {
              setTransform((prev) => ({
                ...prev,
                x: Number(newX.toFixed(2)),
                y: Number(newY.toFixed(2)),
              }))
            }
          }}
        />
      )}

      {/* Floating Bottom Selection Status Pill (Chỉ hiển thị khi có quyền Edit) */}
      {!readOnly && selectedNodeIds.size > 0 && (
        <div
          data-testid="ia-canvas-selection-pill"
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-4 py-2 bg-slate-900/90 text-white backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 select-none"
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>
              Đã chọn <strong className="text-blue-300 font-bold">{selectedNodeIds.size}</strong> thẻ
            </span>
          </div>
          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
          <span className="text-[11px] text-slate-300 hidden sm:inline">
            Kéo bất kỳ thẻ nào để di chuyển cả nhóm
          </span>
          <div className="w-px h-3.5 bg-slate-700 mx-0.5 hidden sm:inline" />
          <button
            type="button"
            data-testid="ia-clear-selection-btn"
            onClick={() => setSelectedNodeIds(new Set())}
            title="Bỏ chọn (Esc)"
            className="px-2 py-0.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            {...tactileProps.button}
          >
            Bỏ chọn (Esc)
          </button>
        </div>
      )}

      {/* Floating Bottom-Right Canvas Control Toolbar */}
      <div
        data-testid="ia-canvas-floating-controls"
        className="absolute bottom-5 right-5 z-30 flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg text-slate-700"
      >
        {/* Tool Mode Switcher: Select (V) vs Pan (H) - Ẩn khi ở chế độ xem */}
        {!readOnly && (
          <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl mr-1">
            <button
              type="button"
              data-testid="ia-tool-select-btn"
              onClick={() => setToolMode("select")}
              title="Công cụ quét chọn thẻ (Phím V)"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                toolMode === "select"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              {...tactileProps.button}
            >
              <MousePointer className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="ia-tool-pan-btn"
              onClick={() => setToolMode("pan")}
              title="Công cụ bàn tay kéo nền (Phím H / Giữ Space)"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                toolMode === "pan"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              {...tactileProps.button}
            >
              <Hand className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Snap to Grid button (Requirement 6) - Ẩn khi ở chế độ xem */}
        {!readOnly && (
          <>
            <button
              type="button"
              data-testid="ia-snap-grid-btn"
              onClick={() => setSnapToGrid(!snapToGrid)}
              title={snapToGrid ? "Đang bật hít lưới 20px (Click để tắt)" : "Đang tắt hít lưới (Click để bật)"}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                snapToGrid
                  ? "bg-blue-50 text-[#1057FB] border border-blue-200/80 font-semibold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
              {...tactileProps.button}
            >
              <Grid className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
          </>
        )}

        {/* Auto Align / Reset Layout (Requirement 6) */}
        {!readOnly && onAutoAlign && (
          <button
            type="button"
            data-testid="ia-auto-align-btn"
            onClick={onAutoAlign}
            title="Căn chuẩn tự động vị trí các nhánh sitemap dạng cột"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer select-none"
            {...tactileProps.button}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
            <span>Căn chuẩn</span>
          </button>
        )}

        <button
          type="button"
          data-testid="ia-zoom-in-btn"
          onClick={zoomIn}
          title="Phóng to tỉ lệ (Zoom In)"
          className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          {...tactileProps.button}
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          data-testid="ia-zoom-out-btn"
          onClick={zoomOut}
          title="Thu nhỏ tỉ lệ (Zoom Out)"
          className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          {...tactileProps.button}
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          data-testid="ia-zoom-reset-btn"
          onClick={resetZoom}
          title="Khôi phục tỉ lệ 100%"
          className="px-2.5 py-1 text-xs font-bold font-mono text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors cursor-pointer select-none"
          {...tactileProps.button}
        >
          {zoomPercent}%
        </button>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        <button
          type="button"
          data-testid="ia-fit-view-btn"
          onClick={onFitToView}
          title="Căn giữa toàn bộ sơ đồ (Fit to View)"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer select-none"
          {...tactileProps.button}
        >
          <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Căn giữa</span>
        </button>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        {/* Fullscreen Button (Requirement 3: Nút phóng to toàn màn hình) */}
        <button
          type="button"
          data-testid="ia-fullscreen-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Thu nhỏ (Thoát toàn màn hình)" : "Phóng to toàn màn hình (Fullscreen)"}
          className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
            isFullscreen
              ? "bg-blue-50 text-blue-600 font-semibold"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
          {...tactileProps.button}
        >
          {isFullscreen ? <Minimize className="w-4 h-4 text-blue-600" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Minimap Toggle Button (Requirement 6: Bản đồ nhỏ) - Ẩn khi ở chế độ xem */}
        {!readOnly && (
          <button
            type="button"
            data-testid="ia-toggle-minimap-btn"
            onClick={() => setShowMinimap(!showMinimap)}
            title="Bật/tắt bản đồ nhỏ (Minimap)"
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              showMinimap
                ? "bg-blue-50 text-blue-600 font-semibold"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            {...tactileProps.button}
          >
            <MapIcon className="w-4 h-4" />
          </button>
        )}

        {/* Canvas Menu Dropdown (...) Khớp Mockup Ảnh 5 - Ẩn khi ở chế độ xem */}
        {!readOnly && (
          <div className="relative" ref={canvasMenuRef}>
            <button
              type="button"
              data-testid="ia-canvas-more-menu-btn"
              onClick={() => setIsCanvasMenuOpen(!isCanvasMenuOpen)}
              title="Tùy chọn Canvas khác"
              className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              {...tactileProps.button}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isCanvasMenuOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs select-none">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  Canvas
                </div>
                <button
                  type="button"
                  data-testid="ia-menu-snap-grid"
                  onClick={() => {
                    setSnapToGrid(!snapToGrid)
                    setIsCanvasMenuOpen(false)
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <Grid className="w-3.5 h-3.5 text-slate-500" />
                    <span>Snap to grid</span>
                  </div>
                  {snapToGrid && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>

                {onAutoAlign && (
                  <button
                    type="button"
                    data-testid="ia-menu-reset-layout"
                    onClick={() => {
                      onAutoAlign()
                      setIsCanvasMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset layout</span>
                  </button>
                )}

                <button
                  type="button"
                  data-testid="ia-menu-minimap"
                  onClick={() => {
                    setShowMinimap(!showMinimap)
                    setIsCanvasMenuOpen(false)
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Bản đồ nhỏ</span>
                  </div>
                  {showMinimap && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>

                <div className="h-px bg-slate-100 my-1" />

                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  Sơ đồ & JSON
                </div>

                <button
                  type="button"
                  data-testid="ia-menu-select-all"
                  onClick={() => {
                    setSelectedNodeIds(new Set(layoutNodes.map((n) => n.node.id)))
                    setIsCanvasMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                  <span>Select all steps</span>
                </button>

                {onCopyJson && (
                  <button
                    type="button"
                    data-testid="ia-menu-copy-json"
                    onClick={() => {
                      onCopyJson()
                      setIsCanvasMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy as JSON</span>
                  </button>
                )}

                {onOpenImportJson && (
                  <button
                    type="button"
                    data-testid="ia-menu-import-json"
                    onClick={() => {
                      onOpenImportJson()
                      setIsCanvasMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-blue-600 font-semibold hover:bg-blue-50 transition-colors cursor-pointer text-left"
                  >
                    <FileCode className="w-3.5 h-3.5 text-blue-600" />
                    <span>Nhập JSON / Đẩy map</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
