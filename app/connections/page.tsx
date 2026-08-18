"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import type {
  EmployerConnectionItem,
  EmployerConnectionsResponse,
  TalentConnectionItem,
  TalentConnectionMutationResponse,
  TalentConnectionsResponse,
} from "@/types/connections";
import type { AccountType, EmployerVerificationStatus } from "@/types/freeagent";

type ContactApiResponse = {
  ok?: boolean;
  contact?: { email?: string };
  message?: string;
};

type ContactState = {
  email: string | null;
  loading: boolean;
  message: string | null;
};

export default function ConnectionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<EmployerVerificationStatus>("unverified");
  const [employerItems, setEmployerItems] = useState<EmployerConnectionItem[]>([]);
  const [talentItems, setTalentItems] = useState<TalentConnectionItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyConnectionId, setBusyConnectionId] = useState<string | null>(null);
  const [contactByConnectionId, setContactByConnectionId] = useState<Record<string, ContactState>>({});

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setFeedback(null);

    try {
      const session = await getSessionWithRetry();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("account_type, employer_verification_status")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const row = (profileRow as {
        account_type?: AccountType;
        employer_verification_status?: EmployerVerificationStatus;
      } | null | undefined) ?? null;

      const resolvedAccountType: AccountType = row?.account_type === "employer" ? "employer" : "talent";
      const resolvedVerification = row?.employer_verification_status ?? "unverified";

      setAccountType(resolvedAccountType);
      setVerificationStatus(resolvedVerification);
      setContactByConnectionId({});

      if (resolvedAccountType === "employer") {
        const response = await fetch("/api/connections/employer", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as EmployerConnectionsResponse | null;

        if (!payload?.ok || !Array.isArray(payload.items)) {
          setEmployerItems([]);
          setTalentItems([]);
          setFeedback(payload?.message ?? "Unable to load your employer connections.");
          return;
        }

        setEmployerItems(payload.items);
        setTalentItems([]);
        return;
      }

      const response = await fetch("/api/connections/talent", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as TalentConnectionsResponse | null;

      if (!payload?.ok || !Array.isArray(payload.items)) {
        setEmployerItems([]);
        setTalentItems([]);
        setFeedback(payload?.message ?? "Unable to load your connections.");
        return;
      }

      setEmployerItems([]);
      setTalentItems(payload.items);
    } catch {
      setFeedback("Unable to load your connections.");
      setEmployerItems([]);
      setTalentItems([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadConnections();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loadConnections]);

  const employerSummaryText = useMemo(() => {
    if (employerItems.length === 0) {
      return "No connections yet";
    }

    const activeCount = employerItems.filter((item) => item.status === "active").length;
    return `${employerItems.length} total · ${activeCount} active`;
  }, [employerItems]);

  const talentSummaryText = useMemo(() => {
    if (talentItems.length === 0) {
      return "No employer connections yet";
    }

    const activeCount = talentItems.filter((item) => item.status === "active").length;
    const revokedCount = talentItems.length - activeCount;
    return `${talentItems.length} total · ${activeCount} active · ${revokedCount} revoked`;
  }, [talentItems]);

  const loadEmployerContact = async (connection: EmployerConnectionItem) => {
    if (!connection.talent?.slug) {
      return;
    }

    const session = await getSessionWithRetry();
    if (!session?.access_token) {
      setFeedback("Sign in required.");
      return;
    }

    setContactByConnectionId((current) => ({
      ...current,
      [connection.connectionId]: {
        email: null,
        loading: true,
        message: null,
      },
    }));

    try {
      const response = await fetch(`/api/talent/${encodeURIComponent(connection.talent.slug)}/contact`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as ContactApiResponse | null;

      if (!response.ok || !payload?.ok || !payload.contact?.email) {
        setContactByConnectionId((current) => ({
          ...current,
          [connection.connectionId]: {
            email: null,
            loading: false,
            message: payload?.message ?? "Contact details are currently unavailable.",
          },
        }));
        return;
      }

      setContactByConnectionId((current) => ({
        ...current,
        [connection.connectionId]: {
          email: payload.contact?.email ?? null,
          loading: false,
          message: null,
        },
      }));
    } catch {
      setContactByConnectionId((current) => ({
        ...current,
        [connection.connectionId]: {
          email: null,
          loading: false,
          message: "Contact details are currently unavailable.",
        },
      }));
    }
  };

  const revokeConnection = async (connectionId: string) => {
    if (busyConnectionId) {
      return;
    }

    const confirmed = window.confirm(
      "End this connection? This removes the employer's access to your contact details. Historical introduction records are not deleted.",
    );

    if (!confirmed) {
      return;
    }

    const session = await getSessionWithRetry();
    if (!session?.access_token) {
      setFeedback("Sign in required.");
      return;
    }

    setBusyConnectionId(connectionId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/connections/${encodeURIComponent(connectionId)}/revoke`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as TalentConnectionMutationResponse | null;

      if (!response.ok || !payload?.ok) {
        setFeedback(payload?.message ?? "Unable to end this connection.");
        return;
      }

      await loadConnections();
      setFeedback("Connection ended. Employer contact access is now revoked.");
    } catch {
      setFeedback("Unable to end this connection.");
    } finally {
      setBusyConnectionId(null);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
        <Navbar />
        <section className="flex-1 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
          <div className="rounded-[32px] border border-[#cda64d]/45 bg-[#f7ebcf]/85 p-8 shadow-[0_18px_55px_rgba(6,16,33,0.12)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0f2744]">Loading connections</p>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
      <Navbar />
      <section className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
        <div className="rounded-[36px] border border-[#cda64d]/45 bg-[#f7ebcf]/78 p-5 shadow-[0_18px_55px_rgba(6,16,33,0.12)] sm:p-7 lg:p-8">
          <header className="flex flex-col gap-4 border-b border-[#cda64d]/30 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                {accountType === "employer" ? "Employer workspace" : "Talent workspace"}
              </p>
              <h1 className="mt-3 text-4xl font-black uppercase tracking-[0.12em] text-[#0f2744] sm:text-5xl">Connections</h1>
              <p className="mt-3 text-base font-semibold text-[#17355f] sm:text-lg">
                {accountType === "employer"
                  ? "Manage active connection access and open Talent Passports."
                  : "Manage employers who currently have access to your contact details and private files."}
              </p>
            </div>
            <div className="rounded-[20px] border border-[#cda64d]/35 bg-[#0f2744] px-4 py-3 text-sm text-[#f7ebcf]">
              {accountType === "employer" ? employerSummaryText : talentSummaryText}
            </div>
          </header>

          {feedback ? (
            <div className="mt-4 rounded-[20px] border border-[#cda64d]/30 bg-[#fff5db] px-4 py-3 text-sm text-[#27405f]">
              {feedback}
            </div>
          ) : null}

          {accountType === "employer" && verificationStatus !== "verified" ? (
            <div className="mt-6 rounded-[24px] border border-amber-300/40 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              Employer Connections are available only to currently verified employer accounts.
            </div>
          ) : null}

          {accountType === "employer" && verificationStatus === "verified" ? (
            <div className="mt-6 space-y-4">
              {employerItems.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#cda64d]/45 bg-[#fff7e3] px-5 py-8 text-sm text-[#27405f]">
                  No employer-talent connections yet. Start with Find Talent and introduction requests.
                </div>
              ) : (
                employerItems.map((item) => {
                  const contactState = contactByConnectionId[item.connectionId];
                  const displayName = item.talent?.name ?? "Profile currently unavailable";

                  return (
                    <article key={item.connectionId} className="rounded-[24px] border border-[#cda64d]/35 bg-white/90 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0f2744]">{displayName}</p>
                            <span className="rounded-full bg-[#0f2744] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]">
                              {item.status}
                            </span>
                            <span className="rounded-full border border-[#cda64d]/40 bg-[#fff5db] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f5315]">
                              {item.isCurrentlyEligible ? "currently eligible" : "currently unavailable"}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-[#27405f]">Connected {new Date(item.connectedAt).toLocaleString()}</p>
                          {item.revokedAt ? (
                            <p className="text-sm text-[#27405f]">Revoked {new Date(item.revokedAt).toLocaleString()}</p>
                          ) : null}

                          {item.talent ? (
                            <>
                              <p className="mt-3 text-sm text-[#27405f]">{item.talent.title ?? item.talent.focusArea}</p>
                              <p className="text-sm text-[#27405f]">{item.talent.location}</p>
                            </>
                          ) : (
                            <p className="mt-3 text-sm text-[#27405f]">
                              Talent details are unavailable because current privacy, publication, or eligibility settings restrict access.
                            </p>
                          )}

                          {contactState?.email ? (
                            <p className="mt-3 text-sm text-[#27405f]">
                              Email: <a className="underline decoration-[#cda64d] underline-offset-2" href={`mailto:${contactState.email}`}>{contactState.email}</a>
                            </p>
                          ) : null}
                          {!contactState?.email && contactState?.message ? (
                            <p className="mt-3 text-sm text-[#27405f]">{contactState.message}</p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {item.talent?.slug && item.isCurrentlyEligible ? (
                            <Link
                              href={`/talent/${item.talent.slug}`}
                              className="inline-flex min-h-11 items-center rounded-full border border-[#0f2744]/25 bg-[#f7ebcf] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0f2744] transition hover:bg-[#e9d88f]"
                            >
                              View Talent Passport
                            </Link>
                          ) : null}

                          {item.talent?.slug && item.status === "active" && item.isCurrentlyEligible ? (
                            <button
                              type="button"
                              onClick={() => {
                                void loadEmployerContact(item);
                              }}
                              disabled={contactState?.loading === true}
                              className="inline-flex min-h-11 items-center rounded-full border border-[#0f2744]/25 bg-[#0f2744] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] transition hover:bg-[#17355f] disabled:opacity-60"
                            >
                              {contactState?.loading ? "Loading contact" : "View contact details"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          ) : null}

          {accountType === "talent" ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-[20px] border border-[#cda64d]/30 bg-[#fff7e3] px-4 py-3 text-sm text-[#27405f]">
                Ending a connection removes that employer&apos;s access to your contact details. It does not delete historical introduction request records.
              </div>

              {talentItems.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#cda64d]/45 bg-[#fff7e3] px-5 py-8 text-sm text-[#27405f]">
                  No employer connections yet.
                </div>
              ) : (
                talentItems.map((item) => (
                  <article key={item.connectionId} className="rounded-[24px] border border-[#cda64d]/35 bg-white/90 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0f2744]">
                            {item.employerCompanyName ?? "Verified employer"}
                          </p>
                          <span className="rounded-full bg-[#0f2744] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]">
                            {item.status}
                          </span>
                        </div>

                        {item.employerContactName ? (
                          <p className="mt-2 text-sm text-[#27405f]">
                            Contact: {item.employerContactName}
                            {item.employerContactRole ? ` · ${item.employerContactRole}` : ""}
                          </p>
                        ) : null}

                        <p className="mt-2 text-sm text-[#27405f]">Connected {new Date(item.connectedAt).toLocaleString()}</p>
                        {item.revokedAt ? (
                          <p className="text-sm text-[#27405f]">Revoked {new Date(item.revokedAt).toLocaleString()}</p>
                        ) : null}
                      </div>

                      {item.status === "active" ? (
                        <button
                          type="button"
                          onClick={() => {
                            void revokeConnection(item.connectionId);
                          }}
                          disabled={busyConnectionId === item.connectionId}
                          className="inline-flex min-h-11 items-center rounded-full border border-[#9f3a2b]/25 bg-[#9f3a2b] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] transition hover:bg-[#8d3326] disabled:opacity-60"
                        >
                          {busyConnectionId === item.connectionId ? "Ending connection" : "End connection"}
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : null}
        </div>
      </section>
      <Footer />
    </main>
  );
}
