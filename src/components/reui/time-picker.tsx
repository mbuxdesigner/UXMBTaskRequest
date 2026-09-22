import React, { useState, useRef, useEffect, useMemo } from "react"
import { Clock, ChevronDown, Check } from "lucide-react"

export interface TimePickerProps {
  value: string // "HH:mm" (24h format, e.g. "08:00", "17:30")
  onChange: (timeStr: string) => void
  label?: React.ReactNode
  icon?: React.ReactNode
  placeholder?: string
  className?: string
  buttonClassName?: string
  size?: "sm" | "md" | "lg"
  minuteStep?: 1 | 5 | 10 | 15 | 30
  presets?: string[]
  disabled?: boolean
  align?: "left" | "right"
}

const DEFAULT_PRESETS = ["08:00", "08:30", "12:00", "13:30", "17:30", "18:00"]

export function TimePicker({
  value,
  onChange,
  label,
  icon,
  placeholder = "Chọn giờ...",
  className = "",
  buttonClassName = "",
  size = "md",
  minuteStep = 5,
  presets = DEFAULT_PRESETS,
  disabled = false,
  align = "left",
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hourListRef = useRef<HTMLDivElement>(null)
  const minuteListRef = useRef<HTMLDivElement>(null)

  // Parse HH:mm
  const { hour, minute } = useMemo(() => {
    if (!value || typeof value !== "string" || !value.includes(":")) {
      return { hour: "08", minute: "00" }
    }
    const [h, m] = value.split(":")
    return {
      hour: (h || "08").padStart(2, "0"),
      minute: (m || "00").padStart(2, "0"),
    }
  }, [value])

  // Hours: 00 -> 23
  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
  }, [])

  // Minutes based on minuteStep
  const minutes = useMemo(() => {
    const list: string[] = []
    for (let i = 0; i < 60; i += minuteStep) {
      list.push(String(i).padStart(2, "0"))
    }
    // If current minute isn't divisible by minuteStep, ensure it's included
    if (minute && !list.includes(minute)) {
      list.push(minute)
      list.sort((a, b) => Number(a) - Number(b))
    }
    return list
  }, [minuteStep, minute])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // Auto scroll selected hour and minute into view when opening
  useEffect(() => {
    if (isOpen) {
      const scrollSelected = (container: HTMLDivElement | null, selectedVal: string) => {
        if (!container) return
        const activeEl = container.querySelector(`[data-time-value="${selectedVal}"]`) as HTMLElement
        if (activeEl) {
          container.scrollTo({
            top: activeEl.offsetTop - container.offsetTop - 40,
            behavior: "smooth",
          })
        }
      }
      setTimeout(() => {
        scrollSelected(hourListRef.current, hour)
        scrollSelected(minuteListRef.current, minute)
      }, 50)
    }
  }, [isOpen, hour, minute])

  const handleSelectHour = (newHour: string) => {
    onChange(`${newHour}:${minute}`)
  }

  const handleSelectMinute = (newMinute: string) => {
    onChange(`${hour}:${newMinute}`)
  }

  const handleSelectPreset = (preset: string) => {
    onChange(preset)
  }

  const handleSelectNow = () => {
    const now = new Date()
    const h = String(now.getHours()).padStart(2, "0")
    const m = String(Math.round(now.getMinutes() / minuteStep) * minuteStep % 60).padStart(2, "0")
    onChange(`${h}:${m}`)
    setIsOpen(false)
  }

  // Display text
  const displayValue = value ? value : placeholder

  // Size styling
  const sizeClasses = {
    sm: "h-8 px-2.5 text-xs rounded-lg",
    md: "h-10 px-3 text-xs sm:text-sm rounded-xl",
    lg: "h-11 px-3.5 text-sm rounded-xl",
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button - 2-Line Container matching DatePicker when label is provided */}
      {label ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full p-3.5 bg-[#F1F4F9] hover:bg-[#E8EDF5] border border-slate-200/60 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer select-none ${
            isOpen ? "ring-2 ring-[#1E5AF6]/20 border-[#1E5AF6]" : ""
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${buttonClassName}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {icon ? (
              <span className="text-slate-400 flex-shrink-0">{icon}</span>
            ) : (
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-xs text-slate-500 font-medium leading-none mb-1 truncate">
                {typeof label === "string" && label.includes("*") ? (
                  <>
                    <span>{label.replace("*", "").trim()} </span>
                    <span className="text-rose-500 font-bold">*</span>
                  </>
                ) : (
                  label
                )}
              </div>
              <p className="text-sm sm:text-base font-semibold text-slate-900 leading-tight truncate font-mono">
                {displayValue}
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
        /* Compact Single-Line Trigger */
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full bg-white hover:bg-slate-50 border border-slate-200/90 font-semibold text-slate-800 flex items-center justify-between gap-2 transition-all shadow-2xs hover:border-slate-300 focus:outline-hidden cursor-pointer select-none ${
            sizeClasses[size]
          } ${isOpen ? "border-[#1E5AF6] ring-2 ring-blue-500/10" : ""} ${
            disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : ""
          } ${buttonClassName}`}
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {icon !== undefined ? (
              icon
            ) : (
              <Clock className={size === "sm" ? "w-3 h-3 text-slate-400 shrink-0" : "w-3.5 h-3.5 text-slate-400 shrink-0"} />
            )}
            <span className={`font-mono tabular-nums ${value ? "text-slate-900 font-bold" : "text-slate-400"}`}>
              {displayValue}
            </span>
          </div>
          <ChevronDown
            className={`text-slate-400 transition-transform shrink-0 ${
              size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"
            } ${isOpen ? "rotate-180 text-slate-700" : ""}`}
          />
        </button>
      )}

      {/* Floating Time Picker Popover */}
      {isOpen && (
        <div className={`absolute ${align === "right" ? "right-0" : "left-0"} mt-1.5 w-64 bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/10 p-3 z-50 animate-in fade-in-0 zoom-in-95 duration-150 select-none`}>
          {/* Header Display */}
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#1E5AF6]" />
              <span className="text-xs font-bold text-slate-800">Chọn thời gian</span>
            </div>
            <div className="flex items-center font-mono font-bold text-sm bg-blue-50 text-[#1E5AF6] px-2 py-0.5 rounded-lg border border-blue-200/60 tabular-nums">
              <span>{hour}</span>
              <span className="animate-pulse mx-0.5">:</span>
              <span>{minute}</span>
            </div>
          </div>

          {/* Preset Quick Chips */}
          {presets.length > 0 && (
            <div className="mb-2.5 flex items-center gap-1 flex-wrap">
              {presets.map((p) => {
                const isPresetActive = value === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                      isPresetActive
                        ? "bg-[#1E5AF6] text-white font-bold shadow-2xs"
                        : "bg-slate-100/80 hover:bg-slate-200 text-slate-600 font-medium"
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          )}

          {/* Dual Columns: Giờ (Hours) & Phút (Minutes) */}
          <div className="grid grid-cols-2 gap-2 text-center">
            {/* Column 1: Hours */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Giờ
              </div>
              <div
                ref={hourListRef}
                className="h-40 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 overscroll-contain"
              >
                {hours.map((h) => {
                  const isSelected = h === hour
                  return (
                    <button
                      key={h}
                      type="button"
                      data-time-value={h}
                      onClick={() => handleSelectHour(h)}
                      className={`w-full py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#1E5AF6] text-white font-bold shadow-xs"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {h}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Column 2: Minutes */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Phút
              </div>
              <div
                ref={minuteListRef}
                className="h-40 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 overscroll-contain"
              >
                {minutes.map((m) => {
                  const isSelected = m === minute
                  return (
                    <button
                      key={m}
                      type="button"
                      data-time-value={m}
                      onClick={() => handleSelectMinute(m)}
                      className={`w-full py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#1E5AF6] text-white font-bold shadow-xs"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSelectNow}
              className="text-[#1E5AF6] hover:underline font-bold cursor-pointer text-[11px]"
            >
              Bây giờ
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>Xong</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimePicker
