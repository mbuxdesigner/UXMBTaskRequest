import React, { useState } from "react"
import { Check, RotateCw, Circle, ChevronRight, ChevronUp, Flag, MessageSquare, Calendar } from "lucide-react"
import { timelineItems } from "@/data/aiOpsMockData"

export default function AiOpsProviderFailover() {
  const [expandedId, setExpandedId] = useState<number | null>(2)

  const toggleExpand = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div
      data-testid="ai-ops-provider-failover"
      className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col h-full min-w-0"
    >
      {/* Header on gray background */}
      <div className="px-3.5 py-2 flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-neutral-900">Provider Failover</h3>
        <p className="text-xs text-neutral-400 font-normal">3 failover checks, 1 blocked</p>
      </div>

      {/* Inner White Card */}
      <div className="rounded-xl border border-neutral-200/70 bg-white p-4 shadow-2xs flex-1 flex flex-col justify-between">
        <div className="flex flex-col relative">
          {/* Vertical Connecting line 1 (Black, active) */}
          <div
            className="absolute left-2.5 top-5 w-0.5 bg-neutral-900 z-0"
            style={{ height: "46px" }}
            aria-hidden="true"
          />

          {/* Step 1: Primary Provider */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="size-5 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0">
                <Check className="size-3 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-neutral-900">Primary Provider</span>
            </div>

            <div className="ms-7 mt-1.5 mb-4 rounded-full bg-neutral-50/80 hover:bg-neutral-100/80 border border-neutral-200/60 px-2.5 py-1 flex items-center justify-between transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80"
                  alt="Leo Grant"
                  className="size-5 rounded-full object-cover shrink-0 ring-1 ring-neutral-200"
                />
                <span className="text-xs font-medium text-neutral-700 truncate">
                  Leo Grant / Platform engineer
                </span>
              </div>
              <ChevronRight className="size-3.5 text-neutral-400 shrink-0" />
            </div>
          </div>

          {/* Vertical Connecting line 2 (Gray, pending) */}
          <div
            className="absolute left-2.5 top-[88px] bottom-6 w-0.5 bg-neutral-200 z-0"
            aria-hidden="true"
          />

          {/* Step 2: Fallback Routing */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="size-5 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0 ring-2 ring-neutral-900/10">
                <RotateCw className="size-3 text-white" strokeWidth={2.2} />
              </div>
              <span className="text-sm font-semibold text-neutral-900">Fallback Routing</span>
            </div>

            <div className="ms-7 mt-1.5 mb-4 space-y-2">
              <button
                type="button"
                onClick={() => toggleExpand(2)}
                className="w-full rounded-full bg-neutral-50/80 hover:bg-neutral-100/80 border border-neutral-200/60 px-2.5 py-1 flex items-center justify-between cursor-pointer transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80"
                    alt="Mira Stone"
                    className="size-5 rounded-full object-cover shrink-0 ring-1 ring-neutral-200"
                  />
                  <span className="text-xs font-medium text-neutral-700 truncate">
                    Mira Stone / AI product operator
                  </span>
                </div>
                {expandedId === 2 ? (
                  <ChevronUp className="size-3.5 text-neutral-500 shrink-0" />
                ) : (
                  <ChevronRight className="size-3.5 text-neutral-400 shrink-0" />
                )}
              </button>

              {expandedId === 2 && (
                <div className="rounded-xl border border-neutral-200/80 bg-white p-3 space-y-2 shadow-2xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/60">
                      <Flag className="size-3 text-purple-600" />
                      Medium
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      Watching
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-neutral-900 leading-snug">
                      Long context summaries rerouted
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      ROUTE-318 shifted 18 percent at 09:20.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
                    <div className="flex items-center -space-x-1.5">
                      <img
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80"
                        alt="Mira Stone"
                        className="size-5 rounded-full object-cover ring-2 ring-white"
                      />
                      <img
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&dpr=2&q=80"
                        alt="Theo Park"
                        className="size-5 rounded-full object-cover ring-2 ring-white"
                      />
                      <div className="size-5 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-medium text-neutral-600 flex items-center justify-center ring-2 ring-white">
                        +2
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-neutral-500 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="size-3 text-neutral-400" />
                        <span className="font-semibold text-neutral-700">3</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3 text-neutral-400" />
                        <span className="font-medium text-neutral-600">Today</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Guardrail Runner */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="size-5 rounded-full border-2 border-neutral-300 bg-white flex items-center justify-center shrink-0" />
              <span className="text-sm font-semibold text-neutral-900">Guardrail Runner</span>
            </div>

            <div className="ms-7 mt-1.5 rounded-full bg-neutral-50/80 hover:bg-neutral-100/80 border border-neutral-200/60 px-2.5 py-1 flex items-center justify-between transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80"
                  alt="Nora Vale"
                  className="size-5 rounded-full object-cover shrink-0 ring-1 ring-neutral-200"
                />
                <span className="text-xs font-medium text-neutral-700 truncate">
                  Nora Vale / Safety reviewer
                </span>
              </div>
              <ChevronRight className="size-3.5 text-neutral-400 shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

