import { cn } from "@/lib/utils"

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to display the hardware-accelerated radiant horizontal shimmer wave.
   * Defaults to true. When false, falls back to standard opacity pulse.
   */
  shimmer?: boolean
}

function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-md bg-slate-100",
        shimmer
          ? "after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r after:from-transparent after:via-white/70 after:to-transparent after:animate-[shimmer_1.8s_infinite_cubic-bezier(0.4,0,0.2,1)] after:pointer-events-none"
          : "animate-pulse",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
