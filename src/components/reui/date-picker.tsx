import React, { useState, useRef, useEffect } from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"

interface DatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (dateStr: string) => void
  label?: string
  icon?: React.ReactNode
  placeholder?: string
  className?: string
  buttonClassName?: string
}

export function DatePicker({
  value,
  onChange,
  label,
  icon,
  placeholder = "Chọn ngày...",
  className = "",
  buttonClassName = "",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse initial date or default to current date
  const parsedDate = value ? new Date(value) : new Date()
  const [viewDate, setViewDate] = useState<Date>(isNaN(parsedDate.getTime()) ? new Date() : parsedDate)

  // Sync viewDate when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) setViewDate(d)
    }
  }, [value])

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

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Month navigation
  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = new Date(year, month, 1).getDay() // 0 is Sunday

  const days: (number | null)[] = []
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d)
  }

  const handleSelectDay = (day: number) => {
    const formatted = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    onChange(formatted)
    setIsOpen(false)
  }

  const formatDisplay = (val: string) => {
    if (!val) return placeholder
    const parts = val.split("-")
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}` // DD/MM/YYYY
    }
    return val
  }

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ]

  const dayHeaders = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button - 2-Line Container matching reference design */}
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
              <p className="text-[11px] text-slate-500 font-medium leading-none mb-1 truncate">
                {label}
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                {formatDisplay(value)}
              </p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform duration-200 ${isOpen ? "rotate-180 text-slate-700" : ""}`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full h-10 px-3 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between gap-2 transition-all shadow-2xs hover:border-slate-300 focus:outline-hidden cursor-pointer ${
            isOpen ? "border-[#1E5AF6] ring-2 ring-blue-500/10" : ""
          } ${buttonClassName}`}
        >
          <span className={value ? "text-slate-900" : "text-slate-400"}>
            {formatDisplay(value)}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180 text-slate-700" : ""}`} />
        </button>
      )}

      {/* Floating Calendar Popup */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/10 p-3 z-50 animate-in fade-in-0 zoom-in-95 duration-150 select-none">
          {/* Header Month/Year Selector */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-extrabold text-slate-900">
              {monthNames[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1 text-center">
            {dayHeaders.map((dh) => (
              <span key={dh} className="text-[10px] font-bold text-slate-400">
                {dh}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((d, index) => {
              if (d === null) {
                return <div key={`empty-${index}`} className="h-7 w-7" />
              }

              const isSelected =
                value &&
                new Date(value).getFullYear() === year &&
                new Date(value).getMonth() === month &&
                new Date(value).getDate() === d

              const isToday =
                new Date().getFullYear() === year &&
                new Date().getMonth() === month &&
                new Date().getDate() === d

              return (
                <button
                  key={`day-${d}`}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={`h-7 w-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#1E5AF6] text-white font-bold shadow-xs"
                      : isToday
                      ? "border border-[#1E5AF6] text-[#1E5AF6] font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {/* Quick Clear / Today Buttons */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                onChange("")
                setIsOpen(false)
              }}
              className="text-slate-400 hover:text-rose-500 font-semibold cursor-pointer"
            >
              Xóa chọn
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
                onChange(formatted)
                setIsOpen(false)
              }}
              className="text-[#1E5AF6] hover:underline font-bold cursor-pointer"
            >
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
export default DatePicker
