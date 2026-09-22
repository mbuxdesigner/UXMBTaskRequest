import { useState, useCallback, useRef, useEffect } from "react"

export interface CanvasTransform {
  x: number
  y: number
  scale: number
}

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 2.0
export const ZOOM_STEP = 1.15
export const DEFAULT_PADDING = 60

/**
 * Cursor-Centric Zoom Invariance Formula:
 * (Cx - X_new) / S_new = (Cx - X_old) / S_old
 * X_new = Cx - (Cx - X_old) * (S_new / S_old)
 * Y_new = Cy - (Cy - Y_old) * (S_new / S_old)
 */
export function zoomAtPoint(
  current: CanvasTransform,
  cursor: { x: number; y: number },
  factor: number,
  minZoom: number = MIN_ZOOM,
  maxZoom: number = MAX_ZOOM
): CanvasTransform {
  if (typeof factor !== "number" || isNaN(factor) || factor <= 0) {
    factor = 1.0
  }
  const currentScale = current.scale || 1.0
  const targetScale = currentScale * factor
  const clampedScale = Math.max(minZoom, Math.min(targetScale, maxZoom))

  const curX = typeof cursor.x === "number" && !isNaN(cursor.x) ? cursor.x : 0
  const curY = typeof cursor.y === "number" && !isNaN(cursor.y) ? cursor.y : 0

  const scaleRatio = clampedScale / currentScale
  const newX = curX - (curX - current.x) * scaleRatio
  const newY = curY - (curY - current.y) * scaleRatio

  return {
    x: Number(newX.toFixed(4)),
    y: Number(newY.toFixed(4)),
    scale: Number(clampedScale.toFixed(4)),
  }
}

/**
 * Bounding-Box Fit-to-View Centering
 * Clamps scale between minZoom (0.25) and maxZoom (1.25)
 */
export function computeFitToView(
  viewport: { width: number; height: number },
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  padding: number = DEFAULT_PADDING,
  minZoom: number = 0.25,
  maxZoom: number = 1.25
): CanvasTransform {
  const vpWidth = viewport.width || 0
  const vpHeight = viewport.height || 0

  if (vpWidth <= 0 || vpHeight <= 0) {
    return { x: 0, y: 0, scale: 1.0 }
  }

  const { minX, minY, maxX, maxY } = bounds
  if (
    typeof minX !== "number" ||
    typeof maxX !== "number" ||
    typeof minY !== "number" ||
    typeof maxY !== "number" ||
    !isFinite(minX) ||
    !isFinite(maxX) ||
    !isFinite(minY) ||
    !isFinite(maxY)
  ) {
    return { x: 0, y: 0, scale: 1.0 }
  }

  const contentWidth = Math.max(1, maxX - minX + padding * 2)
  const contentHeight = Math.max(1, maxY - minY + padding * 2)

  const scaleX = vpWidth / contentWidth
  const scaleY = vpHeight / contentHeight
  const rawScale = Math.min(scaleX, scaleY)
  const clampedScale = Math.max(minZoom, Math.min(rawScale, maxZoom))

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const panX = vpWidth / 2 - centerX * clampedScale
  const panY = vpHeight / 2 - centerY * clampedScale

  return {
    x: Number(panX.toFixed(4)),
    y: Number(panY.toFixed(4)),
    scale: Number(clampedScale.toFixed(4)),
  }
}

export interface UseCanvasTransformOptions {
  initialTransform?: CanvasTransform
  minZoom?: number
  maxZoom?: number
}

