/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BẢNG ĐẶC TẢ VÀ TÙY BIẾN NỘI DUNG THÔNG BÁO (NOTIFICATION TEMPLATES CATALOG)
 * ═══════════════════════════════════════════════════════════════════════════
 * Bạn có thể trực tiếp sửa tiêu đề (title), nội dung (message template),
 * hoặc đối tượng nhận (recipients) tại file này.
 */

import { NotificationType } from "../types/notification"

export interface NotificationTemplateDef {
  /** Mã loại thông báo */
  type: NotificationType
  /** Tên sự kiện nghiệp vụ */
  eventName: string
  /** Ai là người thực hiện hành động (Sender / Actor) */
  sender: string
  /** Ai là người nhận thông báo (Target Recipients) */
  recipients: string
  /** Tiêu đề mẫu */
  titleTemplate: string
  /** Nội dung thông báo mẫu (hỗ trợ placeholder: {requestId}, {taskTitle}, {actorName}, {squadName}, {ownerName}, {phaseName}, {statusName}, {note}) */
  messageTemplate: string
  /** Nhãn hiển thị ngắn trên Badge Popover */
  badgeLabel: string
  /** Kiểu toast mặc định */
  toastType: "success" | "info" | "warning" | "error"
}

export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplateDef> = {
  // ─── 1. PO gửi task mới (Người nhận: Designer Owner của Squad) ─────────────
  task_created: {
    type: "task_created",
    eventName: "PO gửi task mới",
    sender: "PO (Requester)",
    recipients: "Designer Owner phụ trách Squad đó (& Triage Lead)",
    titleTemplate: "PO gửi task: {requestId}",
    messageTemplate: "Có yêu cầu thiết kế mới từ PO {actorName} - [{taskTitle}] - {squadName}.",
    badgeLabel: "PO gửi task",
    toastType: "success",
  },

  // ─── 2. Đồng thuận thiết kế (Sửa từ 'Phê duyệt thiết kế') ───────────────────
  task_approved: {
    type: "task_approved",
    eventName: "Đồng thuận thiết kế",
    sender: "PO (Product Owner)",
    recipients: "Designer phụ trách bài toán & Designer Owner của Squad",
    titleTemplate: "Đồng thuận thiết kế: {requestId}",
    messageTemplate: "PO {actorName} đã đồng thuận phương án thiết kế [{taskTitle}].",
    badgeLabel: "Đồng thuận",
    toastType: "success",
  },

  // ─── 3. PO feedback (Sửa từ 'Yêu cầu chỉnh sửa') ────────────────────────────
  task_changes_requested: {
    type: "task_changes_requested",
    eventName: "PO feedback",
    sender: "PO (Product Owner)",
    recipients: "Designer phụ trách bài toán",
    titleTemplate: "PO feedback: {requestId}",
    messageTemplate: "PO {actorName} đã gửi feedback: {note}",
    badgeLabel: "PO feedback",
    toastType: "warning",
  },

  // ─── 4. Phân công Designer thực hiện ───────────────────────────────────────
  task_assigned: {
    type: "task_assigned",
    eventName: "Phân công Designer",
    sender: "Designer thực hiện",
    recipients: "Designer được phân công & PO gửi yêu cầu",
    titleTemplate: "Designer tiếp nhận xử lý yêu cầu: {requestId}",
    messageTemplate: "Yêu cầu [{taskTitle}] đã được phân công cho {actorName}.",
    badgeLabel: "Phân công",
    toastType: "info",
  },

  // ─── 5. Designer gửi bài toán cho PO duyệt ─────────────────────────────────
  task_sent_to_po: {
    type: "task_sent_to_po",
    eventName: "Gửi PO duyệt",
    sender: "Designer thực hiện / Lead / Designer Owner",
    recipients: "PO phụ trách yêu cầu (Requester)",
    titleTemplate: "Gửi PO duyệt: {requestId}",
    messageTemplate: "Designer {actorName} đã hoàn thiện thiết kế [{taskTitle}] và gửi PO nghiệm thu.",
    badgeLabel: "Gửi PO",
    toastType: "info",
  },

  // ─── 6. Chuyển khâu thiết kế (Wireframe -> UI -> Handover) ──────────────────
  phase_changed: {
    type: "phase_changed",
    eventName: "Chuyển khâu thiết kế",
    sender: "Designer thực hiện / Lead / Designer Owner",
    recipients: "PO gửi yêu cầu & Designer Owner",
    titleTemplate: "Chuyển khâu thiết kế: {requestId}",
    messageTemplate: "[{taskTitle}] đã chuyển sang [{phaseName}] ({note}).",
    badgeLabel: "Quy trình",
    toastType: "info",
  },

  // ─── 7. Cập nhật trạng thái bài toán ───────────────────────────────────────
  status_changed: {
    type: "status_changed",
    eventName: "Cập nhật trạng thái",
    sender: "Thành viên thực hiện / PO",
    recipients: "Các bên liên quan (PO, Designer, Owner)",
    titleTemplate: "Cập nhật trạng thái: {requestId}",
    messageTemplate: "[{taskTitle}] đã chuyển trạng thái sang [{statusName}].",
    badgeLabel: "Trạng thái",
    toastType: "info",
  },

  // ─── 8. Cập nhật ngày hẹn bàn giao (Deadline / Release) ────────────────────
  deadline_changed: {
    type: "deadline_changed",
    eventName: "Cập nhật hạn hoàn thành",
    sender: "Admin / Lead / PO",
    recipients: "Designer phụ trách bài toán & Designer Owner",
    titleTemplate: "Cập nhật deadline: {requestId}",
    messageTemplate: "Hạn bàn giao bài toán [{taskTitle}] đã cập nhật sang ngày {note}.",
    badgeLabel: "Hạn deadline",
    toastType: "warning",
  },

  // ─── 9. Tạm dừng / Pending bài toán ─────────────────────────────────────────
  task_pending: {
    type: "task_pending",
    eventName: "Tạm dừng bài toán (Pending)",
    sender: "PO / Designer",
    recipients: "Các bên liên quan (PO & Designer)",
    titleTemplate: "Tạm dừng bài toán: {requestId}",
    messageTemplate: "[{taskTitle}] chuyển sang trạng thái Pending: {note}.",
    badgeLabel: "Pending",
    toastType: "warning",
  },

  // ─── 10. Tiếp tục thực hiện bài toán ───────────────────────────────────────
  task_resumed: {
    type: "task_resumed",
    eventName: "Tiếp tục bài toán",
    sender: "PO / Designer",
    recipients: "Các bên liên quan (PO & Designer)",
    titleTemplate: "Tiếp tục bài toán: {requestId}",
    messageTemplate: "[{taskTitle}] đã được tiếp tục triển khai.",
    badgeLabel: "Tiếp tục",
    toastType: "success",
  },

  // ─── 11. Chuyển Squad phụ trách ────────────────────────────────────────────
  squad_changed: {
    type: "squad_changed",
    eventName: "Chuyển Squad",
    sender: "Admin / Lead",
    recipients: "Designer Owner của cả 2 Squad (cũ & mới) & PO",
    titleTemplate: "Điều chuyển Squad: {requestId}",
    messageTemplate: "[{taskTitle}] đã được chuyển sang Squad [{squadName}].",
    badgeLabel: "Squad",
    toastType: "info",
  },

  // ─── 12. Trao đổi / Bình luận mới ──────────────────────────────────────────
  comment_added: {
    type: "comment_added",
    eventName: "Bình luận mới",
    sender: "Người gửi bình luận",
    recipients: "Các thành viên tham gia bài toán (PO, Designer, Owner)",
    titleTemplate: "Bình luận mới: {requestId}",
    messageTemplate: "{actorName}: \"{note}\"",
    badgeLabel: "Bình luận",
    toastType: "info",
  },

  // ─── 13. Thông báo hệ thống ────────────────────────────────────────────────
  system: {
    type: "system",
    eventName: "Hệ thống UXMB Portal",
    sender: "Hệ thống UXMB Portal",
    recipients: "Toàn bộ người dùng hệ thống",
    titleTemplate: "Hệ thống MB UX Portal",
    messageTemplate: "{note}",
    badgeLabel: "Hệ thống",
    toastType: "info",
  },
}

