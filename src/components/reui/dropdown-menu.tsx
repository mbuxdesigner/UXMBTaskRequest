import React, { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"

export interface DropdownOption {
  value: string
  label: string
  icon?: React.ReactNode
  badge?: React.ReactNode
}

interface DropdownMenuProps {
  label?: string
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  icon?: React.ReactNode
  className?: string
  buttonClassName?: string
  menuClassName?: string
  position?: "bottom" | "top"
}

export function DropdownMenu({
  label,
  options,
  value,
  onChange,
  placeholder = "Chọn...",
  icon,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  position = "bottom",
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger Button - 2-Line Container matching reference design when label is passed */}
      {label ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full p-3.5 bg-[#F1F4F9] hover:bg-[#E8EDF5] border border-slate-200/60 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer select-none ${
            isOpen ? "ring-2 ring-[#1E5AF6]/20 border-[#1E5AF6]" : ""
          } ${buttonClassName}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {icon && <span className="text-slate-400 flex-shrink-0">{icon}</span>}
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium leading-none mb-1 truncate">
                {label}
              </p>
              <p className="text-sm sm:text-base font-semibold text-slate-900 leading-tight truncate">
                {selectedOption && selectedOption.value ? selectedOption.label : placeholder}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-slate-700" : ""
            }`}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-2.5 transition-all shadow-2xs hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1B3A6B]/15 cursor-pointer ${
            isOpen ? "border-[#1B3A6B] ring-2 ring-[#1B3A6B]/10" : ""
          } ${buttonClassName}`}
        >
          <div className="flex items-center gap-2 truncate">
            {icon && <span className="text-slate-400 flex-shrink-0">{icon}</span>}
            <span className="truncate font-semibold">
              {selectedOption && selectedOption.value ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? "rotate-180 text-slate-700" : ""
            }`}
          />
        </button>
      )}

      {/* Floating Menu Popover (Supports position="top" and position="bottom") */}
      {isOpen && (
        <div
          className={`absolute left-0 bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/10 p-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-150 ${
            position === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } ${menuClassName || "w-full min-w-56 max-h-72 overflow-y-auto"}`}
        >
          <div className="space-y-0.5">
            {options.map((opt, idx) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value !== "" ? `opt-val-${opt.value}` : `opt-idx-${idx}`}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer group ${
                    isSelected
                      ? "bg-[#1B3A6B]/8 text-[#1B3A6B] font-bold"
                      : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.icon && (
                      <span className={`${isSelected ? "text-[#1B3A6B]" : "text-slate-400 group-hover:text-slate-600"}`}>
                        {opt.icon}
                      </span>
                    )}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {opt.badge}
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#1B3A6B] stroke-[2.5]" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
export default DropdownMenu
