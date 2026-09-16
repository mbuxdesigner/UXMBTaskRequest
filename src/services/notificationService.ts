import { useState, useEffect, useCallback } from "react";
import { NotificationItem, NotificationType, DispatchNotificationParams } from "../types/notification";
import { toast } from "../components/ui/toast";
import { formatNotificationFromTemplate, NOTIFICATION_TEMPLATES } from "../config/notificationTemplates";
import { mockRequests } from "../data/mockData";

const STORAGE_KEY = "ux_portal_notifications";
const STORAGE_VERSION_KEY = "ux_portal_notifications_tpl_v2";
const BROADCAST_CHANNEL_NAME = "ux_portal_notifications_sync";
const MAX_NOTIFICATIONS = 50;

// Danh sách thông báo khởi tạo trống (không lưu dữ liệu user test)
const SEED_NOTIFICATIONS: NotificationItem[] = [];

function loadInitialNotifications(): NotificationItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Tự động loại bỏ toàn bộ dữ liệu thông báo user test cũ (notif-seed-*)
        const cleaned = parsed.filter(
          (item: NotificationItem) =>
            item &&
            typeof item.id === "string" &&
            !item.id.startsWith("notif-seed-")
        );
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }
    return [];
  } catch (err) {
    console.error("Error loading notifications from storage:", err);
    return [];
  }
}

let memoryStore: NotificationItem[] = loadInitialNotifications();
const listeners = new Set<(items: NotificationItem[]) => void>();

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      if (event.data && event.data.type === "SYNC_NOTIFICATIONS") {
        syncFromStorage();
      }
    };
  } catch (err) {
    console.warn("BroadcastChannel initialization skipped:", err);
  }
}

function syncFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(
          (item: NotificationItem) =>
            item &&
            typeof item.id === "string" &&
            !item.id.startsWith("notif-seed-")
        );
        const prevIds = new Set(memoryStore.map((n) => n.id));
        const newUnread = cleaned.filter((n) => !prevIds.has(n.id) && !n.read);

        memoryStore = cleaned;
        notifyListeners();

        // Tự động kích hoạt Toast ReUI Sonner cho các thông báo mới từ tab khác hoặc sync
        if (newUnread.length > 0 && prevIds.size > 0) {
          newUnread.slice(0, 3).forEach((item) => {
            const toastType = mapNotificationTypeToToast(item.type);
            const action = item.requestId
              ? {
                  label: "Xem chi tiết",
                  onClick: () => {
                    sessionStorage.setItem("ux_pending_open_task", item.requestId!);
                    window.location.hash = `#track?requestId=${item.requestId}`;
                    window.dispatchEvent(
                      new CustomEvent("app_navigate", {
                        detail: { page: "track", requestId: item.requestId },
                      })
                    );
                  },
                }
              : undefined;

            toast[toastType](item.title, item.message, {
              duration: 4500,
              action,
            });
          });
        }
        return;
      }
    }
    memoryStore = [];
    notifyListeners();
  } catch (err) {
    console.error("Failed to sync notifications from storage:", err);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      syncFromStorage();
    }
  });
}

function notifyListeners() {
  const snapshot = [...memoryStore];
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error("Error calling notification listener:", err);
    }
  });
}

function persistAndBroadcast(shouldBroadcast = true) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryStore));
    } catch (err) {
      console.error("Failed to persist notifications:", err);
    }
  }
  notifyListeners();
  if (shouldBroadcast && broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: "SYNC_NOTIFICATIONS" });
    } catch (err) {
      console.warn("Failed to broadcast notification update:", err);
    }
  }
}

function mapNotificationTypeToToast(type: NotificationType): "success" | "info" | "warning" | "error" {
  switch (type) {
    case "task_created":
    case "task_approved":
    case "task_resumed":
      return "success";
    case "task_changes_requested":
    case "task_pending":
    case "deadline_changed":
      return "warning";
    case "task_assigned":
    case "task_sent_to_po":
    case "phase_changed":
    case "status_changed":
    case "squad_changed":
    case "comment_added":
    case "comment_mention":
    case "viewer_added":
    case "system":
    default:
      return "info";
  }
}

export function getNotifications(): NotificationItem[] {
  return [...memoryStore];
}

