import * as React from "react"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import { springs } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { UXRequest } from "@/data/mockData"
import {
  Layers,
  Landmark,
  ArrowLeftRight,
  TrendingUp,
  Cpu,
  MoreHorizontal,
} from "lucide-react"

/**
 * Valid Product Filter keys for UXMB Task Request Dashboard.
 * Conforms to PROJECT.md Milestone 1 Specification.
 */
export type ProductFilterKey =
  | "ALL"
  | "Lending"
  | "TransferD"
  | "Digi Invest"
  | "BaaS"
  | "Khác"

/**
 * Metadata descriptor for each product category option.
 */
export interface ProductOption {
  key: ProductFilterKey
  label: string
  sublabel: string
  icon: React.ComponentType<{ className?: string }>
  dotColor: string
}

/**
 * Standard product filter options definition.
 */
export const PRODUCT_OPTIONS: ProductOption[] = [
  {
    key: "ALL",
    label: "Tất cả",
    sublabel: "Toàn bộ bài toán",
    icon: Layers,
    dotColor: "bg-[#1057FB]",
  },
  {
    key: "Lending",
    label: "Lending",
    sublabel: "Vay & Tín dụng",
    icon: Landmark,
    dotColor: "bg-indigo-600",
  },
  {
    key: "TransferD",
    label: "TransferD",
    sublabel: "Chuyển tiền & Thẻ",
    icon: ArrowLeftRight,
    dotColor: "bg-sky-600",
  },
  {
    key: "Digi Invest",
    label: "Digi Invest",
    sublabel: "Đầu tư & Tiết kiệm",
    icon: TrendingUp,
    dotColor: "bg-amber-500",
  },
  {
    key: "BaaS",
    label: "BaaS",
    sublabel: "Open API & SDK",
    icon: Cpu,
    dotColor: "bg-cyan-500",
  },
  {
    key: "Khác",
    label: "Khác",
    sublabel: "Core banking & Tiện ích",
    icon: MoreHorizontal,
    dotColor: "bg-slate-400",
  },
]

/**
 * Evaluates whether a UXRequest matches a given ProductFilterKey.
 * Precedence-ordered matching heuristic with negative guards to prevent keyword collisions.
 * Pure synchronous function with 0ms latency.
 */
export function matchesProductCategory(
  req: UXRequest,
  filter: ProductFilterKey
): boolean {
  if (!filter || filter === "ALL") return true
  if (!req) return false

  const p = (req.product || "").toLowerCase().trim()
  const s = (
    req.squad_name ||
    req.preferred_squad ||
    req.squad ||
    ""
  ).toLowerCase().trim()
  const t = (req.title || "").toLowerCase().trim()
  const fj = (req.feature_journey || "").toLowerCase().trim()

  const isLending = (): boolean => {
    // Negative guard: Cards mentioning "thẻ tín dụng" must NOT match Lending
    if (p.includes("card") || s.includes("card") || t.includes("thẻ tín dụng")) return false
    return (
      p === "lending" ||
      p.includes("lending") ||
      s.includes("lending") ||
      s.includes("vay vốn") ||
      s.includes("vay") ||
      t.includes("vay") ||
      t.includes("thấu chi") ||
      t.includes("tín dụng") ||
      fj.includes("lending") ||
      fj.includes("vay")
    )
  }

  const isBaaS = (): boolean => {
    return (
      p === "baas" ||
      p.includes("baas") ||
      p.includes("open api") ||
      p.includes("openapi") ||
      s.includes("baas") ||
      s.includes("open api") ||
      t.includes("baas") ||
      t.includes("open banking") ||
      t.includes("open api") ||
      t.includes("sdk") ||
      fj.includes("baas") ||
      fj.includes("open banking") ||
      fj.includes("sdk")
    )
  }

  const isDigiInvest = (): boolean => {
    // Must not steal BaaS or Lending tasks
    if (isBaaS() || isLending()) return false
    return (
      p === "digi" ||
      p.includes("digi") ||
      p.includes("invest") ||
      p.includes("wealth") ||
      p.includes("saving") ||
      s.includes("wealth") ||
      s.includes("đầu tư") ||
      s.includes("saving") ||
      s.includes("tiết kiệm") ||
      s.includes("digi") ||
      fj.includes("wealth") ||
      fj.includes("invest") ||
      fj.includes("tiết kiệm") ||
      fj.includes("đầu tư") ||
      t.includes("đầu tư") ||
      t.includes("chứng khoán") ||
      t.includes("tiết kiệm") ||
      t.includes("smart saving") ||
      t.includes("trái phiếu") ||
      t.includes("chứng chỉ quỹ")
    )
  }

  const isTransferD = (): boolean => {
    // Must not steal BaaS, Lending, or Digi Invest tasks
    if (isBaaS() || isLending() || isDigiInvest()) return false
    return (
      p === "transferd" ||
      p.includes("transfer") ||
      s.includes("transfer") ||
      s.includes("chuyển tiền") ||
      s.includes("thanh toán") ||
      t.includes("chuyển tiền") ||
      t.includes("chuyển khoản") ||
      t.includes("chuyển") ||
      t.includes("vietqr") ||
      t.includes("swift") ||
      t.includes("napas") ||
      t.includes("auto-debit") ||
      t.includes("thanh toán hóa đơn") ||
      fj.includes("transfer") ||
      fj.includes("chuyển") ||
      fj.includes("payments")
    )
  }

  switch (filter) {
    case "Lending":
      return isLending()

    case "BaaS":
      return isBaaS()

    case "Digi Invest":
      return isDigiInvest()

    case "TransferD":
      return isTransferD()

    case "Khác":
      return !isLending() && !isBaaS() && !isDigiInvest() && !isTransferD()

    default:
      return true
  }
}

