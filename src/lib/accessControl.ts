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
 * Kiểm tra xem người dùng hiện tại có quyền xem bài toán (UXRequest) này hay không
 * theo đúng quy chuẩn Phân quyền theo Vai trò (Role-based Access Control):
 * - Admin: Xem được tất cả các bài toán của toàn team.
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

  const userEmail = (session.teamsEmail || session.personalEmail || "").toLowerCase().trim()
  const userEmailPrefix = userEmail.includes("@") ? userEmail.split("@")[0] : userEmail
  const userName = (session.displayName || "").toLowerCase().trim()

  // 2. PO & Business: Chỉ nhìn thấy các bài toán do chính mình tạo (khớp với email/username người yêu cầu)
  if (userRole === "PO" || userRole === "Business") {
    const reqEmail = (r.requester_email || "").toLowerCase().trim()
    const reqEmailPrefix = reqEmail.includes("@") ? reqEmail.split("@")[0] : reqEmail
    const reqName = (r.requester_name || "").toLowerCase().trim()

    // Khớp theo email hoặc prefix username
    if (userEmail && reqEmail && (userEmail === reqEmail || userEmailPrefix === reqEmailPrefix)) {
      return true
    }
    if (userEmailPrefix && reqEmail.includes(userEmailPrefix)) {
      return true
    }
    if (reqEmailPrefix && userEmail.includes(reqEmailPrefix)) {
      return true
    }

    // Khớp theo họ tên người yêu cầu
    if (userName && reqName && (userName.includes(reqName) || reqName.includes(userName))) {
      return true
    }
    if (userName && reqEmail.includes(userName.replace(/\s+/g, ""))) {
      return true
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

    if (userEmailPrefix && assigned.includes(userEmailPrefix)) return true
    if (userEmail && assigned.includes(userEmail)) return true
    if (userName && assigned.includes(userName)) return true

    // Khớp theo tên gọi (tên cuối)
    const nameParts = userName.split(/\s+/).filter(Boolean)
    const lastName = nameParts[nameParts.length - 1]
    if (lastName && lastName.length >= 2) {
      const regex = new RegExp(`\\b${lastName}\\b`, "i")
      if (regex.test(assigned)) return true
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
