"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Undo2, XCircle } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import type {
  AccountType,
  EmployerVerificationStatus,
  FreeAgentProfile,
} from "@/types/freeagent";
import type {
  EmployerIntroductionRequestItem,
  TalentIntroductionRequestItem,
} from "@/types/introduction-requests";

const createBlankTalentProfile = (userId: string, email?: string | null): FreeAgentProfile => ({
  id: `freeagent-${userId.slice(0, 8)}`,
  slug: `freeagent-${userId.slice(0, 8)}`,
  visibility: "public",
  name: "",
  title: "",
  location: "",
  availability: "Available Now",
  topStrength: "",
  experienceYears: 0,
  focusArea: "",
  summary: "",
  skills: [],
  careerJourney: [],
  email: email ?? "",
});

const verificationLabel: Record<EmployerVerificationStatus, string> = {
  unverified: "Unverified",
  pending: "Pending verification",
  verified: "Verified",
  rejected: "Rejected",
};

type IncomingRequestsResponse = {
  ok: boolean;
  items: TalentIntroductionRequestItem[];
  reason?: string;
  message?: string;
};

type SentRequestsResponse = {
  ok: boolean;
  items: EmployerIntroductionRequestItem[];
  reason?: string;
  message?: string;
};

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [accountType, setAccountType] = useState<AccountType>("talent");
  const [verificationStatus, setVerificationStatus] = useState<EmployerVerificationStatus>("unverified");
  const [verificationRequestedAt, setVerificationRequestedAt] = useState<string | null>(null);
  const [verificationRejectionReason, setVerificationRejectionReason] = useState<string | null>(null);
  const [employerCompanyName, setEmployerCompanyName] = useState("");
  const [incomingRequests, setIncomingRequests] = useState<TalentIntroductionRequestItem[]>([]);
  const [sentRequests, setSentRequests] = useState<EmployerIntroductionRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  const loadRequests = useCallback(async (currentSession: Session | null, currentAccountType: AccountType) => {
    if (!currentSession?.access_token) {
      setIncomingRequests([]);
      setSentRequests([]);
      return;
    }

    if (currentAccountType === "talent") {
      const response = await fetch("/api/introduction-requests/incoming", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as IncomingRequestsResponse | null;
      if (payload?.ok && Array.isArray(payload.items)) {
        setIncomingRequests(payload.items);
      } else {
        setIncomingRequests([]);
      }
      setSentRequests([]);
      return;
    }

    const response = await fetch("/api/introduction-requests/sent", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as SentRequestsResponse | null;
    if (payload?.ok && Array.isArray(payload.items)) {
      setSentRequests(payload.items);
    } else {
      setSentRequests([]);
    }
    setIncomingRequests([]);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const activeSession = await getSessionWithRetry();

      if (!mounted) {
        return;
      }

      if (!activeSession) {
        router.replace("/login");
        return;
      }

      setSession(activeSession);

      const metadataAccountType = activeSession.user.user_metadata?.account_type;
      const fallbackAccountType: AccountType = metadataAccountType === "employer" ? "employer" : "talent";

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("profile, slug, account_type, employer_company_name, employer_verification_status, verification_requested_at, verification_rejection_reason")
        .eq("user_id", activeSession.user.id)
        .maybeSingle();

      if (!mounted) {
        return;
      }

      if (!profileRow) {
        const defaultTalentProfile = createBlankTalentProfile(activeSession.user.id, activeSession.user.email);
        const insertPayload = {
          user_id: activeSession.user.id,
          account_type: fallbackAccountType,
          employer_contact_name: null,
          employer_contact_role: null,
          employer_company_name: null,
          employer_abn: null,
          employer_website: null,
          employer_industry: null,
          employer_company_size: null,
          employer_verification_status: "unverified",
          slug: fallbackAccountType === "talent" ? defaultTalentProfile.slug ?? null : null,
          profile: fallbackAccountType === "talent" ? (defaultTalentProfile as unknown as Record<string, unknown>) : {},
        };

        const { error: insertError } = await supabase.from("profiles").insert([insertPayload] as never);

        if (!mounted) {
          return;
        }

        if (insertError) {
          setFeedback(insertError.message);
        }

        setAccountType(fallbackAccountType);
        setVerificationStatus("unverified");
        setVerificationRequestedAt(null);
        setVerificationRejectionReason(null);
        setEmployerCompanyName("");
        await loadRequests(activeSession, fallbackAccountType);
        setLoading(false);
        return;
      }

      const profileRowData = profileRow as {
        account_type?: AccountType;
        employer_company_name?: string | null;
        employer_verification_status?: EmployerVerificationStatus;
        verification_requested_at?: string | null;
        verification_rejection_reason?: string | null;
      } | null | undefined;

      const resolvedAccountType = profileRowData?.account_type === "employer" ? "employer" : "talent";

      setAccountType(resolvedAccountType);
      setVerificationStatus(profileRowData?.employer_verification_status ?? "unverified");
      setVerificationRequestedAt(profileRowData?.verification_requested_at ?? null);
      setVerificationRejectionReason(profileRowData?.verification_rejection_reason ?? null);
      setEmployerCompanyName(profileRowData?.employer_company_name ?? "");
      await loadRequests(activeSession, resolvedAccountType);
      setLoading(false);
    }

    void loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_, currentSession) => {
      if (!mounted) {
        return;
      }

      if (!currentSession) {
        router.replace("/login");
        return;
      }

      setSession(currentSession);
      void loadRequests(currentSession, accountType);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [accountType, loadRequests, router]);

  const pendingCount = useMemo(
    () => incomingRequests.filter((request) => request.status === "pending" && request.canTalentRespond).length,
    [incomingRequests],
  );

  const isVerifiedEmployer = accountType === "employer" && verificationStatus === "verified";

  const formattedRequestedAt = useMemo(() => {
    if (!verificationRequestedAt) {
      return "Pending confirmation";
    }

    const value = new Date(verificationRequestedAt);
    if (Number.isNaN(value.getTime())) {
      return "Pending confirmation";
    }

    return value.toLocaleString();
  }, [verificationRequestedAt]);

  const updateTalentRequest = async (requestId: string, action: "accept" | "decline") => {
    if (!session?.access_token) {
      return;
    }

    setUpdatingId(requestId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/introduction-requests/${encodeURIComponent(requestId)}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!response.ok || !payload?.ok) {
        setFeedback(payload?.message ?? "Unable to update this request right now.");
        return;
      }

      await loadRequests(session, "talent");
      setFeedback(action === "accept" ? "Introduction request accepted." : "Introduction request declined.");
    } catch {
      setFeedback("Unable to update this request right now.");
    } finally {
      setUpdatingId(null);
    }
  };

  const withdrawRequest = async (requestId: string) => {
    if (!session?.access_token) {
      return;
    }

    setUpdatingId(requestId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/introduction-requests/${encodeURIComponent(requestId)}/withdraw`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!response.ok || !payload?.ok) {
        setFeedback(payload?.message ?? "Unable to withdraw this request right now.");
        return;
      }

      await loadRequests(session, "employer");
      setFeedback("Introduction request withdrawn.");
    } catch {
      setFeedback("Unable to withdraw this request right now.");
    } finally {
      setUpdatingId(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace(accountType === "employer" ? "/employer/auth" : "/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-16">
          <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-lg shadow-slate-200/40">
            <p className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Loading dashboard</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <div className="mb-8 flex flex-col gap-4 rounded-[32px] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/40 sm:p-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-500">Secure dashboard</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Welcome back, {session?.user.email ?? "Free Agent"}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                {accountType === "employer"
                  ? "Manage your company profile, keep verification details current, and track introduction requests."
                  : "Review incoming employer introduction requests and decide which conversations to start."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {accountType === "talent" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  {pendingCount} pending
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  {verificationLabel[verificationStatus]}
                </div>
              )}
              <button
                type="button"
                onClick={signOut}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {accountType === "talent" ? (
              <>
                <Link href="/builder" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  Edit your profile
                </Link>
                <Link href="/connections" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  Connections
                </Link>
                <Link href="/settings/privacy" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  Privacy & visibility
                </Link>
              </>
            ) : (
              <>
                <Link href="/onboarding/employer" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  Employer account
                </Link>
                <Link
                  href="/find-talent"
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isVerifiedEmployer
                      ? "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                  }`}
                  aria-disabled={!isVerifiedEmployer}
                  onClick={(event) => {
                    if (!isVerifiedEmployer) {
                      event.preventDefault();
                    }
                  }}
                >
                  Find talent
                </Link>
                <Link
                  href="/connections"
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isVerifiedEmployer
                      ? "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                  }`}
                  aria-disabled={!isVerifiedEmployer}
                  onClick={(event) => {
                    if (!isVerifiedEmployer) {
                      event.preventDefault();
                    }
                  }}
                >
                  Connections
                </Link>
              </>
            )}
          </div>
        </div>

        {feedback ? (
          <div className="mb-8 rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
            {feedback}
          </div>
        ) : null}

        {accountType === "employer" ? (
          <div className="space-y-8">
            <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/40 sm:p-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Employer profile</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Employer verification</h2>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  Status: {verificationLabel[verificationStatus]}
                </div>
              </div>

              <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-6">
                {verificationStatus === "unverified" ? (
                  <>
                    <h3 className="text-lg font-black uppercase tracking-[0.08em] text-slate-900">Complete employer setup</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Complete your employer profile and submit it for review before talent search unlocks.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href="/onboarding/employer"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
                      >
                        Complete employer setup
                      </Link>
                    </div>
                  </>
                ) : null}

                {verificationStatus === "pending" ? (
                  <>
                    <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">Verification in review</p>
                      <h3 className="mt-2 text-lg font-black uppercase tracking-[0.08em] text-slate-900">Submission received</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Your employer verification is in review. FreeAgent will notify you once the assessment is complete.
                      </p>
                      <p className="mt-3 text-sm font-semibold text-slate-700">Submitted: {formattedRequestedAt}</p>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href="/onboarding/employer"
                          className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
                        >
                          View submission
                        </Link>
                        <span className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-500">
                          Find Talent locked until verified
                        </span>
                      </div>
                    </div>
                  </>
                ) : null}

                {verificationStatus === "verified" ? (
                  <>
                    <h3 className="text-lg font-black uppercase tracking-[0.08em] text-slate-900">Verified access enabled</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {employerCompanyName
                        ? `${employerCompanyName} is verified. You can access the FreeAgent talent network now.`
                        : "Your employer account is verified. You can access the FreeAgent talent network now."}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href="/find-talent"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
                      >
                        Find talent
                      </Link>
                      <Link
                        href="/onboarding/employer"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        View employer profile
                      </Link>
                    </div>
                  </>
                ) : null}

                {verificationStatus === "rejected" ? (
                  <>
                    <h3 className="text-lg font-black uppercase tracking-[0.08em] text-slate-900">Verification needs attention</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      We couldn&apos;t verify your employer account. Update your details and resubmit.
                    </p>

                    {verificationRejectionReason ? (
                      <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-800">
                        Reason: {verificationRejectionReason}
                      </p>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href="/onboarding/employer"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
                      >
                        Review and resubmit
                      </Link>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {isVerifiedEmployer ? (
              <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/40 sm:p-10">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Introduction requests</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Sent requests</h2>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {sentRequests.length === 0 ? "No requests yet" : `${sentRequests.length} total request${sentRequests.length === 1 ? "" : "s"}`}
                  </div>
                </div>

                {sentRequests.length === 0 ? (
                  <div className="mt-8 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm leading-7 text-slate-600">
                    Request introductions from Talent Passport or Saved Talent.
                  </div>
                ) : (
                  <div className="mt-8 space-y-4">
                    {sentRequests.map((request) => (
                      <div key={request.requestId} className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                                {request.talentName}
                              </p>
                              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                                {request.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-7 text-slate-600">
                              Sent {new Date(request.createdAt).toLocaleString()}
                            </p>
                            <p className="text-sm leading-7 text-slate-600">
                              {request.isCurrentlyEligible ? "Talent currently eligible for employer access." : "Talent currently unavailable due to current visibility/block state."}
                            </p>
                            {request.message ? <p className="mt-3 text-sm leading-7 text-slate-600">Message: {request.message}</p> : null}
                          </div>
                          {request.status === "pending" ? (
                            <button
                              type="button"
                              disabled={updatingId === request.requestId}
                              onClick={() => {
                                void withdrawRequest(request.requestId);
                              }}
                              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              <Undo2 className="h-4 w-4" />
                              Withdraw
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/40 sm:p-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Introduction requests</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Incoming employer requests</h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {incomingRequests.length === 0 ? "No requests yet" : `${incomingRequests.length} total request${incomingRequests.length === 1 ? "" : "s"}`}
              </div>
            </div>

            {incomingRequests.length === 0 ? (
              <div className="mt-8 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm leading-7 text-slate-600">
                Employers can request an introduction from your eligible profile. Requests will appear here.
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                {incomingRequests.map((request) => (
                  <div key={request.requestId} className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                            {request.employerCompanyName ?? "Verified employer"}
                          </p>
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                            {request.status}
                          </span>
                        </div>
                        {request.employerContactName ? (
                          <p className="mt-2 text-sm text-slate-600">
                            Contact: {request.employerContactName}
                            {request.employerContactRole ? ` · ${request.employerContactRole}` : ""}
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm leading-7 text-slate-600">{request.message ?? "No initial note was provided."}</p>
                        <p className="mt-2 text-sm text-slate-600">Received {new Date(request.createdAt).toLocaleString()}</p>
                        {!request.canTalentRespond && request.status === "pending" ? (
                          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            This request can no longer be actioned because current privacy/block settings no longer allow this relationship.
                          </p>
                        ) : null}
                      </div>
                      {request.status === "pending" && request.canTalentRespond ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={updatingId === request.requestId}
                            onClick={() => {
                              void updateTalentRequest(request.requestId, "accept");
                            }}
                            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === request.requestId}
                            onClick={() => {
                              void updateTalentRequest(request.requestId, "decline");
                            }}
                            className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                          >
                            <XCircle className="h-4 w-4" />
                            Decline
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
