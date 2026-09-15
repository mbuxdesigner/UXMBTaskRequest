import React, { memo, useState } from "react"
import { LayoutConnector } from "@/hooks/useIATreeState"
import { IAPortDragState } from "@/types/ia"

interface IABezierConnectorsProps {
  connectors: LayoutConnector[]
  highlightedIds?: Set<string>
  activeWireDrag?: IAPortDragState | null
  scale?: number
  onTrunkDrag?: (parentId: string, newOffset: number, persist?: boolean) => void
  readOnly?: boolean
}

function IABezierConnectorsComponent({
  connectors,
  highlightedIds,
  activeWireDrag,
  scale = 1.0,
  onTrunkDrag,
  readOnly = false,
}: IABezierConnectorsProps) {
  const [activeTrunkDrag, setActiveTrunkDrag] = useState<{
    parentId: string
    startX: number
    initOffset: number
  } | null>(null)

  const handleTrunkPointerDown = (
    e: React.PointerEvent,
    parentId: string,
    currentOffset: number
  ) => {
    if (readOnly || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()

    const startX = e.clientX
    const effectiveScale = Math.max(0.1, scale)
    setActiveTrunkDrag({ parentId, startX, initOffset: currentOffset })

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const dx = (moveEvt.clientX - startX) / effectiveScale
      const newOffset = Math.max(10, Math.min(250, Math.round(currentOffset + dx)))
      onTrunkDrag?.(parentId, newOffset, false)
    }

    const handlePointerUp = (upEvt: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
      setActiveTrunkDrag(null)
      const dx = (upEvt.clientX - startX) / effectiveScale
      const finalOffset = Math.max(10, Math.min(250, Math.round(currentOffset + dx)))
      onTrunkDrag?.(parentId, finalOffset, true)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)
  }

  return (
    <svg
      data-testid="ia-bezier-connectors-svg"
      className="absolute inset-0 pointer-events-none overflow-visible w-full h-full"
      style={{
        zIndex: 0,
      }}
    >
      <defs>
        <linearGradient id="connector-glow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="1" />
        </linearGradient>
        <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.5" />
        </filter>

        {/* Arrow Markers: refX="8" so the sharp tip touches exactly at the endpoint without penetrating cards */}
        <marker
          id="ia-arrow-default"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94a3b8" />
        </marker>

        <marker
          id="ia-arrow-highlight"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3b82f6" />
        </marker>

        <marker
          id="ia-arrow-emerald"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
        </marker>

        <marker
          id="ia-arrow-purple"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8b5cf6" />
        </marker>

        <marker
          id="ia-arrow-amber"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
        </marker>

        <marker
          id="ia-arrow-indigo"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6366f1" />
        </marker>
      </defs>

      {/* 1. Connector Paths */}
      {(() => {
        const renderedOrigins = new Set<string>()

        return connectors.map((conn) => {
          const isConnHighlighted =
            conn.isHighlighted ||
            (highlightedIds && (highlightedIds.has(conn.parentId) || highlightedIds.has(conn.childId)))

          // Color theme mapping
          let strokeColor = "#94a3b8" // slate-400 crisp
          let strokeWidth = 1.75
          let filter: string | undefined = undefined
          let markerId = "ia-arrow-default"

          if (isConnHighlighted) {
            strokeColor = "#3b82f6" // blue-500
            strokeWidth = 2.5
            filter = "url(#glow-filter)"
            markerId = "ia-arrow-highlight"
          } else if (conn.colorTheme === "emerald") {
            strokeColor = "#10b981"
            markerId = "ia-arrow-emerald"
          } else if (conn.colorTheme === "purple") {
            strokeColor = "#8b5cf6"
            markerId = "ia-arrow-purple"
          } else if (conn.colorTheme === "amber") {
            strokeColor = "#f59e0b"
            markerId = "ia-arrow-amber"
          } else if (conn.colorTheme === "indigo") {
            strokeColor = "#6366f1"
            markerId = "ia-arrow-indigo"
          }

          // Deduplicate port circle endpoints so multiple children sharing the same parent port don't overdraw
          const originKey = `${conn.x1.toFixed(1)},${conn.y1.toFixed(1)}`
          const isOriginNew = !renderedOrigins.has(originKey)
          if (isOriginNew) {
            renderedOrigins.add(originKey)
          }

          return (
            <g key={`group-${conn.id}`}>
              <path
                data-testid={`ia-connector-${conn.id}`}
                data-from-port={conn.fromPort}
                data-to-port={conn.toPort}
                d={conn.path}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd={`url(#${markerId})`}
                filter={filter}
                className="transition-colors duration-200"
              />

              {/* FigJam Port Circle Endpoints: One crisp dot per connection source */}
              {isOriginNew && (
                <circle
                  cx={conn.x1}
                  cy={conn.y1}
                  r={3.5}
                  fill="#ffffff"
                  stroke={strokeColor}
                  strokeWidth={2}
                  className="pointer-events-none"
                />
              )}
            </g>
          )
        })
      })()}

      {/* 2. FigJam-style Draggable Trunk Midpoint Handles */}
      {!readOnly &&
        connectors.map((conn) => {
          if (!conn.trunkHandle) return null
          const handle = conn.trunkHandle
          const isDraggingThis = activeTrunkDrag?.parentId === handle.parentId

          return (
            <g
              key={`trunk-handle-${handle.parentId}`}
              data-testid={`ia-trunk-handle-${handle.parentId}`}
              className="cursor-ew-resize group pointer-events-auto"
              onPointerDown={(e) =>
                handleTrunkPointerDown(e, handle.parentId, handle.currentOffset)
              }
            >
              {/* Generous invisible hit target */}
              <rect
                x={handle.x - 14}
                y={handle.y - 20}
                width={28}
                height={40}
                fill="transparent"
                className="cursor-ew-resize"
              />

              {/* Outer Blue Pill / Capsule Handle */}
              <rect
                x={handle.x - 4}
                y={handle.y - 14}
                width={8}
                height={28}
                rx={4}
                fill={isDraggingThis ? "#2563eb" : "#0284c7"}
                stroke="#ffffff"
                strokeWidth={1.5}
                className="filter drop-shadow-md transition-all duration-150 group-hover:scale-110 group-hover:fill-blue-600"
              />

              {/* Inner white grip line */}
              <line
                x1={handle.x}
                y1={handle.y - 6}
                x2={handle.x}
                y2={handle.y + 6}
                stroke="#ffffff"
                strokeWidth={1.5}
                strokeLinecap="round"
                className="pointer-events-none"
              />
            </g>
          )
        })}

      {/* 3. Dynamic Drag-to-Connect Live Wire Preview */}
      {activeWireDrag && (() => {
        const { startCanvasX: p1x, startCanvasY: p1y, currentCanvasX: p2x, currentCanvasY: p2y, sourcePort } = activeWireDrag
        const dist = Math.hypot(p2x - p1x, p2y - p1y)
        const mag = Math.max(30, Math.min(dist * 0.5, 140))

        let vx = 0
        let vy = 0
        if (sourcePort === "right") vx = mag
        else if (sourcePort === "left") vx = -mag
        else if (sourcePort === "bottom") vy = mag
        else if (sourcePort === "top") vy = -mag

        const cp1x = p1x + vx
        const cp1y = p1y + vy
        const cp2x = p2x - (vx !== 0 ? vx * 0.4 : 0)
        const cp2y = p2y - (vy !== 0 ? vy * 0.4 : 0)

        const dragPath = `M ${Number(p1x.toFixed(2))} ${Number(p1y.toFixed(2))} C ${Number(cp1x.toFixed(2))} ${Number(cp1y.toFixed(2))}, ${Number(cp2x.toFixed(2))} ${Number(cp2y.toFixed(2))}, ${Number(p2x.toFixed(2))} ${Number(p2y.toFixed(2))}`

        return (
          <g data-testid="ia-active-wire-drag">
            {/* Pulsing glow background wire */}
            <path
              d={dragPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={3.5}
              strokeDasharray="6 4"
              strokeLinecap="round"
              filter="url(#glow-filter)"
            />
            {/* Crisp foreground wire */}
            <path
              d={dragPath}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2.5}
              strokeLinecap="round"
              markerEnd="url(#ia-arrow-highlight)"
            />
            {/* Pulsing circle at cursor tip */}
            <circle
              cx={p2x}
              cy={p2y}
              r={5}
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth={2}
            />
          </g>
        )
      })()}
    </svg>
  )
}

export const IABezierConnectors = memo(IABezierConnectorsComponent)
export default IABezierConnectors
