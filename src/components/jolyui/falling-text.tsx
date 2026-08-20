import Matter from "matter-js"
import React, { useCallback, useEffect, useRef, useState } from "react"

export interface FallingTextProps {
  /** The text content to display and animate */
  text: string
  /** When to trigger the falling animation */
  trigger?: "auto" | "scroll" | "click" | "hover"
  /** Background color for the physics canvas */
  backgroundColor?: string
  /** Show physics wireframes for debugging */
  wireframes?: boolean
  /** Gravity strength (default: 0.8) */
  gravity?: number
  /** Mouse interaction stiffness (0-1, default: 0.3) */
  mouseConstraintStiffness?: number
  /** Font size for the text */
  fontSize?: string
  /** Custom className for the container */
  className?: string
  /** Callback when animation starts */
  onAnimationStart?: () => void
  /** Callback when animation ends (all bodies settled) */
  onAnimationEnd?: () => void
  /** Physics properties for word bodies */
  physicsOptions?: {
    restitution?: number // Bounciness (0-1)
    frictionAir?: number // Air resistance
    friction?: number // Surface friction
    density?: number // Mass density
  }
  /** Initial velocity range for words */
  initialVelocity?: {
    x?: number // Horizontal velocity range
    y?: number // Vertical velocity range
    angular?: number // Angular velocity range
  }
  /** Word spacing in pixels */
  wordSpacing?: number
  /** Minimum container height */
  minHeight?: string
  /** Enable/disable mouse interactions */
  enableMouseInteraction?: boolean
  /** Reset trigger - increment to reset animation */
  resetKey?: number
}

// Bảng màu rực rỡ tươi sáng, không dùng box/viền
const TEXT_COLORS = [
  "text-blue-600",
  "text-indigo-600",
  "text-purple-600",
  "text-rose-500",
  "text-amber-500",
  "text-emerald-600",
  "text-teal-600",
  "text-cyan-600",
  "text-sky-600",
  "text-violet-600",
  "text-orange-500",
  "text-pink-600",
  "text-fuchsia-600",
]

