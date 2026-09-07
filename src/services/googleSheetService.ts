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
  mockRequests,
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
    "App MBBank": "eSaving",
    "Biz MBBank": "Biz Lending",
    "BaaS & Open API": "BaaS Gateway",
    "Design System & Nền tảng": "Design System MB",
  },
}

let cachedSelections: SelectionsData | null = null
let cachedRequestsMemory: UXRequest[] | null = null
let inflightRequestsPromise: Promise<UXRequest[]> | null = null
let inflightSelectionsPromise: Promise<SelectionsData> | null = null

const REQUESTS_CACHE_KEY = "ux_portal_real_requests"
const SELECTIONS_CACHE_KEY = "ux_portal_selections_cache"

/**
 * Helper chuẩn xác chuyển đổi chuỗi ngày giờ (DD/MM/YYYY HH:mm:ss hoặc ISO) sang milliseconds
 */
export function parseDateTimeToMs(ts?: string): number {
  if (!ts) return 0
  const trimmed = String(ts).trim()
  if (!trimmed) return 0

  // 1. Định dạng Việt Nam DD/MM/YYYY HH:mm:ss hoặc DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/)
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10)
    const month = parseInt(dmyMatch[2], 10) - 1
    const year = parseInt(dmyMatch[3], 10)
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0
    const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0
    return new Date(year, month, day, hour, minute, second).getTime()
  }

  // 2. Định dạng chuẩn ISO 8601 hoặc new Date()
  const parsed = new Date(trimmed).getTime()
  return isNaN(parsed) ? 0 : parsed
}

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

  const rawDocLink = String(data.doc_link || "")
  let docLinks: string[] = []
  if (Array.isArray(data.doc_links) && data.doc_links.length > 0) {
    docLinks = data.doc_links
  } else if (rawDocLink) {
    docLinks = rawDocLink.split("\n").map((s: string) => s.trim()).filter(Boolean)
  }

  let attachments: Array<{ name: string; url: string; size?: number }> = []
  if (Array.isArray(data.attachments) && data.attachments.length > 0) {
    attachments = data.attachments
  } else if (data.raw_data && Array.isArray(data.raw_data.attachments)) {
    attachments = data.raw_data.attachments
  } else if (docLinks.length > 0) {
    attachments = docLinks.map((url, idx) => {
      const fileName = url.includes("/") ? url.split("/").pop() || `Tài liệu ${idx + 1}` : `Tài liệu ${idx + 1}`
      return {
        name: decodeURIComponent(fileName.split("?")[0]),
        url,
      }
    })
  }

  const rawProduct = String(data.product || "Khác").trim()
  let rawPreferredSquad = String(data.preferred_squad || "").trim()
  let rawSquadName = String(data.squad_name || "").trim()

  // Tự động làm sạch nếu squad bị gán nhầm thành tên sản phẩm
  if (rawPreferredSquad.toLowerCase() === rawProduct.toLowerCase()) {
    rawPreferredSquad = ""
  }
  if (rawSquadName.toLowerCase() === rawProduct.toLowerCase()) {
    rawSquadName = ""
  }
  const cleanSquad = rawSquadName || rawPreferredSquad || ""

  const rawSentToPo = data.sent_to_po_at ? String(data.sent_to_po_at).trim() : undefined
  const effectiveSentToPo = rawSentToPo || (data.status === "Đã gửi PO" ? new Date().toISOString() : undefined)

  return {
    request_id: String(data.request_id || "UXMB-PENDING"),
    title: String(data.title || "Yêu cầu thiết kế UX"),
    product: rawProduct,
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
    release_date: String(data.release_date || data.expected_deadline || ""),
    design_deadline: String(data.design_deadline || data.ux_deadline || data.expected_deadline || ""),
    deadline_reason: String(data.deadline_reason || "Ra mắt sản phẩm"),
    preferred_squad: cleanSquad,
    requester_email: String(data.requester_email || ""),
    requester_name: String(data.requester_name || data.requester_email?.split("@")[0] || "PO"),
    assigned_designer: data.assigned_designer ? String(data.assigned_designer) : "",
    design_owner: String(data.design_owner || "lead.cuong@mbbank.com.vn"),
    squad_name: cleanSquad,
    ux_owner: data.ux_owner ? String(data.ux_owner) : "Chưa phân công",
    doc_link: rawDocLink,
    doc_links: docLinks,
    attachments: attachments,
    current_phase: currentPhase,
    status: (() => {
      let currentSt = String(data.status || "Đang phân loại")
      // CHỈ tự động chuyển sang PO pending nếu:
      // 1. Task đang ở trạng thái "Đã gửi PO"
      // 2. ĐÃ có mốc thời gian sent_to_po_at cụ thể
      // 3. Thời gian đã trôi qua THỰC SỰ >= 24 giờ
      if (currentSt === "Đã gửi PO" && rawSentToPo) {
        const sentMs = parseDateTimeToMs(rawSentToPo)
        if (sentMs > 0) {
          const elapsedHours = (Date.now() - sentMs) / (1000 * 60 * 60)
          if (elapsedHours >= 24) {
            currentSt = "PO pending"
          }
        }
      }
      return currentSt
    })(),
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
    priority: String(data.priority || "Normal"),
    task_updates: taskUpdates,
    sent_to_po_at: effectiveSentToPo,
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

    // Return starter mock requests if cache/sheet is empty
    const fallback = mockRequests.map(normalizeSheetRequest)
    cachedRequestsMemory = fallback
    return fallback
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
        // If cached selections contain obsolete dummy products like App/Core, purge
        if (parsed && Array.isArray(parsed.products) && !parsed.products.some((p: string) => p.startsWith("App/"))) {
          cachedSelections = parsed
          return parsed
        } else {
          localStorage.removeItem(SELECTIONS_CACHE_KEY)
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
          let fetchedProducts: string[] = data.selections.products?.length
            ? data.selections.products
            : FALLBACK_SELECTIONS.products

          // If fetched products contain legacy dummy data, filter them out
          fetchedProducts = fetchedProducts.filter(
            (p: string) => !p.startsWith("App/") && p !== "Digi" && p !== "Internet Banking"
          )

          // Overlay active products from Admin Settings if available
          try {
            const adminRaw = localStorage.getItem("mbbank_admin_products")
            if (adminRaw) {
              const parsedAdmin = JSON.parse(adminRaw)
              if (Array.isArray(parsedAdmin) && parsedAdmin.length > 0) {
                const activeAdmin = parsedAdmin
                  .filter((p: any) => p.status !== "Inactive")
                  .map((p: any) => p.name)
                if (activeAdmin.length > 0) {
                  fetchedProducts = activeAdmin
                }
              }
            }
          } catch {}

          if (fetchedProducts.length === 0) {
            fetchedProducts = FALLBACK_SELECTIONS.products
          }

          const merged: SelectionsData = {
            products: fetchedProducts,
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
    sent_to_po_at?: string
    priority?: string
    design_deadline?: string
    release_date?: string
    product?: string
    squad_name?: string
    preferred_squad?: string
    is_comment?: boolean
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
    is_comment: params.is_comment === true,
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
        priority: params.priority !== undefined ? params.priority : (oldReq.priority || "Normal"),
        product: params.product !== undefined ? params.product : oldReq.product,
        squad_name: params.squad_name !== undefined ? params.squad_name : oldReq.squad_name,
        preferred_squad: params.preferred_squad !== undefined ? params.preferred_squad : (params.squad_name !== undefined ? params.squad_name : oldReq.preferred_squad),
        design_deadline: params.design_deadline !== undefined ? params.design_deadline : (oldReq.design_deadline || oldReq.expected_deadline),
        release_date: params.release_date !== undefined ? params.release_date : (oldReq.release_date || oldReq.expected_deadline),
        expected_deadline: params.release_date || oldReq.expected_deadline,
        last_updated: formattedDate,
        assigned_designer: params.assigned_designer !== undefined ? params.assigned_designer : oldReq.assigned_designer,
        ux_owner: params.assigned_designer !== undefined ? (params.assigned_designer || "Chưa phân công") : (oldReq.ux_owner || "Chưa phân công"),
        sent_to_po_at: (params.sent_to_po_at !== undefined)
          ? (params.sent_to_po_at === "" ? undefined : params.sent_to_po_at)
          : (params.new_status === "Đã gửi PO" || params.new_status === "PO pending" ? oldReq.sent_to_po_at : undefined),
        pending_reason: (params.new_status === "Pending" || params.new_status === "PO pending") ? oldReq.pending_reason : undefined,
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
        user_email: session?.teamsEmail || session?.personalEmail || "",
        user_role: session?.role || "",
        request_id: requestId,
        new_phase: params.new_phase,
        new_status: params.new_status,
        new_progress: params.new_progress,
        priority: params.priority || "",
        product: params.product || "",
        squad_name: params.squad_name !== undefined ? params.squad_name : "",
        preferred_squad: params.preferred_squad !== undefined ? params.preferred_squad : (params.squad_name || ""),
        design_deadline: params.design_deadline || "",
        release_date: params.release_date || "",
        note: params.note || `Cập nhật tiến độ sang khâu [${params.new_phase}]`,
        figma_url: params.figma_url || "",
        assigned_designer: params.assigned_designer !== undefined ? params.assigned_designer : "",
        sent_to_po_at: params.sent_to_po_at || "",
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

/**
 * Trigger Auto-Projection on Google Apps Script Backend (Sync JSON Core -> Views)
 */
export async function syncProjectionsFromSheet(): Promise<{
  success: boolean
  message: string
  tasksCount?: number
  logsCount?: number
}> {
  const config = getGoogleSheetConfig()
  const scriptUrl = config?.scriptUrl

  if (!scriptUrl || !scriptUrl.trim()) {
    return {
      success: false,
      message: "Chưa cấu hình URL Google Apps Script Web App trong Cài đặt.",
    }
  }

  try {
    const res = await fetch(scriptUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "sync_projections" }),
    })

    if (!res.ok) {
      return {
        success: false,
        message: `Lỗi máy chủ Google: HTTP ${res.status}`,
      }
    }

    const data = await res.json()
    if (data.status === "success") {
      return {
        success: true,
        message: data.message || "Đồng bộ phân tách dữ liệu thành công!",
        tasksCount: data.result?.tasks?.tasksCount,
        logsCount: data.result?.tasks?.logsCount,
      }
    }
    return {
      success: false,
      message: data.message || "Không thể đồng bộ phân tách bảng.",
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      message: `Lỗi kết nối khi đồng bộ: ${errorMsg}`,
    }
  }
}