export function getUnreadCount(): number {
  return memoryStore.filter((item) => !item.read).length;
}

export function dispatchNotification(params: DispatchNotificationParams): NotificationItem {
  const tplResult = formatNotificationFromTemplate(params.type, {
    requestId: params.requestId,
    taskTitle: params.taskTitle,
    actorName: params.actorName,
    squadName: params.squadName,
    ownerName: params.ownerName,
    phaseName: params.phaseName,
    statusName: params.statusName,
    note: params.note || params.message,
  });

  const finalTitle = params.title || tplResult.title;
  const finalMessage = params.message || tplResult.message;
  let finalRecipient = params.recipient || tplResult.recipients;
  const finalToastType = params.toastType || tplResult.toastType || mapNotificationTypeToToast(params.type);

  // R3: Tự động bổ sung danh sách viewers vào recipient
  let viewersList: string[] = [];
  if (Array.isArray(params.viewers) && params.viewers.length > 0) {
    viewersList = params.viewers;
  } else if (params.requestId) {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("ux_portal_real_requests");
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list)) {
            const found = list.find((r: any) => r.request_id === params.requestId);
            if (found && Array.isArray(found.viewers) && found.viewers.length > 0) {
              viewersList = found.viewers;
            }
          }
        }
      } catch {}
    }
    if (viewersList.length === 0) {
      try {
        const found = mockRequests.find((r) => r.request_id === params.requestId);
        if (found && Array.isArray(found.viewers) && found.viewers.length > 0) {
          viewersList = found.viewers;
        }
      } catch {}
    }
  }

  if (viewersList.length > 0) {
    const uniqueViewerNames = Array.from(
      new Set(
        viewersList
          .map((v: any) =>
            typeof v === "object" && v !== null
              ? String(v.name || v.displayName || v.email || "").trim()
              : String(v || "").trim()
          )
          .filter(Boolean)
      )
    );
    if (uniqueViewerNames.length > 0) {
      const viewersStr = `Viewers (${uniqueViewerNames.join(", ")})`;
      if (!finalRecipient || finalRecipient.toLowerCase().includes("toàn bộ")) {
        finalRecipient = finalRecipient ? `${finalRecipient} & ${viewersStr}` : viewersStr;
      } else if (!finalRecipient.toLowerCase().includes("viewers")) {
        finalRecipient = `${finalRecipient} & ${viewersStr}`;
      }
    }
  }

  const newItem: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: params.type,
    title: finalTitle,
    message: finalMessage,
    requestId: params.requestId,
    taskTitle: params.taskTitle,
    actorName: params.actorName,
    actorRole: params.actorRole,
    recipient: finalRecipient,
    targetRole: params.targetRole,
    timestamp: new Date().toISOString(),
    read: false,
    link: params.link,
  };

  memoryStore = [newItem, ...memoryStore].slice(0, MAX_NOTIFICATIONS);
  persistAndBroadcast(true);

  if (params.showToast !== false) {
    const toastOptions = {
      duration: 4500,
      onClick: params.requestId
        ? () => {
            if (typeof window !== "undefined") {
              sessionStorage.setItem("ux_pending_open_task", params.requestId!)
              window.location.hash = `#track?requestId=${params.requestId}`
              window.dispatchEvent(
                new CustomEvent("app_navigate", {
                  detail: { page: "track", requestId: params.requestId },
                })
              )
            }
          }
        : undefined,
    };

    if (finalToastType === "success") {
      toast.success(finalTitle, finalMessage, toastOptions);
    } else if (finalToastType === "error") {
      toast.error(finalTitle, finalMessage, toastOptions);
    } else if (finalToastType === "warning") {
      toast.warning(finalTitle, finalMessage, toastOptions);
    } else {
      toast.info(finalTitle, finalMessage, toastOptions);
    }
  }

  return newItem;
}

export function markAsRead(id: string): void {
  let changed = false;
  memoryStore = memoryStore.map((item) => {
    if (item.id === id && !item.read) {
      changed = true;
      return { ...item, read: true };
    }
    return item;
  });
  if (changed) {
    persistAndBroadcast(true);
  }
}