/**
 * Calculates item counts for each product category from an array of UXRequests.
 */
export function calculateProductCounts(
  requests: UXRequest[]
): Record<ProductFilterKey, number> {
  const counts: Record<ProductFilterKey, number> = {
    ALL: requests.length,
    Lending: 0,
    TransferD: 0,
    "Digi Invest": 0,
    BaaS: 0,
    Khác: 0,
  }

  for (const r of requests) {
    if (matchesProductCategory(r, "Lending")) counts.Lending++
    if (matchesProductCategory(r, "TransferD")) counts.TransferD++
    if (matchesProductCategory(r, "Digi Invest")) counts["Digi Invest"]++
    if (matchesProductCategory(r, "BaaS")) counts.BaaS++
    if (matchesProductCategory(r, "Khác")) counts.Khác++
  }

  return counts
}

export interface ProductFilterProps {
  /**
   * Currently active product filter key (alias for selected).
   * Default: "ALL"
   */
  value?: ProductFilterKey
  /**
   * Currently active product filter key.
   * Default: "ALL"
   */
  selected?: ProductFilterKey
  /**
   * Callback fired when user selects a product category.
   */
  onChange?: (product: ProductFilterKey) => void
  /**
   * Optional manual counts map per product key.
   * If not provided but `requests` is supplied, counts are derived automatically.
   */
  counts?: Partial<Record<ProductFilterKey, number>>
  /**
   * Optional full request dataset to automatically derive counts and verify active items.
   */
  requests?: UXRequest[]
  /**
   * Framer Motion layoutId for active pill indicator.
   * Default: "product-filter-active" (matches animate-ui guidelines).
   */
  layoutId?: string
  /**
   * Framer Motion layoutId for hover preview pill.
   * Default: "product-filter-hover"
   */
  hoverLayoutId?: string
  /**
   * Whether to display task count badges next to labels.
   * Default: true
   */
  showBadges?: boolean
  /**
   * Whether to display product color dots.
   * Default: true
   */
  showDots?: boolean
  /**
   * Optional container className override.
   */
  className?: string
  /**
   * Disabled state for entire filter group.
   */
  disabled?: boolean
}

/**
 * ProductFilter — Segmented Product Selection Pill Bar
 *
 * Implements Framer Motion sliding pill indicator (Pattern 1 from doc/motion-guidelines.md),
 * horizontal touch swipe on mobile (<768px) with no-scrollbar styling, and compact
 * command bar layout on desktop.
 */
