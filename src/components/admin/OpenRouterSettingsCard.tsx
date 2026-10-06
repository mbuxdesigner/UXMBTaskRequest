import React, { useEffect, useState } from "react"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Code2,
  ExternalLink,
  Key,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { springs, tactileProps } from "@/lib/motion"
import {
  POPULAR_AI_MODELS,
  getStoredAIModel,
  isAIEnabled,
  saveAIModel,
  setAIEnabled,
  testAIConnection,
  getCustomAIKeysPool,
  addCustomAIKey,
  removeCustomAIKey,
  getCustomGeminiKey,
  saveCustomGeminiKey,
  type AIKeyEntry,
} from "@/services/aiService"

interface OpenRouterSettingsCardProps {
  isExpanded: boolean
  onToggleExpand: () => void
}

const CURATED_FREE_MODELS = [
  {
    id: "google/gemma-4-31b-it:free",
    name: "Google Gemma 4 31B",
    tag: "Khuyên dùng",
    tagClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    desc: "DeepMind 31B mới nhất, văn phong tiếng Việt rất tự nhiên, phân tích UX sâu.",
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini Flash (Google AI)",
    tag: "Vision 1.500 RPD",
    tagClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    desc: "Cổng AI Studio, đọc ảnh chụp màn hình UI, miễn phí 1.500 lượt/ngày.",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra 550B",
    tag: "550B MoE",
    tagClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    desc: "NVIDIA 550B siêu lớn, tư duy suy luận logic sâu (Frontier Reasoning), ngữ cảnh 1M.",
  },
  {
    id: "qwen/qwen3.8-27b:free",
    name: "Qwen 3.8 27B Vision",
    tag: "Code & Mermaid",
    tagClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    desc: "Xuất sắc về Mermaid diagram, cấu trúc bảng dữ liệu, frontend code & flow nghiệp vụ.",
  },
]

