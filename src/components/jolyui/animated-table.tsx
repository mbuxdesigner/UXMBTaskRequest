import React from "react"
import { motion, HTMLMotionProps, Variants } from "framer-motion"

export const tableContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
}

export const tableRowVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 10,
    filter: "blur(4px)" 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      damping: 24,
      stiffness: 280,
    }
  },
  exit: {
    opacity: 0,
    y: -6,
    filter: "blur(2px)",
    transition: {
      duration: 0.15,
    }
  }
}

export interface AnimatedTableRowProps extends HTMLMotionProps<"tr"> {
  index?: number
  children: React.ReactNode
  className?: string
}

export function AnimatedTableRow({
  index = 0,
  children,
  className = "",
  ...props
}: AnimatedTableRowProps) {
  return (
    <motion.tr
      variants={tableRowVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ delay: index * 0.035 }}
      whileHover={{ backgroundColor: "rgba(240, 246, 255, 0.65)" }}
      className={`transition-colors cursor-pointer group ${className}`}
      {...props}
    >
      {children}
    </motion.tr>
  )
}