/**
 * Convert browser File to Base64 data string (without header)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      // Tách bỏ header "data:image/jpeg;base64," lấy chuỗi raw base64
      const base64 = result.includes(",") ? result.split(",")[1] : result
      resolve(base64)
    }
    reader.onerror = (error) => reject(error)
  })
}

/**
 * Tải file đính kèm lên Google Drive (Folder: UX_Portal_Attachments)
 */
export async function uploadFileToDrive(
  file: File,
  folderName: string = "UX_Portal_Attachments"
): Promise<{
  success: boolean
  fileUrl?: string
  downloadUrl?: string
  fileName?: string
  fileSize?: number
  error?: string
}> {
  const config = getGoogleSheetConfig()
  const scriptUrl = config?.scriptUrl

  if (!scriptUrl || !scriptUrl.trim()) {
    // Fallback URL blob cục bộ nếu chưa kết nối Google Sheet
    return {
      success: true,
      fileUrl: URL.createObjectURL(file),
      fileName: file.name,
      fileSize: file.size,
    }
  }

  try {
    const base64Data = await fileToBase64(file)
    const payload = {
      action: "upload_file",
      base64Data,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      folderName,
    }

    const res = await fetch(scriptUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(`Google Apps Script trả về lỗi HTTP ${res.status}`)
    }

    const data = await res.json()
    if (data.status === "success") {
      return {
        success: true,
        fileUrl: data.file_url,
        downloadUrl: data.download_url,
        fileName: data.file_name || file.name,
        fileSize: data.file_size || file.size,
      }
    }
    return {
      success: false,
      error: data.message || "Không thể tải tệp lên Google Drive.",
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      error: `Lỗi tải file lên Drive: ${errorMsg}`,
    }
  }
}