export function markAsUnread(id: string): void {
  let changed = false;
  memoryStore = memoryStore.map((item) => {
    if (item.id === id && item.read) {
      changed = true;
      return { ...item, read: false };
    }
    return item;
  });
  if (changed) {
    persistAndBroadcast(true);
  }
}

export function toggleRead(id: string): void {
  let changed = false;
  memoryStore = memoryStore.map((item) => {
    if (item.id === id) {
      changed = true;
      return { ...item, read: !item.read };
    }
    return item;
  });
  if (changed) {
    persistAndBroadcast(true);
  }
}

export function markAllAsRead(): void {
  const hasUnread = memoryStore.some((item) => !item.read);
  if (!hasUnread) return;

  memoryStore = memoryStore.map((item) => ({ ...item, read: true }));
  persistAndBroadcast(true);
}

export function deleteNotification(id: string): void {
  const prevLen = memoryStore.length;
  memoryStore = memoryStore.filter((item) => item.id !== id);
  if (memoryStore.length !== prevLen) {
    persistAndBroadcast(true);
  }
}

export function clearAllNotifications(): void {
  if (memoryStore.length === 0) return;
  memoryStore = [];
  persistAndBroadcast(true);
}

export function subscribeNotifications(listener: (items: NotificationItem[]) => void): () => void {
  listeners.add(listener);
  // Emit initial state immediately
  try {
    listener([...memoryStore]);
  } catch (err) {
    console.error("Error in initial notification subscriber call:", err);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => getNotifications());

  useEffect(() => {
    const unsubscribe = subscribeNotifications((items) => {
      setNotifications(items);
    });
    return unsubscribe;
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = useCallback((id: string) => {
    markAsRead(id);
  }, []);

  const handleMarkAsUnread = useCallback((id: string) => {
    markAsUnread(id);
  }, []);

  const handleToggleRead = useCallback((id: string) => {
    toggleRead(id);
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteNotification(id);
  }, []);

  const handleClearAll = useCallback(() => {
    clearAllNotifications();
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead: handleMarkAsRead,
    markAsUnread: handleMarkAsUnread,
    toggleRead: handleToggleRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDelete,
    clearAll: handleClearAll,
    clearAllNotifications: handleClearAll,
    dispatch: dispatchNotification,
  };
}

/**
 * Hàm kích hoạt bộ thông báo mẫu xếp chồng (Stacked Toasts)
 * Giúp người dùng trải nghiệm trực tiếp tính năng thông báo xếp chồng Sonner ReUI
 */
export function triggerTestStackedNotifications() {
  const reqId = "UXMB-20260908-004";
  
  // 1. Thông báo Thành công
  dispatchNotification({
    type: "task_approved",
    title: "Đã phê duyệt bàn giao UI Design",
    message: "Product Owner đã duyệt luồng trải nghiệm vay món linh hoạt.",
    requestId: reqId,
    taskTitle: "Thiết kế trải nghiệm vay món cho sản phẩm vay linh hoạt",
    actorName: "Lương Thị Hường",
    actorRole: "PO",
    showToast: true,
  });

  // 2. Thông báo Thông tin & Nhắc tên (xếp chồng lên trên)
  setTimeout(() => {
    dispatchNotification({
      type: "comment_mention",
      title: "Bạn được nhắc đến trong trao đổi",
      message: "Mạnh ơi, kiểm tra lại màu sắc nút bấm Dark Navy trên mobile giùm team nhé.",
      requestId: reqId,
      taskTitle: "Thiết kế trải nghiệm vay món cho sản phẩm vay linh hoạt",
      actorName: "Đoàn Thị Phương Thảo",
      actorRole: "Designer",
      showToast: true,
    });
  }, 300);

  // 3. Thông báo Cảnh báo Deadline (xếp chồng tạo thành bộ 3 thẻ 3D)
  setTimeout(() => {
    dispatchNotification({
      type: "deadline_changed",
      title: "Cập nhật thời hạn cam kết kinh doanh",
      message: "Hạn nghiệm thu UX đã được điều chỉnh sang 2026-09-25.",
      requestId: reqId,
      taskTitle: "Thiết kế trải nghiệm vay món cho sản phẩm vay linh hoạt",
      actorName: "Trưởng nhóm UX",
      actorRole: "Design Owner",
      showToast: true,
    });
  }, 600);
}
