import React, { memo } from "react"
import { LayoutConnector } from "@/hooks/useIATreeState"
import { IAPortDragState } from "@/types/ia"

interface IABezierConnectorsProps {
  connectors: LayoutConnector[]
  highlightedIds?: Set<string>
  activeWireDrag?: IAPortDragState | null
}

function IABezierConnectorsComponent({ connectors, highlightedIds, activeWireDrag }: IABezierConnectorsProps) {
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

        {/* Arrow Marker: Standard */}
        <marker
          id="ia-arrow-default"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94a3b8" />
        </marker>

        {/* Arrow Marker: Highlighted */}
        <marker
          id="ia-arrow-highlight"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3b82f6" />
        </marker>
      </defs>

      {connectors.map((conn) => {
        const isConnHighlighted =
          conn.isHighlighted ||
          (highlightedIds && (highlightedIds.has(conn.parentId) || highlightedIds.has(conn.childId)))

        // Color theme mapping
        let strokeColor = "#cbd5e1" // slate-300 default
        let strokeWidth = 1.75
        let filter: string | undefined = undefined

        if (isConnHighlighted) {
          strokeColor = "#3b82f6" // blue-500
          strokeWidth = 2.5
          filter = "url(#glow-filter)"
        } else if (conn.colorTheme === "emerald") {
          strokeColor = "#6ee7b7" // emerald-300
        } else if (conn.colorTheme === "purple") {
          strokeColor = "#c4b5fd" // purple-300
        } else if (conn.colorTheme === "amber") {
          strokeColor = "#fcd34d" // amber-300
        }

        return (
          <path
            key={conn.id}
            data-testid={`ia-connector-${conn.id}`}
            data-from-port={conn.fromPort}
            data-to-port={conn.toPort}
            d={conn.path}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            markerEnd={isConnHighlighted ? "url(#ia-arrow-highlight)" : "url(#ia-arrow-default)"}
            filter={filter}
            className="transition-colors duration-200"
          />
        )
      })}

      {/* Dynamic Drag-to-Connect Live Wire Preview */}
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
