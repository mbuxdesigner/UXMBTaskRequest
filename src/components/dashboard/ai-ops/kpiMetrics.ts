import type { UXRequest } from "../../../data/mockData"
import { getRequestPendingClassification } from "../../../config/statusConfig.ts"
import { getSystemConfig } from "../../../config/systemConfig.ts"

/**
 * Danh sách tài khoản Designer chuẩn mặc định khi danh bạ local rỗng.
 */
export const DEFAULT_KPI_DESIGNERS = [
  "Hoàng Thu Trang",
  "Nguyễn Văn Cường",
  "Trần Mai Lan",
  "Vũ Quốc Anh",
  "Nguyễn Minh Tuấn",
  "Lê Hải Nam",
]

/**
 * Helper chuyển đổi an toàn mọi giá trị sang chuỗi đã trim, chống lỗi .trim() trên number/object.
 */
export function toSafeString(val: unknown): string {
  if (val === null || val === undefined) return ""
  if (typeof val === "string") return val.trim()
  if (typeof val === "number" && !isNaN(val)) return String(val)
  return ""
}

/**
 * Kiểm tra xem một phần tử trong danh sách yêu cầu có phải là task hợp lệ hay không.
 * Loại bỏ null, undefined, primitive, và các stub object rỗng không có id, title, hay status.
 */
export function isValidTask(req: unknown): req is UXRequest {
  if (!req || typeof req !== "object") return false
  const r = req as Record<string, unknown>
  return Boolean(
    r.id ||
      r.request_id ||
      r.title ||
      r.status ||
      r.squad ||
      r.assigned_designer ||
      r.ux_owner ||
      r.design_owner
  )
}

/**
 * Chuẩn hóa và chuyển đổi mọi định dạng chuỗi ngày tháng sang milliseconds.
 * Hỗ trợ định dạng:
 * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY kèm giờ phút giây tùy chọn
 * - DD/MM, DD-MM, DD.MM (mặc định năm theo nowMs)
 * - YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
 * - ISO-8601 với Timezone (Z, +HH:MM, -HH:MM)
 * - Timestamp dạng số hoặc chuỗi chữ số (epoch ms / seconds)
 * - Số serial ngày Excel (35000 đến 65000)
 * - Chuỗi ngôn ngữ tự nhiên: "hôm nay", "ngày mai", "hôm qua", "cuối tuần này", "tuần sau", "cuối tháng này"
 * - Trích xuất ngày từ chuỗi có tiền tố/hậu tố: "Ngày 15/09/2026", "Dự kiến: 20-09-2026", "20/09/2026 (dự kiến)"
 * Trả về 0 nếu chuỗi rỗng, không hợp lệ, ngày phi thực tế (ví dụ 31/02) hoặc các mô tả không xác định (ví dụ "sau khi release", "TBD").
 */
export function parseDateMs(
  dateStr?: string | number | null,
  nowMs: number = Date.now()
): number {
  if (dateStr === null || dateStr === undefined) return 0

  // 1. Dạng số thuần túy
  if (typeof dateStr === "number") {
    if (isNaN(dateStr) || dateStr <= 0) return 0
    // Excel date serial number (khoảng năm 1995 đến 2078)
    if (dateStr >= 35000 && dateStr <= 65000) {
      const ms = Math.round((dateStr - 25569) * 86400 * 1000)
      return !isNaN(ms) && ms > 0 ? ms : 0
    }
    // Unix timestamp in seconds (10 chữ số)
    if (dateStr >= 1e9 && dateStr < 1e11) {
      return dateStr * 1000
    }
    // Epoch milliseconds
    return dateStr
  }

  if (typeof dateStr !== "string") return 0
  const trimmed = dateStr.trim()
  if (!trimmed) return 0

  // 2. Chuỗi số Excel serial (5 chữ số)
  if (/^\d{5}$/.test(trimmed)) {
    const num = parseInt(trimmed, 10)
    if (num >= 35000 && num <= 65000) {
      const ms = Math.round((num - 25569) * 86400 * 1000)
      return !isNaN(ms) && ms > 0 ? ms : 0
    }
  }

  // 3. Timestamp dạng chuỗi chữ số nguyên (10 đến 14 ký tự số)
  if (/^\d{10,14}$/.test(trimmed)) {
    const num = parseInt(trimmed, 10)
    return trimmed.length === 10 ? num * 1000 : num
  }

  const lower = trimmed.toLowerCase()
  const baseDate = new Date(nowMs)

  // 4. Các biểu thức thời gian tự nhiên tiếng Việt & tiếng Anh
  if (lower === "hôm nay" || lower === "hom nay" || lower === "today") {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 59, 59, 999)
    return d.getTime()
  }
  if (lower === "ngày mai" || lower === "ngay mai" || lower === "tomorrow") {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1, 23, 59, 59, 999)
    return d.getTime()
  }
  if (lower === "hôm qua" || lower === "hom qua" || lower === "yesterday") {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - 1, 23, 59, 59, 999)
    return d.getTime()
  }
  if (lower.includes("cuối tuần") || lower.includes("cuoi tuan") || lower === "end of week") {
    const dayOfWeek = baseDate.getDay() // 0 là Chủ nhật
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + daysUntilSunday, 23, 59, 59, 999)
    return d.getTime()
  }
  if (lower.includes("tuần sau") || lower.includes("tuan sau") || lower === "next week") {
    const dayOfWeek = baseDate.getDay()
    const daysUntilNextMon = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + daysUntilNextMon, 23, 59, 59, 999)
    return d.getTime()
  }
  if (lower.includes("cuối tháng") || lower.includes("cuoi thang") || lower === "end of month") {
    const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999)
    return lastDay.getTime()
  }

  // 5. ISO-8601 với Timezone (Z, +HH:MM, -HH:MM) hoặc có T chia tách giờ
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/i.test(trimmed)) {
    const parsed = Date.parse(trimmed)
    if (!isNaN(parsed)) return parsed
  }

  // 6. DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (cho phép nằm trong chuỗi như "Ngày 15/09/2026", "Dự kiến: 20-09-2026", "10/09/2026 - 20/09/2026")
  const dmyMatches = Array.from(
    trimmed.matchAll(
      /(?:^|[^\d])(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?(?:$|[^\d])/g
    )
  )
  if (dmyMatches.length > 0) {
    // Duyệt từ match cuối cùng ngược lên để ưu tiên mốc deadline chốt/cuối cùng nếu chuỗi chứa khoảng thời gian
    for (let i = dmyMatches.length - 1; i >= 0; i--) {
      const dmyMatch = dmyMatches[i]
      const day = parseInt(dmyMatch[1], 10)
      const month = parseInt(dmyMatch[2], 10) - 1
      let year = parseInt(dmyMatch[3], 10)
      if (year < 100) year += 2000
      const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0
      const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0
      const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0

      const d = new Date(year, month, day, hour, minute, second)
      // Kiểm tra tính hợp lệ chặt chẽ (chống tràn ngày như 31/02 -> 03/03)
      if (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d.getDate() === day
      ) {
        return d.getTime()
      }
    }
  }

  // 7. YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD kèm giờ:phút:giây
  const ymdMatches = Array.from(
    trimmed.matchAll(
      /(?:^|[^\d])(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})(?:[\sT](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?(?:$|[^\d])/g
    )
  )
  if (ymdMatches.length > 0) {
    for (let i = ymdMatches.length - 1; i >= 0; i--) {
      const ymdMatch = ymdMatches[i]
      const year = parseInt(ymdMatch[1], 10)
      const month = parseInt(ymdMatch[2], 10) - 1
      const day = parseInt(ymdMatch[3], 10)
      const hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0
      const minute = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0
      const second = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0

      const d = new Date(year, month, day, hour, minute, second)
      if (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d.getDate() === day
      ) {
        return d.getTime()
      }
    }
  }

  // 8. DD/MM không kèm năm (ví dụ: "15/09", "20.09" - mặc định năm theo baseDate)
  const dmMatches = Array.from(
    trimmed.matchAll(/(?:^|[^\d])(\d{1,2})[\/\.-](\d{1,2})(?:$|[^\d])/g)
  )
  if (dmMatches.length > 0) {
    for (let i = dmMatches.length - 1; i >= 0; i--) {
      const dmMatch = dmMatches[i]
      const day = parseInt(dmMatch[1], 10)
      const month = parseInt(dmMatch[2], 10) - 1
      const year = baseDate.getFullYear()
      const d = new Date(year, month, day, 23, 59, 59, 999)
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return d.getTime()
      }
    }
  }

  // 9. Fallback chuẩn JS Date.parse nếu hợp lệ và là ngày dương
  const parsed = Date.parse(trimmed)
  return !isNaN(parsed) && parsed > 0 ? parsed : 0
}

