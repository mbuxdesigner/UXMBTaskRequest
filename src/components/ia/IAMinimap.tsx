import React, { useRef, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Map, X, Maximize2 } from "lucide-react"
import { LayoutNode } from "@/hooks/useIATreeState"
import { CanvasTransform } from "@/hooks/useCanvasTransform"
import { springs } from "@/lib/motion"
import { Tooltip } from "@/components/ui/tooltip"

interface IAMinimapProps {
  isOpen: boolean
  onToggle: () => void
  layoutNodes: LayoutNode[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  transform: CanvasTransform
  viewportWidth?: number
  viewportHeight?: number
  onPanTo: (targetCanvasX: number, targetCanvasY: number) => void
}

const MAP_WIDTH = 200
const MAP_HEIGHT = 135
const PADDING = 80

export default function IAMinimap({
  isOpen,
  onToggle,
  layoutNodes,
  bounds,
  transform,
  viewportWidth = 1200,
  viewportHeight = 700,
  onPanTo,
}: IAMinimapProps) {
  const mapRef = useRef<HTMLDivElement>(null)

  // Compute total world bounds including padding
  const world = useMemo(() => {
    const minX = Math.min(bounds.minX - PADDING, 0)
    const minY = Math.min(bounds.minY - PADDING, 0)
    const maxX = Math.max(bounds.maxX + PADDING, 800)
    const maxY = Math.max(bounds.maxY + PADDING, 600)
    const width = Math.max(200, maxX - minX)
    const height = Math.max(150, maxY - minY)

    // Calculate scale factor to fit in MAP_WIDTH x MAP_HEIGHT
    const scaleX = (MAP_WIDTH - 16) / width
    const scaleY = (MAP_HEIGHT - 32) / height
    const scale = Math.min(scaleX, scaleY)

    return {
      minX,
      minY,
      width,
      height,
      scale,
      offsetX: (MAP_WIDTH - width * scale) / 2,
      offsetY: 24 + (MAP_HEIGHT - 24 - height * scale) / 2,
    }
  }, [bounds])

  // Camera viewport in canvas coordinates
  const cameraInCanvas = useMemo(() => {
    const camX = -transform.x / transform.scale
    const camY = -transform.y / transform.scale
    const camW = viewportWidth / transform.scale
    const camH = viewportHeight / transform.scale

    const left = (camX - world.minX) * world.scale + world.offsetX
    const top = (camY - world.minY) * world.scale + world.offsetY
    const width = camW * world.scale
    const height = camH * world.scale

    return {
      left: Math.max(0, Math.min(MAP_WIDTH - 8, left)),
      top: Math.max(20, Math.min(MAP_HEIGHT - 8, top)),
      width: Math.max(12, Math.min(MAP_WIDTH, width)),
      height: Math.max(8, Math.min(MAP_HEIGHT, height)),
    }
  }, [transform, viewportWidth, viewportHeight, world])

  // Handle Minimap Click or Drag to Pan
  const handleMapPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      const rect = mapRef.current?.getBoundingClientRect()
      if (!rect) return

      const clickMapX = e.clientX - rect.left
      const clickMapY = e.clientY - rect.top

      // Convert map coords to canvas coords
      const targetCanvasX = (clickMapX - world.offsetX) / world.scale + world.minX
      const targetCanvasY = (clickMapY - world.offsetY) / world.scale + world.minY

      onPanTo(targetCanvasX, targetCanvasY)

      const handleMove = (moveEvt: PointerEvent) => {
        const moveX = moveEvt.clientX - rect.left
        const moveY = moveEvt.clientY - rect.top
        const cX = (moveX - world.offsetX) / world.scale + world.minX
        const cY = (moveY - world.offsetY) / world.scale + world.minY
        onPanTo(cX, cY)
      }

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove)
        window.removeEventListener("pointerup", handleUp)
      }

      window.addEventListener("pointermove", handleMove)
      window.addEventListener("pointerup", handleUp)
    },
    [world, onPanTo]
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={mapRef}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={springs.snappy}
          data-testid="ia-minimap-container"
          onPointerDown={handleMapPointerDown}
          className="absolute bottom-20 right-5 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden select-none cursor-crosshair"
          style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
        >
          {/* Header */}
          <div className="h-6 px-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
              <Map className="w-3 h-3 text-blue-600" />
              <span>Bản đồ nhỏ</span>
            </div>
            <Tooltip content="Đóng bản đồ nhỏ" side="left">
              <button
                type="button"
                data-testid="ia-minimap-close-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle()
                }}
                className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </Tooltip>
          </div>

          {/* SVG Map of all nodes */}
          <svg className="w-full h-[calc(100%-1.5rem)] pointer-events-none">
            {layoutNodes.map((ln) => {
              const nx = (ln.x - world.minX) * world.scale + world.offsetX
              const ny = (ln.y - world.minY) * world.scale + world.offsetY
              const nw = Math.max(3, ln.width * world.scale)
              const nh = Math.max(2, ln.height * world.scale)

              const fillColor =
                ln.node.tier === 1
                  ? "#1057FB"
                  : ln.node.tier === 2
                  ? "#6366f1"
                  : ln.node.tier === 3
                  ? "#10b981"
                  : ln.node.tier === 4
                  ? "#f59e0b"
                  : "#8b5cf6"

              return (
                <rect
                  key={ln.node.id}
                  x={nx}
                  y={ny}
                  width={nw}
                  height={nh}
                  rx={1}
                  fill={fillColor}
                  fillOpacity={0.8}
                />
              )
            })}
          </svg>

          {/* Active Camera Viewport Box */}
          <div
            data-testid="ia-minimap-viewport-indicator"
            className="absolute border-2 border-blue-600 bg-blue-500/20 rounded-sm pointer-events-none transition-none shadow-xs"
            style={{
              left: cameraInCanvas.left,
              top: cameraInCanvas.top,
              width: cameraInCanvas.width,
              height: cameraInCanvas.height,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
