/**
 * ══════════════════════════════════════════════════════════════════════════════
 * AI TOOL EXECUTOR — ĐỊNH NGHĨA & THỰC THI TOOL CHO AGENTIC LOOP
 * ══════════════════════════════════════════════════════════════════════════════
 * - Tool chạy client-side trên dữ liệu đã được phân quyền của người dùng.
 * - Mọi kết quả trả về đều qua sanitizeContextText (PII-safe) trước khi vào context.
 * - Không tự gọi mạng ngoài gateway; không động tới GAS ở đây.
 */

import type { UXRequest } from "../data/mockData.ts"
import type { UXArtifact } from "../services/aiArtifactsService.ts"
import { isArtifactApprovedForAI } from "../services/aiArtifactsService.ts"
import type { PlannerEntry } from "../services/calendarService.ts"
import { computeTaskMetrics, searchArtifactsByQuery } from "../config/aiPrompts.ts"
import { semanticSearch } from "./aiRetrievalPipeline.ts"
import { taskSearchText, taskId } from "./aiConversation.ts"
import { sanitizeContextText } from "./piiMasker.ts"

export interface ToolCallRequest {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ToolExecutionResult {
  id: string
  name: string
  ok: boolean
  error?: string
  /** Payload JSON chuẩn xuất vào message tool */
  content: string
  /** Tóm tắt để render trace */
  summary: string
}

interface ToolContext {
  tasks: UXRequest[]
  artifacts: UXArtifact[]
  events: PlannerEntry[]
  todayYMD: string
}

/** Định nghĩa schema gửi lên gateway để model tự chọn tool */
export const AGENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_tasks",
      description:
        "Tìm bài toán/task UX theo tên, squad, designer, trạng thái hoặc khâu. Trả về các task phù hợp nhất trong phạm vi quyền của người dùng.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Từ khóa hoặc mô tả task cần tìm" },
          status: { type: "string", description: "Lọc theo trạng thái (tùy chọn)" },
          squad: { type: "string", description: "Lọc theo squad (tùy chọn)" },
          limit: { type: "number", description: "Số kết quả tối đa (mặc định 8)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_task_detail",
      description:
        "Lấy thông tin chi tiết đầy đủ của một task cụ thể theo request_id, bao gồm mô tả, lịch sử cập nhật và trạng thái.",
      parameters: {
        type: "object",
        properties: {
          request_id: { type: "string", description: "Mã task, ví dụ REQ-1234" },
        },
        required: ["request_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_documents",
      description:
        "Tìm tài liệu nội bộ đã được duyệt (quy định, quy trình, design system, checklist). Chỉ trả tài liệu approved, không trả draft của người khác.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Chủ đề tài liệu cần tra cứu" },
          limit: { type: "number", description: "Số tài liệu tối đa (mặc định 4)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_calendar",
      description: "Đọc lịch làm việc và sự kiện của người dùng trong khoảng thời gian gần.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Số ngày tới cần xem (mặc định 3)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compute_risks",
      description:
        "Tính toán số liệu rủi ro tổng hợp: task quá hạn, đến hạn hôm nay, PO pending >24h, phân bổ theo squad/khâu/designer.",
      parameters: {
        type: "object",
        properties: {
          squad: { type: "string", description: "Lọc theo squad cụ thể (tùy chọn)" },
        },
      },
    },
  },
] as const

export function getAgentToolDefinitions() {
  return AGENT_TOOLS as unknown as Array<Record<string, unknown>>
}

