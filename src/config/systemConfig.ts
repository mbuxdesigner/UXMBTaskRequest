/**
 * MBBank UX Portal - Dynamic System Configuration System
 * 
 * Hệ thống quản trị toàn diện và phản ứng động (Reactive Engine) cho mọi thông số của nền tảng:
 * 1. SLA & Thời gian: PO Pending timeout (giờ), SLA chu kỳ cam kết, Cảnh báo trễ hạn (%), Lịch làm việc.
 * 2. Năng lực & Tải việc: Định mức số task/designer, Ngưỡng tải cao, Ngưỡng quá tải, Cảnh báo quá tải squad.
 * 3. Cấp độ ưu tiên (Priority Matrix): Lv1 - Lv4 (Nhãn, Thời hạn SLA, Màu sắc, Mô tả).
 * 4. Mẫu thông báo đa kênh: 14 mẫu thông báo (Tiêu đề, Nội dung, Badge, Kênh phân phối In-app, Teams, Email, Push).
 * 5. Trọng số đánh giá KPI: Tỷ trọng Chất lượng %, SLA %, FTR %, Design System % và các ngưỡng xếp loại thi đua.
 * 6. Khảo sát & Đề thi: Điểm sàn đạt %, Thời gian thi, Số lần làm bài, Xáo trộn câu hỏi.
 * 7. Cổng thông tin & Thương hiệu: Tên Portal, Đơn vị, Hotline hỗ trợ, Banner thông báo khẩn cấp (Global Announcement Banner).
 * 8. Đính kèm & Tệp tin: Dung lượng tối đa, Số lượng file, Định dạng hỗ trợ.
 */

export interface SlaConfig {
  /** Thời hạn chờ PO phản hồi trước khi tự động chuyển sang trạng thái PO Pending (mặc định: 24 giờ) */
  poPendingTimeoutHours: number
  /** Mục tiêu cam kết chu kỳ SLA trung bình / task tính theo ngày (mặc định: 5.0 ngày) */
  targetCycleDays: number
  /** Mốc chu kỳ được xem là tốc độ nhanh (mặc định: 3.5 ngày) */
  fastCycleDays: number
  /** Ngưỡng phát cảnh báo vàng khi thời gian tiêu tốn đạt % SLA (mặc định: 80%) */
  slaWarningPercent: number
  /** Số ngày làm việc trong tuần (5: T2-T6, 5.5: T2-T7 sáng, 6: T2-T7) */
  workingDaysPerWeek: 5 | 5.5 | 6
  /** Số giờ làm việc tiêu chuẩn mỗi ngày (mặc định: 8 giờ) */
  dailyWorkingHours: number
  /** Tự động trừ ngày nghỉ cuối tuần và ngày lễ khi tính hạn SLA */
  excludeWeekendsInSla: boolean
  /** Tự động gán nhãn PO Pending khi quá hạn chờ duyệt */
  autoMarkPoPending: boolean
}

export interface CapacityConfig {
  /** Định mức tải việc chuẩn của mỗi Designer (số task đang chạy đồng thời, mặc định: 2 task/người) */
  defaultDesignerCapacity: number
  /** Tỷ lệ tải việc / Designer bắt đầu chạm ngưỡng "Tải cao" (mặc định: 2.0) */
  workloadHighThreshold: number
  /** Tỷ lệ tải việc / Designer vượt ngưỡng "Quá tải" (mặc định: 2.8) */
  workloadOverloadThreshold: number
  /** Hạn mức tối đa bài toán đang xử lý của mỗi UX Squad (mặc định: 6) */
  defaultSquadCapacity: number
  /** Bật cảnh báo quá tải khi người dùng gửi yêu cầu vào Squad đang chạm ngưỡng */
  overloadNotificationEnabled: boolean
}

export interface PriorityLevelConfig {
  id: "lv1" | "lv2" | "lv3" | "lv4"
  label: string
  slaHours: number
  slaDaysText: string
  colorVariant: "destructive" | "warning" | "info" | "secondary"
  description: string
  active: boolean
}