/**
 * Trích xuất tên Designer phụ trách bài toán từ các trường assigned_designer,
 * design_owner, hoặc ux_owner, loại bỏ các giá trị placeholder và kiểm tra thứ tự ưu tiên.
 */
export function resolveTaskDesigner(req?: UXRequest | null): string {
  if (!req || typeof req !== "object") return ""

  const isPlaceholder = (val?: unknown) => {
    if (val === null || val === undefined) return true
    const t = typeof val === "string" ? val.trim() : typeof val === "number" ? String(val) : ""
    if (!t) return true
    const lower = t.toLowerCase()
    return (
      lower === "chưa phân công" ||
      lower === "unassigned" ||
      lower === "đang phân công" ||
      lower === "chưa gán" ||
      lower === "chưa gán designer" ||
      lower === "chưa phân công designer" ||
      lower === "none" ||
      lower === "n/a" ||
      lower === "null" ||
      lower === "undefined"
    )
  }

  if (!isPlaceholder(req.assigned_designer)) return toSafeString(req.assigned_designer)
  if (!isPlaceholder(req.design_owner)) return toSafeString(req.design_owner)
  if (!isPlaceholder(req.ux_owner)) return toSafeString(req.ux_owner)
  return ""
}

/**
 * Trích xuất danh sách tất cả Designer thực tế phụ trách bài toán:
 * - Hỗ trợ phân tách nếu có nhiều designer (phẩy, chấm phẩy, gạch chéo)
 * - Tự động loại bỏ các placeholder ("Chưa phân công", "Chưa gán", v.v.)
 */
export function extractTaskDesigners(req?: UXRequest | null): string[] {
  if (!req || typeof req !== "object") return []

  const isPlaceholder = (val?: unknown) => {
    if (val === null || val === undefined) return true
    const t = typeof val === "string" ? val.trim() : typeof val === "number" ? String(val) : ""
    if (!t) return true
    const lower = t.toLowerCase()
    return (
      lower === "chưa phân công" ||
      lower === "unassigned" ||
      lower === "đang phân công" ||
      lower === "chưa gán" ||
      lower === "chưa gán designer" ||
      lower === "chưa phân công designer" ||
      lower === "admin quản trị" ||
      lower === "admin" ||
      lower === "none" ||
      lower === "n/a" ||
      lower === "null" ||
      lower === "undefined"
    )
  }

  const rawCandidates: string[] = []
  if (!isPlaceholder(req.assigned_designer)) rawCandidates.push(toSafeString(req.assigned_designer))
  if (!isPlaceholder(req.ux_owner)) rawCandidates.push(toSafeString(req.ux_owner))
  if (!isPlaceholder(req.design_owner)) rawCandidates.push(toSafeString(req.design_owner))

  const results: string[] = []
  rawCandidates.forEach((raw) => {
    const parts = raw.split(/[,;\n/]+/).map((s) => s.trim()).filter(Boolean)
    parts.forEach((p) => {
      const clean = p.replace(/\(.*?\)/g, "").trim()
      if (clean && !isPlaceholder(clean) && !results.some((r) => r.toLowerCase() === clean.toLowerCase())) {
        results.push(clean)
      }
    })
  })

  return results
}

