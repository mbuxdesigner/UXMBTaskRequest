export type UserRole = "Admin" | "Design Owner" | "Designer" | "PO"

export interface Squad {
  squad_id: string
  squad_name: string
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

export type PhaseStatus = "completed" | "in_progress" | "upcoming"

export interface Phase {
  name: string
  status: PhaseStatus
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
}

export interface UXRequest {
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
  deadline_reason: string
  preferred_squad: string
  requester_email: string
  assigned_designer?: string
  design_owner?: string
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
  if (normalized === "Đã gửi yêu cầu" || normalized === "Đã gửi" || normalized === "Mới tạo") {
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

export const mockSquads: Squad[] = [
  {
    squad_id: "SQ_CARD",
    squad_name: "App/Card",
    domain: "Thẻ & Thanh toán",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "Nguyễn Văn Cường (Design Owner)",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "SQ_CORE",
    squad_name: "App/Core",
    domain: "Tài khoản & Giao dịch chính",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "Nguyễn Văn Cường (Design Owner)",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "SQ_LENDING",
    squad_name: "App/Lending",
    domain: "Vay vốn & Thấu chi tín dụng",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "Trần Mai Hoa (Design Owner)",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "SQ_SAVING",
    squad_name: "App/Saving",
    domain: "Tiết kiệm & Tích lũy số",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "Lê Hoàng Nam (Design Owner)",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "SQ_DIGI",
    squad_name: "Digi",
    domain: "Kênh số & Tiện ích mở rộng",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "SQ_BAAS",
    squad_name: "BaaS",
    domain: "Banking as a Service & Đối tác API",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "SQ_IB",
    squad_name: "Internet Banking",
    domain: "Kênh Web Internet Banking",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: [],
    queued_task_titles: [],
  },
]

// Real requests storage (No fake data)
export const mockRequests: UXRequest[] = []

export const PRODUCTS = [
  "App/Core",
  "App/Card",
  "App/Lending",
  "App/Saving",
  "Digi",
  "BaaS",
  "Internet Banking",
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

export function recommendSquad(product: string): Squad | null {
  if (!product) return null
  return mockSquads.find((s) => s.squad_name === product) ?? {
    squad_id: `SQ_${product.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`,
    squad_name: product,
    domain: `Phân hệ ${product}`,
    active_tasks: 1,
    queued_tasks: 1,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: ["Tiếp nhận yêu cầu mới"],
    queued_task_titles: [],
  }
}