export interface NotificationChannelToggle {
  inApp: boolean
  teams: boolean
  email: boolean
  push: boolean
}

export interface NotificationTemplateSetting {
  type: string
  eventName: string
  category: "lifecycle" | "approval" | "assignment" | "sla" | "interaction" | "system"
  sender: string
  recipients: string
  titleTemplate: string
  messageTemplate: string
  badgeLabel: string
  toastType: "success" | "info" | "warning" | "error"
  enabled: boolean
  channels: NotificationChannelToggle
}

export interface EvaluationWeightsConfig {
  /** Tỷ trọng Tiêu chí 1: Chất lượng thiết kế & chuẩn hóa Design System (%) */
  qualityWeight: number
  /** Tỷ trọng Tiêu chí 2: Tỷ lệ hoàn thành đúng hạn cam kết SLA (%) */
  slaComplianceWeight: number
  /** Tỷ trọng Tiêu chí 3: First-Time-Right (Duyệt ngay lần đầu không cần sửa đổi lớn) (%) */
  ftrWeight: number
  /** Tỷ trọng Tiêu chí 4: Đóng góp Component / UI Tokens cho ReUI System (%) */
  designSystemWeight: number
  /** Điểm tối thiểu đạt xếp loại Xuất sắc (mặc định: 90) */
  excellentMinScore: number
  /** Điểm tối thiểu đạt xếp loại Tốt (mặc định: 80) */
  goodMinScore: number
  /** Điểm tối thiểu đạt xếp loại Đạt yêu cầu (mặc định: 70) */
  passMinScore: number
}

export interface AssessmentExamConfig {
  /** Tỷ lệ % điểm số tối thiểu để vượt qua bài test năng lực (mặc định: 70%) */
  passingScorePercent: number
  /** Thời lượng làm bài thi tiêu chuẩn tính theo phút (mặc định: 45 phút) */
  defaultDurationMinutes: number
  /** Số lần thi tối đa cho phép mỗi nhân sự (mặc định: 3 lần) */
  maxAttempts: number
  /** Tự động xáo trộn ngẫu nhiên thứ tự câu hỏi và đáp án */
  shuffleQuestions: boolean
  /** Hiển thị kết quả và giải thích chi tiết ngay sau khi hoàn thành bài nộp */
  showImmediateResults: boolean
  /** Cho phép nhân sự xem lại các câu trả lời sau khi nộp bài */
  allowReviewAnswers: boolean
}

export interface GlobalAnnouncementBanner {
  /** Bật / Tắt hiển thị banner thông báo khẩn trên đỉnh toàn hệ thống */
  enabled: boolean
  /** Kiểu banner thông báo */
  type: "info" | "warning" | "success" | "destructive"
  /** Nội dung thông báo hiển thị cho toàn thể người dùng */
  message: string
  /** Đường link điều hướng chi tiết (nếu có) */
  linkUrl?: string
  /** Nhãn nút bấm liên kết (ví dụ: 'Xem chi tiết', 'Tài liệu hướng dẫn') */
  linkText?: string
  /** Cho phép người dùng tắt tạm thời banner trong phiên làm việc */
  dismissible: boolean
}

export interface PortalConfig {
  brandName: string
  shortName: string
  tagline: string
  department: string
  supportEmail: string
  teamsSupportChannelUrl: string
  documentationUrl: string
  announcement: GlobalAnnouncementBanner
  maintenanceMode: boolean
  maintenanceMessage: string
}

export interface AttachmentConfig {
  maxFileSizeMb: number
  maxFilesCount: number
  allowedExtensions: string[]
  allowScreenshotsPaste: boolean
}

export interface SystemConfig {
  version: string
  lastUpdated: string
  updatedBy: string
  sla: SlaConfig
  capacity: CapacityConfig
  priorities: PriorityLevelConfig[]
  notifications: Record<string, NotificationTemplateSetting>
  evaluation: EvaluationWeightsConfig
  assessment: AssessmentExamConfig
  portal: PortalConfig
  attachments: AttachmentConfig
}

