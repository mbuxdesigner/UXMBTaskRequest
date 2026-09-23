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
      color = "#0F172A",
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
          background: `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #E2E8F0 ${percentage}%, #E2E8F0 100%)`,
          ["--thumb-color" as any]: color,
        }}
        className={cn(
          "w-full h-2 rounded-full appearance-none cursor-pointer focus:outline-none transition-all",
          "[&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:w-4.5 [&::-webkit-slider-thumb]:h-4.5",
          "[&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:bg-white",
          "[&::-webkit-slider-thumb]:border-[2.5px]",
          "[&::-webkit-slider-thumb]:[border-color:var(--thumb-color)]",
          "[&::-webkit-slider-thumb]:shadow-sm",
          "[&::-webkit-slider-thumb]:cursor-grab active:[&::-webkit-slider-thumb]:cursor-grabbing",
          "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-120 active:[&::-webkit-slider-thumb]:scale-95",
          "[&::-moz-range-thumb]:w-4.5 [&::-moz-range-thumb]:h-4.5",
          "[&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:bg-white",
          "[&::-moz-range-thumb]:border-[2.5px]",
          "[&::-moz-range-thumb]:[border-color:var(--thumb-color)]",
          "[&::-moz-range-thumb]:shadow-sm",
          "[&::-moz-range-thumb]:cursor-grab active:[&::-moz-range-thumb]:cursor-grabbing",
          "[&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-120 active:[&::-moz-range-thumb]:scale-95",
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
