/**
 * MBBank UX Portal - Dynamic Request Form Configuration System
 * 
 * Quản trị toàn diện cấu hình Form tiếp nhận yêu cầu UX:
 * - Quy tắc từng trường: ẩn/hiện, bắt buộc/tùy chọn, tiêu đề nhãn, placeholder, tooltip
 * - Danh mục tùy chọn động: Loại yêu cầu (Request Types), Lý do thời hạn (Deadline Reasons)
 * - Thiết lập tổng quan: Tiêu đề, phụ đề, quy tắc upload & Ctrl+V ảnh
 */

export type FormSectionKey = "request_info" | "detail_desc" | "plan_deadline"

export interface FormFieldSetting {
  id: string
  key: string
  label: string
  placeholder: string
  helperText?: string
  enabled: boolean       // Bật / Tắt hiển thị trên form
  required: boolean      // Bắt buộc điền (*)
  isCore?: boolean       // Trường lõi hệ thống (không nên tắt/xóa)
  type: "text" | "textarea" | "select" | "date" | "link_upload"
  section: FormSectionKey
  order: number
}

export interface FormOptionItem {
  id: string
  label: string
  value: string
  description?: string
  enabled: boolean
}

export interface RequestFormConfig {
  version: number
  lastUpdated: string
  header: {
    parentBreadcrumb: string
    currentBreadcrumb: string
    title: string
    subtitle: string
  }
  sections: {
    requestInfoTitle: string
    detailDescTitle: string
    attachmentsTitle: string
    planDeadlineTitle: string
    submitButtonText: string
  }
  fields: FormFieldSetting[]
  options: {
    requestTypes: FormOptionItem[]
    deadlineReasons: FormOptionItem[]
  }
  rules: {
    allowScreenshotsPaste: boolean
    maxFileSizeMb: number
    maxFilesCount: number
    requireEstimatedReleaseDate: boolean
    autoScrollOnError: boolean
  }
}

export const FORM_CONFIG_STORAGE_KEY = "ux_portal_form_config_v1"
export const FORM_CONFIG_EVENT_NAME = "mbbank_form_config_changed"

