"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
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
      <><Navbar /><main className="min-h-screen bg-[#08111F] text-[#f7ebcf]">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
          <div className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] px-8 py-10 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.2)]">
            <p className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Loading notifications</p>
          </div>
        </div>
      </main><Footer /></>
    );
  }

  return (
    <><Navbar /><main className="min-h-screen bg-[#08111F] text-[#f7ebcf]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12 lg:py-14">
        <section className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Notification center</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2744]">In-app notifications</h1>
              <p className="mt-3 text-sm leading-7 text-[#27405f]">
                Lifecycle updates for introductions, connections, and account verification appear here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void markAllRead();
              }}
              disabled={markingAll || unreadCount === 0}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#aff546] px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#071426] transition hover:bg-[#9fea37] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {markingAll ? "Marking..." : `Mark all read (${unreadCount})`}
            </button>
          </div>
        </section>

        {feedback ? (
          <div className="mt-6 rounded-2xl border border-[#8fdc3a]/60 bg-[#effbd8] px-5 py-4 text-sm font-medium text-[#315d20]">
            {feedback}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-[#c97a78]/50 bg-[#fff0ee] px-5 py-4 text-sm font-medium text-[#7a2927]">
            {error}
          </div>
        ) : null}

        <section className="mt-6 rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] sm:p-8">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cda64d]/50 bg-[#fffaf0] p-6 text-sm leading-7 text-[#27405f]">
              No notifications yet. New workflow events will appear here.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const unread = !item.readAt;
                return (
                  <article
                    key={item.notificationId}
                    className={`rounded-2xl border-l-4 border p-4 ${unread ? "border-[#2bd7ef]/60 border-l-[#2bd7ef] bg-[#effcff]" : "border-[#cda64d]/30 border-l-[#cda64d] bg-[#fffaf0]"}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0f2744]">{item.title}</h2>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${unread ? "bg-[#aff546] text-[#071426]" : "bg-[#efe0b9] text-[#6f5310]"}`}>
                            {unread ? "Unread" : "Read"}
                          </span>
                        </div>
                        {item.body ? (
                          <p className="mt-2 text-sm leading-7 text-[#27405f]">{item.body}</p>
                        ) : null}
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-[#6a7a91]">
                          {formatRelativeTime(item.createdAt)} · {formatDateTime(item.createdAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {item.actionPath ? (
                          <Link
                            href={item.actionPath}
                            className="inline-flex min-h-[40px] items-center rounded-full border border-[#2bd7ef]/55 bg-white px-4 text-sm font-semibold text-[#0f2744] transition hover:bg-[#effcff]"
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
                            className="inline-flex min-h-[40px] items-center rounded-full bg-[#0f2744] px-4 text-sm font-semibold text-[#f7ebcf] transition hover:bg-[#17355f] disabled:cursor-not-allowed disabled:opacity-50"
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
    </main><Footer />
    </>
  );
}
