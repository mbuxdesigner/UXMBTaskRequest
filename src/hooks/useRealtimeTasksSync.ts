import { useState, useEffect, useRef, useCallback } from "react"
import { UXRequest } from "@/data/mockData"
import { fetchRequests, isLastRemoteFetchSuccessful } from "@/api/api"
import { getRequestPendingClassification } from "@/config/statusConfig"
import {
  subscribeToAllTasks,
  SyncEventPayload,
  TAB_ID,
} from "@/services/realtimeSyncService"

export interface UseRealtimeTasksSyncOptions {
  allRequests: UXRequest[]
  setAllRequests: React.Dispatch<React.SetStateAction<UXRequest[]>>
  selectedRequest?: UXRequest | null
  setSelectedRequest?: React.Dispatch<React.SetStateAction<UXRequest | null>>
  pollInterval?: number // default 12000 ms (12s)
  enabled?: boolean
}

export interface UseRealtimeTasksSyncReturn {
  mutatingTaskIds: Set<string>
  highlightedTaskIds: Set<string>
  incomingTaskIds: Set<string>
  incomingTasks: Map<string, UXRequest>
  triggerMutationHighlight: (requestId: string, updatedTask?: Partial<UXRequest>) => void
  triggerInsertionHighlight: (task: UXRequest) => void
  syncNow: () => Promise<void>
}

/**
 * Smart Diffing helper: Detects meaningful changes between two versions of a task
 */
export function hasTaskChanged(oldReq: UXRequest, newReq: UXRequest): boolean {
  if (oldReq.status !== newReq.status) return true
  if (oldReq.progress !== newReq.progress) return true
  if (oldReq.current_phase !== newReq.current_phase) return true
  if (oldReq.assigned_designer !== newReq.assigned_designer) return true
  if (oldReq.ux_owner !== newReq.ux_owner) return true
  if (oldReq.design_owner !== newReq.design_owner) return true
  if (oldReq.title !== newReq.title) return true
  if (oldReq.priority !== newReq.priority) return true
  if (oldReq.last_updated !== newReq.last_updated) return true
  if (oldReq.release_date !== newReq.release_date) return true
  if (oldReq.design_deadline !== newReq.design_deadline) return true
  if (oldReq.expected_deadline !== newReq.expected_deadline) return true
  if (oldReq.squad_name !== newReq.squad_name) return true
  if (oldReq.preferred_squad !== newReq.preferred_squad) return true
  if (oldReq.product !== newReq.product) return true
  if (oldReq.pending_reason !== newReq.pending_reason) return true

  // Compare pending classification (e.g. 24h timeout or pending tags)
  const oldPending = getRequestPendingClassification(oldReq)
  const newPending = getRequestPendingClassification(newReq)
  if (
    oldPending.isPending !== newPending.isPending ||
    oldPending.type !== newPending.type ||
    oldPending.label !== newPending.label ||
    oldPending.reason !== newPending.reason
  ) {
    return true
  }

  // Compare latest update messages
  if (
    oldReq.latest_update?.date !== newReq.latest_update?.date ||
    oldReq.latest_update?.message !== newReq.latest_update?.message ||
    oldReq.latest_update?.phase !== newReq.latest_update?.phase
  ) {
    return true
  }

  // Compare task updates log length and most recent update details (e.g. comment added)
  const oldLen = oldReq.task_updates?.length ?? 0
  const newLen = newReq.task_updates?.length ?? 0
  if (oldLen !== newLen) return true

  if (oldLen > 0 && newLen > 0) {
    const oldLatest = oldReq.task_updates?.[0]
    const newLatest = newReq.task_updates?.[0]
    if (
      oldLatest?.id !== newLatest?.id ||
      oldLatest?.timestamp !== newLatest?.timestamp ||
      oldLatest?.note !== newLatest?.note ||
      oldLatest?.new_progress !== newLatest?.new_progress ||
      oldLatest?.new_phase !== newLatest?.new_phase
    ) {
      return true
    }
  }

  return false
}

