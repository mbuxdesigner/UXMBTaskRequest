import * as React from "react"
import { cn } from "@/lib/utils"

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  color?: string
  className?: string
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      value,
      onChange,
      min = 0,
      max = 100,
      step = 1,
      color = "#1057FB",
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(
      100,
      Math.max(0, ((value - min) / (max - min)) * 100)
    )

    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`,
          ["--thumb-color" as any]: color,
        }}
        className={cn(
          "w-full h-1.5 rounded-full appearance-none cursor-pointer focus:outline-none transition-all",
          "[&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4",
          "[&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:bg-white",
          "[&::-webkit-slider-thumb]:border-2",
          "[&::-webkit-slider-thumb]:[border-color:var(--thumb-color)]",
          "[&::-webkit-slider-thumb]:shadow-xs",
          "[&::-webkit-slider-thumb]:cursor-pointer",
          "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-115 active:[&::-webkit-slider-thumb]:scale-95",
          "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4",
          "[&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:bg-white",
          "[&::-moz-range-thumb]:border-2",
          "[&::-moz-range-thumb]:[border-color:var(--thumb-color)]",
          "[&::-moz-range-thumb]:shadow-xs",
          "[&::-moz-range-thumb]:cursor-pointer",
          "[&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-115 active:[&::-moz-range-thumb]:scale-95",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      />
    )
  }
)

Slider.displayName = "Slider"

export default Slider
