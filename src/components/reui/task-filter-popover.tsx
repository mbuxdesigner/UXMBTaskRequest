import React, { useState, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Filter, Check, X, Search, CircleDot, Layers, Users } from "lucide-react"
import { getKanbanColumns, getRequestKanbanPhase } from "@/components/kanban/KanbanBoard"
import { UXRequest } from "@/data/mockData"
import { getProductColorDef } from "@/lib/colorUtils"
import { getStatusConfig } from "@/config/statusConfig"
import { springs, originPopoverVariants, useAnchorOrigin } from "@/lib/motion"

export interface FilterState {
  phases: string[]
  products: string[]
  squads: string[]
}

export interface TaskFilterPopoverProps {
  requests: UXRequest[]
  selectedPhases: string[]
  selectedProducts?: string[]
  selectedSquads: string[]
  onPhasesChange: (phases: string[]) => void
  onProductsChange?: (products: string[]) => void
  onSquadsChange: (squads: string[]) => void
  onClearAll: () => void
}

type FilterCategoryKey = "phases" | "products" | "squads"

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
}

export default function TaskFilterPopover({
  requests,
  selectedPhases,
  selectedProducts = [],
  selectedSquads,
  onPhasesChange,
  onProductsChange,
  onSquadsChange,
  onClearAll,
}: TaskFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<FilterCategoryKey>("phases")
  const [searchQuery, setSearchQuery] = useState("")

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverContentRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { transformOrigin } = useAnchorOrigin(
    triggerRef,
    popoverContentRef,
    "bottom-right",
    isOpen
  )

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    } else {
      setSearchQuery("")
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  // Clear search when switching filter category
  const handleSelectCategory = (key: FilterCategoryKey) => {
    setActiveCategory(key)
    setSearchQuery("")
  }

  // Dynamic columns based on latest admin UX phases
  const kanbanColumns = useMemo(() => getKanbanColumns(), [requests])

  // Count items per phase
  const phaseCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    kanbanColumns.forEach((col) => {
      counts[col.phase] = requests.filter((r) => getRequestKanbanPhase(r) === col.phase).length
    })
    return counts
  }, [requests, kanbanColumns])

  // Unique Products & count
  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    requests.forEach((r) => {
      let prod = (r.product && r.product.trim()) || "Khác"
      const pLower = prod.toLowerCase().replace(/[\s\-_]+/g, "")
      if (pLower === "appmb" || pLower === "appmbbank" || pLower === "mbapp") {
        prod = "APP MB"
      }
      counts[prod] = (counts[prod] || 0) + 1
    })
    return counts
  }, [requests])

  const availableProducts = useMemo(() => {
    const keys = Object.keys(productCounts)
    try {
      const raw = localStorage.getItem("mbbank_admin_products")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const orderMap = new Map<string, number>()
          parsed.forEach((p: any, idx: number) => {
            const name = (p?.name || "").trim().toLowerCase()
            if (name) orderMap.set(name, idx)
          })
          return [...keys].sort((a, b) => {
            const idxA = orderMap.has(a.trim().toLowerCase()) ? orderMap.get(a.trim().toLowerCase())! : 9999
            const idxB = orderMap.has(b.trim().toLowerCase()) ? orderMap.get(b.trim().toLowerCase())! : 9999
            if (idxA !== idxB) return idxA - idxB
            return a.localeCompare(b)
          })
        }
      }
    } catch {}
    return keys
  }, [productCounts])

  // Unique Squads & count
  const squadCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    requests.forEach((r) => {
      const squad = (r.squad_name && r.squad_name.trim()) || (r.preferred_squad && r.preferred_squad.trim()) || ""
      if (squad && squad !== "Chưa phân công" && squad !== "Triage Squad") {
        counts[squad] = (counts[squad] || 0) + 1
      }
    })
    return counts
  }, [requests])

  const availableSquads = useMemo(() => {
    const keys = Object.keys(squadCounts)
    try {
      const raw = localStorage.getItem("mbbank_admin_squads")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const orderMap = new Map<string, number>()
          parsed.forEach((s: any, idx: number) => {
            const name = (s?.name || s?.squad_name || "").trim().toLowerCase()
            if (name) orderMap.set(name, idx)
          })
          return [...keys].sort((a, b) => {
            const idxA = orderMap.has(a.trim().toLowerCase()) ? orderMap.get(a.trim().toLowerCase())! : 9999
            const idxB = orderMap.has(b.trim().toLowerCase()) ? orderMap.get(b.trim().toLowerCase())! : 9999
            if (idxA !== idxB) return idxA - idxB
            return a.localeCompare(b)
          })
        }
      }
    } catch {}
    return keys
  }, [squadCounts])

  const hasProductsTab = availableProducts.length > 0 && Boolean(onProductsChange)

  // Ensure activeCategory stays valid if products tab disappears
  useEffect(() => {
    if (activeCategory === "products" && !hasProductsTab) {
      setActiveCategory("phases")
    }
  }, [activeCategory, hasProductsTab])

  const categories = useMemo(() => {
    const list: Array<{
      key: FilterCategoryKey
      label: string
      shortLabel: string
      icon: React.ComponentType<{ className?: string }>
      selectedCount: number
      totalCount: number
      searchPlaceholder: string
    }> = [
      {
        key: "phases",
        label: "Trạng thái",
        shortLabel: "Trạng thái",
        icon: CircleDot,
        selectedCount: selectedPhases.length,
        totalCount: kanbanColumns.length,
        searchPlaceholder: "Tìm trạng thái...",
      },
    ]

    if (hasProductsTab) {
      list.push({
        key: "products",
        label: "Sản phẩm",
        shortLabel: "Sản phẩm",
        icon: Layers,
        selectedCount: selectedProducts.length,
        totalCount: availableProducts.length,
        searchPlaceholder: "Tìm sản phẩm...",
      })
    }

    list.push({
      key: "squads",
      label: "Squad",
      shortLabel: "Squad",
      icon: Users,
      selectedCount: selectedSquads.length,
      totalCount: availableSquads.length,
      searchPlaceholder: "Tìm squad...",
    })

    return list
  }, [
    hasProductsTab,
    selectedPhases.length,
    selectedProducts.length,
    selectedSquads.length,
    kanbanColumns.length,
    availableProducts.length,
    availableSquads.length,
  ])

  const activeCategoryMeta = categories.find((c) => c.key === activeCategory) || categories[0]

  const togglePhase = (phase: string) => {
    if (selectedPhases.includes(phase)) {
      onPhasesChange(selectedPhases.filter((p) => p !== phase))
    } else {
      onPhasesChange([...selectedPhases, phase])
    }
  }

  const toggleProduct = (prod: string) => {
    if (!onProductsChange) return
    if (selectedProducts.includes(prod)) {
      onProductsChange(selectedProducts.filter((p) => p !== prod))
    } else {
      onProductsChange([...selectedProducts, prod])
    }
  }

  const toggleSquad = (squad: string) => {
    if (selectedSquads.includes(squad)) {
      onSquadsChange(selectedSquads.filter((s) => s !== squad))
    } else {
      onSquadsChange([...selectedSquads, squad])
    }
  }

  const clearCurrentCategory = () => {
    if (activeCategory === "phases") onPhasesChange([])
    else if (activeCategory === "products" && onProductsChange) onProductsChange([])
    else if (activeCategory === "squads") onSquadsChange([])
  }

  const normalizedQuery = normalizeSearchText(searchQuery)

  const filteredPhases = useMemo(() => {
    if (!normalizedQuery) return kanbanColumns
    return kanbanColumns.filter(
      (col) =>
        normalizeSearchText(col.title).includes(normalizedQuery) ||
        normalizeSearchText(col.phase).includes(normalizedQuery)
    )
  }, [kanbanColumns, normalizedQuery])

  const filteredProducts = useMemo(() => {
    if (!normalizedQuery) return availableProducts
    return availableProducts.filter((prod) => normalizeSearchText(prod).includes(normalizedQuery))
  }, [availableProducts, normalizedQuery])

  const filteredSquads = useMemo(() => {
    if (!normalizedQuery) return availableSquads
    return availableSquads.filter((squad) => normalizeSearchText(squad).includes(normalizedQuery))
  }, [availableSquads, normalizedQuery])

  const activeFilterCount = selectedPhases.length + selectedProducts.length + selectedSquads.length

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <motion.button
        ref={triggerRef}
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer select-none ${
          activeFilterCount > 0
            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
            : isOpen
            ? "bg-slate-100 text-slate-900 border-slate-300"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        <span>Lọc</span>
        {activeFilterCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-white text-slate-900 text-[10px] font-bold flex items-center justify-center shrink-0">
            {activeFilterCount}
          </span>
        )}
      </motion.button>

      {/* Master-Detail 2-Column Popover Card (No Nested Scrollbars + Sticky Header/Footer) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverContentRef}
            variants={originPopoverVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springs.popover}
            style={{ transformOrigin }}
            className="absolute right-0 top-full mt-2 w-[min(496px,calc(100vw-2rem))] max-h-[min(460px,calc(100vh-120px))] flex flex-col overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xl z-50"
          >
            {/* Fixed Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <h4 className="font-bold text-sm text-slate-900">Bộ lọc</h4>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                    {activeFilterCount} đang chọn
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="px-2 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Xóa lọc
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Đóng bộ lọc"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2-Column Body: Left Category Nav + Right Single-Scroll Options Pane */}
            <div className="flex-1 min-h-0 flex flex-col sm:flex-row overflow-hidden">
              {/* Left Sidebar (Desktop) / Top Tab Strip (Mobile) */}
              <div className="sm:w-[164px] shrink-0 bg-slate-50/80 border-b sm:border-b-0 sm:border-r border-slate-100 p-2 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible">
                {categories.map((cat) => {
                  const Icon = cat.icon
                  const isActive = activeCategory === cat.key
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => handleSelectCategory(cat.key)}
                      className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer select-none whitespace-nowrap shrink-0 sm:w-full ${
                        isActive
                          ? "bg-white text-slate-900 font-semibold shadow-2xs ring-1 ring-slate-200/80"
                          : "text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-100/80"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? "text-slate-900" : "text-slate-400"
                          }`}
                        />
                        <span className="truncate">{cat.label}</span>
                      </span>
                      {cat.selectedCount > 0 ? (
                        <span
                          className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            isActive
                              ? "bg-slate-900 text-white"
                              : "bg-slate-200/90 text-slate-700"
                          }`}
                        >
                          {cat.selectedCount}
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400 shrink-0 hidden sm:inline">
                          {cat.totalCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Right Options Pane (Search + Single Scroll Container) */}
              <div className="flex-1 min-w-0 flex flex-col min-h-0 h-[296px] sm:h-[312px]">
                {/* Search Input + Active Group Clear */}
                <div className="shrink-0 px-3 pt-2.5 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={activeCategoryMeta.searchPlaceholder}
                      className="w-full h-8 pl-8 pr-7 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        aria-label="Xóa từ khóa tìm kiếm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {activeCategoryMeta.selectedCount > 0 && (
                    <button
                      type="button"
                      onClick={clearCurrentCategory}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-900 whitespace-nowrap cursor-pointer shrink-0 px-1.5 py-1 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      Bỏ chọn ({activeCategoryMeta.selectedCount})
                    </button>
                  )}
                </div>

                {/* Single Scrollable Options List */}
                <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 space-y-0.5">
                  {activeCategory === "phases" && (
                    filteredPhases.length > 0 ? (
                      filteredPhases.map((col) => {
                        const isChecked = selectedPhases.includes(col.phase)
                        const count = phaseCounts[col.phase] || 0
                        const statusCfg = getStatusConfig(col.phase)

                        return (
                          <label
                            key={col.id}
                            onClick={() => togglePhase(col.phase)}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer select-none transition-colors ${
                              isChecked ? "bg-slate-50/90" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                  isChecked
                                    ? "bg-slate-900 border-slate-900 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border shadow-2xs whitespace-nowrap ${statusCfg.inlineClasses.bg} ${statusCfg.inlineClasses.text} ${statusCfg.inlineClasses.border}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.inlineClasses.dot} shrink-0`} />
                                <span className="truncate">{col.title}</span>
                              </span>
                            </div>
                            <span className="text-xs font-mono text-slate-400 font-medium pl-2 shrink-0">
                              {count}
                            </span>
                          </label>
                        )
                      })
                    ) : (
                      <div className="py-10 text-center text-xs text-slate-400">
                        Không tìm thấy trạng thái phù hợp
                      </div>
                    )
                  )}

                  {activeCategory === "products" && hasProductsTab && (
                    filteredProducts.length > 0 ? (
                      filteredProducts.map((prod, pIdx) => {
                        const isChecked = selectedProducts.includes(prod)
                        const count = productCounts[prod] || 0
                        const colorDef = getProductColorDef(prod)

                        return (
                          <label
                            key={`prod-opt-${prod}-${pIdx}`}
                            onClick={() => toggleProduct(prod)}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer select-none transition-colors ${
                              isChecked ? "bg-slate-50/90" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                  isChecked
                                    ? "bg-slate-900 border-slate-900 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: (colorDef as any).dotColor || colorDef.hex }}
                              />
                              <span className="text-xs font-medium text-slate-800 truncate">
                                {prod}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-slate-400 font-medium pl-2 shrink-0">
                              {count}
                            </span>
                          </label>
                        )
                      })
                    ) : (
                      <div className="py-10 text-center text-xs text-slate-400">
                        Không tìm thấy sản phẩm phù hợp
                      </div>
                    )
                  )}

                  {activeCategory === "squads" && (
                    filteredSquads.length > 0 ? (
                      filteredSquads.map((squad, sIdx) => {
                        const isChecked = selectedSquads.includes(squad)
                        const count = squadCounts[squad] || 0

                        return (
                          <label
                            key={`sq-opt-${squad || sIdx}-${sIdx}`}
                            onClick={() => toggleSquad(squad)}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer select-none transition-colors ${
                              isChecked ? "bg-slate-50/90" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                  isChecked
                                    ? "bg-slate-900 border-slate-900 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="text-xs font-medium text-slate-800 truncate">
                                {squad}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-slate-400 font-medium pl-2 shrink-0">
                              {count}
                            </span>
                          </label>
                        )
                      })
                    ) : (
                      <div className="py-10 text-center text-xs text-slate-400">
                        Không tìm thấy squad phù hợp
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Sticky Footer: Reset & Apply CTAs Always Visible */}
            <div className="shrink-0 px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClearAll}
                disabled={activeFilterCount === 0}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
              >
                Đặt lại
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Áp dụng</span>
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
