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

export const STOP_WORDS = new Set([
  "ai", "anh", "chi", "chị", "ban", "bạn", "em", "toi", "tôi", "minh", "mình",
  "cai", "cái", "cac", "các", "cho", "cong", "công", "viec", "việc",
  "cua", "của", "dang", "đang", "do", "đó", "giup", "giúp", "hien", "hiện",
  "khong", "không", "la", "là", "nay", "này", "no", "nó", "va", "và", "ve", "về",
  "the", "thế", "sao", "gi", "gì", "nhu", "như", "the nao", "thế nào",
  "bai", "bài", "toan", "toán", "de", "đề", "muc", "mục",
  "xem", "hoi", "hỏi", "check", "kiem", "kiểm", "tra",
  "tien", "tiến", "do", "độ", "tinh", "tình", "hinh", "hình", "trang", "trạng", "thai", "thái",
  "thong", "thông", "tin", "chi", "tiet", "tiết", "bao", "báo", "cao",
  "nao", "nào", "roi", "rồi", "ra", "den", "đến", "dau", "đâu", "khi", "bao gio",
  "co", "có", "hay", "chua", "chưa", "duoc", "được", "voi", "với", "o", "ở", "tai", "tại",
  "nhung", "những", "tat", "tất", "ca", "cả", "danh", "sach", "sách",
  "phu", "phụ", "trach", "trách",
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

export function tokens(value: unknown): string[] {
  return normalizeConversationText(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
}

export function isAggregateTaskQuery(query: string): boolean {
  const q = normalizeConversationText(query)
  return /\b(tat ca|toan bo|danh sach|tong hop|bao nhieu|phan bo|thong ke|cac bai|cac task|nhung bai|nhung task|bai nao|task nao|co nhung|squad|team|khau \d|khâu \d)\b/.test(q)
}

export function isContextualFollowUp(query: string): boolean {
  const q = normalizeConversationText(query)
  const wordCount = q ? q.split(/\s+/).length : 0
  return (
    /\b(no|bai nay|task nay|cong viec nay|viec nay|cai nay|truong hop nay|tiep theo|them nua|con lai)\b/.test(q) ||
    (/^(ai|tai sao|vi sao|khi nao|bao gio|co|can|nen|lam sao|the nao)\b/.test(q) && wordCount <= 10)
  )
}

export function taskId(task: UXRequest): string {
  return String(task.request_id || task.id || "").trim()
}

export function taskSearchText(task: UXRequest): string {
  return [
    taskId(task),
    task.nickname,
    task.title,
    task.product,
    task.feature_journey,
    task.squad_name,
    task.preferred_squad,
    task.assigned_designer,
    task.design_owner,
    task.ux_owner,
    task.current_phase,
    task.status,
  ].filter(Boolean).join(" ")
}

export function extractCoreTopic(query: string): string {
  let text = query.trim()
  text = text.replace(/^(?:cho\s+(?:mình|toi|tôi|em|anh|chị)\s+(?:hỏi|biết|xem|check)|xin\s+hỏi|làm\s+ơn)\s+/i, "")
  text = text.replace(/^(?:xem\s+giúp|kiểm\s+tra\s+giúp|check\s+giúp|tra\s+cứu\s+giúp|xem|kiểm\s+tra|check|tìm\s+kiếm|tìm|hỏi\s+về)\s+/i, "")
  text = text.replace(/^(?:tiến\s+độ|tình\s+hình|thông\s+tin|trạng\s+thái|chi\s+tiết|nội\s+dung|kết\s+quả|báo\s+cáo)\s+(?:của\s+)?/i, "")
  text = text.replace(/^(?:sản\s+phẩm|san\s+pham)\s+/i, "")
  text = text.replace(/^(?:bài\s+toán|công\s+việc|task|dự\s+án|đề\s+bài|yêu\s+cầu|bài|gói)\s+/i, "")
  text = text.replace(/^(?:về|ở|tại)\s+/i, "")
  text = text.replace(/\s+(?:thế\s+nào(?:\s+rồi)?|sao\s+rồi|ra\s+sao|đến\s+đâu(?:\s+rồi)?|như\s+thế\s+nào|có\s+vấn\s+đề\s+gì\s+không|ai\s+làm|ai\s+phụ\s+trách|khi\s+nào\s+xong|bao\s+giờ\s+xong|ở\s+đâu|đang\s+ở\s+đâu)[?!.,;:\s]*$/i, "")
  text = text.replace(/\s+(?:nhỉ|nhé|ạ|với|được\s+không|đi|nào)[?!.,;:\s]*$/i, "")
  text = text.replace(/[?!.,;:]+$/, "")
  return text.trim()
}

export function findTaskByExplicitId(query: string, tasks: UXRequest[]): UXRequest | null {
  const qNorm = normalizeConversationText(query)
  const qCompact = qNorm.replace(/\s+/g, "")

  for (const task of tasks) {
    const rawId = taskId(task)
    if (!rawId) continue
    const normId = normalizeConversationText(rawId)
    const compactId = normId.replace(/\s+/g, "")

    if (normId.length >= 3 && ` ${qNorm} `.includes(` ${normId} `)) {
      return task
    }
    if (compactId.length >= 3) {
      const compactRegex = new RegExp(`(?:^|[^a-z0-9])${compactId}(?:[^a-z0-9]|$)`, "i")
      if (compactRegex.test(qNorm) || qCompact.includes(compactId)) {
        return task
      }
    }
  }

  const tagMatch = query.match(/#([a-zA-Z0-9_-]+)/)
  if (tagMatch) {
    const tag = tagMatch[1].toLowerCase().replace(/[^a-z0-9]/g, "")
    const matched = tasks.find((t) => taskId(t).toLowerCase().replace(/[^a-z0-9]/g, "").includes(tag))
    if (matched) return matched
  }

  const numPatternMatch = query.match(/(?:bài|task|mã|de bai|req)\s*#?([a-zA-Z0-9_-]+)/i)
  if (numPatternMatch) {
    const term = numPatternMatch[1].toLowerCase().replace(/[^a-z0-9]/g, "")
    if (term.length >= 1) {
      const matched = tasks.find((t) => {
        const idCompact = taskId(t).toLowerCase().replace(/[^a-z0-9]/g, "")
        if (idCompact === term) return true
        const numSuffix = idCompact.match(/(\d+)$/)?.[1]
        if (!numSuffix) return false
        if (numSuffix === term) return true
        return parseInt(numSuffix, 10) === parseInt(term, 10)
      })
      if (matched) return matched
    }
  }

  return null
}

const PHASE_NAMES = [
  "cho tiep nhan",
  "phan loai",
  "discovery",
  "user flow",
  "ui design",
  "prototype",
  "ban giao",
]

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

  const explicitId = findTaskByExplicitId(query, tasks)
  if (explicitId) {
    return { task: explicitId, candidates: [explicitId], confidence: 1, method: "request_id", isFollowUp: followUp }
  }

  const coreTopic = extractCoreTopic(query)
  const topicNorm = normalizeConversationText(coreTopic)
  const queryTokens = new Set(tokens(query))
  const topicTokens = new Set(tokens(coreTopic))

  // Extract phase filter if any (khâu 1 -> 7)
  const khauMatch = q.match(/khau\s*([1-7])/)
  const targetPhaseIndex = khauMatch ? parseInt(khauMatch[1], 10) - 1 : -1

  const scored = tasks.map((task) => {
    const name = normalizeConversationText(task.nickname || task.title)
    const title = normalizeConversationText(task.title)
    const product = normalizeConversationText(task.product)
    const feature = normalizeConversationText(task.feature_journey)
    const designerTokens = new Set(tokens(task.assigned_designer))
    const squadTokens = new Set(tokens(task.squad_name || task.preferred_squad))
    const phase = normalizeConversationText(task.current_phase)
    const searchableTokens = new Set(tokens(taskSearchText(task)))

    let score = 0

    // 1. Topic Substring Match (high precision)
    if (topicNorm.length >= 3) {
      if (name === topicNorm) score += 100
      else if (name.includes(topicNorm) || topicNorm.includes(name)) score += 90

      if (title.includes(topicNorm) || topicNorm.includes(title)) score += 75
      if (feature.length >= 4 && (feature.includes(topicNorm) || topicNorm.includes(feature))) score += 60
      if (product.length >= 3 && (product.includes(topicNorm) || topicNorm.includes(product))) score += 38
    } else {
      if (name.length >= 4 && (q.includes(name) || name.includes(q))) score += 90
      if (title.length >= 4 && (q.includes(title) || title.includes(q))) score += 75
      if (product.length >= 3 && q.includes(product)) score += 38
      if (feature.length >= 4 && q.includes(feature)) score += 28
    }

    // 2. Token Overlap from Core Topic
    topicTokens.forEach((token) => {
      if (name.includes(token)) score += 28
      if (title.includes(token)) score += 18
      if (designerTokens.has(token)) score += 35
      if (squadTokens.has(token)) score += 15
    })

    // 3. General query token overlap fallback
    let overlap = 0
    queryTokens.forEach((token) => {
      if (searchableTokens.has(token)) overlap += 1
    })
    if (queryTokens.size > 0) score += (overlap / queryTokens.size) * 35

    // 4. Phase Filter Match (khâu 1-7)
    if (targetPhaseIndex >= 0 && targetPhaseIndex < PHASE_NAMES.length) {
      const expectedPhase = PHASE_NAMES[targetPhaseIndex]
      if (phase.includes(expectedPhase) || expectedPhase.includes(phase)) {
        score += 60
      }
    }

    // 5. Memory follow-up
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

  const isAgg = isAggregateTaskQuery(query)
  const candidates = scored.filter((entry) => entry.score >= Math.max(24, best.score - 18)).slice(0, 5)

  if (isAgg && candidates.length > 1) {
    return {
      task: null,
      candidates: candidates.map((entry) => entry.task),
      confidence: Math.min(0.95, best.score / 100),
      method: "semantic",
      isFollowUp: followUp,
    }
  }

  if (second && second.score >= 35 && (best.score - second.score < 8) && !followUp) {
    return {
      task: null,
      candidates: candidates.slice(0, 3).map((entry) => entry.task),
      confidence: Math.min(0.75, best.score / 100),
      method: "ambiguous",
      isFollowUp: false,
    }
  }

  return {
    task: best.task,
    candidates: candidates.slice(0, 3).map((entry) => entry.task),
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
