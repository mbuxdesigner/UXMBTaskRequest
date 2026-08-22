import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Filter, Check, X } from "lucide-react"
import { KANBAN_PROCESS_COLUMNS, getRequestKanbanPhase } from "@/components/kanban/KanbanBoard"
import { UXRequest } from "@/data/mockData"

export interface FilterState {
  phases: string[]
  squads: string[]
}

export interface TaskFilterPopoverProps {
  requests: UXRequest[]
  selectedPhases: string[]
  selectedSquads: string[]
  onPhasesChange: (phases: string[]) => void
  onSquadsChange: (squads: string[]) => void
  onClearAll: () => void
}

export default function TaskFilterPopover({
  requests,
  selectedPhases,
  selectedSquads,
  onPhasesChange,
  onSquadsChange,
  onClearAll,
}: TaskFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
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

  // Count items per phase
  const phaseCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    KANBAN_PROCESS_COLUMNS.forEach((col) => {
      counts[col.phase] = requests.filter((r) => getRequestKanbanPhase(r) === col.phase).length
    })
    return counts
  }, [requests])

  // Unique Squads / Products & count
  const squadCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    requests.forEach((r) => {
      const squad = (r.squad_name && r.squad_name.trim()) || (r.product && r.product.trim()) || "Khác"
      counts[squad] = (counts[squad] || 0) + 1
    })
    return counts
  }, [requests])

  const availableSquads = Object.keys(squadCounts)

  const togglePhase = (phase: string) => {
    if (selectedPhases.includes(phase)) {
      onPhasesChange(selectedPhases.filter((p) => p !== phase))
    } else {
      onPhasesChange([...selectedPhases, phase])
    }
  }

  const toggleSquad = (squad: string) => {
    if (selectedSquads.includes(squad)) {
      onSquadsChange(selectedSquads.filter((s) => s !== squad))
    } else {
      onSquadsChange([...selectedSquads, squad])
    }
  }

  const activeFilterCount = selectedPhases.length + selectedSquads.length

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-10 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none ${
          activeFilterCount > 0
            ? "bg-[#1B3A6B] text-white border-[#1B3A6B] shadow-xs"
            : isOpen
            ? "bg-slate-100 text-slate-900 border-slate-300"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        <span>Lọc</span>
        {activeFilterCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-white text-[#1B3A6B] text-[11px] font-bold flex items-center justify-center shrink-0">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 space-y-4"
          >
            {/* Header: Filters + Clear button */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-900">Bộ lọc</h4>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* Section 1: Workstream / Trạng thái công việc */}
            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">Trạng thái công việc</p>
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                {KANBAN_PROCESS_COLUMNS.map((col) => {
                  const isChecked = selectedPhases.includes(col.phase)
                  const count = phaseCounts[col.phase] || 0

                  return (
                    <label
                      key={col.id}
                      onClick={() => togglePhase(col.phase)}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Custom Checkbox */}
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isChecked
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        {/* Dot indicator */}
                        <span className={`w-2 h-2 rounded-full ${col.dotColor} shrink-0`} />

                        {/* Label */}
                        <span className="text-xs font-medium text-slate-800 truncate">
                          {col.title}
                        </span>
                      </div>

                      {/* Count */}
                      <span className="text-xs font-mono text-slate-400 font-medium pl-2">
                        {count}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Section 2: Squad / Phân hệ */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 mb-2">Squad</p>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {availableSquads.map((squad, sIdx) => {
                  const isChecked = selectedSquads.includes(squad)
                  const count = squadCounts[squad] || 0

                  return (
                    <label
                      key={`sq-opt-${squad || sIdx}-${sIdx}`}
                      onClick={() => toggleSquad(squad)}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Custom Checkbox */}
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isChecked
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        {/* Label */}
                        <span className="text-xs font-medium text-slate-800 truncate">
                          {squad}
                        </span>
                      </div>

                      {/* Count */}
                      <span className="text-xs font-mono text-slate-400 font-medium pl-2">
                        {count}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