export const SYSTEM_CONFIG_STORAGE_KEY = "mb_system_config_v1"
export const SYSTEM_CONFIG_EVENT_NAME = "mbbank_system_config_changed"

export const DEFAULT_PRIORITY_LEVELS: PriorityLevelConfig[] = [
  {
    id: "lv1",
    label: "Lv1 - Khẩn cấp",
    slaHours: 24,
    slaDaysText: "24 giờ (1 ngày làm việc)",
    colorVariant: "destructive",
    description: "Sự cố nghiêm trọng trên production, chặn luồng thanh toán hoặc phát hành khẩn cấp của Ban Lãnh Đạo",
    active: true,
  },
  {
    id: "lv2",
    label: "Lv2 - Cao",
    slaHours: 72,
    slaDaysText: "72 giờ (3 ngày làm việc)",
    colorVariant: "warning",
    description: "Tính năng chiến lược trọng điểm, ảnh hưởng trực tiếp đến KPI kinh doanh quý hiện tại",
    active: true,
  },
  {
    id: "lv3",
    label: "Lv3 - Bình thường",
    slaHours: 120,
    slaDaysText: "120 giờ (5 ngày làm việc)",
    colorVariant: "info",
    description: "Yêu cầu phát triển tính năng chuẩn theo lộ trình Sprint định kỳ của Squad",
    active: true,
  },
  {
    id: "lv4",
    label: "Lv4 - Thấp",
    slaHours: 240,
    slaDaysText: "240 giờ (10 ngày làm việc)",
    colorVariant: "secondary",
    description: "Tinh chỉnh UI nhỏ, cải tiến phụ trợ hoặc đề xuất thử nghiệm chưa có cam kết mốc release",
    active: true,
  },
]

