"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Session } from "@supabase/supabase-js";
import { ShieldCheck, Trash2 } from "lucide-react";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import Footer from "@/components/layout/Footer";
import type { NotificationItem, NotificationType } from "@/types/notifications";

const BRAND = {
  green: "#AFF546",
  blue: "#2BD7EF",
  burgundy: "#651D2A",
  gold: "#cda64d",
} as const;

const SLIP_ICON_BOX = "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center sm:mt-0";
const SLIP_ICON_SIZE = 24;

const SLIP_ICONS = {
  introductionRequest: "/introduction request.png",
  connectionAccepted: "/connection accepted.png",
  connection: "/newconnection.png",
  privateAccess: "/private access requet.png",
  employerVerified: "/employer verified.png",
} as const;

type SlipTone = {
  accent: string;
  category: string;
  iconSrc?: string;
  Icon?: typeof ShieldCheck;
};

function slipTone(notificationType: NotificationItem["notificationType"]): SlipTone {
  const type = notificationType as NotificationType | string;

  if (type === "intro_request_received" || type === "intro_request_declined") {
    return { accent: BRAND.green, category: "Introduction request", iconSrc: SLIP_ICONS.introductionRequest };
  }

  if (type === "intro_request_accepted") {
    return { accent: BRAND.green, category: "Connection accepted", iconSrc: SLIP_ICONS.connectionAccepted };
  }

  if (type === "connection_revoked") {
    return { accent: BRAND.blue, category: "Connection", iconSrc: SLIP_ICONS.connection };
  }

  if (
    type === "private_access_request_received" ||
    type === "private_access_request_accepted" ||
    type === "private_access_request_declined" ||
    type === "private_access_request_revoked"
  ) {
    return { accent: BRAND.burgundy, category: "Private access", iconSrc: SLIP_ICONS.privateAccess };
  }

  if (type === "verification_approved") {
    return { accent: BRAND.gold, category: "Account", iconSrc: SLIP_ICONS.employerVerified };
  }

  return { accent: BRAND.gold, category: "Account", Icon: ShieldCheck };
}

function SlipTypeIcon({ src }: { src: string }) {
  const padded = src === SLIP_ICONS.connection;

  return (
    <span className={SLIP_ICON_BOX}>
      <Image
        src={src}
        alt=""
        width={SLIP_ICON_SIZE}
        height={SLIP_ICON_SIZE}
        className={padded ? "h-[1.65rem] w-[1.65rem] object-contain" : "h-6 w-6 object-contain"}
        unoptimized
        draggable={false}
      />
    </span>
  );
}

function formatSlipDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown time";
  }

  const day = parsed.getDate();
  const month = parsed.toLocaleString("en-GB", { month: "short" }).toUpperCase();
  const time = parsed.toLocaleString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();

  return `${day} ${month} · ${time}`;
}

