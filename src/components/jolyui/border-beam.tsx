import { cn } from "@/lib/utils"

interface BorderBeamProps {
  className?: string
  duration?: number
  borderWidth?: number
  colorFrom?: string
  colorTo?: string
  colorVia?: string
  delay?: number
  variant?: "beam" | "glow"
}

/**
 * BorderBeam v2 — Liquid-metal-inspired animated border
 *
 * Lấy cảm hứng từ liquid-metal-button của Joly UI:
 * Kỹ thuật: Outer wrapper (overflow: hidden, rounded, absolute fill) chứa inner spinning div.
 * Mask technique: padding + mask-composite loại bỏ nội dung bên trong, chỉ giữ viền.
 */
export function BorderBeam({
  className,
  duration = 4,
  borderWidth = 2,
  colorFrom = "#1057FB",
  colorTo = "#0D9B97",
  colorVia = "#4079fc",
  delay = 0,
  variant = "beam",
}: BorderBeamProps) {
  const maskStyle = {
    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    maskComposite: "exclude" as const,
    WebkitMaskComposite: "xor" as const,
  }

  if (variant === "glow") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] z-10",
          className
        )}
        style={{
          padding: `${borderWidth}px`,
          background: `linear-gradient(0deg, ${colorFrom}, ${colorVia}, ${colorTo}, ${colorVia}, ${colorFrom})`,
          backgroundSize: "300% 300%",
          ...maskStyle,
          animation: `border-beam-glow ${duration}s ease ${delay}s infinite`,
        }}
      />
    )
  }

  // variant === "beam"
  // Kỹ thuật 2 layer:
  //   1. Outer: absolute inset-0 + rounded-[inherit] + overflow-hidden + padding + mask = chỉ hiện border ring
  //   2. Inner: absolute inset-[-300%] + spinning conic-gradient = rotating beam
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] z-10",
        className
      )}
    >
      {/* Beam mask layer — clip = border ring only */}
      <div
        className="absolute inset-0 rounded-[inherit] overflow-hidden"
        style={{ padding: `${borderWidth}px`, ...maskStyle }}
      >
        {/* Spinning conic gradient — must be oversized for clean rotation */}
        <div
          className="border-beam-spinner"
          style={{
            position: "absolute",
            top: "-300%",
            left: "-300%",
            width: "700%",
            height: "700%",
            background: `conic-gradient(from 0deg at 50% 50%, transparent 0%, transparent 30%, ${colorTo}44 45%, ${colorFrom}bb 58%, ${colorVia} 65%, ${colorTo} 72%, ${colorFrom}bb 80%, ${colorTo}44 88%, transparent 95%, transparent 100%)`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
        />
      </div>

      {/* Soft glow outer ring — subtle metallic shimmer */}
      <div
        className="absolute inset-0 rounded-[inherit] overflow-hidden"
        style={{ padding: `${Math.max(borderWidth * 2, 4)}px`, ...maskStyle, opacity: 0.35 }}
      >
        <div
          className="border-beam-spinner"
          style={{
            position: "absolute",
            top: "-300%",
            left: "-300%",
            width: "700%",
            height: "700%",
            background: `conic-gradient(from 180deg at 50% 50%, transparent 0%, transparent 45%, ${colorFrom}44 60%, ${colorTo}66 70%, ${colorFrom}44 80%, transparent 90%, transparent 100%)`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
            filter: "blur(6px)",
          }}
        />
      </div>
    </div>
  )
}
