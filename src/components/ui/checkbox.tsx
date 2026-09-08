import * as React from "react"
import { Check } from "lucide-react"

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", checked = false, onCheckedChange, onChange, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onCheckedChange?.(e.target.checked)
    }

    return (
      <label className={`relative inline-flex items-center justify-center shrink-0 select-none ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className}`}>
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center transition-all bg-white ${
            checked
              ? "bg-[#1057FB] border-[#1057FB] text-white shadow-2xs"
              : "border-slate-300 hover:border-slate-400 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 peer-focus-visible:ring-offset-1"
          }`}
        >
          {checked && <Check className="w-3 h-3 text-white stroke-[3]" />}
        </div>
      </label>
    )
  }
)

Checkbox.displayName = "Checkbox"