/**
 * Xác định chính xác ngày hoàn thành/bàn giao của bài toán theo thứ tự ưu tiên:
 * 1. release_date
 * 2. completionDate của Phase "Bàn giao" hoặc phase có status === "completed"
 * 3. timestamp của cập nhật hoàn thành / bàn giao trong task_updates
 * 4. latest_update.date
 * 5. last_updated
 * 6. expected_deadline (fallback cuối cùng)
 */
export function getTaskCompletionDate(req?: UXRequest | null): string {
  if (!req || typeof req !== "object") return ""

  const release = toSafeString(req.release_date)
  if (release) return release

  if (Array.isArray(req.phases)) {
    // Ưu tiên 1: Khâu "Bàn giao" hoặc khâu bàn giao release
    const banGiaoPhase = req.phases.find(
      (p) =>
        p &&
        typeof p === "object" &&
        (p.name === "Bàn giao" ||
          p.name?.toLowerCase().includes("bàn giao") ||
          p.name?.toLowerCase().includes("release")) &&
        p.completionDate
    )
    if (banGiaoPhase) {
      const comp = toSafeString(banGiaoPhase.completionDate)
      if (comp) return comp
    }

    // Ưu tiên 2: Khâu hoàn thành cuối cùng theo thứ tự các phase (thay vì khâu đầu tiên)
    const completedPhases = req.phases.filter(
      (p) =>
        p &&
        typeof p === "object" &&
        p.status === "completed" &&
        p.completionDate
    )
    if (completedPhases.length > 0) {
      const lastCompleted = completedPhases[completedPhases.length - 1]
      const comp = toSafeString(lastCompleted.completionDate)
      if (comp) return comp
    }
  }

  if (Array.isArray(req.task_updates) && req.task_updates.length > 0) {
    const sorted = [...req.task_updates].reverse()
    const hit = sorted.find((u) => {
      if (!u || typeof u !== "object" || !u.timestamp) return false
      const np = toSafeString(u.new_phase).toLowerCase()
      return (
        np.includes("bàn giao") ||
        np.includes("hoàn thành") ||
        np.includes("nghiệm thu") ||
        u.new_progress === 100
      )
    })
    if (hit) {
      const ts = toSafeString(hit.timestamp)
      if (ts) return ts
    }
  }

  if (req.latest_update && typeof req.latest_update === "object") {
    const luDate = toSafeString((req.latest_update as any).date)
    if (luDate) return luDate
  }

  const lastUpdated = toSafeString(req.last_updated)
  if (lastUpdated) return lastUpdated

  return toSafeString(req.expected_deadline)
}

/**
 * Kiểm tra xem một bài toán đã hoàn thành hay chưa.
 * - Loại bỏ các bài toán đang chờ/tạm dừng/bị chặn (chờ PO duyệt, chờ nghiệm thu...).
 */
export function isCompletedTask(req?: UXRequest | null): boolean {
  if (!req || typeof req !== "object") return false
  const s = toSafeString(req.status).toLowerCase()
  const p =
    typeof req.progress === "number"
      ? req.progress
      : parseInt(String(req.progress || 0), 10) || 0

  // Nếu bài toán có trạng thái đang chờ xử lý, tạm dừng, bị chặn thì tuyệt đối chưa hoàn thành
  if (
    s.includes("chờ") ||
    s.includes("cho ") ||
    s.includes("tạm dừng") ||
    s.includes("tam dung") ||
    s.includes("bị chặn") ||
    s.includes("bi chan") ||
    s.includes("pending")
  ) {
    return false
  }

  return (
    s === "hoàn thành" ||
    s === "hoành thành" ||
    s === "done" ||
    s.includes("bàn giao") ||
    s.includes("release") ||
    s.includes("nghiệm thu") ||
    p >= 100
  )
}

/**
 * Kiểm tra xem một bài toán có thuộc nhóm Backlog hoặc Pending hay không.
 * Đảm bảo phân vùng độc quyền với InProgress (không bao giờ trùng lặp).
 */
export function isBacklogOrPendingTask(req?: UXRequest | null): boolean {
  if (!req || typeof req !== "object" || isCompletedTask(req)) return false

  const cls = getRequestPendingClassification(req)
  if (cls.isPending) return true

  const s = toSafeString(req.status).toLowerCase()
  return (
    s.includes("chờ") ||
    s.includes("cho ") ||
    s.includes("mới tạo") ||
    s.includes("đã gửi yêu cầu") ||
    s.includes("đã gửi") ||
    s.includes("po pending") ||
    s.includes("pending") ||
    s.includes("tạm dừng") ||
    s.includes("tam dung") ||
    s.includes("bị chặn") ||
    s.includes("bi chan")
  )
}

/**
 * Kiểm tra xem một bài toán có đang trong quá trình thực hiện hay không:
 * - Không phải bài toán đã hoàn thành
 * - Không thuộc nhóm pending (PO pending / Designer pending)
 * - Không thuộc nhóm chờ tiếp nhận ban đầu / mới tạo / tạm dừng / bị chặn
 */
export function isInProgressTask(req?: UXRequest | null): boolean {
  if (!isValidTask(req)) return false
  if (isCompletedTask(req)) return false
  if (isBacklogOrPendingTask(req)) return false

  // Bài toán đang được chủ động triển khai
  return true
}

/**
 * Helper thêm tên Designer vào bảng ánh xạ chuẩn hóa, chống trùng lặp do khác biệt chữ hoa/thường.
 */
function addCanonicalDesigner(map: Map<string, string>, nameCandidate: unknown): void {
  const name = toSafeString(nameCandidate)
  if (!name) return
  const lower = name.toLowerCase()
  if (
    lower === "admin quản trị" ||
    lower === "chưa phân công" ||
    lower === "unassigned" ||
    lower === "đang phân công" ||
    lower === "chưa gán" ||
    lower === "none" ||
    lower === "n/a"
  ) {
    return
  }
  if (!map.has(lower)) {
    map.set(lower, name)
  }
}

/**
 * Lấy danh sách Designer thực tế từ localStorage hoặc danh bạ dự phòng.
 * Khử trùng lặp an toàn không phân biệt hoa thường (case-insensitive).
 */
