import type { UXRequest } from "../data/mockData.ts"

export interface AIConversationMemory {
  activeTaskId?: string
  activeArtifactIds: string[]
  pendingTaskIds?: string[]
  lastIntent?: string
  lastUserQuery?: string
  updatedAt: string
}

export interface TaskReferenceResolution {
  task: UXRequest | null
  candidates: UXRequest[]
  confidence: number
  method: "request_id" | "title" | "semantic" | "memory" | "ambiguous" | "none"
  isFollowUp: boolean
}

export interface GroundedAIResponse {
  content: string
  unknownTaskReferences: string[]
}

const STOP_WORDS = new Set([
  "anh", "chị", "bạn", "ban", "cái", "các", "cho", "công", "việc", "cong", "viec",
  "của", "cua", "đang", "dang", "đó", "do", "giúp", "giup", "hiện", "hien", "không",
  "khong", "là", "la", "này", "nay", "nó", "no", "tôi", "toi", "và", "va", "về", "ve",
  "thế", "the", "sao", "gì", "gi", "như", "nhu", "thế nào", "the nao",
])

export function normalizeConversationText(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function tokens(value: unknown): string[] {
  return normalizeConversationText(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
}

export function isAggregateTaskQuery(query: string): boolean {
  const q = normalizeConversationText(query)
  return /\b(tat ca|toan bo|danh sach|tong hop|bao nhieu|phan bo|thong ke|cac bai|cac task|team|squad)\b/.test(q)
}

export function isContextualFollowUp(query: string): boolean {
  const q = normalizeConversationText(query)
  const wordCount = q ? q.split(/\s+/).length : 0
  return (
    /\b(no|bai nay|task nay|cong viec nay|viec nay|cai nay|truong hop nay|tiep theo|them nua|con lai)\b/.test(q) ||
    (/^(ai|tai sao|vi sao|khi nao|bao gio|co|can|nen|lam sao|the nao)\b/.test(q) && wordCount <= 10)
  )
}

function taskId(task: UXRequest): string {
  return String(task.request_id || task.id || "").trim()
}

function taskSearchText(task: UXRequest): string {
  return [
    taskId(task),
    task.nickname,
    task.title,
    task.product,
    task.feature_journey,
    task.squad_name,
    task.preferred_squad,
  ].filter(Boolean).join(" ")
}

export function resolveTaskReference(
  query: string,
  tasks: UXRequest[],
  previousTaskId?: string,
  pendingTaskIds: string[] = []
): TaskReferenceResolution {
  const q = normalizeConversationText(query)
  const followUp = isContextualFollowUp(query)
  const previous = previousTaskId
    ? tasks.find((task) => taskId(task) === previousTaskId) || null
    : null

  const pendingTasks = pendingTaskIds
    .map((id) => tasks.find((task) => taskId(task) === id))
    .filter((task): task is UXRequest => Boolean(task))
  const ordinalMatch = q.match(/^(?:bai |task )?([1-3])$/)
  if (ordinalMatch && pendingTasks.length >= Number(ordinalMatch[1])) {
    const selected = pendingTasks[Number(ordinalMatch[1]) - 1]
    return { task: selected, candidates: [selected], confidence: 1, method: "title", isFollowUp: true }
  }

  if (!q || tasks.length === 0) {
    return { task: followUp ? previous : null, candidates: [], confidence: previous ? 0.8 : 0, method: previous ? "memory" : "none", isFollowUp: followUp }
  }

  const explicitId = tasks.find((task) => {
    const id = normalizeConversationText(taskId(task))
    return id.length >= 3 && (` ${q} `).includes(` ${id} `)
  })
  if (explicitId) {
    return { task: explicitId, candidates: [explicitId], confidence: 1, method: "request_id", isFollowUp: followUp }
  }

  const queryTokens = new Set(tokens(query))
  const scored = tasks.map((task) => {
    const name = normalizeConversationText(task.nickname || task.title)
    const title = normalizeConversationText(task.title)
    const product = normalizeConversationText(task.product)
    const feature = normalizeConversationText(task.feature_journey)
    const searchableTokens = new Set(tokens(taskSearchText(task)))
    let score = 0

    if (name.length >= 4 && (q.includes(name) || name.includes(q))) score += 90
    if (title.length >= 4 && (q.includes(title) || title.includes(q))) score += 75
    if (product.length >= 3 && q.includes(product)) score += 38
    if (feature.length >= 4 && q.includes(feature)) score += 28

    let overlap = 0
    queryTokens.forEach((token) => {
      if (searchableTokens.has(token)) overlap += 1
    })
    if (queryTokens.size > 0) score += (overlap / queryTokens.size) * 55
    if (previous && taskId(task) === taskId(previous) && followUp) score += 80

    return { task, score }
  }).sort((a, b) => b.score - a.score)

  const best = scored[0]
  const second = scored[1]
  if (!best || best.score < 24) {
    if (previous && followUp) {
      return { task: previous, candidates: [previous], confidence: 0.82, method: "memory", isFollowUp: true }
    }
    return { task: null, candidates: [], confidence: 0, method: "none", isFollowUp: followUp }
  }

  const candidates = scored.filter((entry) => entry.score >= Math.max(24, best.score - 12)).slice(0, 3)
  if (second && second.score >= 35 && best.score - second.score < 8 && !followUp) {
    return {
      task: null,
      candidates: candidates.map((entry) => entry.task),
      confidence: Math.min(0.75, best.score / 100),
      method: "ambiguous",
      isFollowUp: false,
    }
  }

  return {
    task: best.task,
    candidates: candidates.map((entry) => entry.task),
    confidence: Math.min(0.98, Math.max(0.5, best.score / 100)),
    method: best.task === previous && followUp ? "memory" : best.score >= 75 ? "title" : "semantic",
    isFollowUp: followUp,
  }
}

export function buildTaskRetrievalQuery(query: string, task?: UXRequest | null): string {
  if (!task) return query
  return [query, task.nickname, task.title, task.product, task.feature_journey]
    .filter(Boolean)
    .join(" ")
}

export function createConversationMemory(options: {
  previous?: AIConversationMemory
  activeTask?: UXRequest | null
  activeArtifactIds?: string[]
  pendingTaskIds?: string[]
  intent?: string
  userQuery: string
  now?: Date
}): AIConversationMemory {
  return {
    activeTaskId: options.activeTask ? taskId(options.activeTask) : options.previous?.activeTaskId,
    activeArtifactIds: options.activeArtifactIds ?? options.previous?.activeArtifactIds ?? [],
    pendingTaskIds: options.pendingTaskIds ?? [],
    lastIntent: options.intent || options.previous?.lastIntent,
    lastUserQuery: options.userQuery,
    updatedAt: (options.now || new Date()).toISOString(),
  }
}

export function groundAIResponse(
  content: string,
  sources: { taskIds?: string[]; documentNames?: string[] }
): GroundedAIResponse {
  const allowedTaskIds = new Set((sources.taskIds || []).map((id) => id.toUpperCase()))
  const referencedIds = content.match(/\b(?:UXMB|REQ)-[A-Z0-9-]+\b/gi) || []
  const unknownTaskReferences = Array.from(
    new Set(referencedIds.filter((id) => !allowedTaskIds.has(id.toUpperCase())))
  )
  let safeContent = content
  unknownTaskReferences.forEach((id) => {
    safeContent = safeContent.replace(new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "[mã task chưa xác minh]")
  })

  const sourceLabels = [
    ...(sources.taskIds || []).map((id) => `[${id}]`),
    ...(sources.documentNames || []).map((name) => `“${name}”`),
  ].filter(Boolean)
  const uniqueSources = Array.from(new Set(sourceLabels))
  if (uniqueSources.length > 0 && !/nguồn (?:đã dùng|tham chiếu đã nạp)\s*:/i.test(safeContent)) {
    safeContent = `${safeContent.trim()}\n\n---\n**Nguồn tham chiếu đã nạp:** ${uniqueSources.join(", ")}`
  }

  return { content: safeContent, unknownTaskReferences }
}
