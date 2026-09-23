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

export type DayOfWeekKey = "Mo" | "Tu" | "We" | "Th" | "Fr" | "Sa" | "Su"

export interface HolidayException {
  id: string
  name: string
  date: string // "YYYY-MM-DD"
  endDate?: string // "YYYY-MM-DD"
  type: "public_holiday" | "internal_holiday" | "day_off" | "compensatory_workday"
  description?: string
  compensatoryFor?: string // Tùy chọn: Làm bù cho ngày nghỉ nào (ví dụ: "Nghỉ hoán đổi Quốc khánh 01/09")
}

export interface WorkScheduleConfig {
  /** Các ngày làm việc trong tuần */
  workweek: DayOfWeekKey[]
  /** Chế độ giờ làm việc: Cùng khung giờ cho mọi ngày hoặc tùy biến từng ngày */
  workingHoursMode: "same_all_days" | "custom"
  /** Giờ bắt đầu làm việc (mặc định: "08:00") */
  startTime: string
  /** Giờ kết thúc làm việc (mặc định: "17:30") */
  endTime: string
  /** Cấu hình thời gian nghỉ trưa */
  lunchBreak: {
    enabled: boolean
    startTime: string // "12:00"
    endTime: string // "13:30"
  }
  /** Danh sách ngày nghỉ lễ quốc gia & ngày nghỉ ngoại lệ */
  holidays: HolidayException[]
}

export interface LeaveSheetConfig {
  /** Bật/Tắt tự động đồng bộ danh sách nghỉ phép từ Google Sheet ngoài */
  enabled: boolean
  /** Đường dẫn URL hoặc Spreadsheet ID của Sheet lịch nghỉ */
  sheetUrl: string
  /** GID tab chứa dữ liệu nghỉ phép (mặc định: 917777763) */
  sheetGid: string
  /** Chu kỳ tự động quét làm mới dữ liệu (phút) */
  autoSyncInterval: string
}

export type CalendarViewMode = "month" | "week" | "day" | "agenda"
export type StartOfWeekDay = "monday" | "sunday"

export interface EventCategoryConfig {
  id: string
  name: string
  color: string
  textColor?: string
  icon?: string
  description?: string
  isSystem?: boolean
}

export interface TeamEvent {
  id: string
  title: string
  categoryId: string
  startDate: string
  endDate: string
  allDay: boolean
  attendees?: string[]
  location?: string
  description?: string
  createdBy?: string
  createdAt?: string
}

