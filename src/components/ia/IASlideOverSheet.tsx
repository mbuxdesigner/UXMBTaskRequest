import React, { useState, useMemo, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Search,
  Plus,
  SlidersHorizontal,
  CloudUpload,
  CloudDownload,
  FileCode,
  Copy,
  RotateCcw,
  Sparkles,
  Building2,
  Layers,
  GitFork,
  Smartphone,
  Layout,
  PanelBottom,
  Bell,
  Globe,
  PanelTop,
  GripVertical,
  Check,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  Sliders,
} from "lucide-react"
import { IANode, IATier, IATouchpointType, IATierDimensionSettings, IAProductInfo } from "@/types/ia"
import { QuickAddNodeType } from "./IAQuickAddSidebar"
import { Tooltip } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { tactileProps } from "@/lib/motion"
import { IADockTool } from "./IAVerticalDock"
import { parseAndNormalizeIaJson } from "./IAJsonImportModal"
import { DEFAULT_TIER_DIMENSIONS } from "./IASettingsModal"
import { SyncProgressStatus } from "@/components/reui/c-progress-4"
import { Slider } from "@/components/ui/slider"

export interface IASlideOverSheetProps {
  activeTool: IADockTool
  onClose: () => void
  selectedNode: IANode | null
  activeTree: IANode
  activeProduct: IAProductInfo
  onAddNode: (item: QuickAddNodeType) => void
  tierDimensions: IATierDimensionSettings
  onSaveSettings: (settings: IATierDimensionSettings) => void
  onSyncCloud: () => Promise<void>
  onPullCloud: () => Promise<void>
  isSyncingCloud: boolean
  isPullingCloud: boolean
  onImportJson: (json: IANode | IANode[]) => void
  onCopyJson: () => void
}

export const CATEGORY_TABS = [
  { id: "all", label: "Tất cả (4)" },
  { id: "1", label: "Lv1" },
  { id: "2", label: "Lv2" },
  { id: "3", label: "Lv3" },
  { id: "4", label: "Lv4" },
] as const

export interface NodeTemplateItem extends QuickAddNodeType {
  title: string
  code: string
  keywords: string[]
}

export const NODE_TEMPLATES: NodeTemplateItem[] = [
  // CẤP 1 (ROOT)
  {
    id: "tier-1-root",
    tier: 1,
    title: "Gốc sản phẩm (Root)",
    name: "Gốc sản phẩm (Root)",
    code: "ROOT_PROD",
    keywords: ["root", "product", "goc", "san pham", "tier 1", "lv1"],
    description: "Tạo sản phẩm gốc cấp 1 (Root) độc lập",
    colorHex: "#1057FB",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Building2,
  },
  // CẤP 2 (PHÂN HỆ / MODULE)
  {
    id: "tier-2-module",
    tier: 2,
    title: "Phân hệ / Module nghiệp vụ",
    name: "Phân hệ / Module nghiệp vụ",
    code: "MOD_CORE",
    keywords: ["core", "module", "phan he", "domain", "tier 2", "lv2"],
    description: "Nhóm phân hệ, cụm nghiệp vụ lớn trong sản phẩm",
    colorHex: "#6366f1",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Layers,
  },
  // CẤP 3 (HÀNH TRÌNH / JOURNEY)
  {
    id: "tier-3-journey",
    tier: 3,
    title: "Luồng tính năng chi tiết",
    name: "Luồng tính năng chi tiết",
    code: "JRN_FEAT",
    keywords: ["feature", "flow", "journey", "luong", "tier 3", "lv3"],
    description: "Chuỗi hành trình người dùng xuyên suốt tính năng",
    colorHex: "#8b5cf6",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    icon: GitFork,
  },
  // CẤP 4 (MÀN HÌNH & ĐIỂM CHẠM)
  {
    id: "tier-4-screen",
    tier: 4,
    title: "Màn hình / Điểm chạm cuối",
    name: "Màn hình / Điểm chạm",
    code: "SCR_FINAL",
    keywords: ["screen", "man hinh", "touchpoint", "action", "modal", "tier 4", "lv4"],
    description: "Giao diện màn hình, popup hoặc thao tác cuối của luồng",
    touchpointType: "screen",
    colorHex: "#059669",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Smartphone,
  },
]

