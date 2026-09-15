import React from "react"
import { motion } from "framer-motion"
import {
  Smartphone,
  Building2,
  Globe,
  Cpu,
  Layers,
  Layout,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  GitFork,
} from "lucide-react"
import { springs, tactileProps } from "@/lib/motion"
import { IAProductInfo } from "@/types/ia"

interface IAToolbarProps {
  products: IAProductInfo[]
  selectedProductId: string
  onSelectProduct: (id: string) => void
  metrics: { featureCount: number; screenCount: number }
  searchQuery: string
  onSearchChange: (q: string) => void
  matchCount: number
  currentMatchIndex?: number
  onNextMatch?: () => void
  onPrevMatch?: () => void
  onResetToDefault: () => void
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
  metrics,
  searchQuery,
  onSearchChange,
  matchCount,
  currentMatchIndex = 0,
  onNextMatch,
  onPrevMatch,
  onResetToDefault,
}: IAToolbarProps) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs">
      {/* Left: Product Selector Tabs with Floating Active Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 pr-2 border-r-0 sm:border-r border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              Kiến trúc Thông tin
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Information Architecture (IA) Mindmap
            </p>
          </div>
        </div>

        {/* Product Switcher Pills */}
        <nav
          aria-label="Chọn sản phẩm IA"
          className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 overflow-x-auto"
        >
          {products.map((prod) => {
            const isSelected = prod.id === selectedProductId
            return (
              <button
                key={prod.id}
                type="button"
                data-testid={`ia-product-tab-${prod.id}`}
                onClick={() => onSelectProduct(prod.id)}
                aria-pressed={isSelected}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none shrink-0 ${
                  isSelected
                    ? "text-slate-900 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/40"
                }`}
                {...tactileProps.button}
              >
                {isSelected && (
                  <motion.div
                    layoutId="ia-product-active-pill"
                    className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10 border border-slate-200/60"
                    transition={springs.floating}
                  />
                )}
                {getProductIcon(prod.iconName)}
                <span>{prod.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Right: Dynamic Metric Badge, Quick Search Bar & Reset to Default */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Dynamic Metrics Badge: [X luồng tính năng · Y màn hình] */}
        <div
          data-testid="ia-metrics-badge"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/60 text-blue-700 text-xs font-semibold shadow-2xs shrink-0"
        >
          <Layout className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>
            {metrics.featureCount} luồng tính năng · {metrics.screenCount} màn hình
          </span>
        </div>

        {/* Quick Search Bar with Match Badge & Navigation */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            data-testid="ia-search-input"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm màn hình, task, designer..."
            className="pl-8 pr-16 py-1.5 w-48 sm:w-64 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />

          {searchQuery && (
            <div className="absolute right-2 flex items-center gap-1">
              {matchCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 font-bold font-mono">
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
        </div>

        {/* Reset to Default Button */}
        <button
          type="button"
          data-testid="ia-reset-default-btn"
          onClick={onResetToDefault}
          title="Khôi phục cấu trúc cây mặc định"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold border border-slate-200/60 transition-colors cursor-pointer shrink-0"
          {...tactileProps.button}
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Khôi phục mặc định</span>
        </button>
      </div>
    </header>
  )
}
