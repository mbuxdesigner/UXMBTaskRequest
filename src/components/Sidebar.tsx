import { useState } from "react"
import GoogleSheetSettingsModal from "./common/GoogleSheetSettingsModal"
import { getGoogleSheetConfig } from "../config/googleSheetConfig"
import { 
  LayoutDashboard, 
  PlusCircle, 
  Search, 
  FolderKanban, 
  Database, 
  Settings2, 
  Menu, 
  X,
  Sparkles
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type Page = "overview" | "create" | "track" | "manage"

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const navItems: { page: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    page: "overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    page: "create",
    label: "Tạo yêu cầu",
    icon: PlusCircle,
  },
  {
    page: "track",
    label: "Tra cứu",
    icon: Search,
  },
  {
    page: "manage",
    label: "Quản lý",
    icon: FolderKanban,
  },
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sheetModalOpen, setSheetModalOpen] = useState(false)
  const config = getGoogleSheetConfig()
  const isConfigured = Boolean(config.scriptUrl?.trim())

  const SidebarContent = () => (
    <>
      <div className="px-5 py-5 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-navy rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs shadow-navy/20">
            <Sparkles className="w-4 h-4 text-teal" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-tight tracking-tight">
              UX Request Portal
            </p>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">MB Bank Digital Product</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Menu chính
        </p>
        {navItems.map(({ page, label, icon: Icon }) => {
          const active = currentPage === page
          return (
            <button
              key={page}
              onClick={() => {
                onNavigate(page)
                setMobileOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 text-left font-medium select-none cursor-pointer ${
                active
                  ? "bg-navy text-white shadow-sm shadow-navy/15"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 active:scale-[0.99]"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-teal" : "text-slate-400"}`} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Google Sheet Sync Button in Sidebar */}
      <div className="p-3 border-t border-slate-100 flex-shrink-0 space-y-2">
        <button
          onClick={() => setSheetModalOpen(true)}
          className="w-full flex items-center justify-between p-2.5 bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
            <div className="text-left truncate">
              <span className="block font-semibold text-slate-800 truncate">Google Sheet API</span>
              <span className="block text-[10px] text-slate-400 truncate">
                {isConfigured ? "Đang đồng bộ" : "Chưa kết nối"}
              </span>
            </div>
          </div>
          <Settings2 className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors flex-shrink-0" />
        </button>

        <div className="px-1 flex items-center justify-between text-[10px] text-slate-400">
          <span>ReUI System v2.0</span>
          <Badge variant="navy" size="sm">Active</Badge>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-navy rounded-lg flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-teal" />
          </div>
          <span className="text-sm font-bold text-slate-900">UX Request Portal</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
        >
          {mobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-200 z-30 flex-col">
        <SidebarContent />
      </aside>

      {/* Google Sheet Sync Modal */}
      <GoogleSheetSettingsModal
        isOpen={sheetModalOpen}
        onClose={() => setSheetModalOpen(false)}
      />
    </>
  )
}