/**
 * Helper format nội dung thông báo từ template
 */
export function formatNotificationFromTemplate(
  type: NotificationType,
  params: {
    requestId?: string
    taskTitle?: string
    actorName?: string
    squadName?: string
    ownerName?: string
    phaseName?: string
    statusName?: string
    note?: string
  }
): { title: string; message: string; recipients: string; toastType: "success" | "info" | "warning" | "error" } {
  const tpl = NOTIFICATION_TEMPLATES[type] || NOTIFICATION_TEMPLATES.system
  let title = tpl.titleTemplate
  let message = tpl.messageTemplate

  const replaceMap: Record<string, string> = {
    "{requestId}": params.requestId || "UXMB Task",
    "{taskTitle}": params.taskTitle || "Bài toán UX",
    "{actorName}": params.actorName || "Thành viên",
    "{squadName}": params.squadName || "Squad chung",
    "{ownerName}": params.ownerName || "Designer Owner",
    "{phaseName}": params.phaseName || "Quy trình UX",
    "{statusName}": params.statusName || "Đang xử lý",
    "{note}": params.note || "",
  }

  Object.entries(replaceMap).forEach(([key, val]) => {
    title = title.split(key).join(val)
    message = message.split(key).join(val)
  })

  return {
    title,
    message,
    recipients: tpl.recipients,
    toastType: tpl.toastType,
  }
}
