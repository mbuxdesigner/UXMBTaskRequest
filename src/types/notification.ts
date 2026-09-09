export type NotificationType =
  | 'task_created'
  | 'status_changed'
  | 'phase_changed'
  | 'task_assigned'
  | 'task_sent_to_po'
  | 'task_approved'
  | 'task_changes_requested'
  | 'task_pending'
  | 'task_resumed'
  | 'squad_changed'
  | 'deadline_changed'
  | 'comment_added'
  | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  requestId?: string;
  taskTitle?: string;
  actorName?: string;
  actorRole?: string;
  recipient?: string;
  targetRole?: string;
  timestamp: string; // ISO 8601 string
  read: boolean;
  link?: string;
}

export interface DispatchNotificationParams {
  type: NotificationType;
  title?: string;
  message?: string;
  requestId?: string;
  taskTitle?: string;
  actorName?: string;
  actorRole?: string;
  recipient?: string;
  targetRole?: string;
  squadName?: string;
  ownerName?: string;
  phaseName?: string;
  statusName?: string;
  note?: string;
  link?: string;
  showToast?: boolean;
  toastType?: 'success' | 'info' | 'warning' | 'error';
  viewers?: string[];
}

