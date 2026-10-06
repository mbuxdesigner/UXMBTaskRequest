import React, { useEffect, useState } from "react"
import { Check, CheckCircle2, ChevronDown, Eye, EyeOff, Key, RefreshCw, Server, ShieldCheck, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  POPULAR_AI_MODELS,
  getStoredAIModel,
  isAIEnabled,
  saveAIModel,
  setAIEnabled,
  testAIConnection,
  getCustomApiKey,
  saveCustomApiKey,
  removeCustomApiKey,
} from "@/services/aiService"

interface OpenRouterSettingsCardProps {
  isExpanded: boolean
  onToggleExpand: () => void
}

function maskApiKey(key: string): string {
  if (!key) return ""
  if (key.length <= 12) return "••••••••"
  const prefix = key.slice(0, 8)
  const suffix = key.slice(-4)
  return `${prefix}••••••••${suffix}`
}

export function OpenRouterSettingsCard({ isExpanded, onToggleExpand }: OpenRouterSettingsCardProps) {
  const [enabled, setEnabled] = useState(true)
  const [model, setModel] = useState("")
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [savedKey, setSavedKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null)

  useEffect(() => {
    setEnabled(isAIEnabled())
    setModel(getStoredAIModel())
    const stored = getCustomApiKey()
    setSavedKey(stored)
    setApiKeyInput(stored)
  }, [])

  const handleSaveKey = () => {
    const trimmed = apiKeyInput.trim()
    saveCustomApiKey(trimmed)
    setSavedKey(trimmed)
    if (trimmed) {
      toast.success("Đã lưu cấu hình OpenRouter API Key!")
    } else {
      toast.info("Đã xóa API Key tùy chỉnh, hệ thống sẽ sử dụng key mặc định từ máy chủ.")
    }
  }

  const handleClearKey = () => {
    removeCustomApiKey()
    setApiKeyInput("")
    setSavedKey("")
    toast.info("Đã xóa OpenRouter API Key.")
  }

  const testGateway = async () => {
    setTesting(true)
    setStatus(null)
    try {
      const activeKey = apiKeyInput.trim() || savedKey || undefined
      setStatus(await testAIConnection(activeKey, model))
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-neutral-800 dark:bg-card">
      <button type="button" onClick={onToggleExpand} className="flex w-full items-center justify-between gap-3 p-4 text-left">
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
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-4 border-t border-slate-200/80 p-4 dark:border-neutral-800">
              {/* Security Banner */}
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

              {/* Model selection */}
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

              {/* API Key Configuration Section */}
              <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <Key className="size-3.5 text-slate-600 dark:text-slate-400" />
                    <span>OpenRouter API Key (Cấu hình quản trị AI)</span>
                  </label>
                  {savedKey ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <CheckCircle2 className="size-3" /> Đã lưu key ({maskApiKey(savedKey)})
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      Chưa lưu key riêng (Dùng key máy chủ)
                    </span>
                  )}
                </div>

                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Dán API Key OpenRouter (dạng <code className="font-mono text-[10px] text-slate-700 dark:text-slate-300">sk-or-v1-...</code>) để toàn bộ tính năng AI Chats, Copilot & Mermaid hoạt động liên tục:
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="sk-or-v1-xxxxxxxxxxxxxxxx..."
                      className="h-9.5 text-xs font-mono rounded-xl bg-white dark:bg-neutral-800 pr-10"
                      startIcon={<Key className="size-3.5 text-slate-400" />}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                      title={showApiKey ? "Ẩn API Key" : "Hiện API Key"}
                    >
                      {showApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleSaveKey}
                      className="h-9.5 px-3.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 cursor-pointer shadow-xs shrink-0"
                    >
                      <Check className="size-3.5 mr-1" />
                      Lưu Key
                    </Button>

                    {savedKey && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClearKey}
                        className="h-9.5 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-slate-200 dark:border-neutral-700 rounded-xl cursor-pointer shrink-0"
                        title="Xóa API Key đã lưu"
                      >
                        <Trash2 className="size-3.5 mr-1" />
                        Xóa
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Test Gateway Action & Status */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={testGateway} disabled={testing || !enabled} className="h-9 rounded-xl border-slate-200 dark:border-neutral-700">
                  <RefreshCw className={cn("mr-1.5 size-3.5", testing && "animate-spin")} />
                  {testing ? "Đang kiểm tra..." : "Kiểm tra gateway"}
                </Button>
                {status && (
                  <span className={cn("flex items-center gap-1.5 text-xs font-medium", status.success ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                    {status.success && <CheckCircle2 className="size-3.5 shrink-0" />}
                    {status.message}{status.latencyMs > 0 ? ` (${status.latencyMs}ms)` : ""}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
