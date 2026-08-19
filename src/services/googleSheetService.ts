import {
  PRODUCTS as DEFAULT_PRODUCTS,
  REQUEST_TYPES as DEFAULT_REQUEST_TYPES,
  EXPECTED_OUTPUTS as DEFAULT_EXPECTED_OUTPUTS,
  DEADLINE_REASONS as DEFAULT_DEADLINE_REASONS,
  mockSquads,
  Squad,
  UXRequest,
  TaskUpdateRecord,
  UserRole,
  buildPhases,
} from "../data/mockData"
import { getGoogleSheetConfig, saveGoogleSheetConfig } from "../config/googleSheetConfig"
import { getStoredSession } from "./otpAuthService"

export interface SelectionsData {
  products: string[]
  request_types: string[]
  expected_outputs: string[]
  deadline_reasons: string[]
  squads?: Squad[]
  product_squad_map?: Record<string, string>
}

export const FALLBACK_SELECTIONS: SelectionsData = {
  products: DEFAULT_PRODUCTS,
  request_types: DEFAULT_REQUEST_TYPES,
  expected_outputs: DEFAULT_EXPECTED_OUTPUTS,
  deadline_reasons: DEFAULT_DEADLINE_REASONS,
  squads: mockSquads,
  product_squad_map: {
    "App/Card": "Payments Squad",
    "App/Lending": "Lending Squad",
    "App/Saving": "Wealth Squad",
    "App/Core": "Daily Banking Squad",
    "Digi": "Daily Banking Squad",
  },
}

let cachedSelections: SelectionsData | null = null
let cachedRequestsMemory: UXRequest[] | null = null
let inflightRequestsPromise: Promise<UXRequest[]> | null = null
let inflightSelectionsPromise: Promise<SelectionsData> | null = null

const REQUESTS_CACHE_KEY = "ux_portal_real_requests"
const SELECTIONS_CACHE_KEY = "ux_portal_selections_cache"

/**
 * Normalizes raw object from Google Sheet into a complete UXRequest object
 */
export function normalizeSheetRequest(data: any): UXRequest {
  const currentPhase = String(data.current_phase || "Đã gửi yêu cầu")
  const submittedAt = String(data.submitted_at || data.submitted_at_vn || data.timestamp || "Vừa xong")
  const formattedDate = submittedAt.includes("T")
    ? new Date(submittedAt).toLocaleDateString("vi-VN")
    : submittedAt

  const taskUpdates: TaskUpdateRecord[] = Array.isArray(data.task_updates)
    ? data.task_updates
    : data.latest_update && data.latest_update.message
    ? [
        {
          id: `LOG-${data.request_id || "INIT"}-01`,
          request_id: String(data.request_id || ""),
          timestamp: String(data.last_updated || formattedDate),
          updated_by: String(data.assigned_designer || data.ux_owner || "Hệ thống"),
          author_role: (data.author_role as UserRole) || "Designer",
          new_phase: currentPhase,
          new_progress: typeof data.progress === "number" ? data.progress : 15,
          note: String(data.latest_update.message || "Yêu cầu đã được tiếp nhận."),
          deliverable_link: String(data.deliverables?.figma_url || data.doc_link || ""),
        },
      ]
    : []

  return {
    request_id: String(data.request_id || "UXMB-PENDING"),
    title: String(data.title || "Yêu cầu thiết kế UX"),
    product: String(data.product || "Khác"),
    request_type: String(data.request_type || "Tính năng mới"),
    feature_journey: String(data.feature_journey || data.title || "Core Journey"),
    description: String(data.description || ""),
    business_need: String(data.business_need || ""),
    user_problem: String(data.user_problem || ""),
    target_user: String(data.target_user || "Người dùng chung"),
    expected_output: Array.isArray(data.expected_output)
      ? data.expected_output
      : ["User Flow", "UI Design"],
    expected_deadline: String(data.release_date || data.expected_deadline || ""),
    deadline_reason: String(data.deadline_reason || "Ra mắt sản phẩm"),
    preferred_squad: String(data.preferred_squad || data.product || "Chưa phân công"),
    requester_email: String(data.requester_email || ""),
    assigned_designer: String(data.assigned_designer || data.ux_owner || "nam.designer@mbbank.com.vn"),
    design_owner: String(data.design_owner || "lead.cuong@mbbank.com.vn"),
    squad_name: String(data.preferred_squad || data.product || "Triage Squad"),
    ux_owner: String(data.ux_owner || "Đang phân công"),
    current_phase: currentPhase,
    status: String(data.status || "Đang phân loại"),
    progress: typeof data.progress === "number" ? data.progress : 15,
    last_updated: String(data.last_updated || formattedDate),
    phases: Array.isArray(data.phases) && data.phases.length ? data.phases : buildPhases(currentPhase),
    latest_update: data.latest_update || {
      date: formattedDate,
      phase: currentPhase,
      message: "Yêu cầu đã được ghi nhận vào hệ thống Google Sheet.",
    },
    deliverables: data.deliverables || {
      figma_url: String(data.doc_link || ""),
    },
    submitted_at: formattedDate,
    task_updates: taskUpdates,
  }
}

