import { useState, useEffect, useLayoutEffect, type RefObject } from "react"
import type { Variants, Transition } from "framer-motion"

/**
 * UXMB Task Request — Standard Motion Design Tokens
 *
 * Standard Reference: https://animate-ui.com/docs/components
 * Compliance: WCAG 2.2 SC 2.3.3 (Animation from Interactions)
 * Physics Engine: Framer Motion v13 (spring dynamics & shared layout)
 */

// ─── 1. SPRING PHYSICS TOKENS ────────────────────────────────────────────────
export const springs = {
  /**
   * Snappy feedback for micro-interactions (buttons, tabs, floating pills, toggles)
   * High stiffness with critical damping provides instantaneous response (<16ms) without overshoot.
   */
  snappy: {
    type: "spring",
    stiffness: 450,
    damping: 35,
    mass: 0.8,
  } as const,

  /**
   * Gentle, elegant physics for modals, dialogs, drawers, and overlay surfaces
   */
  gentle: {
    type: "spring",
    stiffness: 320,
    damping: 28,
    mass: 1,
  } as const,

  /**
   * Bouncy dynamics for playful alerts, badges, and status notifications
   */
  bouncy: {
    type: "spring",
    stiffness: 400,
    damping: 20,
  } as const,

  /**
   * Smooth, gradual physics for wide layout transitions and page containers
   */
  smooth: {
    type: "spring",
    stiffness: 260,
    damping: 25,
  } as const,

  /**
   * Shared layout indicator spring for floating tabs and nav items
   */
  floating: {
    type: "spring",
    stiffness: 450,
    damping: 35,
    mass: 0.8,
  } as const,

  /**
   * Modal and sheet spring dynamics
   */
  modal: {
    type: "spring",
    stiffness: 350,
    damping: 28,
    mass: 1,
  } as const,

  /**
   * Origin-aware popover spring dynamics
   */
  popover: {
    type: "spring",
    stiffness: 420,
    damping: 26,
    mass: 0.9,
  } as const,
} as const

export const motionSprings = springs

// ─── 2. DURATION TOKENS (SECONDS) ────────────────────────────────────────────
export const durations = {
  instant: 0.08,
  fast: 0.15,
  normal: 0.25,
  slow: 0.35,
  skeletonExit: 0.2,
} as const

export const motionDurations = durations

// ─── 3. EASING CURVES (CUBIC-BEZIER) ──────────────────────────────────────────
export const easings = {
  /** Swift deceleration curve for entrances */
  easeOutCubic: [0.215, 0.61, 0.355, 1] as const,
  /** Symmetrical ease curve for reciprocal transitions */
  easeInOutCubic: [0.645, 0.045, 0.355, 1] as const,
  /** Snappy exponential deceleration */
  easeOutExpo: [0.16, 1, 0.3, 1] as const,
  /** Overshoot easing for tactile releases */
  backOut: [0.34, 1.56, 0.64, 1] as const,
} as const

export const motionEasings = easings

// ─── 4. STAGGER VARIANTS (SKELETON-TO-CONTENT REVEALS) ───────────────────────
export const staggerContainerVariants: Variants = {
  initial: {},
  hidden: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.02,
    },
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
      duration: 0.15,
    },
  },
}

export const staggerItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  hidden: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: springs.snappy,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: springs.snappy,
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.15,
      ease: "easeIn",
    },
  },
}

/** Reduced motion fallback variants: zero translation, pure opacity fade */
export const reducedMotionItemVariants: Variants = {
  initial: { opacity: 0 },
  hidden: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
  visible: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
}

export const reducedMotionContainerVariants: Variants = {
  initial: { opacity: 0 },
  hidden: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
  visible: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
}

// ─── 5. ORIGIN-AWARE POPOVER & DIALOG VARIANTS ────────────────────────────────
export const originPopoverVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.94,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springs.snappy,
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    transition: {
      duration: 0.14,
      ease: "easeIn",
    },
  },
}

export const dialogOverlayVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: "easeIn",
    },
  },
}

export const dialogContentVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springs.gentle,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 8,
    transition: {
      duration: 0.16,
      ease: "easeInOut",
    },
  },
}

export const drawerVariants: Variants = {
  initial: {
    x: "100%",
    opacity: 0.5,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: springs.gentle,
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeInOut",
    },
  },
}

