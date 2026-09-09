import { UXRequest } from "@/data/mockData"
import { UserSession } from "@/services/otpAuthService"

export interface UserScope {
  products: string[]
  squads: string[]
  isAll: boolean
}

/**
 * Lấy danh sách Sản phẩm và Squad được phân công cho người dùng (đặc biệt cho Design Owner)
 */
export function getUserScope(session: UserSession | null): UserScope {
  if (!session) {
    return { products: [], squads: [], isAll: true }
  }

  const rawProducts = new Set<string>()
  const rawSquads = new Set<string>()

  // 1. Lấy trực tiếp từ session
  if (session.squad) rawSquads.add(session.squad)
  if (session.squads && Array.isArray(session.squads)) {
    session.squads.forEach((s) => s && rawSquads.add(s))
  }
  if (session.products && Array.isArray(session.products)) {
    session.products.forEach((p) => p && rawProducts.add(p))
  }

  const userEmail = (session.teamsEmail || session.personalEmail || "").toLowerCase().trim()
  const userName = (session.displayName || "").toLowerCase().trim()
  const userPrefix = userEmail.includes("@") ? userEmail.split("@")[0] : userEmail

  // 2. Tra cứu bổ sung từ localStorage (mbbank_admin_team & mbbank_team_members)
  try {
    const cachedMembers =
      localStorage.getItem("mbbank_admin_team") ||
      localStorage.getItem("mbbank_team_members")
    if (cachedMembers) {
      const list: any[] = JSON.parse(cachedMembers)
      if (Array.isArray(list)) {
        const found = list.find((m) => {
          const mEmail = (m.email || m.teamsEmail || m.personalEmail || "").toLowerCase().trim()
          const mName = (m.name || "").toLowerCase().trim()
          return (
            (userEmail && mEmail === userEmail) ||
            (userPrefix && mEmail.includes(userPrefix)) ||
            (userName && (mName.includes(userName) || userName.includes(mName)))
          )
        })

        if (found) {
          if (found.squad) rawSquads.add(found.squad)
          if (Array.isArray(found.squads)) found.squads.forEach((s: string) => s && rawSquads.add(s))
          if (Array.isArray(found.products)) found.products.forEach((p: string) => p && rawProducts.add(p))
        }
      }
    }
  } catch (e) {
    console.warn("Could not read team members for scope:", e)
  }

  // 3. Tra cứu bổ sung từ danh sách Squads cấu hình (mbbank_admin_squads)
  try {
    const cachedSquads = localStorage.getItem("mbbank_admin_squads")
    if (cachedSquads) {
      const squadList: any[] = JSON.parse(cachedSquads)
      if (Array.isArray(squadList)) {
        squadList.forEach((sq) => {
          const lead = (sq.leadDesigner || "").toLowerCase()
          const desList = Array.isArray(sq.designers)
            ? sq.designers.map((d: string) => d.toLowerCase())
            : []

          const isAssignedToSquad =
            (userName && lead.includes(userName)) ||
            (userPrefix && lead.includes(userPrefix)) ||
            desList.some(
              (d: string) =>
                (userName && d.includes(userName)) || (userPrefix && d.includes(userPrefix))
            )

          if (isAssignedToSquad) {
            if (sq.name) rawSquads.add(sq.name)
            if (sq.productName) rawProducts.add(sq.productName)
            if (Array.isArray(sq.products)) sq.products.forEach((p: string) => p && rawProducts.add(p))
          }
        })
      }
    }
  } catch (e) {
    console.warn("Could not read admin squads for scope:", e)
  }

  const products = Array.from(rawProducts).filter(Boolean)
  const squads = Array.from(rawSquads).filter(Boolean)

  // Nếu chứa "All Squads" hoặc "Toàn hàng" hoặc "Tất cả" -> Toàn quyền xem
  const isAll =
    products.some((p) => {
      const low = p.toLowerCase()
      return low.includes("toàn hàng") || low.includes("tất cả") || low === "*"
    }) ||
    squads.some((s) => {
      const low = s.toLowerCase()
      return low.includes("all squads") || low.includes("tất cả") || low === "*"
    })

  return { products, squads, isAll }
}

