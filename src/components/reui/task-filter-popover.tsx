import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Filter, Check, X, Search, CircleDot, Users, UserCheck, UserX } from "lucide-react"
import { getKanbanColumns, getRequestKanbanPhase } from "@/components/kanban/KanbanBoard"
import { UserAvatar, getDesignerAvatar } from "@/components/common/UserAvatar"
import { UXRequest } from "@/data/mockData"
import { getProductColorDef } from "@/lib/colorUtils"
import { getStatusConfig } from "@/config/statusConfig"
import { springs, originPopoverVariants, useAnchorOrigin } from "@/lib/motion"

export const UNASSIGNED_DESIGNER_LABEL = "Chưa phân công"

export function extractTaskDesigners(req: Pick<UXRequest, "assigned_designer" | "ux_owner">): string[] {
  const raw = String(req.assigned_designer || "").trim() || String(req.ux_owner || "").trim()
  if (!raw) return [UNASSIGNED_DESIGNER_LABEL]
  const names = raw
    .split(/[,;]+/)
    .map((n) => n.trim())
    .filter((n) => n && !/^chưa phân công$/i.test(n) && !/^đang phân công$/i.test(n))
  return names.length > 0 ? names : [UNASSIGNED_DESIGNER_LABEL]
}

export interface FilterState {
  phases: string[]
  products: string[]
  squads: string[]
  designers: string[]
}

export interface TaskFilterPopoverProps {
  requests: UXRequest[]
  selectedPhases: string[]
  selectedProducts?: string[]
  selectedSquads: string[]
  selectedDesigners?: string[]
  onPhasesChange: (phases: string[]) => void
  onProductsChange?: (products: string[]) => void
  onSquadsChange: (squads: string[]) => void
  onDesignersChange?: (designers: string[]) => void
  onClearAll: () => void
}

type FilterCategoryKey = "phases" | "squads" | "designers"

const FALLBACK_PRODUCTS = ["APP MB", "Digi invest", "MBseller", "CRM", "BaaS", "Backoffice"]

const CANONICAL_SQUAD_PRODUCT_MAP: Record<string, string> = {
  core: "APP MB",
  base: "APP MB",
  card: "APP MB",
  lending: "APP MB",
  esaving: "APP MB",
  onboarding: "APP MB",
  upsale: "APP MB",
  partnership: "APP MB",
  billing: "APP MB",
  csop: "APP MB",
  junior: "APP MB",
  vietqr: "APP MB",
  sub: "APP MB",
  "app mb": "APP MB",
  beerich: "Digi invest",
  "chứng chỉ quỹ": "Digi invest",
  transferd: "Digi invest",
  gold: "Digi invest",
  "trái phiếu": "Digi invest",
  "digi invest": "Digi invest",
  web: "MBseller",
  app: "MBseller",
  visual: "Backoffice",
  ai: "Backoffice",
  "designe system": "Backoffice",
  "design system mb": "Backoffice",
  "nội bộ": "Backoffice",
  crm: "CRM",
  api: "BaaS",
  baas: "BaaS",
  "mini app/ web view": "BaaS",
}

