import React, { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  FileText,
  Check,
  Loader2,
  ShieldAlert,
  CalendarCheck,
  Layers,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getRequestDisplayTitle, type UXRequest } from "@/data/mockData"

export interface AgentActivityTraceProps {
  activeTasks: UXRequest[]
  summaryProjects: UXRequest[]
  riskProjects: UXRequest[]
  goLiveTasks: UXRequest[]
  dominantPhaseText: string
  isRefreshing?: boolean
  onComplete?: () => void
  onOpenTask?: (task: UXRequest) => void
  mode?: "live" | "inspector"
  onCloseInspector?: () => void
}

export function AgentActivityTrace({
  activeTasks,
  summaryProjects,
  riskProjects,
  goLiveTasks,
  dominantPhaseText,
  isRefreshing = true,
  onComplete,
  onOpenTask,
  mode = "live",
  onCloseInspector,
}: AgentActivityTraceProps) {
  // Step state for live animation:
  // Step 1: Searching (query scan)
  // Step 2: Reviewing sources (reading key project specs)
  // Step 3: Checking records (risk & go-live checks)
  // Step 4: Synthesizing (ready)
  const isInspector = mode === "inspector"
  const [currentStep, setCurrentStep] = useState<number>(isInspector ? 4 : 1)
  const [sourcesRevealed, setSourcesRevealed] = useState<number>(isInspector ? 3 : 0)
  const [checksRevealed, setChecksRevealed] = useState<number>(isInspector ? 2 : 0)
  const [isFinished, setIsFinished] = useState<boolean>(isInspector)

  // Top sources to display
  const keySources = summaryProjects.slice(0, 3)

  // Status text mapping
  const statusLabel = isFinished
    ? `Đã đọc ${keySources.length} nguồn dự án và đối soát 2 tiêu chí`
    : currentStep === 1
    ? "Đang quét danh mục công việc & yêu cầu UX..."
    : currentStep === 2
    ? `Đang đọc nguồn dữ liệu dự án (${Math.min(sourcesRevealed, keySources.length)}/${keySources.length})...`
    : currentStep === 3
    ? "Đang đối soát rủi ro & cột mốc Go-Live..."
    : "Đang hoàn tất bản tin điều hành..."

  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (isInspector || !isRefreshing) return

    setCurrentStep(1)
    setSourcesRevealed(0)
    setChecksRevealed(0)
    setIsFinished(false)

    // Timeline progressive sequence
    // t=0ms: Step 1 (Searching - 1/4)
    // t=200ms: Step 2 starts (Reading sources - 2/4)
    const t1 = setTimeout(() => {
      setCurrentStep(2)
      setSourcesRevealed(1)
    }, 200)

    // t=400ms: Step 2 reveal 2nd source
    const t2 = setTimeout(() => {
      setSourcesRevealed(2)
    }, 400)

    // t=600ms: Step 2 reveal 3rd source
    const t3 = setTimeout(() => {
      setSourcesRevealed(3)
    }, 600)

    // t=750ms: Step 3 (Checking risk & milestones - 3/4)
    const t4 = setTimeout(() => {
      setCurrentStep(3)
      setChecksRevealed(1)
    }, 750)

    // t=900ms: Step 3 second check
    const t5 = setTimeout(() => {
      setChecksRevealed(2)
    }, 900)

    // t=1050ms: Step 4 (Synthesizing answer & marked finished - 4/4)
    const t6 = setTimeout(() => {
      setCurrentStep(4)
      setIsFinished(true)
    }, 1050)

    // t=1200ms: Complete and hand over to full summary
    const t7 = setTimeout(() => {
      onCompleteRef.current?.()
    }, 1200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      clearTimeout(t5)
      clearTimeout(t6)
      clearTimeout(t7)
    }
  }, [isRefreshing, isInspector])

  return (
    <div
      onClick={!isInspector ? () => onCompleteRef.current?.() : undefined}
      className={cn("flex w-full flex-col gap-2.5 py-0.5 font-sans select-none", !isInspector && "cursor-pointer")}
      title={!isInspector ? "Nhấn để xem tóm tắt ngay" : undefined}
    >
      {/* Top Status Pill (ReUI Marker Style) */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          {isFinished ? (
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-3 w-3 stroke-[2.5]" />
            </div>
          ) : (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 shrink-0" />
          )}
          <span className="truncate font-semibold text-neutral-800 text-[11px] sm:text-xs">
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200/60 tabular-nums">
            {currentStep}/4
          </span>
          {isInspector && onCloseInspector && (
            <button
              type="button"
              onClick={onCloseInspector}
              className="text-[10px] font-medium text-neutral-500 hover:text-neutral-800 underline"
            >
              Đóng
            </button>
          )}
        </div>
      </div>

      {/* Stepper Vertical Timeline Track */}
      <div className="relative pl-5 before:absolute before:left-2 before:top-2.5 before:bottom-2 before:w-px before:bg-neutral-200/80 space-y-3">
        {/* Step 1: Quét danh mục công việc (Searching) */}
        <div className="relative">
          <div
            className={cn(
              "absolute -left-5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold transition-colors",
              currentStep > 1
                ? "bg-purple-600 text-white"
                : currentStep === 1
                ? "bg-purple-600 text-white ring-4 ring-purple-100 animate-pulse"
                : "bg-neutral-200 text-neutral-500"
            )}
          >
            {currentStep > 1 ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : 1}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-800 text-[11px]">
              Quét danh mục công việc
            </span>
            <span className="text-[10px] font-medium text-neutral-400 tabular-nums">
              active
            </span>
          </div>

          <div className="mt-1 rounded-lg border border-neutral-200/70 bg-neutral-50/70 p-2 text-xs text-neutral-700 flex items-center gap-2 shadow-2xs">
            <Search className="h-3 w-3 text-neutral-400 shrink-0" />
            <span className="truncate text-[11px] font-medium text-neutral-700">
              Yêu cầu UX: {activeTasks.length} task active · {dominantPhaseText}
            </span>
          </div>
        </div>

        {/* Step 2: Đọc nguồn dữ liệu dự án trọng điểm (Reviewing sources) */}
        {currentStep >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <div
              className={cn(
                "absolute -left-5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold transition-colors",
                currentStep > 2
                  ? "bg-purple-600 text-white"
                  : currentStep === 2
                  ? "bg-purple-600 text-white ring-4 ring-purple-100 animate-pulse"
                  : "bg-neutral-200 text-neutral-500"
              )}
            >
              {currentStep > 2 ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : 2}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-800 text-[11px]">
                Đọc nguồn dữ liệu dự án
              </span>
              <span className="rounded bg-neutral-100 px-1.5 py-0.2 text-[10px] font-mono text-neutral-600 border border-neutral-200/70 tabular-nums">
                {Math.min(sourcesRevealed, keySources.length)}/{keySources.length} nguồn
              </span>
            </div>

            <div className="mt-1 rounded-lg border border-neutral-200/70 bg-neutral-50/70 divide-y divide-neutral-200/50 shadow-2xs overflow-hidden">
              {keySources.slice(0, sourcesRevealed).map((task, idx) => (
                <div
                  key={task.request_id || idx}
                  onClick={() => onOpenTask && onOpenTask(task)}
                  className="flex items-center justify-between px-2.5 py-1 text-xs hover:bg-neutral-100/70 cursor-pointer transition-colors"
                  title="Bấm để xem chi tiết task"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] font-bold text-neutral-400">
                      [{idx + 1}]
                    </span>
                    <span className="truncate font-medium text-neutral-800 text-[11px]">
                      {getRequestDisplayTitle(task)}
                    </span>
                  </div>
                  <span className="shrink-0 text-[9px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60 ml-2">
                    {task.squad || "UX Team"}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3: Đối soát rủi ro & cột mốc Go-Live (Checking records) */}
        {currentStep >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <div
              className={cn(
                "absolute -left-5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold transition-colors",
                currentStep > 3
                  ? "bg-purple-600 text-white"
                  : currentStep === 3
                  ? "bg-purple-600 text-white ring-4 ring-purple-100 animate-pulse"
                  : "bg-neutral-200 text-neutral-500"
              )}
            >
              {currentStep > 3 ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : 3}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-800 text-[11px]">
                Đối soát rủi ro & cột mốc
              </span>
              <span className="rounded bg-neutral-100 px-1.5 py-0.2 text-[10px] font-mono text-neutral-600 border border-neutral-200/70 tabular-nums">
                2 kiểm tra
              </span>
            </div>

            <div className="mt-1 rounded-lg border border-neutral-200/70 bg-neutral-50/70 divide-y divide-neutral-200/50 shadow-2xs overflow-hidden">
              {checksRevealed >= 1 && (
                <div className="flex items-center justify-between px-2.5 py-1 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ShieldAlert className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="font-mono text-[10px] text-neutral-700">
                      assessTaskRisk()
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-neutral-600 truncate ml-2">
                    {riskProjects.length > 0
                      ? `${riskProjects.length} task chạm hạn / cần đẩy nhanh`
                      : "0 rủi ro quá hạn"}
                  </span>
                </div>
              )}
              {checksRevealed >= 2 && (
                <div className="flex items-center justify-between px-2.5 py-1 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CalendarCheck className="h-3 w-3 text-blue-500 shrink-0" />
                    <span className="font-mono text-[10px] text-neutral-700">
                      verifyMilestones()
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-neutral-600 truncate ml-2">
                    {goLiveTasks.length > 0
                      ? `${goLiveTasks.length} task có kế hoạch Go-Live tuần`
                      : "Không có Go-Live gấp"}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 4: Tổng hợp bản tin điều hành (Synthesizing) */}
        {currentStep >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <div className="absolute -left-5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold bg-emerald-600 text-white">
              <Check className="h-2.5 w-2.5 stroke-[3]" />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-800 text-[11px]">
                Tổng hợp bản tin điều hành
              </span>
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 border border-emerald-200">
                Độ tin cậy cao
              </span>
            </div>

            <p className="mt-1 text-[11px] text-neutral-500 font-medium">
              Đã sẵn sàng bản tin điều hành UX tuần mới.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
