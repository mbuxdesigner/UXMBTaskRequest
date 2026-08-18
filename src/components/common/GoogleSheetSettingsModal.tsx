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
  Zap
} from "lucide-react"

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
  const [activeTab, setActiveTab] = useState<string>("config")

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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList variant="underline">
            <TabsTrigger value="config">
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5" />
                Cấu hình Web App URL
              </span>
            </TabsTrigger>
            <TabsTrigger value="guide">
              <span className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                Hướng dẫn cài đặt (1 phút)
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
                Cơ chế tối ưu siêu tốc:
              </p>
              <ul className="space-y-1.5 text-slate-600 pl-1">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span><strong>1. Quản lý Selections:</strong> Tự động tải dropdown Sản phẩm, Loại yêu cầu từ sheet <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">Selections</code>.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span><strong>2. Ghi Log RAW JSON:</strong> Khi nộp yêu cầu, chỉ ghi 3 cột tối giản giúp phản hồi tức thì và không làm chậm web.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span><strong>3. Tách cột chi tiết:</strong> Dùng nút Menu <em>"🚀 Tiện ích UX Portal"</em> trên Google Sheet để bóc tách dữ liệu ra cột bất kỳ lúc nào.</span>
                </li>
              </ul>
            </div>
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
