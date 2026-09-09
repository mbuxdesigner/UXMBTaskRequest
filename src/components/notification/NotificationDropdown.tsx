import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Send,
  Layers,
  RefreshCw,
  MessageSquare,
  Info,
  Sparkles,
  Trash2,
  ExternalLink,
  ChevronRight,
  Filter,
  Users,
  AtSign,
} from "lucide-react"
import { useNotifications } from "../../services/notificationService"
import { NotificationItem, NotificationType } from "../../types/notification"
import { NOTIFICATION_TEMPLATES } from "../../config/notificationTemplates"

export interface NotificationDropdownProps {
  isOpen?: boolean
  onClose?: () => void
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) {
      return "Vừa xong"
    }
    if (diffMin < 60) {
      return `${diffMin} phút trước`
    }
    if (diffHour < 24) {
      return `${diffHour} giờ trước`
    }
    if (diffDay === 1) {
      return "Hôm qua"
    }
    if (diffDay < 7) {
      return `${diffDay} ngày trước`
    }
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return "Vừa xong"
  }
}

function getNotificationTypeConfig(type: NotificationType) {
  const customLabel = NOTIFICATION_TEMPLATES[type]?.badgeLabel

  switch (type) {
    case "task_approved":
      return {
        icon: CheckCircle2,
        iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-200/80",
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: customLabel || "Đồng thuận",
      }
    case "task_changes_requested":
      return {
        icon: AlertTriangle,
        iconBg: "bg-amber-50 text-amber-600 border border-amber-200/80",
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
        label: customLabel || "PO feedback",
      }
    case "task_pending":
      return {
        icon: Clock,
        iconBg: "bg-rose-50 text-rose-600 border border-rose-200/80",
        badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
        label: customLabel || "Pending",
      }
    case "task_resumed":
      return {
        icon: RefreshCw,
        iconBg: "bg-blue-50 text-blue-600 border border-blue-200/80",
        badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
        label: customLabel || "Tiếp tục",
      }
    case "task_assigned":
      return {
        icon: UserCheck,
        iconBg: "bg-purple-50 text-purple-600 border border-purple-200/80",
        badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
        label: customLabel || "Phân công",
      }
    case "task_sent_to_po":
      return {
        icon: Send,
        iconBg: "bg-cyan-50 text-cyan-600 border border-cyan-200/80",
        badgeBg: "bg-cyan-50 text-cyan-700 border-cyan-200",
        label: customLabel || "Gửi PO",
      }
    case "phase_changed":
      return {
        icon: Layers,
        iconBg: "bg-indigo-50 text-indigo-600 border border-indigo-200/80",
        badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
        label: customLabel || "Khâu thiết kế",
      }
    case "status_changed":
      return {
        icon: RefreshCw,
        iconBg: "bg-sky-50 text-sky-600 border border-sky-200/80",
        badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
        label: customLabel || "Trạng thái",
      }
    case "comment_added":
      return {
        icon: MessageSquare,
        iconBg: "bg-slate-100 text-slate-700 border border-slate-200",
        badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
        label: customLabel || "Bình luận",
      }
    case "comment_mention":
      return {
        icon: AtSign,
        iconBg: "bg-blue-50 text-[#1057fb] border border-blue-200/80",
        badgeBg: "bg-blue-50 text-[#1057fb] border-blue-200",
        label: customLabel || "Nhắc đến",
      }
    case "task_created":
      return {
        icon: Sparkles,
        iconBg: "bg-blue-50 text-[#1057fb] border border-blue-200/80",
        badgeBg: "bg-blue-50 text-[#1057fb] border-blue-200",
        label: customLabel || "PO gửi task",
      }
    case "viewer_added":
      return {
        icon: Users,
        iconBg: "bg-blue-50 text-[#1057fb] border border-blue-200/80",
        badgeBg: "bg-blue-50 text-[#1057fb] border border-blue-200",
        label: customLabel || "Người theo dõi",
      }
    case "system":
    default:
      return {
        icon: Info,
        iconBg: "bg-slate-50 text-slate-600 border border-slate-200/80",
        badgeBg: "bg-slate-50 text-slate-700 border-slate-200",
        label: customLabel || "Hệ thống",
      }
  }
}