/**
 * Lấy danh sách Designer thực tế từ localStorage hoặc danh bạ dự phòng.
 * Khử trùng lặp an toàn không phân biệt hoa thường (case-insensitive).
 * Nếu selectedProduct được chỉ định (và khác "all"), chỉ tính các designer phụ trách
 * sản phẩm đó hoặc các Squad thuộc sản phẩm đó, hoặc được phân công task thuộc sản phẩm đó.
 */
export function getRegisteredDesigners(
  customDesigners?: string[],
  requests: UXRequest[] = [],
  selectedProduct?: string
): string[] {
  const designerMap = new Map<string, string>()

  if (customDesigners !== undefined) {
    customDesigners.forEach((d) => addCanonicalDesigner(designerMap, d))
    return Array.from(designerMap.values())
  }

  const isAll = !selectedProduct || selectedProduct === "all"
  const normTarget = isAll ? "" : selectedProduct.toLowerCase().replace(/[^a-z0-9]/g, "")

  const getRootKey = (name: string) => {
    const n = name.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (n.includes("appmb") || n.includes("mbapp")) return "appmb"
    if (n.includes("digi") || n.includes("invest")) return "digi"
    if (n.includes("baas")) return "baas"
    if (n.includes("biz")) return "biz"
    if (n.includes("web")) return "web"
    return n
  }

  const targetRoot = normTarget ? getRootKey(normTarget) : ""

  const isProductMatch = (prodCandidate: string) => {
    if (isAll) return true
    if (!prodCandidate) return false
    const candNorm = prodCandidate.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (candNorm === normTarget || candNorm.includes(normTarget) || normTarget.includes(candNorm)) return true
    const candRoot = getRootKey(candNorm)
    return candRoot === targetRoot && candRoot !== ""
  }

  // Thu thập các squad thuộc product
  const matchingSquadNames = new Set<string>()

  // 1. Quét từ localStorage (nếu môi trường có window)
  if (typeof window !== "undefined") {
    try {
      const rawSquads = localStorage.getItem("mbbank_admin_squads")
      if (rawSquads) {
        const squadList = JSON.parse(rawSquads)
        if (Array.isArray(squadList)) {
          squadList.forEach((sq: any) => {
            if (sq && typeof sq === "object") {
              const sqName = String(sq.name || sq.squad_name || "").trim()
              const sqProd = String(sq.productName || sq.product_name || sq.domain || "").trim()
              const sqProds = Array.isArray(sq.products) ? sq.products : []

              const matchesSquad =
                isAll ||
                isProductMatch(sqProd) ||
                sqProds.some((p: any) => isProductMatch(String(p))) ||
                isProductMatch(sqName)

              if (matchesSquad) {
                if (sqName) matchingSquadNames.add(sqName.toLowerCase())
                if (Array.isArray(sq.designers)) {
                  sq.designers.forEach((d: any) => addCanonicalDesigner(designerMap, d))
                }
                if (sq.leadDesigner) {
                  addCanonicalDesigner(designerMap, sq.leadDesigner)
                }
              }
            }
          })
        }
      }
    } catch {}

    try {
      const keys = ["mbbank_admin_team", "mbbank_team_members"]
      for (const k of keys) {
        const raw = localStorage.getItem(k)
        if (raw) {
          const list = JSON.parse(raw)
          if (Array.isArray(list)) {
            list.forEach((m: any) => {
              if (m && typeof m === "object") {
                const role = String(m.role || "").toLowerCase()
                const isDesignerRole = !role || role.includes("designer") || role.includes("design owner")
                if (isDesignerRole) {
                  const name = String(m.name || m.displayName || (m.email ? m.email.split("@")[0] : "")).trim()
                  if (!name) return

                  if (isAll) {
                    addCanonicalDesigner(designerMap, name)
                  } else {
                    const mProds: string[] = Array.isArray(m.products) ? m.products : m.product ? [m.product] : []
                    const mSquads: string[] = Array.isArray(m.squads) ? m.squads : m.squad ? [m.squad] : []

                    const prodMatches = mProds.some((p) => isProductMatch(p))
                    const squadMatches = mSquads.some((s) => {
                      const sLower = String(s).toLowerCase().trim()
                      return matchingSquadNames.has(sLower) || isProductMatch(sLower)
                    })

                    if (prodMatches || squadMatches) {
                      addCanonicalDesigner(designerMap, name)
                    }
                  }
                }
              }
            })
          }
        }
      }
    } catch {}
  }

  // 2. Quét thêm từ requests
  const safeReqs = Array.isArray(requests) ? requests : []
  safeReqs.forEach((r) => {
    if (r && typeof r === "object") {
      const rProd = String(r.product || "").trim()
      const rSquad = String(r.squad_name || r.squad || "").trim()
      const matchesReq =
        isAll ||
        isProductMatch(rProd) ||
        isProductMatch(rSquad) ||
        matchingSquadNames.has(rSquad.toLowerCase())

      if (matchesReq) {
        const designer = resolveTaskDesigner(r)
        if (designer) {
          addCanonicalDesigner(designerMap, designer)
        }
      }
    }
  })

  // 3. Nếu là xem "Tất cả" và vẫn rỗng, fallback về danh bạ mặc định
  if (isAll && designerMap.size === 0) {
    DEFAULT_KPI_DESIGNERS.forEach((d) => addCanonicalDesigner(designerMap, d))
  }

  return Array.from(designerMap.values())
}

// =========================================================================
// THẺ 2: WORKLOAD / CAPACITY
// =========================================================================

export interface WorkloadCapacityStats {
  inProgressCount: number
  totalDesigners: number
  workloadRatio: number // X.X task/designer
  capacityPercent: number // % tải trọng dựa trên định mức 2 task/người
  readyDesigners: number // Designer sẵn sàng nhận việc (0 task đang chạy)
  activeDesigners: number // Designer đang có task
  activeSquads: number // Số Squad có task đang triển khai
  badgeText: "Cân bằng" | "Tải cao" | "Quá tải"
  badgeVariant: "emerald" | "amber" | "rose"
  designerWorkloads: Record<string, number>
}

