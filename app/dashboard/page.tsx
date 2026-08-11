"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageSquareText, XCircle } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import type {
  AccountType,
  EmployerVerificationStatus,
  FreeAgentProfile,
  IntroductionRequest,
} from "@/types/freeagent";

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

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [accountType, setAccountType] = useState<AccountType>("talent");
  const [verificationStatus, setVerificationStatus] = useState<EmployerVerificationStatus>("unverified");
  const [verificationRequestedAt, setVerificationRequestedAt] = useState<string | null>(null);
  const [verificationRejectionReason, setVerificationRejectionReason] = useState<string | null>(null);
  const [employerCompanyName, setEmployerCompanyName] = useState("");
  const [profile, setProfile] = useState<FreeAgentProfile | null>(null);
  const [requests, setRequests] = useState<IntroductionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const session = await getSessionWithRetry();

      if (!mounted) {
        return;
      }

      if (!session) {
        router.replace("/login");
        return;
      }

      setSession(session);

      const metadataAccountType = session.user.user_metadata?.account_type;
      const fallbackAccountType: AccountType = metadataAccountType === "employer" ? "employer" : "talent";

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("profile, slug, account_type, employer_contact_name, employer_contact_role, employer_company_name, employer_abn, employer_website, employer_industry, employer_company_size, employer_verification_status, verification_requested_at, verification_rejection_reason")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!mounted) {
        return;
      }

      if (!profileRow) {
        const defaultTalentProfile = createBlankTalentProfile(session.user.id, session.user.email);
        const insertPayload = {
          user_id: session.user.id,
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
        setProfile(fallbackAccountType === "talent" ? defaultTalentProfile : null);
        setRequests([]);
        setLoading(false);
        return;
      }

      const profileRowData = profileRow as {
        profile?: unknown;
        slug?: string | null;
        account_type?: AccountType;
        employer_contact_name?: string | null;
        employer_contact_role?: string | null;
        employer_company_name?: string | null;
        employer_abn?: string | null;
        employer_website?: string | null;
        employer_industry?: string | null;
        employer_company_size?: string | null;
        employer_verification_status?: EmployerVerificationStatus;
        verification_requested_at?: string | null;
        verification_rejection_reason?: string | null;
      } | null | undefined;
      const resolvedAccountType = profileRowData?.account_type === "employer" ? "employer" : "talent";
      const profilePayload = profileRowData?.profile as FreeAgentProfile | undefined;
      const nextProfile = profilePayload
        ? { ...profilePayload, slug: (profilePayload as { slug?: string }).slug ?? profileRowData?.slug ?? undefined }
        : resolvedAccountType === "talent"
          ? createBlankTalentProfile(session.user.id, session.user.email)
          : null;
      const nextRequests = Array.isArray(nextProfile?.introductionRequests) ? nextProfile.introductionRequests : [];

      setAccountType(resolvedAccountType);
      setVerificationStatus(profileRowData?.employer_verification_status ?? "unverified");
      setVerificationRequestedAt(profileRowData?.verification_requested_at ?? null);
      setVerificationRejectionReason(profileRowData?.verification_rejection_reason ?? null);
      setEmployerCompanyName(profileRowData?.employer_company_name ?? "");
      setProfile(nextProfile);
      setRequests(nextRequests);
      setLoading(false);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_, currentSession) => {
      if (!mounted) {
        return;
      }

      if (!currentSession) {
        router.replace("/login");
        return;
      }

      setSession(currentSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const pendingCount = useMemo(() => requests.filter((request) => request.status === "pending").length, [requests]);
  const unreadCount = useMemo(() => requests.filter((request) => request.status === "pending" && !request.isRead).length, [requests]);
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

  const saveRequests = async (nextRequests: IntroductionRequest[]) => {
    if (!session || !profile || accountType !== "talent") {
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        slug: profile.slug ?? null,
        profile: { ...profile, introductionRequests: nextRequests } as unknown as Record<string, unknown>,
      } as never)
      .eq("user_id", session.user.id);

    if (error) {
      throw error;
    }

    setProfile((current) => (current ? { ...current, introductionRequests: nextRequests } : current));
    setRequests(nextRequests);
  };

  const updateRequest = async (requestId: string, updates: Partial<IntroductionRequest>) => {
    if (!session || !profile) {
      return;
    }

    setUpdatingId(requestId);
    setFeedback(null);

    const nextRequests = requests.map((request) =>
      request.id === requestId ? { ...request, ...updates, isRead: true } : request,
    );

    try {
      await saveRequests(nextRequests);
      setFeedback("Request updated successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save the update.";
      setFeedback(message);
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
                  ? "Manage your company profile, keep verification details current, and unlock premium talent search once verified."
                  : "Review employer introduction requests, accept or decline them, and reply with a question when you want more context."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {accountType === "talent" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  {pendingCount} pending · {unreadCount} new
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
        ) : (
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/40 sm:p-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Introduction requests</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Incoming employer requests</h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {requests.length === 0 ? "No requests yet" : `${requests.length} total request${requests.length === 1 ? "" : "s"}`}
              </div>
            </div>

            {requests.length === 0 ? (
              <div className="mt-8 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm leading-7 text-slate-600">
                Employers can request an introduction from your public profile. Once they do, the conversation will appear here.
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                {requests.map((request) => (
                  <div key={request.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{request.employerName}</p>
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                            {request.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-600">{request.message ?? "No initial note was provided."}</p>
                        {request.question ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Question: {request.question}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={updatingId === request.id}
                          onClick={() => updateRequest(request.id, { status: "accepted" })}
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === request.id}
                          onClick={() => updateRequest(request.id, { status: "declined" })}
                          className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                        >
                          <XCircle className="h-4 w-4" />
                          Decline
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4">
                      <label className="block text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Ask a question
                        <textarea
                          value={questionDrafts[request.id] ?? ""}
                          onChange={(event) =>
                            setQuestionDrafts((current) => ({ ...current, [request.id]: event.target.value }))
                          }
                          rows={3}
                          className="mt-3 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                          placeholder="Ask them a question before you decide"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={updatingId === request.id}
                        onClick={() => updateRequest(request.id, { question: questionDrafts[request.id] ?? "", status: request.status })}
                        className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        <MessageSquareText className="h-4 w-4" />
                        Send question
                      </button>
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