export const DEFAULT_NOTIFICATION_SETTINGS: Record<string, NotificationTemplateSetting> = {
  task_created: {
    type: "task_created",
    eventName: "PO gửi task mới",
    category: "lifecycle",
    sender: "PO (Requester)",
    recipients: "Designer Owner phụ trách Squad đó (& Triage Lead)",
    titleTemplate: "PO gửi task: {requestId}",
    messageTemplate: "Có yêu cầu thiết kế mới từ PO {actorName} - [{taskTitle}] - {squadName}.",
    badgeLabel: "PO gửi task",
    toastType: "success",
    enabled: true,
    channels: { inApp: true, teams: true, email: true, push: true },
  },
  task_approved: {
    type: "task_approved",
    eventName: "Đồng thuận thiết kế",
    category: "approval",
    sender: "PO (Product Owner)",
    recipients: "Designer phụ trách bài toán & Designer Owner của Squad",
    titleTemplate: "Đồng thuận thiết kế: {requestId}",
    messageTemplate: "PO {actorName} đã đồng thuận phương án thiết kế [{taskTitle}].",
    badgeLabel: "Đồng thuận",
    toastType: "success",
    enabled: true,
    channels: { inApp: true, teams: true, email: true, push: true },
  },
  task_changes_requested: {
    type: "task_changes_requested",
    eventName: "PO feedback",
    category: "approval",
    sender: "PO (Product Owner)",
    recipients: "Designer phụ trách bài toán",
    titleTemplate: "PO feedback: {requestId}",
    messageTemplate: "PO {actorName} đã gửi feedback: {note}",
    badgeLabel: "PO feedback",
    toastType: "warning",
    enabled: true,
    channels: { inApp: true, teams: true, email: false, push: true },
  },
  task_assigned: {
    type: "task_assigned",
    eventName: "Phân công Designer",
    category: "assignment",
    sender: "Designer thực hiện / Lead",
    recipients: "Designer được phân công & PO gửi yêu cầu",
    titleTemplate: "Designer tiếp nhận xử lý yêu cầu: {requestId}",
    messageTemplate: "Yêu cầu [{taskTitle}] đã được phân công cho {actorName}.",
    badgeLabel: "Phân công",
    toastType: "info",
    enabled: true,
    channels: { inApp: true, teams: true, email: false, push: true },
  },
  task_sent_to_po: {
    type: "task_sent_to_po",
    eventName: "Gửi PO duyệt",
    category: "approval",
    sender: "Designer thực hiện / Lead / Designer Owner",
    recipients: "PO phụ trách yêu cầu (Requester)",
    titleTemplate: "Gửi PO duyệt: {requestId}",
    messageTemplate: "Designer {actorName} đã hoàn thiện thiết kế [{taskTitle}] và gửi PO nghiệm thu.",
    badgeLabel: "Gửi PO",
    toastType: "info",
    enabled: true,
    channels: { inApp: true, teams: true, email: true, push: true },
  },
  phase_changed: {
    type: "phase_changed",
    eventName: "Chuyển khâu thiết kế",
    category: "lifecycle",
    sender: "Designer thực hiện / Lead / Designer Owner",
    recipients: "PO gửi yêu cầu & Designer Owner",
    titleTemplate: "Chuyển khâu thiết kế: {requestId}",
    messageTemplate: "[{taskTitle}] đã chuyển sang [{phaseName}] ({note}).",
    badgeLabel: "Quy trình",
    toastType: "info",
    enabled: true,
    channels: { inApp: true, teams: true, email: false, push: true },
  },
  po_pending: {
    type: "po_pending",
    eventName: "PO Pending (Quá hạn duyệt)",
    category: "sla",
    sender: "Hệ thống tự động",
    recipients: "PO phụ trách, Designer & Squad Lead",
    titleTemplate: "Cảnh báo PO Pending: {requestId}",
    messageTemplate: "Yêu cầu [{taskTitle}] đã gửi PO quá {hours}h chưa nhận được phản hồi duyệt phương án.",
    badgeLabel: "PO Pending",
    toastType: "warning",
    enabled: true,
    channels: { inApp: true, teams: true, email: true, push: true },
  },
  sla_warning_80: {
    type: "sla_warning_80",
    eventName: "Cảnh báo SLA (Đạt 80% thời gian)",
    category: "sla",
    sender: "Hệ thống tự động",
    recipients: "Designer phụ trách & Designer Owner",
    titleTemplate: "Sắp chạm hạn SLA: {requestId}",
    messageTemplate: "Yêu cầu [{taskTitle}] đã tiêu tốn hơn 80% cam kết thời gian SLA. Hạn bàn giao: {deadline}.",
    badgeLabel: "Cảnh báo SLA",
    toastType: "warning",
    enabled: true,
    channels: { inApp: true, teams: true, email: false, push: true },
  },
  sla_breached: {
    type: "sla_breached",
    eventName: "Trễ hạn SLA",
    category: "sla",
    sender: "Hệ thống tự động",
    recipients: "Designer, PO, Designer Owner & Squad Lead",
    titleTemplate: "Trễ hạn cam kết SLA: {requestId}",
    messageTemplate: "Yêu cầu [{taskTitle}] đã quá hạn bàn giao SLA ({deadline}). Cần ưu tiên xử lý gấp.",
    badgeLabel: "Trễ hạn SLA",
    toastType: "error",
    enabled: true,
    channels: { inApp: true, teams: true, email: true, push: true },
  },
  status_changed: {
    type: "status_changed",
    eventName: "Cập nhật trạng thái",
    category: "lifecycle",
    sender: "Thành viên thực hiện / PO",
    recipients: "Các bên liên quan (PO, Designer, Owner)",
    titleTemplate: "Cập nhật trạng thái: {requestId}",
    messageTemplate: "[{taskTitle}] đã chuyển trạng thái sang [{statusName}].",
    badgeLabel: "Trạng thái",
    toastType: "info",
    enabled: true,
    channels: { inApp: true, teams: true, email: false, push: true },
  },
  deadline_changed: {
    type: "deadline_changed",
    eventName: "Cập nhật hạn hoàn thành",
    category: "lifecycle",
    sender: "Admin / Lead / PO",
    recipients: "Designer phụ trách bài toán & Designer Owner",
    titleTemplate: "Cập nhật deadline: {requestId}",
    messageTemplate: "Hạn bàn giao bài toán [{taskTitle}] đã cập nhật sang ngày {note}.",
    badgeLabel: "Hạn deadline",
    toastType: "warning",
    enabled: true,
    channels: { inApp: true, teams: true, email: false, push: true },
  },
  task_pending: {
    type: "task_pending",
    eventName: "Tạm dừng bài toán (Pending)",
    category: "lifecycle",
    sender: "PO / Designer",
    recipients: "Các bên liên quan (PO & Designer)",
    titleTemplate: "Tạm dừng bài toán: {requestId}",
    messageTemplate: "[{taskTitle}] chuyển sang trạng thái Pending: {note}.",
    badgeLabel: "Pending",
    toastType: "warning",
    enabled: true,
    channels: { inApp: true, teams: true, email: false, push: true },
  },
  task_resumed: {
    type: "task_resumed",
    eventName: "Tiếp tục bài toán",
    category: "lifecycle",
    sender: "PO / Designer",
    recipients: "Các bên liên quan (PO & Designer)",
    titleTemplate: "Tiếp tục bài toán: {requestId}",
    messageTemplate: "[{taskTitle}] đã được tiếp tục triển khai.",
    badgeLabel: "Tiếp tục",
    toastType: "success",
    enabled: true,
    channels: { inApp: true, teams: true, email: false, push: true },
  },
  squad_changed: {
    type: "squad_changed",
    eventName: "Chuyển Squad",
    category: "assignment",
    sender: "Admin / Lead",
    recipients: "Designer Owner của cả 2 Squad (cũ & mới) & PO",
    titleTemplate: "Điều chuyển Squad: {requestId}",
    messageTemplate: "[{taskTitle}] đã được chuyển sang Squad [{squadName}].",
    badgeLabel: "Squad",
    toastType: "info",
    enabled: true,
    channels: { inApp: true, teams: true, email: false, push: true },
  },
  comment_added: {
    type: "comment_added",
    eventName: "Bình luận mới",
    category: "interaction",
    sender: "Người gửi bình luận",
    recipients: "Các thành viên tham gia bài toán (PO, Designer, Owner)",
    titleTemplate: "Bình luận mới: {requestId}",
    messageTemplate: "{actorName}: \"{note}\"",
    badgeLabel: "Bình luận",
    toastType: "info",
    enabled: true,
    channels: { inApp: true, teams: true, email: false, push: true },
  },
  system: {
    type: "system",
    eventName: "Hệ thống UXMB Portal",
    category: "system",
    sender: "Hệ thống UXMB Portal",
    recipients: "Toàn bộ người dùng hệ thống",
    titleTemplate: "Hệ thống MB UX Portal",
    messageTemplate: "{note}",
    badgeLabel: "Hệ thống",
    toastType: "info",
    enabled: true,
    channels: { inApp: true, teams: true, email: false, push: true },
  },
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  version: "1.0.0",
  lastUpdated: new Date().toISOString(),
  updatedBy: "Admin Quản Trị Hệ Thống",
  sla: {
    poPendingTimeoutHours: 24,
    targetCycleDays: 5.0,
    fastCycleDays: 3.5,
    slaWarningPercent: 80,
    workingDaysPerWeek: 5,
    dailyWorkingHours: 8,
    excludeWeekendsInSla: true,
    autoMarkPoPending: true,
  },
  capacity: {
    defaultDesignerCapacity: 2,
    workloadHighThreshold: 2.0,
    workloadOverloadThreshold: 2.8,
    defaultSquadCapacity: 6,
    overloadNotificationEnabled: true,
  },
  priorities: DEFAULT_PRIORITY_LEVELS,
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  evaluation: {
    qualityWeight: 40,
    slaComplianceWeight: 30,
    ftrWeight: 20,
    designSystemWeight: 10,
    excellentMinScore: 90,
    goodMinScore: 80,
    passMinScore: 70,
  },
  assessment: {
    passingScorePercent: 70,
    defaultDurationMinutes: 45,
    maxAttempts: 3,
    shuffleQuestions: true,
    showImmediateResults: true,
    allowReviewAnswers: true,
  },
  portal: {
    brandName: "MB UX Request Portal",
    shortName: "MB UX Portal",
    tagline: "Hệ thống tiếp nhận & Quản trị yêu cầu thiết kế trải nghiệm người dùng",
    department: "Digital Banking Division · MBBank",
    supportEmail: "ux-support@mbbank.com.vn",
    teamsSupportChannelUrl: "https://teams.microsoft.com/l/channel/mbbank-ux-core",
    documentationUrl: "https://wiki.mbbank.com.vn/display/UX/DesignSystem",
    announcement: {
      enabled: false,
      type: "info",
      message: "Hệ thống đang hoạt động ở trạng thái tối ưu trên hạ tầng MBBank Cloud.",
      linkUrl: "",
      linkText: "Xem chi tiết",
      dismissible: true,
    },
    maintenanceMode: false,
    maintenanceMessage: "Hệ thống đang được bảo trì định kỳ. Quý anh/chị vui lòng quay lại sau ít phút.",
  },
  attachments: {
    maxFileSizeMb: 20,
    maxFilesCount: 10,
    allowedExtensions: [".png", ".jpg", ".jpeg", ".gif", ".pdf", ".fig", ".zip", ".xlsx", ".docx"],
    allowScreenshotsPaste: true,
  },
}