/**
 * Tính toán tỷ lệ tải trọng & sức chứa đội ngũ (R1).
 * - CHỈ TÍNH SỐ LƯỢNG DESIGNER ĐANG THỰC HIỆN TASK và TỔNG SỐ TASK (không fill toàn bộ danh bạ).
 * - Định mức chuẩn: 2.0 task/designer.
 * - Cân bằng: <= 2.0 task/designer
 * - Tải cao: > 2.0 đến 2.8 task/designer
 * - Quá tải: > 2.8 task/designer
 * - Zero-safe: Tránh chia cho 0 khi chưa có nhân sự hoặc danh bạ rỗng.
 */
export function calculateWorkloadCapacity(
  requests: UXRequest[] = [],
  customDesigners?: string[],
  selectedProduct?: string
): WorkloadCapacityStats {
  const safeReqs = Array.isArray(requests) ? requests.filter(isValidTask) : []
  const inProgressTasks = safeReqs.filter(isInProgressTask)
  const inProgressCount = inProgressTasks.length

  const designerWorkloads: Record<string, number> = {}
  const activeDesignerMap = new Map<string, string>() // lower -> canonical
  const squadSet = new Set<string>()

  inProgressTasks.forEach((r) => {
    let sName = ""
    if (typeof r.squad === "string") sName = r.squad.trim()
    else if (typeof r.squad_name === "string") sName = r.squad_name.trim()
    else if (typeof r.product === "string") sName = r.product.trim()
    else if (r.squad && typeof r.squad === "object") sName = String((r.squad as any).name || "").trim()

    if (sName) {
      squadSet.add(sName)
    }

    const taskDesigners = extractTaskDesigners(r)
    taskDesigners.forEach((d) => {
      const lower = d.toLowerCase()
      if (!activeDesignerMap.has(lower)) {
        activeDesignerMap.set(lower, d)
      }
      const canonical = activeDesignerMap.get(lower)!
      designerWorkloads[canonical] = (designerWorkloads[canonical] || 0) + 1
    })
  })

  // Chỉ tính số lượng designer thực tế đang có task đang thực hiện
  const activeDesignersCount = activeDesignerMap.size
  const activeSquads = squadSet.size > 0 ? squadSet.size : inProgressCount > 0 ? 1 : 0

  const sysConfig = getSystemConfig()
  const designerCapacity = sysConfig.capacity?.defaultDesignerCapacity ?? 2
  const highThreshold = sysConfig.capacity?.workloadHighThreshold ?? 2.0
  const overloadThreshold = sysConfig.capacity?.workloadOverloadThreshold ?? 2.8

  let workloadRatio = 0
  let capacityPercent = 0
  let badgeText: "Cân bằng" | "Tải cao" | "Quá tải" = "Cân bằng"
  let badgeVariant: "emerald" | "amber" | "rose" = "emerald"

  if (activeDesignersCount > 0) {
    workloadRatio = Number((inProgressCount / activeDesignersCount).toFixed(1))
    capacityPercent = Math.round((inProgressCount / (activeDesignersCount * designerCapacity)) * 100)
    if (workloadRatio > overloadThreshold) {
      badgeText = "Quá tải"
      badgeVariant = "rose"
    } else if (workloadRatio > highThreshold) {
      badgeText = "Tải cao"
      badgeVariant = "amber"
    } else {
      badgeText = "Cân bằng"
      badgeVariant = "emerald"
    }
  } else if (inProgressCount > 0) {
    // Có task đang chạy nhưng chưa phân công designer cụ thể
    workloadRatio = 0
    capacityPercent = 0
    badgeText = "Cân bằng"
    badgeVariant = "emerald"
  }

  return {
    inProgressCount,
    totalDesigners: activeDesignersCount, // Chỉ tính số lượng designer đang thực hiện task
    workloadRatio: Number.isFinite(workloadRatio) ? workloadRatio : 0,
    capacityPercent: Number.isFinite(capacityPercent) ? capacityPercent : 0,
    readyDesigners: 0,
    activeDesigners: activeDesignersCount,
    activeSquads,
    badgeText,
    badgeVariant,
    designerWorkloads,
  }
}

// =========================================================================
// THẺ 3: ON-TIME DELIVERY RATE
// =========================================================================

export interface OnTimeDeliveryStats {
  onTimeRate: number // % đúng hạn (ví dụ: 96.4 hoặc 100)
  onTimeCount: number
  delayedCount: number
  totalEvaluated: number
  badgeText: "Đúng cam kết" | "Cảnh báo trễ hạn"
  badgeVariant: "emerald" | "amber" | "rose"
  completedOnTimeCount: number
  inProgressOnTimeCount: number
  delayedItems: DelayedDesignDeliveryItem[]
  missingDeadlineCount: number
  missingDeadlineItems: MissingDesignDeadlineItem[]
}

export interface DelayedDesignDeliveryItem {
  requestId: string
  title: string
  designer: string
  phase: DesignDeliveryPhase
  deadlineMs: number
  transitionedAtMs?: number
  currentStatus: string
}

export interface MissingDesignDeadlineItem {
  requestId: string
  title: string
  designer: string
  phase: DesignDeliveryPhase
  currentStatus: string
}

/**
 * Kiểm tra xem một bài toán có hoàn thành hoặc đang thực hiện đúng hạn hay không:
 * - Đã hoàn thành: Hoàn thành trước hoặc đúng ngày deadline (tính đến hết ngày 23:59:59).
 * - Đang chạy: Ngày hiện tại chưa vượt quá deadline.
 * - Không có expected_deadline: Mặc định coi như đúng cam kết (không có vi phạm deadline).
 */
export function isTaskOnTime(req?: UXRequest | null, nowMs: number = Date.now()): boolean {
  if (!req || typeof req !== "object") {
    return true
  }

  const deadlineStr = toSafeString(req.expected_deadline)
  if (!deadlineStr) {
    return true
  }

  const deadlineMs = parseDateMs(deadlineStr, nowMs)
  if (!deadlineMs) {
    return true
  }

  // Cho phép tính đến hết ngày deadline (23:59:59.999)
  const deadlineDate = new Date(deadlineMs)
  deadlineDate.setHours(23, 59, 59, 999)
  const endOfDayMs = deadlineDate.getTime()

  if (isCompletedTask(req)) {
    const compDateStr = getTaskCompletionDate(req)
    const compMs = parseDateMs(compDateStr, nowMs)
    if (compMs > 0) {
      return compMs <= endOfDayMs
    }
    return true
  }

  // Đang thực hiện hoặc chờ xử lý: đối chiếu với thời điểm hiện tại
  return nowMs <= endOfDayMs
}

