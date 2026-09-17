import React, { useMemo } from "react"
import { Users, Activity } from "lucide-react"
import type { UXRequest } from "@/data/mockData"
import { NumberTicker } from "@/components/jolyui/number-ticker"
import { cn } from "@/lib/utils"

interface TeamCapacityCardProps {
  requests?: UXRequest[]
}

export default function TeamCapacityCard({ requests = [] }: TeamCapacityCardProps) {
  const stats = useMemo(() => {
    // 1. Quet danh sach Designer tu local cache hoac tu requests
    const designerWorkloads: Record<string, number> = {}
    const squadsSet = new Set<string>()

    let registeredDesigners: string[] = []
    try {
      const raw =
        localStorage.getItem("mbbank_admin_team") ||
        localStorage.getItem("mbbank_team_members")
      if (raw) {
        const list = JSON.parse(raw)
        if (Array.isArray(list)) {
          list.forEach((m: any) => {
            const role = (m.role || "").toLowerCase()
            if (role === "designer" || role === "design owner") {
              const name = m.name || (m.email ? m.email.split("@")[0] : "")
              if (name && !registeredDesigners.includes(name)) {
                registeredDesigners.push(name)
              }
            }
          })
        }
      }
    } catch {}

    // 2. Quet cac bai toan dang hoat dong
    requests.forEach((r) => {
      if (r.squad && r.squad.trim()) {
        squadsSet.add(r.squad.trim())
      }
      const s = (r.status || "").toLowerCase()
      const isCompleted =
        s.includes("hoan thanh") ||
        s.includes("hoàn thành") ||
        s.includes("done") ||
        s.includes("ban giao") ||
        s.includes("bàn giao") ||
        (typeof r.progress === "number" && r.progress >= 100)
      if (isCompleted) return

      const designer = r.assigned_designer?.trim()
      if (
        designer &&
        designer !== "Chưa phân công" &&
        designer !== "Unassigned" &&
        designer !== "Đang phân công"
      ) {
        designerWorkloads[designer] = (designerWorkloads[designer] || 0) + 1
        if (!registeredDesigners.includes(designer)) {
          registeredDesigners.push(designer)
        }
      }
    })

    const totalDesigners = Math.max(registeredDesigners.length, 6)
    let activeDesigners = 0
    let readyCount = 0
    let optimalCount = 0
    let overloadCount = 0

    registeredDesigners.forEach((name) => {
      const count = designerWorkloads[name] || 0
      if (count === 0) {
        readyCount++
      } else if (count <= 2) {
        optimalCount++
        activeDesigners++
      } else {
        overloadCount++
        activeDesigners++
      }
    })

    const remaining = totalDesigners - (readyCount + optimalCount + overloadCount)
    if (remaining > 0) {
      readyCount += remaining
    }

    const capacityPercent =
      totalDesigners > 0 ? Math.round((activeDesigners / totalDesigners) * 100) : 0
    const squadsCovered = squadsSet.size > 0 ? squadsSet.size : 6

    const isHighLoad = overloadCount > 0 || capacityPercent >= 85
    const badgeText = isHighLoad ? "Tải cao" : "Cân bằng"

    return {
      activeDesigners,
      totalDesigners,
      capacityPercent,
      readyCount,
      optimalCount,
      overloadCount,
      squadsCovered,
      isHighLoad,
      badgeText,
    }
  }, [requests])

  return (
    <div
      data-testid="ai-ops-team-capacity-card"
      className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col justify-between h-full min-w-0"
    >
      {/* Header on gray background */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-sm font-medium text-neutral-500">Sức chứa Đội ngũ</span>
        <Users className="size-4 text-neutral-400 stroke-[1.5]" />
      </div>

      {/* Inner White Card */}
      <div className="rounded-xl border border-neutral-200/70 bg-white p-3 sm:p-3.5 shadow-2xs flex flex-col flex-1 justify-between">
        {/* Metric Value & Badge */}
        <div className="flex items-baseline gap-2.5 my-auto py-1">
          <span className="text-5xl font-black tracking-tight text-neutral-900 font-mono tabular-nums leading-none">
            <NumberTicker value={stats.activeDesigners} />
            <span className="text-3xl text-neutral-400 font-light font-sans tracking-normal">
              /{stats.totalDesigners}
            </span>
          </span>
          <span className="font-medium text-neutral-400 text-sm sm:text-base">designers</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium border ml-1 self-center",
              stats.isHighLoad
                ? "bg-amber-50 text-amber-700 border-amber-200/70"
                : "bg-emerald-50 text-emerald-700 border-emerald-200/70"
            )}
          >
            <Activity className="size-3.5" />
            <span>{stats.badgeText}</span>
          </span>
        </div>

        {/* Footer details với khung màu nền và badge nổi bật */}
        <div className="rounded-lg bg-neutral-50/60 border border-neutral-100/80 px-2.5 py-1.5 flex items-center justify-between text-xs text-neutral-500 mt-1.5">
          <span>Công suất phân bổ:</span>
          <span className="font-semibold text-neutral-800 bg-white px-2 py-0.5 rounded border border-neutral-200/70 text-[11px] inline-flex items-center gap-1 shadow-2xs">
            <span className="font-mono font-bold text-neutral-900 tabular-nums text-xs">
              <NumberTicker value={stats.capacityPercent} />
            </span>
            <span>% capacity</span>
          </span>
        </div>
      </div>
    </div>
  )
}