/**
 * Smart Diffing Engine: Categorizes tasks into mutated, incoming, and unchanged
 */
export function diffRequests(
  currentRequests: UXRequest[],
  incomingRequests: UXRequest[]
): {
  mutatedTasks: Map<string, UXRequest>
  incomingTasks: Map<string, UXRequest>
  unchangedCount: number
  hasChanges: boolean
} {
  const currentMap = new Map<string, UXRequest>()
  currentRequests.forEach((r) => {
    if (r.request_id) currentMap.set(r.request_id, r)
  })

  const mutatedTasks = new Map<string, UXRequest>()
  const incomingTasks = new Map<string, UXRequest>()
  let unchangedCount = 0

  for (const newReq of incomingRequests) {
    if (!newReq.request_id) continue
    const oldReq = currentMap.get(newReq.request_id)
    if (!oldReq) {
      incomingTasks.set(newReq.request_id, newReq)
    } else if (hasTaskChanged(oldReq, newReq)) {
      mutatedTasks.set(newReq.request_id, newReq)
    } else {
      unchangedCount++
    }
  }

  return {
    mutatedTasks,
    incomingTasks,
    unchangedCount,
    hasChanges: mutatedTasks.size > 0 || incomingTasks.size > 0,
  }
}

interface TaskTimerEntry {
  commitTimer?: ReturnType<typeof setTimeout>
  fadeTimer?: ReturnType<typeof setTimeout>
}

