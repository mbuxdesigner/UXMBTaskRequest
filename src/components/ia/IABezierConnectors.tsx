import React, { memo } from "react"
import { LayoutConnector } from "@/hooks/useIATreeState"

interface IABezierConnectorsProps {
  connectors: LayoutConnector[]
  highlightedIds?: Set<string>
}

function IABezierConnectorsComponent({ connectors, highlightedIds }: IABezierConnectorsProps) {
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
    </svg>
  )
}

export const IABezierConnectors = memo(IABezierConnectorsComponent)
export default IABezierConnectors
