import React, { useState, useMemo } from "react"
import {
  Download,
  Plus,
  Funnel,
  Hash,
  X,
  FunnelX,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  MoreHorizontal,
  Workflow,
  Shield,
  Layers,
  Box,
  Cpu,
  MessageSquare,
  Network,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { routingRules, RoutingRule } from "@/data/aiOpsMockData"

function getRuleIcon(category: string, kind: string) {
  switch (category) {
    case "Long Context":
      return <Workflow className="size-4 text-purple-600" />
    case "Safety":
      return <Shield className="size-4 text-emerald-600" />
    case "Batch":
      return <Layers className="size-4 text-slate-600" />
    case "Finance":
      return <Box className="size-4 text-blue-600" />
    case "Drafting":
      return <MessageSquare className="size-4 text-amber-600" />
    default:
      return <Cpu className="size-4 text-indigo-600" />
  }
}

function getKindBadge(kind: RoutingRule["kind"]) {
  switch (kind) {
    case "fallback":
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200/70">
          Fallback
        </span>
      )
    case "guardrail":
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200/70">
          Guardrail
        </span>
      )
    case "batch":
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
          Batch
        </span>
      )
    case "primary":
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/70">
          Primary
        </span>
      )
    default:
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-50 text-neutral-600 border border-neutral-200">
          {kind}
        </span>
      )
  }
}

function getStatusBadge(status: RoutingRule["status"]) {
  switch (status) {
    case "healthy":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50/50 text-emerald-700 border border-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Healthy
        </span>
      )
    case "blocked":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50/50 text-rose-700 border border-rose-300">
          <span className="size-1.5 rounded-full bg-rose-500" />
          Blocked
        </span>
      )
    case "paused":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-300">
          <span className="size-1.5 rounded-full bg-neutral-400" />
          Paused
        </span>
      )
    case "at_risk":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50/50 text-amber-700 border border-amber-300">
          <span className="size-1.5 rounded-full bg-amber-500" />
          At Risk
        </span>
      )
  }
}

function formatTokens(num: number): string {
  if (num >= 1000000) {
    const val = (num / 1000000).toFixed(1)
    return val.endsWith(".0") ? val.slice(0, -2) + "M" : val + "M"
  }
  if (num >= 1000) {
    return Math.round(num / 1000) + "K"
  }
  return String(num)
}

