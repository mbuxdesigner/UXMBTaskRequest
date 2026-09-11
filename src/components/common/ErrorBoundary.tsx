import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleClearCacheAndReload = () => {
    try {
      localStorage.removeItem("mbbank_admin_squads")
      localStorage.removeItem("ux_portal_real_requests")
      localStorage.removeItem("ux_portal_squads_v2")
      localStorage.removeItem("mbbank_selections_cache")
    } catch {}
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FCFCFD] flex items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Đã xảy ra lỗi hiển thị giao diện
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hệ thống gặp sự cố không mong muốn trong quá trình kết xuất dữ liệu. Bạn có thể tải lại trang hoặc làm mới bộ nhớ đệm.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-left font-mono text-[11px] text-slate-600 break-all max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Tải lại trang
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Làm mới bộ nhớ
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