/**
 * Cache trong bộ nhớ để truy cập đồng bộ siêu tốc
 */
let memoryConfigCache: SystemConfig | null = null

/**
 * Lấy cấu hình hệ thống hiện tại (Ưu tiên: Cache -> localStorage -> Default)
 */
export function getSystemConfig(): SystemConfig {
  if (memoryConfigCache) {
    return memoryConfigCache
  }

  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_SYSTEM_CONFIG
  }

  try {
    const raw = localStorage.getItem(SYSTEM_CONFIG_STORAGE_KEY)
    if (!raw) {
      memoryConfigCache = DEFAULT_SYSTEM_CONFIG
      return DEFAULT_SYSTEM_CONFIG
    }

    const parsed = JSON.parse(raw) as Partial<SystemConfig>
    // Merge sâu an toàn với default để không bao giờ bị thiếu field
    const merged: SystemConfig = {
      ...DEFAULT_SYSTEM_CONFIG,
      ...parsed,
      sla: { ...DEFAULT_SYSTEM_CONFIG.sla, ...(parsed.sla || {}) },
      capacity: { ...DEFAULT_SYSTEM_CONFIG.capacity, ...(parsed.capacity || {}) },
      priorities: Array.isArray(parsed.priorities) && parsed.priorities.length > 0 ? parsed.priorities : DEFAULT_SYSTEM_CONFIG.priorities,
      notifications: { ...DEFAULT_SYSTEM_CONFIG.notifications, ...(parsed.notifications || {}) },
      evaluation: { ...DEFAULT_SYSTEM_CONFIG.evaluation, ...(parsed.evaluation || {}) },
      assessment: { ...DEFAULT_SYSTEM_CONFIG.assessment, ...(parsed.assessment || {}) },
      portal: {
        ...DEFAULT_SYSTEM_CONFIG.portal,
        ...(parsed.portal || {}),
        announcement: {
          ...DEFAULT_SYSTEM_CONFIG.portal.announcement,
          ...(parsed.portal?.announcement || {}),
        },
      },
      attachments: { ...DEFAULT_SYSTEM_CONFIG.attachments, ...(parsed.attachments || {}) },
    }

    memoryConfigCache = merged
    return merged
  } catch (err) {
    console.error("[SystemConfig] Error reading config from storage:", err)
    memoryConfigCache = DEFAULT_SYSTEM_CONFIG
    return DEFAULT_SYSTEM_CONFIG
  }
}