/**
 * Tải ảnh Avatar lên Google Drive (Folder: UX_Portal_Avatars) và tự động cập nhật vào Google Sheet
 */
export async function uploadAvatarToDrive(
  file: File,
  email: string
): Promise<{
  success: boolean
  avatarUrl?: string
  error?: string
}> {
  const config = getGoogleSheetConfig()
  const scriptUrl = config?.scriptUrl

  if (!scriptUrl || !scriptUrl.trim()) {
    // Persistent Base64 Data URL for Local/Offline Mode
    try {
      const b64 = await fileToBase64(file)
      const mime = file.type || "image/jpeg"
      return {
        success: true,
        avatarUrl: `data:${mime};base64,${b64}`,
      }
    } catch {
      return {
        success: true,
        avatarUrl: URL.createObjectURL(file),
      }
    }
  }

  try {
    const base64Data = await fileToBase64(file)
    const payload = {
      action: "upload_avatar",
      base64Data,
      email: email.trim().toLowerCase(),
      fileName: file.name,
      mimeType: file.type || "image/jpeg",
    }

    const res = await fetch(scriptUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(`Google Apps Script trả về lỗi HTTP ${res.status}`)
    }

    const data = await res.json()
    if (data.status === "success" && data.avatar_url) {
      return {
        success: true,
        avatarUrl: data.avatar_url,
      }
    }
    return {
      success: false,
      error: data.message || "Không thể tải Avatar lên Google Drive.",
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      error: `Lỗi tải Avatar lên Drive: ${errorMsg}`,
    }
  }
}