export function ProductFilter({
  value,
  selected,
  onChange,
  counts,
  requests,
  layoutId = "product-filter-active",
  hoverLayoutId = "product-filter-hover",
  showBadges = true,
  showDots = true,
  className,
  disabled = false,
}: ProductFilterProps) {
  const currentKey = value ?? selected ?? "ALL"
  const [hoveredKey, setHoveredKey] = useState<ProductFilterKey | null>(null)
  const itemRefs = useRef<Map<ProductFilterKey, HTMLButtonElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  // Compute product counts dynamically if not passed explicitly
  const effectiveCounts = useMemo(() => {
    if (counts) return counts
    if (requests && requests.length > 0) {
      return calculateProductCounts(requests)
    }
    return null
  }, [counts, requests])

  // Auto-scroll selected button into center view on mobile touch devices
  useEffect(() => {
    const activeEl = itemRefs.current.get(currentKey)
    if (activeEl && containerRef.current) {
      const { scrollWidth, clientWidth } = containerRef.current
      if (scrollWidth > clientWidth) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        })
      }
    }
  }, [currentKey])

  // Keyboard navigation support: Left / Right Arrow keys cycle between tabs
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (disabled) return
      let nextIndex = currentIndex

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault()
        nextIndex = (currentIndex + 1) % PRODUCT_OPTIONS.length
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault()
        nextIndex =
          (currentIndex - 1 + PRODUCT_OPTIONS.length) % PRODUCT_OPTIONS.length
      } else if (e.key === "Home") {
        e.preventDefault()
        nextIndex = 0
      } else if (e.key === "End") {
        e.preventDefault()
        nextIndex = PRODUCT_OPTIONS.length - 1
      }

      if (nextIndex !== currentIndex) {
        const nextOption = PRODUCT_OPTIONS[nextIndex]
        onChange?.(nextOption.key)
        itemRefs.current.get(nextOption.key)?.focus()
      }
    },
    [disabled, onChange]
  )

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Thanh lọc sản phẩm nghiệp vụ"
      className={cn(
        "relative max-w-full overflow-x-auto no-scrollbar scroll-smooth touch-pan-x select-none",
        "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "py-0.5",
        className
      )}
    >
      <div
        role="tablist"
        aria-label="Danh sách sản phẩm"
        aria-orientation="horizontal"
        onMouseLeave={() => setHoveredKey(null)}
        className={cn(
          "inline-flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 min-w-max",
          disabled && "opacity-60 pointer-events-none"
        )}
      >
        {PRODUCT_OPTIONS.map((option, index) => {
          const isActive = currentKey === option.key
          const isHovered = hoveredKey === option.key
          const count = effectiveCounts?.[option.key]
          const Icon = option.icon

          return (
            <motion.button
              key={option.key}
              ref={(el) => {
                if (el) itemRefs.current.set(option.key, el)
                else itemRefs.current.delete(option.key)
              }}
              role="tab"
              type="button"
              id={`product-tab-${option.key}`}
              aria-selected={isActive}
              aria-controls={`product-panel-${option.key}`}
              aria-label={`${option.label}: ${count !== undefined ? `${count} bài toán` : option.sublabel}`}
              tabIndex={isActive ? 0 : -1}
              disabled={disabled}
              onClick={() => {
                if (!disabled && !isActive) {
                  onChange?.(option.key)
                }
              }}
              onMouseEnter={() => setHoveredKey(option.key)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "relative isolate h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-colors duration-150 shrink-0",
                isActive
                  ? "text-slate-900 font-semibold"
                  : "text-slate-600 hover:text-slate-900",
                disabled && "cursor-not-allowed"
              )}
            >
              {/* Lớp 1: Hover Preview Indicator (Shared Layout Lướt đón đầu chuột) */}
              {isHovered && !isActive && (
                <motion.span
                  layoutId={hoverLayoutId}
                  className="absolute inset-0 rounded-lg bg-slate-200/50 -z-10"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}

              {/* Lớp 2: Active Solid Pill (Neo vững chắc với springs.floating) */}
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-lg bg-white shadow-xs border border-slate-200/60 -z-10"
                  transition={springs.floating}
                />
              )}

              {/* Product Color Dot or Category Icon */}
              {showDots ? (
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0 transition-transform duration-150 relative z-10",
                    option.dotColor,
                    isActive ? "scale-110" : "opacity-80"
                  )}
                  aria-hidden="true"
                />
              ) : (
                <Icon
                  className={cn(
                    "w-3.5 h-3.5 shrink-0 relative z-10 transition-colors",
                    isActive ? "text-[#1057FB]" : "text-slate-400"
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Label */}
              <span className="relative z-10 tracking-tight whitespace-nowrap">
                {option.label}
              </span>

              {/* Count Badge */}
              {showBadges && count !== undefined && (
                <span
                  className={cn(
                    "ml-0.5 px-1.5 py-0.2 min-w-4 text-[10px] sm:text-[11px] font-semibold rounded-full text-center transition-colors duration-150 relative z-10",
                    isActive
                      ? "bg-slate-100 text-slate-800 border border-slate-200/60 shadow-2xs"
                      : "bg-slate-200/70 text-slate-500 group-hover:bg-slate-200"
                  )}
                >
                  {count}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export default ProductFilter