export default function NotificationDropdown({
  isOpen = true,
  onClose,
}: NotificationDropdownProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    toggleRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications()

  const [activeTab, setActiveTab] = useState<"all" | "unread">("all")

  const filteredNotifications = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((n) => !n.read)
    }
    return notifications
  }, [notifications, activeTab])

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read) {
      markAsRead(item.id)
    }
    onClose?.()
    if (item.requestId) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ux_pending_open_task", item.requestId)
        window.location.hash = `#track?requestId=${item.requestId}`
        window.dispatchEvent(
          new CustomEvent("app_navigate", {
            detail: { page: "track", requestId: item.requestId },
          })
        )
      }
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -6 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="absolute right-0 top-full mt-2 w-[340px] sm:w-[410px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl z-50 overflow-hidden flex flex-col origin-top-right text-slate-800 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Header */}
      <div className="p-3.5 pb-2.5 border-b border-slate-100/90 bg-gradient-to-b from-slate-50/70 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center text-[#1057fb]">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                  Thông báo
                </h4>
                {unreadCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-50 border border-blue-200/80 text-[10px] font-bold text-[#1057fb]">
                    {unreadCount} mới
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-medium text-slate-500">
                    Đã đọc hết
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-[#1057fb] hover:bg-blue-50/80 transition-colors cursor-pointer"
                title="Đánh dấu tất cả là đã đọc"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đọc tất cả</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Xóa tất cả thông báo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-[#1057fb] text-white shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            Tất cả ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("unread")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === "unread"
                ? "bg-[#1057fb] text-white shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <span>Chưa đọc</span>
            {unreadCount > 0 && (
              <span
                className={`px-1 py-0.2 rounded-full text-[9px] font-bold ${
                  activeTab === "unread"
                    ? "bg-white text-[#1057fb]"
                    : "bg-rose-500 text-white"
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Notifications List */}
      <div className="py-1 max-h-[380px] overflow-y-auto divide-y divide-slate-100/70">
        {filteredNotifications.length === 0 ? (
          <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100/80 flex items-center justify-center text-slate-400 mb-3 border border-slate-200/60 shadow-xs">
              <BellOff className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-800">
              {activeTab === "unread"
                ? "Không có thông báo chưa đọc"
                : "Chưa có thông báo nào"}
            </p>
            <p className="text-[11px] text-slate-500 max-w-[240px] mt-1 font-normal leading-relaxed">
              {activeTab === "unread"
                ? "Bạn đã cập nhật tất cả thông tin mới nhất của dự án."
                : "Các cập nhật về tiến độ, phê duyệt và phân công sẽ xuất hiện tại đây."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const config = getNotificationTypeConfig(item.type)
            const IconComponent = config.icon

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`group relative px-3.5 py-3 hover:bg-slate-50/90 transition-colors cursor-pointer flex items-start gap-3 ${
                  !item.read ? "bg-blue-50/25" : "bg-white"
                }`}
              >
                {/* Left Icon */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${config.iconBg}`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[9px] font-semibold border ${config.badgeBg}`}
                    >
                      {config.label}
                    </span>
                    {item.requestId && (
                      <span className="text-[10px] font-mono text-slate-400 font-medium">
                        {item.requestId}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-normal ml-auto shrink-0">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  <h5
                    className={`text-xs font-semibold truncate ${
                      !item.read ? "text-slate-900" : "text-slate-700"
                    } group-hover:text-[#1057fb] transition-colors`}
                  >
                    {item.title}
                  </h5>

                  <p className="text-[11px] text-slate-600 font-normal leading-relaxed line-clamp-2 mt-0.5">
                    {item.message}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 flex-wrap">
                    {item.actorName && (
                      <div className="flex items-center gap-1">
                        <span>Bởi:</span>
                        <span className="font-semibold text-slate-600">
                          {item.actorName}
                        </span>
                        {item.actorRole && <span>({item.actorRole})</span>}
                      </div>
                    )}
                    {item.recipient && (
                      <div className="flex items-center gap-1">
                        <span>•</span>
                        <span>Đến:</span>
                        <span className="font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/70">
                          {item.recipient}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Status / Actions */}
                <div className="flex flex-col items-end gap-1.5 shrink-0 pt-1">
                  {!item.read && (
                    <span
                      className="w-2 h-2 rounded-full bg-[#1057fb] ring-2 ring-blue-100"
                      title="Chưa đọc"
                    />
                  )}

                  {/* Actions on hover */}
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => toggleRead(item.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-[#1057fb] hover:bg-blue-50 transition-colors"
                      title={item.read ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNotification(item.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Xóa thông báo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 3. Footer */}
      <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <span className="text-slate-500 font-normal">
          {notifications.length > 0
            ? `${notifications.length} thông báo trong hệ thống`
            : "Đồng bộ tức thì"}
        </span>
        <button
          type="button"
          onClick={() => {
            onClose?.()
            window.dispatchEvent(
              new CustomEvent("app_navigate", { detail: { page: "track" } })
            )
          }}
          className="inline-flex items-center gap-1 font-semibold text-[#1057fb] hover:underline cursor-pointer"
        >
          <span>Xem tất cả tiến độ</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  )
}