export function useRealtimeTasksSync({
  allRequests,
  setAllRequests,
  selectedRequest,
  setSelectedRequest,
  pollInterval = 12000,
  enabled = true,
}: UseRealtimeTasksSyncOptions): UseRealtimeTasksSyncReturn {
  // Sets of task IDs undergoing animation phases
  const [mutatingTaskIds, setMutatingTaskIds] = useState<Set<string>>(new Set())
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set())
  const [incomingTaskIds, setIncomingTaskIds] = useState<Set<string>>(new Set())
  const [incomingTasks, setIncomingTasks] = useState<Map<string, UXRequest>>(new Map())

  // References kept continuously in sync during render to prevent stale closure gaps
  const allRequestsRef = useRef<UXRequest[]>(allRequests)
  allRequestsRef.current = allRequests

  const selectedRequestRef = useRef<UXRequest | null>(selectedRequest ?? null)
  selectedRequestRef.current = selectedRequest ?? null

  // Dedicated per-task timer tracking to eliminate duplicate timer race conditions
  const taskTimersRef = useRef<Map<string, TaskTimerEntry>>(new Map())
  const isSyncingRef = useRef(false)
  const consecutiveErrorsRef = useRef(0)

  const clearTaskTimers = useCallback((requestId: string) => {
    const entry = taskTimersRef.current.get(requestId)
    if (entry) {
      if (entry.commitTimer) clearTimeout(entry.commitTimer)
      if (entry.fadeTimer) clearTimeout(entry.fadeTimer)
      taskTimersRef.current.delete(requestId)
    }
  }, [])

  const clearAllTimers = useCallback(() => {
    taskTimersRef.current.forEach((entry) => {
      if (entry.commitTimer) clearTimeout(entry.commitTimer)
      if (entry.fadeTimer) clearTimeout(entry.fadeTimer)
    })
    taskTimersRef.current.clear()
  }, [])

  useEffect(() => {
    return () => clearAllTimers()
  }, [clearAllTimers])

  /**
   * Handle In-place Row Skeleton Mutation Pipeline (R2)
   * 1. Add to mutatingTaskIds (~450ms shimmer + opacity-40)
   * 2. Commit updated data into allRequests state
   * 3. Update drawer if viewing this task
   * 4. Remove from mutatingTaskIds, add to highlightedTaskIds (~1500ms soft blue glow)
   */
  const handleMutatingTask = useCallback(
    (requestId: string, updatedData: Partial<UXRequest>) => {
      if (!requestId) return

      // Clear any prior timer for this task to prevent race conditions
      clearTaskTimers(requestId)

      // Stage 1: Enter mutating state (inline skeleton shimmer + opacity-40)
      setMutatingTaskIds((prev) => new Set(prev).add(requestId))

      const commitTimer = setTimeout(() => {
        // Stage 2: Commit data to state
        setAllRequests((prev) =>
          prev.map((r) => (r.request_id === requestId ? { ...r, ...updatedData } : r))
        )

        // Keep drawer context updated if currently opened
        if (selectedRequestRef.current?.request_id === requestId && setSelectedRequest) {
          setSelectedRequest((prev) => (prev ? { ...prev, ...updatedData } : prev))
        }

        // Stage 3: Exit mutating, enter highlight pulse
        setMutatingTaskIds((prev) => {
          const next = new Set(prev)
          next.delete(requestId)
          return next
        })
        setHighlightedTaskIds((prev) => new Set(prev).add(requestId))

        // Stage 4: Fade highlight after 1.5s
        const fadeTimer = setTimeout(() => {
          setHighlightedTaskIds((prev) => {
            const next = new Set(prev)
            next.delete(requestId)
            return next
          })
          taskTimersRef.current.delete(requestId)
        }, 1500)

        const entry = taskTimersRef.current.get(requestId)
        if (entry) {
          entry.fadeTimer = fadeTimer
          entry.commitTimer = undefined
        }
      }, 450)

      taskTimersRef.current.set(requestId, { commitTimer })
    },
    [setAllRequests, setSelectedRequest, clearTaskTimers]
  )

  /**
   * Handle Bulk Mutation Pipeline (Ledger Item 1)
   * Batches multiple task mutations into a single state commit pass O(N) and caps
   * simultaneous shimmer nodes (top 15) to eliminate GPU compositor saturation.
   */
  const handleBatchMutation = useCallback(
    (mutatedMap: Map<string, UXRequest>) => {
      if (!mutatedMap || mutatedMap.size === 0) return

      const allIds = Array.from(mutatedMap.keys())
      allIds.forEach((id) => clearTaskTimers(id))

      // Cap simultaneous active shimmer animations to 15 to prevent GPU thrashing,
      // while updating 100% of tasks in data state
      const shimmerIds = allIds.slice(0, 15)

      // Stage 1: Enter mutating state
      setMutatingTaskIds((prev) => {
        const next = new Set(prev)
        shimmerIds.forEach((id) => next.add(id))
        return next
      })

      const batchCommitTimer = setTimeout(() => {
        // Stage 2: Single O(N) pass to commit data to allRequests
        setAllRequests((prev) =>
          prev.map((r) => {
            const updated = mutatedMap.get(r.request_id)
            return updated ? { ...r, ...updated } : r
          })
        )

        // Keep drawer context updated if currently opened task is in mutated set
        if (
          selectedRequestRef.current?.request_id &&
          mutatedMap.has(selectedRequestRef.current.request_id) &&
          setSelectedRequest
        ) {
          const updatedSelected = mutatedMap.get(selectedRequestRef.current.request_id)!
          setSelectedRequest((prev) => (prev ? { ...prev, ...updatedSelected } : prev))
        }

        // Stage 3: Exit mutating, enter highlight pulse in single state updates
        setMutatingTaskIds((prev) => {
          const next = new Set(prev)
          shimmerIds.forEach((id) => next.delete(id))
          return next
        })
        setHighlightedTaskIds((prev) => {
          const next = new Set(prev)
          shimmerIds.forEach((id) => next.add(id))
          return next
        })

        // Stage 4: Fade highlights after 1.5s
        const batchFadeTimer = setTimeout(() => {
          setHighlightedTaskIds((prev) => {
            const next = new Set(prev)
            shimmerIds.forEach((id) => next.delete(id))
            return next
          })
          shimmerIds.forEach((id) => taskTimersRef.current.delete(id))
        }, 1500)

        shimmerIds.forEach((id) => {
          const entry = taskTimersRef.current.get(id)
          if (entry) {
            entry.fadeTimer = batchFadeTimer
            entry.commitTimer = undefined
          }
        })
      }, 450)

      shimmerIds.forEach((id) => {
        taskTimersRef.current.set(id, { commitTimer: batchCommitTimer })
      })
    },
    [setAllRequests, setSelectedRequest, clearTaskTimers]
  )

  /**
   * Handle Layout Shift & Skeleton Insertion for New Tasks (R3)
   * 1. Prepend new task to allRequests immediately so groups and row exist in DOM,
   *    marking requestId in incomingTaskIds and incomingTasks (renders standard row skeleton)
   * 2. Framer Motion layout="position" smoothly slides all existing rows down
   * 3. After 500ms: remove from incomingTaskIds, add to highlightedTaskIds (in-place cross-fade to real content)
   * 4. After 1.5s: fade out soft blue highlight
   */
  const handleIncomingTask = useCallback(
    (requestId: string, newTask: UXRequest) => {
      if (!requestId || !newTask) return

      // If task already exists in allRequests, treat as mutation instead
      if (allRequestsRef.current.some((r) => r.request_id === requestId)) {
        handleMutatingTask(requestId, newTask)
        return
      }

      // Clear any prior timer for this task
      clearTaskTimers(requestId)

      // Stage 1: Commit new task into allRequests immediately so groups and rows exist,
      // while marking in incomingTaskIds so row renders standard skeleton cells for 500ms
      setAllRequests((prev) => {
        if (prev.some((r) => r.request_id === requestId)) return prev
        return [newTask, ...prev]
      })
      setIncomingTaskIds((prev) => new Set(prev).add(requestId))
      setIncomingTasks((prev) => new Map(prev).set(requestId, newTask))

      const commitTimer = setTimeout(() => {
        // Stage 2: Remove from incoming, add to highlighted
        setIncomingTaskIds((prev) => {
          const next = new Set(prev)
          next.delete(requestId)
          return next
        })
        setIncomingTasks((prev) => {
          const next = new Map(prev)
          next.delete(requestId)
          return next
        })
        setHighlightedTaskIds((prev) => new Set(prev).add(requestId))

        // Stage 3: Fade highlight after 1.5s
        const fadeTimer = setTimeout(() => {
          setHighlightedTaskIds((prev) => {
            const next = new Set(prev)
            next.delete(requestId)
            return next
          })
          taskTimersRef.current.delete(requestId)
        }, 1500)

        const entry = taskTimersRef.current.get(requestId)
        if (entry) {
          entry.fadeTimer = fadeTimer
          entry.commitTimer = undefined
        }
      }, 500)

      taskTimersRef.current.set(requestId, { commitTimer })
    },
    [handleMutatingTask, setAllRequests, clearTaskTimers]
  )

  /**
   * Handle Bulk Incoming Tasks Pipeline (Ledger Item 1)
   */
  const handleBatchIncoming = useCallback(
    (incomingMap: Map<string, UXRequest>) => {
      if (!incomingMap || incomingMap.size === 0) return

      const trulyNewMap = new Map<string, UXRequest>()
      const reroutedMutations = new Map<string, UXRequest>()

      incomingMap.forEach((task, id) => {
        if (allRequestsRef.current.some((r) => r.request_id === id)) {
          reroutedMutations.set(id, task)
        } else {
          trulyNewMap.set(id, task)
        }
      })

      if (reroutedMutations.size > 0) {
        handleBatchMutation(reroutedMutations)
      }

      if (trulyNewMap.size === 0) return

      const newIds = Array.from(trulyNewMap.keys())
      const newTasks = Array.from(trulyNewMap.values())
      newIds.forEach((id) => clearTaskTimers(id))

      // Stage 1: Prepend all new tasks in a single state update
      setAllRequests((prev) => {
        const existingIds = new Set(prev.map((r) => r.request_id))
        const tasksToAdd = newTasks.filter((r) => !existingIds.has(r.request_id))
        return [...tasksToAdd, ...prev]
      })

      setIncomingTaskIds((prev) => {
        const next = new Set(prev)
        newIds.forEach((id) => next.add(id))
        return next
      })
      setIncomingTasks((prev) => {
        const next = new Map(prev)
        trulyNewMap.forEach((task, id) => next.set(id, task))
        return next
      })

      const batchCommitTimer = setTimeout(() => {
        setIncomingTaskIds((prev) => {
          const next = new Set(prev)
          newIds.forEach((id) => next.delete(id))
          return next
        })
        setIncomingTasks((prev) => {
          const next = new Map(prev)
          newIds.forEach((id) => next.delete(id))
          return next
        })
        setHighlightedTaskIds((prev) => {
          const next = new Set(prev)
          newIds.forEach((id) => next.add(id))
          return next
        })

        const batchFadeTimer = setTimeout(() => {
          setHighlightedTaskIds((prev) => {
            const next = new Set(prev)
            newIds.forEach((id) => next.delete(id))
            return next
          })
          newIds.forEach((id) => taskTimersRef.current.delete(id))
        }, 1500)

        newIds.forEach((id) => {
          const entry = taskTimersRef.current.get(id)
          if (entry) {
            entry.fadeTimer = batchFadeTimer
            entry.commitTimer = undefined
          }
        })
      }, 500)

      newIds.forEach((id) => {
        taskTimersRef.current.set(id, { commitTimer: batchCommitTimer })
      })
    },
    [handleBatchMutation, setAllRequests, clearTaskTimers]
  )

  /**
   * Manual trigger for local user actions (e.g. Kanban move, Status update)
   */
  const triggerMutationHighlight = useCallback(
    (requestId: string, updatedTask?: Partial<UXRequest>) => {
      if (!requestId) return
      if (updatedTask) {
        handleMutatingTask(requestId, updatedTask)
      } else {
        // Run mutation shimmer for 400ms then highlight for 1.5s
        clearTaskTimers(requestId)
        setMutatingTaskIds((prev) => new Set(prev).add(requestId))

        const commitTimer = setTimeout(() => {
          setMutatingTaskIds((prev) => {
            const next = new Set(prev)
            next.delete(requestId)
            return next
          })
          setHighlightedTaskIds((prev) => new Set(prev).add(requestId))

          const fadeTimer = setTimeout(() => {
            setHighlightedTaskIds((prev) => {
              const next = new Set(prev)
              next.delete(requestId)
              return next
            })
            taskTimersRef.current.delete(requestId)
          }, 1500)

          const entry = taskTimersRef.current.get(requestId)
          if (entry) {
            entry.fadeTimer = fadeTimer
            entry.commitTimer = undefined
          }
        }, 400)

        taskTimersRef.current.set(requestId, { commitTimer })
      }
    },
    [handleMutatingTask, clearTaskTimers]
  )

  const triggerInsertionHighlight = useCallback(
    (task: UXRequest) => {
      if (!task.request_id) return
      handleIncomingTask(task.request_id, task)
    },
    [handleIncomingTask]
  )

  /**
   * Smart Sync Execution: fetches latest from sheet and applies diff with concurrency protection
   */
  const executeSmartSync = useCallback(
    async (forceRefresh = false) => {
      if (isSyncingRef.current) return
      isSyncingRef.current = true

      try {
        const latest = await fetchRequests(forceRefresh)

        // Check if remote fetch genuinely succeeded or fell back to offline cache
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine
        if (!isLastRemoteFetchSuccessful() || isOffline) {
          consecutiveErrorsRef.current += 1
          return
        }

        consecutiveErrorsRef.current = 0 // Reset backoff on genuine remote success

        if (!latest || latest.length === 0) return

        const current = allRequestsRef.current
        if (current.length === 0) return // Initial load handles empty array

        const diff = diffRequests(current, latest)
        if (diff.hasChanges) {
          // Process incoming tasks (batch or single)
          if (diff.incomingTasks.size === 1) {
            const [id, newReq] = Array.from(diff.incomingTasks.entries())[0]
            handleIncomingTask(id, newReq)
          } else if (diff.incomingTasks.size > 1) {
            handleBatchIncoming(diff.incomingTasks)
          }

          // Process mutated tasks (batch or single)
          if (diff.mutatedTasks.size === 1) {
            const [id, updatedReq] = Array.from(diff.mutatedTasks.entries())[0]
            handleMutatingTask(id, updatedReq)
          } else if (diff.mutatedTasks.size > 1) {
            handleBatchMutation(diff.mutatedTasks)
          }
        }
      } catch {
        // Network resilience: record error for backoff
        consecutiveErrorsRef.current += 1
      } finally {
        isSyncingRef.current = false
      }
    },
    [handleIncomingTask, handleBatchIncoming, handleMutatingTask, handleBatchMutation]
  )

  /**
   * R1. Smart Background Poller (every 10s - 15s when tab is visible, with exponential backoff on error)
   */
  useEffect(() => {
    if (!enabled) return

    let pollerTimeout: ReturnType<typeof setTimeout> | null = null
    let isCancelled = false

    const schedulePoll = (delay: number) => {
      if (isCancelled) return
      if (pollerTimeout) clearTimeout(pollerTimeout)
      pollerTimeout = setTimeout(async () => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          await executeSmartSync(true)
        }
        // Calculate next delay with exponential backoff on consecutive network failures
        const backoffFactor = Math.min(consecutiveErrorsRef.current, 4)
        const nextDelay = Math.min(pollInterval * Math.pow(1.5, backoffFactor), 60000)
        schedulePoll(nextDelay)
      }, delay)
    }

    schedulePoll(pollInterval)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Immediately sync on tab re-focus and reset backoff schedule
        consecutiveErrorsRef.current = 0
        executeSmartSync(true)
        schedulePoll(pollInterval)
      }
    }

    const handleOnline = () => {
      consecutiveErrorsRef.current = 0
      executeSmartSync(true)
      schedulePoll(pollInterval)
    }

    const handleOffline = () => {
      if (pollerTimeout) clearTimeout(pollerTimeout)
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)
    }

    return () => {
      isCancelled = true
      if (pollerTimeout) clearTimeout(pollerTimeout)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }
  }, [enabled, pollInterval, executeSmartSync])

  /**
   * R1. Real-time Event Bus Ingestion (BroadcastChannel & storage events)
   */
  useEffect(() => {
    if (!enabled) return

    const unsubscribe = subscribeToAllTasks((payload: SyncEventPayload) => {
      // Ignore self-broadcasts to prevent duplicate animations
      if (payload.sourceTabId === TAB_ID) return

      if (payload.type === "TASK_CREATED" && payload.requestId && payload.task) {
        handleIncomingTask(payload.requestId, payload.task as UXRequest)
      } else if (
        (payload.type === "TASK_UPDATED" ||
          payload.type === "PHASE_CHANGED" ||
          payload.type === "STATUS_CHANGED" ||
          payload.type === "COMMENT_ADDED") &&
        payload.requestId
      ) {
        if (payload.task) {
          handleMutatingTask(payload.requestId, payload.task)
        } else {
          executeSmartSync(false)
        }
      } else if (payload.type === "GLOBAL_REFRESH") {
        executeSmartSync(false)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [enabled, handleIncomingTask, handleMutatingTask, executeSmartSync])

  return {
    mutatingTaskIds,
    highlightedTaskIds,
    incomingTaskIds,
    incomingTasks,
    triggerMutationHighlight,
    triggerInsertionHighlight,
    syncNow: () => executeSmartSync(true),
  }
}