type DesignDeliveryPhase = "wireframe" | "ui-design" | "design"

interface DesignDeliveryCommitment {
  phase: DesignDeliveryPhase
  deadlineMs: number
  deliveredAtMs?: number
}

function normalizeMetricText(value: unknown): string {
  return toSafeString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
}

function getDesignDeliveryPhase(value: unknown): DesignDeliveryPhase | null {
  const phase = normalizeMetricText(value)
  if (!phase) return null
  if (phase.includes("wireframe") || /^3(?:\.|\s|$)/.test(phase)) return "wireframe"
  if (phase.includes("ui design") || phase.includes("ui-design") || /^4(?:\.|\s|$)/.test(phase)) return "ui-design"
  return null
}

function toEndOfDayMs(value: unknown, nowMs: number): number {
  const parsed = parseDateMs(toSafeString(value), nowMs)
  if (!parsed) return 0
  const date = new Date(parsed)
  date.setHours(23, 59, 59, 999)
  return date.getTime()
}

function isExcludedKpiStatus(value: unknown): boolean {
  const status = normalizeMetricText(value)
  return (
    status === "pending" ||
    status === "po pending" ||
    status === "pending po" ||
    status === "tam dung" ||
    status === "da dung" ||
    status === "freeze" ||
    status === "frozen" ||
    status === "stopped" ||
    status === "tu choi" ||
    status === "rejected" ||
    status === "hoan thanh" ||
    status === "da hoan thanh" ||
    status === "complete" ||
    status === "completed" ||
    status === "done"
  )
}

function isExcludedOnTimeDeliveryTask(request: UXRequest): boolean {
  if (isCompletedTask(request)) return true

  const currentPhase = normalizeMetricText(request.current_phase)
  if (
    currentPhase === "hoan thanh" ||
    currentPhase === "ban giao" ||
    /^7(?:\.|\s|$)/.test(currentPhase)
  ) {
    return true
  }

  return isExcludedKpiStatus(request.status)
}

function isWorkflowTransition(
  update: NonNullable<UXRequest["task_updates"]>[number],
  fallbackPreviousPhase: string
): boolean {
  if (update.is_comment) return false

  const previousStatus = normalizeMetricText(update.previous_status)
  const nextStatus = normalizeMetricText(update.new_status)
  if (previousStatus && nextStatus && previousStatus !== nextStatus) return true

  const previousPhase = normalizeMetricText(update.previous_phase || fallbackPreviousPhase)
  const nextPhase = normalizeMetricText(update.new_phase)
  if (previousPhase && nextPhase && previousPhase !== nextPhase) return true

  // Compatibility for old logs created before previous/new status were stored.
  const note = normalizeMetricText(update.note)
  return (
    note.includes("[gui po]") ||
    note.includes("da gui phuong an thiet ke cho po") ||
    note.includes("/sentopo")
  )
}

