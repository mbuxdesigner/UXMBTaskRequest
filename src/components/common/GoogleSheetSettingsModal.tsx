import { useState, useEffect } from "react"
import {
  getGoogleSheetConfig,
  saveGoogleSheetConfig,
} from "../../config/googleSheetConfig"
import {
  testGoogleSheetConnection,
  fetchSelectionsFromSheet,
  syncProjectionsFromSheet,
  initSheetsViaApi,
  SelectionsData,
} from "../../services/googleSheetService"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Sliders, 
  BookOpen, 
  Sparkles, 
  X, 
  Save, 
  Check,
  Zap,
  ShieldCheck,
  FolderPlus
} from "lucide-react"

import { toast } from "@/components/ui/toast"

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
  const [syncingProjections, setSyncingProjections] = useState(false)
  const [initializingSheets, setInitializingSheets] = useState(false)
  const [testResult, setTestResult] = useState<{
    connected: boolean
    message: string
    selectionsCount?: { products: number; request_types: number }
  } | null>(null)
  const [activeTab, setActiveTab] = useState<string>("config")
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const config = getGoogleSheetConfig()
      setUrl(config?.scriptUrl || "")
      setTestResult(null)
      setSavedSuccess(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    saveGoogleSheetConfig({ scriptUrl: url.trim() })
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2000)
    toast.success("Đã lưu cấu hình Google Sheet Web App!")
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
    toast.success("Đã đồng bộ danh mục cấu hình thành công!")
  }

  const handleSyncProjections = async () => {
    setSyncingProjections(true)
    saveGoogleSheetConfig({ scriptUrl: url.trim() })
    const res = await syncProjectionsFromSheet()
    setSyncingProjections(false)
    if (res.success) {
      toast.success(res.message || "Đã phân tách và đồng bộ các bảng View thành công!")
    } else {
      toast.error("Lỗi đồng bộ", res.message)
    }
  }

  const handleInitAllSheets = async () => {
    setInitializingSheets(true)
    saveGoogleSheetConfig({ scriptUrl: url.trim() })
    const res = await initSheetsViaApi()
    setInitializingSheets(false)
    if (res.success) {
      toast.success(res.message || "Đã khởi tạo hoàn tất cấu trúc Sheet!")
    } else {
      toast.error("Lỗi khởi tạo", res.message)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 flex-shrink-0 shadow-2xs">
            <Database className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <DialogTitle>Tích hợp Quản lý & Log Google Sheet</DialogTitle>
            <DialogDescription>
              Tải danh mục selection thời gian thực & Ghi log RAW JSON siêu tốc
            </DialogDescription>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </DialogHeader>

      <div className="px-6 pt-4 border-b border-slate-100">
        <Tabs value={activeTab} onValueChange={setActiveTab} variant="line">
          <TabsList>
            <TabsTrigger value="config">
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5" />
                Cấu hình Web App URL
              </span>
            </TabsTrigger>
            <TabsTrigger value="teams_otp">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-teal" />
                Xác thực Teams OTP
              </span>
            </TabsTrigger>
            <TabsTrigger value="guide">
              <span className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                Hướng dẫn cài đặt Apps Script
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DialogBody className="space-y-4">
        {activeTab === "config" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Google Apps Script Web App URL
              </label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                startIcon={<Zap className="w-4 h-4 text-emerald-600" />}
              />
              <p className="text-xs text-slate-400 mt-1">
                Dán URL Web App được tạo từ Google Apps Script của bạn.
              </p>
            </div>

            {testResult && (
              <Alert
                variant={testResult.connected ? "success" : "destructive"}
                icon={
                  testResult.connected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )
                }
              >
                <AlertTitle>{testResult.connected ? "Kết nối thành công" : "Không thể kết nối"}</AlertTitle>
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}

            {savedSuccess && (
              <Alert variant="success" icon={<Check className="w-4 h-4 text-emerald-600" />}>
                <AlertTitle>Đã lưu & đồng bộ thành công</AlertTitle>
                <AlertDescription>Cấu hình Web App URL đã được lưu vào bộ nhớ trình duyệt.</AlertDescription>
              </Alert>
            )}

            {/* Feature overview */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Cơ chế bảo mật & vận hành 2 lớp:
              </p>
              <ul className="space-y-1.5 text-slate-600 pl-1">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span><strong>1. Xác thực Teams OTP:</strong> Người dùng nhập email cá nhân, hệ thống gửi OTP 6 số qua Teams Workflow, tạo phiên làm việc 15 phút.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span><strong>2. Bảo mật Sheet [DATA]:</strong> Dữ liệu chỉ được trả về khi có Session Token hợp lệ, không lưu lộ OTP trên ô tính.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span><strong>3. Ghi vết [LOGS]:</strong> Lưu vết đầy đủ các yêu cầu OTP, xác thực và từ khóa tìm kiếm.</span>
                </li>
              </ul>
            </div>
          </div>
        ) : activeTab === "teams_otp" ? (
          <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
            <div className="p-3 bg-navy-50/70 border border-navy-100 rounded-xl space-y-1">
              <p className="font-bold text-navy text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal" />
                Cấu hình Xác thực Microsoft Teams Workflow
              </p>
              <p className="text-slate-600 text-xs">
                Để mã OTP được gửi tự động tới tin nhắn Teams của nhân sự:
              </p>
            </div>

            <ol className="list-decimal list-inside space-y-2 text-slate-600">
              <li>
                <strong>Tạo Teams Workflow:</strong> Trong Microsoft Teams, vào mục <em>Workflows</em> (hoặc Power Automate) &gt; Chọn mẫu <em>"Post to a chat when a webhook request is received"</em> (hoặc <em>"Send an Adaptive Card to a user"</em>).
              </li>
              <li>
                <strong>Payload gửi sang Teams:</strong>
                <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-lg mt-1 text-[11px] font-mono overflow-x-auto">
{`{
  "teamsEmail": "abc@mbbank.com.vn",
  "otp": "583921"
}`}
                </pre>
              </li>
              <li>
                <strong>Lưu Webhook URL vào Google Sheet:</strong>
                <p className="mt-1 text-slate-500">
                  Mở Google Sheet &gt; Chọn Menu <strong>🚀 Tiện ích UX Portal</strong> &gt; <strong>🔗 Cấu hình Teams Webhook URL</strong> &gt; Dán URL webhook. URL này được lưu an toàn trong <code>ScriptProperties</code>.
                </p>
              </li>
              <li>
                <strong>Bảng [USERS]:</strong> Điền email cá nhân và email Teams tương ứng. Đặt <code>Status = Active</code> để kích hoạt cấp mã OTP.
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <p className="font-bold text-slate-800 text-sm">
              Hướng dẫn triển khai Google Apps Script trong 3 bước:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-slate-600">
              <li>Mở file Google Sheet của bạn trên Google Drive.</li>
              <li>
                Vào <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.
              </li>
              <li>
                Copy toàn bộ mã nguồn trong file{" "}
                <code className="bg-slate-100 text-navy font-bold px-1.5 py-0.5 rounded border border-slate-200">
                  google-apps-script-backend.js
                </code>{" "}
                dán đè vào Apps Script.
              </li>
              <li>
                Bấm <strong>Triển khai (Deploy)</strong> &gt; <strong>Tùy chọn triển khai mới (New deployment)</strong> &gt; Chọn <strong>Ứng dụng web (Web App)</strong>:
                <ul className="list-disc list-inside pl-4 mt-1 text-slate-500">
                  <li>Thực thi dưới dạng: <em>Tôi (Me)</em></li>
                  <li>Ai có quyền truy cập: <strong className="text-red-600">Bất kỳ ai (Anyone)</strong></li>
                </ul>
              </li>
              <li>Copy <strong>URL ứng dụng web</strong> và dán vào tab Cấu hình bên cạnh.</li>
              <li>
                Tải lại Google Sheet và bấm Menu <strong>🚀 Tiện ích UX Portal</strong> &gt; <strong>⚙️ Khởi tạo cấu trúc các Sheet</strong> để tạo sẵn các sheet USERS, DATA, LOGS.
              </li>
            </ol>
          </div>
        )}
      </DialogBody>

      <DialogFooter className="flex-wrap justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={testing || !url.trim()}
            loading={testing}
            onClick={handleTestConnection}
          >
            Kiểm tra kết nối
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={syncing || !url.trim()}
            loading={syncing}
            onClick={handleSyncSelections}
            className="text-navy bg-navy-50 hover:bg-navy-100 border border-navy-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Đồng bộ Selections
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={syncingProjections || !url.trim()}
            loading={syncingProjections}
            onClick={handleSyncProjections}
            className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            Phân tách View
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={initializingSheets || !url.trim()}
            loading={initializingSheets}
            onClick={handleInitAllSheets}
            className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
          >
            <FolderPlus className="w-3.5 h-3.5 text-indigo-600" />
            Khởi tạo cấu trúc Sheet
          </Button>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
          <Button type="button" variant="default" size="sm" onClick={handleSave}>
            <Save className="w-3.5 h-3.5 text-teal" />
            Lưu cấu hình
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  )
}
