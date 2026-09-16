export type UserRole = "Admin" | "Design Owner" | "Designer" | "PO" | "Business"

export interface Squad {
  squad_id: string
  squad_name: string
  product_id?: string
  product_name?: string
  domain: string
  active_tasks: number
  queued_tasks: number
  capacity_threshold: number
  ux_owner: string
  active_task_titles: string[]
  queued_task_titles: string[]
}

export type CapacityStatus = "Sẵn sàng" | "Bình thường" | "Đang bận" | "Quá tải"

export function deriveCapacityStatus(squad: Squad): CapacityStatus {
  const total = squad.active_tasks + squad.queued_tasks
  if (total <= 3) return "Sẵn sàng"
  if (total <= 6) return "Bình thường"
  if (total <= 9) return "Đang bận"
  return "Quá tải"
}

export type PhaseStatus = "completed" | "in_progress" | "upcoming" | "pending"

export interface Phase {
  name: string
  status: PhaseStatus
  assignee?: string
  completionDate?: string
}

export interface LatestUpdate {
  date: string
  phase: string
  message: string
}

export interface Deliverables {
  figma_url?: string
  prototype_url?: string
  spec_url?: string
}

export interface TaskUpdateRecord {
  id: string
  request_id: string
  timestamp: string
  updated_by: string
  author_role: UserRole
  previous_phase?: string
  new_phase: string
  previous_progress?: number
  new_progress: number
  note: string
  deliverable_link?: string
  is_comment?: boolean
}

export interface UXRequest {
  id?: string
  request_id: string
  title: string
  product: string
  request_type: string
  feature_journey: string
  description: string
  business_need: string
  user_problem: string
  target_user: string
  expected_output: string[]
  expected_deadline: string
  release_date?: string
  design_deadline?: string
  deadline_reason: string
  preferred_squad: string
  requester_email: string
  requester_name?: string
  department?: string
  priority?: string
  doc_link?: string
  doc_links?: string[]
  figma_url?: string
  attachments?: Array<{ name: string; url: string; size?: number }>
  assigned_designer?: string
  design_owner?: string
  squad?: string
  squad_name: string
  ux_owner: string
  current_phase: string
  status: string
  progress: number
  last_updated: string
  phases: Phase[]
  latest_update: LatestUpdate
  deliverables: Deliverables
  submitted_at: string
  task_updates?: TaskUpdateRecord[]
  sent_to_po_at?: string
  pending_reason?: string
  viewers?: string[]
  isRestricted?: boolean
}

export function evaluatePoPendingStatus(request: UXRequest): UXRequest {
  if (request.status === "Đã gửi PO" && request.sent_to_po_at) {
    const trimmed = String(request.sent_to_po_at).trim()
    let sentMs = 0
    const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/)
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10)
      const month = parseInt(dmyMatch[2], 10) - 1
      const year = parseInt(dmyMatch[3], 10)
      const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0
      const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0
      const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0
      sentMs = new Date(year, month, day, hour, minute, second).getTime()
    } else {
      const parsed = new Date(trimmed).getTime()
      sentMs = isNaN(parsed) ? 0 : parsed
    }

    if (sentMs > 0) {
      const elapsedHours = (Date.now() - sentMs) / (1000 * 60 * 60)
      if (elapsedHours >= 24) {
        return {
          ...request,
          status: "PO pending",
        }
      }
    }
  }
  return request
}

export const ALL_PHASES = [
  "Chờ tiếp nhận",
  "Phân loại",
  "Discovery",
  "User Flow",
  "UI Design",
  "Prototype",
  "Bàn giao",
]

export function buildPhases(currentPhase: string): Phase[] {
  let normalized = currentPhase
  if (
    normalized === "Đã gửi yêu cầu" ||
    normalized === "Đã gửi" ||
    normalized === "Mới tạo" ||
    normalized === "Chờ xác nhận" ||
    normalized === "1. Chờ xác nhận"
  ) {
    normalized = "Chờ tiếp nhận"
  }
  const currentIdx = ALL_PHASES.indexOf(normalized)
  return ALL_PHASES.map((name, i) => ({
    name,
    status:
      i < currentIdx
        ? "completed"
        : i === currentIdx
          ? "in_progress"
          : "upcoming",
  }))
}

