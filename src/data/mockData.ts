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
  // --- SẢN PHẨM: App MBBank ---
  {
    squad_id: "SQ_ESAVING",
    squad_name: "eSaving",
    product_name: "App MBBank",
    product_id: "prod-app-mb",
    domain: "Tiết kiệm & Tích lũy số",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "Lê Hoàng Nam (Designer)",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "SQ_CARD",
    squad_name: "Cards & Thanh toán số",
    product_name: "App MBBank",
    product_id: "prod-app-mb",
    domain: "Thẻ & Cổng thanh toán",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "Trần Mai Lan (Design Owner)",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "SQ_LENDING",
    squad_name: "Lending & Vay vốn",
    product_name: "App MBBank",
    product_id: "prod-app-mb",
    domain: "Vay vốn & Thấu chi tín dụng",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "Nguyễn Văn Cường (Admin)",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "SQ_CORE",
    squad_name: "Core Banking & Tài khoản",
    product_name: "App MBBank",
    product_id: "prod-app-mb",
    domain: "Tài khoản & Giao dịch chính",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "Nguyễn Văn Cường (Admin)",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "SQ_WEALTH",
    squad_name: "Digital Wealth & Đầu tư",
    product_name: "App MBBank",
    product_id: "prod-app-mb",
    domain: "Đầu tư tài chính & Chứng khoán",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 6,
    ux_owner: "Phạm Hải Đăng (Designer)",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "SQ_TRANSFER",
    squad_name: "Chuyển tiền & Tiện ích số",
    product_name: "App MBBank",
    product_id: "prod-app-mb",
    domain: "Chuyển tiền & Tiện ích đời sống",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: [],
    queued_task_titles: [],
  },

  // --- SẢN PHẨM: Biz MBBank ---
  {
    squad_id: "SQ_BIZ_LENDING",
    squad_name: "Biz Lending",
    product_name: "Biz MBBank",
    product_id: "prod-biz-mb",
    domain: "Vay doanh nghiệp & SME",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "SQ_BIZ_SAVING",
    squad_name: "Biz eSaving",
    product_name: "Biz MBBank",
    product_id: "prod-biz-mb",
    domain: "Tiền gửi doanh nghiệp",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "SQ_PAYROLL",
    squad_name: "Payroll & Quản lý lương",
    product_name: "Biz MBBank",
    product_id: "prod-biz-mb",
    domain: "Chi lương & Nhân sự số",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 6,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: [],
    queued_task_titles: [],
  },

  // --- SẢN PHẨM: BaaS & Open API ---
  {
    squad_id: "SQ_BAAS_GW",
    squad_name: "BaaS Gateway",
    product_name: "BaaS & Open API",
    product_id: "prod-baas",
    domain: "Banking as a Service & Đối tác API",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: [],
    queued_task_titles: [],
  },

  // --- SẢN PHẨM: Design System & Nền tảng ---
  {
    squad_id: "SQ_DS_MB",
    squad_name: "Design System MB",
    product_name: "Design System & Nền tảng",
    product_id: "prod-ds",
    domain: "Liquid Glass System & UI Token",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 10,
    ux_owner: "Nguyễn Văn Cường (Admin)",
    active_task_titles: [],
    queued_task_titles: [],
  },
]