export const DEFAULT_FORM_FIELDS: FormFieldSetting[] = [
  // SECTION 01: THÔNG TIN YÊU CẦU
  {
    id: "f-title",
    key: "title",
    label: "Tiêu đề yêu cầu",
    placeholder: "VD: Thiết kế lại màn hình chuyển tiền quốc tế",
    helperText: "Đặt tên ngắn gọn, thể hiện rõ tính năng hoặc luồng trải nghiệm cần thiết kế",
    enabled: true,
    required: true,
    isCore: true,
    type: "text",
    section: "request_info",
    order: 1,
  },
  {
    id: "f-product",
    key: "product",
    label: "Sản phẩm số",
    placeholder: "Chọn sản phẩm...",
    helperText: "Nền tảng hoặc phân hệ sản phẩm trực thuộc (App MBBank, Biz MB, BaaS...)",
    enabled: true,
    required: true,
    isCore: true,
    type: "select",
    section: "request_info",
    order: 2,
  },
  {
    id: "f-preferred_squad",
    key: "preferred_squad",
    label: "Squad nghiệp vụ",
    placeholder: "Chọn squad...",
    helperText: "Squad phụ trách trực tiếp tính năng này",
    enabled: true,
    required: false,
    isCore: false,
    type: "select",
    section: "request_info",
    order: 3,
  },
  {
    id: "f-request_type",
    key: "request_type",
    label: "Loại yêu cầu",
    placeholder: "Chọn loại yêu cầu...",
    helperText: "Phân loại mức độ can thiệp thiết kế (Tính năng mới, Cải tiến UI...)",
    enabled: true,
    required: true,
    isCore: true,
    type: "select",
    section: "request_info",
    order: 4,
  },

  // SECTION 02: MÔ TẢ CHI TIẾT
  {
    id: "f-description",
    key: "description",
    label: "Mô tả yêu cầu",
    placeholder: "Mô tả chi tiết nhu cầu cần UX team hỗ trợ...",
    helperText: "Nêu rõ bối cảnh, phạm vi nghiệp vụ và kết quả kỳ vọng",
    enabled: true,
    required: true,
    isCore: true,
    type: "textarea",
    section: "detail_desc",
    order: 5,
  },
  {
    id: "f-business_need",
    key: "business_need",
    label: "Tại sao yêu cầu này cần thiết?",
    placeholder: "Vấn đề kinh doanh bạn đang muốn giải quyết là gì?",
    helperText: "Mục tiêu kinh doanh, KPI số lượng giao dịch hoặc mục tiêu tăng trưởng",
    enabled: true,
    required: false,
    isCore: false,
    type: "textarea",
    section: "detail_desc",
    order: 6,
  },
  {
    id: "f-user_problem",
    key: "user_problem",
    label: "Vấn đề người dùng cần giải quyết",
    placeholder: "Điểm đau hoặc nhu cầu chưa được đáp ứng của người dùng...",
    helperText: "Pain point thực tế của khách hàng khi thao tác trên ứng dụng",
    enabled: true,
    required: false,
    isCore: false,
    type: "textarea",
    section: "detail_desc",
    order: 7,
  },
  {
    id: "f-target_user",
    key: "target_user",
    label: "Đối tượng người dùng mục tiêu",
    placeholder: "VD: Khách hàng retail banking, độ tuổi 25-45",
    helperText: "Chân dung nhóm khách hàng chính sử dụng luồng tính năng này",
    enabled: true,
    required: false,
    isCore: false,
    type: "text",
    section: "detail_desc",
    order: 8,
  },
  {
    id: "f-doc_attachments",
    key: "doc_attachments",
    label: "Tài liệu đính kèm",
    placeholder: "https://docs.google.com/...",
    helperText: "Đính kèm link Google Docs, Figma hoặc tải trực tiếp file tài liệu / Ctrl+V ảnh chụp",
    enabled: true,
    required: false,
    isCore: false,
    type: "link_upload",
    section: "detail_desc",
    order: 9,
  },

  // SECTION 03: KẾ HOẠCH & THỜI HẠN (RIGHT PANEL)
  {
    id: "f-release_date",
    key: "release_date",
    label: "Ngày release dự kiến",
    placeholder: "Chọn ngày...",
    helperText: "Mốc thời gian dự kiến triển khai thực tế lên môi trường Production",
    enabled: true,
    required: true,
    isCore: true,
    type: "date",
    section: "plan_deadline",
    order: 10,
  },
  {
    id: "f-deadline_reason",
    key: "deadline_reason",
    label: "Lý do thời hạn này quan trọng?",
    placeholder: "Chọn lý do...",
    helperText: "Căn cứ cam kết để UX Squad sắp xếp mức độ ưu tiên xử lý",
    enabled: true,
    required: false,
    isCore: false,
    type: "select",
    section: "plan_deadline",
    order: 11,
  },
  {
    id: "f-leader_report_note",
    key: "leader_report_note",
    label: "Kế hoạch báo cáo sắp tới",
    placeholder: "VD: Báo cáo sếp Mai Anh vào ngày 01/06",
    helperText: "Lịch họp báo cáo định kỳ với Ban Lãnh Đạo hoặc Hội đồng dự án",
    enabled: true,
    required: false,
    isCore: false,
    type: "textarea",
    section: "plan_deadline",
    order: 12,
  },
]

export const DEFAULT_REQUEST_TYPE_OPTIONS: FormOptionItem[] = [
  { id: "opt-rt-1", label: "Tính năng mới", value: "Tính năng mới", description: "Xây dựng tính năng hoàn toàn mới từ đầu", enabled: true },
  { id: "opt-rt-2", label: "Thiết kế lại trải nghiệm", value: "Thiết kế lại trải nghiệm", description: "Redesign luồng hiện có để tăng tỉ lệ chuyển đổi", enabled: true },
  { id: "opt-rt-3", label: "Cải thiện trải nghiệm hiện tại", value: "Cải thiện trải nghiệm hiện tại", description: "Tối ưu hóa vi tương tác và giao diện chi tiết", enabled: true },
  { id: "opt-rt-4", label: "UX Research", value: "UX Research", description: "Nghiên cứu hành vi người dùng và khảo sát thị trường", enabled: true },
  { id: "opt-rt-5", label: "UX Review", value: "UX Review", description: "Đánh giá kiểm toán trải nghiệm trước khi phát hành", enabled: true },
  { id: "opt-rt-6", label: "Khác", value: "Khác", description: "Các đề bài thiết kế chuyên biệt khác", enabled: true },
]

