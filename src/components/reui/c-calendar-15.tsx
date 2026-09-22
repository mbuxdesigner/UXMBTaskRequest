"use client"

import React, { useState, useEffect } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

export interface CCalendar15Props {
  value?: string // YYYY-MM-DD
  onChange: (dateStr: string) => void
  onClose?: () => void
  className?: string
  title?: string
}

interface PresetItem {
  id: string
  label: string
  subLabel: string
  getDate: () => Date
}

function formatDateIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function CCalendar15({
  value,
  onChange,
  onClose,
  className = "",
  title,
}: CCalendar15Props) {
  // Parse initial date
  const parsed = value ? new Date(value) : new Date()
  const validInitial = !isNaN(parsed.getTime()) ? parsed : new Date()

  const [viewDate, setViewDate] = useState<Date>(validInitial)
  const [selectedDate, setSelectedDate] = useState<string>(value || "")

  useEffect(() => {
    if (value) {
      setSelectedDate(value)
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        setViewDate(d)
      }
    }
  }, [value])

  const currentYear = viewDate.getFullYear()
  const currentMonth = viewDate.getMonth()

  const monthNamesEn = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const weekdayHeaders = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

  // Build presets dynamically
  const now = new Date()
  const dayOfWeekNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const monthShortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  // Tomorrow
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)

  // This weekend (Saturday)
  const thisWeekend = new Date(now)
  const dayOfWeek = now.getDay() // 0 is Sun, 6 is Sat
  const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7
  thisWeekend.setDate(now.getDate() + daysUntilSat)

  // Next week (Next Monday)
  const nextMonday = new Date(now)
  const daysUntilNextMon = ((1 - dayOfWeek + 7) % 7) || 7
  nextMonday.setDate(now.getDate() + daysUntilNextMon)

  // Next weekend (Saturday of next week)
  const nextWeekend = new Date(thisWeekend)
  nextWeekend.setDate(thisWeekend.getDate() + 7)

  // 2 weeks
  const twoWeeks = new Date(now)
  twoWeeks.setDate(now.getDate() + 14)

  // 4 weeks
  const fourWeeks = new Date(now)
  fourWeeks.setDate(now.getDate() + 28)

  const presets: PresetItem[] = [
    {
      id: "today",
      label: "Today",
      subLabel: dayOfWeekNames[now.getDay()],
      getDate: () => new Date(now),
    },
    {
      id: "later",
      label: "Later",
      subLabel: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      getDate: () => new Date(now),
    },
    {
      id: "tomorrow",
      label: "Tomorrow",
      subLabel: dayOfWeekNames[tomorrow.getDay()],
      getDate: () => tomorrow,
    },
    {
      id: "this-weekend",
      label: "This weekend",
      subLabel: "Sat",
      getDate: () => thisWeekend,
    },
    {
      id: "next-week",
      label: "Next week",
      subLabel: "Mon",
      getDate: () => nextMonday,
    },
    {
      id: "next-weekend",
      label: "Next weekend",
      subLabel: `${nextWeekend.getDate()} ${monthShortNames[nextWeekend.getMonth()]}`,
      getDate: () => nextWeekend,
    },
    {
      id: "2-weeks",
      label: "2 weeks",
      subLabel: `${twoWeeks.getDate()} ${monthShortNames[twoWeeks.getMonth()]}`,
      getDate: () => twoWeeks,
    },
    {
      id: "4-weeks",
      label: "4 weeks",
      subLabel: `${fourWeeks.getDate()} ${monthShortNames[fourWeeks.getMonth()]}`,
      getDate: () => fourWeeks,
    },
  ]

  // Month navigation
  const prevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1, 1))
  const nextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1, 1))
  const jumpToday = () => {
    const today = new Date()
    setViewDate(today)
    const formatted = formatDateIso(today)
    setSelectedDate(formatted)
    onChange(formatted)
    if (onClose) onClose()
  }

  // Days in month
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay() // 0 = Sun
  const startOffset = (firstDayOfMonth + 6) % 7 // 0 = Mon, 6 = Sun

  // Days in previous month for trailing slots
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

  const handleSelectDate = (dateObj: Date) => {
    const formatted = formatDateIso(dateObj)
    setSelectedDate(formatted)
    onChange(formatted)
    if (onClose) onClose()
  }

  // Render grid cells (total 35 or 42)
  interface GridDay {
    dayNum: number
    monthOffset: -1 | 0 | 1
    dateObj: Date
    isoStr: string
  }

  const gridDays: GridDay[] = []

  // 1. Previous month trailing days
  for (let i = startOffset - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i
    const d = new Date(currentYear, currentMonth - 1, dayNum)
    gridDays.push({
      dayNum,
      monthOffset: -1,
      dateObj: d,
      isoStr: formatDateIso(d),
    })
  }

  // 2. Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateObj = new Date(currentYear, currentMonth, d)
    gridDays.push({
      dayNum: d,
      monthOffset: 0,
      dateObj,
      isoStr: formatDateIso(dateObj),
    })
  }

  // 3. Next month leading days (fill up to 35 or 42 cells)
  const targetCells = gridDays.length <= 35 ? 35 : 42
  const remaining = targetCells - gridDays.length
  for (let d = 1; d <= remaining; d++) {
    const dateObj = new Date(currentYear, currentMonth + 1, d)
    gridDays.push({
      dayNum: d,
      monthOffset: 1,
      dateObj,
      isoStr: formatDateIso(dateObj),
    })
  }

  const todayIso = formatDateIso(now)

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-900/12 overflow-hidden flex flex-col sm:flex-row select-none z-50 text-slate-800 ${className}`}>
      {/* Left Column: Presets */}
      <div className="w-full sm:w-44 border-b sm:border-b-0 sm:border-r border-slate-200/80 bg-slate-50/60 p-2 shrink-0 flex flex-col justify-between">
        <div className="space-y-0.5">
          {title && (
            <div className="px-2.5 py-1 mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
              {title}
            </div>
          )}
          {presets.map((p) => {
            const pDate = p.getDate()
            const pIso = formatDateIso(pDate)
            const isSelected = selectedDate === pIso

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectDate(pDate)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                  isSelected
                    ? "bg-slate-200/90 font-semibold text-slate-900 shadow-2xs"
                    : "hover:bg-slate-200/60 text-slate-700 font-normal"
                }`}
              >
                <span>{p.label}</span>
                <span className="text-[11px] text-slate-400 font-normal tabular-nums">
                  {p.subLabel}
                </span>
              </button>
            )
          })}
        </div>

        {/* Clear selection */}
        <div className="pt-2 mt-2 border-t border-slate-200/60 px-1">
          <button
            type="button"
            onClick={() => {
              setSelectedDate("")
              onChange("")
              if (onClose) onClose()
            }}
            className="w-full text-left px-2 py-1 text-[11px] text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50/60 transition-colors cursor-pointer"
          >
            Xóa chọn
          </button>
        </div>
      </div>

      {/* Right Column: Month Calendar */}
      <div className="p-3 sm:p-4 min-w-[270px]">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-sm font-semibold text-slate-900 tracking-tight">
            {monthNamesEn[currentMonth]} {currentYear}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={jumpToday}
              className="text-xs text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors font-medium cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={prevMonth}
              title="Tháng trước"
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              title="Tháng sau"
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekday Row */}
        <div className="grid grid-cols-7 text-center mb-1">
          {weekdayHeaders.map((wh) => (
            <span key={wh} className="text-[11px] font-medium text-slate-400 py-1">
              {wh}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {gridDays.map((cell, idx) => {
            const isSelected = selectedDate === cell.isoStr
            const isToday = todayIso === cell.isoStr
            const isDimmed = cell.monthOffset !== 0

            return (
              <button
                key={`${cell.isoStr}-${idx}`}
                type="button"
                onClick={() => handleSelectDate(cell.dateObj)}
                className={`h-7 w-7 rounded-md text-xs font-normal flex items-center justify-center transition-all cursor-pointer mx-auto ${
                  isSelected
                    ? "bg-slate-900 text-white font-semibold rounded-md shadow-xs scale-105"
                    : isToday
                    ? "font-semibold text-[#1057FB] ring-1.5 ring-[#1057FB]/40 rounded-md hover:bg-blue-50"
                    : isDimmed
                    ? "text-slate-300 hover:text-slate-600 hover:bg-slate-100"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {cell.dayNum}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
