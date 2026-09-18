"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSessionWithRetry } from "@/lib/supabase-client";
import type {
  EmployerConnectionItem,
  EmployerConnectionsResponse,
  TalentConnectionMutationResponse,
} from "@/types/connections";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

export default function EmployerConnectionsSection() {
  const [connections, setConnections] = useState<EmployerConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [disconnectConfirmId, setDisconnectConfirmId] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    const session = await getSessionWithRetry();

    if (!session?.access_token) {
      setFeedback("Sign in required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/connections/employer", {
        method: "GET",
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as EmployerConnectionsResponse | null;

      if (!response.ok || !payload?.ok || !Array.isArray(payload.items)) {
        throw new Error(payload?.message ?? "Unable to load connected talent.");
      }

      setConnections(payload.items);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to load connected talent.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadConnections();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [loadConnections]);

  const disconnectEmployerConnection = async (connectionId: string) => {
    if (busyId) {
      return;
    }

    const session = await getSessionWithRetry();
    if (!session?.access_token) {
      setFeedback("Sign in required.");
      return;
    }

    setBusyId(connectionId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/connections/${encodeURIComponent(connectionId)}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = (await response.json().catch(() => null)) as TalentConnectionMutationResponse | null;

      if (!response.ok || !payload?.ok) {
        setFeedback(payload?.message ?? "Unable to disconnect from this Talent.");
        return;
      }

      setDisconnectConfirmId(null);
      await loadConnections();
      setFeedback("Disconnected. Connection-derived access has been revoked.");
    } catch {
      setFeedback("Unable to disconnect from this Talent.");
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = connections.filter((item) => item.status === "active").length;
  const revokedCount = connections.filter((item) => item.status === "revoked").length;

  return (
    <section id="connections" className="dashboard-panel p-6 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="dashboard-kicker">Your network</p>
          <h2 className="mt-2 font-serif text-2xl tracking-tight text-[#08111F]">Connected talent</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[#08111F]/60">
            Manage the talent you&apos;re currently connected with and the access created through those connections.
          </p>
        </div>
        <div className="rounded-full bg-[#0f2744] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#f7ebcf]">
          {connections.length} total / {activeCount} active / {revokedCount} revoked
        </div>
      </div>

      {feedback ? <div className="mt-5 rounded-xl border border-[#cda64d]/30 bg-[#fff7e3] px-4 py-3 text-sm text-[#27405f]">{feedback}</div> : null}

      <div className="mt-5 space-y-5 border-t border-[#08111F]/15 pt-4">
        <div className="pt-1">
          <p className="dashboard-kicker">Connection history</p>
          <p className="mt-2 rounded-xl border border-[#cda64d]/30 bg-[#fff7e3] px-4 py-3 text-sm leading-5 text-[#27405f]">
            Ending a connection removes the access provided by that connection. Saved and shortlisted talent are not removed.
          </p>
          {loading ? (
            <p className="mt-3 text-sm text-[#08111F]/60">Loading connections...</p>
          ) : connections.length === 0 ? (
            <p className="mt-3 text-sm text-[#08111F]/60">Connections are created when introductions are accepted.</p>
          ) : (
            <div className="mt-2.5 space-y-3">
              {connections.map((connection) => {
                const displayName = connection.talent?.name ?? "Confidential talent";
                const headline = connection.talent?.title ?? connection.talent?.focusArea ?? "Professional profile";

                return (
                  <article key={connection.connectionId} className="rounded-xl border border-[#08111F]/15 bg-[#08111F]/[0.04] p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-[#08111F]">{displayName}</p>
                          <span
                            className={
                              connection.status === "active"
                                ? "rounded-full bg-[#AFF546] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#08111F]"
                                : "rounded-full border border-[#08111F]/20 bg-[#08111F]/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#08111F]/60"
                            }
                          >
                            {connection.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-5 text-[#27405f]">{headline}</p>
                        <p className="text-sm leading-5 text-[#27405f]">Connected {formatDate(connection.connectedAt)}</p>
                        {connection.revokedAt ? <p className="text-sm leading-5 text-[#27405f]">Revoked {formatDate(connection.revokedAt)}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        {connection.talent?.slug && connection.isCurrentlyEligible ? (
                          <Link
                            href={`/talent/${connection.talent.slug}`}
                            className="inline-flex min-h-11 items-center rounded-full bg-[#2BD7EF] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#08111F] transition hover:brightness-105"
                          >
                            View Talent Passport + Contact Details
                          </Link>
                        ) : null}
                        {connection.status === "active" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDisconnectConfirmId(connection.connectionId);
                            }}
                            disabled={busyId === connection.connectionId}
                            className="inline-flex min-h-11 items-center rounded-full border border-[#9f3a2b]/25 bg-[#9f3a2b] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] transition hover:bg-[#8d3326] disabled:opacity-60"
                          >
                            {busyId === connection.connectionId ? "Disconnecting" : "Disconnect"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {disconnectConfirmId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#08111F]/70 p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="disconnect-talent-title"
          onClick={() => {
            if (!busyId) {
              setDisconnectConfirmId(null);
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#cda64d]/45 bg-[#f7ebcf] p-6 text-[#08111F] shadow-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="disconnect-talent-title" className="font-serif text-2xl">Disconnect from this Talent?</h2>
            <p className="mt-4 text-sm leading-7 text-[#27405f]">You will lose the access provided by your active connection.</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDisconnectConfirmId(null);
                }}
                disabled={Boolean(busyId)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#0f2744]/20 bg-white px-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0f2744]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void disconnectEmployerConnection(disconnectConfirmId);
                }}
                disabled={Boolean(busyId)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#9f3a2b]/25 bg-[#9f3a2b] px-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] disabled:opacity-60"
              >
                {busyId ? "Disconnecting" : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
