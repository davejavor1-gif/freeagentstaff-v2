export type NotificationType =
  | "intro_request_received"
  | "intro_request_accepted"
  | "intro_request_declined"
  | "connection_revoked"
  | "verification_approved"
  | "verification_rejected"
  | "private_access_request_received"
  | "private_access_request_accepted"
  | "private_access_request_declined"
  | "private_access_request_revoked";

export type NotificationErrorReason =
  | "not_signed_in"
  | "missing_notification_id"
  | "notification_not_found"
  | "error";

export interface NotificationItem {
  notificationId: string;
  notificationType: NotificationType | string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  actionPath: string | null;
}

export interface NotificationsListResponse {
  ok: boolean;
  reason?: NotificationErrorReason;
  message?: string;
  items: NotificationItem[];
}

export interface NotificationMutationResponse {
  ok: boolean;
  reason?: NotificationErrorReason;
  message?: string;
  notificationId?: string;
  readAt?: string | null;
  updatedCount?: number;
}

export interface NotificationUnreadCountResponse {
  ok: boolean;
  reason?: NotificationErrorReason;
  message?: string;
  unreadCount?: number;
}
