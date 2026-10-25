import type { UXRequest } from "../data/mockData.ts"
import { normalizeConversationText, taskId } from "./aiConversation.ts"

export interface ProjectStateTaskRef {
  id: string
  title: string
  deadline?: string
  assignee?: string
}

export interface ProjectStateSnapshot {
  schema: "uxmb.project-state.v1"
  version: string
  generatedAt: string
  scope: "authorized_tasks"
  metrics: {
    total: number
    completed: number
    inProgress: number
    overdue: number
    poPending: number
    withoutAssignee: number
    averageProgress: number
  }
  overdueTasks: ProjectStateTaskRef[]
  poPendingTasks: ProjectStateTaskRef[]
}

function taskTitle(task: UXRequest): string {
  return task.nickname || task.title || taskId(task)
}

function taskDeadline(task: UXRequest): string {
  return String(task.design_deadline || task.expected_deadline || "").trim()
}

function parseDeadline(value: string): number | null {
  if (!value) return null
  const direct = Date.parse(value)
  if (Number.isFinite(direct)) return direct
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!match) return null
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 23, 59, 59).getTime()
}

function isCompleted(task: UXRequest): boolean {
  const status = normalizeConversationText(`${task.status || ""} ${task.current_phase || ""}`)
  return /\b(hoan thanh|completed|done|closed|da dong|nghiem thu)\b/.test(status) || Number(task.progress || 0) >= 100
}

function isPoPending(task: UXRequest): boolean {
  const status = normalizeConversationText(`${task.status || ""} ${task.current_phase || ""}`)
  return /\b(po pending|cho po|cho duyet|pending po)\b/.test(status)
}

function stableVersion(tasks: UXRequest[]): string {
  const value = tasks
    .map((task) => [taskId(task), task.status, task.current_phase, task.progress, taskDeadline(task), task.assigned_designer].join("|"))
    .sort()
    .join("\n")
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `ps-${(hash >>> 0).toString(16).padStart(8, "0")}`
}

function taskRef(task: UXRequest): ProjectStateTaskRef {
  const deadline = taskDeadline(task)
  const assignee = String(task.assigned_designer || task.design_owner || task.ux_owner || "").trim()
  return {
    id: taskId(task),
    title: taskTitle(task),
    ...(deadline ? { deadline } : {}),
    ...(assignee ? { assignee } : {}),
  }
}

/** Build exact, deterministic KPIs from the caller-authorized task scope. */
export function buildProjectState(tasks: UXRequest[], now: Date = new Date()): ProjectStateSnapshot {
  const completedTasks = tasks.filter(isCompleted)
  const activeTasks = tasks.filter((task) => !isCompleted(task))
  const overdueTasks = activeTasks.filter((task) => {
    const deadline = parseDeadline(taskDeadline(task))
    return deadline !== null && deadline < now.getTime()
  })
  const poPendingTasks = activeTasks.filter(isPoPending)
  const progressValues = tasks.map((task) => Number(task.progress)).filter(Number.isFinite)
  const averageProgress = progressValues.length
    ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
    : 0

  return {
    schema: "uxmb.project-state.v1",
    version: stableVersion(tasks),
    generatedAt: now.toISOString(),
    scope: "authorized_tasks",
    metrics: {
      total: tasks.length,
      completed: completedTasks.length,
      inProgress: activeTasks.length,
      overdue: overdueTasks.length,
      poPending: poPendingTasks.length,
      withoutAssignee: activeTasks.filter((task) => !String(task.assigned_designer || task.design_owner || task.ux_owner || "").trim()).length,
      averageProgress,
    },
    overdueTasks: overdueTasks.slice(0, 20).map(taskRef),
    poPendingTasks: poPendingTasks.slice(0, 20).map(taskRef),
  }
}