function getDeadlineChangeFromUpdate(
  update: NonNullable<UXRequest["task_updates"]>[number],
  nowMs: number
): { phase: DesignDeliveryPhase; deadlineMs: number } | null {
  const note = normalizeMetricText(update.note)
  const phase = note.includes("ngay gui wireframe")
    ? "wireframe"
    : note.includes("ngay gui ui")
      ? "ui-design"
      : null

  if (!phase) return null
  if (note.includes("go bo")) return { phase, deadlineMs: 0 }

  const deadlineMatch = toSafeString(update.note).match(
    /(?:sang|thành|thanh)\s*:\s*(\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i
  )
  const deadlineMs = toEndOfDayMs(deadlineMatch?.[1] || update.design_deadline, nowMs)
  return deadlineMs ? { phase, deadlineMs } : null
}

/**
 * Tạo các lần cam kết giao thiết kế của một task.
 * Mỗi lần designer đặt ngày gửi được đóng lại khi task chuyển trạng thái tiếp theo.
 * Dữ liệu có cấu trúc mới được ưu tiên; ghi chú cũ vẫn được đọc để tương thích.
 */
function getDesignDeliveryCommitments(
  request: UXRequest,
  nowMs: number
): DesignDeliveryCommitment[] {
  // On-time Delivery only evaluates active tasks. Once a task is completed,
  // pending, frozen/stopped, or rejected, all of its commitments leave the KPI.
  if (isExcludedOnTimeDeliveryTask(request)) return []

  const commitments: DesignDeliveryCommitment[] = []
  const openByPhase = new Map<DesignDeliveryPhase, DesignDeliveryCommitment>()
  const updates = Array.isArray(request.task_updates)
    ? [...request.task_updates].sort(
        (a, b) => parseDateMs(a.timestamp, nowMs) - parseDateMs(b.timestamp, nowMs)
      )
    : []
  let lastKnownPhase = ""

  const cancelOpenCommitments = () => {
    openByPhase.forEach((commitment) => {
      const index = commitments.indexOf(commitment)
      if (index >= 0) commitments.splice(index, 1)
    })
    openByPhase.clear()
  }

  updates.forEach((update) => {
    const fallbackPreviousPhase = update.previous_phase || lastKnownPhase
    const deadlineChange = getDeadlineChangeFromUpdate(update, nowMs)
    if (deadlineChange) {
      if (!deadlineChange.deadlineMs) {
        openByPhase.delete(deadlineChange.phase)
      } else {
        const existing = openByPhase.get(deadlineChange.phase)
        if (existing) {
          existing.deadlineMs = deadlineChange.deadlineMs
        } else {
          const commitment = { phase: deadlineChange.phase, deadlineMs: deadlineChange.deadlineMs }
          commitments.push(commitment)
          openByPhase.set(deadlineChange.phase, commitment)
        }
      }
      lastKnownPhase = update.new_phase || lastKnownPhase
      return
    }

    const transitioned = isWorkflowTransition(update, fallbackPreviousPhase)
    lastKnownPhase = update.new_phase || lastKnownPhase
    if (!transitioned) return

    if (isExcludedKpiStatus(update.new_status)) {
      cancelOpenCommitments()
      return
    }

    const phase =
      getDesignDeliveryPhase(update.previous_phase) ||
      getDesignDeliveryPhase(fallbackPreviousPhase) ||
      getDesignDeliveryPhase(update.new_phase) ||
      getDesignDeliveryPhase(request.current_phase) ||
      "design"
    let commitment = openByPhase.get(phase)

    if (!commitment && openByPhase.size === 1) {
      commitment = openByPhase.values().next().value
    }

    if (!commitment) {
      const deadlineMs = toEndOfDayMs(update.design_deadline, nowMs)
      if (deadlineMs) {
        commitment = { phase, deadlineMs }
        commitments.push(commitment)
      }
    }

    if (commitment) {
      commitment.deliveredAtMs = parseDateMs(update.timestamp, nowMs) || nowMs
      openByPhase.delete(phase)
    }
  })

  if (isExcludedKpiStatus(request.status)) {
    cancelOpenCommitments()
    return commitments
  }

  const currentDeadlineMs = toEndOfDayMs(request.design_deadline, nowMs)
  if (currentDeadlineMs) {
    const currentPhase = getDesignDeliveryPhase(request.current_phase) || "design"
    const sentAtMs = parseDateMs(request.sent_to_po_at, nowMs)
    const currentStatus = normalizeMetricText(request.status)
    const hasCurrentTransitionTimestamp = Boolean(sentAtMs && currentStatus === "da gui po")
    const alreadyCapturedCurrentDelivery = commitments.some(
      (item) =>
        Boolean(item.deliveredAtMs) &&
        item.deadlineMs === currentDeadlineMs &&
        (item.phase === currentPhase || currentPhase === "design" || item.phase === "design")
    )

    if (alreadyCapturedCurrentDelivery) return commitments

    let currentCommitment = openByPhase.get(currentPhase)
    if (!currentCommitment) {
      currentCommitment = { phase: currentPhase, deadlineMs: currentDeadlineMs }
      commitments.push(currentCommitment)
      openByPhase.set(currentPhase, currentCommitment)
    } else {
      currentCommitment.deadlineMs = currentDeadlineMs
    }

    if (hasCurrentTransitionTimestamp) {
      currentCommitment.deliveredAtMs = sentAtMs
      openByPhase.delete(currentPhase)
    }
  }

  return commitments
}

/**
 * Tỷ lệ đúng hạn dựa trên cam kết gửi của designer, không dựa vào task Done:
 * - Đúng hạn: chuyển sang trạng thái tiếp theo trước hoặc trong ngày đã đặt lịch gửi.
 * - Trễ: chuyển trạng thái sau ngày đã hẹn, hoặc đã quá ngày hẹn nhưng chưa chuyển.
 * - Chuyển sang Pending/PO pending hoặc trạng thái dừng: hủy lần hẹn đang mở, không đưa vào KPI.
 * - Chưa đến ngày hẹn và chưa chuyển: chưa đưa vào mẫu số.
 */
export function calculateOnTimeDelivery(
  requests: UXRequest[] = [],
  nowMs: number = Date.now()
): OnTimeDeliveryStats {
  const safeReqs = Array.isArray(requests) ? requests.filter(isValidTask) : []
  let onTimeCount = 0
  let delayedCount = 0
  let completedOnTimeCount = 0
  const delayedItems: DelayedDesignDeliveryItem[] = []
  const missingDeadlineItems: MissingDesignDeadlineItem[] = []

  safeReqs.forEach((request) => {
    if (!isExcludedOnTimeDeliveryTask(request)) {
      const currentPhase = getDesignDeliveryPhase(request.current_phase)
      const currentDeadlineMs = toEndOfDayMs(request.design_deadline, nowMs)
      if (currentPhase && !currentDeadlineMs) {
        missingDeadlineItems.push({
          requestId: toSafeString(request.request_id || request.id),
          title: toSafeString(request.nickname || request.title) || "Chưa đặt tiêu đề",
          designer: resolveTaskDesigner(request) || "Chưa phân công",
          phase: currentPhase,
          currentStatus: toSafeString(request.status),
        })
      }
    }

    getDesignDeliveryCommitments(request, nowMs).forEach((commitment) => {
      if (commitment.deliveredAtMs) {
        if (commitment.deliveredAtMs <= commitment.deadlineMs) {
          // Lịch sử đã chuyển đúng hạn chỉ dùng cho dữ liệu tham chiếu, không
          // tham gia công thức sức khỏe cam kết đang mở trên card.
          completedOnTimeCount++
        } else {
          // Vẫn giữ lần chuyển muộn trong báo cáo chi tiết, nhưng không làm
          // giảm tỷ lệ bên ngoài vì task đã chuyển trạng thái.
          delayedItems.push({
            requestId: toSafeString(request.request_id || request.id),
            title: toSafeString(request.nickname || request.title) || "Chưa đặt tiêu đề",
            designer: resolveTaskDesigner(request) || "Chưa phân công",
            phase: commitment.phase,
            deadlineMs: commitment.deadlineMs,
            transitionedAtMs: commitment.deliveredAtMs,
            currentStatus: toSafeString(request.status),
          })
        }
      } else if (nowMs > commitment.deadlineMs) {
        // Card bên ngoài chỉ coi task là trễ khi đã quá hẹn mà vẫn chưa chuyển.
        delayedCount++
        delayedItems.push({
          requestId: toSafeString(request.request_id || request.id),
          title: toSafeString(request.nickname || request.title) || "Chưa đặt tiêu đề",
          designer: resolveTaskDesigner(request) || "Chưa phân công",
          phase: commitment.phase,
          deadlineMs: commitment.deadlineMs,
          currentStatus: toSafeString(request.status),
        })
      } else {
        // Cam kết đang mở và chưa tới hạn được coi là đang đúng tiến độ.
        onTimeCount++
      }
    })
  })

  const totalEvaluated = onTimeCount + delayedCount
  const onTimeRate =
    totalEvaluated > 0
      ? Number(((onTimeCount / totalEvaluated) * 100).toFixed(1))
      : 100

  let badgeText: "Đúng cam kết" | "Cảnh báo trễ hạn" = "Đúng cam kết"
  let badgeVariant: "emerald" | "amber" | "rose" = "emerald"

  if (onTimeRate >= 95.0 || delayedCount === 0) {
    badgeText = "Đúng cam kết"
    badgeVariant = "emerald"
  } else if (onTimeRate >= 85.0) {
    badgeText = "Cảnh báo trễ hạn"
    badgeVariant = "amber"
  } else {
    badgeText = "Cảnh báo trễ hạn"
    badgeVariant = "rose"
  }

  return {
    onTimeRate: Number.isFinite(onTimeRate) ? onTimeRate : 100,
    onTimeCount,
    delayedCount,
    totalEvaluated,
    badgeText,
    badgeVariant,
    completedOnTimeCount,
    inProgressOnTimeCount: onTimeCount,
    delayedItems,
    missingDeadlineCount: missingDeadlineItems.length,
    missingDeadlineItems,
  }
}

// =========================================================================
// THẺ 4: SLA / CYCLE TIME
// =========================================================================

export interface CycleTimeStats {
  avgCycleTime: number // Số ngày trung bình / task (ví dụ: 3.8)
  targetCycleTime: number // Mục tiêu cam kết SLA (5.0 ngày/task)
  sampleCount: number // Số task có đủ mốc Define đầu bài và Ready to dev
  isCompletedCohort: boolean // Giữ tương thích API; true khi đo chu kỳ đã khép kín
  badgeText: "Tốc độ nhanh" | "Đạt chuẩn SLA" | "Cần cải thiện"
  badgeVariant: "emerald" | "blue" | "amber"
}

export const SLA_TARGET_CYCLE_DAYS = 5.0

/**
 * Trả về thời điểm đầu tiên task chuyển vào một mốc quy trình thiết kế.
 * Chỉ dùng lịch sử chuyển khâu thực tế, không suy diễn từ ngày tạo hoặc ngày cập nhật.
 */
function getDesignCycleMilestoneMs(
  request: UXRequest,
  milestone: "define" | "ready",
  nowMs: number,
  afterMs = 0,
): number {
  if (!Array.isArray(request.task_updates)) return 0

  const matchesMilestone = (value: unknown) => {
    const normalized = normalizeMetricText(value)
    if (milestone === "define") {
      return normalized.includes("define") || /^2(?:\.|\s|$)/.test(normalized)
    }
    return (
      normalized.includes("ready to dev") ||
      normalized.includes("ready for dev") ||
      /^5(?:\.|\s|$)/.test(normalized)
    )
  }

  return request.task_updates
    .map((update) => {
      const note = normalizeMetricText(update.note)
      const noteMarksTransition =
        matchesMilestone(note) &&
        (note.includes("chuyen sang") ||
          note.includes("sang khau") ||
          note.includes("bat dau"))
      const phaseMarksTransition =
        matchesMilestone(update.new_phase) &&
        !matchesMilestone(update.previous_phase)

      return {
        timestampMs: parseDateMs(update.timestamp, nowMs),
        isMatch: !update.is_comment && (phaseMarksTransition || noteMarksTransition),
      }
    })
    .filter((item) => item.isMatch && item.timestampMs > 0 && item.timestampMs >= afterMs)
    .sort((a, b) => a.timestampMs - b.timestampMs)[0]?.timestampMs || 0
}

/**
 * Cycle Time = thời điểm chuyển vào Ready to dev - thời điểm chuyển vào Define đầu bài.
 * Chỉ task có đủ cả hai mốc hợp lệ mới tham gia trung bình.
 */
export function calculateCycleTime(
  requests: UXRequest[] = [],
  nowMs: number = Date.now()
): CycleTimeStats {
  const MS_PER_DAY = 24 * 3600 * 1000
  const sysConfig = getSystemConfig()
  const targetCycleTime = sysConfig.sla?.targetCycleDays ?? SLA_TARGET_CYCLE_DAYS
  const fastCycleTime = sysConfig.sla?.fastCycleDays ?? 3.5

  const safeReqs = Array.isArray(requests) ? requests.filter(isValidTask) : []

  if (safeReqs.length === 0) {
    return {
      avgCycleTime: 0,
      targetCycleTime,
      sampleCount: 0,
      isCompletedCohort: true,
      badgeText: "Đạt chuẩn SLA",
      badgeVariant: "blue",
    }
  }

  let cycleDaysSum = 0
  let sampleCount = 0

  safeReqs.forEach((request) => {
    const defineMs = getDesignCycleMilestoneMs(request, "define", nowMs)
    if (!defineMs) return

    const readyMs = getDesignCycleMilestoneMs(request, "ready", nowMs, defineMs)
    if (!readyMs || readyMs < defineMs) return

    cycleDaysSum += (readyMs - defineMs) / MS_PER_DAY
    sampleCount++
  })

  const avgCycleTime = sampleCount > 0
    ? Number((cycleDaysSum / sampleCount).toFixed(1))
    : 0
  const safeAvg = Number.isFinite(avgCycleTime) ? avgCycleTime : 0

  let badgeText: "Tốc độ nhanh" | "Đạt chuẩn SLA" | "Cần cải thiện" = "Đạt chuẩn SLA"
  let badgeVariant: "emerald" | "blue" | "amber" = "blue"

  if (sampleCount > 0 && safeAvg <= fastCycleTime) {
    badgeText = "Tốc độ nhanh"
    badgeVariant = "emerald"
  } else if (sampleCount > 0 && safeAvg > targetCycleTime) {
    badgeText = "Cần cải thiện"
    badgeVariant = "amber"
  }

  return {
    avgCycleTime: safeAvg,
    targetCycleTime,
    sampleCount,
    isCompletedCohort: sampleCount > 0,
    badgeText,
    badgeVariant,
  }
}
