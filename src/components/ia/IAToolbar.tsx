import React, { useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { springs } from "@/lib/motion"
import { getProductColorDef } from "@/lib/colorUtils"
import { cn } from "@/lib/utils"
import { IANode, IAProductInfo } from "@/types/ia"

interface IAToolbarProps {
  products: IAProductInfo[]
  selectedProductId: string
  onSelectProduct: (id: string) => void
  metrics?: { featureCount: number; screenCount: number }
  searchQuery: string
  onSearchChange: (q: string) => void
  matchCount: number
  currentMatchIndex?: number
  onNextMatch?: () => void
  onPrevMatch?: () => void
  onResetToDefault?: () => void
  readOnly?: boolean
  className?: string
  trees?: Record<string, IANode>
}

export default function IAToolbar({
  products,
  selectedProductId,
  onSelectProduct,
  searchQuery,
  onSearchChange,
  matchCount,
  currentMatchIndex = 0,
  onNextMatch,
  onPrevMatch,
  className = "",
  trees,
}: IAToolbarProps) {
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null)

  // Count nodes in each product's tree
  const productNodeCounts = useMemo(() => {
    const map: Record<string, number> = {}
    if (!trees) return map

    function countNodes(root: IANode): number {
      let count = 0
      function dfs(n: IANode) {
        count++
        if (n.children) {
          for (const c of n.children) dfs(c)
        }
      }
      dfs(root)
      if (root.siblingRoots) {
        for (const sr of root.siblingRoots) dfs(sr)
      }
      return count
    }

    for (const prod of products) {
      const tree =
        trees[prod.id] ||
        (prod.code === "APP_MB" ? trees["app-mbbank"] : prod.code === "BIZ_MB" ? trees["biz-mb"] : undefined)
      if (tree) {
        map[prod.id] = countNodes(tree)
      } else {
        map[prod.id] = 0
      }
    }
    return map
  }, [products, trees])

  // Total nodes across all products
  const totalNodeCount = useMemo(() => {
    return Object.values(productNodeCounts).reduce((sum, c) => sum + c, 0)
  }, [productNodeCounts])

  return (
    <div
      data-slot="ia-command-bar"
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none",
        className
      )}
    >
      {/* Product Switcher Pills - Đồng bộ thiết kế 100% với trang Overview */}
      <div
        role="tablist"
        aria-label="Lọc sơ đồ IA theo sản phẩm"
        aria-orientation="horizontal"
        onMouseLeave={() => setHoveredProduct(null)}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 select-none min-w-0"
      >
        {/* Tab Tất cả */}
        <button
          role="tab"
          type="button"
          id="ia-product-tab-all"
          data-testid="ia-product-tab-all"
          aria-selected={selectedProductId === "all"}
          tabIndex={selectedProductId === "all" ? 0 : -1}
          onClick={() => onSelectProduct("all")}
          onMouseEnter={() => setHoveredProduct("all")}
          className={cn(
            "relative isolate px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-2 border select-none",
            selectedProductId === "all"
              ? "text-white font-semibold border-transparent shadow-xs"
              : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
          )}
        >
          {selectedProductId === "all" && (
            <motion.div
              layoutId="ia-product-pill"
              className="absolute inset-0 bg-slate-900 rounded-xl shadow-xs -z-10"
              transition={springs.indicator}
            />
          )}
          {hoveredProduct === "all" && selectedProductId !== "all" && (
            <motion.div
              layoutId="ia-product-hover-pill"
              className="absolute inset-0 bg-slate-100 rounded-xl -z-10"
              transition={springs.snappy}
            />
          )}
          <span className="relative z-10">Tất cả</span>
          <span
            className={cn(
              "relative z-10 px-1.5 py-0.2 rounded-full text-[10px] font-semibold font-mono tabular-nums transition-colors",
              selectedProductId === "all"
                ? "bg-slate-800 text-slate-200"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {totalNodeCount}
          </span>
        </button>

        {/* Từng Tab Sản phẩm */}
        {products.map((prod, index) => {
          const isSelected = selectedProductId === prod.id || (selectedProductId === "app-mbbank" && prod.code === "APP_MB")
          const isHovered = hoveredProduct === prod.id
          const colorDef = getProductColorDef(prod.name, prod.color)
          const nodeCount = productNodeCounts[prod.id] ?? 0

          return (
            <button
              key={prod.id || prod.code || prod.name || `prod-${index}`}
              role="tab"
              type="button"
              id={`ia-product-tab-${prod.id}`}
              data-testid={`ia-product-tab-${prod.id}`}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelectProduct(prod.id)}
              onMouseEnter={() => setHoveredProduct(prod.id)}
              className={cn(
                "relative isolate px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-2 border select-none",
                isSelected
                  ? "text-white font-semibold border-transparent shadow-xs"
                  : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="ia-product-pill"
                  className="absolute inset-0 bg-slate-900 rounded-xl shadow-xs -z-10"
                  transition={springs.indicator}
                />
              )}
              {isHovered && !isSelected && (
                <motion.div
                  layoutId="ia-product-hover-pill"
                  className="absolute inset-0 bg-slate-100 rounded-xl -z-10"
                  transition={springs.snappy}
                />
              )}
              <span className="relative z-10">{prod.name}</span>
              <span
                className={cn(
                  "relative z-10 px-1.5 py-0.2 rounded-full text-[10px] font-semibold font-mono tabular-nums transition-colors",
                  isSelected
                    ? "bg-slate-800 text-slate-200"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                {nodeCount}
              </span>
            </button>
          )
        })}
      </div>

      {/* Quick Search Input with match count & navigation */}
      <div className="flex items-center gap-2 shrink-0">
        <motion.div
          layout
          transition={springs.snappy}
          className="group/input-group relative flex items-center rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-900/5 h-8.5 sm:h-9 w-full min-w-0 sm:w-64 md:w-72 shadow-2xs transition-all duration-200"
        >
          <div className="flex items-center justify-center pl-3 text-slate-400">
            <Search className="w-3.5 h-3.5 shrink-0" />
          </div>
          <input
            type="text"
            data-testid="ia-search-input"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm màn hình, task, designer..."
            aria-label="Tìm kiếm trên sơ đồ IA"
            className="h-full w-full border-0 bg-transparent px-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <div className="flex items-center gap-1 pr-2">
              {matchCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 text-[#1057FB] font-bold font-mono">
                  {currentMatchIndex + 1}/{matchCount}
                </span>
              )}

              {matchCount > 0 && (
                <div className="flex items-center">
                  <button
                    type="button"
                    title="Kết quả trước"
                    onClick={onPrevMatch}
                    className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Kết quả kế tiếp"
                    onClick={onNextMatch}
                    className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              )}

              <button
                type="button"
                data-testid="ia-search-clear-btn"
                onClick={() => onSearchChange("")}
                title="Xóa tìm kiếm"
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

