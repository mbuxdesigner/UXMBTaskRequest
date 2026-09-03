import { AnimatePresence, motion } from "framer-motion"
import * as React from "react"
import { cn } from "@/lib/utils"

export interface CharacterMorphProps {
  texts: string[]
  currentIndex?: number
  onIndexChange?: (index: number) => void
  className?: string
  interval?: number
  staggerDelay?: number
  charDuration?: number
}

export const CharacterMorph = React.forwardRef<HTMLDivElement, CharacterMorphProps>(
  (
    {
      texts,
      currentIndex: controlledIndex,
      onIndexChange,
      className,
      interval = 6000,
      staggerDelay = 0.015,
      charDuration = 0.45,
    },
    ref
  ) => {
    const [internalIndex, setInternalIndex] = React.useState(0)
    const isControlled = typeof controlledIndex === "number"
    const currentIndex = isControlled ? controlledIndex : internalIndex

    React.useEffect(() => {
      if (isControlled) return
      const timer = setInterval(() => {
        setInternalIndex((prev) => {
          const next = (prev + 1) % texts.length
          onIndexChange?.(next)
          return next
        })
      }, interval)

      return () => clearInterval(timer)
    }, [interval, texts.length, isControlled, onIndexChange])

    const currentText = texts[currentIndex] || ""
    const words = currentText.split(" ")

    let runningCharIndex = 0

    return (
      <div
        ref={ref}
        className={cn("relative flex flex-wrap items-baseline", className)}
        style={{ perspective: 1200 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            className="flex flex-wrap items-baseline gap-y-2"
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {words.map((word, wordIdx) => {
              return (
                <span key={wordIdx} className="inline-flex whitespace-nowrap">
                  {word.split("").map((char) => {
                    const globalIdx = runningCharIndex++
                    return (
                      <motion.span
                        key={`${currentIndex}-${globalIdx}-${char}`}
                        custom={globalIdx}
                        variants={{
                          initial: {
                            opacity: 0,
                            y: 20,
                            filter: "blur(8px)",
                            rotateX: -90,
                          },
                          animate: (i: number) => ({
                            opacity: 1,
                            y: 0,
                            filter: "blur(0px)",
                            rotateX: 0,
                            transition: {
                              duration: charDuration,
                              delay: i * staggerDelay,
                              ease: [0.215, 0.61, 0.355, 1],
                            },
                          }),
                          exit: (i: number) => ({
                            opacity: 0,
                            y: -20,
                            filter: "blur(8px)",
                            rotateX: 90,
                            transition: {
                              duration: 0.25,
                              delay: i * 0.005,
                              ease: [0.215, 0.61, 0.355, 1],
                            },
                          }),
                        }}
                        className="inline-block"
                        style={{ transformStyle: "preserve-3d" }}
                      >
                        {char}
                      </motion.span>
                    )
                  })}
                  {wordIdx < words.length - 1 && (
                    <span className="inline-block">&nbsp;</span>
                  )}
                </span>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }
)

CharacterMorph.displayName = "CharacterMorph"
