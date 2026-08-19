import React, { useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string
  className?: string
  children?: React.ReactNode
}

export function SpotlightCard({
  spotlightColor = "rgba(16, 87, 251, 0.08)",
  className,
  children,
  ...props
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        "relative rounded-2xl border border-slate-200/90 bg-white transition-all duration-300 hover:border-slate-300 hover:shadow-md overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Spotlight highlight */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl overflow-hidden transition-opacity duration-300 z-10"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      <div className="relative z-20 rounded-2xl w-full h-full">{children}</div>
    </div>
  )
}
