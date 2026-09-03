"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Undo2, XCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BillingButton from "@/components/BillingButton";
import FreeAgentProBadge from "@/components/FreeAgentProBadge";
import DashboardView from "@/components/dashboard/DashboardView";
import type { Session } from "@supabase/supabase-js";
import { buildCanonicalTalentColumns } from "@/lib/talent-profile-columns";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import type {
  AccountType,
  EmployerVerificationStatus,
  FreeAgentProfile,
} from "@/types/freeagent";
import type {
  EmployerSummaryPayload,
  EmployerSummaryResponse,
  TalentSummaryPayload,
  TalentSummaryResponse,
} from "@/types/dashboard";

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
  languages: [],
  passions: [],
  careerJourney: [],
  email: email ?? "",
});

const verificationLabel: Record<EmployerVerificationStatus, string> = {
  unverified: "Unverified",
  pending: "Under Review",
  more_info_required: "More Information Required",
  verified: "Verified",
  rejected: "Unable to Verify",
};

const summaryCardClassName = "rounded-2xl border border-[#cda64d]/45 bg-[#f7ebcf] p-5 text-[#0f2744] shadow-[0_10px_28px_rgba(6,16,33,0.12)]";

type ProfileRow = {
  name?: string | null;
  title?: string | null;
  location?: string | null;
  summary?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  career_journey?: unknown;
  education?: string | null;
  current_employer?: string | null;
  visibility?: FreeAgentProfile["visibility"] | null;
  availability?: FreeAgentProfile["availability"] | null;
  top_strength?: string | null;
  experience_years?: number | null;
  focus_area?: string | null;
  languages?: string[] | null;
  passions?: string[] | null;
  photo_url?: string | null;
  photo_storage_path?: string | null;
  intro_video_url?: string | null;
  intro_video_storage_path?: string | null;
  is_published?: boolean | null;
  slug?: string | null;
  account_type?: AccountType;
  employer_company_name?: string | null;
  employer_verification_status?: EmployerVerificationStatus;
  verification_requested_at?: string | null;
  verification_rejection_reason?: string | null;
};

type ProfileProductStatus = "Not started" | "In progress" | "Created" | "Ready";

function buildDashboardTalentProfile(profile: ProfileRow | null | undefined, session: Session): FreeAgentProfile {
  const profileData = profile ?? {};

  return {
    id: session.user.id,
    slug: profileData.slug ?? undefined,
    visibility: profileData.visibility ?? "public",
    name: profileData.name ?? "",
    title: profileData.title ?? "",
    location: profileData.location ?? "",
    availability: profileData.availability ?? "Available Now",
    topStrength: profileData.top_strength ?? "",
    experienceYears: profileData.experience_years ?? 0,
    focusArea: profileData.focus_area ?? "",
    summary: profileData.summary ?? "",
    bio: profileData.bio ?? "",
    skills: Array.isArray(profileData.skills) ? profileData.skills : [],
    languages: Array.isArray(profileData.languages) ? profileData.languages : [],
    passions: Array.isArray(profileData.passions) ? profileData.passions : [],
    careerJourney: Array.isArray(profileData.career_journey) ? profileData.career_journey as FreeAgentProfile["careerJourney"] : [],
    education: profileData.education ?? "",
    currentEmployer: profileData.current_employer ?? "",
    email: session.user.email ?? "",
    photoUrl: profileData.photo_storage_path ? undefined : profileData.photo_url ?? undefined,
    photo_storage_path: profileData.photo_storage_path ?? null,
    intro_video_url: profileData.intro_video_url ?? null,
    intro_video_storage_path: profileData.intro_video_storage_path ?? null,
  };
}

