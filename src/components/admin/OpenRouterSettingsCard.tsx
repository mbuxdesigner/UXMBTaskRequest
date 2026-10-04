import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  Check,
  ShieldCheck,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu } from "@/components/reui/dropdown-menu"
import { toast } from "sonner"
import { springs, tactileProps } from "@/lib/motion"
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
  testGeminiConnection,
  getStoredGeminiKey,
  getStoredGeminiKeys,
  saveGeminiKeys,
  addGeminiKey,
  removeGeminiKey,
  getStoredAIGateway,
  saveAIGateway,
  POPULAR_AI_MODELS,
  OPENROUTER_REQUESTS_PER_KEY_PER_DAY,
  GOOGLE_REQUESTS_PER_KEY_PER_DAY,
  type AIKeyEntry,
  type GeminiKeyEntry,
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
    id: "gemini-auto",
    name: "Gemini Flash (Google AI)",
    tag: "Vision 1.500 RPD",
    tagClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    desc: "Gọi trực tiếp Google AI Studio, đọc ảnh chụp màn hình UI, miễn phí 1.500 lượt/ngày.",
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

  // Google AI Studio Direct Gateway Pool State
  const [geminiKeys, setGeminiKeys] = useState<GeminiKeyEntry[]>([])
  const [newGeminiKeyInput, setNewGeminiKeyInput] = useState("")
  const [newGeminiKeyLabel, setNewGeminiKeyLabel] = useState("")
  const [aiGateway, setAiGateway] = useState<"auto" | "google_ai_studio" | "openrouter">("auto")
  const [testingGemini, setTestingGemini] = useState(false)
  const [geminiTestResult, setGeminiTestResult] = useState<{
    success: boolean
    message: string
    latencyMs: number
  } | null>(null)

  useEffect(() => {
    setEnabled(isAIEnabled())
    setKeys(getStoredAIKeys())
    setSelectedModel(getStoredAIModel())
    setGeminiKeys(getStoredGeminiKeys())
    setAiGateway(getStoredAIGateway())

    const handleGeminiKeysChange = () => {
      setGeminiKeys(getStoredGeminiKeys())
    }
    const handleOpenRouterKeysChange = () => {
      setKeys(getStoredAIKeys())
    }

    window.addEventListener("ux_mb_gemini_keys_changed", handleGeminiKeysChange)
    window.addEventListener("ux_mb_ai_usage_changed", handleGeminiKeysChange)
    window.addEventListener("storage", handleGeminiKeysChange)
    window.addEventListener("storage", handleOpenRouterKeysChange)

    return () => {
      window.removeEventListener("ux_mb_gemini_keys_changed", handleGeminiKeysChange)
      window.removeEventListener("ux_mb_ai_usage_changed", handleGeminiKeysChange)
      window.removeEventListener("storage", handleGeminiKeysChange)
      window.removeEventListener("storage", handleOpenRouterKeysChange)
    }
  }, [])

  const handleToggleEnable = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !enabled
    setEnabled(next)
    setAIEnabled(next)
    toast.success(`Cổng AI Gateway: Đã ${next ? "BẬT" : "TẮT"} dịch vụ AI!`)
  }

  const handleAddModelChange = (modelId: string) => {
    setSelectedModel(modelId)
    saveAIModel(modelId)
    toast.success("Đã cập nhật Model AI mặc định!")
  }

  const handleSelectCuratedModel = (modelId: string, modelName: string) => {
    setSelectedModel(modelId)
    saveAIModel(modelId)
    toast.success(`Đã chọn model: ${modelName}`)
  }

  // OpenRouter Key Handlers
  const handleAddKey = () => {
    if (!newKeyInput.trim()) {
      toast.error("Vui lòng nhập OpenRouter API Key!")
      return
    }
    const updated = addAIKey(newKeyInput, newKeyLabel || `OpenRouter Key #${keys.length + 1}`)
    setKeys(updated)
    setNewKeyInput("")
    setNewKeyLabel("")
    toast.success("Đã thêm API Key mới vào OpenRouter Rotation Pool!")
  }

  const handleRemoveKey = (id: string) => {
    if (keys.length <= 1) {
      if (!confirm("Đây là key OpenRouter duy nhất. Bạn có chắc chắn muốn xóa không?")) return
    }
    const updated = removeAIKey(id)
    setKeys(updated)
    toast.success("Đã xóa API Key khỏi OpenRouter Pool.")
  }

  // Google AI Studio Key Pool Handlers
  const handleAddGeminiKey = () => {
    if (!newGeminiKeyInput.trim()) {
      toast.error("Vui lòng nhập Google AI Studio API Key!")
      return
    }
    const updated = addGeminiKey(
      newGeminiKeyInput,
      newGeminiKeyLabel || `Google Key #${geminiKeys.length + 1}`
    )
    setGeminiKeys(updated)
    setNewGeminiKeyInput("")
    setNewGeminiKeyLabel("")
    toast.success(`Đã thêm Google Key vào Pool! (+${GOOGLE_REQUESTS_PER_KEY_PER_DAY.toLocaleString('vi-VN')} requests/ngày)`)
  }

  const handleRemoveGeminiKey = (id: string) => {
    if (geminiKeys.length <= 1) {
      if (!confirm("Đây là key Google duy nhất. Bạn có chắc chắn muốn xóa không?")) return
    }
    const updated = removeGeminiKey(id)
    setGeminiKeys(updated)
    toast.success("Đã xóa API Key khỏi Google AI Studio Pool.")
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

  const handleGatewayChange = (gw: "auto" | "google_ai_studio" | "openrouter") => {
    setAiGateway(gw)
    saveAIGateway(gw)
    const label =
      gw === "auto"
        ? "Tự động điều phối (Dual-Pool Smart Route)"
        : gw === "google_ai_studio"
        ? "Google AI Studio Trực tiếp"
        : "OpenRouter Gateway Pool"
    toast.success(`Đã chuyển cổng kết nối: ${label}`)
  }

  const handleTestGeminiConnection = async (specificKey?: string) => {
    setTestingGemini(true)
    setGeminiTestResult(null)
    const keyToTest = specificKey || (geminiKeys[0]?.key ?? getStoredGeminiKey())
    try {
      const res = await testGeminiConnection(keyToTest)
      setGeminiTestResult(res)
      if (res.success) {
        toast.success(`Google AI Studio Online! Độ trễ: ${res.latencyMs}ms`)
      } else {
        toast.error(`Kiểm tra Google AI thất bại: ${res.message}`)
      }
    } catch (err: any) {
      setGeminiTestResult({
        success: false,
        message: err?.message || "Lỗi không xác định",
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

  const activeGoogleKeysCount = geminiKeys.filter((k) => k.status !== "error").length
  const activeOpenRouterKeysCount = keys.filter((k) => k.status !== "error").length
  const totalGoogleRPD = activeGoogleKeysCount * GOOGLE_REQUESTS_PER_KEY_PER_DAY
  const totalOpenRouterRPD = activeOpenRouterKeysCount * OPENROUTER_REQUESTS_PER_KEY_PER_DAY
  const grandTotalRPD = totalGoogleRPD + totalOpenRouterRPD

  const GATEWAY_OPTIONS: {
    id: "auto" | "google_ai_studio" | "openrouter"
    title: string
    badge: string
    desc: string
  }[] = [
    {
      id: "auto",
      title: "⚡ Tự động (Khuyên dùng)",
      badge: "Dual-Pool Smart Route",
      desc: "Ưu tiên Google AI Studio (1.500 RPD/tài khoản). Nếu chạm 15 RPM hoặc có model ngoài thì tự động chuyển OpenRouter Pool.",
    },
    {
      id: "google_ai_studio",
      title: "🌐 Google AI Studio Trực tiếp",
      badge: `${activeGoogleKeysCount} Keys Pool`,
      desc: "Xoay vòng Round-Robin qua danh sách các tài khoản Google, tối ưu nhận diện ảnh & tốc độ cực cao.",
    },
    {
      id: "openrouter",
      title: "🔀 OpenRouter Gateway Pool",
      badge: `${activeOpenRouterKeysCount} Keys Pool`,
      desc: "Điều phối qua OpenRouter với danh sách nhiều key xoay vòng tự động.",
    },
  ]

  return (
    <div className="rounded-2xl transition-all duration-200 bg-white dark:bg-card border border-slate-200/80 dark:border-neutral-800 shadow-xs hover:border-slate-300/80 overflow-hidden">
      {/* Header bar */}
      <div
        onClick={onToggleExpand}
        className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 transition-colors select-none"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="size-10 rounded-xl border border-slate-200/80 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="size-5 text-slate-800 dark:text-slate-200" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                Cổng Kết Nối AI (OpenRouter & Google AI Studio Direct)
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  enabled
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800"
                    : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-neutral-700"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    enabled ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                <span>
                  {enabled
                    ? activeGoogleKeysCount > 0 && activeOpenRouterKeysCount > 0
                      ? `Dual-Pool Ready (~${grandTotalRPD.toLocaleString('vi-VN')} lượt/ngày)`
                      : activeGoogleKeysCount > 0
                      ? `Google AI Ready (~${totalGoogleRPD.toLocaleString('vi-VN')} lượt/ngày)`
                      : activeOpenRouterKeysCount > 0
                      ? `OpenRouter Ready (~${totalOpenRouterRPD.toLocaleString('vi-VN')} lượt/ngày)`
                      : "Chưa nạp key"
                    : "Đã tắt dịch vụ"}
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {enabled
                ? `Google AI Studio Pool (${activeGoogleKeysCount} keys) & OpenRouter Pool (${activeOpenRouterKeysCount} keys) • Tự động điều phối 2 tầng`
                : "Đã tạm dừng toàn bộ các tính năng AI trên cổng UX Portal"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={handleToggleEnable}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${
              enabled
                ? "bg-slate-900 dark:bg-slate-100"
                : "bg-slate-200 dark:bg-neutral-800"
            }`}
            title={enabled ? "Nhấn để tạm dừng AI" : "Nhấn để kích hoạt AI"}
          >
            <motion.span
              layout
              transition={springs.snappy}
              className={`size-5 rounded-full bg-white dark:bg-slate-900 transition-transform shadow-xs ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={springs.snappy}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <ChevronDown className="size-4" />
          </motion.div>
        </div>
      </div>

      {/* Expanded configuration content with Framer Motion spring */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="openrouter-settings-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50/70 dark:bg-neutral-950/50 border-t border-slate-200/80 dark:border-neutral-800 p-5 sm:p-6 space-y-5">
              {/* Gateway Routing Mode Selector */}
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-slate-700 dark:text-slate-300" />
                    <span>Chế độ điều phối Cổng AI Gateway (Dual-Pool Engine):</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Đang dùng:{" "}
                    <strong className="text-slate-900 dark:text-slate-100">
                      {aiGateway === "auto"
                        ? "Tự động (Dual-Pool Smart)"
                        : aiGateway === "google_ai_studio"
                        ? "Google AI Studio"
                        : "OpenRouter"}
                    </strong>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {GATEWAY_OPTIONS.map((opt) => {
                    const isGwActive = aiGateway === opt.id
                    return (
                      <motion.button
                        key={opt.id}
                        type="button"
                        onClick={() => handleGatewayChange(opt.id)}
                        {...tactileProps.button}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                          isGwActive
                            ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 shadow-xs ring-1 ring-slate-900/10"
                            : "border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-850 shadow-2xs"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs">{opt.title}</span>
                            {isGwActive && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-white text-slate-900 dark:bg-slate-900 dark:text-white shrink-0">
                                <Check className="size-2.5 stroke-[2.5]" />
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[10px] leading-relaxed ${
                              isGwActive
                                ? "text-slate-200 dark:text-slate-600"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {opt.desc}
                          </p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* DEDICATED GOOGLE AI STUDIO DIRECT GATEWAY KEY POOL */}
              <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-2xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shadow-2xs">
                      G
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Google AI Studio Key Pool (Hỗ trợ nhiều tài khoản Google)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 font-semibold shadow-2xs">
                          {activeGoogleKeysCount} keys • ~{totalGoogleRPD.toLocaleString('vi-VN')} requests/ngày Free
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href="https://aistudio.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-900 dark:text-slate-100 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Lấy API Key tại aistudio.google.com</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Mỗi tài khoản Google được cấp <strong className="text-slate-900 dark:text-slate-200">15 RPM</strong> (lượt/phút) và <strong className="text-slate-900 dark:text-slate-200">1.500 RPD</strong> (lượt/ngày) hoàn toàn miễn phí. Khi bạn thêm nhiều tài khoản Google, hệ thống sẽ <strong className="text-slate-900 dark:text-slate-200">tự động xoay vòng Round-Robin</strong> và tự động chuyển sang key khác nếu một key chạm giới hạn 15 RPM.
                </p>

                {/* List of Google Keys */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Key className="size-3.5 text-slate-700 dark:text-slate-300" />
                      <span>Danh sách API Keys Google trong Pool ({geminiKeys.length} keys):</span>
                    </label>
                    <motion.button
                      type="button"
                      onClick={() => handleTestGeminiConnection()}
                      disabled={testingGemini || geminiKeys.length === 0}
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`size-3 ${testingGemini ? "animate-spin" : ""}`} />
                      <span>{testingGemini ? "Đang test..." : "Test kết nối Pool Google"}</span>
                    </motion.button>
                  </div>

                  <div className="bg-slate-50/50 dark:bg-neutral-950/40 rounded-2xl border border-slate-200/90 dark:border-neutral-800 divide-y divide-slate-100 dark:divide-neutral-800/80 overflow-hidden shadow-2xs">
                    {geminiKeys.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Chưa có Google API Key nào trong Pool. Hãy thêm key từ các tài khoản Google của bạn bên dưới.
                      </div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {geminiKeys.map((k, index) => {
                          const isRateLimited = k.status === "rate_limited" && k.rpmLimitResetAt && k.rpmLimitResetAt > Date.now()
                          return (
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
                                <span className="size-6 rounded-lg bg-white dark:bg-neutral-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-neutral-700">
                                  #{index + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                      {k.label}
                                    </span>
                                    {isRateLimited ? (
                                      <span className="inline-block px-2 py-0.2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-full text-[10px] border border-amber-200 dark:border-amber-800 font-semibold">
                                        15 RPM Cooldown
                                      </span>
                                    ) : (
                                      <span className="inline-block px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] border border-emerald-200 dark:border-emerald-800 font-semibold">
                                        Active (1.500 RPD)
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-slate-400 dark:text-slate-500 text-[11px]">
                                    {maskKey(k.key)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <motion.div {...tactileProps.iconButton}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleTestGeminiConnection(k.key)}
                                    disabled={testingGemini}
                                    className="size-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl cursor-pointer"
                                    title="Test kết nối riêng key này"
                                  >
                                    <RefreshCw className="size-3.5" />
                                  </Button>
                                </motion.div>
                                <motion.div {...tactileProps.iconButton}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveGeminiKey(k.id)}
                                    className="size-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer"
                                    title="Xóa key này"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </motion.div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                </div>

                {/* Add new Google Key form */}
                <div className="bg-slate-50/60 dark:bg-neutral-950/30 p-3.5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-2xs space-y-2.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Plus className="size-3.5 text-slate-700 dark:text-slate-300" />
                    <span>Thêm Google AI Studio Key mới (tài khoản khác):</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      value={newGeminiKeyLabel}
                      onChange={(e) => setNewGeminiKeyLabel(e.target.value)}
                      placeholder="Nhãn (VD: Account Google B, Backup Key 2)..."
                      className="text-xs rounded-xl border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-slate-100 h-9.5"
                    />
                    <Input
                      type="password"
                      value={newGeminiKeyInput}
                      onChange={(e) => setNewGeminiKeyInput(e.target.value)}
                      placeholder="AIzaSy... (Dán API Key)"
                      className="text-xs font-mono rounded-xl border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-slate-100 h-9.5"
                    />
                    <motion.div {...tactileProps.button}>
                      <Button
                        type="button"
                        onClick={handleAddGeminiKey}
                        className="w-full rounded-xl text-xs font-semibold cursor-pointer bg-slate-900 hover:bg-slate-800 active:bg-slate-950 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white shadow-xs h-9.5"
                      >
                        <Plus className="size-3.5 mr-1" />
                        <span>Lưu Key vào Google Pool</span>
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {/* Gemini Test Result Feedback */}
                <AnimatePresence>
                  {geminiTestResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={springs.snappy}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-2xs ${
                        geminiTestResult.success
                          ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                          : "bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {geminiTestResult.success ? (
                          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        )}
                        <span className="font-semibold">{geminiTestResult.message}</span>
                      </div>
                      {geminiTestResult.latencyMs > 0 && (
                        <span className="font-mono text-[11px] font-bold opacity-80 shrink-0">
                          {geminiTestResult.latencyMs}ms
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Row 1: Model Selection & Test Button */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5 flex items-center gap-1.5">
                    <Cpu className="size-3.5 text-slate-700 dark:text-slate-300" />
                    <span>
                      Mô hình AI Mặc định (Bao gồm Google AI Studio Direct & OpenRouter Free):
                    </span>
                  </label>
                  <DropdownMenu
                    className="w-full bg-white dark:bg-neutral-900 border-slate-200/90 dark:border-neutral-700 rounded-xl"
                    menuClassName="w-full min-w-80 max-h-80 overflow-y-auto"
                    value={selectedModel}
                    onChange={handleAddModelChange}
                    options={POPULAR_AI_MODELS.map((m) => ({
                      value: m.id,
                      label: `${m.name} · ${m.provider}`,
                      badge: (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                          {m.badge || "Free"}
                        </span>
                      ),
                    }))}
                  />
                </div>
                <div>
                  <motion.div {...tactileProps.button}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={testing || keys.length === 0}
                      className="w-full rounded-xl text-xs font-semibold gap-1.5 cursor-pointer bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-200 h-9.5 shadow-2xs"
                    >
                      <RefreshCw
                        className={`size-3.5 ${
                          testing
                            ? "animate-spin text-slate-900 dark:text-white"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      />
                      <span>{testing ? "Đang kiểm tra..." : "Test kết nối OpenRouter"}</span>
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Curated Free Models Guide Grid (Interactive Click-to-Select) */}
              <div className="bg-slate-100/80 dark:bg-neutral-900/60 rounded-2xl p-3.5 border border-slate-200/80 dark:border-neutral-800 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Gợi ý chọn 4 Model Tinh hoa (Bấm thẻ để chọn ngay):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {CURATED_FREE_MODELS.map((item) => {
                    const isSelected = selectedModel === item.id
                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectCuratedModel(item.id, item.name)}
                        {...tactileProps.card}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 shadow-xs ring-1 ring-slate-900/10"
                            : "border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-neutral-700 shadow-2xs"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold gap-1 mb-1">
                            <span className="truncate">{item.name}</span>
                            {isSelected ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-white text-slate-900 dark:bg-slate-900 dark:text-white shrink-0">
                                <Check className="size-2.5 stroke-[2.5]" />
                                <span>Đang dùng</span>
                              </span>
                            ) : (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${item.tagClass} shrink-0`}
                              >
                                {item.tag}
                              </span>
                            )}
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

              {/* OpenRouter Test Result Feedback */}
              <AnimatePresence>
                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={springs.snappy}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-2xs ${
                      testResult.success
                        ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                        : "bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      )}
                      <span className="font-semibold">{testResult.message}</span>
                    </div>
                    {testResult.latencyMs > 0 && (
                      <span className="font-mono text-[11px] font-bold opacity-80 shrink-0">
                        {testResult.latencyMs}ms
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Row 2: OpenRouter Key Rotation Pool */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Key className="size-3.5 text-slate-700 dark:text-slate-300" />
                    <span>
                      Danh sách OpenRouter API Keys trong Pool ({keys.length} keys · ~{totalOpenRouterRPD.toLocaleString('vi-VN')} requests/ngày):
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {activeOpenRouterKeysCount} key(s) đang sẵn sàng
                  </span>
                </div>

                {/* List of keys */}
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/90 dark:border-neutral-800 divide-y divide-slate-100 dark:divide-neutral-800/80 overflow-hidden shadow-2xs">
                  {keys.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Chưa có API Key nào được cài đặt. Vui lòng thêm key bên dưới.
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

                          <motion.div {...tactileProps.iconButton}>
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
                    <motion.div {...tactileProps.button}>
                      <Button
                        type="button"
                        onClick={handleAddKey}
                        className="w-full rounded-xl text-xs font-semibold cursor-pointer bg-slate-900 hover:bg-slate-800 active:bg-slate-950 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white shadow-xs h-9.5"
                      >
                        <Plus className="size-3.5 mr-1" />
                        <span>Lưu Key vào Pool</span>
                      </Button>
                    </motion.div>
                  </div>
                </div>
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