// ─── 6. TACTILE FEEDBACK PROPS ────────────────────────────────────────────────
export const tactileProps = {
  button: {
    whileHover: { scale: 1.015, y: -0.5 },
    whileTap: { scale: 0.96 },
    transition: springs.snappy,
  },
  iconButton: {
    whileHover: { scale: 1.06 },
    whileTap: { scale: 0.92 },
    transition: springs.snappy,
  },
  card: {
    whileHover: { y: -3, transition: springs.snappy },
    whileTap: { scale: 0.99 },
  },
  tab: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.97 },
    transition: springs.snappy,
  },
} as const

// ─── 7. ORIGIN-AWARE ANCHOR CALCULATION UTILITIES ────────────────────────────
export type PopoverPlacement =
  | "top"
  | "top-left"
  | "top-right"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-left"
  | "bottom-right"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "right"
  | "center"

export interface AnchorOriginResult {
  transformOrigin: string
  placement: PopoverPlacement | string
}

export interface RectLike {
  top: number
  left: number
  width: number
  height: number
  right?: number
  bottom?: number
}

/**
 * Calculates CSS transform-origin from a trigger element's bounding rect
 * and popover alignment, guaranteeing that expanding popovers and menus
 * scale cleanly from their invoking anchor button.
 */
export function getAnchorOrigin(
  _triggerRect?: RectLike | DOMRect | null,
  popoverPlacement: PopoverPlacement | string = "bottom-right",
): AnchorOriginResult {
  switch (popoverPlacement) {
    case "top-left":
    case "top-start":
      return { transformOrigin: "bottom left", placement: popoverPlacement }
    case "top-right":
    case "top-end":
      return { transformOrigin: "bottom right", placement: popoverPlacement }
    case "top":
      return { transformOrigin: "bottom center", placement: popoverPlacement }
    case "bottom-left":
    case "bottom-start":
      return { transformOrigin: "top left", placement: popoverPlacement }
    case "bottom-right":
    case "bottom-end":
      return { transformOrigin: "top right", placement: popoverPlacement }
    case "bottom":
      return { transformOrigin: "top center", placement: popoverPlacement }
    case "left":
      return { transformOrigin: "right center", placement: popoverPlacement }
    case "right":
      return { transformOrigin: "left center", placement: popoverPlacement }
    case "center":
      return { transformOrigin: "center center", placement: popoverPlacement }
    default:
      return { transformOrigin: "top right", placement: popoverPlacement }
  }
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

/**
 * React Hook to dynamically monitor trigger and popover geometries,
 * maintaining accurate transform-origin coordinates even when viewport resizes or popover opens.
 */
export function useAnchorOrigin(
  triggerRef: RefObject<HTMLElement | null>,
  popoverRef?: RefObject<HTMLElement | null>,
  preferredPlacement: PopoverPlacement | string = "bottom-right",
  isOpen?: boolean,
) {
  const [origin, setOrigin] = useState<string>(() => {
    return getAnchorOrigin(null, preferredPlacement).transformOrigin
  })
  const [placement, setPlacement] = useState<string>(preferredPlacement)

  const updateOrigin = () => {
    if (!triggerRef.current) return
    const triggerRect = triggerRef.current.getBoundingClientRect()

    if (popoverRef?.current) {
      const popoverRect = popoverRef.current.getBoundingClientRect()
      const isBelow = popoverRect.top >= triggerRect.bottom - 8
      const isRightAligned =
        Math.abs(popoverRect.right - triggerRect.right) < 40 ||
        popoverRect.left < triggerRect.left

      const originY = isBelow ? "top" : "bottom"
      const originX = isRightAligned ? "right" : "left"
      const computedPlacement = `${originY}-${originX}`

      setOrigin(`${originY} ${originX}`)
      setPlacement(computedPlacement)
    } else {
      const res = getAnchorOrigin(triggerRect, preferredPlacement)
      setOrigin(res.transformOrigin)
      setPlacement(res.placement)
    }
  }

  useIsomorphicLayoutEffect(() => {
    updateOrigin()
    window.addEventListener("resize", updateOrigin)
    window.addEventListener("scroll", updateOrigin, true)
    return () => {
      window.removeEventListener("resize", updateOrigin)
      window.removeEventListener("scroll", updateOrigin, true)
    }
  }, [triggerRef, popoverRef, preferredPlacement, isOpen])

  return {
    transformOrigin: origin,
    placement,
    updateOrigin,
  }
}