/**
 * Khởi tạo toàn bộ cấu trúc Google Sheet thông qua Apps Script Backend
 */
export async function initSheetsViaApi(): Promise<{ success: boolean; message: string; sheets_created?: string[] }> {
  const config = getGoogleSheetConfig()
  if (!config.scriptUrl) {
    return { success: false, message: "Chưa cấu hình Google Sheet Web App URL" }
  }

  try {
    const url = `${config.scriptUrl}${config.scriptUrl.includes("?") ? "&" : "?"}action=init_sheets`
    const res = await fetch(url)
    const data = await res.json()
    return {
      success: data.status === "success",
      message: data.message || "Đã khởi tạo cấu trúc Sheet thành công!",
      sheets_created: data.result?.sheets_created
    }
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối tới Google Apps Script" }
  }
}

/**
 * Đồng bộ danh sách nhân sự lên Google Sheet (RAW_SETTINGS, USERS, Users_View)
 */
export async function syncTeamMembersToSheet(
  members: any[],
  actorEmail?: string
): Promise<{ success: boolean; message: string; membersCount?: number }> {
  const config = getGoogleSheetConfig()
  const scriptUrl = config?.scriptUrl

  if (!scriptUrl || !scriptUrl.trim()) {
    return {
      success: true,
      message: "Đã lưu nhân sự nội bộ (Chế độ Local).",
      membersCount: members.length,
    }
  }

  try {
    const session = getStoredSession()
    const payload = {
      action: "sync_team_members",
      members,
      user_email: actorEmail || session?.teamsEmail || session?.personalEmail || "admin@mbbank.com.vn",
      updated_by: session?.displayName || "Admin Portal",
    }

    const res = await fetch(scriptUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(`Máy chủ Google Sheet trả về mã lỗi HTTP ${res.status}`)
    }

    const data = await res.json()
    if (data.status === "success") {
      saveGoogleSheetConfig({ lastSyncedAt: new Date().toISOString() })
      return {
        success: true,
        message: data.message || `Đã đồng bộ ${members.length} nhân sự lên Google Sheet thành công!`,
        membersCount: data.members_count || members.length,
      }
    }

    return {
      success: false,
      message: data.message || "Không thể đồng bộ nhân sự lên Google Sheet.",
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      message: `Lỗi đồng bộ nhân sự: ${errorMsg}`,
    }
  }
}

