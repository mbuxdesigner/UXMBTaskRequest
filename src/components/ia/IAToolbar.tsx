import React from "react"
import { motion } from "framer-motion"
import {
  Smartphone,
  Building2,
  Globe,
  Cpu,
  Layers,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { springs, tactileProps } from "@/lib/motion"
import { getProductColorDef } from "@/lib/colorUtils"
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

function getProductIcon(iconName: string) {
  switch (iconName) {
    case "Smartphone":
      return <Smartphone className="w-4 h-4 shrink-0" />
    case "Building2":
      return <Building2 className="w-4 h-4 shrink-0" />
    case "Globe":
      return <Globe className="w-4 h-4 shrink-0" />
    case "Cpu":
      return <Cpu className="w-4 h-4 shrink-0" />
    default:
      return <Layers className="w-4 h-4 shrink-0" />
  }
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
  // Count nodes in each product's tree
  const productNodeCounts = React.useMemo(() => {
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

  return (
    <div
      data-slot="ia-command-bar"
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-3.5 sm:px-4 py-2.5 rounded-2xl border border-slate-200/90 shadow-2xs ${className}`}
    >
      {/* Product Switcher Chips with Admin Setting Colors (Khớp Mockup Ảnh 3) */}
      <nav
        aria-label="Chọn sản phẩm IA"
        className="flex items-center gap-2 overflow-x-auto max-w-full py-0.5"
      >
        {products.map((prod) => {
          const isSelected = prod.id === selectedProductId
          const colorDef = getProductColorDef(prod.name, prod.color)
          const nodeCount = productNodeCounts[prod.id] ?? 0

          return (
            <button
              key={prod.id}
              type="button"
              data-testid={`ia-product-tab-${prod.id}`}
              onClick={() => onSelectProduct(prod.id)}
              aria-pressed={isSelected}
              style={
                isSelected
                  ? {
                      borderColor: colorDef.hex,
                      backgroundColor: `${colorDef.hex}12`,
                    }
                  : undefined
              }
              className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer select-none shrink-0 border ${
                isSelected
                  ? "shadow-2xs font-semibold text-slate-900"
                  : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
              }`}
              {...tactileProps.button}
            >
              {/* Chấm tròn màu tương ứng đã setting trong quản trị */}
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: colorDef.hex }}
              />
              <span className="font-semibold">{prod.name}</span>
              <span
                className={`text-[11px] font-normal transition-colors ${
                  isSelected ? "opacity-80 font-medium" : "text-slate-400"
                }`}
              >
                ({nodeCount})
              </span>
            </button>
          )
        })}
      </nav>

      {/* Quick Search Input with match count & navigation */}
      <div className="flex items-center gap-2">
        <motion.div
          layout
          transition={springs.snappy}
          className="group/input-group relative flex items-center rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100/80 focus-within:bg-white focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-900/5 h-8.5 sm:h-9 w-full min-w-0 sm:w-64 md:w-72 transition-all duration-200"
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