export const DEFAULT_DEADLINE_REASON_OPTIONS: FormOptionItem[] = [
  { id: "opt-dr-1", label: "Ra mắt sản phẩm", value: "Ra mắt sản phẩm", description: "Mốc Golive theo kế hoạch dự án", enabled: true },
  { id: "opt-dr-2", label: "Cam kết kinh doanh", value: "Cam kết kinh doanh", description: "Cam kết chỉ tiêu KPI với Ban Lãnh Đạo", enabled: true },
  { id: "opt-dr-3", label: "Yêu cầu quy định", value: "Yêu cầu quy định", description: "Tuân thủ quy định pháp lý hoặc Ngân hàng Nhà nước", enabled: true },
  { id: "opt-dr-4", label: "Chiến dịch marketing", value: "Chiến dịch marketing", description: "Phục vụ chiến dịch truyền thông quảng bá quy mô lớn", enabled: true },
  { id: "opt-dr-5", label: "Đánh giá nội bộ", value: "Đánh giá nội bộ", description: "Báo cáo nghiệm thu định kỳ nội bộ", enabled: true },
  { id: "opt-dr-6", label: "Khác", value: "Khác", description: "Lý do khẩn cấp hoặc đặc thù khác", enabled: true },
]

export const DEFAULT_FORM_CONFIG: RequestFormConfig = {
  version: 1,
  lastUpdated: "15/09/2026",
  header: {
    parentBreadcrumb: "MBBank UX Platform",
    currentBreadcrumb: "Tạo task mới",
    title: "Gửi yêu cầu thiết kế UX",
    subtitle: "Điền đầy đủ thông tin đề bài để UX Squad tiếp nhận và xử lý nhanh chóng nhất",
  },
  sections: {
    requestInfoTitle: "01 · THÔNG TIN YÊU CẦU",
    detailDescTitle: "02 · MÔ TẢ CHI TIẾT NHU CẦU CẦN UX TEAM HỖ TRỢ",
    attachmentsTitle: "03 · TÀI LIỆU ĐÍNH KÈM",
    planDeadlineTitle: "KẾ HOẠCH & THỜI HẠN",
    submitButtonText: "Gửi yêu cầu UX",
  },
  fields: DEFAULT_FORM_FIELDS,
  options: {
    requestTypes: DEFAULT_REQUEST_TYPE_OPTIONS,
    deadlineReasons: DEFAULT_DEADLINE_REASON_OPTIONS,
  },
  rules: {
    allowScreenshotsPaste: true,
    maxFileSizeMb: 25,
    maxFilesCount: 5,
    requireEstimatedReleaseDate: true,
    autoScrollOnError: true,
  },
}

/**
 * Lấy cấu hình form hiện tại từ localStorage hoặc fallback về mặc định
 */
export function getFormConfig(): RequestFormConfig {
  try {
    const raw = localStorage.getItem(FORM_CONFIG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as RequestFormConfig
      if (parsed && Array.isArray(parsed.fields) && parsed.fields.length > 0) {
        // Merge để đảm bảo không bị thiếu field khi nâng cấp version
        const mergedFields = DEFAULT_FORM_FIELDS.map((df) => {
          const custom = parsed.fields.find((f) => f.key === df.key)
          return custom ? { ...df, ...custom } : df
        })
        return {
          ...DEFAULT_FORM_CONFIG,
          ...parsed,
          header: { ...DEFAULT_FORM_CONFIG.header, ...parsed.header },
          sections: { ...DEFAULT_FORM_CONFIG.sections, ...parsed.sections },
          rules: { ...DEFAULT_FORM_CONFIG.rules, ...parsed.rules },
          fields: mergedFields,
          options: {
            requestTypes: Array.isArray(parsed.options?.requestTypes) && parsed.options.requestTypes.length > 0
              ? parsed.options.requestTypes
              : DEFAULT_REQUEST_TYPE_OPTIONS,
            deadlineReasons: Array.isArray(parsed.options?.deadlineReasons) && parsed.options.deadlineReasons.length > 0
              ? parsed.options.deadlineReasons
              : DEFAULT_DEADLINE_REASON_OPTIONS,
          },
        }
      }
    }
  } catch (err) {
    console.warn("[FormConfig] Error reading config from storage, using defaults:", err)
  }
  return DEFAULT_FORM_CONFIG
}

/**
 * Lưu cấu hình form mới vào localStorage và phát event thông báo toàn hệ thống
 */
export function saveFormConfig(config: RequestFormConfig): void {
  try {
    const updated = {
      ...config,
      lastUpdated: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    }
    localStorage.setItem(FORM_CONFIG_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent(FORM_CONFIG_EVENT_NAME, { detail: updated }))
  } catch (err) {
    console.error("[FormConfig] Failed to save config to storage:", err)
    throw err
  }
}

/**
 * Khôi phục form về thiết lập mặc định của MBBank
 */
export function resetFormConfig(): RequestFormConfig {
  try {
    localStorage.removeItem(FORM_CONFIG_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(FORM_CONFIG_EVENT_NAME, { detail: DEFAULT_FORM_CONFIG }))
  } catch (err) {
    console.error("[FormConfig] Failed to reset config:", err)
  }
  return DEFAULT_FORM_CONFIG
}