export function useCanvasTransform(options: UseCanvasTransformOptions = {}) {
  const minZoom = options.minZoom ?? MIN_ZOOM
  const maxZoom = options.maxZoom ?? MAX_ZOOM
  const [transform, setTransform] = useState<CanvasTransform>(
    options.initialTransform ?? { x: 0, y: 0, scale: 1.0 }
  )
  const [isPanning, setIsPanning] = useState<boolean>(false)

  // Synchronized ref for current transform to decouple event handlers from rapid re-renders
  const transformRef = useRef<CanvasTransform>(transform)
  transformRef.current = transform

  // Drag tracking refs (supports button 0 and button 1)
  const dragStartRef = useRef<{
    clientX: number
    clientY: number
    startX: number
    startY: number
    button: number
  } | null>(null)
  const hasCrossedThresholdRef = useRef<boolean>(false)

  const panBy = useCallback((dx: number, dy: number) => {
    setTransform((prev) => ({
      ...prev,
      x: Number((prev.x + dx).toFixed(4)),
      y: Number((prev.y + dy).toFixed(4)),
    }))
  }, [])

  const zoomIn = useCallback(
    (cursor?: { x: number; y: number }) => {
      setTransform((prev) => {
        const point = cursor ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
        return zoomAtPoint(prev, point, ZOOM_STEP, minZoom, maxZoom)
      })
    },
    [minZoom, maxZoom]
  )

  const zoomOut = useCallback(
    (cursor?: { x: number; y: number }) => {
      setTransform((prev) => {
        const point = cursor ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
        return zoomAtPoint(prev, point, 1 / ZOOM_STEP, minZoom, maxZoom)
      })
    },
    [minZoom, maxZoom]
  )

  const resetZoom = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: 1.0,
    }))
  }, [])

  const resetPan = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      x: 0,
      y: 0,
    }))
  }, [])

  const fitToView = useCallback(
    (
      viewport: { width: number; height: number },
      bounds: { minX: number; minY: number; maxX: number; maxY: number },
      padding: number = DEFAULT_PADDING
    ) => {
      const nextTransform = computeFitToView(viewport, bounds, padding, minZoom, 1.25)
      setTransform(nextTransform)
    },
    [minZoom]
  )

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Allow primary button (0) or middle wheel button (1)
    if (e.button !== 0 && e.button !== 1) return

    const isMiddle = e.button === 1
    if (isMiddle) {
      // Suppress browser autoscroll immediately
      e.preventDefault()
      // Middle click immediately activates grabbing cursor and pan state
      setIsPanning(true)
      hasCrossedThresholdRef.current = true
    } else {
      hasCrossedThresholdRef.current = false
    }

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: transformRef.current.x,
      startY: transformRef.current.y,
      button: e.button,
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent | PointerEvent) => {
    const dragStart = dragStartRef.current
    if (!dragStart) return
    const dx = e.clientX - dragStart.clientX
    const dy = e.clientY - dragStart.clientY

    // 3px drag threshold disambiguation for left-click; middle click pans immediately
    if (!hasCrossedThresholdRef.current) {
      if (dx * dx + dy * dy > 9) {
        hasCrossedThresholdRef.current = true
        setIsPanning(true)
      }
    }

    if (hasCrossedThresholdRef.current) {
      const nextX = Number((dragStart.startX + dx).toFixed(4))
      const nextY = Number((dragStart.startY + dy).toFixed(4))
      setTransform((prev) => {
        if (prev.x === nextX && prev.y === nextY) return prev
        return {
          ...prev,
          x: nextX,
          y: nextY,
        }
      })
    }
  }, [])

  const handlePointerUp = useCallback((e?: React.PointerEvent | PointerEvent | MouseEvent) => {
    if (!dragStartRef.current) return
    // If specific button is passed, only clear when that button was released or on pointercancel
    if (
      e &&
      e.type !== "pointercancel" &&
      typeof e.button === "number" &&
      e.button !== -1 &&
      e.button !== dragStartRef.current.button
    ) {
      return
    }
    dragStartRef.current = null
    hasCrossedThresholdRef.current = false
    setIsPanning(false)
  }, [])

  // Window-level safety listeners during active dragging & cursor grabbing management
  useEffect(() => {
    if (!isPanning) return

    const handleWindowMove = (e: PointerEvent) => {
      handlePointerMove(e)
    }

    const handleWindowUp = (e: PointerEvent | MouseEvent) => {
      handlePointerUp(e)
    }

    const handleWindowAuxClick = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault()
      }
    }

    const prevCursor = document.body.style.cursor
    document.body.style.cursor = "grabbing"

    window.addEventListener("pointermove", handleWindowMove)
    window.addEventListener("pointerup", handleWindowUp)
    window.addEventListener("mouseup", handleWindowUp)
    window.addEventListener("pointercancel", handleWindowUp)
    window.addEventListener("auxclick", handleWindowAuxClick)

    return () => {
      document.body.style.cursor = prevCursor
      window.removeEventListener("pointermove", handleWindowMove)
      window.removeEventListener("pointerup", handleWindowUp)
      window.removeEventListener("mouseup", handleWindowUp)
      window.removeEventListener("pointercancel", handleWindowUp)
      window.removeEventListener("auxclick", handleWindowAuxClick)
    }
  }, [isPanning, handlePointerMove, handlePointerUp])

  const handleWheel = useCallback(
    (e: WheelEvent, containerRect: DOMRect) => {
      e.preventDefault()

      // 1. Trackpad pinch gesture (or Ctrl + Wheel): Zoom in/out centered at cursor
      if (e.ctrlKey) {
        const cursor = {
          x: e.clientX - containerRect.left,
          y: e.clientY - containerRect.top,
        }
        const factor = 1 - e.deltaY * 0.01
        setTransform((prev) => zoomAtPoint(prev, cursor, factor, minZoom, maxZoom))
        return
      }

      // 2. Trackpad two-finger move (or standard wheel): Pan canvas smoothly (like middle mouse click / space drag)
      const dx = -e.deltaX
      const dy = -e.deltaY
      if (dx !== 0 || dy !== 0) {
        setTransform((prev) => ({
          ...prev,
          x: Number((prev.x + dx).toFixed(4)),
          y: Number((prev.y + dy).toFixed(4)),
        }))
      }
    },
    [minZoom, maxZoom]
  )

  return {
    transform,
    setTransform,
    isPanning,
    zoomIn,
    zoomOut,
    resetZoom,
    resetPan,
    fitToView,
    panBy,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    zoomAtPoint,
    computeFitToView,
  }
}
