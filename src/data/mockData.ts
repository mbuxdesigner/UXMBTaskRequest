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
}

export const ALL_PHASES = [
  "Đã gửi yêu cầu",
  "Phân loại",
  "Discovery",
  "User Flow",
  "UI Design",
  "Prototype",
  "Bàn giao",
]

export function buildPhases(currentPhase: string): Phase[] {
  const currentIdx = ALL_PHASES.indexOf(currentPhase)
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
    active_tasks: 6,
    queued_tasks: 4,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: [
      "Phát hành thẻ phi vật lý nhanh",
      "Quản lý hạn mức thẻ tín dụng",
      "QR Payment & Hoàn tiền thẻ",
      "Chuyển đổi trả góp thẻ tín dụng",
      "Đổi mã PIN thẻ trên App",
      "Tích điểm & Đổi quà MB Card",
    ],
    queued_task_titles: [
      "Khóa / Mở khóa thẻ tạm thời",
      "Lịch sử chi tiêu theo danh mục",
      "Liên kết thẻ vào Apple / Google Pay",
      "Widget thẻ thông minh trên Home",
    ],
  },
  {
    squad_id: "SQ_CORE",
    squad_name: "App/Core",
    domain: "Tài khoản & Giao dịch chính",
    active_tasks: 3,
    queued_tasks: 2,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: [
      "Cải thiện màn hình Tổng quan tài khoản",
      "Tra cứu chi tiết biến động số dư",
      "Tối ưu luồng chuyển tiền nhanh 247",
    ],
    queued_task_titles: ["Xuất sao kê tài khoản online", "Cài đặt thông báo biến động"],
  },
  {
    squad_id: "SQ_LENDING",
    squad_name: "App/Lending",
    domain: "Vay vốn & Thấu chi tín dụng",
    active_tasks: 7,
    queued_tasks: 5,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: [
      "Luồng đăng ký vay tín chấp online",
      "Nâng hạn mức thấu chi tài khoản",
      "Dashboard theo dõi lịch trả nợ",
      "Tất toán khoản vay trước hạn",
      "Tra cứu trạng thái hồ sơ vay",
      "Giải thích điểm tín dụng",
      "Gói bảo hiểm gắn với khoản vay",
    ],
    queued_task_titles: [
      "Công cụ kiểm tra điều kiện vay",
      "Đăng ký phát hành thẻ thấu chi",
      "Công cụ tính lãi & lịch trả góp",
      "Cơ cấu lại kỳ hạn trả nợ",
    ],
  },
  {
    squad_id: "SQ_SAVING",
    squad_name: "App/Saving",
    domain: "Tiết kiệm & Tích lũy số",
    active_tasks: 2,
    queued_tasks: 1,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: [
      "Mở sổ tiết kiệm online tích lũy",
      "Tiết kiệm gửi góp tự động định kỳ",
    ],
    queued_task_titles: ["Tính lãi suất tiết kiệm dự kiến"],
  },
  {
    squad_id: "SQ_DIGI",
    squad_name: "Digi",
    domain: "Kênh số & Tiện ích mở rộng",
    active_tasks: 3,
    queued_tasks: 2,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: [
      "Mua sắm hoàn tiền DigiMall",
      "Đặt vé máy bay & Khách sạn",
      "Thanh toán hóa đơn tự động",
    ],
    queued_task_titles: ["Tích hợp bảo hiểm số DigiCare", "Mini App đối tác"],
  },
  {
    squad_id: "SQ_BAAS",
    squad_name: "BaaS",
    domain: "Banking as a Service & Đối tác API",
    active_tasks: 2,
    queued_tasks: 1,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: ["Cổng kết nối đối tác Open Banking", "Trải nghiệm nhúng thanh toán"],
    queued_task_titles: ["Developer Portal UX Refactor"],
  },
  {
    squad_id: "SQ_IB",
    squad_name: "Internet Banking",
    domain: "Kênh Web Internet Banking",
    active_tasks: 2,
    queued_tasks: 2,
    capacity_threshold: 8,
    ux_owner: "UX Designer phụ trách",
    active_task_titles: ["Giao diện Internet Banking mới", "Phân quyền người dùng doanh nghiệp"],
    queued_task_titles: ["Báo cáo tài chính doanh nghiệp"],
  },
]

