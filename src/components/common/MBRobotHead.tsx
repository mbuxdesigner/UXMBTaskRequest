import React, { Component, ReactNode, forwardRef } from "react"
import { RobotHead, type RobotHeadProps, type RobotHeadShape, type RobotHeadState } from "robot-heads"
import { cn } from "@/lib/utils"

export type { RobotHeadShape, RobotHeadState }

export interface MBRobotHeadProps extends Omit<RobotHeadProps, "color" | "trimColor" | "screenColor"> {
  color?: string
  trimColor?: string
  screenColor?: string
  variant?: "brand" | "cyan" | "slate"
}

/**
 * Resilient Error Boundary dedicated to MBRobotHead canvas rendering.
 * Guarantees that even if canvas context fails or unsupported, the UI gracefully falls back.
 */
class RobotCanvasErrorBoundary extends Component<{ children: ReactNode; fallbackSize: number }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallbackSize: number }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any) {
    console.warn("[MBRobotHead] Canvas rendering fallback triggered:", error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{ width: this.props.fallbackSize, height: this.props.fallbackSize }}
          className="rounded-2xl border border-blue-200/80 bg-blue-50/80 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 shadow-2xs"
        >
          <img src="/ai-default.png" alt="MB Robot" className="size-3/5 object-contain" />
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * MBRobotHead: Standardized MB Bank themed 3D animated TV-robot head.
 * Features 2D Canvas rendering (zero WebGL dependency, offline resilient).
 *
 * Defaults:
 * - shape: 'rectangle' (classic glossy TV head)
 * - Brand MB colors: Navy #001A9C, Cyan trim #00D2FF, LED #E0F2FE
 * - Auto adapts antenna & shadow based on size
 */
export const MBRobotHead = forwardRef<HTMLCanvasElement, MBRobotHeadProps>(function MBRobotHead(
  {
    shape = "rectangle",
    state = "idle",
    size = 120,
    color,
    trimColor,
    screenColor,
    variant = "brand",
    interactive = true,
    antenna,
    floorShadow,
    speed = 1,
    className,
    style,
    ...rest
  },
  ref
) {
  // Brand color scheme presets
  const resolvedColor =
    color ||
    (variant === "cyan"
      ? "#0284C7"
      : variant === "slate"
      ? "#1E293B"
      : "#001A9C") // MB Bank Navy

  const resolvedTrimColor =
    trimColor ||
    (variant === "cyan"
      ? "#7DD3FC"
      : variant === "slate"
      ? "#94A3B8"
      : "#00D2FF") // MB Bank Cyan

  const resolvedScreenColor =
    screenColor || "#E0F2FE"

  // Small avatar optimizations: disable tall antenna so the face fills the frame
  const resolvedAntenna = antenna !== undefined ? antenna : size >= 56
  const resolvedShadow = floorShadow !== undefined ? floorShadow : size >= 64

  return (
    <RobotCanvasErrorBoundary fallbackSize={size}>
      <span
        className={cn("inline-flex items-center justify-center shrink-0 select-none", className)}
        style={{ width: size, height: size, ...style }}
      >
        <RobotHead
          ref={ref}
          shape={shape}
          state={state}
          size={size}
          color={resolvedColor}
          trimColor={resolvedTrimColor}
          screenColor={resolvedScreenColor}
          interactive={interactive}
          antenna={resolvedAntenna}
          floorShadow={resolvedShadow}
          speed={speed}
          {...rest}
        />
      </span>
    </RobotCanvasErrorBoundary>
  )
})
