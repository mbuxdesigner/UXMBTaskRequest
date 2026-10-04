/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PII MASKER UTILITY — BẢO VỆ THÔNG TIN NHẠY CẢM TRONG AI CONTEXT
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Cung cấp cơ chế che giấu thông tin cá nhân (PII) hai chiều (Pseudonymization):
 * - Email nhân sự / người yêu cầu (@mbbank.com.vn, @gmail.com...)
 * - Số điện thoại Việt Nam (09x, 08x, 07x, 05x, 03x, 10 số, +84...)
 * - Căn cước công dân / CMND (CCCD 12 số, CMND 9 số)
 * - Mã số nhân viên MBBank (MSNV_xxxxx, NVxxxxx, MBxxxxx...)
 * - Họ và tên nhân sự / Designer được phân công
 * 
 * Hỗ trợ khôi phục (unmaskPii) cho phản hồi LLM và hàm một chiều (sanitizeContextText)
 * dùng để làm sạch ngữ cảnh trước khi gửi ra mô hình AI.
 */

export interface PiiMaskResult {
  maskedText: string
  mapping: Map<string, string>
}

export interface MaskPiiOptions {
  knownNames?: string[]
}

// Danh sách tên cán bộ / designer mặc định trong hệ thống để tự động nhận diện
const DEFAULT_KNOWN_STAFF_NAMES: string[] = [
  "Nguyễn Văn Cường",
  "Lê Hoàng Nam",
  "Trần Mai Lan",
  "Phạm Hoàng Bách",
  "Bạch Phương Hương",
  "Admin MB UX Team",
  "Admin Quản Trị",
]

/**
 * Che giấu toàn diện các loại PII trong văn bản và trả về bản đồ ánh xạ phục vụ hoàn nguyên.
 */