export default function NotificationsPage({ embedded = false }: { embedded?: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [accountType, setAccountType] = useState<"talent" | "employer" | null>(null);
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
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("user_id", activeSession.user.id)
        .maybeSingle();
      if (mounted) {
        const resolvedAccountType = (profileRow as { account_type?: string } | null)?.account_type;
        setAccountType(resolvedAccountType === "employer" ? "employer" : resolvedAccountType === "talent" ? "talent" : null);
      }
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

  const markReadQuietly = async (notificationId: string) => {
    if (!session?.access_token) {
      return false;
    }

    try {
      const response = await fetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean } | null;

      if (!response.ok || !payload?.ok) {
        return false;
      }

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.notificationId === notificationId
            ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
            : item,
        ),
      );
      window.dispatchEvent(new Event("freeagent:notifications-changed"));
      return true;
    } catch {
      return false;
    }
  };

  const openNotification = async (item: NotificationItem) => {
    if (!item.actionPath) {
      return;
    }

    if (!item.readAt) {
      await markReadQuietly(item.notificationId);
    }

    router.push(item.actionPath);
  };

  const deleteOneNotification = async (notificationId: string) => {
    if (!session?.access_token || deletingId || deletingAll) {
      return;
    }

    setFeedback(null);
    setError(null);
    setDeletingId(notificationId);

    try {
      const response = await fetch(`/api/notifications/${encodeURIComponent(notificationId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? "Unable to delete this notification.");
        return;
      }

      setItems((currentItems) => currentItems.filter((item) => item.notificationId !== notificationId));
      window.dispatchEvent(new Event("freeagent:notifications-changed"));
    } catch {
      setError("Unable to delete this notification.");
    } finally {
      setDeletingId(null);
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
      window.dispatchEvent(new Event("freeagent:notifications-changed"));
      setFeedback("All notifications marked as read.");
    } catch {
      setError("Unable to mark notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteAllNotifications = async () => {
    if (!session?.access_token || deletingAll) {
      return;
    }

    setFeedback(null);
    setError(null);
    setDeletingAll(true);

    try {
      const response = await fetch(accountType === "employer" ? "/api/notifications/employer" : "/api/notifications", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? "Unable to delete notifications.");
        return;
      }

      setItems([]);
      setDeleteConfirmationOpen(false);
      setFeedback("Notifications deleted.");
      window.dispatchEvent(new Event("freeagent:notifications-changed"));
    } catch {
      setError("Unable to delete notifications.");
    } finally {
      setDeletingAll(false);
    }
  };

  if (loading) {
    return (
      <><main className={embedded ? "" : "min-h-screen bg-[#08111F] text-[#f7ebcf]"}>
        <div className={embedded ? "dashboard-panel p-6 sm:p-7" : "mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16"}>
          <div className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] px-8 py-10 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.2)]">
            <p className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Loading notifications</p>
          </div>
        </div>
      </main>{embedded ? null : <Footer />}</>
    );
  }

  return (
    <><main className={embedded ? "" : "min-h-screen bg-[#08111F] text-[#f7ebcf]"}>
      <div className={embedded ? "dashboard-panel p-6 sm:p-7" : "mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12 lg:py-14"}>
        <section className={embedded ? "" : "rounded-[18px] border border-[#08111F]/15 bg-[#f7e8c6] p-6 text-[#0f2744] shadow-[0_18px_45px_rgba(0,0,0,0.16)] sm:p-8"}>
          <div className="flex flex-col gap-4 border-b border-[#08111F]/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="dashboard-kicker">Notification center</p>
              <h1 className="mt-2 font-serif text-2xl tracking-tight text-[#08111F] sm:text-3xl">In-app notifications</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#08111F]/60">
                Lifecycle updates for introductions, connections, and account verification appear here.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <button
                type="button"
                onClick={() => {
                  void markAllRead();
                }}
                disabled={markingAll || unreadCount === 0}
                className="inline-flex min-h-10 items-center rounded-full bg-[#08111F] px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f7ebcf] transition hover:bg-[#17355f] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {markingAll ? "Marking..." : `Mark all read${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
              </button>
              {accountType ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmationOpen(true)}
                  disabled={items.length === 0}
                  className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9f3a2b]/80 underline-offset-4 transition hover:text-[#9f3a2b] hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Delete notifications
                </button>
              ) : null}
            </div>
          </div>

          {feedback ? (
            <div className="mt-5 rounded-xl border border-[#cda64d]/30 bg-[#fff7e3] px-4 py-3 text-sm text-[#27405f]">
              {feedback}
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-xl border border-[#9f3a2b]/25 bg-[#fff0ee] px-4 py-3 text-sm text-[#7a2927]">
              {error}
            </div>
          ) : null}

          <div className="mt-5">
            {items.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#cda64d]/45 bg-[#fffaf0] px-4 py-6 text-sm leading-7 text-[#27405f]">
                No notifications yet. New workflow events will appear here.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const unread = !item.readAt;
                  const tone = slipTone(item.notificationType);
                  const FallbackIcon = tone.Icon;
                  const hasDestination = Boolean(item.actionPath);

                  return (
                    <article
                      key={item.notificationId}
                      className={`relative overflow-hidden rounded-md border pl-0 ${
                        unread
                          ? "border-[#08111F]/20 bg-[#fffdf6] shadow-[0_8px_18px_rgba(6,16,33,0.06)]"
                          : "border-[#08111F]/10 bg-[#fffaf0]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-[3px]"
                        style={{ backgroundColor: tone.accent, opacity: unread ? 1 : 0.55 }}
                      />
                      {unread ? (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute right-0 top-0 h-0 w-0 border-l-[10px] border-t-[10px] border-l-transparent"
                          style={{ borderTopColor: tone.accent }}
                        />
                      ) : null}
                      <div className="flex items-start gap-2 pl-5 pr-2 py-3.5 sm:items-center">
                        <div
                          className={`flex min-w-0 flex-1 items-start gap-3 pr-1 sm:items-center ${hasDestination ? "cursor-pointer" : ""}`}
                          onClick={() => {
                            if (hasDestination) {
                              void openNotification(item);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (!hasDestination) {
                              return;
                            }
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              void openNotification(item);
                            }
                          }}
                          role={hasDestination ? "link" : undefined}
                          tabIndex={hasDestination ? 0 : undefined}
                        >
                          {tone.iconSrc ? (
                            <SlipTypeIcon src={tone.iconSrc} />
                          ) : FallbackIcon ? (
                            <FallbackIcon
                              className="mt-0.5 h-6 w-6 shrink-0 fill-current sm:mt-0"
                              strokeWidth={2}
                              aria-hidden="true"
                              style={{ color: tone.accent }}
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: tone.accent }}>
                                {tone.category}
                              </p>
                              {unread ? (
                                <span className="rounded-full bg-[#AFF546] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#08111F]">
                                  New
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm font-semibold leading-6 text-[#08111F]">{item.title}</p>
                            {item.body ? <p className="mt-0.5 text-sm leading-6 text-[#27405f]">{item.body}</p> : null}
                            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#08111F]/40">
                              {formatSlipDate(item.createdAt)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Delete notification"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void deleteOneNotification(item.notificationId);
                          }}
                          disabled={deletingId === item.notificationId || deletingAll}
                          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9f3a2b]/70 transition hover:bg-[#9f3a2b]/10 hover:text-[#9f3a2b] disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>{embedded ? null : <Footer />}
    {deleteConfirmationOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08111F]/70 p-5" role="dialog" aria-modal="true" aria-labelledby="delete-notifications-title">
      <div className="w-full max-w-lg rounded-2xl border border-[#cda64d]/45 bg-[#f7ebcf] p-6 text-[#08111F] shadow-2xl sm:p-8">
        <h2 id="delete-notifications-title" className="font-serif text-2xl">DELETE NOTIFICATIONS?</h2>
        <p className="mt-4 text-sm leading-7 text-[#27405f]">Are you sure you want to delete all your notifications? This cannot be undone.</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => setDeleteConfirmationOpen(false)} disabled={deletingAll} className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#0f2744]/20 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#071426] transition hover:bg-[#fffaf0] disabled:opacity-50">CANCEL</button>
          <button type="button" onClick={() => { void deleteAllNotifications(); }} disabled={deletingAll} className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#d85a4f] px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#08111F] transition hover:bg-[#c64940] disabled:cursor-not-allowed disabled:opacity-50">{deletingAll ? "DELETING..." : "DELETE NOTIFICATIONS"}</button>
        </div>
      </div>
    </div> : null}
    </>
  );
}