/**
 * Lưu cấu hình hệ thống (Cập nhật localStorage, cache và bắn event toàn cầu)
 */
export function saveSystemConfig(partialOrFull: Partial<SystemConfig>, actorName: string = "Admin Quản Trị"): SystemConfig {
  const current = getSystemConfig()
  const updated: SystemConfig = {
    ...current,
    ...partialOrFull,
    lastUpdated: new Date().toISOString(),
    updatedBy: actorName,
    sla: { ...current.sla, ...(partialOrFull.sla || {}) },
    capacity: { ...current.capacity, ...(partialOrFull.capacity || {}) },
    priorities: partialOrFull.priorities || current.priorities,
    notifications: { ...current.notifications, ...(partialOrFull.notifications || {}) },
    evaluation: { ...current.evaluation, ...(partialOrFull.evaluation || {}) },
    assessment: { ...current.assessment, ...(partialOrFull.assessment || {}) },
    portal: {
      ...current.portal,
      ...(partialOrFull.portal || {}),
      announcement: {
        ...current.portal.announcement,
        ...(partialOrFull.portal?.announcement || {}),
      },
    },
    attachments: { ...current.attachments, ...(partialOrFull.attachments || {}) },
  }

  memoryConfigCache = updated

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(SYSTEM_CONFIG_STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(
        new CustomEvent(SYSTEM_CONFIG_EVENT_NAME, {
          detail: updated,
        })
      )
    } catch (err) {
      console.error("[SystemConfig] Error writing config to storage:", err)
    }
  }

  return updated
}

