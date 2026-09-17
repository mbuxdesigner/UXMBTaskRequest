import React from "react"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * ReUI-compliant Skeletons matching exact screen dimensions
 * Based on https://reui.io/components/skeleton
 */

// ─── 1. Dashboard Skeleton (TongQuanPage) ────────────────────────
export function OverviewContentSkeleton() {
  return (
    <div data-testid="overview-content-skeleton" className="space-y-4">
      {/* ROW 1: 4 Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4.5 items-stretch">
        {/* Card 1: Backlog & Pending */}
        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col justify-between h-full min-w-0">
          <div className="flex items-center justify-between px-3 py-1.5 min-w-0">
            <Skeleton className="h-4 w-28 rounded-md bg-neutral-200/80" />
            <Skeleton className="size-4 rounded-full bg-neutral-200/80 shrink-0 ml-1" />
          </div>
          <div className="rounded-xl border border-neutral-200/70 bg-white p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-3 min-h-[110px] min-w-0">
            {/* Donut circle skeleton */}
            <div className="w-[98px] h-[98px] shrink-0 flex items-center justify-center">
              <Skeleton className="size-20 rounded-full border-8 border-slate-100" />
            </div>
            {/* 3 Status items */}
            <div className="flex-1 space-y-2.5 py-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-2 rounded-xs bg-emerald-200" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
                <Skeleton className="h-3.5 w-6 rounded-md" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-2 rounded-xs bg-amber-200" />
                  <Skeleton className="h-3 w-16 rounded-md" />
                </div>
                <Skeleton className="h-3.5 w-6 rounded-md" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-2 rounded-xs bg-purple-200" />
                  <Skeleton className="h-3 w-12 rounded-md" />
                </div>
                <Skeleton className="h-3.5 w-6 rounded-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Workload / Capacity */}
        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col justify-between h-full min-w-0">
          <div className="flex items-center justify-between px-3 py-1.5 min-w-0">
            <Skeleton className="h-4 w-28 rounded-md bg-neutral-200/80" />
            <Skeleton className="size-4 rounded-md bg-neutral-200/80 shrink-0 ml-1" />
          </div>
          <div className="rounded-xl border border-neutral-200/70 bg-white p-3 sm:p-3.5 shadow-2xs flex flex-col flex-1 justify-between min-h-[110px] min-w-0">
            <div className="flex items-baseline justify-between gap-x-2 gap-y-1 flex-wrap my-auto py-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <Skeleton className="h-9 w-14 rounded-lg" />
                <Skeleton className="h-3.5 w-12 rounded-md" />
              </div>
              <Skeleton className="h-5 w-20 rounded-md ml-auto" />
            </div>
            <div className="rounded-lg bg-neutral-50/60 border border-neutral-100/80 px-2 sm:px-2.5 py-1.5 flex items-center justify-between text-xs mt-1.5 min-w-0">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-5 w-24 rounded border border-neutral-200/60" />
            </div>
          </div>
        </div>

        {/* Card 3: Tỷ lệ Đúng hạn (On-time Delivery) */}
        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col justify-between h-full min-w-0">
          <div className="flex items-center justify-between px-3 py-1.5 min-w-0">
            <Skeleton className="h-4 w-32 rounded-md bg-neutral-200/80" />
            <Skeleton className="size-4 rounded-md bg-neutral-200/80 shrink-0 ml-1" />
          </div>
          <div className="rounded-xl border border-neutral-200/70 bg-white p-3 sm:p-3.5 shadow-2xs flex flex-col flex-1 justify-between min-h-[110px] min-w-0">
            <div className="flex items-baseline justify-between gap-x-2 gap-y-1 flex-wrap my-auto py-1 min-w-0">
              <div className="flex items-baseline gap-1">
                <Skeleton className="h-9 w-16 rounded-lg" />
                <Skeleton className="h-6 w-5 rounded-md" />
              </div>
              <Skeleton className="h-5 w-24 rounded-md ml-auto" />
            </div>
            <div className="rounded-lg bg-neutral-50/60 border border-neutral-100/80 px-2 sm:px-2.5 py-1.5 flex items-center justify-between text-xs mt-1.5 min-w-0">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-5 w-28 rounded border border-neutral-200/60" />
            </div>
          </div>
        </div>

        {/* Card 4: Tốc độ Xử lý (Cycle Time) */}
        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col justify-between h-full min-w-0">
          <div className="flex items-center justify-between px-3 py-1.5 min-w-0">
            <Skeleton className="h-4 w-32 rounded-md bg-neutral-200/80" />
            <Skeleton className="size-4 rounded-md bg-neutral-200/80 shrink-0 ml-1" />
          </div>
          <div className="rounded-xl border border-neutral-200/70 bg-white p-3 sm:p-3.5 shadow-2xs flex flex-col flex-1 justify-between min-h-[110px] min-w-0">
            <div className="flex items-baseline justify-between gap-x-2 gap-y-1 flex-wrap my-auto py-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <Skeleton className="h-9 w-12 rounded-lg" />
                <Skeleton className="h-3.5 w-14 rounded-md" />
              </div>
              <Skeleton className="h-5 w-24 rounded-md ml-auto" />
            </div>
            <div className="rounded-lg bg-neutral-50/60 border border-neutral-100/80 px-2 sm:px-2.5 py-1.5 flex items-center justify-between text-xs mt-1.5 min-w-0">
              <Skeleton className="h-3.5 w-28 rounded-md" />
              <Skeleton className="h-5 w-24 rounded border border-neutral-200/60" />
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: NewsFeed (1 col) + Squad Trending (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4.5 items-stretch">
        {/* Left: NewsFeed */}
        <div className="lg:col-span-1 h-full min-w-0">
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col h-[340px] min-w-0">
            <div className="flex items-center justify-between px-3 py-1.5">
              <Skeleton className="h-4 w-20 rounded-md bg-neutral-200/80" />
              <Skeleton className="h-4 w-24 rounded-md bg-neutral-200/80" />
            </div>
            <div className="rounded-xl border border-neutral-200/70 bg-white p-3.5 shadow-2xs flex-1 flex flex-col justify-between space-y-3">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Skeleton className="size-5 rounded-full shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-20 rounded-md" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Squad Trending Chart */}
        <div className="lg:col-span-2 h-full min-w-0">
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col h-[340px] min-w-0">
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28 rounded-md bg-neutral-200/80" />
                <Skeleton className="h-4 w-24 rounded-full bg-neutral-200/80" />
              </div>
              <Skeleton className="h-7 w-44 rounded-lg bg-neutral-200/80" />
            </div>
            <div className="rounded-xl border border-neutral-200/70 bg-white p-3.5 shadow-2xs flex-1 flex flex-col justify-between">
              <div className="h-[210px] w-full flex items-end justify-between gap-3 px-3 pt-4 border-b border-slate-100">
                {[...Array(8)].map((_, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <Skeleton
                      className="w-full rounded-t-lg"
                      style={{ height: `${[35, 55, 70, 45, 80, 65, 90, 60][idx]}%` }}
                    />
                    <Skeleton className="h-2.5 w-8 rounded-md" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 pt-2">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3: Full-width Track Task Gantt Roadmap */}
      <div className="w-full">
        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-3 py-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-44 rounded-md bg-neutral-200/80" />
              <Skeleton className="h-4 w-20 rounded-full bg-neutral-200/80" />
            </div>
            <Skeleton className="h-4 w-28 rounded-md bg-neutral-200/80" />
          </div>
          <div className="rounded-xl border border-neutral-200/70 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100">
              <Skeleton className="h-4 w-32 rounded-md" />
              <div className="flex items-center gap-8">
                <Skeleton className="h-3 w-12 rounded" />
                <Skeleton className="h-3 w-12 rounded" />
                <Skeleton className="h-3 w-12 rounded" />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            </div>
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-40 rounded shrink-0" />
                <Skeleton className="h-7 w-[45%] rounded-lg" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-32 rounded shrink-0" />
                <div className="w-[15%]" />
                <Skeleton className="h-7 w-[55%] rounded-lg" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-44 rounded shrink-0" />
                <div className="w-[8%]" />
                <Skeleton className="h-7 w-[40%] rounded-lg" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-36 rounded shrink-0" />
                <div className="w-[25%]" />
                <Skeleton className="h-7 w-[50%] rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="w-full space-y-5 text-slate-900 pb-8">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-24 rounded-md" />
            <span className="text-slate-300">/</span>
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-32 rounded-xl" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-xl self-start sm:self-auto" />
      </div>

      {/* Product Pills Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <Skeleton className="h-7 w-20 rounded-xl" />
        <Skeleton className="h-7 w-24 rounded-xl" />
        <Skeleton className="h-7 w-26 rounded-xl" />
        <Skeleton className="h-7 w-24 rounded-xl" />
        <Skeleton className="h-7 w-18 rounded-xl" />
        <Skeleton className="h-7 w-18 rounded-xl" />
      </div>

      {/* 6 Bento Frames Skeleton */}
      <OverviewContentSkeleton />
    </div>
  )
}

// ─── 2. Table Rows Skeleton (SolutionAgentsTable) ────────────────
export function TableRowsSkeleton({ rowCount = 6 }: { rowCount?: number }) {
  return (
    <>
      {[...Array(rowCount)].map((_, i) => (
        <tr key={`table-skel-${i}`} className="h-14 border-b border-slate-100 bg-white/80">
          {/* Tên yêu cầu & Mã */}
          <td className="px-4 py-3">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-4/5 rounded-md" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-3 w-28 rounded-md" />
              </div>
            </div>
          </td>

          {/* Squad */}
          <td className="px-3 py-3">
            <Skeleton className="h-6 w-24 rounded-full" />
          </td>

          {/* Created by */}
          <td className="px-3 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-full shrink-0" />
              <Skeleton className="h-3.5 w-20 rounded-md" />
            </div>
          </td>

          {/* Designer */}
          <td className="px-3 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-full shrink-0" />
              <Skeleton className="h-3.5 w-20 rounded-md" />
            </div>
          </td>

          {/* Khâu UX / Status */}
          <td className="px-3 py-3">
            <Skeleton className="h-6 w-24 rounded-full" />
          </td>

          {/* Độ ưu tiên */}
          <td className="px-3 py-3 text-right">
            <Skeleton className="h-5 w-14 rounded-full ml-auto" />
          </td>

          {/* Release Date */}
          <td className="px-3 py-3 text-right">
            <Skeleton className="h-3.5 w-16 rounded-md ml-auto" />
          </td>

          {/* Action */}
          <td className="px-3 py-3 text-right w-[48px] min-w-[48px] sticky right-0 z-10 bg-white/95 backdrop-blur-xs shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)]">
            <Skeleton className="size-7 rounded-lg ml-auto" />
          </td>
        </tr>
      ))}
    </>
  )
}

// ─── 3. Kanban Skeleton (KanbanBoard) ─────────────────────────────
export function KanbanBoardSkeleton({ columnCount = 6 }: { columnCount?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 w-full">
      {[...Array(columnCount)].map((_, colIdx) => (
        <div
          key={`kanban-col-${colIdx}`}
          className="w-72 shrink-0 bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3 flex flex-col gap-3 min-h-[520px]"
        >
          {/* Column Header */}
          <div className="flex items-center justify-between px-1 py-1">
            <div className="flex items-center gap-2">
              <Skeleton className="size-2.5 rounded-full" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
            <Skeleton className="size-5 rounded-full" />
          </div>

          {/* Task Cards Skeleton */}
          <div className="space-y-3 flex-1">
            {[...Array(colIdx % 2 === 0 ? 3 : 2)].map((_, cardIdx) => (
              <div
                key={`kcard-${colIdx}-${cardIdx}`}
                className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-16 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-4/5 rounded-md" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="size-5 rounded-full" />
                    <Skeleton className="h-3 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-3.5 w-10 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── 4. Grid Cards Skeleton (TrackRequestPage Grid Mode) ───────────
export function GridCardsSkeleton({ cardCount = 6 }: { cardCount?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 animate-in fade-in-30 duration-200">
      {[...Array(cardCount)].map((_, i) => (
        <div
          key={`grid-card-skel-${i}`}
          className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4"
        >
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="h-3.5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-4 w-12 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── 5. Form Skeleton (CreateRequestPage / RequestForm) ───────────
export function FormSkeleton() {
  return (
    <div className="space-y-8 pb-16 animate-in fade-in-30 duration-200">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column Form */}
        <div className="w-full xl:col-span-8 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-36 rounded-md" />
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-md" />
          </div>

          {/* Section 01 */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-40 rounded-md" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 02 */}
          <div className="space-y-4 pt-2">
            <Skeleton className="h-4 w-64 rounded-md" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 03 */}
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-8 w-48 rounded-xl" />
            </div>
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        </div>

        {/* Right Floating Card */}
        <div className="w-full xl:col-span-4 xl:sticky xl:top-20">
          <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-xl space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-6 w-full rounded-lg" />
            </div>
            <div className="space-y-3 pt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-3.5 w-24 rounded-md" />
                  <Skeleton className="h-4 w-28 rounded-md" />
                </div>
              ))}
            </div>
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 6. Generic Page Loading Skeleton (App.tsx fallback) ─────────
export function PageSkeleton() {
  return (
    <div className="w-full space-y-6 animate-in fade-in-30 duration-200">
      <div className="space-y-2">
        <Skeleton className="h-4 w-36 rounded-md" />
        <Skeleton className="h-8 w-64 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="size-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
        <Skeleton className="h-5 w-48 rounded-md" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  )
}

// ─── 7. Squad Capacity Cards Skeleton (SquadCapacityOverview) ─────
export function SquadCapacitySkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div
          key={`squad-skel-${i}`}
          className="rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col gap-4 shadow-2xs overflow-hidden"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-5 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-3.5 w-8 rounded-md" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>

          <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="flex flex-col items-center gap-1">
              <Skeleton className="h-5 w-6 rounded-md" />
              <Skeleton className="h-2.5 w-10 rounded-md" />
            </div>
            <div className="flex flex-col items-center gap-1 border-x border-slate-200/80 px-1">
              <Skeleton className="h-5 w-6 rounded-md" />
              <Skeleton className="h-2.5 w-10 rounded-md" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-2.5 w-8 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── 8. Management Skeleton (QuanLyPage) ─────────────────────────
export function ManagementSkeleton() {
  return (
    <div className="w-full space-y-6 animate-in fade-in-30 duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-32 rounded-md" />
            <span className="text-slate-300">/</span>
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Tabs list skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={`tab-skel-${i}`} className="h-10 w-36 rounded-xl shrink-0" />
        ))}
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={`mstat-skel-${i}`} className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="size-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-3 w-36 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Table / Container */}
      <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {[...Array(6)].map((_, idx) => (
            <div key={`mrow-${idx}`} className="h-14 rounded-xl border border-slate-100 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-3 w-48 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="size-7 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 9. Table Row Skeleton Placeholder (SolutionAgentsTable Real-time Insertion) ───
export function TableRowSkeletonPlaceholder({ className }: { className?: string }) {
  return (
    <motion.tr
      layout="position"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
      transition={{
        layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: 0.25 },
        height: { duration: 0.35 },
      }}
      className={cn(
        "h-14 border-b border-slate-200/80 bg-blue-50/20 relative overflow-hidden select-none",
        className
      )}
    >
      {/* 1. Yêu cầu / Task & Luồng nghiệp vụ */}
      <td className="px-4 sm:px-5 py-3.5 sm:py-4 align-middle relative overflow-hidden contain-paint">
        <div className="flex flex-col gap-1.5 min-w-0">
          <Skeleton className="h-4 w-4/5 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
        </div>
      </td>

      {/* 2. Squad / Sản phẩm */}
      <td className="px-3 sm:px-4 py-3.5 sm:py-4 align-middle relative overflow-hidden contain-paint">
        <div className="flex flex-col gap-1.5 min-w-0">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-3 w-14 rounded-md" />
        </div>
      </td>

      {/* 3. Created by */}
      <td className="px-3 sm:px-4 py-3.5 sm:py-4 align-middle relative overflow-hidden contain-paint">
        <div className="flex items-center gap-2 min-w-0">
          <Skeleton className="size-6 rounded-full shrink-0" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
      </td>

      {/* 4. Designer */}
      <td className="px-3 sm:px-4 py-3.5 sm:py-4 align-middle relative overflow-hidden contain-paint">
        <div className="flex items-center gap-2 min-w-0">
          <Skeleton className="size-6 rounded-full shrink-0" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
      </td>

      {/* 5. Trạng thái */}
      <td className="px-3 sm:px-4 py-3.5 sm:py-4 align-middle relative overflow-hidden contain-paint">
        <Skeleton className="h-6 w-24 rounded-4xl" />
      </td>

      {/* 6. Priority */}
      <td className="px-3 sm:px-4 py-3.5 sm:py-4 align-middle text-right relative overflow-hidden contain-paint">
        <Skeleton className="h-6 w-14 rounded-4xl ml-auto" />
      </td>

      {/* 7. Release */}
      <td className="px-3 sm:px-4 py-3.5 sm:py-4 align-middle text-right relative overflow-hidden contain-paint">
        <Skeleton className="h-3.5 w-16 rounded-md ml-auto" />
      </td>

      {/* 8. Action */}
      <td className="px-2 sm:px-3 py-3.5 sm:py-4 align-middle text-right w-[48px] min-w-[48px] sticky right-0 z-10 bg-white/95 backdrop-blur-xs shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)]">
        <Skeleton className="size-7 rounded-4xl ml-auto" />
      </td>
    </motion.tr>
  )
}