export function maskPii(text: string, options?: MaskPiiOptions): PiiMaskResult {
  if (!text || typeof text !== "string") {
    return { maskedText: text || "", mapping: new Map() }
  }

  let result = text
  const mapping = new Map<string, string>()

  // Lưu trữ các giá trị gốc đã được gán token để tránh gán nhiều token cho cùng 1 giá trị
  const valueToToken = new Map<string, string>()

  let emailIndex = 0
  let phoneIndex = 0
  let idIndex = 0
  let staffIdIndex = 0
  let designerIndex = 0

  const getOrCreateToken = (value: string, prefix: string, getNextIndex: () => number): string => {
    const trimmed = value.trim()
    const existing = valueToToken.get(trimmed.toLowerCase())
    if (existing) {
      return existing
    }
    const nextIdx = getNextIndex()
    const token = `[${prefix}_${nextIdx}]`
    valueToToken.set(trimmed.toLowerCase(), token)
    mapping.set(token, trimmed)
    return token
  }

  // 1. CHE EMAIL: \b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
  result = result.replace(emailRegex, (match) => {
    return getOrCreateToken(match, "EMAIL", () => ++emailIndex)
  })

  // 2. CHE MÃ SỐ NHÂN VIÊN: MSNV_12345, NV12345, MB12345, MNV12345, Mã NV: 12345...
  const staffIdRegex = /\b(?:MSNV[_\s:-]?\d{3,8}|(?:NV|MB|MNV)\d{3,8}|(?:MSNV|MNV|Mã\s*(?:NV|nhân\s*viên)|Staff\s*ID)[:\s]+[A-Za-z0-9_-]{3,10})\b/gi
  result = result.replace(staffIdRegex, (match) => {
    return getOrCreateToken(match, "STAFF_ID", () => ++staffIdIndex)
  })

  // 3. CHE SỐ ĐIỆN THOẠI VIỆT NAM & QUỐC TẾ (10 số di động, đầu 03, 05, 07, 08, 09; hỗ trợ +84, 0084, 84, dấu ngoặc, dấu cách, dấu chấm, gạch ngang)
  // Bảo vệ không che nhầm số tiền lớn qua negative lookahead tiền tệ và lookbehind ký hiệu tiền tệ
  const phoneRegex = /(?<![\$₫])(?:(?:\((?:0[35789]\d{1,2})\)[.\-\s]?(?:[.\-\s]?\d){6,7})|(?:(?:\+84|0084|\(\+84\)|\(0084\)|\(84\)|\b84)[.\-\s]?(?:\(?0\)?\s*)?[35789](?:[.\-\s]?\d){8})|(?:\b0|\(0\))[.\-\s]?[35789](?:[.\-\s]?\d){8})\b(?!\s*(?:VND|VNĐ|đồng|dong|đ(?![a-zA-Zà-ỹÀ-Ỹ])))/gi
  result = result.replace(phoneRegex, (match) => {
    return getOrCreateToken(match, "PHONE", () => ++phoneIndex)
  })

  // 4. CHE CCCD (12 chữ số) VÀ CMND (9 chữ số)
  // 4a. Số định danh có tiền tố ngữ cảnh (CCCD, CMND, Số định danh, Căn cước: 9-12 chữ số; hỗ trợ dấu cách/gạch nối và từ nối 'là')
  const labeledIdRegex = /(?:(?:CCCD|CMND|Số định danh|Định danh|Căn cước|Chứng minh)\s*(?:[:#-]|là)?\s*)((?:\d[.\-\s]?){8,11}\d)\b/gi
  result = result.replace(labeledIdRegex, (fullMatch, numGroup) => {
    const token = getOrCreateToken(numGroup, "ID", () => ++idIndex)
    return fullMatch.replace(numGroup, token)
  })

  // 4b. CCCD 12 chữ số đứng độc lập (bảo vệ không che nhầm số tiền hạn mức/ngân sách lớn)
  const cccd12Regex = /(?<![\$₫])\b(?<!\d)\d{12}(?!\d)(?!\s*(?:VND|VNĐ|đồng|dong|đ(?![a-zA-Zà-ỹÀ-Ỹ])))\b/gi
  result = result.replace(cccd12Regex, (match) => {
    return getOrCreateToken(match, "ID", () => ++idIndex)
  })

  // 4c. CMND 9 chữ số đứng độc lập (không đi liền sau ký hiệu tiền tệ hoặc trước đơn vị tiền tệ; tránh chặn nhầm các từ tiếng Việt bắt đầu bằng 'đ' như được, đã, để)
  const cmnd9Regex = /(?<![\$₫])\b(?<!\d)\d{9}(?!\d)(?!\s*(?:VND|VNĐ|đồng|dong|đ(?![a-zA-Zà-ỹÀ-Ỹ])))\b/gi
  result = result.replace(cmnd9Regex, (match) => {
    // Tránh che nhầm các số đã được tokenize
    if (match.startsWith("[") || match.endsWith("]")) return match
    return getOrCreateToken(match, "ID", () => ++idIndex)
  })

  // 5. CHE HỌ TÊN CÁN BỘ / DESIGNER PHÂN CÔNG TRONG TASK
  // 5a. Nhận diện theo danh sách tên đã biết (options.knownNames hoặc DEFAULT_KNOWN_STAFF_NAMES)
  const allKnownNames = Array.from(
    new Set([...(options?.knownNames || []), ...DEFAULT_KNOWN_STAFF_NAMES])
  ).filter((n) => n && n.trim().length >= 3)

  // Sắp xếp theo độ dài giảm dần để khớp tên dài nhất trước
  allKnownNames.sort((a, b) => b.length - a.length)

  for (const name of allKnownNames) {
    if (result.includes(name)) {
      const token = getOrCreateToken(name, "DESIGNER", () => ++designerIndex)
      result = result.split(name).join(token)
    }
  }

  // 5b. Nhận diện theo ngữ cảnh phân công nhiệm vụ: "Designer: Nguyễn Văn Cường", "Người phụ trách: Lê Hoàng Nam"...
  const labeledDesignerRegex = /(?:Designer|Người phụ trách|Assignee|Phân công|Giao cho|UX Owner|Design Owner|PO|Cán bộ|Nhân sự|Người dùng)[:\s]+([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,4})\b/g
  result = result.replace(labeledDesignerRegex, (fullMatch, nameGroup) => {
    if (nameGroup.startsWith("[") && nameGroup.endsWith("]")) return fullMatch
    const token = getOrCreateToken(nameGroup, "DESIGNER", () => ++designerIndex)
    return fullMatch.replace(nameGroup, token)
  })

  return {
    maskedText: result,
    mapping,
  }
}

/**
 * Khôi phục lại dữ liệu gốc từ văn bản đã che và bảng mapping token -> giá trị gốc.
 */
export function unmaskPii(text: string, mapping: Map<string, string>): string {
  if (!text || !mapping || mapping.size === 0) {
    return text || ""
  }

  let result = text

  // Sắp xếp các placeholder token theo chiều dài giảm dần để tránh thay thế chéo (ví dụ [EMAIL_10] trước [EMAIL_1])
  const sortedTokens = Array.from(mapping.keys()).sort((a, b) => b.length - a.length)

  for (const token of sortedTokens) {
    const originalValue = mapping.get(token)
    if (originalValue !== undefined) {
      result = result.split(token).join(originalValue)
    }
  }

  return result
}

/**
 * Làm sạch ngữ cảnh một chiều an toàn để nhúng vào Prompt gửi cho LLM.
 * Che toàn bộ email, SĐT, CCCD/CMND, MSNV và tên nhân sự.
 */
export function sanitizeContextText(text: string, options?: MaskPiiOptions): string {
  if (!text || typeof text !== "string") {
    return text || ""
  }
  return maskPii(text, options).maskedText
}
