/**
 * realtimeSyncService.ts — Real-time Event Bus & Adaptive Sync Engine
 * 
 * Features:
 * 1. BroadcastChannel: 0ms cross-tab real-time task update synchronization
 * 2. Adaptive Smart Polling: Polls active open task every 8s when visible, pauses when tab is hidden
 * 3. Event-driven subscribers: Components subscribe to individual tasks or the global task pool
 * 4. Perceived 0ms Latency: Optimistic updates reflected immediately with live sync status
 */

import { UXRequest } from "@/data/mockData"

export type SyncEventType =
  | "TASK_UPDATED"
  | "COMMENT_ADDED"
  | "PHASE_CHANGED"
  | "STATUS_CHANGED"
  | "GLOBAL_REFRESH"

export interface SyncEventPayload {
  type: SyncEventType
  requestId?: string
  task?: Partial<UXRequest>
  timestamp: string
  sourceTabId: string
  note?: string
}

// Unique tab ID for identifying event origins
export const TAB_ID = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

// Channel name for UX Portal real-time communication
const CHANNEL_NAME = "ux_portal_realtime_sync"

let broadcastChannel: BroadcastChannel | null = null

try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME)
  }
} catch (e) {
  console.warn("BroadcastChannel not supported in this environment:", e)
}

// Subscribers pool
type TaskListener = (payload: SyncEventPayload) => void
const taskSubscribers: Map<string, Set<TaskListener>> = new Map()
const globalSubscribers: Set<TaskListener> = new Set()

// Initialize BroadcastChannel message handler
if (broadcastChannel) {
  broadcastChannel.onmessage = (event: MessageEvent<SyncEventPayload>) => {
    const payload = event.data
    if (!payload || payload.sourceTabId === TAB_ID) return

    notifyListeners(payload)
  }
}

// Also listen to window storage events for fallback cross-tab sync
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "ux_portal_real_requests" || e.key === "ux_portal_realtime_ping") {
      const payload: SyncEventPayload = {
        type: "GLOBAL_REFRESH",
        timestamp: new Date().toISOString(),
        sourceTabId: "external_storage",
      }
      notifyListeners(payload)
    }
  })
}

function notifyListeners(payload: SyncEventPayload) {
  // Notify specific task subscribers
  if (payload.requestId && taskSubscribers.has(payload.requestId)) {
    const listeners = taskSubscribers.get(payload.requestId)!
    listeners.forEach((fn) => {
      try {
        fn(payload)
      } catch (err) {
        console.error("Error in task subscriber callback:", err)
      }
    })
  }

  // Notify global subscribers
  globalSubscribers.forEach((fn) => {
    try {
      fn(payload)
    } catch (err) {
      console.error("Error in global subscriber callback:", err)
    }
  })

  // Dispatch custom event for DOM components
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("ux_task_realtime_update", { detail: payload })
    )
    window.dispatchEvent(new CustomEvent("ux_data_refreshed"))
  }
}

/**
 * Broadcast an update event to all other tabs and local listeners
 */
export function broadcastTaskEvent(
  type: SyncEventType,
  requestId?: string,
  task?: Partial<UXRequest>,
  note?: string
) {
  const payload: SyncEventPayload = {
    type,
    requestId,
    task,
    timestamp: new Date().toISOString(),
    sourceTabId: TAB_ID,
    note,
  }

  // Send to other tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload)
    } catch (e) {
      console.warn("Could not postMessage to BroadcastChannel:", e)
    }
  }

  // Notify local listeners in the current tab
  notifyListeners(payload)

  // Update ping timestamp in localStorage to trigger storage events on older browsers
  try {
    localStorage.setItem("ux_portal_realtime_ping", Date.now().toString())
  } catch {}
}

/**
 * Subscribe to real-time updates for a specific task
 * Returns an unsubscribe function to call on component unmount
 */
export function subscribeToTask(
  requestId: string,
  callback: TaskListener
): () => void {
  if (!taskSubscribers.has(requestId)) {
    taskSubscribers.set(requestId, new Set())
  }
  taskSubscribers.get(requestId)!.add(callback)

  return () => {
    const set = taskSubscribers.get(requestId)
    if (set) {
      set.delete(callback)
      if (set.size === 0) {
        taskSubscribers.delete(requestId)
      }
    }
  }
}

/**
 * Subscribe to all real-time task events across the system
 */
export function subscribeToAllTasks(callback: TaskListener): () => void {
  globalSubscribers.add(callback)
  return () => {
    globalSubscribers.delete(callback)
  }
}

// ─── Adaptive Smart Poller for Active Tasks ──────────────────────────
let activePollingRequestId: string | null = null
let pollingTimer: any = null
const POLL_INTERVAL_ACTIVE = 8000 // 8s when user is viewing task
const POLL_INTERVAL_IDLE = 30000 // 30s when tab is inactive

/**
 * Start polling updates for the currently opened task drawer
 */
export function startTaskActivePolling(
  requestId: string,
  pollFetcher: (id: string) => Promise<void>
) {
  stopTaskActivePolling()
  activePollingRequestId = requestId

  const executePoll = async () => {
    if (!activePollingRequestId || activePollingRequestId !== requestId) return

    // Pause polling if user switched to another tab
    if (typeof document !== "undefined" && document.hidden) {
      scheduleNext(POLL_INTERVAL_IDLE)
      return
    }

    try {
      await pollFetcher(requestId)
    } catch {
      // Ignore network hiccup
    }

    scheduleNext(POLL_INTERVAL_ACTIVE)
  }

  const scheduleNext = (interval: number) => {
    if (pollingTimer) clearTimeout(pollingTimer)
    if (activePollingRequestId === requestId) {
      pollingTimer = setTimeout(executePoll, interval)
    }
  }

  // Initial schedule
  scheduleNext(POLL_INTERVAL_ACTIVE)
}

/**
 * Stop active task polling when drawer is closed
 */
export function stopTaskActivePolling() {
  activePollingRequestId = null
  if (pollingTimer) {
    clearTimeout(pollingTimer)
    pollingTimer = null
  }
}
