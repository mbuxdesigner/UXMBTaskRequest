import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { springs } from "@/lib/motion"

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  required?: boolean
  name?: string
  value?: string
  size?: "sm" | "default" | "lg"
  thumbClassName?: string
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      disabled = false,
      required = false,
      name,
      value = "on",
      size = "default",
      className,
      thumbClassName,
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const isControlled = controlledChecked !== undefined
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked)
    const isChecked = isControlled ? Boolean(controlledChecked) : uncontrolledChecked

    const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return
      const nextChecked = !isChecked
      if (!isControlled) {
        setUncontrolledChecked(nextChecked)
      }
      onCheckedChange?.(nextChecked)
      onClick?.(e)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        const nextChecked = !isChecked
        if (!isControlled) {
          setUncontrolledChecked(nextChecked)
        }
        onCheckedChange?.(nextChecked)
      }
      onKeyDown?.(e)
    }

    // Dimension configs: track size and thumb travel distance
    const sizeConfig = {
      sm: {
        track: "h-5 w-9 p-0.5",
        thumb: "size-4",
        travel: 16,
      },
      default: {
        track: "h-6 w-11 p-0.5",
        thumb: "size-5",
        travel: 20,
      },
      lg: {
        track: "h-7.5 w-14 p-0.5",
        thumb: "size-6.5",
        travel: 26,
      },
    }[size]

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-required={required}
        disabled={disabled}
        data-state={isChecked ? "checked" : "unchecked"}
        data-disabled={disabled ? "" : undefined}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "group relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1057FB]/40 focus-visible:ring-offset-2",
          isChecked ? "bg-[#1057FB]" : "bg-slate-200 dark:bg-slate-700",
          disabled && "cursor-not-allowed opacity-50",
          sizeConfig.track,
          className
        )}
        {...props}
      >
        <motion.span
          layout
          transition={springs.bouncy}
          animate={{
            x: isChecked ? sizeConfig.travel : 0,
          }}
          className={cn(
            "pointer-events-none block rounded-full bg-white shadow-md ring-0",
            sizeConfig.thumb,
            thumbClassName
          )}
        />
        {name && (
          <input
            type="checkbox"
            name={name}
            value={value}
            checked={isChecked}
            onChange={() => {}}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />
        )}
      </button>
    )
  }
)

Switch.displayName = "Switch"

export default Switch