export interface CalendarConfig {
  defaultView: CalendarViewMode
  startOfWeek: StartOfWeekDay
  enableConflictAlert: boolean
  showWeekends: boolean
  lightenNonWorkingHours: boolean
  showWeekNumbers: boolean
  hideSidebarByDefault: boolean
  workingHoursStart: string
  workingHoursEnd: string
  rolePermissions: {
    viewCalendar: string[]
    manageEvents: string[]
    modifyDeadlines: string[]
  }
  eventCategories: EventCategoryConfig[]
  teamEvents: TeamEvent[]
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
  workSchedule: WorkScheduleConfig
  leaveSheet: LeaveSheetConfig
  calendar: CalendarConfig
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

export const VIETNAM_PUBLIC_HOLIDAYS_2026: HolidayException[] = [
  {
    id: "tet_duong_lich_2026",
    name: "Tết Dương lịch 2026",
    date: "2026-01-01",
    type: "public_holiday",
    description: "Nghỉ Tết Dương lịch theo Luật Lao động",
  },
  {
    id: "tet_am_lich_2026_1",
    name: "Tết Nguyên Đán Bính Ngọ (29 Tết)",
    date: "2026-02-16",
    type: "public_holiday",
    description: "Nghỉ Tết Nguyên Đán",
  },
  {
    id: "tet_am_lich_2026_2",
    name: "Tết Nguyên Đán (Mùng 1 Tết)",
    date: "2026-02-17",
    type: "public_holiday",
    description: "Nghỉ Tết Nguyên Đán",
  },
  {
    id: "tet_am_lich_2026_3",
    name: "Tết Nguyên Đán (Mùng 2 Tết)",
    date: "2026-02-18",
    type: "public_holiday",
    description: "Nghỉ Tết Nguyên Đán",
  },
  {
    id: "tet_am_lich_2026_4",
    name: "Tết Nguyên Đán (Mùng 3 Tết)",
    date: "2026-02-19",
    type: "public_holiday",
    description: "Nghỉ Tết Nguyên Đán",
  },
  {
    id: "tet_am_lich_2026_5",
    name: "Tết Nguyên Đán (Mùng 4 Tết)",
    date: "2026-02-20",
    type: "public_holiday",
    description: "Nghỉ Tết Nguyên Đán",
  },
  {
    id: "gio_to_hung_vuong_2026",
    name: "Giỗ Tổ Hùng Vương (10/03 ÂL)",
    date: "2026-04-26",
    type: "public_holiday",
    description: "Nghỉ Giỗ Tổ Hùng Vương",
  },
  {
    id: "ngay_thong_nhat_2026",
    name: "Ngày Giải phóng miền Nam (30/04)",
    date: "2026-04-30",
    type: "public_holiday",
    description: "Kỷ niệm ngày Giải phóng miền Nam",
  },
  {
    id: "quoc_te_lao_dong_2026",
    name: "Ngày Quốc tế Lao động (01/05)",
    date: "2026-05-01",
    type: "public_holiday",
    description: "Kỷ niệm ngày Quốc tế Lao động",
  },
  {
    id: "quoc_khanh_2026_1",
    name: "Nghỉ liền kề Quốc khánh",
    date: "2026-09-01",
    type: "public_holiday",
    description: "Nghỉ lễ Quốc khánh liền kề theo quy định Nhà nước",
  },
  {
    id: "quoc_khanh_2026_2",
    name: "Quốc khánh nước CHXHCN Việt Nam (02/09)",
    date: "2026-09-02",
    type: "public_holiday",
    description: "Nghỉ lễ Quốc khánh chính thức",
  },
]

export const VIETNAM_COMPENSATORY_WORKDAYS_2026: HolidayException[] = [
  {
    id: "lam_bu_quoc_khanh_2026",
    name: "Làm bù thứ Bảy (Hoán đổi nghỉ Quốc khánh 2026)",
    date: "2026-08-29",
    type: "compensatory_workday",
    description: "Đi làm thứ Bảy để hoán đổi nghỉ liền kề ngày 01/09 (Tính SLA như ngày làm việc tiêu chuẩn)",
    compensatoryFor: "Nghỉ liền kề Quốc khánh 01/09",
  },
]

export const DEFAULT_WORK_SCHEDULE: WorkScheduleConfig = {
  workweek: ["Mo", "Tu", "We", "Th", "Fr"],
  workingHoursMode: "same_all_days",
  startTime: "08:00",
  endTime: "17:30",
  lunchBreak: {
    enabled: true,
    startTime: "12:00",
    endTime: "13:30",
  },
  holidays: VIETNAM_PUBLIC_HOLIDAYS_2026,
}

export const DEFAULT_EVENT_CATEGORIES: EventCategoryConfig[] = [
  {
    id: "cat-review",
    name: "Design Review & Demo",
    color: "#3b82f6",
    textColor: "#ffffff",
    description: "Họp phản biện thiết kế, thẩm định giải pháp với PO/Business",
    isSystem: true,
  },
  {
    id: "cat-workshop",
    name: "Workshop & Training",
    color: "#f59e0b",
    textColor: "#ffffff",
    description: "Tập huấn chuyên môn, chia sẻ UI Token, ReUI Design System",
    isSystem: true,
  },
  {
    id: "cat-team",
    name: "Teambuilding & Sự kiện",
    color: "#8b5cf6",
    textColor: "#ffffff",
    description: "Gặp mặt nội bộ, sinh nhật thành viên, liên hoan Squad",
    isSystem: true,
  },
  {
    id: "cat-reminder",
    name: "Nhắc việc & Deadline",
    color: "#10b981",
    textColor: "#ffffff",
    description: "Nhắc nộp tài liệu bàn giao, đồng bộ Figma tokens",
    isSystem: true,
  },
  {
    id: "cat-squad-sync",
    name: "Họp Sprint & Sync Squad",
    color: "#06b6d4",
    textColor: "#ffffff",
    description: "Họp giao ban đầu tuần, điều phối backlog bài toán UX",
    isSystem: false,
  },
]

export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  defaultView: "month",
  startOfWeek: "monday",
  enableConflictAlert: true,
  showWeekends: true,
  lightenNonWorkingHours: true,
  showWeekNumbers: false,
  hideSidebarByDefault: false,
  workingHoursStart: "08:00",
  workingHoursEnd: "18:00",
  rolePermissions: {
    viewCalendar: ["Admin", "Design Owner", "Designer", "PO", "Business"],
    manageEvents: ["Admin", "Design Owner", "Designer"],
    modifyDeadlines: ["Admin", "Design Owner", "Designer"],
  },
  eventCategories: DEFAULT_EVENT_CATEGORIES,
  teamEvents: [
    {
      id: "ev-demo-1",
      title: "Design Review Sprint 23 - MB Mobile Banking",
      categoryId: "cat-review",
      startDate: "2026-09-24T09:30",
      endDate: "2026-09-24T11:00",
      allDay: false,
      attendees: ["manhcuong1340@gmail.com", "cachien1501@gmail.com"],
      location: "Phòng họp Sao Mai 3 - Hội sở MB",
      description: "Thẩm định luồng chuyển tiền đa kênh và màn hình kết quả giao dịch",
      createdBy: "Admin",
      createdAt: "2026-09-20T08:00:00.000Z",
    },
    {
      id: "ev-demo-2",
      title: "UX Workshop: Quy chuẩn ReUI Tokens & Micro-Interactions",
      categoryId: "cat-workshop",
      startDate: "2026-09-26T14:00",
      endDate: "2026-09-26T16:00",
      allDay: false,
      attendees: ["manhcuong1340@gmail.com"],
      location: "Microsoft Teams (Kênh UX Core)",
      description: "Hướng dẫn tích hợp Component ReUI và tokens đồng bộ Figma",
      createdBy: "Design Owner",
      createdAt: "2026-09-20T08:00:00.000Z",
    },
  ],
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
  workSchedule: DEFAULT_WORK_SCHEDULE,
  leaveSheet: {
    enabled: true,
    sheetUrl: "https://docs.google.com/spreadsheets/d/1oeDjaIMIuDsG2bDG2HT8euLICVXxQvWpf-2jfDr3Vlg/edit?gid=917777763",
    sheetGid: "917777763",
    autoSyncInterval: "5",
  },
  calendar: DEFAULT_CALENDAR_CONFIG,
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
      workSchedule: {
        ...DEFAULT_SYSTEM_CONFIG.workSchedule,
        ...(parsed.workSchedule || {}),
        lunchBreak: {
          ...DEFAULT_SYSTEM_CONFIG.workSchedule.lunchBreak,
          ...(parsed.workSchedule?.lunchBreak || {}),
        },
        holidays: Array.isArray(parsed.workSchedule?.holidays)
          ? parsed.workSchedule.holidays
          : DEFAULT_SYSTEM_CONFIG.workSchedule.holidays,
      },
      leaveSheet: {
        ...DEFAULT_SYSTEM_CONFIG.leaveSheet,
        ...(parsed.leaveSheet || {}),
      },
      calendar: {
        ...DEFAULT_SYSTEM_CONFIG.calendar,
        ...(parsed.calendar || {}),
        rolePermissions: {
          ...DEFAULT_SYSTEM_CONFIG.calendar.rolePermissions,
          ...(parsed.calendar?.rolePermissions || {}),
        },
        eventCategories: Array.isArray(parsed.calendar?.eventCategories) && parsed.calendar.eventCategories.length > 0
          ? parsed.calendar.eventCategories
          : DEFAULT_SYSTEM_CONFIG.calendar.eventCategories,
        teamEvents: Array.isArray(parsed.calendar?.teamEvents)
          ? parsed.calendar.teamEvents
          : DEFAULT_SYSTEM_CONFIG.calendar.teamEvents,
      },
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
    workSchedule: {
      ...current.workSchedule,
      ...(partialOrFull.workSchedule || {}),
      lunchBreak: {
        ...current.workSchedule.lunchBreak,
        ...(partialOrFull.workSchedule?.lunchBreak || {}),
      },
      holidays: Array.isArray(partialOrFull.workSchedule?.holidays)
        ? partialOrFull.workSchedule.holidays
        : current.workSchedule.holidays,
    },
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

// ─── WORK SCHEDULE CALCULATION ENGINE ───────────────────────────────────────

/**
 * Chuyển đổi mã ngày trong tuần (Date.getDay(): 0=Sun, 1=Mon, ..., 6=Sat)
 */
export function getDayOfWeekKey(date: Date): DayOfWeekKey {
  const day = date.getDay()
  const map: Record<number, DayOfWeekKey> = {
    0: "Su",
    1: "Mo",
    2: "Tu",
    3: "We",
    4: "Th",
    5: "Fr",
    6: "Sa",
  }
  return map[day]
}

/**
 * Kiểm tra xem ngày có phải ngày làm việc không (nằm trong workweek và không phải ngày nghỉ lễ)
 */
export function isBusinessDay(
  dateInput: Date | string,
  schedule: WorkScheduleConfig = getSystemConfig().workSchedule || DEFAULT_WORK_SCHEDULE
): boolean {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return false

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const dateStr = `${yyyy}-${mm}-${dd}`

  const holidays = schedule.holidays || []

  // 1. Kiểm tra ngày làm bù (Compensatory Workday):
  // Nếu ngày này được thiết lập làm bù, LUÔN ĐƯỢC TÍNH là ngày làm việc (kể cả Thứ 7 hoặc Chủ Nhật)
  const isCompensatory = holidays.some((h) => {
    if (h.type !== "compensatory_workday") return false
    if (!h.endDate || h.endDate === h.date) {
      return h.date === dateStr
    }
    return dateStr >= h.date && dateStr <= h.endDate
  })
  if (isCompensatory) {
    return true
  }

  // 2. Kiểm tra ngày nghỉ lễ / ngày nghỉ ngoại lệ (loại trừ khỏi ngày làm việc)
  const isOff = holidays.some((h) => {
    if (h.type === "compensatory_workday") return false
    if (!h.endDate || h.endDate === h.date) {
      return h.date === dateStr
    }
    return dateStr >= h.date && dateStr <= h.endDate
  })
  if (isOff) {
    return false
  }

  // 3. Kiểm tra ngày trong tuần thông thường theo lịch làm việc (workweek)
  const dayKey = getDayOfWeekKey(date)
  return schedule.workweek.includes(dayKey)
}

export const isWorkingDay = isBusinessDay

/**
 * Tính số phút làm việc tiêu chuẩn trong một ngày làm việc bình thường
 */
export function getDailyWorkingMinutes(
  schedule: WorkScheduleConfig = getSystemConfig().workSchedule || DEFAULT_WORK_SCHEDULE
): number {
  const [startH, startM] = (schedule.startTime || "08:00").split(":").map(Number)
  const [endH, endM] = (schedule.endTime || "17:30").split(":").map(Number)
  const workMinutes = (endH * 60 + endM) - (startH * 60 + startM)

  let lunchMinutes = 0
  if (schedule.lunchBreak?.enabled) {
    const [lsh, lsm] = (schedule.lunchBreak.startTime || "12:00").split(":").map(Number)
    const [leh, lem] = (schedule.lunchBreak.endTime || "13:30").split(":").map(Number)
    lunchMinutes = Math.max(0, (leh * 60 + lem) - (lsh * 60 + lsm))
  }

  return Math.max(0, workMinutes - lunchMinutes)
}

/**
 * Tính tổng số giờ làm việc trong 1 tuần (Weekly capacity hours)
 */
export function getWeeklyCapacityHours(
  schedule: WorkScheduleConfig = getSystemConfig().workSchedule || DEFAULT_WORK_SCHEDULE
): number {
  const dailyMinutes = getDailyWorkingMinutes(schedule)
  const daysCount = schedule.workweek?.length || 5
  return Math.round(((dailyMinutes * daysCount) / 60) * 10) / 10
}

/**
 * Tính số giờ làm việc thực tế giữa 2 thời điểm (đã loại trừ ngày nghỉ cuối tuần và ngày lễ)
 */
export function calculateBusinessHoursBetween(
  startDateInput: Date | string,
  endDateInput: Date | string,
  schedule: WorkScheduleConfig = getSystemConfig().workSchedule || DEFAULT_WORK_SCHEDULE
): number {
  const start = typeof startDateInput === "string" ? new Date(startDateInput) : startDateInput
  const end = typeof endDateInput === "string" ? new Date(endDateInput) : endDateInput
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return 0
  }

