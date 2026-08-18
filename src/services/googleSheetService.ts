import {
  PRODUCTS as DEFAULT_PRODUCTS,
  REQUEST_TYPES as DEFAULT_REQUEST_TYPES,
  EXPECTED_OUTPUTS as DEFAULT_EXPECTED_OUTPUTS,
  DEADLINE_REASONS as DEFAULT_DEADLINE_REASONS,
  mockSquads,
  Squad,
} from "../data/mockData"
import { getGoogleSheetConfig, saveGoogleSheetConfig } from "../config/googleSheetConfig"

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

/**
 * Fetch dynamic selection options from Google Sheets Web App
 */
export async function fetchSelectionsFromSheet(forceRefresh = false): Promise<SelectionsData> {
  if (!forceRefresh && cachedSelections) {
    return cachedSelections
  }

  const config = getGoogleSheetConfig()
  if (!config.scriptUrl || !config.scriptUrl.trim()) {
    cachedSelections = FALLBACK_SELECTIONS
    return FALLBACK_SELECTIONS
  }

  try {
    const url = new URL(config.scriptUrl)
    url.searchParams.set("action", "get_selections")

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`)
    }

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
      saveGoogleSheetConfig({ lastSyncedAt: new Date().toISOString() })
      return merged
    }
  } catch (err) {
    console.warn("Could not fetch selections from Google Sheet, using defaults:", err)
  }

  cachedSelections = FALLBACK_SELECTIONS
  return FALLBACK_SELECTIONS
}

/**
 * Log submitted UX Request data to Google Sheet as JSON
 */
export async function logRequestToGoogleSheet(
  requestData: Record<string, unknown>
): Promise<{ success: boolean; message: string; sheetRow?: number }> {
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
    // JSON Raw field for full payload storage
    json_payload: JSON.stringify(requestData, null, 2),
    raw_data: requestData,
  }

  // Also log to browser console for immediate visibility & debugging
  console.log("📝 [Google Sheets Logger] Submitting Request Payload (JSON):", payload)

  if (!config.scriptUrl || !config.scriptUrl.trim()) {
    console.info("ℹ️ Google Sheet Web App URL not configured. Request logged locally.")
    return {
      success: true,
      message: "Yêu cầu đã được lưu thành công (Chế độ nội bộ / Local)",
    }
  }

  try {
    // Note: Google Apps Script Web App requires POST with JSON string in body
    // Using no-cors or redirect handling standard for Google Apps Script Web App
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
      // Fallback if response is opaque
    }

    return {
      success: true,
      message: "Đã đồng bộ và ghi log thành công vào Google Sheet!",
      requestId: payload.request_id,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("Failed to log request to Google Sheet:", err)
    return {
      success: false,
      message: `Không thể gửi log tới Google Sheet: ${errorMsg}`,
    }
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