/**
 * Chuẩn hóa chuỗi tiếng Việt (loại bỏ dấu và khoảng trắng thừa) để so khớp chính xác
 */
export function normalizeVietnameseString(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Kiểm tra xem người dùng hiện tại có nằm trong danh sách Viewer của bài toán hay không.
 * Ngăn chặn tuyệt đối tình trạng so khớp nhầm giữa các tài khoản có cùng tên gọi cuối (như Tuấn, Anh, Nam, Linh...)
 * Hỗ trợ chính xác:
 * 1. Email chính xác hoặc trích xuất từ chuỗi dạng "Tên <email@mb...>" / "Tên (email@mb...)"
 * 2. Username prefix chính xác (ví dụ "tuan.business" === "tuan.business")
 * 3. Họ tên đầy đủ (kể cả có dấu hoặc không dấu tiếng Việt)
 * 4. Họ tên đi kèm tiền tố/hậu tố chức danh khi có ít nhất 2 từ
 */
export function isUserInViewers(viewers: string[] | string | null | undefined, session: UserSession | null): boolean {
  if (!viewers || !session) return false
  const userEmail = (session.teamsEmail || session.personalEmail || "").toLowerCase().trim()
  const userEmailPrefix = userEmail.includes("@") ? userEmail.split("@")[0].trim() : userEmail
  const userName = (session.displayName || "").toLowerCase().trim()
  const normUserName = normalizeVietnameseString(userName)

  const list: any[] = Array.isArray(viewers)
    ? viewers
    : typeof viewers === "string" && viewers.trim()
    ? viewers.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
    : []

  if (list.length === 0) return false

  return list.some((v) => {
    if (typeof v === "object" && v !== null) {
      const objEmail = String((v as any).email || "").toLowerCase().trim()
      if (objEmail && userEmail && objEmail === userEmail) return true
    }

    const raw = typeof v === "object" && v !== null
      ? String((v as any).name || (v as any).displayName || (v as any).email || "").trim()
      : String(v || "").trim()
    const clean = raw.toLowerCase()
    if (!clean) return false

    // 1. So khớp Email chính xác hoặc trích xuất email
    if (userEmail) {
      if (clean === userEmail) return true
      const emailMatches = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
      if (emailMatches && emailMatches.some((em) => em.toLowerCase() === userEmail)) {
        return true
      }
    }

    // 2. So khớp Username prefix chính xác
    if (userEmailPrefix && userEmailPrefix.length >= 3) {
      if (clean === userEmailPrefix) return true
      const cleanPrefix = clean.includes("@") ? clean.split("@")[0].trim() : ""
      if (cleanPrefix && cleanPrefix === userEmailPrefix) return true
    }

    // 3. So khớp Tên hiển thị đầy đủ
    if (userName) {
      if (clean === userName) return true
      const normClean = normalizeVietnameseString(clean)
      if (normClean === normUserName) return true

      // Loại bỏ hậu tố chức danh / squad trong ngoặc hoặc dấu gạch nối (ví dụ "Nguyễn Minh Tuấn (Lead Designer)")
      const baseClean = clean.replace(/\s*[\(\[\-].*$/, "").trim()
      const baseUser = userName.replace(/\s*[\(\[\-].*$/, "").trim()
      const normBaseClean = normalizeVietnameseString(baseClean)
      const normBaseUser = normalizeVietnameseString(baseUser)

      if (normBaseClean && normBaseUser && normBaseClean === normBaseUser) return true

      // Trường hợp viewer lưu "Họ Tên (Role)" hoặc "Họ Tên - Squad"
      // BẮT BUỘC cả hai chuỗi phải có tối thiểu 2 từ để tránh false-positive
      const userWords = userName.split(/\s+/).filter(Boolean)
      const cleanWords = clean.split(/\s+/).filter(Boolean)

      if (userWords.length >= 2 && cleanWords.length >= 2) {
        if (normClean.includes(normUserName) || normUserName.includes(normClean)) {
          return true
        }
      }
    }

    return false
  })
}

/**
 * Kiểm tra xem người dùng hiện tại có quyền xem bài toán (UXRequest) này hay không
 * theo đúng quy chuẩn Phân quyền theo Vai trò (Role-based Access Control):
 * - Admin: Xem được tất cả các bài toán của toàn team.
 * - Viewers: Được xem chi tiết bài toán bất kể squad hay tác giả/người được phân công.
 * - PO & Business: Chỉ nhìn thấy các bài toán do chính mình tạo (khớp với email/username người yêu cầu).
 * - Designer: Chỉ nhìn thấy các bài toán được phân công cho mình (khớp với assigned_designer hoặc ux_owner).
 * - Design Owner: Xem được toàn bộ bài toán được apply theo sản phẩm và squad.
 */
export function canUserAccessRequest(r: UXRequest | null | undefined, session: UserSession | null): boolean {
  if (!r) return false
  if (!session) return true // Khi chưa đăng nhập hoặc chế độ xem công khai
  const userRole = session.role

  // 1. Admin: Xem được tất cả các bài toán của toàn team
  if (userRole === "Admin") {
    return true
  }

  // 2. Task Viewers (Người theo dõi): Được quyền xem chi tiết bài toán (kể cả ngoài squad, không phải tác giả/người được gán)
  if (isUserInViewers(r.viewers, session)) {
    return true
  }

  const userEmail = (session.teamsEmail || session.personalEmail || "").toLowerCase().trim()
  const userEmailPrefix = userEmail.includes("@") ? userEmail.split("@")[0] : userEmail
  const userName = (session.displayName || "").toLowerCase().trim()

  // 2. PO & Business: Chỉ nhìn thấy các bài toán do chính mình tạo (khớp với email/username người yêu cầu)
  if (userRole === "PO" || userRole === "Business") {
    const reqEmail = (r.requester_email || "").toLowerCase().trim()
    const reqEmailPrefix = reqEmail.includes("@") ? reqEmail.split("@")[0].trim() : reqEmail
    const reqName = (r.requester_name || "").toLowerCase().trim()

    // Khớp theo email hoặc prefix username chính xác
    if (userEmail && reqEmail && (userEmail === reqEmail || userEmailPrefix === reqEmailPrefix)) {
      return true
    }

    // Khớp theo họ tên người yêu cầu
    if (userName && reqName) {
      const normUserName = normalizeVietnameseString(userName)
      const normReqName = normalizeVietnameseString(reqName)
      if (normUserName === normReqName) return true

      const userWords = userName.split(/\s+/).filter(Boolean)
      const reqWords = reqName.split(/\s+/).filter(Boolean)
      if (userWords.length >= 2 && reqWords.length >= 2) {
        if (normUserName.includes(normReqName) || normReqName.includes(normUserName)) {
          return true
        }
      }
    }

    return false
  }

  // 3. Designer: Chỉ nhìn thấy các bài toán được phân công cho mình (khớp với assigned_designer hoặc ux_owner)
  if (userRole === "Designer") {
    const assigned = `${r.assigned_designer || ""} ${r.ux_owner || ""}`.toLowerCase().trim()
    if (!assigned) return false

    // Bỏ qua các chuỗi mặc định chưa phân công
    if (
      assigned === "chưa phân công" ||
      assigned === "đang phân công" ||
      assigned === "unassigned" ||
      assigned === "chưa gán"
    ) {
      return false
    }

    if (userEmail && assigned.includes(userEmail)) return true
    if (userEmailPrefix && userEmailPrefix.length >= 3) {
      const prefixRegex = new RegExp(`(^|[\\s,;:/])` + userEmailPrefix + `($|[\\s,;:/@])`, "i")
      if (prefixRegex.test(assigned)) return true
    }
    if (userName) {
      const normAssigned = normalizeVietnameseString(assigned)
      const normUserName = normalizeVietnameseString(userName)
      if (normAssigned === normUserName) return true

      const userWords = userName.split(/\s+/).filter(Boolean)
      if (userWords.length >= 2 && (assigned.includes(userName) || normAssigned.includes(normUserName))) {
        return true
      }
    }

    // Chỉ khi assigned là 1 từ duy nhất (ví dụ ghi tắt: "Nam", "Đăng") mới so khớp tên gọi cuối
    const assignedWords = assigned.split(/[\s,;]+/).filter(Boolean)
    if (assignedWords.length === 1 && userName) {
      const nameParts = userName.split(/\s+/).filter(Boolean)
      const lastName = nameParts[nameParts.length - 1]
      if (lastName && lastName.length >= 2 && lastName.toLowerCase() === assignedWords[0].toLowerCase()) {
        return true
      }
    }

    return false
  }

  // 4. Design Owner: Xem được toàn bộ bài toán được apply theo sản phẩm và squad
  if (userRole === "Design Owner") {
    const scope = getUserScope(session)
    if (scope.isAll) return true

    // Nếu bài toán được gán trực tiếp cho chính Design Owner này phụ trách
    const directAssigned = `${r.assigned_designer || ""} ${r.ux_owner || ""} ${r.design_owner || ""}`.toLowerCase().trim()
    if (
      (userEmailPrefix && directAssigned.includes(userEmailPrefix)) ||
      (userName && directAssigned.includes(userName))
    ) {
      return true
    }

    const taskProduct = (r.product || "").toLowerCase().trim()
    const taskSquad = (r.squad_name || r.preferred_squad || r.squad || "").toLowerCase().trim()

    // Khớp theo Sản phẩm
    const matchesProduct = scope.products.some((p) => {
      const cleanP = p.toLowerCase().trim()
      if (!cleanP) return false
      return taskProduct === cleanP || taskProduct.includes(cleanP) || cleanP.includes(taskProduct)
    })

    // Khớp theo Squad
    const matchesSquad = scope.squads.some((s) => {
      const cleanS = s.toLowerCase().trim()
      if (!cleanS) return false
      return taskSquad === cleanS || taskSquad.includes(cleanS) || cleanS.includes(taskSquad)
    })

    if (matchesProduct || matchesSquad) {
      return true
    }

    // Nếu Design Owner chưa được cấu hình sản phẩm hay squad nào thì cho phép xem bài toán để tránh màn hình trống
    if (scope.products.length === 0 && scope.squads.length === 0) {
      return true
    }

    return false
  }

  return true
}

/**
 * Lọc danh sách bài toán theo vai trò người dùng hiện tại
 */
export function filterRequestsByRole(requests: UXRequest[], session: UserSession | null): UXRequest[] {
  if (!requests || requests.length === 0) return []
  return requests.filter((r) => canUserAccessRequest(r, session))
}

export const DEFAULT_RBAC_PERMISSIONS: Record<string, string[]> = {
  "cap-approve": ["Admin", "Design Owner"],
  "cap-test": ["Admin", "Design Owner"],
  "cap-capacity": ["Admin", "Design Owner"],
  "cap-invite": ["Admin", "Design Owner"],
  "cap-workflow": ["Admin"],
  "cap-request": ["Admin", "Design Owner", "Designer", "PO", "Business"],
  "cap-audit": ["Admin", "Design Owner"],
}

export function getRbacPermissions(): Record<string, string[]> {
  try {
    const saved = localStorage.getItem("mbbank_admin_rbac")
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed === "object") {
        return {
          ...DEFAULT_RBAC_PERMISSIONS,
          ...parsed,
          "cap-invite": parsed["cap-invite"] ?? DEFAULT_RBAC_PERMISSIONS["cap-invite"],
        }
      }
    }
  } catch (e) {
    console.warn("Could not read mbbank_admin_rbac:", e)
  }
  return DEFAULT_RBAC_PERMISSIONS
}

export function canRoleAccessCapability(role: string | undefined | null, capId: string): boolean {
  if (!role) return false
  const permissions = getRbacPermissions()
  const allowed = permissions[capId] || DEFAULT_RBAC_PERMISSIONS[capId] || []
  return allowed.includes(role)
}