export const STANDARD_SQUADS_LIST: string[] = [
  "Onboarding",
  "Base",
  "Upsale",
  "Partnership",
  "Billing",
  "CSOP",
  "Junior",
  "VietQR",
  "Sub",
  "Gold",
  "Lending",
  "eSaving",
  "Core",
  "Card",
  "TransferD",
  "Trái phiếu",
  "Chứng chỉ quỹ",
  "BeeRich",
  "Visual",
  "Design System MB",
  "Nội bộ",
  "AI",
  "BaaS",
]

export const mockSquads: Squad[] = STANDARD_SQUADS_LIST.map((name, idx) => ({
  squad_id: `sq_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${idx}`,
  squad_name: name,
  product_name: "App MBBank",
  domain: name,
  active_tasks: 0,
  queued_tasks: 0,
  capacity_threshold: 8,
  ux_owner: "Nguyễn Văn Cường (Design Owner)",
  active_task_titles: [],
  queued_task_titles: [],
}))

export const DEMO_REQUEST_IDS = new Set([
  "UXMB-2026-001",
  "UXMB-2026-002",
  "UXMB-2026-003",
  "UXMB-2026-004",
  "UXMB-2026-005",
  "UXMB-2026-006",
  "UXMB-2026-007",
  "UXMB-2026-008",
  "UXMB-2026-009",
  "UXMB-2026-010",
  "UXMB-2026-011",
  "UXMB-2026-012",
  "UXMB-2026-013",
  "UXMB-2026-014",
  "UXMB-2026-015",
  "UXMB-2026-016",
])

export function isDemoRequest(req: Partial<UXRequest> | any): boolean {
  if (!req) return false
  const id = (req.request_id || req.id || "").toString().trim()
  if (DEMO_REQUEST_IDS.has(id)) return true
  const title = (req.title || "").toLowerCase()
  if (
    title.includes("luồng mở thẻ tín dụng 100% online") ||
    title.includes("vay thấu chi tín dụng doanh nghiệp") ||
    title.includes("api chuyển tiền realtime baas") ||
    title.includes("giao diện trang chủ app mb (personalized")
  ) {
    return true
  }
  return false
}

// Dữ liệu bài toán thực tế (khởi tạo rỗng, không chứa dữ liệu demo)
export const mockRequests: UXRequest[] = []



export const PRODUCTS = [
  "App MBBank",
  "Biz MBBank",
  "BaaS & Open API",
  "Design System & Nền tảng",
  "Khác",
]

export const REQUEST_TYPES = [
  "Tính năng mới",
  "Thiết kế lại trải nghiệm",
  "Cải thiện trải nghiệm hiện tại",
  "UX Research",
  "UX Review",
  "Khác",
]

export const EXPECTED_OUTPUTS = [
  "UX Recommendation",
  "User Flow",
  "Wireframe",
  "UI Design",
  "Prototype",
  "UX Research",
  "Usability Testing",
  "Chưa biết / Cần tư vấn UX",
]

export const DEADLINE_REASONS = [
  "Ra mắt sản phẩm",
  "Cam kết kinh doanh",
  "Yêu cầu quy định",
  "Chiến dịch marketing",
  "Đánh giá nội bộ",
  "Khác",
]

export function recommendSquad(product: string, squadName?: string): Squad | null {
  if (!product) return null
  if (squadName) {
    const found = mockSquads.find((s) => s.squad_name.toLowerCase() === squadName.toLowerCase())
    if (found) return found
  }
  return (
    mockSquads.find((s) => s.product_name === product) ?? {
      squad_id: `SQ_${product.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`,
      squad_name: product,
      product_name: product,
      domain: `Phân hệ ${product}`,
      active_tasks: 1,
      queued_tasks: 1,
      capacity_threshold: 8,
      ux_owner: "UX Designer phụ trách",
      active_task_titles: ["Tiếp nhận yêu cầu mới"],
      queued_task_titles: [],
    }
  )
}

