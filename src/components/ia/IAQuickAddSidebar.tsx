import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Layers,
  Building2,
  GitFork,
  Smartphone,
  Layout,
  PanelBottom,
  Bell,
  Globe,
  PanelTop,
  Sparkles,
  GripVertical,
} from "lucide-react"
import { IATier, IATouchpointType } from "@/types/ia"
import { springs, tactileProps } from "@/lib/motion"
import { Tooltip } from "@/components/ui/tooltip"

export interface QuickAddNodeType {
  id: string
  tier: IATier
  name: string
  description: string
  touchpointType?: IATouchpointType
  colorHex: string
  badgeClass: string
  icon: React.ComponentType<{ className?: string }>
}

export const QUICK_ADD_ITEMS: QuickAddNodeType[] = [
  // TIER 1: ROOT
  {
    id: "tier-1-root",
    tier: 1,
    name: "Tier 1: Gốc sản phẩm (Root)",
    description: "Tạo thêm Tier 1 mới cho sản phẩm này",
    colorHex: "#1057FB",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Building2,
  },
  // TIER 2: DOMAIN
  {
    id: "tier-2-domain",
    tier: 2,
    name: "Tier 2: Phân hệ / Module",
    description: "Nhóm nghiệp vụ lớn (Thanh toán, Tiết kiệm...)",
    colorHex: "#6366f1",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Layers,
  },
  // TIER 3: JOURNEY
  {
    id: "tier-3-journey",
    tier: 3,
    name: "Tier 3: Luồng tính năng",
    description: "Chuỗi hành trình khách hàng (Napas 247...)",
    colorHex: "#8b5cf6",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    icon: GitFork,
  },
  // TIER 4: TOUCHPOINTS
  {
    id: "tier-4-screen",
    tier: 4,
    name: "Tier 4: Màn hình chính (Screen)",
    description: "Giao diện màn hình ứng dụng tiêu chuẩn",
    touchpointType: "screen",
    colorHex: "#059669",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Smartphone,
  },
  {
    id: "tier-4-modal",
    tier: 4,
    name: "Tier 4: Hộp thoại (Modal)",
    description: "Popup thông báo hoặc xác thực giao dịch",
    touchpointType: "modal",
    colorHex: "#9333ea",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Layout,
  },
  {
    id: "tier-4-bottom-sheet",
    tier: 4,
    name: "Tier 4: Tấm trượt đáy (Bottom Sheet)",
    description: "Ngăn trượt từ cạnh dưới để chọn hoặc nhập nhanh",
    touchpointType: "bottom_sheet",
    colorHex: "#d97706",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    icon: PanelBottom,
  },
  {
    id: "tier-4-push",
    tier: 4,
    name: "Tier 4: Thông báo đẩy (Push Notif)",
    description: "Điểm chạm kích hoạt ngoài app",
    touchpointType: "push_notification",
    colorHex: "#e11d48",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    icon: Bell,
  },
  {
    id: "tier-4-webview",
    tier: 4,
    name: "Tier 4: Trang nhúng Webview",
    description: "Màn hình tải nội dung web / liên kết đối tác",
    touchpointType: "webview",
    colorHex: "#06b6d4",
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
    icon: Globe,
  },
  {
    id: "tier-4-action-sheet",
    tier: 4,
    name: "Tier 4: Bảng chọn Action Sheet",
    description: "Menu danh sách thao tác nhanh",
    touchpointType: "action_sheet",
    colorHex: "#4f46e5",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: PanelTop,
  },
  // TIER 5: ELEMENT / SUB-COMPONENT
  {
    id: "tier-5-element",
    tier: 5,
    name: "Tier 5: Thành phần / Chi tiết (Element)",
    description: "Thành phần giao diện, data field hoặc trạng thái chi tiết",
    colorHex: "#8b5cf6",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Sparkles,
  },
]

