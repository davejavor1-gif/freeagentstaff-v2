"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import type { NotificationItem } from "@/types/notifications";

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown time";
  }

  return parsed.toLocaleString();
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "";
  }

  const now = Date.now();
  const deltaMs = Math.max(0, now - timestamp);
  const deltaMinutes = Math.floor(deltaMs / 60000);

  if (deltaMinutes < 1) return "just now";
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;

  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
}

export default function NotificationsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadNotifications = useCallback(async (currentSession: Session) => {
    setError(null);

    const response = await fetch("/api/notifications?limit=50", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; items?: NotificationItem[]; message?: string }
      | null;

    if (!response.ok || !payload?.ok) {
      setItems([]);
      setError(payload?.message ?? "Unable to load notifications right now.");
      return;
    }

    setItems(Array.isArray(payload.items) ? payload.items : []);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const activeSession = await getSessionWithRetry();

      if (!mounted) {
        return;
      }

      if (!activeSession) {
        router.replace("/login");
        return;
      }

      setSession(activeSession);
      await loadNotifications(activeSession);
      if (mounted) {
        setLoading(false);
      }
    }

    void hydrate();

    const { data: listener } = supabase.auth.onAuthStateChange((_, currentSession) => {
      if (!mounted) {
        return;
      }

      if (!currentSession) {
        router.replace("/login");
        return;
      }

      setSession(currentSession);
      void loadNotifications(currentSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadNotifications, router]);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.readAt).length,
    [items],
  );

  const markRead = async (notificationId: string) => {
    if (!session?.access_token) {
      return;
    }

    setFeedback(null);
    setError(null);
    setProcessingId(notificationId);

    try {
      const response = await fetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? "Unable to mark this notification as read.");
        return;
      }

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.notificationId === notificationId
            ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
            : item,
        ),
      );
      setFeedback("Notification marked as read.");
    } catch {
      setError("Unable to mark this notification as read.");
    } finally {
      setProcessingId(null);
    }
  };

  const markAllRead = async () => {
    if (!session?.access_token || unreadCount === 0) {
      return;
    }

    setFeedback(null);
    setError(null);
    setMarkingAll(true);

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? "Unable to mark notifications as read.");
        return;
      }

      const now = new Date().toISOString();
      setItems((currentItems) => currentItems.map((item) => ({ ...item, readAt: item.readAt ?? now })));
      setFeedback("All notifications marked as read.");
    } catch {
      setError("Unable to mark notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
          <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-lg shadow-slate-200/40">
            <p className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Loading notifications</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12 lg:py-14">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/35 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Notification center</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">In-app notifications</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Lifecycle updates for introductions, connections, and account verification appear here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void markAllRead();
              }}
              disabled={markingAll || unreadCount === 0}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {markingAll ? "Marking..." : `Mark all read (${unreadCount})`}
            </button>
          </div>
        </section>

        {feedback ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
            {feedback}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800">
            {error}
          </div>
        ) : null}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/35 sm:p-8">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
              No notifications yet. New workflow events will appear here.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const unread = !item.readAt;
                return (
                  <article
                    key={item.notificationId}
                    className={`rounded-2xl border p-4 ${unread ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-slate-50"}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">{item.title}</h2>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                            {unread ? "Unread" : "Read"}
                          </span>
                        </div>
                        {item.body ? (
                          <p className="mt-2 text-sm leading-7 text-slate-600">{item.body}</p>
                        ) : null}
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                          {formatRelativeTime(item.createdAt)} · {formatDateTime(item.createdAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {item.actionPath ? (
                          <Link
                            href={item.actionPath}
                            className="inline-flex min-h-[40px] items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            Open
                          </Link>
                        ) : null}
                        {unread ? (
                          <button
                            type="button"
                            onClick={() => {
                              void markRead(item.notificationId);
                            }}
                            disabled={processingId === item.notificationId}
                            className="inline-flex min-h-[40px] items-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {processingId === item.notificationId ? "Marking..." : "Mark read"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
