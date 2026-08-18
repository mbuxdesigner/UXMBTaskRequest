import { useState, useEffect } from "react"
import {
  getGoogleSheetConfig,
  saveGoogleSheetConfig,
} from "../../config/googleSheetConfig"
import {
  testGoogleSheetConnection,
  fetchSelectionsFromSheet,
  SelectionsData,
} from "../../services/googleSheetService"

interface GoogleSheetSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSynced?: (selections: SelectionsData) => void
}

export default function GoogleSheetSettingsModal({
  isOpen,
  onClose,
  onSynced,
}: GoogleSheetSettingsModalProps) {
  const [url, setUrl] = useState("")
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testResult, setTestResult] = useState<{
    connected: boolean
    message: string
  } | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<"config" | "guide">("config")

  useEffect(() => {
    if (isOpen) {
      const cfg = getGoogleSheetConfig()
      setUrl(cfg.scriptUrl || "")
      setTestResult(null)
      setSavedSuccess(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    saveGoogleSheetConfig({ scriptUrl: url.trim() })
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testGoogleSheetConnection(url)
    setTestResult(result)
    setTesting(false)
  }

  const handleSyncSelections = async () => {
    setSyncing(true)
    saveGoogleSheetConfig({ scriptUrl: url.trim() })
    const selections = await fetchSelectionsFromSheet(true)
    setSyncing(false)
    if (onSynced) onSynced(selections)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 2V8H20"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 13H8M16 17H8M10 9H8"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tích hợp Quản lý & Log Google Sheet
              </h2>
              <p className="text-xs text-slate-500">
                Tải danh mục selection & Tự động ghi log JSON khi nộp yêu cầu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 px-6 gap-6 text-sm">
          <button
            onClick={() => setActiveTab("config")}
            className={`py-3 font-medium border-b-2 transition-colors ${
              activeTab === "config"
                ? "border-navy text-navy font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Cấu hình Web App URL
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`py-3 font-medium border-b-2 transition-colors ${
              activeTab === "guide"
                ? "border-navy text-navy font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Hướng dẫn cài đặt (1 phút)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === "config" ? (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Google Apps Script Web App URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                />
                <p className="text-xs text-slate-400">
                  Dán URL Web App được tạo từ Google Apps Script của Google Sheet của bạn.
                </p>
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs border flex items-start gap-2.5 ${
                    testResult.connected
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  <span className="text-base">{testResult.connected ? "✓" : "⚠️"}</span>
                  <div className="flex-1 leading-relaxed">{testResult.message}</div>
                </div>
              )}

              {savedSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
                  <span>✓</span> Đã lưu cấu hình và đồng bộ thành công!
                </div>
              )}

              {/* Status info box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-600">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Quy trình hoạt động:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-500 pl-1">
                  <li>
                    <strong className="text-slate-700">1. Quản lý Selections:</strong> Đọc trực
                    tiếp danh sách <em>Sản phẩm, Loại yêu cầu, Output kỳ vọng, Lý do thời hạn</em> từ
                    tab <code className="bg-slate-200 px-1 py-0.5 rounded">Selections</code> trên Google Sheet.
                  </li>
                  <li>
                    <strong className="text-slate-700">2. Log JSON tự động:</strong> Mỗi khi người dùng
                    bấm gửi form, toàn bộ thông tin và raw JSON payload sẽ được ghi thành một hàng mới
                    trong tab <code className="bg-slate-200 px-1 py-0.5 rounded">Requests_Log</code>.
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div className="space-y-4 text-xs text-slate-600">
              <p className="font-medium text-slate-800 text-sm">
                Các bước kết nối Google Sheet với UX Portal:
              </p>
              <ol className="list-decimal list-inside space-y-2.5 text-slate-600 leading-relaxed">
                <li>
                  Tạo một file <strong>Google Sheet</strong> mới trên Google Drive.
                </li>
                <li>
                  Vào menu <strong>Tiện ích mở rộng (Extensions)</strong> &gt;{" "}
                  <strong>Apps Script</strong>.
                </li>
                <li>
                  Mở file mã nguồn{" "}
                  <code className="bg-slate-100 text-navy font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                    google-apps-script-backend.js
                  </code>{" "}
                  có sẵn trong thư mục gốc của dự án này, copy toàn bộ nội dung và dán vào Apps Script.
                </li>
                <li>
                  Bấm nút <strong>Triển khai (Deploy)</strong> &gt;{" "}
                  <strong>Tùy chọn triển khai mới (New deployment)</strong>.
                </li>
                <li>
                  Chọn loại: <strong>Ứng dụng web (Web app)</strong>:
                  <ul className="list-disc list-inside pl-4 mt-1 text-slate-500">
                    <li>Thực thi dưới dạng (Execute as): <em>Tôi (Me)</em></li>
                    <li>
                      Ai có quyền truy cập (Who has access):{" "}
                      <strong className="text-red-600">Bất kỳ ai (Anyone)</strong>
                    </li>
                  </ul>
                </li>
                <li>
                  Bấm <strong>Triển khai (Deploy)</strong>, cấp quyền và copy <strong>URL ứng dụng web</strong> dán vào tab Cấu hình.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={testing || !url.trim()}
              onClick={handleTestConnection}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              {testing ? "Đang kiểm tra…" : "Kiểm tra kết nối"}
            </button>
            <button
              type="button"
              disabled={syncing || !url.trim()}
              onClick={handleSyncSelections}
              className="px-3.5 py-2 text-xs font-medium text-navy bg-navy-50 border border-navy-100 rounded-lg hover:bg-navy-100 transition-colors disabled:opacity-50"
            >
              {syncing ? "Đang đồng bộ…" : "Đồng bộ Selections ngay"}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold text-white bg-navy rounded-lg hover:bg-navy-dark transition-colors"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