function normalizeProductName(raw?: string): string {
  const prod = (raw && raw.trim()) || "Khác"
  const pLower = prod.toLowerCase().replace(/[\s\-_]+/g, "")
  if (pLower === "appmb" || pLower === "appmbbank" || pLower === "mbapp") return "APP MB"
  if (pLower === "mbseller") return "MBseller"
  if (pLower === "digiinvest") return "Digi invest"
  return prod
}

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
  selectedDesigners = [],
  onPhasesChange,
  onProductsChange,
  onSquadsChange,
  onDesignersChange,
  onClearAll,
}: TaskFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<FilterCategoryKey>("phases")
  const [searchQuery, setSearchQuery] = useState("")
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number }>({ top: 0, right: 16 })

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

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return
    const rect = triggerRef.current.getBoundingClientRect()
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    const right = Math.max(12, Math.min(viewportW - 12, viewportW - rect.right))
    const top = Math.min(rect.bottom + 8, Math.max(12, viewportH - 180))
    setPopoverPos({ top, right })
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) return
    updatePopoverPosition()
  }, [isOpen, updatePopoverPosition])

  // Close when clicking outside (checking both trigger and portaled popover) or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const inTrigger = containerRef.current?.contains(target)
      const inPopover = popoverContentRef.current?.contains(target)
      if (!inTrigger && !inPopover) {
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
      window.addEventListener("resize", updatePopoverPosition)
      window.addEventListener("scroll", updatePopoverPosition, true)
    } else {
      setSearchQuery("")
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", updatePopoverPosition)
      window.removeEventListener("scroll", updatePopoverPosition, true)
    }
  }, [isOpen, updatePopoverPosition])

  const handleSelectCategory = (key: FilterCategoryKey) => {
    setActiveCategory(key)
    setSearchQuery("")
  }

  // 1. Dynamic columns based on latest admin UX phases
  const kanbanColumns = useMemo(() => getKanbanColumns(), [requests])

  const phaseCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    kanbanColumns.forEach((col) => {
      counts[col.phase] = requests.filter((r) => getRequestKanbanPhase(r) === col.phase).length
    })
    return counts
  }, [requests, kanbanColumns])

  // 2. Unique Products & count (shown as top chips inside Squad tab)
  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    requests.forEach((r) => {
      const prod = normalizeProductName(r.product)
      counts[prod] = (counts[prod] || 0) + 1
    })
    return counts
  }, [requests])

  const availableProducts = useMemo(() => {
    const keyMap = new Map<string, string>()
    const orderMap = new Map<string, number>()

    try {
      const raw = localStorage.getItem("mbbank_admin_products")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any, idx: number) => {
            const name = String(p?.name || "").trim()
            if (name) {
              const norm = normalizeProductName(name)
              const lower = norm.toLowerCase()
              orderMap.set(lower, idx)
              if (!keyMap.has(lower)) keyMap.set(lower, norm)
            }
          })
        }
      }
    } catch {}

    Object.keys(productCounts).forEach((prod) => {
      const lower = prod.toLowerCase()
      if (!keyMap.has(lower)) keyMap.set(lower, prod)
    })

    if (keyMap.size === 0) {
      FALLBACK_PRODUCTS.forEach((prod, idx) => {
        const lower = prod.toLowerCase()
        keyMap.set(lower, prod)
        orderMap.set(lower, idx)
      })
    }

    return Array.from(keyMap.values()).sort((a, b) => {
      const idxA = orderMap.has(a.toLowerCase()) ? orderMap.get(a.toLowerCase())! : 9999
      const idxB = orderMap.has(b.toLowerCase()) ? orderMap.get(b.toLowerCase())! : 9999
      if (idxA !== idxB) return idxA - idxB
      return a.localeCompare(b, "vi")
    })
  }, [productCounts])

  // 3. Squads + Product-to-Squad relationship mapping
  const { squadCounts, squadToProducts } = useMemo(() => {
    const counts: Record<string, number> = {}
    const map: Record<string, Set<string>> = {}

    const addMapping = (squadName: string, productName?: string) => {
      if (!squadName || squadName === "Chưa phân công" || squadName === "Triage Squad") return
      if (!map[squadName]) map[squadName] = new Set()
      if (productName) {
        map[squadName].add(normalizeProductName(productName))
      }
    }

    try {
      const raw = localStorage.getItem("mbbank_admin_squads")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          parsed.forEach((s: any) => {
            const name = String(s?.name || s?.squad_name || "").trim()
            const prod = String(s?.productName || s?.product_name || "").trim()
            if (name) addMapping(name, prod || CANONICAL_SQUAD_PRODUCT_MAP[name.toLowerCase()])
          })
        }
      }
    } catch {}

    requests.forEach((r) => {
      const squad = (r.squad_name && r.squad_name.trim()) || (r.preferred_squad && r.preferred_squad.trim()) || ""
      if (squad && squad !== "Chưa phân công" && squad !== "Triage Squad") {
        counts[squad] = (counts[squad] || 0) + 1
        addMapping(squad, r.product || CANONICAL_SQUAD_PRODUCT_MAP[squad.toLowerCase()])
      }
    })

    return { squadCounts: counts, squadToProducts: map }
  }, [requests])

  const availableSquads = useMemo(() => {
    const keyMap = new Map<string, string>()
    const orderMap = new Map<string, number>()

    try {
      const raw = localStorage.getItem("mbbank_admin_squads")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          parsed.forEach((s: any, idx: number) => {
            const name = String(s?.name || s?.squad_name || "").trim()
            if (name) {
              const lower = name.toLowerCase()
              orderMap.set(lower, idx)
              if (!keyMap.has(lower)) keyMap.set(lower, name)
            }
          })
        }
      }
    } catch {}

    Object.keys(squadCounts).forEach((sq) => {
      const lower = sq.toLowerCase()
      if (!keyMap.has(lower)) keyMap.set(lower, sq)
    })

    return Array.from(keyMap.values()).sort((a, b) => {
      const idxA = orderMap.has(a.toLowerCase()) ? orderMap.get(a.toLowerCase())! : 9999
      const idxB = orderMap.has(b.toLowerCase()) ? orderMap.get(b.toLowerCase())! : 9999
      if (idxA !== idxB) return idxA - idxB
      return a.localeCompare(b, "vi")
    })
  }, [squadCounts])

  // Helper: get primary product(s) for a squad
  const getSquadProducts = useCallback(
    (squad: string): string[] => {
      const mapped = squadToProducts[squad]
      if (mapped && mapped.size > 0) return Array.from(mapped)
      const fallback = CANONICAL_SQUAD_PRODUCT_MAP[squad.toLowerCase()]
      return fallback ? [fallback] : []
    },
    [squadToProducts]
  )

  // Squads narrowed by selected Product chips (when any Product chip is active)
  const squadsForSelectedProducts = useMemo(() => {
    if (selectedProducts.length === 0) return availableSquads
    const selectedSet = new Set(selectedProducts.map((p) => p.toLowerCase()))
    return availableSquads.filter((squad) => {
      const prods = getSquadProducts(squad)
      return prods.some((p) => selectedSet.has(p.toLowerCase()))
    })
  }, [availableSquads, selectedProducts, getSquadProducts])

  // Count tasks per squad scoped to selected products when product chips are active
  const scopedSquadCounts = useMemo(() => {
    if (selectedProducts.length === 0) return squadCounts
    const selectedSet = new Set(selectedProducts.map((p) => p.toLowerCase()))
    const counts: Record<string, number> = {}
    requests.forEach((r) => {
      const prod = normalizeProductName(r.product)
      if (!selectedSet.has(prod.toLowerCase())) return
      const squad = (r.squad_name && r.squad_name.trim()) || (r.preferred_squad && r.preferred_squad.trim()) || ""
      if (squad && squad !== "Chưa phân công" && squad !== "Triage Squad") {
        counts[squad] = (counts[squad] || 0) + 1
      }
    })
    return counts
  }, [requests, selectedProducts, squadCounts])

  // 4. Unique Designers & count
  const designerCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    requests.forEach((r) => {
      const assignees = extractTaskDesigners(r)
      assignees.forEach((name) => {
        counts[name] = (counts[name] || 0) + 1
      })
    })
    return counts
  }, [requests])

  const availableDesigners = useMemo(() => {
    const keyMap = new Map<string, string>()

    Object.keys(designerCounts).forEach((name) => {
      keyMap.set(name.toLowerCase(), name)
    })

    try {
      const raw = localStorage.getItem("mbbank_admin_users")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          parsed.forEach((u: any) => {
            const role = String(u?.role || "").toLowerCase()
            const status = String(u?.status || "Active").toLowerCase()
            if (status === "inactive") return
            if (role.includes("designer") || role.includes("owner") || role.includes("admin")) {
              const name = String(u?.displayName || u?.name || "").trim()
              if (name && !keyMap.has(name.toLowerCase())) {
                keyMap.set(name.toLowerCase(), name)
              }
            }
          })
        }
      }
    } catch {}

    const list = Array.from(keyMap.values()).filter((n) => n !== UNASSIGNED_DESIGNER_LABEL)
    list.sort((a, b) => {
      const countDiff = (designerCounts[b] || 0) - (designerCounts[a] || 0)
      if (countDiff !== 0) return countDiff
      return a.localeCompare(b, "vi")
    })

    if (designerCounts[UNASSIGNED_DESIGNER_LABEL] > 0 || requests.length === 0) {
      list.push(UNASSIGNED_DESIGNER_LABEL)
    }

    return list
  }, [designerCounts, requests.length])

  const hasProductsControl = Boolean(onProductsChange)
  const hasDesignersTab = Boolean(onDesignersChange)

  useEffect(() => {
    if (activeCategory === "designers" && !hasDesignersTab) setActiveCategory("phases")
  }, [activeCategory, hasDesignersTab])

  const squadTabSelectedCount = selectedProducts.length + selectedSquads.length

  const categories = useMemo(() => {
    const list: Array<{
      key: FilterCategoryKey
      label: string
      icon: React.ComponentType<{ className?: string }>
      selectedCount: number
      totalCount: number
      searchPlaceholder: string
    }> = [
      {
        key: "phases",
        label: "Trạng thái",
        icon: CircleDot,
        selectedCount: selectedPhases.length,
        totalCount: kanbanColumns.length,
        searchPlaceholder: "Tìm trạng thái...",
      },
      {
        key: "squads",
        label: "Squad",
        icon: Users,
        selectedCount: squadTabSelectedCount,
        totalCount: squadsForSelectedProducts.length,
        searchPlaceholder: "Tìm squad...",
      },
    ]

    if (hasDesignersTab) {
      list.push({
        key: "designers",
        label: "Designer",
        icon: UserCheck,
        selectedCount: selectedDesigners.length,
        totalCount: availableDesigners.length,
        searchPlaceholder: "Tìm designer...",
      })
    }

    return list
  }, [
    hasDesignersTab,
    selectedPhases.length,
    squadTabSelectedCount,
    selectedDesigners.length,
    kanbanColumns.length,
    squadsForSelectedProducts.length,
    availableDesigners.length,
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
    const nextProducts = selectedProducts.includes(prod)
      ? selectedProducts.filter((p) => p !== prod)
      : [...selectedProducts, prod]
    onProductsChange(nextProducts)

    // Keep selectedSquads consistent with remaining selected products
    if (nextProducts.length > 0 && selectedSquads.length > 0) {
      const allowedProds = new Set(nextProducts.map((p) => p.toLowerCase()))
      const validSquads = selectedSquads.filter((sq) =>
        getSquadProducts(sq).some((p) => allowedProds.has(p.toLowerCase()))
      )
      if (validSquads.length !== selectedSquads.length) {
        onSquadsChange(validSquads)
      }
    }
  }

  const toggleSquad = (squad: string) => {
    if (selectedSquads.includes(squad)) {
      onSquadsChange(selectedSquads.filter((s) => s !== squad))
    } else {
      onSquadsChange([...selectedSquads, squad])
    }
  }

  const toggleDesigner = (designer: string) => {
    if (!onDesignersChange) return
    if (selectedDesigners.includes(designer)) {
      onDesignersChange(selectedDesigners.filter((d) => d !== designer))
    } else {
      onDesignersChange([...selectedDesigners, designer])
    }
  }

  const clearCurrentCategory = () => {
    if (activeCategory === "phases") {
      onPhasesChange([])
    } else if (activeCategory === "squads") {
      if (onProductsChange) onProductsChange([])
      onSquadsChange([])
    } else if (activeCategory === "designers" && onDesignersChange) {
      onDesignersChange([])
    }
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

  const filteredSquads = useMemo(() => {
    if (!normalizedQuery) return squadsForSelectedProducts
    return squadsForSelectedProducts.filter((squad) => {
      if (normalizeSearchText(squad).includes(normalizedQuery)) return true
      return getSquadProducts(squad).some((p) => normalizeSearchText(p).includes(normalizedQuery))
    })
  }, [squadsForSelectedProducts, normalizedQuery, getSquadProducts])

  const filteredDesigners = useMemo(() => {
    if (!normalizedQuery) return availableDesigners
    return availableDesigners.filter((d) => normalizeSearchText(d).includes(normalizedQuery))
  }, [availableDesigners, normalizedQuery])

  const activeFilterCount =
    selectedPhases.length +
    selectedProducts.length +
    selectedSquads.length +
    selectedDesigners.length

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

      {/* Master-Detail 2-Column Popover Card portaled to document.body (immune to Gantt/Table sticky z-index) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={popoverContentRef}
                variants={originPopoverVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={springs.popover}
                style={{
                  transformOrigin,
                  top: popoverPos.top,
                  right: popoverPos.right,
                }}
                className="fixed w-[min(524px,calc(100vw-2rem))] max-h-[min(480px,calc(100vh-120px))] flex flex-col overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xl z-[9999]"
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
                  <div className="sm:w-[152px] shrink-0 bg-slate-50/80 border-b sm:border-b-0 sm:border-r border-slate-100 p-2 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible">
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

                  {/* Right Options Pane (Search + Optional Product Chips + Single Scroll Container) */}
                  <div className="flex-1 min-w-0 flex flex-col min-h-0 h-[312px] sm:h-[340px]">
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

                    {/* Product Chips Bar inside Squad Tab */}
                    {activeCategory === "squads" && hasProductsControl && availableProducts.length > 0 && (
                      <div className="shrink-0 px-3 py-2 border-b border-slate-100 bg-slate-50/50 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Sản phẩm
                          </span>
                          {selectedProducts.length > 0 && (
                            <button
                              type="button"
                              onClick={() => onProductsChange && onProductsChange([])}
                              className="text-[11px] font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                            >
                              Tất cả sản phẩm
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => onProductsChange && onProductsChange([])}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer select-none ${
                              selectedProducts.length === 0
                                ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                            }`}
                          >
                            <span>Tất cả</span>
                          </button>
                          {availableProducts.map((prod) => {
                            const isSelected = selectedProducts.includes(prod)
                            const count = productCounts[prod] || 0
                            const colorDef = getProductColorDef(prod)
                            return (
                              <button
                                key={`chip-prod-${prod}`}
                                type="button"
                                onClick={() => toggleProduct(prod)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer select-none ${
                                  isSelected
                                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: isSelected
                                      ? "#ffffff"
                                      : (colorDef as any).dotColor || colorDef.hex,
                                  }}
                                />
                                <span>{prod}</span>
                                <span
                                  className={`text-[10px] font-mono ${
                                    isSelected ? "text-white/75" : "text-slate-400"
                                  }`}
                                >
                                  {count}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

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

                      {activeCategory === "squads" && (
                        filteredSquads.length > 0 ? (
                          filteredSquads.map((squad, sIdx) => {
                            const isChecked = selectedSquads.includes(squad)
                            const count = scopedSquadCounts[squad] || 0
                            const prods = getSquadProducts(squad)
                            const primaryProd = prods[0]
                            const colorDef = primaryProd ? getProductColorDef(primaryProd) : null

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
                                  {selectedProducts.length !== 1 && primaryProd && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100/90 text-[10px] font-medium text-slate-500 shrink-0">
                                      <span
                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{
                                          backgroundColor:
                                            (colorDef as any)?.dotColor || colorDef?.hex || "#94a3b8",
                                        }}
                                      />
                                      <span>{primaryProd}</span>
                                    </span>
                                  )}
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

                      {activeCategory === "designers" && hasDesignersTab && (
                        filteredDesigners.length > 0 ? (
                          filteredDesigners.map((designer, dIdx) => {
                            const isChecked = selectedDesigners.includes(designer)
                            const count = designerCounts[designer] || 0
                            const isUnassigned = designer === UNASSIGNED_DESIGNER_LABEL
                            const avatarUrl = isUnassigned ? undefined : getDesignerAvatar(designer)

                            return (
                              <label
                                key={`des-opt-${designer}-${dIdx}`}
                                onClick={() => toggleDesigner(designer)}
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
                                  {isUnassigned ? (
                                    <span className="w-5 h-5 rounded-full bg-slate-100 border border-dashed border-slate-300 text-slate-400 flex items-center justify-center shrink-0">
                                      <UserX className="w-3 h-3" />
                                    </span>
                                  ) : (
                                    <UserAvatar
                                      name={designer}
                                      avatarUrl={avatarUrl}
                                      size="xs"
                                      className="w-5 h-5 shrink-0"
                                      showBorder={false}
                                    />
                                  )}
                                  <span
                                    className={`text-xs truncate ${
                                      isUnassigned ? "text-slate-500 italic font-normal" : "font-medium text-slate-800"
                                    }`}
                                  >
                                    {designer}
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
                            Không tìm thấy designer phù hợp
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
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}