export const mockRequests: UXRequest[] = [
  {
    request_id: "UXMB-001",
    title: "International Transfer Redesign",
    product: "App/Card",
    request_type: "Thiết kế lại trải nghiệm",
    feature_journey: "International Transfer",
    description:
      "Luồng chuyển tiền quốc tế hiện tại có nhiều điểm ma sát gây drop-off cao. Cần thiết kế lại trải nghiệm streamlined, đơn giản hoá nhập SWIFT code và hiển thị phí rõ ràng.",
    business_need:
      "Giảm tỷ lệ bỏ giao dịch 40% và tăng khối lượng chuyển tiền quốc tế 30% trong Q3.",
    user_problem:
      "Người dùng gặp khó khăn với nhập SWIFT code phức tạp, phân tích phí không rõ ràng, và màn hình xác nhận gây nhầm lẫn.",
    target_user: "Khách hàng retail banking có nhu cầu gửi tiền quốc tế",
    expected_output: ["User Flow", "UI Design", "Prototype"],
    expected_deadline: "2026-09-30",
    deadline_reason: "Cam kết kinh doanh",
    preferred_squad: "App/Card",
    requester_email: "minhnb@mbbank.com.vn",
    squad_name: "App/Card",
    ux_owner: "UX Designer phụ trách",
    current_phase: "UI Design",
    status: "Đang thực hiện",
    progress: 60,
    last_updated: "03/08/2026",
    phases: buildPhases("UI Design"),
    latest_update: {
      date: "03/08/2026",
      phase: "UI Design — Đang thực hiện",
      message:
        "UX team đang hoàn thiện màn hình high-fidelity và chuẩn bị cho buổi review với stakeholder. Các màn hình core của luồng chuyển tiền đã hoàn thành 80%. Dự kiến sẵn sàng review: 10/08/2026.",
    },
    deliverables: {
      figma_url: "https://figma.com",
    },
    submitted_at: "10/06/2026",
  },
  {
    request_id: "UXMB-002",
    title: "Account Overview Enhancement",
    product: "App/Core",
    request_type: "Cải thiện trải nghiệm hiện tại",
    feature_journey: "Account Overview",
    description:
      "Cải thiện màn hình tổng quan tài khoản để cung cấp khả năng hiển thị tài chính tốt hơn với tóm tắt số dư, giao dịch gần đây và thao tác nhanh.",
    business_need:
      "Tăng daily active usage bằng cách cải thiện trải nghiệm màn hình đầu tiên và rút ngắn thời gian đến hành động chính.",
    user_problem:
      "Người dùng không thể nhanh chóng xem vị thế tài chính hoặc thực hiện thao tác phổ biến từ màn hình chính mà không cần nhiều bước.",
    target_user: "Toàn bộ khách hàng retail banking",
    expected_output: ["UI Design", "Prototype"],
    expected_deadline: "2026-07-15",
    deadline_reason: "Ra mắt sản phẩm",
    preferred_squad: "App/Core",
    requester_email: "lantt@mbbank.com.vn",
    squad_name: "App/Core",
    ux_owner: "UX Designer phụ trách",
    current_phase: "Bàn giao",
    status: "Hoàn thành",
    progress: 100,
    last_updated: "20/07/2026",
    phases: ALL_PHASES.map((name) => ({ name, status: "completed" as PhaseStatus })),
    latest_update: {
      date: "20/07/2026",
      phase: "Bàn giao — Hoàn thành",
      message:
        "Toàn bộ deliverable đã bàn giao cho engineering team. File Figma có annotation, UX spec và clickable prototype có sẵn bên dưới.",
    },
    deliverables: {
      figma_url: "https://figma.com",
      prototype_url: "https://figma.com",
      spec_url: "https://notion.so",
    },
    submitted_at: "15/05/2026",
  },
  {
    request_id: "UXMB-003",
    title: "Personal Loan Application Flow",
    product: "App/Lending",
    request_type: "Tính năng mới",
    feature_journey: "Loan Application",
    description:
      "Thiết kế hành trình nộp đơn vay cá nhân kỹ thuật số end-to-end cho mobile banking, từ kiểm tra điều kiện đến xác nhận giải ngân.",
    business_need:
      "Ra mắt sản phẩm vay cá nhân kỹ thuật số hoàn toàn vào Q4 2026 để chiếm lĩnh thị trường tín dụng không có tài sản đảm bảo đang tăng trưởng.",
    user_problem:
      "Khách hàng hiện tại phải đến chi nhánh để nộp đơn vay. Họ mong đợi hành trình tự phục vụ kỹ thuật số như các đối thủ fintech.",
    target_user: "Nhân viên văn phòng và người tự kinh doanh, độ tuổi 25–45",
    expected_output: ["UX Research", "User Flow", "UI Design", "Prototype"],
    expected_deadline: "2026-10-31",
    deadline_reason: "Ra mắt sản phẩm",
    preferred_squad: "App/Lending",
    requester_email: "anhld@mbbank.com.vn",
    squad_name: "App/Lending",
    ux_owner: "UX Designer phụ trách",
    current_phase: "Phân loại",
    status: "Đang phân loại",
    progress: 15,
    last_updated: "01/08/2026",
    phases: buildPhases("Phân loại"),
    latest_update: {
      date: "01/08/2026",
      phase: "Phân loại — Đang thực hiện",
      message:
        "UX Lead đang xem xét phạm vi yêu cầu và align với product team và compliance. Buổi kickoff discovery dự kiến vào 07/08/2026.",
    },
    deliverables: {},
    submitted_at: "28/07/2026",
  },
]

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