// Real requests storage with rich starter data for offline/unconnected mode
export const mockRequests: UXRequest[] = [
  {
    request_id: "UXMB-2026-001",
    title: "Tối ưu hóa Luồng Mở Thẻ Tín dụng 100% Online (eKYC Instant Approval)",
    product: "App/Card",
    request_type: "Thiết kế lại trải nghiệm",
    feature_journey: "Onboarding & eKYC",
    description: "Rút ngắn số bước mở thẻ tín dụng từ 7 bước xuống 3 bước, tự động phê duyệt hạn mức bằng AI Scoring.",
    business_need: "Tăng tỷ lệ chuyển đổi mở thẻ từ 42% lên 65% trong Q1/2026.",
    user_problem: "Khách hàng thường bỏ dở ở bước xác thực thu nhập do form quá phức tạp.",
    target_user: "Khách hàng cá nhân có lịch sử giao dịch > 3 tháng",
    expected_output: ["User Flow", "UI Design", "Prototype"],
    expected_deadline: "2026-03-05",
    deadline_reason: "Ra mắt sản phẩm",
    preferred_squad: "App/Card",
    requester_email: "lan.po@mbbank.com.vn",
    requester_name: "Trần Mai Lan (PO Thẻ)",
    assigned_designer: "Lê Hoàng Nam",
    design_owner: "Nguyễn Văn Cường",
    squad_name: "App/Card",
    ux_owner: "Nguyễn Văn Cường (Design Owner)",
    current_phase: "UI Design",
    status: "Đang thực hiện",
    progress: 75,
    last_updated: "2026-02-21",
    phases: buildPhases("UI Design"),
    latest_update: {
      date: "2026-02-21",
      phase: "UI Design",
      message: "Đã hoàn thành High-fidelity UI 12 screens, đang review cùng PO.",
    },
    deliverables: {
      figma_url: "https://www.figma.com/file/sample-card-ekyc",
      prototype_url: "https://www.figma.com/proto/sample-card-ekyc",
    },
    submitted_at: "2026-02-10",
  },
  {
    request_id: "UXMB-2026-002",
    title: "Vay Thấu Chi Tín Dụng Doanh Nghiệp Siêu Nhỏ (Micro-Lending SME)",
    product: "App/Lending",
    request_type: "Tính năng mới",
    feature_journey: "Lending Onboarding",
    description: "Thiết kế luồng đăng ký vay vốn và giải ngân siêu tốc 5 phút cho chủ shop online.",
    business_need: "Mở rộng danh mục sản phẩm tín dụng số SME trong chiến lược BaaS.",
    user_problem: "Quy trình thẩm định hiện tại yêu cầu quá nhiều giấy tờ bản cứng.",
    target_user: "Hộ kinh doanh cá thể & SME",
    expected_output: ["UX Recommendation", "User Flow", "UI Design"],
    expected_deadline: "2026-02-24",
    deadline_reason: "Cam kết kinh doanh",
    preferred_squad: "App/Lending",
    requester_email: "minh.po@mbbank.com.vn",
    requester_name: "Lê Văn Minh (PO Lending)",
    assigned_designer: "Phạm Hải Đăng",
    design_owner: "Trần Mai Hoa (Design Owner)",
    squad_name: "App/Lending",
    ux_owner: "Trần Mai Hoa (Design Owner)",
    current_phase: "UI Design",
    status: "Đang thực hiện",
    progress: 40,
    last_updated: "2026-02-18",
    phases: buildPhases("UI Design"),
    latest_update: {
      date: "2026-02-18",
      phase: "UI Design",
      message: "Đang chờ PO chốt ma trận phí & lãi suất để cập nhật wireframe.",
    },
    deliverables: {},
    submitted_at: "2026-02-08",
  },
  {
    request_id: "UXMB-2026-003",
    title: "Tích Hợp API Chuyển Tiền Realtime BaaS với Đối Tác Thương Mại Điện Tử",
    product: "BaaS",
    request_type: "Tính năng mới",
    feature_journey: "Open Banking SDK",
    description: "Xây dựng SDK Widget trải nghiệm thanh toán nhúng không cần rời ứng dụng đối tác.",
    business_need: "Gia tăng giao dịch liên kết nền tảng với Shopee, TikTok Shop.",
    user_problem: "Khách hàng bị redirect nhiều lần gây drop-off cao.",
    target_user: "Người mua sắm trực tuyến",
    expected_output: ["User Flow", "UI Design", "Prototype"],
    expected_deadline: "2026-02-28",
    deadline_reason: "Chiến dịch marketing",
    preferred_squad: "BaaS",
    requester_email: "linh.po@mbbank.com.vn",
    requester_name: "Hoàng Linh (PO BaaS)",
    assigned_designer: "Vũ Thùy Linh",
    design_owner: "Nguyễn Văn Cường",
    squad_name: "BaaS",
    ux_owner: "Nguyễn Văn Cường (Design Owner)",
    current_phase: "Discovery",
    status: "Bị chặn",
    progress: 25,
    last_updated: "2026-02-20",
    phases: buildPhases("Discovery"),
    latest_update: {
      date: "2026-02-20",
      phase: "Discovery",
      message: "Blocker: Đang chờ Team IT bảo mật phê duyệt cơ chế Token OAuth2.",
    },
    deliverables: {},
    submitted_at: "2026-02-12",
  },
  {
    request_id: "UXMB-2026-004",
    title: "Thiết Kế Lại Giao Diện Trang Chủ App MB (Personalized Dynamic Dashboard)",
    product: "App/Core",
    request_type: "Thiết kế lại trải nghiệm",
    feature_journey: "Homepage & Navigation",
    description: "Cá nhân hóa các widget giao dịch nhanh dựa trên hành vi khách hàng với AI gợi ý.",
    business_need: "Nâng cao chỉ số Active Users hàng ngày (DAU) thêm 20%.",
    user_problem: "Trang chủ hiện tại quá tải thông tin, khó tìm các tính năng thường dùng.",
    target_user: "Toàn bộ khách hàng App MB",
    expected_output: ["UX Recommendation", "User Flow", "Wireframe", "UI Design", "Prototype", "Usability Testing"],
    expected_deadline: "2026-03-20",
    deadline_reason: "Ra mắt sản phẩm",
    preferred_squad: "App/Core",
    requester_email: "cuong.designowner@mbbank.com.vn",
    requester_name: "Nguyễn Văn Cường (Design Owner)",
    assigned_designer: "Nguyễn Văn Cường",
    design_owner: "Nguyễn Văn Cường",
    squad_name: "App/Core",
    ux_owner: "Nguyễn Văn Cường (Design Owner)",
    current_phase: "Prototype",
    status: "Đang thực hiện",
    progress: 85,
    last_updated: "2026-02-22",
    phases: buildPhases("Prototype"),
    latest_update: {
      date: "2026-02-22",
      phase: "Prototype",
      message: "Đang tiến hành Usability Testing đợt 2 với nhóm 15 users.",
    },
    deliverables: {
      figma_url: "https://www.figma.com/file/homepage-redesign-v2",
      prototype_url: "https://www.figma.com/proto/homepage-redesign-v2",
    },
    submitted_at: "2026-01-15",
  },
  {
    request_id: "UXMB-2026-005",
    title: "Tiết Kiệm Tích Lũy Mục Tiêu Tự Động (Goal-based Smart Saving)",
    product: "App/Saving",
    request_type: "Tính năng mới",
    feature_journey: "Wealth Management",
    description: "Tính năng trích tiền tự động mỗi khi quẹt thẻ hoặc nhận lương vào hũ tiết kiệm.",
    business_need: "Gia tăng số dư tiền gửi không kỳ hạn CASA.",
    user_problem: "Khách hàng trẻ muốn tiết kiệm nhưng thường quên trích tiền thủ công.",
    target_user: "Gen Z & Millennials",
    expected_output: ["User Flow", "UI Design", "Prototype"],
    expected_deadline: "2026-02-15",
    deadline_reason: "Ra mắt sản phẩm",
    preferred_squad: "App/Saving",
    requester_email: "nam.po@mbbank.com.vn",
    requester_name: "Trần Hải Nam (PO Saving)",
    assigned_designer: "Lê Hoàng Nam",
    design_owner: "Lê Hoàng Nam (Design Owner)",
    squad_name: "App/Saving",
    ux_owner: "Lê Hoàng Nam (Design Owner)",
    current_phase: "Bàn giao",
    status: "Hoàn thành",
    progress: 100,
    last_updated: "2026-02-15",
    phases: buildPhases("Bàn giao"),
    latest_update: {
      date: "2026-02-15",
      phase: "Bàn giao",
      message: "Đã bàn giao trọn bộ Design Spec, Tokens và Flow Animation cho Dev.",
    },
    deliverables: {
      figma_url: "https://www.figma.com/file/smart-saving-spec",
      spec_url: "https://mb.design.system/docs/saving-components",
    },
    submitted_at: "2026-01-20",
  },
  {
    request_id: "UXMB-2026-006",
    title: "Bổ Sung Widget Thẻ Ảo & Khóa Thẻ Khẩn Cấp Trên Apple Watch",
    product: "Digi",
    request_type: "Tính năng mới",
    feature_journey: "Wearable Banking",
    description: "Quản lý thẻ tức thời trên thiết bị đeo tay thông minh.",
    business_need: "Tiên phong trải nghiệm công nghệ số tiện ích vượt trội.",
    user_problem: "Khách hàng khi chạy bộ hoặc đi ngoài đường muốn khóa thẻ nhanh mà không cần mở điện thoại.",
    target_user: "Khách hàng sử dụng Apple Watch & Wear OS",
    expected_output: ["UI Design", "Prototype"],
    expected_deadline: "2026-03-10",
    deadline_reason: "Chiến dịch marketing",
    preferred_squad: "Digi",
    requester_email: "tuan.po@mbbank.com.vn",
    requester_name: "Lê Anh Tuấn (PO Digi)",
    assigned_designer: "Phạm Hải Đăng",
    design_owner: "Nguyễn Văn Cường",
    squad_name: "Digi",
    ux_owner: "UX Designer phụ trách",
    current_phase: "User Flow",
    status: "Đang thực hiện",
    progress: 50,
    last_updated: "2026-02-21",
    phases: buildPhases("User Flow"),
    latest_update: {
      date: "2026-02-21",
      phase: "User Flow",
      message: "Đã hoàn thành Wireframe cho Apple Watch 40mm/44mm, chuẩn bị lên UI.",
    },
    deliverables: {},
    submitted_at: "2026-02-14",
  },
  {
    request_id: "UXMB-2026-007",
    title: "Đơn Giản Hóa Biểu Mẫu Chuyển Tiền Quốc Tế Doanh Nghiệp (Swift On Web)",
    product: "Internet Banking",
    request_type: "Thiết kế lại trải nghiệm",
    feature_journey: "Corporate Payments",
    description: "Thiết kế lại wizard 5 bước chuyển ngoại tệ trực tuyến giảm 50% thời gian nhập liệu.",
    business_need: "Thu hút dòng tiền kiều hối và doanh nghiệp xuất nhập khẩu.",
    user_problem: "Form chuyển tiền quốc tế quá phức tạp, tỉ lệ lỗi do nhập sai mã SWIFT cao.",
    target_user: "Kế toán trưởng & Giám đốc tài chính SME",
    expected_output: ["UX Recommendation", "User Flow", "UI Design"],
    expected_deadline: "2026-03-15",
    deadline_reason: "Cam kết kinh doanh",
    preferred_squad: "Internet Banking",
    requester_email: "hoa.po@mbbank.com.vn",
    requester_name: "Nguyễn Thu Hoa (PO IB)",
    assigned_designer: "",
    design_owner: "Nguyễn Văn Cường",
    squad_name: "Internet Banking",
    ux_owner: "UX Designer phụ trách",
    current_phase: "Chờ tiếp nhận",
    status: "Chờ tiếp nhận",
    progress: 0,
    last_updated: "2026-02-22",
    phases: buildPhases("Chờ tiếp nhận"),
    latest_update: {
      date: "2026-02-22",
      phase: "Chờ tiếp nhận",
      message: "Yêu cầu mới gửi vào cổng, chờ Design Owner phân bổ Squad & Designer.",
    },
    deliverables: {},
    submitted_at: "2026-02-22",
  }
]

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