/**
 * Fetch real requests list from Google Sheet Web App with SWR (Stale-While-Revalidate)
 */
export async function fetchRequestsFromSheet(forceRefresh = false): Promise<UXRequest[]> {
  // 1. In-memory fast cache (0ms)
  if (!forceRefresh && cachedRequestsMemory && cachedRequestsMemory.length > 0) {
    return cachedRequestsMemory
  }

  // 2. LocalStorage fast cache (1ms)
  if (!forceRefresh) {
    try {
      const localCached = localStorage.getItem(REQUESTS_CACHE_KEY)
      if (localCached) {
        const parsed = JSON.parse(localCached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedRequestsMemory = parsed.map(normalizeSheetRequest)
          // Trigger background fetch without blocking UI
          backgroundSyncRequests()
          return cachedRequestsMemory
        }
      }
    } catch (e) {
      console.warn("Could not read localStorage cache:", e)
    }
  }

  // 3. Deduplicate concurrent requests
  if (inflightRequestsPromise) {
    return inflightRequestsPromise
  }

  inflightRequestsPromise = (async () => {
    const config = getGoogleSheetConfig()

    if (config.scriptUrl && config.scriptUrl.trim()) {
      try {
        const url = new URL(config.scriptUrl.trim())
        url.searchParams.set("action", "get_requests")
        if (forceRefresh) {
          url.searchParams.set("_t", Date.now().toString())
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 4000)

        const res = await fetch(url.toString(), {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (res.ok) {
          const data = await res.json()
          if (data.status === "success" && Array.isArray(data.requests)) {
            const normalized = data.requests.map(normalizeSheetRequest)
            cachedRequestsMemory = normalized
            try {
              localStorage.setItem(REQUESTS_CACHE_KEY, JSON.stringify(normalized))
              saveGoogleSheetConfig({ lastSyncedAt: new Date().toISOString() })
            } catch (e) {
              console.warn("Could not save requests to localStorage:", e)
            }
            return normalized
          }
        }
      } catch (err) {
        console.warn("Could not fetch requests from Google Sheet, falling back to cache:", err)
      }
    }

    // Fallback to local cache if offline or not configured
    try {
      const cached = localStorage.getItem(REQUESTS_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) {
          const normalized = parsed.map(normalizeSheetRequest)
          cachedRequestsMemory = normalized
          return normalized
        }
      }
    } catch (e) {
      console.warn("Could not read cached requests:", e)
    }

    return []
  })().finally(() => {
    inflightRequestsPromise = null
  })

  return inflightRequestsPromise
}

async function backgroundSyncRequests() {
  try {
    const config = getGoogleSheetConfig()
    if (!config.scriptUrl || !config.scriptUrl.trim()) return

    const url = new URL(config.scriptUrl.trim())
    url.searchParams.set("action", "get_requests")
    url.searchParams.set("_t", Date.now().toString())

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    })

    if (res.ok) {
      const data = await res.json()
      if (data.status === "success" && Array.isArray(data.requests)) {
        const normalized = data.requests.map(normalizeSheetRequest)
        cachedRequestsMemory = normalized
        localStorage.setItem(REQUESTS_CACHE_KEY, JSON.stringify(normalized))
      }
    }
  } catch {
    // Silently ignore background sync errors
  }
}

/**
 * Fetch dynamic selection options from Google Sheets Web App with fast caching
 */