function clip(value: unknown, max = 1600): string {
  const clean = sanitizeContextText(String(value ?? "").trim())
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

function serializeTaskBrief(t: UXRequest) {
  return {
    id: taskId(t),
    title: clip(t.nickname?.trim() || t.title?.trim() || "Chưa đặt tên", 200),
    squad: t.squad_name || t.preferred_squad || "Chưa gán",
    phase: t.current_phase || "Đang xử lý",
    status: t.status || "Chờ xử lý",
    progress: Number(t.progress) || 0,
    deadline: t.expected_deadline || (t as any).design_deadline || "Chưa có",
    assignee: clip(t.assigned_designer || "Chưa gán", 120),
  }
}

function serializeTaskDetail(t: UXRequest) {
  const recentUpdates = [...(t.task_updates || [])]
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
    .slice(0, 6)
    .map((u) => ({
      timestamp: u.timestamp,
      author: clip(u.updated_by, 100),
      phase: u.new_phase,
      progress: u.new_progress,
      note: clip(u.note, 500),
    }))
  return {
    ...serializeTaskBrief(t),
    product: clip(t.product, 200),
    feature_journey: clip(t.feature_journey, 300),
    description: clip(t.description, 1500),
    business_need: clip(t.business_need, 1000),
    user_problem: clip(t.user_problem, 1000),
    target_user: clip(t.target_user, 400),
    expected_output: Array.isArray(t.expected_output)
      ? t.expected_output.slice(0, 6).map((o) => clip(o, 200))
      : [],
    pending_reason: clip(t.pending_reason, 400) || null,
    sent_to_po_at: t.sent_to_po_at || null,
    last_updated: t.last_updated || null,
    figma_available: Boolean(t.figma_url),
    recent_updates: recentUpdates,
  }
}

/** Thực thi một tool call do model yêu cầu trên dữ liệu đã phân quyền */
export function executeAgentTool(call: ToolCallRequest, ctx: ToolContext): ToolExecutionResult {
  const args = call.arguments || {}
  try {
    switch (call.name) {
      case "search_tasks": {
        const query = String(args.query ?? "").trim()
        if (!query) {
          return {
            id: call.id,
            name: call.name,
            ok: false,
            error: "Thiếu từ khóa tìm kiếm task.",
            content: JSON.stringify({ error: "missing_query" }),
            summary: "search_tasks() → thiếu từ khóa",
          }
        }
        const limit = Math.min(20, Math.max(1, Number(args.limit) || 8))
        let pool = ctx.tasks
        const squad = typeof args.squad === "string" ? args.squad.toLowerCase() : ""
        const status = typeof args.status === "string" ? args.status.toLowerCase() : ""
        if (squad) {
          pool = pool.filter((t) => `${t.squad_name || ""} ${t.preferred_squad || ""}`.toLowerCase().includes(squad))
        }
        if (status) {
          pool = pool.filter((t) => `${t.status || ""} ${t.current_phase || ""}`.toLowerCase().includes(status))
        }
        const ranked = semanticSearch(query, pool, taskSearchText, limit)
        const items = ranked.map((r, i) => ({
          source_id: `T${i + 1}`,
          relevance: Number(r.score.toFixed(3)),
          ...serializeTaskBrief(r.item),
        }))
        return {
          id: call.id,
          name: call.name,
          ok: true,
          content: JSON.stringify({ tasks: items, total_scanned: pool.length }),
          summary: `search_tasks(${query.slice(0, 40)}) → ${items.length} kết quả`,
        }
      }
      case "get_task_detail": {
        const rid = String(args.request_id ?? "").trim()
        const found = ctx.tasks.find(
          (t) => taskId(t).toLowerCase() === rid.toLowerCase() || (t.request_id || "").toLowerCase() === rid.toLowerCase()
        )
        if (!found) {
          return {
            id: call.id,
            name: call.name,
            ok: false,
            error: `Không tìm thấy task ${rid} trong phạm vi quyền của người dùng.`,
            content: JSON.stringify({ error: "task_not_found", request_id: rid }),
            summary: `get_task_detail(${rid}) → không tìm thấy`,
          }
        }
        return {
          id: call.id,
          name: call.name,
          ok: true,
          content: JSON.stringify({ task: serializeTaskDetail(found) }),
          summary: `get_task_detail(${taskId(found)}) → chi tiết đầy đủ`,
        }
      }
      case "search_documents": {
        const query = String(args.query ?? "").trim()
        if (!query) {
          return {
            id: call.id,
            name: call.name,
            ok: false,
            error: "Thiếu chủ đề tài liệu cần tra cứu.",
            content: JSON.stringify({ error: "missing_query" }),
            summary: "search_documents() → thiếu chủ đề",
          }
        }
        const limit = Math.min(8, Math.max(1, Number(args.limit) || 4))
        const approved = ctx.artifacts.filter(isArtifactApprovedForAI)
        const matched = searchArtifactsByQuery(query, approved).slice(0, limit)
        const items = matched.map((d, i) => ({
          source_id: `D${i + 1}`,
          name: clip(d.name, 200),
          summary: clip(d.summary || "", 500),
          tags: (d.tags || []).slice(0, 8),
          excerpt: clip(d.content || "", 3000),
        }))
        return {
          id: call.id,
          name: call.name,
          ok: true,
          content: JSON.stringify({ documents: items }),
          summary: `search_documents(${query.slice(0, 40)}) → ${items.length} tài liệu`,
        }
      }
      case "read_calendar": {
        const days = Math.min(14, Math.max(1, Number(args.days) || 3))
        const today = new Date()
        const endDate = new Date(today)
        endDate.setDate(endDate.getDate() + days)
        const startYMD = today.toISOString().slice(0, 10)
        const endYMD = endDate.toISOString().slice(0, 10)
        const scopedEvents = (ctx.events || []).filter((event) => {
          const eventDate = String(event.date || "").slice(0, 10)
          return eventDate >= startYMD && eventDate <= endYMD
        })
        const items = scopedEvents.slice(0, 20).map((e) => ({
          date: e.date,
          title: clip(e.title || "", 200),
          time: e.time || "cả ngày",
        }))
        return {
          id: call.id,
          name: call.name,
          ok: true,
          content: JSON.stringify({ days, from: startYMD, to: endYMD, events: items }),
          summary: `read_calendar(${days} ngày) → ${items.length} sự kiện`,
        }
      }
      case "compute_risks": {
        const squad = typeof args.squad === "string" ? args.squad.toLowerCase() : ""
        const pool = squad
          ? ctx.tasks.filter((t) => `${t.squad_name || ""} ${t.preferred_squad || ""}`.toLowerCase().includes(squad))
          : ctx.tasks
        const m = computeTaskMetrics(pool, new Date())
        const overdue = pool.filter((t) => {
          const dl = (t.expected_deadline || (t as any).design_deadline || "") as string
          return dl && dl.slice(0, 10) < m.todayYMD && Number(t.progress) < 100
        })
        return {
          id: call.id,
          name: call.name,
          ok: true,
          content: JSON.stringify({
            total_tasks: m.totalTasks,
            overdue_count: m.overdueTasksCount,
            due_today: m.dueTodayTasksCount,
            po_pending_over_24h: m.poPendingOver24hCount,
            by_phase: m.byPhase,
            by_squad: m.bySquad,
            overdue_tasks: overdue.slice(0, 10).map(serializeTaskBrief),
          }),
          summary: `compute_risks → quá hạn ${m.overdueTasksCount}, hôm nay ${m.dueTodayTasksCount}, PO pending ${m.poPendingOver24hCount}`,
        }
      }
      default:
        return {
          id: call.id,
          name: call.name,
          ok: false,
          error: `Tool không được hỗ trợ: ${call.name}`,
          content: JSON.stringify({ error: "unsupported_tool" }),
          summary: `${call.name} → không hỗ trợ`,
        }
    }
  } catch (err: any) {
    return {
      id: call.id,
      name: call.name,
      ok: false,
      error: String(err?.message || err),
      content: JSON.stringify({ error: "tool_execution_failed" }),
      summary: `${call.name} → lỗi thực thi`,
    }
  }
}