  // Khung giờ chuẩn theo phút trong ngày
  const [startH, startM] = (schedule.startTime || "08:00").split(":").map(Number)
  const [endH, endM] = (schedule.endTime || "17:30").split(":").map(Number)
  const workStartMinutes = startH * 60 + startM
  const workEndMinutes = endH * 60 + endM

  // Giờ nghỉ trưa
  let lunchStartMin = 0
  let lunchEndMin = 0
  if (schedule.lunchBreak?.enabled) {
    const [lsh, lsm] = (schedule.lunchBreak.startTime || "12:00").split(":").map(Number)
    const [leh, lem] = (schedule.lunchBreak.endTime || "13:30").split(":").map(Number)
    lunchStartMin = lsh * 60 + lsm
    lunchEndMin = leh * 60 + lem
  }

  const getDayWorkingMinutes = (curr: Date, fromMin: number, toMin: number): number => {
    if (!isBusinessDay(curr, schedule)) return 0
    const clampedFrom = Math.max(workStartMinutes, Math.min(workEndMinutes, fromMin))
    const clampedTo = Math.max(workStartMinutes, Math.min(workEndMinutes, toMin))
    if (clampedTo <= clampedFrom) return 0

    let total = clampedTo - clampedFrom
    if (schedule.lunchBreak?.enabled && lunchEndMin > lunchStartMin) {
      const overlapStart = Math.max(clampedFrom, lunchStartMin)
      const overlapEnd = Math.min(clampedTo, lunchEndMin)
      if (overlapEnd > overlapStart) {
        total -= (overlapEnd - overlapStart)
      }
    }
    return Math.max(0, total)
  }

