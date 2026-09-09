import React from "react"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * ReUI-compliant Skeletons matching exact screen dimensions
 * Based on https://reui.io/components/skeleton
 */

// ─── 1. Dashboard Skeleton (TongQuanPage) ────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="w-full space-y-6 animate-in fade-in-30 duration-200">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-32 rounded-md" />
            <span className="text-slate-300">/</span>
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-36 rounded-xl self-start sm:self-auto" />
      </div>

      {/* 4 Metric / KPI Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={`kpi-skel-${i}`}
            className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="size-8 rounded-xl" />
            </div>
            <div className="flex items-baseline gap-3">
              <Skeleton className="h-9 w-16 rounded-lg" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Charts & Analytical Breakdown Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Chart (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-48 rounded-lg" />
              <Skeleton className="h-3 w-64 rounded-md" />
            </div>
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <div className="h-64 flex items-end justify-between gap-3 pt-6 px-4 border-b border-slate-100">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <Skeleton
                  className="w-full rounded-t-lg"
                  style={{ height: `${[45, 75, 90, 60, 80, 50][idx]}%` }}
                />
                <Skeleton className="h-3 w-12 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Donut / Status Breakdown (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <Skeleton className="h-3 w-48 rounded-md" />
          </div>
          <div className="py-6 flex items-center justify-center">
            <Skeleton className="size-40 rounded-full border-8 border-slate-100" />
          </div>
          <div className="space-y-2.5 pt-2">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-2.5 rounded-full" />
                  <Skeleton className="h-3.5 w-24 rounded-md" />
                </div>
                <Skeleton className="h-3.5 w-10 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Lists Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div
            key={`list-skel-${i}`}
            className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3.5"
          >
            <Skeleton className="h-5 w-40 rounded-lg" />
            <div className="space-y-3 pt-2">
              {[...Array(3)].map((_, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                      <Skeleton className="h-3 w-1/2 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
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
          <td className="px-3 py-3 text-right">
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
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 w-full animate-in fade-in-30 duration-200">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column Form */}
        <div className="lg:col-span-8 space-y-8">
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
        <div className="lg:col-span-4 sticky top-6">
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

