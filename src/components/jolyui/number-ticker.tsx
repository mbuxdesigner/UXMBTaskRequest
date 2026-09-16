"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useMotionValue, useSpring } from "framer-motion"
import { cn } from "@/lib/utils"

interface NumberTickerProps {
  value: number
  direction?: "up" | "down"
  className?: string
  delay?: number
  decimalPlaces?: number
}

/**
 * Animated number ticker component for HTML elements
 */
export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  decimalPlaces = 0,
  className,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const numValue = typeof value === "number" && !isNaN(value) ? value : 0
  const motionValue = useMotionValue(direction === "down" ? numValue : 0)
  const springValue = useSpring(motionValue, {
    damping: 26,
    stiffness: 100,
  })
  const isInView = useInView(ref, { once: true, margin: "0px" })

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(direction === "down" ? 0 : numValue)
      }, delay * 1000)
      return () => clearTimeout(timer)
    }
  }, [motionValue, isInView, delay, numValue, direction])

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Intl.NumberFormat("en-US", {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(Number(latest.toFixed(decimalPlaces)))
      }
    })
  }, [springValue, decimalPlaces])

  return (
    <span
      className={cn(
        "inline-block tabular-nums tracking-tight",
        className
      )}
      ref={ref}
    >
      {decimalPlaces > 0 ? (0).toFixed(decimalPlaces) : 0}
    </span>
  )
}

/**
 * Hook to animate running number (Count-up effect) for SVG or state-driven components
 */
export function useCountUp(
  target: number,
  duration: number = 800,
  decimals: number = 0
): number {
  const numTarget = typeof target === "number" && !isNaN(target) ? target : 0
  const [current, setCurrent] = useState<number>(0)
  const prevTargetRef = useRef<number>(0)

  useEffect(() => {
    let startTimestamp: number | null = null
    const startValue = prevTargetRef.current
    prevTargetRef.current = numTarget
    let animationFrameId: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      const nextVal = startValue + (numTarget - startValue) * ease
      setCurrent(decimals > 0 ? parseFloat(nextVal.toFixed(decimals)) : Math.round(nextVal))
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      }
    }

    animationFrameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrameId)
  }, [numTarget, duration, decimals])

  return current
}