  // Nếu cùng ngày
  const isSameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()

  if (isSameDay) {
    const fromMin = start.getHours() * 60 + start.getMinutes()
    const toMin = end.getHours() * 60 + end.getMinutes()
    const mins = getDayWorkingMinutes(start, fromMin, toMin)
    return Math.round((mins / 60) * 10) / 10
  }

  let totalMinutes = 0
  const current = new Date(start)

  // Ngày đầu tiên
  const firstDayFromMin = current.getHours() * 60 + current.getMinutes()
  totalMinutes += getDayWorkingMinutes(current, firstDayFromMin, workEndMinutes)

  // Các ngày ở giữa
  current.setDate(current.getDate() + 1)
  current.setHours(0, 0, 0, 0)
  const endDayStart = new Date(end)
  endDayStart.setHours(0, 0, 0, 0)

  while (current < endDayStart) {
    totalMinutes += getDayWorkingMinutes(current, workStartMinutes, workEndMinutes)
    current.setDate(current.getDate() + 1)
  }

  // Ngày cuối cùng
  const lastDayToMin = end.getHours() * 60 + end.getMinutes()
  totalMinutes += getDayWorkingMinutes(end, workStartMinutes, lastDayToMin)

  return Math.round((totalMinutes / 60) * 10) / 10
}