/**
 * Đồng bộ Master Data (Squads, Products, Phases) lên Google Sheet
 */
export async function syncMasterDataToSheet(params: {
  squads?: any[]
  products?: any[]
  phases?: any[]
  selections?: any
  status_rules?: any[]
  audit_logs?: any[]
  rbac?: any
  nav_items?: any
  actorEmail?: string
}): Promise<{ success: boolean; message: string }> {
  const config = getGoogleSheetConfig()
  const scriptUrl = config?.scriptUrl

  if (!scriptUrl || !scriptUrl.trim()) {
    return {
      success: true,
      message: "Đã lưu cấu hình nội bộ (Chế độ Local).",
    }
  }

  try {
    const session = getStoredSession()
    const payload = {
      action: "sync_master_data",
      ...params,
      user_email: params.actorEmail || session?.teamsEmail || session?.personalEmail || "admin@mbbank.com.vn",
      updated_by: session?.displayName || "Admin Portal",
    }

    const res = await fetch(scriptUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(`Máy chủ Google Sheet trả về mã lỗi HTTP ${res.status}`)
    }

    const data = await res.json()
    if (data.status === "success") {
      saveGoogleSheetConfig({ lastSyncedAt: new Date().toISOString() })
      return {
        success: true,
        message: data.message || "Đã đồng bộ Master Data lên Google Sheet!",
      }
    }

    return {
      success: false,
      message: data.message || "Không thể đồng bộ Master Data lên Google Sheet.",
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      message: `Lỗi đồng bộ Master Data: ${errorMsg}`,
    }
  }
}

/**
 * Tải Master Data (Squads, Products, Phases, Status Rules, Audit Logs, RBAC) từ Google Sheet về máy
 */
export async function fetchMasterDataFromSheet(): Promise<{
  success: boolean
  message: string
  data?: {
    squads?: any[]
    products?: any[]
    phases?: any[]
    status_rules?: any[]
    audit_logs?: any[]
    rbac?: any
    nav_items?: any
    selections?: any
  }
}> {
  const config = getGoogleSheetConfig()
  const scriptUrl = config?.scriptUrl
  if (!scriptUrl || !scriptUrl.trim()) {
    return {
      success: false,
      message: "Chưa cấu hình Google Apps Script URL.",
    }
  }

  try {
    const url = new URL(scriptUrl.trim())
    url.searchParams.set("action", "get_master_data")
    url.searchParams.set("t", String(Date.now()))

    const res = await fetch(url.toString(), {
      method: "GET",
    })

    if (!res.ok) {
      throw new Error(`Máy chủ trả về HTTP ${res.status}`)
    }

    const json = await res.json()
    if (json.status === "success") {
      return {
        success: true,
        message: "Tải Master Data từ Google Sheet thành công!",
        data: {
          squads: json.squads || json.master_data?.SQUADS_CONFIG,
          products: json.products || json.master_data?.PRODUCTS_CONFIG,
          phases: json.phases || json.master_data?.PHASES_CONFIG,
          status_rules: json.status_rules || json.master_data?.STATUS_RULES_CONFIG,
          audit_logs: json.audit_logs || json.master_data?.AUDIT_LOGS_CONFIG,
          rbac: json.rbac || json.master_data?.RBAC_CONFIG,
          nav_items: json.nav_items || json.master_data?.NAV_ITEMS_CONFIG,
          selections: json.selections || json.master_data?.SELECTIONS_CONFIG,
        },
      }
    }

    return {
      success: false,
      message: json.message || "Không thể tải Master Data từ Google Sheet.",
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      message: `Lỗi kết nối Google Sheet: ${errorMsg}`,
    }
  }
}