export const FallingText: React.FC<FallingTextProps> = ({
  text,
  trigger = "auto",
  backgroundColor = "transparent",
  wireframes = false,
  gravity = 0.75,
  mouseConstraintStiffness = 0.35,
  fontSize = "1.5rem",
  className = "",
  onAnimationStart,
  onAnimationEnd,
  physicsOptions = {},
  initialVelocity = {},
  wordSpacing = 10,
  minHeight = "360px",
  enableMouseInteraction = true,
  resetKey = 0,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLDivElement | null>(null)
  const canvasContainerRef = useRef<HTMLDivElement | null>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const renderRef = useRef<Matter.Render | null>(null)
  const runnerRef = useRef<Matter.Runner | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const hasStartedRef = useRef(false)

  const [effectStarted, setEffectStarted] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const mergedPhysicsOptions = {
    restitution: 0.9,
    frictionAir: 0.012,
    friction: 0.15,
    density: 0.001,
    ...physicsOptions,
  }

  const mergedInitialVelocity = {
    x: 5,
    y: 2,
    angular: 0.06,
    ...initialVelocity,
  }

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (runnerRef.current && engineRef.current) {
      Matter.Runner.stop(runnerRef.current)
      runnerRef.current = null
    }

    if (renderRef.current) {
      Matter.Render.stop(renderRef.current)
      if (renderRef.current.canvas && canvasContainerRef.current) {
        try {
          canvasContainerRef.current.removeChild(renderRef.current.canvas)
        } catch (_e) {
          // Canvas might already be removed
        }
      }
      renderRef.current = null
    }

    if (engineRef.current) {
      Matter.World.clear(engineRef.current.world, false)
      Matter.Engine.clear(engineRef.current)
      engineRef.current = null
    }

    hasStartedRef.current = false
  }, [])

  useEffect(() => {
    if (resetKey > 0) {
      cleanup()
      setEffectStarted(false)
      setIsReady(false)
      setTimeout(() => setIsReady(true), 50)
    }
  }, [resetKey, cleanup])

  // Chuẩn bị HTML cho các từ: mỗi từ là 1 span không gãy dòng bên trong
  useEffect(() => {
    if (!textRef.current || !text) return

    const words = text.split(" ").filter((word) => word.length > 0)

    const newHTML = words
      .map((word, idx) => {
        const colorClass = TEXT_COLORS[idx % TEXT_COLORS.length]
        return `<span
          class="inline-block select-none whitespace-nowrap font-medium cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity ${colorClass}"
          style="margin: 4px ${wordSpacing}px; display: inline-block; white-space: nowrap; background: transparent !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important;"
        >
          ${word}
        </span>`
      })
      .join(" ")

    textRef.current.innerHTML = newHTML
    setIsReady(true)
  }, [text, wordSpacing])

  useEffect(() => {
    if (trigger === "auto") {
      setEffectStarted(true)
      return
    }

    if (trigger === "scroll" && containerRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setEffectStarted(true)
            observer.disconnect()
          }
        },
        { threshold: 0.1 }
      )
      observer.observe(containerRef.current)
      return () => observer.disconnect()
    }
  }, [trigger])

  // Physics Simulation with Matter.js
  useEffect(() => {
    if (!effectStarted || !isReady || hasStartedRef.current) return

    const {
      Engine,
      Render,
      World,
      Bodies,
      Runner,
      Mouse,
      MouseConstraint,
      Body,
    } = Matter

    if (
      !containerRef.current ||
      !canvasContainerRef.current ||
      !textRef.current
    )
      return

    const containerRect = containerRef.current.getBoundingClientRect()
    const width = containerRect.width
    const height = containerRect.height

    if (width <= 0 || height <= 0) {
      return
    }

    hasStartedRef.current = true
    onAnimationStart?.()

    const engine = Engine.create()
    engine.world.gravity.y = gravity
    engineRef.current = engine

    const render = Render.create({
      element: canvasContainerRef.current,
      engine,
      options: {
        width,
        height,
        background: "transparent",
        wireframes: false,
      },
    })
    renderRef.current = render

    const boundaryOptions = {
      isStatic: true,
      render: { visible: false },
    }

    // Tường biên trái - phải - trên - dưới
    const floor = Bodies.rectangle(
      width / 2,
      height + 30,
      width * 2,
      60,
      boundaryOptions
    )
    const leftWall = Bodies.rectangle(
      -30,
      height / 2,
      60,
      height * 3,
      boundaryOptions
    )
    const rightWall = Bodies.rectangle(
      width + 30,
      height / 2,
      60,
      height * 3,
      boundaryOptions
    )
    const ceiling = Bodies.rectangle(
      width / 2,
      -120,
      width * 2,
      60,
      boundaryOptions
    )

    const wordSpans = textRef.current.querySelectorAll("span")
    const wordBodies = Array.from(wordSpans).map((elem, idx) => {
      const rect = elem.getBoundingClientRect()
      
      // Tính toán toạ độ ban đầu nằm gọn bên trong container, không bị văng ra ngoài tường phải
      const rawX = rect.left - containerRect.left + rect.width / 2
      const x = Math.max(rect.width / 2 + 15, Math.min(width - rect.width / 2 - 15, rawX))
      const y = (rect.top - containerRect.top + rect.height / 2) - (idx * 2)

      const body = Bodies.rectangle(x, y, Math.max(rect.width, 35), Math.max(rect.height, 26), {
        render: { visible: false },
        ...mergedPhysicsOptions,
      })

      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * mergedInitialVelocity.x,
        y: (Math.random() - 0.5) * mergedInitialVelocity.y,
      })
      Body.setAngularVelocity(
        body,
        (Math.random() - 0.5) * mergedInitialVelocity.angular
      )

      return { elem: elem as HTMLElement, body }
    })

    wordBodies.forEach(({ elem, body }) => {
      elem.style.position = "absolute"
      elem.style.left = `${body.position.x}px`
      elem.style.top = `${body.position.y}px`
      elem.style.transform = "translate(-50%, -50%)"
      elem.style.willChange = "transform"
    })

    // Mouse Interaction
    let mouseConstraint: Matter.MouseConstraint | null = null
    if (enableMouseInteraction && containerRef.current) {
      const mouse = Mouse.create(containerRef.current)
      mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: {
          stiffness: mouseConstraintStiffness,
          render: { visible: false },
        },
      })
      render.mouse = mouse
    }

    const bodiesToAdd = [
      floor,
      leftWall,
      rightWall,
      ceiling,
      ...wordBodies.map((wb) => wb.body),
    ]
    if (mouseConstraint) {
      bodiesToAdd.push(mouseConstraint as any)
    }
    World.add(engine.world, bodiesToAdd)

    const runner = Runner.create()
    runnerRef.current = runner
    Runner.run(runner, engine)
    Render.run(render)

    const updateLoop = () => {
      wordBodies.forEach(({ body, elem }) => {
        const { x, y } = body.position
        elem.style.left = `${x}px`
        elem.style.top = `${y}px`
        elem.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`
      })

      animationFrameRef.current = requestAnimationFrame(updateLoop)
    }
    updateLoop()

    return cleanup
  }, [
    effectStarted,
    isReady,
    gravity,
    wireframes,
    backgroundColor,
    mouseConstraintStiffness,
    mergedPhysicsOptions,
    mergedInitialVelocity,
    enableMouseInteraction,
    cleanup,
    onAnimationStart,
    onAnimationEnd,
  ])

  const handleTrigger = useCallback(() => {
    if (!effectStarted && (trigger === "click" || trigger === "hover")) {
      setEffectStarted(true)
    }
  }, [effectStarted, trigger])

  return (
    <div
      ref={containerRef}
      className={`relative z-[1] w-full overflow-hidden text-center touch-none cursor-grab active:cursor-grabbing select-none ${className}`}
      style={{ minHeight }}
      onClick={trigger === "click" ? handleTrigger : undefined}
      onMouseEnter={trigger === "hover" ? handleTrigger : undefined}
      role="presentation"
    >
      {/* Sắp xếp linh hoạt dạng flex-wrap ở giai đoạn đo đạc kích thước ban đầu để TẤT CẢ các từ đều nằm trong viewport */}
      <div
        ref={textRef}
        className="pointer-events-none flex flex-wrap justify-center items-center w-full px-6 max-w-5xl mx-auto"
        style={{
          fontSize,
          lineHeight: 1.6,
        }}
        aria-live="polite"
      />

      <div
        className="pointer-events-none absolute inset-0"
        ref={canvasContainerRef}
        aria-hidden="true"
      />
    </div>
  )
}

export default FallingText