/**
 * Cộng thêm n ngày làm việc vào một ngày cho trước
 */
export function addBusinessDays(
  startDateInput: Date | string,
  days: number,
  schedule: WorkScheduleConfig = getSystemConfig().workSchedule || DEFAULT_WORK_SCHEDULE
): Date {
  const result = typeof startDateInput === "string" ? new Date(startDateInput) : new Date(startDateInput)
  if (isNaN(result.getTime()) || days <= 0) return result

  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    if (isBusinessDay(result, schedule)) {
      added++
    }
  }
  return result
}

/**
 * Tính số giờ trôi qua theo chuẩn SLA (đã loại trừ toàn bộ thời gian của các ngày nghỉ cuối tuần và ngày lễ).
 * Ví dụ: Gửi lúc 15:00 Thứ Sáu, đến 10:00 Thứ Hai:
 * Tổng thời gian 67h - (24h T7 + 24h CN) = 19h thực tính SLA (chưa quá hạn 24h).
 */
export function calculateSlaElapsedHours(
  startDateInput: Date | number | string,
  endDateInput: Date | number | string = new Date(),
  schedule: WorkScheduleConfig = getSystemConfig().workSchedule || DEFAULT_WORK_SCHEDULE
): number {
  const startMs = typeof startDateInput === "number" ? startDateInput : new Date(startDateInput).getTime()
  const endMs = typeof endDateInput === "number" ? endDateInput : new Date(endDateInput).getTime()
  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
    return 0
  }

  const start = new Date(startMs)
  const end = new Date(endMs)
  const totalMs = endMs - startMs

  // Lặp qua từng ngày giữa start và end để tìm các ngày không làm việc
  let nonWorkingMs = 0
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  while (cur.getTime() <= endDay.getTime()) {
    if (!isBusinessDay(cur, schedule)) {
      // Ngày này là ngày nghỉ (cuối tuần hoặc lễ).
      // Tính phần giao giữa [cur 00:00, cur 23:59:59.999] và [startMs, endMs]
      const dayStartMs = cur.getTime()
      const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000
      const overlapStart = Math.max(startMs, dayStartMs)
      const overlapEnd = Math.min(endMs, dayEndMs)
      if (overlapEnd > overlapStart) {
        nonWorkingMs += (overlapEnd - overlapStart)
      }
    }
    cur.setDate(cur.getDate() + 1)
  }

  const netMs = Math.max(0, totalMs - nonWorkingMs)
  return Math.round((netMs / (1000 * 60 * 60)) * 10) / 10
}

/**
 * Lấy cấu hình Lịch nghỉ phép ngoài hiện tại
 */
export function getLeaveSheetConfig(): LeaveSheetConfig {
  return getSystemConfig().leaveSheet || DEFAULT_SYSTEM_CONFIG.leaveSheet
}

/**
 * Lấy cấu hình UX Planner & Calendar hiện tại
 */
export function getCalendarConfig(): CalendarConfig {
  return getSystemConfig().calendar || DEFAULT_SYSTEM_CONFIG.calendar
}
