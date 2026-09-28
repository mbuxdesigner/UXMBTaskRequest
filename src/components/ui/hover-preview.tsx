import React, { useCallback, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface HoverPreviewProps {
  children: React.ReactNode
  preview: React.ReactNode
  className?: string
  cardClassName?: string
  width?: number
  cursorOffset?: number
}
export function HoverPreview({
  children,
  preview,
  className,
  cardClassName,
  width = 320,
  cursorOffset = 18,
}: HoverPreviewProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 })

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    const estimatedHeight = 180
    let x = clientX - width / 2
    let y = clientY - estimatedHeight - cursorOffset
    x = Math.max(16, Math.min(x, window.innerWidth - width - 16))
    if (y < 16) y = clientY + cursorOffset
    setPosition({ x, y })
  }, [cursorOffset, width])

  const openFromElement = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    updatePosition(rect.left + rect.width / 2, rect.top)
    setVisible(true)
  }

  const card = typeof document !== "undefined" ? createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.16 }}
          className={cn("pointer-events-none fixed z-[70] overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl", cardClassName)}
          style={{ left: position.x, top: position.y, width }}
        >
          {preview}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  ) : null

  return (
    <span
      className={cn("block", className)}
      onMouseEnter={(event) => {
        updatePosition(event.clientX, event.clientY)
        setVisible(true)
      }}
      onMouseMove={(event) => updatePosition(event.clientX, event.clientY)}
      onMouseLeave={() => setVisible(false)}
      onFocus={(event) => openFromElement(event.currentTarget)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {card}
    </span>
  )
}
