import React, { useState, useEffect } from "react"
import {
  Sparkles,
  ChevronDown,
  Key,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cpu,
  ExternalLink,
  Code2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu } from "@/components/reui/dropdown-menu"
import { toast } from "sonner"
import {
  getStoredAIKeys,
  saveAIKeys,
  addAIKey,
  removeAIKey,
  getStoredAIModel,
  saveAIModel,
  isAIEnabled,
  setAIEnabled,
  testAIConnection,
  POPULAR_AI_MODELS,
  type AIKeyEntry,
} from "@/services/aiService"

interface OpenRouterSettingsCardProps {
  isExpanded: boolean
  onToggleExpand: () => void
}

export function OpenRouterSettingsCard({
  isExpanded,
  onToggleExpand,
}: OpenRouterSettingsCardProps) {
  const [enabled, setEnabled] = useState(true)
  const [keys, setKeys] = useState<AIKeyEntry[]>([])
  const [selectedModel, setSelectedModel] = useState("")
  const [newKeyInput, setNewKeyInput] = useState("")
  const [newKeyLabel, setNewKeyLabel] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    latencyMs: number
  } | null>(null)

  useEffect(() => {
    setEnabled(isAIEnabled())
    setKeys(getStoredAIKeys())
    setSelectedModel(getStoredAIModel())
  }, [])

  const handleToggleEnable = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !enabled
    setEnabled(next)
    setAIEnabled(next)
    toast.success(`OpenRouter AI Gateway: Đã ${next ? "BẬT" : "TẮT"} dịch vụ AI!`)
  }

  const handleAddModelChange = (modelId: string) => {
    setSelectedModel(modelId)
    saveAIModel(modelId)
    toast.success("Đã cập nhật Model AI mặc định!")
  }

  const handleAddKey = () => {
    if (!newKeyInput.trim()) {
      toast.error("Vui lòng nhập API Key!")
      return
    }
    const updated = addAIKey(newKeyInput, newKeyLabel || `Key #${keys.length + 1}`)
    setKeys(updated)
    setNewKeyInput("")
    setNewKeyLabel("")
    toast.success("Đã thêm API Key mới vào Rotation Pool!")
  }

  const handleRemoveKey = (id: string) => {
    if (keys.length <= 1) {
      if (!confirm("Đây là key duy nhất. Bạn có chắc chắn muốn xóa không?")) return
    }
    const updated = removeAIKey(id)
    setKeys(updated)
    toast.success("Đã xóa API Key khỏi Rotation Pool.")
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await testAIConnection(undefined, selectedModel)
      setTestResult(res)
      if (res.success) {
        toast.success(`OpenRouter Online! Độ trễ: ${res.latencyMs}ms`)
      } else {
        toast.error(`Kiểm tra thất bại: ${res.message}`)
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Lỗi không xác định",
        latencyMs: 0,
      })
      toast.error("Không thể kết nối tới OpenRouter!")
    } finally {
      setTesting(false)
    }
  }

  const maskKey = (k: string) => {
    if (!k || k.length < 12) return "••••••••••••"
    return `${k.substring(0, 8)}...${k.substring(k.length - 4)}`
  }

  return (
    <div className="transition-colors">
      {/* Header bar */}
      <div
        onClick={onToggleExpand}
        className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl border border-indigo-200/80 bg-indigo-50/70 flex items-center justify-center text-indigo-700 shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-slate-900">
                OpenRouter AI Gateway (LLM Engine)
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                  enabled
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200/60"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    enabled ? "bg-indigo-500" : "bg-slate-400"
                  }`}
                />
                {enabled ? "Active · Key Pool Ready" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {enabled
                ? `Cung cấp trí tuệ nhân tạo cho Bản tin điều hành & Chat Copilot · ${keys.length} API Key(s) xoay vòng`
                : "Đã tạm dừng toàn bộ các tính năng AI trên cổng UX Portal"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={handleToggleEnable}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${
              enabled ? "bg-indigo-600" : "bg-slate-200"
            }`}
            title={enabled ? "Nhấn để tạm dừng AI" : "Nhấn để kích hoạt AI"}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Mở cấu hình chi tiết"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? "rotate-180 text-slate-900" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Expanded configuration content */}
      {isExpanded && (
        <div className="bg-slate-50/70 border-t border-slate-100 p-5 space-y-5 animate-in fade-in duration-150">
          {/* Row 1: Model Selection & Test Button */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-700 block mb-1 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mô hình AI Mặc định (Tuyển tập các Model 100% Free xịn nhất):</span>
              </label>
              <DropdownMenu
                className="w-full bg-white"
                menuClassName="w-full min-w-80 max-h-80 overflow-y-auto"
                value={selectedModel}
                onChange={handleAddModelChange}
                options={POPULAR_AI_MODELS.map((m) => ({
                  value: m.id,
                  label: `${m.name} · ${m.provider}`,
                  badge: (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                      {m.badge || "Free"}
                    </span>
                  ),
                }))}
              />
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing || keys.length === 0}
                className="w-full rounded-lg text-xs font-medium gap-1.5 cursor-pointer bg-white border-slate-200 hover:bg-slate-50 text-slate-700 h-9"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    testing ? "animate-spin text-slate-900" : "text-indigo-600"
                  }`}
                />
                <span>{testing ? "Đang kiểm tra..." : "Test kết nối OpenRouter"}</span>
              </Button>
            </div>
          </div>

          {/* Curated Free Models Guide Grid */}
          <div className="bg-slate-100/70 rounded-xl p-3 border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Gợi ý chọn Model Free phù hợp với từng tác vụ:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="bg-white p-2 rounded-lg border border-slate-200/70 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
                  <span>Google Gemma 4 31B</span>
                  <span className="text-[9px] px-1 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-medium">Khuyên dùng</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  DeepMind 31B mới nhất, văn phong tiếng Việt rất tự nhiên, phân tích sâu.
                </p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/70 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
                  <span>Nemotron 3 Ultra 550B</span>
                  <span className="text-[9px] px-1 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded font-medium">550B MoE</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  NVIDIA 550B siêu lớn, tư duy suy luận logic sâu (Frontier Reasoning), ngữ cảnh 1M.
                </p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/70 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
                  <span>Qwen 3.8 27B Vision</span>
                  <span className="text-[9px] px-1 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded font-medium">Code & UX</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  Xuất sắc về Mermaid diagram, cấu trúc bảng, frontend code & flow nghiệp vụ.
                </p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/70 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
                  <span>Nemotron 3.5 Lightning</span>
                  <span className="text-[9px] px-1 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded font-medium">Siêu tốc</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  Tốc độ phản hồi tức thì, độ trễ cực thấp, tra cứu nhanh thông tin.
                </p>
              </div>
            </div>
          </div>

          {/* Test result status badge */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                testResult.success
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                  : "bg-rose-50/80 border-rose-200 text-rose-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
              {testResult.latencyMs > 0 && (
                <span className="font-mono text-[11px] opacity-75">
                  {testResult.latencyMs}ms
                </span>
              )}
            </div>
          )}

          {/* Row 2: Key Rotation Pool */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                <span>Danh sách API Keys (Xoay vòng tự động khi chạm giới hạn 429/402):</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {keys.length} key(s) đang sẵn sàng
              </span>
            </div>

            {/* List of keys */}
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
              {keys.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Chưa có API Key nào được cài đặt. Vui lòng thêm key bên dưới.
                </div>
              ) : (
                keys.map((k, index) => (
                  <div
                    key={k.id}
                    className="p-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 truncate">
                            {k.label}
                          </span>
                          <span className="inline-block px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded text-[10px] border border-emerald-200">
                            Active
                          </span>
                        </div>
                        <span className="font-mono text-slate-400 text-[11px]">
                          {maskKey(k.key)}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveKey(k.id)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Xóa key này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Add new key form */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Thêm API Key dự phòng mới:</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  placeholder="Nhãn (VD: Backup Key 2)..."
                  className="text-xs rounded-lg border-slate-200 bg-slate-50/50"
                />
                <Input
                  type="password"
                  value={newKeyInput}
                  onChange={(e) => setNewKeyInput(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="text-xs font-mono rounded-lg border-slate-200 bg-slate-50/50"
                />
                <Button
                  type="button"
                  onClick={handleAddKey}
                  className="rounded-lg text-xs font-medium cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Lưu Key vào Pool</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Developer guidance note about prompt training file */}
          <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 rounded-xl p-3.5 border border-indigo-200/60 text-xs text-indigo-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
              <Code2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Cơ chế quản lý System Prompt & Training AI:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-indigo-900/90 pl-5">
              Toàn bộ System Prompt (Quy trình 7 khâu UX MB, SLA, thuật ngữ và giọng văn xưng hô) được tổ chức tập trung trong <strong>1 file code duy nhất</strong>:
              <br />
              <code className="inline-block mt-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-mono text-[11px] font-semibold border border-indigo-200">
                src/config/aiPrompts.ts
              </code>
              <br />
              Để huấn luyện hoặc điều chỉnh hành vi AI, bạn chỉ cần mở file code trên và chỉnh sửa prompt tương ứng.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
