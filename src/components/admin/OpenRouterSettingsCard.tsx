import React, { useEffect, useState } from "react"
import { CheckCircle2, ChevronDown, RefreshCw, Server, ShieldCheck } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  POPULAR_AI_MODELS,
  getStoredAIModel,
  isAIEnabled,
  saveAIModel,
  setAIEnabled,
  testAIConnection,
} from "@/services/aiService"

interface OpenRouterSettingsCardProps {
  isExpanded: boolean
  onToggleExpand: () => void
}

export function OpenRouterSettingsCard({ isExpanded, onToggleExpand }: OpenRouterSettingsCardProps) {
  const [enabled, setEnabled] = useState(true)
  const [model, setModel] = useState("")
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null)

  useEffect(() => {
    setEnabled(isAIEnabled())
    setModel(getStoredAIModel())
  }, [])

  const testGateway = async () => {
    setTesting(true)
    setStatus(null)
    try {
      setStatus(await testAIConnection(undefined, model))
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
            <div className="text-xs text-slate-500">Provider key được quản lý ở máy chủ, không lưu trên trình duyệt.</div>
          </div>
        </div>
        <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-4 border-t border-slate-200/80 p-4 dark:border-neutral-800">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                <span className="flex items-center gap-2"><ShieldCheck className="size-4" /> Xác thực theo phiên đăng nhập và giới hạn model tại server</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => {
                    const next = !enabled
                    setEnabled(next)
                    setAIEnabled(next)
                  }}
                  className={cn("h-5 w-9 rounded-full p-0.5 transition-colors", enabled ? "bg-emerald-600" : "bg-slate-300")}
                >
                  <span className={cn("block size-4 rounded-full bg-white transition-transform", enabled && "translate-x-4")} />
                </button>
              </div>

              <label className="block space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                Model mặc định được phép
                <select
                  value={model}
                  onChange={(event) => {
                    setModel(event.target.value)
                    saveAIModel(event.target.value)
                  }}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                >
                  {POPULAR_AI_MODELS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>

              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={testGateway} disabled={testing || !enabled}>
                  <RefreshCw className={cn("mr-1.5 size-3.5", testing && "animate-spin")} />
                  {testing ? "Đang kiểm tra" : "Kiểm tra gateway"}
                </Button>
                {status && (
                  <span className={cn("flex items-center gap-1 text-xs", status.success ? "text-emerald-700" : "text-rose-700")}>
                    {status.success && <CheckCircle2 className="size-3.5" />}
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
