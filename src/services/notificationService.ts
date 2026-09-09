import { useState, useEffect, useCallback } from "react";
import { NotificationItem, NotificationType, DispatchNotificationParams } from "../types/notification";
import { toast } from "../components/ui/toast";
import { formatNotificationFromTemplate, NOTIFICATION_TEMPLATES } from "../config/notificationTemplates";

const STORAGE_KEY = "ux_portal_notifications";
const STORAGE_VERSION_KEY = "ux_portal_notifications_tpl_v2";
const BROADCAST_CHANNEL_NAME = "ux_portal_notifications_sync";
const MAX_NOTIFICATIONS = 50;

// Seed data based directly on NOTIFICATION_TEMPLATES
const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-seed-0",
    type: "task_created",
    title: "PO gửi task: REQ-20260309-02",
    message: "Có yêu cầu thiết kế mới từ PO Trần Mai Lan - [Nâng cấp luồng chuyển tiền quốc tế] - TransferD.",
    requestId: "REQ-20260309-02",
    taskTitle: "Nâng cấp luồng chuyển tiền quốc tế",
    actorName: "Trần Mai Lan",
    actorRole: "PO",
    recipient: "Designer Owner phụ trách Squad đó (& Triage Lead)",
    targetRole: "Designer Owner",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
    read: false,
  },
  {
    id: "notif-seed-1",
    type: "task_approved",
    title: "Đồng thuận thiết kế: REQ-20260301-01",
    message: "PO Trần Mai Lan đã đồng thuận phương án thiết kế [Thiết kế giao diện MB Priority Banking Mobile].",
    requestId: "REQ-20260301-01",
    taskTitle: "Thiết kế giao diện MB Priority Banking Mobile",
    actorName: "Trần Mai Lan",
    actorRole: "PO",
    recipient: "Designer phụ trách bài toán & Designer Owner của Squad",
    targetRole: "Designer",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
    read: false,
  },
  {
    id: "notif-seed-1b",
    type: "task_changes_requested",
    title: "PO feedback: REQ-20260302-05",
    message: "PO Trần Mai Lan đã gửi feedback: Cần làm rõ hơn bước xác thực sinh trắc học và tối ưu vị trí nút CTA chính.",
    requestId: "REQ-20260302-05",
    taskTitle: "Cải tiến luồng Digital Lending Onboarding",
    actorName: "Trần Mai Lan",
    actorRole: "PO",
    recipient: "Designer phụ trách bài toán",
    targetRole: "Designer",
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    read: false,
  },
  {
    id: "notif-seed-2",
    type: "task_assigned",
    title: "Designer tiếp nhận xử lý yêu cầu: REQ-20260302-04",
    message: "Yêu cầu [Cải tiến luồng Digital Lending Onboarding] đã được phân công cho Lê Hoàng Nam.",
    requestId: "REQ-20260302-04",
    taskTitle: "Cải tiến luồng Digital Lending Onboarding",
    actorName: "Lê Hoàng Nam",
    actorRole: "Designer",
    recipient: "Designer được phân công & PO gửi yêu cầu",
    targetRole: "Designer",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    read: false,
  },
  {
    id: "notif-seed-3",
    type: "phase_changed",
    title: "Chuyển khâu thiết kế: REQ-20260228-09",
    message: "[Thiết kế Redesign Dashboard MB Biz App] đã chuyển sang [UI Design] (Tiến độ 60%).",
    requestId: "REQ-20260228-09",
    taskTitle: "Thiết kế Redesign Dashboard MB Biz App",
    actorName: "Lê Hoàng Nam",
    actorRole: "Designer",
    recipient: "PO gửi yêu cầu & Designer Owner",
    targetRole: "PO",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    read: true,
  },
  {
    id: "notif-seed-4",
    type: "system",
    title: "Hệ thống MB UX Portal",
    message: "Hệ thống thông báo thời gian thực và catalog mẫu thông báo đã kích hoạt.",
    recipient: "Toàn bộ người dùng hệ thống",
    targetRole: "All",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    read: true,
  },
];

function loadInitialNotifications(): NotificationItem[] {
  if (typeof window === "undefined") {
    return SEED_NOTIFICATIONS;
  }
  try {
    const hasV2 = localStorage.getItem(STORAGE_VERSION_KEY) === "true";
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || !hasV2) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_NOTIFICATIONS));
      localStorage.setItem(STORAGE_VERSION_KEY, "true");
      return SEED_NOTIFICATIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_NOTIFICATIONS));
    localStorage.setItem(STORAGE_VERSION_KEY, "true");
    return SEED_NOTIFICATIONS;
  } catch (err) {
    console.error("Error loading notifications from storage:", err);
    return SEED_NOTIFICATIONS;
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
        memoryStore = parsed;
        notifyListeners();
      }
    }
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
  const finalRecipient = params.recipient || tplResult.recipients;
  const finalToastType = params.toastType || tplResult.toastType || mapNotificationTypeToToast(params.type);

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
    if (finalToastType === "success") {
      toast.success(finalTitle, finalMessage);
    } else if (finalToastType === "error") {
      toast.error(finalTitle, finalMessage);
    } else if (finalToastType === "warning") {
      toast.warning(finalTitle, finalMessage);
    } else {
      toast.info(finalTitle, finalMessage);
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