/**
 * Khôi phục toàn bộ cấu hình hệ thống về tiêu chuẩn gốc MBBank
 */
export function resetSystemConfig(actorName: string = "Admin Quản Trị"): SystemConfig {
  const resetConfig: SystemConfig = {
    ...DEFAULT_SYSTEM_CONFIG,
    lastUpdated: new Date().toISOString(),
    updatedBy: `${actorName} (Reset về mặc định)`,
  }

  memoryConfigCache = resetConfig

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(SYSTEM_CONFIG_STORAGE_KEY, JSON.stringify(resetConfig))
      window.dispatchEvent(
        new CustomEvent(SYSTEM_CONFIG_EVENT_NAME, {
          detail: resetConfig,
        })
      )
    } catch (err) {
      console.error("[SystemConfig] Error resetting config:", err)
    }
  }

  return resetConfig
}

/**
 * Xuất cấu hình thành file JSON để backup
 */
export function exportSystemConfigJson(): string {
  const cfg = getSystemConfig()
  return JSON.stringify(cfg, null, 2)
}

/**
 * Nhập cấu hình từ file JSON (có kiểm tra tính hợp lệ)
 */
export function importSystemConfigJson(jsonStr: string, actorName: string = "Admin Quản Trị"): { success: boolean; message: string; config?: SystemConfig } {
  try {
    const parsed = JSON.parse(jsonStr)
    if (!parsed || typeof parsed !== "object") {
      return { success: false, message: "Dữ liệu JSON không đúng định dạng đối tượng cấu hình." }
    }

    const saved = saveSystemConfig(parsed, `${actorName} (Nhập từ file JSON)`)
    return { success: true, message: "Nhập cấu hình thành công!", config: saved }
  } catch (err: any) {
    return { success: false, message: `Lỗi phân tích JSON: ${err?.message || "Cú pháp không hợp lệ"}` }
  }
}

// Lắng nghe sự kiện đồng bộ chéo giữa các tab trình duyệt
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === SYSTEM_CONFIG_STORAGE_KEY && e.newValue) {
      try {
        memoryConfigCache = JSON.parse(e.newValue)
        window.dispatchEvent(
          new CustomEvent(SYSTEM_CONFIG_EVENT_NAME, {
            detail: memoryConfigCache,
          })
        )
      } catch (err) {
        console.error("[SystemConfig] Cross-tab sync parse error:", err)
      }
    }
  })
}
