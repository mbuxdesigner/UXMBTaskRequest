import { useEffect, useState } from "react"
import { CheckCircle2, ChevronDown, RefreshCw, Server, ShieldCheck, Sparkles } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { springs } from "@/lib/motion"
import {
  POPULAR_AI_MODELS,
  getStoredAIModel,
  isAIEnabled,
  purgeClientAIKeys,
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
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null)

  useEffect(() => {
    purgeClientAIKeys()
    setEnabled(isAIEnabled())
    setModel(getStoredAIModel())
  }, [])

  const handleTestGateway = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testAIConnection(undefined, model)
    setTestResult(result)
    setTesting(false)
    if (result.success) toast.success(`AI Gateway hoạt động (${result.latencyMs}ms)`)
    else toast.error(result.message)
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-card">
      <button type="button" onClick={onToggleExpand} className="flex w-full items-center justify-between gap-4 p-5 text-left">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
            <Server className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-950 dark:text-white">AI Gateway nội bộ</h3>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Server managed</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Provider key được quản lý ở máy chủ và không đi qua trình duyệt.</p>
          </div>
        </div>
        <ChevronDown className={cn("size-5 shrink-0 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={springs.snappy} className="overflow-hidden">
            <div className="space-y-4 border-t border-slate-100 p-5 dark:border-neutral-800">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">Bật AI cho portal</p>
                    <p className="text-[11px] text-slate-500">Mọi request đi qua gateway có xác thực và rate limit.</p>
                  </div>
                </div>
                <button type="button" role="switch" aria-checked={enabled} onClick={() => { const next = !enabled; setEnabled(next); setAIEnabled(next) }} className={cn("h-5 w-9 rounded-full p-0.5 transition-colors", enabled ? "bg-emerald-600" : "bg-slate-300")}>
                  <span className={cn("block size-4 rounded-full bg-white transition-transform", enabled && "translate-x-4")} />
                </button>
              </div>

              <label className="block space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1.5"><Sparkles className="size-3.5 text-amber-500" />Model được phép</span>
                <select value={model} onChange={(event) => { setModel(event.target.value); saveAIModel(event.target.value) }} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-100">
                  {POPULAR_AI_MODELS.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.provider})</option>)}
                </select>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-neutral-800">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {testResult ? <span className={cn("flex items-center gap-1.5", testResult.success ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>{testResult.success && <CheckCircle2 className="size-3.5" />}{testResult.message}</span> : "Kiểm tra xác thực, model allowlist và cấu hình server."}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleTestGateway} disabled={testing || !enabled} className="rounded-xl">
                  <RefreshCw className={cn("mr-1.5 size-3.5", testing && "animate-spin")} />{testing ? "Đang kiểm tra..." : "Kiểm tra gateway"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