export default function AiOpsRoutingRules() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<keyof RoutingRule>("reference")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Filtered and sorted rules
  const filteredRules = useMemo(() => {
    let result = [...routingRules]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (r) =>
          r.reference.toLowerCase().includes(q) ||
          r.rule.toLowerCase().includes(q) ||
          r.provider.toLowerCase().includes(q) ||
          r.scope.toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal
      }
      return sortOrder === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })

    return result
  }, [searchQuery, sortField, sortOrder])

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredRules.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRules.map((r) => r.id)))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSort = (field: keyof RoutingRule) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  return (
    <div
      data-testid="ai-ops-routing-rules"
      className="flex flex-col rounded-xl border border-neutral-200/80 bg-white shadow-xs transition-colors hover:border-neutral-300 overflow-hidden w-full"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5">
        <div>
          <h3 className="text-base font-semibold text-neutral-900 tracking-tight">Routing Rules</h3>
          <p className="text-xs text-neutral-500 mt-0.5">7 rules, 1 at risk, p95 refreshed 09:45.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-8 gap-1.5 px-3 text-xs font-medium rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs flex items-center cursor-pointer transition-colors"
          >
            <Download className="size-3.5" />
            <span>Export</span>
          </button>

          <button
            type="button"
            className="h-8 gap-1.5 px-3 text-xs font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs flex items-center cursor-pointer transition-colors"
          >
            <Plus className="size-3.5" />
            <span>New rule</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-5 py-3 border-t border-b border-neutral-100 bg-white">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="h-8 gap-1.5 px-2.5 text-xs font-medium rounded-lg bg-white border border-neutral-200 text-neutral-700 shadow-xs flex items-center hover:bg-neutral-50 cursor-pointer"
          >
            <Funnel className="size-3.5 text-neutral-500" />
            <span>Filters</span>
          </button>

          {/* Reference Search Pill Group */}
          <div className="inline-flex items-center rounded-lg border border-neutral-200 bg-white shadow-xs overflow-hidden h-8">
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-neutral-800 border-r border-neutral-200 bg-neutral-50/60">
              <Hash className="size-3 text-neutral-500" />
              <span>Reference</span>
            </div>

            <div className="px-2 text-xs text-neutral-400 border-r border-neutral-200 bg-neutral-50/30">
              contains
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="px-2.5 py-1 text-xs text-neutral-800 placeholder-neutral-400 outline-none w-36 bg-transparent"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSearchQuery("")}
          className="h-8 gap-1.5 px-2.5 text-xs font-medium rounded-lg bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 shadow-xs flex items-center hover:bg-neutral-50 cursor-pointer"
        >
          <FunnelX className="size-3.5 text-neutral-400" />
          <span>Clear</span>
        </button>
      </div>

      {/* Table Data Grid */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/40 text-slate-600 font-semibold select-none">
              {/* Checkbox Select All */}
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredRules.length && filteredRules.length > 0}
                  onChange={handleToggleSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>

              {/* Reference */}
              <th
                onClick={() => handleSort("reference")}
                className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Reference</span>
                  {sortField === "reference" ? (
                    sortOrder === "asc" ? <ArrowUp className="size-3 text-blue-600" /> : <ArrowDown className="size-3 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="size-3 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Rule */}
              <th
                onClick={() => handleSort("rule")}
                className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors min-w-[240px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Rule</span>
                  {sortField === "rule" ? (
                    sortOrder === "asc" ? <ArrowUp className="size-3 text-blue-600" /> : <ArrowDown className="size-3 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="size-3 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Scope */}
              <th
                onClick={() => handleSort("scope")}
                className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Scope</span>
                  {sortField === "scope" ? (
                    sortOrder === "asc" ? <ArrowUp className="size-3 text-blue-600" /> : <ArrowDown className="size-3 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="size-3 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Kind */}
              <th
                onClick={() => handleSort("kind")}
                className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Kind</span>
                  {sortField === "kind" ? (
                    sortOrder === "asc" ? <ArrowUp className="size-3 text-blue-600" /> : <ArrowDown className="size-3 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="size-3 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Daily Tokens */}
              <th
                onClick={() => handleSort("dailyTokens")}
                className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Tokens</span>
                  {sortField === "dailyTokens" ? (
                    sortOrder === "asc" ? <ArrowUp className="size-3 text-blue-600" /> : <ArrowDown className="size-3 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="size-3 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Status */}
              <th
                onClick={() => handleSort("status")}
                className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {sortField === "status" ? (
                    sortOrder === "asc" ? <ArrowUp className="size-3 text-blue-600" /> : <ArrowDown className="size-3 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="size-3 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Actions */}
              <th className="w-12 px-3 py-3 text-center">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredRules.map((rule) => {
              const isSelected = selectedIds.has(rule.id)
              return (
                <tr
                  key={rule.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isSelected ? "bg-blue-50/40" : ""
                  }`}
                >
                  {/* Row Checkbox */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(rule.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  {/* Reference & Date */}
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors">
                      {rule.reference}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{rule.updated}</div>
                  </td>

                  {/* Rule Title & Provider */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
                        {getRuleIcon(rule.category, rule.kind)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 leading-snug">{rule.rule}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {rule.provider} · {rule.category}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Scope & Latency */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{rule.scope}</div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">{rule.latency}</div>
                  </td>

                  {/* Kind */}
                  <td className="px-4 py-3">{getKindBadge(rule.kind)}</td>

                  {/* Tokens */}
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {formatTokens(rule.dailyTokens)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">{getStatusBadge(rule.status)}</td>

                  {/* Action Dropdown Button */}
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
