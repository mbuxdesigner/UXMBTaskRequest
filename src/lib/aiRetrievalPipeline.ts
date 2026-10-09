import type { UXRequest } from "../data/mockData.ts"
import type { UXArtifact } from "../services/aiArtifactsService.ts"
import { normalizeConversationText, taskId, taskSearchText } from "./aiConversation.ts"

export type RetrievalSource = "tasks" | "documents" | "calendar"
export type QueryOperation = "lookup" | "count" | "list" | "compare" | "summarize"

export interface QueryPlan {
  sources: RetrievalSource[]
  operation: QueryOperation
  query: string
  confidence: number
  reason: string
  toolCalls: Array<{ name: "search_tasks" | "search_documents" | "read_calendar"; arguments: Record<string, unknown> }>
}

export interface RankedResult<T> {
  item: T
  score: number
  semanticScore: number
  lexicalScore: number
}

export interface AISourceReference {
  id: string
  type: "task" | "document" | "calendar"
  label: string
  confidence: number
}

export interface StructuredToolResult {
  plan: QueryPlan
  tasks: UXRequest[]
  documents: UXArtifact[]
  sources: AISourceReference[]
  promptPayload: string
}

const TASK_HINT = /\b(task|bai toan|cong viec|deadline|tien do|designer|squad|product|san pham|khau|phase|trang thai|uxmb|req)\b/
const DOC_HINT = /\b(tai lieu|quy dinh|quy trinh|nguyen tac|chinh sach|tieu chuan|checklist|handoff|design system|huong dan)\b/
const CALENDAR_HINT = /\b(lich|cuoc hop|meeting|calendar|hom nay co hop)\b/
const CROSS_HINT = /\b(doi chieu|so sanh|ap dung|theo quy dinh|co dung|tuan thu|lien quan)\b/

export function createQueryPlan(query: string, previousIntent?: string): QueryPlan {
  const normalized = normalizeConversationText(query)
  const hasTask = TASK_HINT.test(normalized)
  const hasDoc = DOC_HINT.test(normalized)
  const hasCalendar = CALENDAR_HINT.test(normalized)
  const needsCrossSource = CROSS_HINT.test(normalized) && (hasTask || previousIntent === "task_analysis")
  const sources: RetrievalSource[] = []
  if (hasTask || needsCrossSource || (!hasDoc && previousIntent === "task_analysis")) sources.push("tasks")
  if (hasDoc || needsCrossSource || (!hasTask && previousIntent === "document_query")) sources.push("documents")
  if (hasCalendar) sources.push("calendar")

  const operation: QueryOperation = /\b(bao nhieu|so luong|dem)\b/.test(normalized)
    ? "count"
    : /\b(so sanh|doi chieu)\b/.test(normalized)
    ? "compare"
    : /\b(danh sach|liet ke|nhung gi|cong viec gi)\b/.test(normalized)
    ? "list"
    : /\b(tong hop|tom tat)\b/.test(normalized)
    ? "summarize"
    : "lookup"

  const uniqueSources = Array.from(new Set(sources))
  const toolCalls: QueryPlan["toolCalls"] = uniqueSources.map((source) => ({
    name: source === "tasks" ? "search_tasks" : source === "documents" ? "search_documents" : "read_calendar",
    arguments: { query, limit: source === "tasks" ? 8 : 4 },
  }))
  const confidence = uniqueSources.length === 0 ? 0.55 : needsCrossSource ? 0.94 : 0.88
  return {
    sources: uniqueSources,
    operation,
    query,
    confidence,
    reason: uniqueSources.length === 0
      ? "Câu hỏi chung, chưa cần truy xuất dữ liệu nội bộ."
      : `Cần truy xuất ${uniqueSources.join(" + ")} để trả lời có căn cứ.`,
    toolCalls,
  }
}

function hashToken(token: string, dimensions: number): number {
  let hash = 2166136261
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash) % dimensions
}

/** Local embedding fallback: word + character n-gram feature hashing, no provider key required. */
export function createLocalEmbedding(value: string, dimensions = 192): number[] {
  const normalized = normalizeConversationText(value)
  const vector = Array.from({ length: dimensions }, () => 0)
  const words = normalized.split(/\s+/).filter(Boolean)
  const features = [...words]
  for (const word of words) {
    const padded = `^${word}$`
    for (let index = 0; index <= padded.length - 3; index += 1) features.push(padded.slice(index, index + 3))
  }
  features.forEach((feature) => { vector[hashToken(feature, dimensions)] += feature.length > 3 ? 1.2 : 0.7 })
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => value / norm)
}

export function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length)
  let score = 0
  for (let index = 0; index < length; index += 1) score += left[index] * right[index]
  return Math.max(0, Math.min(1, score))
}

