import {
  mockSquads,
  mockRequests,
  Squad,
  UXRequest,
  buildPhases,
} from "../data/mockData"
import {
  logRequestToGoogleSheet,
  fetchSelectionsFromSheet,
  SelectionsData,
} from "../services/googleSheetService"

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

export async function fetchSquads(): Promise<Squad[]> {
  const selections = await fetchSelectionsFromSheet()
  if (selections.squads && selections.squads.length > 0) {
    return selections.squads
  }
  await delay(400)
  return [...mockSquads]
}

export async function fetchFormSelections(): Promise<SelectionsData> {
  return fetchSelectionsFromSheet()
}

export async function searchRequests(query: string): Promise<UXRequest[]> {
  await delay(400)
  const q = query.toLowerCase().trim()
  if (!q) return []
  return mockRequests.filter(
    (r) =>
      r.requester_email.toLowerCase().includes(q) ||
      r.request_id.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.product.toLowerCase().includes(q),
  )
}

export async function fetchRequest(id: string): Promise<UXRequest | null> {
  await delay(300)
  return mockRequests.find((r) => r.request_id === id) ?? null
}

const COUNTER_KEY = "ux_portal_request_counter"

function getNextRequestId(): string {
  return `UXMB-PENDING`
}

export async function submitRequest(data: Record<string, unknown>): Promise<{
  requestId: string
  googleSheetResult: { success: boolean; message: string }
}> {
  await delay(400)
  const initialId = getNextRequestId()

  const now = new Date()
  const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}/${now.getFullYear()}`

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

  // Create full local request object so it shows up in "Tra cứu" and "Quản lý"
  const newRequest: UXRequest = {
    request_id: finalRequestId,
    title: String(data.title || "Yêu cầu mới"),
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
    squad_name: String(data.preferred_squad || data.product || "Triage Squad"),
    ux_owner: "Đang phân công",
    current_phase: "Đã gửi yêu cầu",
    status: "Đang phân loại",
    progress: 10,
    last_updated: formattedDate,
    phases: buildPhases("Đã gửi yêu cầu"),
    latest_update: {
      date: formattedDate,
      phase: "Đã gửi yêu cầu",
      message: "Yêu cầu đã được ghi nhận trên hệ thống và chuyển đến UX Lead để thẩm định.",
    },
    deliverables: {
      figma_url: String(data.doc_link || ""),
    },
    submitted_at: formattedDate,
  }

  // Prepend to mockRequests for immediate in-app reflection
  mockRequests.unshift(newRequest)

  return {
    requestId: finalRequestId,
    googleSheetResult,
  }
}
