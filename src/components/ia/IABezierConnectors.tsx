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
          strokeColor = "#a7f3d0" // emerald-200
        } else if (conn.colorTheme === "purple") {
          strokeColor = "#ddd6fe" // purple-200
        } else if (conn.colorTheme === "amber") {
          strokeColor = "#fde68a" // amber-200
        }

        return (
          <path
            key={conn.id}
            d={conn.path}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
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