export function OpenRouterSettingsCard({ isExpanded, onToggleExpand }: OpenRouterSettingsCardProps) {
  const [enabled, setEnabled] = useState(true)
  const [model, setModel] = useState("")
  const [keys, setKeys] = useState<AIKeyEntry[]>([])
  const [newKeyLabel, setNewKeyLabel] = useState("")
  const [newKeyInput, setNewKeyInput] = useState("")
  const [geminiKeyInput, setGeminiKeyInput] = useState("")
  const [savedGeminiKey, setSavedGeminiKey] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    latencyMs: number
  } | null>(null)
  const [testingGemini, setTestingGemini] = useState(false)
  const [geminiTestResult, setGeminiTestResult] = useState<{
    success: boolean
    message: string
    latencyMs: number
  } | null>(null)

  useEffect(() => {
    setEnabled(isAIEnabled())
    setModel(getStoredAIModel())
    setKeys(getCustomAIKeysPool())
    const gKey = getCustomGeminiKey()
    setSavedGeminiKey(gKey)
    setGeminiKeyInput(gKey)
  }, [])

  const handleSelectCuratedModel = (modelId: string, modelName: string) => {
    setModel(modelId)
    saveAIModel(modelId)
    toast.success(`Đã chọn model: ${modelName}`)
  }

  const handleAddKey = () => {
    if (!newKeyInput.trim()) {
      toast.error("Vui lòng nhập OpenRouter API Key!")
      return
    }
    const updated = addCustomAIKey(newKeyInput, newKeyLabel || `Key #${keys.length + 1}`)
    setKeys(updated)
    setNewKeyInput("")
    setNewKeyLabel("")
    toast.success("Đã thêm OpenRouter API Key vào Rotation Pool!")
  }

  const handleRemoveKey = (id: string) => {
    if (keys.length <= 1) {
      if (!confirm("Đây là key duy nhất trong pool. Bạn có chắc muốn xóa không?")) return
    }
    const updated = removeCustomAIKey(id)
    setKeys(updated)
    toast.success("Đã xóa API Key khỏi Rotation Pool.")
  }

  const handleSaveGeminiKey = () => {
    const trimmed = geminiKeyInput.trim()
    saveCustomGeminiKey(trimmed)
    setSavedGeminiKey(trimmed)
    if (trimmed) {
      toast.success("Đã lưu Google AI Studio API Key thành công!")
    } else {
      toast.info("Đã xóa Google AI Studio API Key.")
    }
  }

  const handleTestGateway = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const activeKey = keys.length > 0 ? keys[0].key : undefined
      const res = await testAIConnection(activeKey, model)
      setTestResult(res)
      if (res.success) {
        toast.success(`Cổng AI Gateway Online! Độ trễ: ${res.latencyMs}ms`)
      } else {
        toast.error(`Kiểm tra thất bại: ${res.message}`)
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Lỗi không xác định",
        latencyMs: 0,
      })
      toast.error("Không thể kết nối tới AI Gateway!")
    } finally {
      setTesting(false)
    }
  }

  const handleTestGemini = async () => {
    setTestingGemini(true)
    setGeminiTestResult(null)
    try {
      const res = await testAIConnection(geminiKeyInput.trim() || undefined, "google/gemini-2.0-flash-001")
      setGeminiTestResult(res)
      if (res.success) {
        toast.success(`Google AI Studio Online! Độ trễ: ${res.latencyMs}ms`)
      } else {
        toast.error(`Kiểm tra thất bại: ${res.message}`)
      }
    } catch (err: any) {
      setGeminiTestResult({
        success: false,
        message: err?.message || "Lỗi kết nối Google AI",
        latencyMs: 0,
      })
      toast.error("Không thể kết nối tới Google AI Studio!")
    } finally {
      setTestingGemini(false)
    }
  }

  const maskKey = (k: string) => {
    if (!k || k.length < 12) return "••••••••••••"
    return `${k.substring(0, 8)}...${k.substring(k.length - 4)}`
  }

  const totalOpenRouterRPD = keys.length * 50

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-neutral-800 dark:bg-card">
      {/* Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center justify-between gap-3 p-4 text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-neutral-800">
            <Server className="size-4 text-slate-700 dark:text-slate-200" />
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">AI Gateway nội bộ</div>
            <div className="text-xs text-slate-500">Provider key được quản lý ở máy chủ hoặc cấu hình trực tiếp bên dưới.</div>
          </div>
        </div>
        <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-slate-200/80 p-4 dark:border-neutral-800">
              {/* Security Switch */}
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Xác thực theo phiên đăng nhập và giới hạn model tại server</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => {
                    const next = !enabled
                    setEnabled(next)
                    setAIEnabled(next)
                  }}
                  className={cn("h-5 w-9 rounded-full p-0.5 transition-colors cursor-pointer shrink-0", enabled ? "bg-emerald-600" : "bg-slate-300")}
                >
                  <span className={cn("block size-4 rounded-full bg-white transition-transform", enabled && "translate-x-4")} />
                </button>
              </div>

              {/* Curated 4 Models Selection Cards */}
              <div className="bg-slate-100/80 dark:bg-neutral-900/60 rounded-2xl p-3.5 border border-slate-200/80 dark:border-neutral-800 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Gợi ý chọn 4 Model Tinh hoa (Bấm thẻ để chọn ngay):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {CURATED_FREE_MODELS.map((item) => {
                    const isSelected = model === item.id
                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectCuratedModel(item.id, item.name)}
                        {...tactileProps.button}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 shadow-xs ring-1 ring-slate-900/10"
                            : "border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-850 shadow-2xs"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs truncate mr-1">{item.name}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border shrink-0 ${
                                isSelected
                                  ? "bg-white text-slate-900 border-white dark:bg-slate-900 dark:text-white dark:border-slate-900"
                                  : item.tagClass
                              }`}
                            >
                              {item.tag}
                            </span>
                          </div>
                          <p
                            className={`text-[10px] leading-relaxed line-clamp-2 ${
                              isSelected
                                ? "text-slate-200 dark:text-slate-600"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {item.desc}
                          </p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Managed Model Dropdown Selection */}
              <label className="block space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                Model mặc định được phép
                <select
                  value={model}
                  onChange={(event) => {
                    setModel(event.target.value)
                    saveAIModel(event.target.value)
                  }}
                  className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-100"
                >
                  {POPULAR_AI_MODELS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.provider})
                    </option>
                  ))}
                </select>
              </label>

              {/* DEDICATED GOOGLE AI STUDIO DIRECT GATEWAY CARD */}
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs">
                      G
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Cổng kết nối Google AI Studio (Gemini)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 font-semibold">
                      1.500 requests/ngày Free
                    </span>
                  </div>
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-700 dark:text-slate-300 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Lấy Key tại aistudio.google.com</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-0.5">
                  <div className="sm:col-span-2">
                    <Input
                      type="password"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder="AIzaSy... (Dán Google AI Studio API Key)"
                      className="text-xs font-mono rounded-xl border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-slate-100 h-9.5"
                    />
                  </div>
                  <div>
                    <Button
                      type="button"
                      onClick={handleSaveGeminiKey}
                      className="w-full rounded-xl text-xs font-semibold cursor-pointer bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white h-9.5 shadow-xs"
                    >
                      <Key className="size-3.5 mr-1" />
                      <span>{savedGeminiKey ? "Cập nhật Key" : "Lưu Google Key"}</span>
                    </Button>
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestGemini}
                      disabled={testingGemini || !geminiKeyInput.trim()}
                      className="w-full rounded-xl text-xs font-semibold gap-1.5 cursor-pointer bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-200 h-9.5"
                    >
                      <RefreshCw className={cn("size-3.5", testingGemini && "animate-spin")} />
                      <span>{testingGemini ? "Đang thử..." : "Test Google"}</span>
                    </Button>
                  </div>
                </div>

                {geminiTestResult && (
                  <div className={cn("flex items-center gap-1.5 text-xs font-medium pt-1", geminiTestResult.success ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                    {geminiTestResult.success && <CheckCircle2 className="size-3.5 shrink-0" />}
                    <span>{geminiTestResult.message} ({geminiTestResult.latencyMs}ms)</span>
                  </div>
                )}
              </div>

              {/* OpenRouter Key Rotation Pool */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Key className="size-3.5 text-slate-700 dark:text-slate-300" />
                    <span>
                      OpenRouter API Key & Pool xoay vòng ({keys.length} key · ~{totalOpenRouterRPD.toLocaleString("vi-VN")} req/ngày):
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {keys.length} key(s) đang sẵn sàng
                  </span>
                </div>

                {/* List of keys in pool */}
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/90 dark:border-neutral-800 divide-y divide-slate-100 dark:divide-neutral-800/80 overflow-hidden shadow-2xs">
                  {keys.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Chưa có OpenRouter API Key nào được cài đặt. Vui lòng thêm key bên dưới.
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {keys.map((k, index) => (
                        <motion.div
                          key={k.id}
                          layout
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={springs.snappy}
                          className="p-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="size-6 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-neutral-700">
                              #{index + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {k.label}
                                </span>
                                <span className="inline-block px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] border border-emerald-200 dark:border-emerald-800 font-semibold">
                                  Active (50 RPD)
                                </span>
                              </div>
                              <span className="font-mono text-slate-400 dark:text-slate-500 text-[11px]">
                                {maskKey(k.key)}
                              </span>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveKey(k.id)}
                            className="size-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer"
                            title="Xóa key này"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                {/* Add new key form */}
                <div className="bg-white dark:bg-neutral-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-2xs space-y-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Plus className="size-3.5 text-slate-700 dark:text-slate-300" />
                    <span>Thêm OpenRouter API Key dự phòng mới:</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      value={newKeyLabel}
                      onChange={(e) => setNewKeyLabel(e.target.value)}
                      placeholder="Nhãn (VD: Backup Key 2)..."
                      className="text-xs rounded-xl border-slate-200 dark:border-neutral-700 bg-slate-50/60 dark:bg-neutral-800 dark:text-slate-100 h-9.5"
                    />
                    <Input
                      type="password"
                      value={newKeyInput}
                      onChange={(e) => setNewKeyInput(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="text-xs font-mono rounded-xl border-slate-200 dark:border-neutral-700 bg-slate-50/60 dark:bg-neutral-800 dark:text-slate-100 h-9.5"
                    />
                    <Button
                      type="button"
                      onClick={handleAddKey}
                      className="w-full rounded-xl text-xs font-semibold cursor-pointer bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xs h-9.5"
                    >
                      <Plus className="size-3.5 mr-1" />
                      <span>Lưu Key vào Pool</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Test Gateway Action & Status */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestGateway}
                  disabled={testing || !enabled}
                  className="h-9 rounded-xl border-slate-200 dark:border-neutral-700"
                >
                  <RefreshCw className={cn("mr-1.5 size-3.5", testing && "animate-spin")} />
                  {testing ? "Đang kiểm tra..." : "Kiểm tra gateway"}
                </Button>
                {testResult && (
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium",
                      testResult.success ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                    )}
                  >
                    {testResult.success && <CheckCircle2 className="size-3.5 shrink-0" />}
                    {testResult.message}
                    {testResult.latencyMs > 0 ? ` (${testResult.latencyMs}ms)` : ""}
                  </span>
                )}
              </div>

              {/* Developer guidance note about prompt training file */}
              <div className="bg-slate-100/90 dark:bg-neutral-900/90 rounded-2xl p-4 border border-slate-200/80 dark:border-neutral-800 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                  <Code2 className="size-4 text-slate-700 dark:text-slate-300 shrink-0" />
                  <span>Cơ chế quản lý System Prompt & Training AI:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 pl-5.5">
                  Toàn bộ System Prompt (Quy trình 7 khâu UX MB, SLA, thuật ngữ và giọng văn xưng hô)
                  được tổ chức tập trung trong{" "}
                  <strong className="text-slate-900 dark:text-slate-200">
                    1 file code duy nhất
                  </strong>
                  :
                  <br />
                  <code className="inline-block mt-1 px-2.5 py-0.5 rounded-lg bg-white dark:bg-neutral-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] font-semibold border border-slate-200 dark:border-neutral-700 shadow-2xs">
                    src/config/aiPrompts.ts
                  </code>
                  <br />
                  Để huấn luyện hoặc điều chỉnh hành vi AI, bạn chỉ cần mở file code trên và chỉnh sửa prompt tương ứng.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