interface IAQuickAddSidebarProps {
  isOpen: boolean
  onToggle: () => void
  onAddNode: (item: QuickAddNodeType) => void
  selectedNodeId?: string | null
  selectedNodeName?: string | null
  selectedNodeTier?: IATier | null
}

export default function IAQuickAddSidebar({
  isOpen,
  onToggle,
  onAddNode,
  selectedNodeId,
  selectedNodeName,
  selectedNodeTier,
}: IAQuickAddSidebarProps) {
  const [query, setQuery] = useState("")

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return QUICK_ADD_ITEMS
    return QUICK_ADD_ITEMS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.touchpointType && item.touchpointType.toLowerCase().includes(q))
    )
  }, [query])

  return (
    <div
      data-testid="ia-quick-add-sidebar"
      className="relative z-30 flex select-none"
    >
      {/* Expanded Sidebar Panel */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={springs.gentle}
            className="h-full bg-white/95 backdrop-blur-md border-r border-slate-200/90 shadow-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#1057FB] flex items-center justify-center border border-blue-200/60">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight">Thêm Node nhanh</h3>
                  <p className="text-[10px] text-slate-500">Kéo hoặc click để thêm vào sơ đồ</p>
                </div>
              </div>
              <Tooltip content="Thu gọn thanh công cụ" side="right">
                <motion.button
                  type="button"
                  onClick={onToggle}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                  {...tactileProps.button}
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
              </Tooltip>
            </div>

            {/* Context Notice: Target Node */}
            {selectedNodeId ? (
              <div className="px-3.5 py-2 bg-blue-50/70 border-b border-blue-100 text-[11px] text-blue-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <span className="truncate">
                  Đang chọn: <strong>{selectedNodeName || "Node"}</strong> (Lv{selectedNodeTier})
                </span>
              </div>
            ) : (
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
                <span>💡 Click Tier 1 để tạo gốc mới, hoặc chọn 1 thẻ trước để thêm con</span>
              </div>
            )}

            {/* Search filter */}
            <div className="p-3 border-b border-slate-100 shrink-0">
              <div className="relative flex items-center rounded-xl bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1.5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm loại node..."
                  className="w-full text-xs bg-transparent border-0 outline-none text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* List of draggable / clickable node items */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {filteredItems.map((item) => {
                const IconComponent = item.icon
                return (
                  <div
                    key={item.id}
                    data-testid={`ia-quick-add-${item.id}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/json",
                        JSON.stringify({
                          tier: item.tier,
                          touchpointType: item.touchpointType,
                          name: item.tier === 1 ? "Cấp 1 mới · Sản phẩm" : item.tier === 2 ? "Phân hệ mới" : item.tier === 3 ? "Luồng tính năng mới" : "Màn hình mới",
                        })
                      )
                      e.dataTransfer.effectAllowed = "copy"
                    }}
                    onClick={() => onAddNode(item)}
                    className="group relative p-2.5 rounded-xl border border-slate-200/80 hover:border-blue-400 bg-white hover:bg-blue-50/20 hover:shadow-xs transition-all duration-150 cursor-pointer flex items-start justify-between gap-2"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs border border-white"
                        style={{ backgroundColor: `${item.colorHex}15`, color: item.colorHex }}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 truncate transition-colors">
                            {item.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Tooltip content="Thêm node vào sơ đồ" side="top">
                        <button
                          type="button"
                          className="p-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Kéo thả vào canvas" side="top">
                        <div className="text-slate-300 cursor-grab">
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed Mini Tab Handle (luôn hiển thị để mở lại) */}
      {!isOpen && (
        <Tooltip content="Mở thanh thêm nhanh Node (n8n style)" side="right">
          <motion.button
            type="button"
            data-testid="ia-quick-add-toggle-open"
            onClick={onToggle}
            className="absolute top-4 left-3 z-40 flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-lg text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:shadow-xl transition-all cursor-pointer select-none"
            {...tactileProps.button}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>+ Thêm node</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </motion.button>
        </Tooltip>
      )}
    </div>
  )
}
