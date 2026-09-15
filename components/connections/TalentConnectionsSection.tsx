"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { getSessionWithRetry } from "@/lib/supabase-client";
import type {
  TalentConnectionItem,
  TalentConnectionMutationResponse,
  TalentConnectionsResponse,
} from "@/types/connections";
import type {
  IntroductionRequestMutationResponse,
  TalentIntroductionRequestItem,
  TalentIntroductionRequestsResponse,
} from "@/types/introduction-requests";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

export default function TalentConnectionsSection({ view = "connections" }: { view?: "connections" | "introductions" }) {
  const [connections, setConnections] = useState<TalentConnectionItem[]>([]);
  const [requests, setRequests] = useState<TalentIntroductionRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [acceptingRequest, setAcceptingRequest] = useState<TalentIntroductionRequestItem | null>(null);

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
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [connectionsResponse, requestsResponse] = await Promise.all([
        fetch("/api/connections/talent", { headers, cache: "no-store" }),
        fetch("/api/introduction-requests/incoming", { headers, cache: "no-store" }),
      ]);
      const connectionsPayload = (await connectionsResponse.json().catch(() => null)) as TalentConnectionsResponse | null;
      const requestsPayload = (await requestsResponse.json().catch(() => null)) as TalentIntroductionRequestsResponse | null;

      if (!connectionsResponse.ok || !connectionsPayload?.ok || !Array.isArray(connectionsPayload.items)) {
        throw new Error(connectionsPayload?.message ?? "Unable to load your connections.");
      }

      if (!requestsResponse.ok || !requestsPayload?.ok || !Array.isArray(requestsPayload.items)) {
        throw new Error(requestsPayload?.message ?? "Unable to load incoming introductions.");
      }

      setConnections(connectionsPayload.items);
      setRequests(requestsPayload.items);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to load your connections.");
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

  const respondToRequest = async (request: TalentIntroductionRequestItem, action: "accept" | "decline") => {
    const session = await getSessionWithRetry();

    if (!session?.access_token || busyId) {
      setFeedback("Sign in required.");
      return;
    }

    setBusyId(request.requestId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/introduction-requests/${encodeURIComponent(request.requestId)}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = (await response.json().catch(() => null)) as IntroductionRequestMutationResponse | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message ?? "Unable to update this request right now.");
      }

      await loadConnections();
      setFeedback(action === "accept" ? "Introduction request accepted." : "Introduction request declined.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update this request right now.");
    } finally {
      setBusyId(null);
      setAcceptingRequest(null);
    }
  };

  const revokeConnection = async (connectionId: string) => {
    if (busyId) {
      return;
    }

    if (!window.confirm("End this connection? This removes the employer's access to your contact details. Historical introduction records are not deleted.")) {
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
        throw new Error(payload?.message ?? "Unable to end this connection.");
      }

      await loadConnections();
      setFeedback("Connection ended. Employer contact access is now revoked.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to end this connection.");
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = connections.filter((item) => item.status === "active").length;
  const revokedCount = connections.length - activeCount;

  return (
    <section id={view === "introductions" ? "introductions" : "connections"} className="dashboard-panel p-6 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="dashboard-kicker">{view === "introductions" ? "Introduction requests" : "Your network"}</p>
          <h2 className="mt-2 font-serif text-2xl tracking-tight text-[#08111F]">{view === "introductions" ? "Introductions" : "Connections"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[#08111F]/60">
            {view === "introductions" ? "Review employers who have requested an introduction." : "Manage employers who currently have access to your contact details and private files."}
          </p>
        </div>
        {view === "connections" ? <div className="rounded-full bg-[#0f2744] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#f7ebcf]">{connections.length} total / {activeCount} active / {revokedCount} revoked</div> : null}
      </div>

      {feedback ? <div className="mt-5 rounded-xl border border-[#cda64d]/30 bg-[#fff7e3] px-4 py-3 text-sm text-[#27405f]">{feedback}</div> : null}

      <div className="mt-5 space-y-5 border-t border-[#08111F]/15 pt-4">
        <div>
          <p className="dashboard-kicker">Pending requests</p>
          {loading ? <p className="mt-3 text-sm text-[#08111F]/60">Loading connection requests...</p> : requests.filter((request) => request.status === "pending").length === 0 ? <p className="mt-3 text-sm text-[#08111F]/60">No incoming requests yet. Eligible employers can request introductions from your profile.</p> : (
            <div className="mt-2.5 space-y-3">
              {requests.filter((request) => request.status === "pending").map((request) => (
                <article key={request.requestId} className="rounded-xl border border-[#08111F]/15 bg-[#08111F]/[0.04] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-[#08111F]">{request.employerCompanyName ?? "Verified employer"}</p>
                      {request.employerContactName ? <p className="mt-1 text-sm leading-5 text-[#08111F]/70">Contact: {request.employerContactName}{request.employerContactRole ? ` · ${request.employerContactRole}` : ""}</p> : null}
                      <p className="text-sm leading-5 text-[#08111F]/70">Requested {formatDate(request.createdAt)}</p>
                      {request.message ? <p className="mt-3 text-sm leading-6 text-[#08111F]/70">“{request.message}”</p> : null}
                    </div>
                    {request.canTalentRespond ? <div className="flex gap-2"><button type="button" disabled={busyId === request.requestId} onClick={() => setAcceptingRequest(request)} className="dashboard-action"><CheckCircle2 className="h-4 w-4" /> Accept</button><button type="button" disabled={busyId === request.requestId} onClick={() => void respondToRequest(request, "decline")} className="dashboard-action dashboard-action-outline"><XCircle className="h-4 w-4" /> Decline</button></div> : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {view === "connections" ? <div className="pt-1">
          <p className="dashboard-kicker">Connection history</p>
          <p className="mt-2 rounded-xl border border-[#cda64d]/30 bg-[#fff7e3] px-4 py-3 text-sm leading-5 text-[#27405f]">Ending a connection removes that employer&apos;s access to your contact details. It does not delete historical introduction request records.</p>
          {loading ? <p className="mt-3 text-sm text-[#08111F]/60">Loading connections...</p> : connections.length === 0 ? <p className="mt-3 text-sm text-[#08111F]/60">No employer connections yet.</p> : (
            <div className="mt-2.5 space-y-3">
              {connections.map((connection) => <article key={connection.connectionId} className="rounded-xl border border-[#08111F]/15 bg-[#08111F]/[0.04] p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-lg font-semibold text-[#08111F]">{connection.employerCompanyName ?? "Verified employer"}</p><span className="rounded-full bg-[#AFF546] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#08111F]">{connection.status}</span></div>{connection.employerContactName ? <p className="mt-1 text-sm leading-5 text-[#27405f]">Contact: {connection.employerContactName}{connection.employerContactRole ? ` · ${connection.employerContactRole}` : ""}</p> : null}<p className="text-sm leading-5 text-[#27405f]">Connected {formatDate(connection.connectedAt)}</p>{connection.revokedAt ? <p className="text-sm leading-5 text-[#27405f]">Revoked {formatDate(connection.revokedAt)}</p> : null}</div>{connection.status === "active" ? <button type="button" onClick={() => void revokeConnection(connection.connectionId)} disabled={busyId === connection.connectionId} className="inline-flex min-h-11 items-center rounded-full border border-[#9f3a2b]/25 bg-[#9f3a2b] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] transition hover:bg-[#8d3326] disabled:opacity-60">{busyId === connection.connectionId ? "Ending connection" : "End connection"}</button> : null}</div></article>)}
            </div>
          )}
        </div> : null}
      </div>

      {acceptingRequest ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08111F]/70 p-5" role="dialog" aria-modal="true" aria-labelledby="confidential-acceptance-title"><div className="w-full max-w-lg rounded-2xl border border-[#cda64d]/45 bg-[#f7ebcf] p-6 text-[#08111F] shadow-2xl sm:p-8"><p className="dashboard-kicker">Confidential Mode</p><h3 id="confidential-acceptance-title" className="mt-3 font-serif text-2xl">Reveal your profile to this employer?</h3><p className="mt-4 text-sm leading-7">By accepting this connection, your Talent Card and Talent Passport will be unveiled to this employer, including the details you keep hidden in Confidential Mode. Your information will only be visible to this connection.</p><div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setAcceptingRequest(null)} className="dashboard-action dashboard-action-outline">Cancel</button><button type="button" disabled={busyId === acceptingRequest.requestId} onClick={() => void respondToRequest(acceptingRequest, "accept")} className="dashboard-talent-green-action">Accept connection</button></div></div></div> : null}
    </section>
  );
}