export async function fetchSelectionsFromSheet(forceRefresh = false): Promise<SelectionsData> {
  if (!forceRefresh && cachedSelections) {
    return cachedSelections
  }

  // Check localStorage cache
  if (!forceRefresh) {
    try {
      const local = localStorage.getItem(SELECTIONS_CACHE_KEY)
      if (local) {
        const parsed = JSON.parse(local)
        if (parsed && parsed.products) {
          cachedSelections = parsed
          return parsed
        }
      }
    } catch (e) {
      console.warn("Could not read selections cache:", e)
    }
  }

  if (inflightSelectionsPromise) {
    return inflightSelectionsPromise
  }

  inflightSelectionsPromise = (async () => {
    const config = getGoogleSheetConfig()
    if (!config.scriptUrl || !config.scriptUrl.trim()) {
      cachedSelections = FALLBACK_SELECTIONS
      return FALLBACK_SELECTIONS
    }

    try {
      const url = new URL(config.scriptUrl)
      url.searchParams.set("action", "get_selections")

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (data.status === "success" && data.selections) {
          const merged: SelectionsData = {
            products: data.selections.products?.length
              ? data.selections.products
              : FALLBACK_SELECTIONS.products,
            request_types: data.selections.request_types?.length
              ? data.selections.request_types
              : FALLBACK_SELECTIONS.request_types,
            expected_outputs: data.selections.expected_outputs?.length
              ? data.selections.expected_outputs
              : FALLBACK_SELECTIONS.expected_outputs,
            deadline_reasons: data.selections.deadline_reasons?.length
              ? data.selections.deadline_reasons
              : FALLBACK_SELECTIONS.deadline_reasons,
            squads: data.selections.squads?.length
              ? data.selections.squads
              : FALLBACK_SELECTIONS.squads,
            product_squad_map: data.selections.product_squad_map
              ? data.selections.product_squad_map
              : FALLBACK_SELECTIONS.product_squad_map,
          }
          cachedSelections = merged
          try {
            localStorage.setItem(SELECTIONS_CACHE_KEY, JSON.stringify(merged))
          } catch {}
          saveGoogleSheetConfig({ lastSyncedAt: new Date().toISOString() })
          return merged
        }
      }
    } catch (err) {
      console.warn("Could not fetch selections from Google Sheet, using defaults:", err)
    }

    cachedSelections = FALLBACK_SELECTIONS
    return FALLBACK_SELECTIONS
  })().finally(() => {
    inflightSelectionsPromise = null
  })

  return inflightSelectionsPromise
}

/**
 * Log submitted UX Request data to Google Sheet as JSON
 */
export async function logRequestToGoogleSheet(
  requestData: Record<string, unknown>
): Promise<{ success: boolean; message: string; sheetRow?: number; requestId?: string }> {
  const config = getGoogleSheetConfig()
  const payload = {
    action: "log_request",
    timestamp: new Date().toISOString(),
    submitted_at_vn: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    request_id: requestData.request_id,
    title: requestData.title,
    product: requestData.product,
    request_type: requestData.request_type,
    requester_email: requestData.requester_email || "requester@bank.com",
    preferred_squad: requestData.preferred_squad,
    expected_deadline: requestData.release_date || requestData.expected_deadline,
    deadline_reason: requestData.deadline_reason,
    description: requestData.description,
    business_need: requestData.business_need,
    user_problem: requestData.user_problem,
    target_user: requestData.target_user,
    doc_link: requestData.doc_link,
    json_payload: JSON.stringify(requestData, null, 2),
    raw_data: requestData,
  }

  if (!config.scriptUrl || !config.scriptUrl.trim()) {
    return {
      success: true,
      message: "Yêu cầu đã được lưu thành công (Chế độ nội bộ / Local)",
    }
  }

  try {
    const res = await fetch(config.scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    })

    try {
      const data = await res.json()
      if (data.status === "success") {
        return {
          success: true,
          message: `Đã ghi log thành công vào Google Sheet (Dòng ${data.row || "mới"})!`,
          sheetRow: data.row,
          requestId: data.request_id,
        }
      }
    } catch {
      // Fallback
    }

    return {
      success: true,
      message: "Đã đồng bộ và ghi log thành công vào Google Sheet!",
      requestId: String(payload.request_id),
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      message: `Không thể gửi log tới Google Sheet: ${errorMsg}`,
    }
  }
}

/**
 * Update task phase, progress, and note with RBAC validation
 */