const SAMPLE_JSON_EXPORT = {
  name: "App MBBank 2026",
  code: "APP_MB",
  description: "Ứng dụng Ngân hàng số MBBank Khách hàng Cá nhân",
  children: [
    {
      name: "Thanh toán & Chuyển tiền",
      squad: "Payments & Transfer",
      children: [
        {
          name: "Chuyển tiền nhanh Napas 24/7",
          isCriticalPath: true,
          children: [
            { name: "Màn hình nhập thông tin chuyển khoản", touchpointType: "screen" },
            { name: "Hộp thoại xác nhận hạn mức & phí", touchpointType: "modal" },
            { name: "Xác thực bảo mật Face / Soft OTP", touchpointType: "modal" },
            { name: "Màn hình kết quả giao dịch thành công", touchpointType: "screen" },
          ],
        },
      ],
    },
  ],
}

export default function IASlideOverSheet({
  activeTool,
  onClose,
  selectedNode,
  activeTree,
  activeProduct,
  onAddNode,
  tierDimensions,
  onSaveSettings,
  onSyncCloud,
  onPullCloud,
  isSyncingCloud,
  isPullingCloud,
  onImportJson,
  onCopyJson,
}: IASlideOverSheetProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("all")

  // Settings Panel state
  const [settingsLv1Width, setSettingsLv1Width] = useState<number>(tierDimensions[1]?.width || 320)
  const [settingsLv2Width, setSettingsLv2Width] = useState<number>(tierDimensions[2]?.width || 280)
  const [settingsLv3Width, setSettingsLv3Width] = useState<number>(tierDimensions[3]?.width || 260)
  const [settingsLv4Width, setSettingsLv4Width] = useState<number>(tierDimensions[4]?.width || 250)
  const [settingsColumnGap, setSettingsColumnGap] = useState<number>(tierDimensions.columnGap || 110)

  // JSON Panel state
  const [rawJsonText, setRawJsonText] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsedPreview, setParsedPreview] = useState<{ nodeCount: number; tier1Count: number } | null>(null)

  // Sync settings state when tierDimensions change
  useEffect(() => {
    if (tierDimensions) {
      setSettingsLv1Width(tierDimensions[1]?.width || 320)
      setSettingsLv2Width(tierDimensions[2]?.width || 280)
      setSettingsLv3Width(tierDimensions[3]?.width || 260)
      setSettingsLv4Width(tierDimensions[4]?.width || 250)
      setSettingsColumnGap(tierDimensions.columnGap || 110)
    }
  }, [tierDimensions])

  // Escape key handler to close sheet without deselecting canvas node
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  // Outside-click listener: dismiss sheet when clicking canvas or outside sheet & dock
  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      const target = e.target as HTMLElement | null
      if (!target) return

      const isInsideSheet = target.closest("[data-testid='ia-slide-over-sheet']")
      const isInsideDock = target.closest("[data-testid='ia-vertical-dock']")

      if (!isInsideSheet && !isInsideDock) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleGlobalMouseDown)
    return () => document.removeEventListener("mousedown", handleGlobalMouseDown)
  }, [onClose])

  // Title for sheet header
  const sheetTitle = useMemo(() => {
    switch (activeTool) {
      case "add-node":
        return "Thêm Node vào sơ đồ"
      case "settings":
        return "Cài đặt thông số sơ đồ"
      case "cloud":
        return "Đồng bộ Google Sheets Cloud"
      case "json":
        return "Dữ liệu & Quản lý JSON"
      default:
        return "Bảng công cụ IA"
    }
  }, [activeTool])

  // Filter templates
  const filteredTemplates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return NODE_TEMPLATES.filter((item) => {
      // Tier filter
      if (activeCategoryTab !== "all" && String(item.tier) !== String(activeCategoryTab)) {
        return false
      }
      if (!q) return true
      const matchTitle = item.title.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
      const matchCode = (item.code || "").toLowerCase().includes(q)
      const matchKw = (item.keywords || []).some((k) => k.toLowerCase().includes(q))
      const matchDesc = (item.description || "").toLowerCase().includes(q)
      return matchTitle || matchCode || matchKw || matchDesc
    })
  }, [searchQuery, activeCategoryTab])

  // Lv4 selection context logic
  const isSelectedNodeLv4 = selectedNode?.tier === 4
  const canAddChild = selectedNode ? selectedNode.tier < 4 : false

  // Apply settings preset
  const handleApplyPreset = (preset: "default" | "spacious" | "compact") => {
    if (preset === "default") {
      setSettingsLv1Width(320)
      setSettingsLv2Width(280)
      setSettingsLv3Width(260)
      setSettingsLv4Width(250)
      setSettingsColumnGap(110)
      onSaveSettings({
        1: { width: 320, height: tierDimensions[1].height },
        2: { width: 280, height: tierDimensions[2].height },
        3: { width: 260, height: tierDimensions[3].height },
        4: { width: 250, height: tierDimensions[4].height },
        columnGap: 110,
        verticalGapJourney: tierDimensions.verticalGapJourney,
        verticalGapScreen: tierDimensions.verticalGapScreen,
      })
    } else if (preset === "spacious") {
      setSettingsLv1Width(360)
      setSettingsLv2Width(310)
      setSettingsLv3Width(285)
      setSettingsLv4Width(265)
      setSettingsColumnGap(140)
      onSaveSettings({
        1: { width: 360, height: tierDimensions[1].height },
        2: { width: 310, height: tierDimensions[2].height },
        3: { width: 285, height: tierDimensions[3].height },
        4: { width: 265, height: tierDimensions[4].height },
        columnGap: 140,
        verticalGapJourney: tierDimensions.verticalGapJourney,
        verticalGapScreen: tierDimensions.verticalGapScreen,
      })
    } else if (preset === "compact") {
      setSettingsLv1Width(280)
      setSettingsLv2Width(250)
      setSettingsLv3Width(235)
      setSettingsLv4Width(220)
      setSettingsColumnGap(85)
      onSaveSettings({
        1: { width: 280, height: tierDimensions[1].height },
        2: { width: 250, height: tierDimensions[2].height },
        3: { width: 235, height: tierDimensions[3].height },
        4: { width: 220, height: tierDimensions[4].height },
        columnGap: 85,
        verticalGapJourney: tierDimensions.verticalGapJourney,
        verticalGapScreen: tierDimensions.verticalGapScreen,
      })
    }
  }

  // Active preset helper
  const currentPreset = useMemo(() => {
    if (
      settingsLv1Width === 320 &&
      settingsLv2Width === 280 &&
      settingsLv3Width === 260 &&
      settingsLv4Width === 250 &&
      settingsColumnGap === 110
    ) {
      return "default"
    }
    if (
      settingsLv1Width === 360 &&
      settingsLv2Width === 310 &&
      settingsLv3Width === 285 &&
      settingsLv4Width === 265 &&
      settingsColumnGap === 140
    ) {
      return "spacious"
    }
    if (
      settingsLv1Width === 280 &&
      settingsLv2Width === 250 &&
      settingsLv3Width === 235 &&
      settingsLv4Width === 220 &&
      settingsColumnGap === 85
    ) {
      return "compact"
    }
    return "custom"
  }, [settingsLv1Width, settingsLv2Width, settingsLv3Width, settingsLv4Width, settingsColumnGap])

  // Handle Save Settings from sliders
  const handleSaveSettingsValues = () => {
    onSaveSettings({
      1: { width: Math.max(160, settingsLv1Width), height: tierDimensions[1].height },
      2: { width: Math.max(160, settingsLv2Width), height: tierDimensions[2].height },
      3: { width: Math.max(150, settingsLv3Width), height: tierDimensions[3].height },
      4: { width: Math.max(140, settingsLv4Width), height: tierDimensions[4].height },
      columnGap: Math.max(40, settingsColumnGap),
      verticalGapJourney: tierDimensions.verticalGapJourney,
      verticalGapScreen: tierDimensions.verticalGapScreen,
    })
    toast.success("Đã cập nhật kích thước sơ đồ!")
  }

  // JSON Validation & Import
  const handleValidateAndImportJson = () => {
    setParseError(null)
    if (!rawJsonText.trim()) {
      setParseError("Vui lòng dán nội dung JSON vào ô bên dưới.")
      return
    }
    try {
      const parsed = JSON.parse(rawJsonText)
      const res = parseAndNormalizeIaJson(parsed, activeProduct.name)
      if (!res.success || !res.data) {
        setParseError(res.error || "Không thể phân tích dữ liệu JSON.")
        return
      }
      setParsedPreview(res.stats || null)
      onImportJson(res.data)
      toast.success("Đã nhập thành công sơ đồ IA map!")
      onClose()
    } catch (err: any) {
      setParseError(`Lỗi cú pháp JSON: ${err.message}`)
    }
  }

  const handleLoadJsonSample = () => {
    setRawJsonText(JSON.stringify(SAMPLE_JSON_EXPORT, null, 2))
    setParseError(null)
    toast.info("Đã nạp mẫu JSON chuẩn!")
  }

  if (!activeTool) return null

  return (
    <motion.aside
      data-testid="ia-slide-over-sheet"
      aria-label={sheetTitle}
      initial={{ x: -360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -360, opacity: 0 }}
      transition={{ type: "spring", damping: 26, stiffness: 280 }}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-3.5 bottom-3.5 z-25 w-[360px] bg-white/98 backdrop-blur-xl border border-slate-200/90 shadow-2xl rounded-2xl flex flex-col select-none overflow-hidden"
      style={{ left: "76px" /* style={{ left: "56px" }} */ }}
    >
      {/* 1. Header Bar: Title and Close (X) */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
        <h3 className="text-sm font-semibold text-slate-900 truncate tracking-tight">
          {sheetTitle}
        </h3>

        <Tooltip content="Đóng (Esc)" shortcut="Esc" side="left">
          <button
            type="button"
            data-testid="ia-sheet-close-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {/* 2. Universal Sub-header: Search & Category Tabs (Tạm ẩn theo yêu cầu) */}
      {false && activeTool === "add-node" && (
        <div className="border-b border-slate-100 bg-white shrink-0 p-3 space-y-2.5">
          {/* Universal Search Bar */}
          <div className="relative flex items-center rounded-xl bg-slate-100/90 border border-slate-200/80 px-2.5 py-1.5 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1.5" />
            <input
              type="text"
              data-testid="ia-sheet-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm mẫu, màn hình, từ khóa..."
              className="w-full text-xs bg-transparent border-0 outline-none text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Tabs: all, 1, 2, 3, 4 */}
          <div
            role="tablist"
            className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none"
          >
            {CATEGORY_TABS.map((tab) => {
              const isTabActive = activeCategoryTab === tab.id
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  data-testid={`ia-sheet-tab-${tab.id}`}
                  aria-selected={isTabActive}
                  onClick={() => setActiveCategoryTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isTabActive
                      ? "bg-slate-900 text-white font-semibold shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 3. Dynamic Sheet Panels */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {/* PANEL: ADD NODE */}
        {activeTool === "add-node" && (
          <div className="p-3 space-y-3">
            {/* Selection Context Banner */}
            {isSelectedNodeLv4 ? (
              <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-start gap-2 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <p className="font-semibold text-amber-950">
                    ⚠️ Node Cấp 4 (Lv4) là điểm chạm cuối, không thể tạo thêm nhánh con.
                  </p>
                  <p className="text-amber-800/90 mt-0.5">
                    Để mở rộng sơ đồ, hãy chọn node cha cấp 1–3 hoặc tạo một Node gốc Cấp 1 mới.
                  </p>
                </div>
              </div>
            ) : selectedNode ? (
              <div className="px-3 py-2 rounded-xl bg-blue-50/80 border border-blue-100 text-blue-900 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                  <span className="truncate">
                    Đang chọn: <strong>{selectedNode.name}</strong> (Lv{selectedNode.tier})
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-blue-700 shrink-0 ml-1">
                  Nhánh con Lv{selectedNode.tier + 1}
                </span>
              </div>
            ) : null}

            {/* List of Template Cards */}
            <div className="space-y-2">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Không tìm thấy mẫu nào phù hợp với từ khóa "{searchQuery}"
                </div>
              ) : (
                filteredTemplates.map((item) => {
                  const IconComponent = item.icon
                  const isBlockedByLv4 = isSelectedNodeLv4 && item.tier !== 1

                  return (
                    <div
                      key={item.id}
                      data-testid={`ia-quick-add-${item.id}`}
                      draggable={!isBlockedByLv4}
                      onDragStart={(e) => {
                        if (isBlockedByLv4) return
                        e.dataTransfer.setData(
                          "application/json",
                          JSON.stringify({
                            tier: item.tier,
                            touchpointType: item.touchpointType,
                            name: item.title,
                            code: item.code,
                          })
                        )
                        e.dataTransfer.effectAllowed = "copy"
                      }}
                      onClick={() => {
                        if (isBlockedByLv4) {
                          toast.warning("Không thể tạo thêm nhánh con cho node Cấp 4 (Lv4)!")
                          return
                        }
                        onAddNode(item)
                      }}
                      className={`group relative p-2.5 rounded-xl border transition-all duration-150 flex items-start justify-between gap-2 ${
                        isBlockedByLv4
                          ? "opacity-45 bg-slate-50 border-slate-200 cursor-not-allowed"
                          : "bg-white border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/20 hover:shadow-xs cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs border border-white"
                          style={{ backgroundColor: `${item.colorHex}15`, color: item.colorHex }}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 truncate transition-colors">
                              {item.title}
                            </h4>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                              Lv{item.tier}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip
                          content={
                            isBlockedByLv4
                              ? "Cấp 4 không thể thêm nhánh con"
                              : "Thêm vào sơ đồ"
                          }
                          side="top"
                        >
                          <button
                            type="button"
                            disabled={isBlockedByLv4}
                            className={`p-1 rounded-md text-white shadow-2xs ${
                              isBlockedByLv4
                                ? "bg-slate-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                            }`}
                          >
                            <Plus className="w-3 h-3 stroke-[3]" />
                          </button>
                        </Tooltip>
                        {!isBlockedByLv4 && (
                          <Tooltip content="Kéo thả vào canvas" side="top">
                            <div className="text-slate-300 hover:text-slate-500 cursor-grab p-0.5">
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* PANEL: SETTINGS */}
        {activeTool === "settings" && (
          <div className="flex-1 min-h-0 flex flex-col justify-between p-4 text-xs h-full">
            {/* Scrollable controls */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {/* Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-xs">Cấu hình nhanh (Presets)</span>
                  {currentPreset !== "custom" && (
                    <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      {currentPreset === "default" ? "Mặc định" : currentPreset === "compact" ? "Gọn gàng" : "Rộng rãi"}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("compact")}
                    className={`px-2 py-1.5 rounded-lg text-center font-medium transition-all cursor-pointer text-xs ${
                      currentPreset === "compact"
                        ? "bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    Gọn gàng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("default")}
                    className={`px-2 py-1.5 rounded-lg text-center font-medium transition-all cursor-pointer text-xs ${
                      currentPreset === "default"
                        ? "bg-white text-blue-600 font-semibold shadow-xs border border-blue-200/80"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    Mặc định
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("spacious")}
                    className={`px-2 py-1.5 rounded-lg text-center font-medium transition-all cursor-pointer text-xs ${
                      currentPreset === "spacious"
                        ? "bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    Rộng rãi
                  </button>
                </div>
              </div>

              {/* Sliders Container */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                {/* Lv1 Root */}
                <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#1057FB] shrink-0 shadow-2xs" />
                      <span>Chiều rộng Cấp 1 (Root)</span>
                    </span>
                    <span className="font-mono text-slate-700 font-bold text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                      {settingsLv1Width}px
                    </span>
                  </div>
                  <Slider
                    min={200}
                    max={450}
                    step={10}
                    value={settingsLv1Width}
                    onChange={setSettingsLv1Width}
                    color="#1057FB"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>200px</span>
                    <span>450px</span>
                  </div>
                </div>

                {/* Lv2 Phân hệ */}
                <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 shadow-2xs" />
                      <span>Chiều rộng Cấp 2 (Phân hệ)</span>
                    </span>
                    <span className="font-mono text-slate-700 font-bold text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                      {settingsLv2Width}px
                    </span>
                  </div>
                  <Slider
                    min={180}
                    max={380}
                    step={10}
                    value={settingsLv2Width}
                    onChange={setSettingsLv2Width}
                    color="#6366F1"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>180px</span>
                    <span>380px</span>
                  </div>
                </div>

                {/* Lv3 Hành trình */}
                <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-2xs" />
                      <span>Chiều rộng Cấp 3 (Hành trình)</span>
                    </span>
                    <span className="font-mono text-slate-700 font-bold text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                      {settingsLv3Width}px
                    </span>
                  </div>
                  <Slider
                    min={160}
                    max={340}
                    step={10}
                    value={settingsLv3Width}
                    onChange={setSettingsLv3Width}
                    color="#10B981"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>160px</span>
                    <span>340px</span>
                  </div>
                </div>

                {/* Lv4 Màn hình */}
                <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-2xs" />
                      <span>Chiều rộng Cấp 4 (Màn hình)</span>
                    </span>
                    <span className="font-mono text-slate-700 font-bold text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                      {settingsLv4Width}px
                    </span>
                  </div>
                  <Slider
                    min={160}
                    max={320}
                    step={10}
                    value={settingsLv4Width}
                    onChange={setSettingsLv4Width}
                    color="#F59E0B"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>160px</span>
                    <span>320px</span>
                  </div>
                </div>

                {/* Khoảng cách giữa các cột */}
                <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0 shadow-2xs" />
                      <span>Khoảng cách giữa các cột</span>
                    </span>
                    <span className="font-mono text-slate-700 font-bold text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                      {settingsColumnGap}px
                    </span>
                  </div>
                  <Slider
                    min={60}
                    max={200}
                    step={10}
                    value={settingsColumnGap}
                    onChange={setSettingsColumnGap}
                    color="#475569"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>60px</span>
                    <span>200px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Bottom Button */}
            <div className="shrink-0 pt-3 border-t border-slate-100/90 mt-2">
              <Button
                variant="primary"
                onClick={handleSaveSettingsValues}
                className="w-full py-2.5 text-xs font-semibold justify-center cursor-pointer shadow-sm bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Áp dụng cài đặt kích thước
              </Button>
            </div>
          </div>
        )}

        {/* PANEL: CLOUD */}
        {activeTool === "cloud" && (
          <div className="p-3.5 space-y-4 text-xs">
            {/* Status Header */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Trạng thái kết nối</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đang trực tuyến
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium">Master Sheet:</span>
                <span className="font-mono text-[11px] text-slate-600">MB_UX_IA_DATA</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                type="button"
                data-testid="ia-sheet-sync-cloud-btn"
                disabled={isSyncingCloud || isPullingCloud}
                onClick={onSyncCloud}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0F172A] text-white hover:bg-slate-800 disabled:opacity-50 transition-colors font-semibold cursor-pointer shadow-sm"
              >
                <CloudUpload className={`w-4 h-4 ${isSyncingCloud ? "animate-pulse" : ""}`} />
                <span>{isSyncingCloud ? "Đang đẩy dữ liệu lên Cloud..." : "Lưu đồng bộ lên Cloud (Push)"}</span>
              </button>

              <button
                type="button"
                data-testid="ia-sheet-pull-cloud-btn"
                disabled={isPullingCloud || isSyncingCloud}
                onClick={onPullCloud}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors font-medium cursor-pointer shadow-2xs"
              >
                <CloudDownload className={`w-4 h-4 text-slate-500 ${isPullingCloud ? "animate-bounce" : ""}`} />
                <span>{isPullingCloud ? "Đang tải dữ liệu từ Cloud..." : "Tải từ Cloud (Pull)"}</span>
              </button>
            </div>

            {/* ReUI c-progress-4 Sync Progress Bar */}
            <AnimatePresence>
              {(isSyncingCloud || isPullingCloud) && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -4 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <SyncProgressStatus
                    active={isSyncingCloud || isPullingCloud}
                    type={isSyncingCloud ? "push" : "pull"}
                    label={isSyncingCloud ? "Đang đồng bộ sơ đồ lên Cloud..." : "Đang nạp sơ đồ từ Cloud..."}
                    className="border-blue-200/80 bg-blue-50/40 shadow-xs"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              💡 Lưu ý: Khi đồng bộ lên Cloud, toàn bộ các thay đổi về thẻ, liên kết, phân hệ và ghi chú sẽ được cập nhật vào bảng dữ liệu Google Sheets của dự án.
            </p>
          </div>
        )}

        {/* PANEL: JSON */}
        {activeTool === "json" && (
          <div className="flex-1 min-h-0 flex flex-col p-3.5 space-y-3 text-xs">
            <div className="flex items-center justify-between shrink-0">
              <span className="font-semibold text-slate-700">Nhập hoặc xuất dữ liệu JSON</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleLoadJsonSample}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Mẫu chuẩn
                </button>
                <button
                  type="button"
                  onClick={onCopyJson}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Sao chép</span>
                </button>
              </div>
            </div>

            <div className="relative flex-1 min-h-0 flex flex-col">
              <textarea
                value={rawJsonText}
                onChange={(e) => {
                  setRawJsonText(e.target.value)
                  setParseError(null)
                }}
                placeholder="Dán cấu trúc JSON hoặc bấm 'Mẫu chuẩn'..."
                className="w-full flex-1 h-full min-h-[300px] p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 font-mono text-[11px] text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all resize-none overflow-y-auto leading-relaxed"
              />
            </div>

            {parseError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-start gap-1.5 shrink-0">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            <div className="shrink-0 pt-1">
              <Button
                variant="primary"
                onClick={handleValidateAndImportJson}
                className="w-full py-2.5 text-xs font-semibold justify-center cursor-pointer shadow-xs"
              >
                Kiểm tra cú pháp & Nhập sơ đồ
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  )
}
