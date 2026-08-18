import { useState } from "react"
import GoogleSheetSettingsModal from "./common/GoogleSheetSettingsModal"
import { getGoogleSheetConfig } from "../config/googleSheetConfig"

export type Page = "overview" | "create" | "track" | "manage"

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
  {
    page: "overview",
    label: "Tổng quan",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    page: "create",
    label: "Tạo yêu cầu",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 3V13M3 8H13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    page: "track",
    label: "Tra cứu",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    page: "manage",
    label: "Quản lý",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M2 4H14M2 8H10M2 12H12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
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
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-navy rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="white" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 leading-tight tracking-tight">
              UX Request Portal
            </p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Internal Tool</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ page, label, icon }) => {
          const active = currentPage === page
          return (
            <button
              key={page}
              onClick={() => {
                onNavigate(page)
                setMobileOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left ${
                active
                  ? "bg-navy text-white font-medium shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className={active ? "text-white" : "text-slate-400"}>{icon}</span>
              {label}
            </button>
          )
        })}
      </nav>

      {/* Google Sheet Sync Button in Sidebar */}
      <div className="p-3 border-t border-slate-100 flex-shrink-0 space-y-2">
        <button
          onClick={() => setSheetModalOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2 truncate">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isConfigured ? "bg-emerald-500" : "bg-amber-400"}`} />
            <span className="truncate font-medium">Google Sheet Sync</span>
          </div>
          <span className="text-[10px] text-slate-400">⚙️</span>
        </button>

        <p className="text-[10px] text-slate-400 px-1 leading-relaxed">
          {isConfigured ? "Đang đồng bộ Google Sheet" : "Chưa kết nối Google Sheet"}
        </p>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-13 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-navy rounded-md flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="white" />
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-900">UX Request Portal</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          {mobileOpen ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/30 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-200 ${
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