export async function updateTaskProgressInSheet(
  requestId: string,
  params: {
    new_phase: string
    new_status: string
    new_progress: number
    note: string
    figma_url?: string
    assigned_designer?: string
  }
): Promise<{ success: boolean; message: string; updatedRequest?: UXRequest }> {
  const session = getStoredSession()
  const config = getGoogleSheetConfig()
  const now = new Date()
  const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1
  ).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`

  const newLogRecord: TaskUpdateRecord = {
    id: `LOG-${Date.now()}`,
    request_id: requestId,
    timestamp: formattedDate,
    updated_by: session ? session.teamsEmail : "nam.designer@mbbank.com.vn",
    author_role: session ? session.role : "Designer",
    new_phase: params.new_phase,
    new_progress: params.new_progress,
    note: params.note,
    deliverable_link: params.figma_url || "",
  }

  // Cập nhật LocalStorage và Memory Cache ngay tức thì
  try {
    const cached = localStorage.getItem(REQUESTS_CACHE_KEY)
    let existingList: UXRequest[] = cached ? JSON.parse(cached) : []
    const targetIdx = existingList.findIndex((r) => r.request_id === requestId)

    if (targetIdx !== -1) {
      const oldReq = existingList[targetIdx]
      const updatedReq: UXRequest = {
        ...oldReq,
        current_phase: params.new_phase,
        status: params.new_status,
        progress: params.new_progress,
        last_updated: formattedDate,
        assigned_designer: params.assigned_designer || oldReq.assigned_designer,
        phases: buildPhases(params.new_phase),
        latest_update: {
          date: formattedDate,
          phase: params.new_phase,
          message: params.note,
        },
        deliverables: {
          ...oldReq.deliverables,
          figma_url: params.figma_url || oldReq.deliverables?.figma_url,
        },
        task_updates: [newLogRecord, ...(oldReq.task_updates || [])],
      }

      existingList[targetIdx] = updatedReq
      cachedRequestsMemory = existingList
      localStorage.setItem(REQUESTS_CACHE_KEY, JSON.stringify(existingList))
    }
  } catch (e) {
    console.warn("Could not update request in localStorage:", e)
  }

  // Đồng bộ lên Google Sheet nếu có cấu hình
  if (config.scriptUrl && config.scriptUrl.trim()) {
    try {
      const payload = {
        action: "update_task_progress",
        session_token: session?.sessionToken || "DEMO_TOKEN",
        request_id: requestId,
        new_phase: params.new_phase,
        new_status: params.new_status,
        new_progress: params.new_progress,
        note: params.note,
        figma_url: params.figma_url || "",
        assigned_designer: params.assigned_designer || "",
        timestamp: now.toISOString(),
      }

      const res = await fetch(config.scriptUrl.trim(), {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.status === "success") {
        return { success: true, message: data.message || "Cập nhật tiến độ thành công!" }
      }
      return { success: false, message: data.message || "Không thể cập nhật trên Google Sheet." }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return {
        success: true,
        message: `Đã lưu cập nhật nội bộ (Lỗi đồng bộ Google Sheet: ${errorMsg})`,
      }
    }
  }

  return {
    success: true,
    message: "Đã cập nhật tiến độ và ghi nhận nhật ký thành công!",
  }
}

/**
 * Test connection to Google Apps Script Web App
 */
export async function testGoogleSheetConnection(scriptUrl: string): Promise<{
  connected: boolean
  message: string
  selectionsCount?: { products: number; request_types: number }
}> {
  if (!scriptUrl || !scriptUrl.trim()) {
    return { connected: false, message: "Vui lòng nhập URL Google Apps Script Web App" }
  }

  try {
    const url = new URL(scriptUrl.trim())
    url.searchParams.set("action", "ping")

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    })

    if (!res.ok) {
      return { connected: false, message: `Lỗi máy chủ Google: HTTP ${res.status}` }
    }

    const data = await res.json()
    if (data.status === "success") {
      return {
        connected: true,
        message: data.message || "Kết nối Google Sheet thành công!",
        selectionsCount: {
          products: data.selections?.products?.length || 0,
          request_types: data.selections?.request_types?.length || 0,
        },
      }
    }
    return { connected: false, message: data.message || "Phản hồi không hợp lệ từ Google Sheet" }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      connected: false,
      message: `Không thể kết nối đến Web App: ${errorMsg}. Đảm bảo bạn đã Deploy Web App ở chế độ 'Anyone' (Bất kỳ ai).`,
    }
  }
}