function resolveProfileProductStatus(profile: ProfileRow | null | undefined, isPublished: boolean): ProfileProductStatus {
  const populatedFields = [
    profile?.name,
    profile?.title,
    profile?.location,
    profile?.summary,
    profile?.bio,
    profile?.education,
    profile?.current_employer,
  ].filter((value) => typeof value === "string" && value.trim().length > 0).length;
  const hasSkills = Array.isArray(profile?.skills) && profile.skills.length > 0;
  const hasCareerJourney = Array.isArray(profile?.career_journey) && profile.career_journey.length > 0;

  if (isPublished) {
    return "Ready";
  }

  if (populatedFields === 0 && !hasSkills && !hasCareerJourney) {
    return "Not started";
  }

  return populatedFields >= 3 || hasSkills || hasCareerJourney ? "Created" : "In progress";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleString();
}

function formatFriendlyDate(value: string | null | undefined) {
  if (!value) {
    return "your renewal date";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "your renewal date";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatVerificationSubmittedAt(value: string | null) {
  if (!value) {
    return "Pending confirmation";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Pending confirmation";
  }

  return parsed.toLocaleString();
}

function visibilityLabel(value: string) {
  if (value === "verified_employer_network") {
    return "Employer network";
  }

  return value === "confidential" ? "Confidential" : "Public";
}

function resolveSignedInDisplayName(session: Session | null, profileName?: string | null) {
  const candidates = [
    profileName,
    session?.user?.user_metadata?.full_name,
    session?.user?.user_metadata?.name,
    session?.user?.user_metadata?.display_name,
  ];

  for (const candidate of candidates) {
    const trimmed = typeof candidate === "string" ? candidate.trim() : "";
    if (trimmed.length > 0 && trimmed.toLowerCase() !== session?.user?.email?.toLowerCase()) {
      return trimmed;
    }
  }

  const emailName = session?.user?.email?.split("@")[0]?.trim();
  return emailName || "Free Agent";
}

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [accountType, setAccountType] = useState<AccountType>("talent");
  const [verificationStatus, setVerificationStatus] = useState<EmployerVerificationStatus>("unverified");
  const [verificationRequestedAt, setVerificationRequestedAt] = useState<string | null>(null);
  const [verificationRejectionReason, setVerificationRejectionReason] = useState<string | null>(null);
  const [employerCompanyName, setEmployerCompanyName] = useState("");
  const [employerSummary, setEmployerSummary] = useState<EmployerSummaryPayload | null>(null);
  const [talentSummary, setTalentSummary] = useState<TalentSummaryPayload | null>(null);
  const [profileName, setProfileName] = useState("");
  const [talentSlug, setTalentSlug] = useState<string | null>(null);
  const [cardStatus, setCardStatus] = useState<ProfileProductStatus>("Not started");
  const [passportStatus, setPassportStatus] = useState<ProfileProductStatus>("Not started");
  const [dashboardTalentProfile, setDashboardTalentProfile] = useState<FreeAgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  const loadDashboardSummary = useCallback(async (currentSession: Session, currentAccountType: AccountType) => {
    if (!currentSession.access_token) {
      setEmployerSummary(null);
      setTalentSummary(null);
      return;
    }

    if (currentAccountType === "employer") {
      const response = await fetch("/api/dashboard/employer-summary", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as EmployerSummaryResponse | null;

      if (!response.ok || !payload?.ok || !payload.summary) {
        setFeedback(payload?.message ?? "Unable to load dashboard summary right now.");
        setEmployerSummary(null);
        setTalentSummary(null);
        return;
      }

      setEmployerSummary(payload.summary);
      setTalentSummary(null);
      return;
    }

    const response = await fetch("/api/dashboard/talent-summary", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as TalentSummaryResponse | null;

    if (!response.ok || !payload?.ok || !payload.summary) {
      setFeedback(payload?.message ?? "Unable to load dashboard summary right now.");
      setEmployerSummary(null);
      setTalentSummary(null);
      return;
    }

    setTalentSummary(payload.summary);
    setEmployerSummary(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function hydrateDashboard() {
      const activeSession = await getSessionWithRetry();

      if (!mounted) {
        return;
      }

      if (!activeSession) {
        router.replace("/login");
        return;
      }

      setSession(activeSession);
      setFeedback(null);

      const metadataAccountType = activeSession.user.user_metadata?.account_type;
      const fallbackAccountType: AccountType = metadataAccountType === "employer" ? "employer" : "talent";

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("name, title, location, availability, top_strength, experience_years, focus_area, summary, bio, skills, languages, passions, career_journey, education, current_employer, visibility, photo_url, photo_storage_path, intro_video_url, intro_video_storage_path, is_published, profile, slug, account_type, employer_company_name, employer_verification_status, verification_requested_at, verification_rejection_reason")
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
          ...(fallbackAccountType === "talent"
            ? buildCanonicalTalentColumns(defaultTalentProfile, activeSession.user.email)
            : {
                slug: null,
                profile: {},
              }),
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
        setCardStatus("Not started");
        setPassportStatus("Not started");
        setDashboardTalentProfile(null);
        await loadDashboardSummary(activeSession, fallbackAccountType);
        setLoading(false);
        return;
      }

      const profileRowData = profileRow as ProfileRow | null | undefined;
      const resolvedAccountType = profileRowData?.account_type === "employer" ? "employer" : "talent";

      setAccountType(resolvedAccountType);
      setProfileName(profileRowData?.name ?? "");
      setTalentSlug(profileRowData?.slug ?? null);
      setCardStatus(resolveProfileProductStatus(profileRowData, Boolean(profileRowData?.is_published)));
      setPassportStatus(resolveProfileProductStatus(profileRowData, Boolean(profileRowData?.is_published)));
      setDashboardTalentProfile(resolvedAccountType === "talent" ? buildDashboardTalentProfile(profileRowData, activeSession) : null);
      setVerificationStatus(profileRowData?.employer_verification_status ?? "unverified");
      setVerificationRequestedAt(profileRowData?.verification_requested_at ?? null);
      setVerificationRejectionReason(profileRowData?.verification_rejection_reason ?? null);
      setEmployerCompanyName(profileRowData?.employer_company_name ?? "");
      await loadDashboardSummary(activeSession, resolvedAccountType);
      setLoading(false);
    }

    void hydrateDashboard();

    const { data: listener } = supabase.auth.onAuthStateChange((_, currentSession) => {
      if (!mounted) {
        return;
      }

      if (!currentSession) {
        router.replace("/login");
        return;
      }

      setSession(currentSession);
      const sessionAccountType: AccountType = currentSession.user.user_metadata?.account_type === "employer"
        ? "employer"
        : "talent";
      setAccountType(sessionAccountType);
      setFeedback(null);
      void loadDashboardSummary(currentSession, sessionAccountType);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [accountType, loadDashboardSummary, router]);

  useEffect(() => {
    if (accountType !== "employer" || !session) {
      return;
    }

    const refreshVerification = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("employer_verification_status, verification_requested_at, verification_rejection_reason, employer_company_name")
        .eq("user_id", session.user.id)
        .maybeSingle<ProfileRow>();

      if (!data) {
        return;
      }

      setVerificationStatus(data.employer_verification_status ?? "unverified");
      setVerificationRequestedAt(data.verification_requested_at ?? null);
      setVerificationRejectionReason(data.verification_rejection_reason ?? null);
      setEmployerCompanyName(data.employer_company_name ?? "");
      void loadDashboardSummary(session, "employer");
    };

    const interval = window.setInterval(() => {
      void refreshVerification();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [accountType, loadDashboardSummary, session]);

  const pendingCount = talentSummary?.pendingIntroductionRequests ?? 0;
  const isPublished = talentSummary?.isPublished ?? false;
  const visibility = talentSummary?.visibility ?? "public";
  const talentSubscription = talentSummary?.subscription ?? {
    plan: "free_agent",
    status: "inactive",
    currentPeriodEndsAt: null,
    cancelAt: null,
    cancelAtPeriodEnd: false,
    scheduledCancellationAt: null,
    hasScheduledCancellation: false,
    hasProAccess: false,
  };
  const isProTalent = talentSubscription.hasProAccess;
  const hasScheduledCancellation = isProTalent && talentSubscription.hasScheduledCancellation;
  const scheduledCancellationDate = hasScheduledCancellation ? formatFriendlyDate(talentSubscription.scheduledCancellationAt ?? talentSubscription.currentPeriodEndsAt) : null;
  const talentDisplayName = useMemo(
    () => resolveSignedInDisplayName(session, profileName),
    [profileName, session],
  );
  const dashboardWelcomeName = accountType === "talent" ? talentDisplayName : session?.user.email ?? "Free Agent";
  const hasCompletedTalentCard = Boolean(profileName.trim()) || isPublished;
  const talentPassportHref = talentSlug ? `/talent/${talentSlug}` : "/builder";

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("checkout") !== "success" || !session) {
      return;
    }

    const hasEntitlement = accountType === "employer"
      ? employerSummary?.subscription.hasAccess === true
      : talentSummary?.subscription.hasProAccess === true;

    if (hasEntitlement) {
      const completionTimer = window.setTimeout(() => {
        setFeedback("Subscription activated.");
        router.replace("/dashboard");
      }, 0);
      return () => window.clearTimeout(completionTimer);
    }

    let attempts = 0;
    let pollingTimer: number | undefined;
    const activationTimer = window.setTimeout(() => setFeedback("Activating your subscription…"), 0);

    const refresh = () => {
      attempts += 1;
      void loadDashboardSummary(session, accountType);
      if (attempts < 8) {
        pollingTimer = window.setTimeout(refresh, 3000);
      } else {
        setFeedback("Subscription activation is still pending. Refresh this page in a moment to check again.");
      }
    };

    pollingTimer = window.setTimeout(refresh, 1500);
    return () => {
      window.clearTimeout(activationTimer);
      if (pollingTimer) window.clearTimeout(pollingTimer);
    };
  }, [accountType, employerSummary?.subscription.hasAccess, loadDashboardSummary, router, session, talentSummary?.subscription.hasProAccess]);

  const isVerifiedEmployer = accountType === "employer" && verificationStatus === "verified";
  const hasEmployerAccess = isVerifiedEmployer && employerSummary?.subscription.hasAccess === true;

  const formattedRequestedAt = useMemo(
    () => formatVerificationSubmittedAt(verificationRequestedAt),
    [verificationRequestedAt],
  );

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

      await loadDashboardSummary(session, "talent");
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

      await loadDashboardSummary(session, "employer");
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
      <><Navbar /><main className="min-h-screen bg-[#08111F] text-[#f7ebcf]">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-16">
          <div className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] px-8 py-10 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.2)]">
            <p className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Loading dashboard</p>
          </div>
        </div>
      </main><Footer /></>
    );
  }

  return (
    <DashboardView
      audience={accountType}
      name={dashboardWelcomeName}
      companyName={employerCompanyName}
      verificationStatus={verificationStatus}
      verificationRequestedAt={verificationRequestedAt ?? ""}
      verificationRejectionReason={verificationRejectionReason}
      employerSummary={employerSummary}
      talentSummary={talentSummary}
      isVerifiedEmployer={isVerifiedEmployer}
      hasEmployerAccess={hasEmployerAccess}
      isPublished={isPublished}
      visibility={visibilityLabel(visibility)}
      isProTalent={isProTalent}
      hasScheduledCancellation={hasScheduledCancellation}
      scheduledCancellationDate={scheduledCancellationDate}
      talentPassportHref={talentPassportHref}
      hasCompletedTalentCard={hasCompletedTalentCard}
      dashboardTalentProfile={dashboardTalentProfile}
      cardStatus={cardStatus}
      passportStatus={passportStatus}
      formatDateTime={formatDateTime}
      verificationLabel={verificationLabel[verificationStatus]}
      formattedRequestedAt={formattedRequestedAt}
      withdrawRequest={(requestId) => {
        void withdrawRequest(requestId);
      }}
      updateTalentRequest={(requestId, action) => {
        void updateTalentRequest(requestId, action);
      }}
      signOut={() => {
        void signOut();
      }}
      updatingId={updatingId}
    />
  );

  const employerRequestPreview = employerSummary?.requestPreview ?? [];
  const employerConnectionPreview = employerSummary?.connectionPreview ?? [];
  const talentRequestPreview = talentSummary?.requestPreview ?? [];
  const talentConnectionPreview = talentSummary?.connectionPreview ?? [];

  return (
    <><Navbar /><main className="min-h-screen bg-[#0f2744] text-[#f7ebcf]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12 lg:py-14">
        <div className="mb-6 rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Secure dashboard</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0f2744]">Welcome back, {dashboardWelcomeName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#27405f]">
                {accountType === "employer"
                  ? "Track your verification status and run hiring workflows from one operational home."
                  : "Check discoverability, act on incoming requests, and manage active employer connections."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {accountType === "employer" ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  {verificationLabel[verificationStatus]}
                </span>
              ) : (
                <>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    {isPublished ? "Published" : "Unpublished"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {visibilityLabel(visibility)}
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                    {pendingCount} pending
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={signOut}
                className="rounded-2xl bg-[#aff546] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#071426] transition hover:bg-[#9fea37]"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        {feedback ? (
          <div className="mb-6 rounded-2xl border border-[#f2cc63]/60 bg-[#fff7dc] px-5 py-4 text-sm font-medium text-[#6f5310]">
            {feedback}
          </div>
        ) : null}

        {accountType === "employer" ? (
          <div className="space-y-6">
            <section className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Employer access</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                    {hasEmployerAccess ? "Employer Access Active" : isVerifiedEmployer ? "Your business is verified" : verificationLabel[verificationStatus]}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {hasEmployerAccess
                      ? "Verified Employer access is active."
                      : isVerifiedEmployer
                        ? "Your organisation has been approved to join the Free Agent Staff Employer network. Activate Employer Access to start discovering Talent."
                        : "Free Agent Staff verifies employers before providing access to the Talent network."}
                  </p>
                  {employerSummary?.subscription.cancelAtPeriodEnd && employerSummary?.subscription.currentPeriodEndsAt ? (
                    <p className="mt-3 text-sm font-semibold text-amber-800">Access remains active until {formatDateTime(employerSummary?.subscription.currentPeriodEndsAt)}.</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                    {(employerSummary?.subscription.status ?? "inactive").replace("_", " ")}
                  </span>
                  {hasEmployerAccess ? (
                    <BillingButton action="portal" className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800">
                      Manage subscription
                    </BillingButton>
                  ) : isVerifiedEmployer ? (
                    <BillingButton action="checkout" plan="employer" className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800">
                      Choose Employer Plan
                    </BillingButton>
                  ) : null}
                </div>
              </div>
            </section>
            {hasEmployerAccess ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Link href="/find-talent" className={`${summaryCardClassName} text-sm font-semibold text-slate-700 transition hover:bg-slate-50`}>
                  Find Talent
                </Link>
                <Link href="/saved-talent" className={`${summaryCardClassName} text-sm font-semibold text-slate-700 transition hover:bg-slate-50`}>
                  Saved Talent
                </Link>
                <Link href="/connections" className={`${summaryCardClassName} text-sm font-semibold text-slate-700 transition hover:bg-slate-50`}>
                  Connections
                </Link>
                <Link href="/onboarding/employer" className={`${summaryCardClassName} text-sm font-semibold text-slate-700 transition hover:bg-slate-50`}>
                  Employer Account
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Link href="/onboarding/employer" className={`${summaryCardClassName} text-sm font-semibold text-slate-700 transition hover:bg-slate-50`}>
                  Employer Account
                </Link>
              </div>
            )}

            {!isVerifiedEmployer ? (
              <section className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] sm:p-8">
                {verificationStatus === "unverified" ? (
                  <>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">Verify your business</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Free Agent Staff verifies employers before providing access to the Talent network.
                    </p>
                  </>
                ) : null}

                {verificationStatus === "pending" ? (
                  <>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">We&apos;re verifying your business</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Your details have been submitted to Free Agent Staff for review. We&apos;ll let you know once your business has been verified.
                    </p>
                    <p className="mt-3 text-sm font-semibold text-slate-700">Submitted: {formattedRequestedAt}</p>
                  </>
                ) : null}

                {verificationStatus === "more_info_required" ? (
                  <>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">We need a little more information</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      We need some additional information before we can complete your business verification.
                    </p>
                    {verificationRejectionReason ? (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
                        Reviewer message: {verificationRejectionReason}
                      </p>
                    ) : null}
                  </>
                ) : null}

                {verificationStatus === "rejected" ? (
                  <>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">We couldn&apos;t verify this Employer account</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      We weren&apos;t able to verify your organisation or your connection to it.
                    </p>

                    {verificationRejectionReason ? (
                      <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-800">
                        Reason: {verificationRejectionReason}
                      </p>
                    ) : null}
                  </>
                ) : null}

                <div className="mt-5">
                  <Link
                    href="/onboarding/employer"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
                  >
                    {verificationStatus === "more_info_required" ? "Update Business Details" : verificationStatus === "rejected" ? "Review details" : verificationStatus === "unverified" ? "Submit for Verification" : "Open employer account"}
                  </Link>
                </div>
              </section>
            ) : null}

            {hasEmployerAccess ? (
              <>
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Link href="/saved-talent" className={`${summaryCardClassName} transition hover:bg-slate-50`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Saved talent</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{employerSummary?.savedTalentCount ?? 0}</p>
                  </Link>
                  <div className={summaryCardClassName}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pending introductions</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{employerSummary?.pendingIntroductionRequests ?? 0}</p>
                  </div>
                  <Link href="/connections" className={`${summaryCardClassName} transition hover:bg-slate-50`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Active connections</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{employerSummary?.activeConnections ?? 0}</p>
                  </Link>
                  <Link href="/saved-talent" className={`${summaryCardClassName} transition hover:bg-slate-50`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Active shortlists</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{employerSummary?.activeShortlists ?? 0}</p>
                  </Link>
                </section>

                <section className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] sm:p-8">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Introduction requests</p>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Sent preview</h2>
                    </div>
                    <Link href="/find-talent" className="text-sm font-semibold text-slate-700 underline-offset-2 hover:underline">
                      Request more introductions
                    </Link>
                  </div>

                  {employerRequestPreview.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
                      No introduction requests yet. Request introductions from eligible talent profiles.
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      {employerRequestPreview.map((request) => (
                        <div key={request.requestId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">{request.talentName}</p>
                                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                                  {request.status}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-slate-600">Sent {formatDateTime(request.createdAt)}</p>
                              <p className="mt-1 text-sm text-slate-600">
                                {request.isCurrentlyEligible
                                  ? "Talent currently eligible for employer access."
                                  : "Talent currently unavailable due to privacy or blocking constraints."}
                              </p>
                            </div>
                            {request.status === "pending" ? (
                              <button
                                type="button"
                                disabled={updatingId === request.requestId}
                                onClick={() => {
                                  void withdrawRequest(request.requestId);
                                }}
                                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
                </section>

                <section className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] sm:p-8">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Connections</p>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Recent connections</h2>
                    </div>
                    <Link href="/connections" className="text-sm font-semibold text-slate-700 underline-offset-2 hover:underline">
                      Open connections
                    </Link>
                  </div>

                  {employerConnectionPreview.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
                      No connections yet. Connections are created when introductions are accepted.
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      {employerConnectionPreview.map((item) => (
                        <div key={item.connectionId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                                {item.talentName ?? "Confidential candidate"}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">{item.talentTitle ?? "Professional profile"}</p>
                              <p className="mt-1 text-sm text-slate-600">
                                {item.status === "active"
                                  ? `Connected ${formatDateTime(item.connectedAt)}`
                                  : `Revoked ${formatDateTime(item.revokedAt ?? item.connectedAt)}`}
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                              {item.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] sm:p-8">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Subscription</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">
                      {isProTalent ? "Free Agent Pro" : "Free Agent Basic"}
                    </h2>
                    {isProTalent ? <FreeAgentProBadge size="standard" className="h-12" /> : null}
                  </div>
                </div>
                <div className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${isProTalent ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[#aff546]/50 bg-[#f4ffd9] text-[#0f2744]"}`}>
                  {hasScheduledCancellation ? `CANCELS ${scheduledCancellationDate?.toUpperCase()}` : isProTalent ? "ACTIVE" : talentSubscription.status === "canceled" ? "Canceled" : "Free plan"}
                </div>
              </div>

              <p className="text-sm leading-7 text-slate-600">
                {hasScheduledCancellation
                  ? `Your Free Agent Pro subscription will end on ${scheduledCancellationDate}. You’ll keep Pro access until then.`
                  : isProTalent
                    ? "Your Free Agent Pro subscription is active."
                    : "Upgrade to Free Agent Pro to publish a video introduction and unlock analytics insights."}
              </p>

              {hasScheduledCancellation ? (
                <p className="mt-3 text-sm font-semibold text-amber-800">Your access remains active until {scheduledCancellationDate}.</p>
              ) : null}

              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Free Agent Pro does not buy preferential discovery. Ranking and eligibility are identical across plans.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {isProTalent ? (
                  <BillingButton action="portal" className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800">
                    MANAGE SUBSCRIPTION
                  </BillingButton>
                ) : (
                  <BillingButton action="checkout" plan="free_agent_pro" className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#aff546] px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#071426] transition hover:bg-[#9fea37]">
                    UPGRADE TO PRO
                  </BillingButton>
                )}
                <Link href="/pricing" className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-800 transition hover:bg-slate-50">
                  View pricing
                </Link>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Link href="/builder" className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-5 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] transition hover:-translate-y-0.5 hover:bg-[#fff7dd]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Free Agent Card</p>
                <p className="mt-3 text-lg font-black uppercase tracking-[0.12em]">{hasCompletedTalentCard ? "Edit Your Card" : "Create Your Card"}</p>
              </Link>

              <Link href={talentPassportHref} className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-5 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] transition hover:-translate-y-0.5 hover:bg-[#fff7dd]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Talent Passport</p>
                <p className="mt-3 text-lg font-black uppercase tracking-[0.12em]">Talent Passport</p>
              </Link>

              <Link href="/connections" className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-5 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] transition hover:-translate-y-0.5 hover:bg-[#fff7dd]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Connections</p>
                <p className="mt-3 text-lg font-black uppercase tracking-[0.12em]">Connections</p>
              </Link>

              <Link href="/settings/privacy" className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-5 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] transition hover:-translate-y-0.5 hover:bg-[#fff7dd]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Privacy & Visibility</p>
                <p className="mt-3 text-lg font-black uppercase tracking-[0.12em]">Privacy & Visibility</p>
              </Link>
            </section>

            {isProTalent && talentSummary?.proAnalytics ? (
              <section className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] sm:p-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">FreeAgent Pro</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Your profile activity</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">See how employers are engaging with your FreeAgent profile.</p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className={summaryCardClassName}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Profile views</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{talentSummary?.proAnalytics?.profileViews ?? 0}</p>
                  </div>
                  <div className={summaryCardClassName}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Employer saves</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{talentSummary?.proAnalytics?.employerSaves ?? 0}</p>
                  </div>
                </div>
              </section>
            ) : !isProTalent ? (
              <section className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">FreeAgent Pro</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">See how employers are engaging with your profile</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">Upgrade to FreeAgent Pro to see your profile views and employer saves.</p>
                <BillingButton action="checkout" plan="free_agent_pro" className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800">
                  Upgrade to Pro
                </BillingButton>
              </section>
            ) : null}

            <section className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Your visibility snapshot</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {isPublished
                  ? "Your profile is currently discoverable to eligible employers."
                  : "Your profile is unpublished and currently not discoverable by employers."}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className={summaryCardClassName}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Publication</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{isPublished ? "Published" : "Unpublished"}</p>
                </div>
                <div className={summaryCardClassName}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Visibility</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{visibilityLabel(visibility)}</p>
                </div>
                <div className={summaryCardClassName}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pending requests</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{talentSummary?.pendingIntroductionRequests ?? 0}</p>
                </div>
                <Link href="/connections" className={`${summaryCardClassName} transition hover:bg-slate-50`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Active connections</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{talentSummary?.activeConnections ?? 0}</p>
                </Link>
              </div>
            </section>

            <section className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Introduction requests</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Incoming employer requests</h2>
                </div>
                <span className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {talentRequestPreview.length === 0 ? "No requests yet" : `${talentRequestPreview.length} in recent preview`}
                </span>
              </div>

              {talentRequestPreview.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
                  No incoming requests yet. Employers can request introductions from your eligible profile.
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {talentRequestPreview.map((request) => (
                    <div key={request.requestId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                              {request.employerCompanyName ?? "Verified employer"}
                            </p>
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
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
                          <p className="mt-2 text-sm text-slate-600">Received {formatDateTime(request.createdAt)}</p>
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
                              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
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
                              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
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
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              <Link href="/builder" className={`${summaryCardClassName} text-sm font-semibold text-slate-700 transition hover:bg-slate-50`}>
                View/Edit Profile
              </Link>
              <Link href="/settings/privacy" className={`${summaryCardClassName} text-sm font-semibold text-slate-700 transition hover:bg-slate-50`}>
                Privacy & Visibility
              </Link>
              <Link href="/connections" className={`${summaryCardClassName} text-sm font-semibold text-slate-700 transition hover:bg-slate-50`}>
                Connections
              </Link>
            </section>

            <section className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Connections</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Recent connection activity</h2>
                </div>
                <Link href="/connections" className="text-sm font-semibold text-slate-700 underline-offset-2 hover:underline">
                  Open connections
                </Link>
              </div>

              {talentConnectionPreview.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
                  No connections yet. Connections are created when an introduction request is accepted.
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {talentConnectionPreview.map((item) => (
                    <div key={item.connectionId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                            {item.employerCompanyName ?? "Verified employer"}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {item.status === "active"
                              ? `Connected ${formatDateTime(item.connectedAt)}`
                              : `Revoked ${formatDateTime(item.revokedAt ?? item.connectedAt)}`}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_16px_40px_rgba(6,16,33,0.18)] sm:p-8">
              <h2 className="text-xl font-black tracking-tight text-slate-900">Privacy snapshot</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Visibility: {visibilityLabel(visibility)}. Publication: {isPublished ? "Published" : "Unpublished"}.
              </p>
              {!isPublished ? (
                <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Your profile is not currently discoverable by employers. Publish and review your privacy settings to be considered for introductions.
                </p>
              ) : null}

              <div className="mt-5">
                <Link
                  href="/settings/privacy"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
                >
                  Open privacy settings
                </Link>
              </div>
            </section>
          </div>
        )}

        {accountType === "employer" && isVerifiedEmployer && employerCompanyName ? (
          <p className="mt-6 text-center text-sm text-slate-500">Verified employer: {employerCompanyName}</p>
        ) : null}
      </div>
    </main><Footer />
    </>
  );
}
