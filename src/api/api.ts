import {
  mockSquads,
  Squad,
  UXRequest,
  buildPhases,
} from "../data/mockData"
import {
  logRequestToGoogleSheet,
  fetchSelectionsFromSheet,
  fetchRequestsFromSheet,
  normalizeSheetRequest,
  updateTaskProgressInSheet,
  SelectionsData,
} from "../services/googleSheetService"
import { searchProtectedData } from "../services/otpAuthService"

export async function fetchRequests(forceRefresh = false): Promise<UXRequest[]> {
  return fetchRequestsFromSheet(forceRefresh)
}

export async function fetchSquads(): Promise<Squad[]> {
  const [selections, requests] = await Promise.all([
    fetchSelectionsFromSheet(),
    fetchRequestsFromSheet(),
  ])

  const baseSquads = selections.squads && selections.squads.length > 0
    ? selections.squads
    : [...mockSquads]

  // Compute active & queued tasks dynamically from REAL Google Sheet requests
  return baseSquads.map((squad) => {
    const matchingRequests = requests.filter(
      (r) =>
        (r.preferred_squad && r.preferred_squad.toLowerCase() === squad.squad_name.toLowerCase()) ||
        (r.product && r.product.toLowerCase() === squad.squad_name.toLowerCase())
    )

    const activeRequests = matchingRequests.filter((r) => r.status === "Đang thực hiện")
    const queuedRequests = matchingRequests.filter((r) => r.status === "Đang phân loại" || r.status === "Chờ tiếp nhận")

    return {
      ...squad,
      active_tasks: activeRequests.length,
      queued_tasks: queuedRequests.length,
      active_task_titles: activeRequests.map((r) => r.title),
      queued_task_titles: queuedRequests.map((r) => r.title),
    }
  })
}

export async function fetchFormSelections(): Promise<SelectionsData> {
  return fetchSelectionsFromSheet()
}

export async function searchRequests(query: string): Promise<UXRequest[]> {
  const q = query.toLowerCase().trim()
  if (!q) return []

  // If user has a valid Teams OTP session, use the secure backend search
  const secureResult = await searchProtectedData(q)
  if (secureResult.success && secureResult.data && secureResult.data.length > 0) {
    return secureResult.data.map((item: any) =>
      normalizeSheetRequest({
        request_id: item.id || item.request_id,
        title: item.title,
        product: item.product,
        ux_owner: item.ux_owner,
        assigned_designer: item.assigned_designer,
        design_owner: item.design_owner,
        status: item.status,
        release_date: item.release_date || item.expected_deadline,
        description: item.description,
        doc_link: item.doc_link,
        requester_email: item.requester_email,
        phases: item.phases,
        latest_update: item.latest_update,
        submitted_at: item.submitted_at,
        task_updates: item.task_updates,
      })
    )
  }

  // Fallback to locally cached requests
  const allRequests = await fetchRequestsFromSheet()

  return allRequests.filter((r) => {
    const id = (r.request_id || "").toLowerCase()
    const email = (r.requester_email || "").toLowerCase()
    const designer = (r.assigned_designer || "").toLowerCase()
    const owner = (r.design_owner || "").toLowerCase()
    const title = (r.title || "").toLowerCase()
    const product = (r.product || "").toLowerCase()
    const squad = (r.preferred_squad || r.squad_name || "").toLowerCase()
    const journey = (r.feature_journey || "").toLowerCase()

    return (
      id.includes(q) ||
      email.includes(q) ||
      designer.includes(q) ||
      owner.includes(q) ||
      title.includes(q) ||
      product.includes(q) ||
      squad.includes(q) ||
      journey.includes(q)
    )
  })
}

export async function fetchRequest(id: string): Promise<UXRequest | null> {
  const allRequests = await fetchRequestsFromSheet()
  const targetId = id.toLowerCase().trim()
  return (
    allRequests.find((r) => (r.request_id || "").toLowerCase().trim() === targetId) ?? null
  )
}

export async function submitRequest(data: Record<string, unknown>): Promise<{
  requestId: string
  googleSheetResult: { success: boolean; message: string }
}> {
  const now = new Date()
  const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}/${now.getFullYear()}`

  // Initial ID placeholder
  const initialId = `UXMB-PENDING`

  // Log to Google Sheet first to get the official atomic sequential Request ID
  const fullPayload = {
    ...data,
    request_id: initialId,
    submitted_at: formattedDate,
  }

  const googleSheetResult = await logRequestToGoogleSheet(fullPayload)
  
  // Use the server-assigned sequential ID from Google Sheet (UXMB-001, UXMB-002...), or fallback to timestamp
  const finalRequestId = (googleSheetResult.requestId && !googleSheetResult.requestId.includes("PENDING"))
    ? googleSheetResult.requestId
    : `UXMB-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`

  // Create complete local request object and cache immediately in localStorage
  const newRequest: UXRequest = normalizeSheetRequest({
    ...data,
    request_id: finalRequestId,
    submitted_at: formattedDate,
    last_updated: formattedDate,
    current_phase: "Chờ tiếp nhận",
    status: "Chờ tiếp nhận",
    progress: 10,
    phases: buildPhases("Chờ tiếp nhận"),
    latest_update: {
      date: formattedDate,
      phase: "Chờ tiếp nhận",
      message: "Yêu cầu đã được ghi nhận trên hệ thống và đang chờ tiếp nhận xử lý.",
    },
    deliverables: {
      figma_url: String(data.doc_link || ""),
    },
  })

  // Prepend to localStorage cache so it shows up in "Tra cứu", "Quản lý", and "Tổng quan" immediately
  try {
    const cached = localStorage.getItem("ux_portal_real_requests")
    const existingList: UXRequest[] = cached ? JSON.parse(cached) : []
    const updated = [newRequest, ...existingList.filter((r) => r.request_id !== finalRequestId)]
    localStorage.setItem("ux_portal_real_requests", JSON.stringify(updated))
  } catch (e) {
    console.warn("Could not cache new request locally:", e)
  }

  return {
    requestId: finalRequestId,
    googleSheetResult,
  }
}

export async function updateTaskProgress(
  requestId: string,
  params: {
    new_phase: string
    new_status: string
    new_progress: number
    note: string
    figma_url?: string
    assigned_designer?: string
  }
) {
  return updateTaskProgressInSheet(requestId, params)
}