function parseCsvSimple(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [""]
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === "," && !inQuotes) {
      row.push("")
    } else if ((c === "\r" || c === "\n") && !inQuotes) {
      if (c === "\r" && next === "\n") i++
      rows.push(row)
      row = [""]
    } else {
      row[row.length - 1] += c
    }
  }
  if (row.length > 1 || (row.length === 1 && row[0].trim() !== "")) {
    rows.push(row)
  }
  return rows
}

/**
 * Lấy danh sách nhân sự từ Google Sheet (Hỗ trợ cả GViz trực tiếp và Apps Script Web App API)
 */
export async function fetchTeamMembersFromSheet(): Promise<any[] | null> {
  const config = getGoogleSheetConfig()
  const scriptUrl = config?.scriptUrl
  const sheetId = config?.sheetId || "1gpe5W7whAMxIZLjsjVxEW23vcaa9ny0m9Qj327zKYzw"

  // 1. Thử tải trực tiếp từ Google Sheet qua GViz API (Tốc độ tức thì, không bị CORS, trực tiếp lấy từ tab USERS mới nhất)
  if (sheetId && sheetId.trim()) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId.trim()}/gviz/tq?tqx=out:csv&sheet=USERS&_t=${Date.now()}`
      const res = await fetch(gvizUrl)
      if (res.ok) {
        const text = await res.text()
        const rows = parseCsvSimple(text)
        if (rows.length > 1) {
          const members: any[] = []
          for (let i = 1; i < rows.length; i++) {
            const r = rows[i]
            if (!r[0] && !r[2] && !r[3]) continue
            const rawRole = (r[5] || "Designer").trim()
            let role = "Designer"
            if (rawRole.toLowerCase().includes("admin")) role = "Admin"
            else if (rawRole.toLowerCase().includes("owner")) role = "Design Owner"
            else if (rawRole.toLowerCase().includes("po")) role = "PO"
            else if (rawRole.toLowerCase().includes("business") || rawRole.toLowerCase().includes("biz")) role = "Business"
            else role = "Designer"

            members.push({
              id: `mem-${i}`,
              name: r[0] || "Thành viên UX",
              avatarUrl: r[1] || "",
              personalEmail: r[2] || "",
              teamsEmail: r[3] || "",
              email: r[3] || r[2] || "",
              status: r[4] || "Active",
              role: role,
              squad: "All Squads",
              squads: ["All Squads"],
              products: ["Toàn hàng"],
              capacityLimit: 8,
              activeTasks: 0,
              permissions: {
                canAssign: role === "Admin" || role === "Design Owner",
                canApprovePo: true,
                canExport: true,
                canManageSystem: role === "Admin",
              },
            })
          }
          if (members.length > 0) {
            return members
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch team members directly via GViz, trying Apps Script Web App...", e)
    }
  }

  if (!scriptUrl || !scriptUrl.trim()) return null

  // 2. Thử qua POST text/plain (Tránh CORS preflight issues trên Google Apps Script)
  try {
    const res = await fetch(scriptUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "get_team_members" }),
    })

    if (res.ok) {
      const data = await res.json()
      const list = data.members || data.users || []
      if (data.status === "success" && Array.isArray(list) && list.length > 0) {
        return list
      }
    }
  } catch (e) {
    console.warn("Could not fetch team members via POST, trying GET...", e)
  }

  // 3. Thử qua GET URL Query Params
  try {
    const url = new URL(scriptUrl.trim())
    url.searchParams.set("action", "get_team_members")
    url.searchParams.set("_t", Date.now().toString())

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    })

    if (res.ok) {
      const data = await res.json()
      const list = data.members || data.users || []
      if (data.status === "success" && Array.isArray(list) && list.length > 0) {
        return list
      }
    }
  } catch (e) {
    console.warn("Could not fetch team members from Google Sheet via GET:", e)
  }
  return null
}
