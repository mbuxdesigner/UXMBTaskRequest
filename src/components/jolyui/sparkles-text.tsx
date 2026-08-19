import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SparklesTextProps {
  text: string
  sparklesCount?: number
  className?: string
}

interface Sparkle {
  id: string
  x: string
  y: string
  size: number
  color: string
  delay: number
}

export function SparklesText({
  text,
  sparklesCount = 4,
  className,
}: SparklesTextProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([])

  useEffect(() => {
    const colors = ["#1057FB", "#0D9B97", "#3B7BFF", "#FDB022"]
    const newSparkles: Sparkle[] = Array.from({ length: sparklesCount }).map((_, i) => ({
      id: `sparkle-${i}-${Math.random()}`,
      x: `${Math.random() * 85 + 5}%`,
      y: `${Math.random() * 80 + 10}%`,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2,
    }))
    setSparkles(newSparkles)
  }, [sparklesCount])

  return (
    <span className={cn("relative inline-block", className)}>
      <span className="relative z-10">{text}</span>
      {sparkles.map((s) => (
        <motion.svg
          key={s.id}
          className="pointer-events-none absolute z-20"
          style={{
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
          }}
          initial={{ scale: 0, rotate: 0, opacity: 0 }}
          animate={{
            scale: [0, 1, 0],
            rotate: [0, 90, 180],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: Math.random() * 2 + 1,
            delay: s.delay,
          }}
          viewBox="0 0 160 160"
          fill="none"
        >
          <path
            d="M80 0C80 44.1828 44.1828 80 0 80C44.1828 80 80 115.817 80 160C80 115.817 115.817 80 160 80C115.817 80 80 44.1828 80 0Z"
            fill={s.color}
          />
        </motion.svg>
      ))}
    </span>
  )
}