function lexicalScore(query: string, candidate: string): number {
  const q = normalizeConversationText(query)
  const text = normalizeConversationText(candidate)
  if (!q || !text) return 0
  if (text.includes(q)) return 1
  const queryTokens = Array.from(new Set(q.split(/\s+/).filter((token) => token.length > 1)))
  if (queryTokens.length === 0) return 0
  const matches = queryTokens.filter((token) => text.includes(token)).length
  return matches / queryTokens.length
}

export function semanticSearch<T>(query: string, items: T[], toText: (item: T) => string, limit = 8): RankedResult<T>[] {
  const queryEmbedding = createLocalEmbedding(query)
  return items
    .map((item) => {
      const text = toText(item)
      const semanticScore = cosineSimilarity(queryEmbedding, createLocalEmbedding(text))
      const lexical = lexicalScore(query, text)
      // Lightweight reranker: exact/lexical evidence wins, embeddings recover paraphrases and typos.
      const score = lexical * 0.62 + semanticScore * 0.38
      return { item, score, semanticScore, lexicalScore: lexical }
    })
    .filter((result) => result.score >= 0.12)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
}

function artifactText(artifact: UXArtifact): string {
  return [artifact.name, artifact.summary, ...(artifact.tags || []), artifact.content?.slice(0, 6000)].filter(Boolean).join(" ")
}

function taskRecord(task: UXRequest) {
  return {
    id: taskId(task),
    title: task.nickname || task.title,
    product: task.product,
    feature: task.feature_journey,
    squad: task.squad_name || task.preferred_squad,
    assignee: task.assigned_designer || task.design_owner || task.ux_owner,
    phase: task.current_phase,
    status: task.status,
    progress: task.progress,
    deadline: task.design_deadline || task.expected_deadline,
  }
}

export function executeQueryPlan(plan: QueryPlan, tasks: UXRequest[], artifacts: UXArtifact[]): StructuredToolResult {
  const rankedTasks = plan.sources.includes("tasks")
    ? semanticSearch(plan.query, tasks, taskSearchText, 8)
    : []
  const approvedArtifacts = artifacts.filter((artifact) => artifact.approvalStatus !== "retired")
  const rankedDocuments = plan.sources.includes("documents")
    ? semanticSearch(plan.query, approvedArtifacts, artifactText, 4)
    : []
  const selectedTasks = rankedTasks.map((result) => result.item)
  const selectedDocuments = rankedDocuments.map((result) => result.item)
  const sources: AISourceReference[] = [
    ...rankedTasks.map((result, index) => ({
      id: `T${index + 1}`,
      type: "task" as const,
      label: `[${taskId(result.item)}] ${result.item.nickname || result.item.title}`,
      confidence: Number(result.score.toFixed(2)),
    })),
    ...rankedDocuments.map((result, index) => ({
      id: `D${index + 1}`,
      type: "document" as const,
      label: result.item.name,
      confidence: Number(result.score.toFixed(2)),
    })),
  ]
  const payload = {
    schema: "uxmb.tool-results.v1",
    query_plan: plan,
    tool_results: {
      search_tasks: rankedTasks.map((result, index) => ({ source_id: `T${index + 1}`, relevance: Number(result.score.toFixed(3)), data: taskRecord(result.item) })),
      search_documents: rankedDocuments.map((result, index) => ({
        source_id: `D${index + 1}`,
        relevance: Number(result.score.toFixed(3)),
        data: { name: result.item.name, summary: result.item.summary, excerpt: result.item.content?.slice(0, 8000) },
      })),
    },
  }
  return { plan, tasks: selectedTasks, documents: selectedDocuments, sources, promptPayload: JSON.stringify(payload) }
}

export function summarizeConversation(messages: Array<{ role: "user" | "assistant"; content: string }>, maxItems = 8): string {
  const meaningful = messages
    .filter((message) => message.content.trim())
    .slice(-maxItems)
    .map((message) => `${message.role === "user" ? "Người dùng" : "Trợ lý"}: ${message.content.replace(/\s+/g, " ").slice(0, 280)}`)
  return meaningful.length > 0 ? meaningful.join("\n") : ""
}

export function updateConversationSummary(
  previousSummary: string | undefined,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxChars = 4000
): string {
  const recentSummary = summarizeConversation(messages, 4)
  const combined = [previousSummary?.trim(), recentSummary].filter(Boolean).join("\n")
  if (combined.length <= maxChars) return combined
  const headBudget = Math.floor(maxChars * 0.32)
  const tailBudget = maxChars - headBudget - 38
  return `${combined.slice(0, headBudget)}\n...[đã nén các lượt trung gian]...\n${combined.slice(-tailBudget)}`
}
