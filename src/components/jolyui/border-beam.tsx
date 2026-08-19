import { cn } from "@/lib/utils"

interface BorderBeamProps {
  className?: string
  duration?: number
  borderWidth?: number
  colorFrom?: string
  colorTo?: string
  colorVia?: string
  delay?: number
  borderRadius?: string
}

/**
 * BorderBeam — Liquid-Metal-Inspired Animated Border
 * 
 * Đảm bảo 100% các góc bo tròn (rounded-2xl = 16px) khớp chính xác với card,
 * không bị vỡ góc vuông 90 độ.
 */
export function BorderBeam({
  className,
  duration = 6,
  borderWidth = 2,
  colorFrom = "#1057FB",
  colorTo = "#0D9B97",
  colorVia = "#4079fc",
  delay = 0,
  borderRadius = "1rem", // 16px
}: BorderBeamProps) {
  const maskStyle = {
    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    maskComposite: "exclude" as const,
    WebkitMaskComposite: "xor" as const,
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute -inset-px rounded-2xl overflow-hidden z-10",
        className
      )}
      style={{ borderRadius }}
    >
      {/* Primary sharp beam track */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          borderRadius,
          padding: `${borderWidth}px`,
          ...maskStyle,
        }}
      >
        <div
          className="border-beam-spinner"
          style={{
            position: "absolute",
            top: "-250%",
            left: "-250%",
            width: "600%",
            height: "600%",
            background: `conic-gradient(from 0deg at 50% 50%, transparent 0%, transparent 45%, ${colorTo} 55%, ${colorFrom} 68%, ${colorVia} 76%, ${colorTo} 85%, transparent 92%, transparent 100%)`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
        />
      </div>

      {/* Secondary soft metallic glow */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden opacity-50 pointer-events-none"
        style={{
          borderRadius,
          padding: `${borderWidth * 2}px`,
          ...maskStyle,
          filter: "blur(3px)",
        }}
      >
        <div
          className="border-beam-spinner"
          style={{
            position: "absolute",
            top: "-250%",
            left: "-250%",
            width: "600%",
            height: "600%",
            background: `conic-gradient(from 0deg at 50% 50%, transparent 0%, transparent 50%, ${colorFrom} 65%, ${colorTo} 80%, transparent 90%, transparent 100%)`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
        />
      </div>
    </div>
  )
}
