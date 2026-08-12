import "server-only";

import { createUserServerSupabaseClient } from "@/lib/server-supabase";
import type {
  NotificationErrorReason,
  NotificationItem,
  NotificationMutationResponse,
  NotificationsListResponse,
  NotificationUnreadCountResponse,
} from "@/types/notifications";

type NotificationRow = {
  notification_id: string;
  notification_type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
  action_path: string | null;
};

type ReadRow = {
  success: boolean;
  notification_id: string;
  read_at: string | null;
};

type ReadAllRow = {
  success: boolean;
  updated_count: number;
};

type UnreadCountRow = {
  unread_count: number;
};

function getUserClient(accessToken: string | null | undefined) {
  if (!accessToken) {
    return null;
  }

  return createUserServerSupabaseClient(accessToken);
}

function mapReasonFromError(message: string): NotificationErrorReason {
  if (message.includes("not_signed_in")) return "not_signed_in";
  if (message.includes("missing_notification_id")) return "missing_notification_id";
  if (message.includes("notification_not_found")) return "notification_not_found";
  return "error";
}

async function callRpc<TData>(
  userClient: NonNullable<ReturnType<typeof getUserClient>>,
  fn: string,
  args?: Record<string, unknown>,
): Promise<{ data: TData | null; error: { message: string } | null }> {
  return (userClient as unknown as {
    rpc: (name: string, params?: Record<string, unknown>) => Promise<{ data: TData | null; error: { message: string } | null }>;
  }).rpc(fn, args);
}

function mapNotificationItem(row: NotificationRow): NotificationItem {
  return {
    notificationId: row.notification_id,
    notificationType: row.notification_type,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    readAt: row.read_at,
    createdAt: row.created_at,
    actionPath: row.action_path,
  };
}

export async function listMyNotifications(
  accessToken: string | null | undefined,
  limit?: number,
  unreadOnly?: boolean,
): Promise<NotificationsListResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required.", items: [] };
  }

  const sanitizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit as number))) : 20;

  const { data, error } = await callRpc<NotificationRow[]>(userClient, "list_my_notifications", {
    p_limit: sanitizedLimit,
    p_unread_only: Boolean(unreadOnly),
  });

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
      items: [],
    };
  }

  return {
    ok: true,
    items: (data ?? []).map(mapNotificationItem),
  };
}

export async function markNotificationRead(
  accessToken: string | null | undefined,
  notificationId: string,
): Promise<NotificationMutationResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  if (!notificationId.trim()) {
    return { ok: false, reason: "missing_notification_id", message: "Notification id is required." };
  }

  const { data, error } = await callRpc<ReadRow[]>(userClient, "mark_notification_read", {
    p_notification_id: notificationId,
  });

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
    };
  }

  const row = data?.[0];
  return {
    ok: true,
    notificationId: row?.notification_id,
    readAt: row?.read_at ?? null,
  };
}

export async function markAllNotificationsRead(
  accessToken: string | null | undefined,
): Promise<NotificationMutationResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await callRpc<ReadAllRow[]>(userClient, "mark_all_notifications_read");

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
    };
  }

  const row = data?.[0];
  return {
    ok: true,
    updatedCount: row?.updated_count ?? 0,
  };
}

export async function getUnreadNotificationCount(
  accessToken: string | null | undefined,
): Promise<NotificationUnreadCountResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await callRpc<UnreadCountRow[]>(userClient, "get_unread_notification_count");

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
    };
  }

  return {
    ok: true,
    unreadCount: data?.[0]?.unread_count ?? 0,
  };
}
