"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Check,
  Download,
  Lock,
  Mail,
  RotateCcw,
  X,
} from "lucide-react";
import Footer from "@/components/layout/Footer";
import FreeAgentProBadge from "@/components/FreeAgentProBadge";
import Navbar from "@/components/layout/Navbar";
import PassportFold from "@/components/PassportFold";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import { salaryExpectationOptions } from "@/lib/talent-profile-options";
import type { TalentPassportApiResponse } from "@/types/discovery";
import type {
  PrivateAccessRequest,
  PrivateAccessState,
} from "@/types/private-access";
import type { FreeAgentProfile } from "@/types/freeagent";

function accessLabel(status: PrivateAccessState["status"]) {
  if (status === "accepted") return "Access approved";
  if (status === "pending") return "Request pending";
  if (status === "declined") return "Access declined";
  if (status === "revoked") return "Access revoked";
  return "Private details locked";
}

export default function TalentProfileExperience({
  slug,
  demoProfile,
}: {
  slug: string;
  demoProfile?: FreeAgentProfile;
}) {
  const isDemo = Boolean(demoProfile);
  const [payload, setPayload] = useState<TalentPassportApiResponse | null>(
    demoProfile
      ? {
          allowed: true,
          accessScope: "employer_full",
          isOwner: false,
          verificationStatus: "verified",
          profile: demoProfile,
          privateAccess: {
            requestId: null,
            isOwner: false,
            status: "none",
            requestedAt: null,
            contactEmail: null,
            resumeOriginalFilename: null,
            resumeUploadedAt: null,
            resumeAvailable: false,
          },
        }
      : null,
  );
  const [loading, setLoading] = useState(!demoProfile);
  const [viewerAccountType, setViewerAccountType] = useState<"talent" | "employer" | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [introductionStatus, setIntroductionStatus] = useState<
    "idle" | "pending" | "accepted" | "declined" | "withdrawn"
  >("idle");
  const [introductionId, setIntroductionId] = useState<string | null>(null);
  const [introductionBusy, setIntroductionBusy] = useState(false);

  async function loadPrivateState(sessionToken: string) {
    const response = await fetch(
      `/api/talent/${encodeURIComponent(slug)}/private-access`,
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
        cache: "no-store",
      },
    );
    const result = (await response.json().catch(() => null)) as {
      ok?: boolean;
      state?: PrivateAccessState;
    } | null;
    if (result?.ok && result.state)
      setPayload((current) =>
        current ? { ...current, privateAccess: result.state } : current,
      );
  }

  useEffect(() => {
    if (demoProfile) return;
    let mounted = true;
    async function loadPassport() {
      try {
        const session = await getSessionWithRetry();
        if (session?.user.id) {
          const { data: viewerProfile } = await supabase
            .from("profiles")
            .select("account_type")
            .eq("user_id", session.user.id)
            .maybeSingle<{ account_type: "talent" | "employer" }>();
          if (mounted) {
            setViewerAccountType(viewerProfile?.account_type ?? null);
          }
        }
        const response = await fetch(
          `/api/talent/${encodeURIComponent(slug)}`,
          {
            headers: session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : undefined,
            cache: "no-store",
          },
        );
        const nextPayload =
          (await response.json()) as TalentPassportApiResponse;
        if (mounted) {
          setPayload(nextPayload);
          if (
            nextPayload.allowed &&
            nextPayload.accessScope &&
            !nextPayload.isOwner &&
            session?.access_token
          ) {
            const sentResponse = await fetch(
              "/api/introduction-requests/sent",
              {
                headers: { Authorization: `Bearer ${session.access_token}` },
                cache: "no-store",
              },
            );
            const sentPayload = (await sentResponse
              .json()
              .catch(() => null)) as {
              ok?: boolean;
              items?: Array<{
                requestId: string;
                talentSlug: string;
                status: "pending" | "accepted" | "declined" | "withdrawn";
              }>;
            } | null;
            const match = sentPayload?.ok
              ? sentPayload.items?.find((item) => item.talentSlug === slug)
              : null;
            setIntroductionStatus(match?.status ?? "idle");
            setIntroductionId(match?.requestId ?? null);
          }
        }
      } catch (error) {
        if (mounted)
          setPayload({
            allowed: false,
            reason: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to load this passport.",
          });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadPassport();
    return () => {
      mounted = false;
    };
  }, [demoProfile, slug]);

  const requestIntroduction = async () => {
    const session = await getSessionWithRetry();
    if (!session?.access_token || introductionBusy || isDemo) return;
    setIntroductionBusy(true);
    const response = await fetch("/api/introduction-requests", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slug }),
    });
    const result = (await response.json().catch(() => null)) as {
      ok?: boolean;
      requestId?: string;
      status?: "pending" | "accepted" | "declined" | "withdrawn";
    } | null;
    if (result?.ok && result.requestId && result.status) {
      setIntroductionId(result.requestId);
      setIntroductionStatus(result.status);
    }
    setIntroductionBusy(false);
  };

  const withdrawIntroduction = async () => {
    const session = await getSessionWithRetry();
    if (!session?.access_token || !introductionId || introductionBusy || isDemo)
      return;
    setIntroductionBusy(true);
    const response = await fetch(
      `/api/introduction-requests/${encodeURIComponent(introductionId)}/withdraw`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      },
    );
    const result = (await response.json().catch(() => null)) as {
      ok?: boolean;
      status?: "withdrawn";
    } | null;
    if (result?.ok && result.status === "withdrawn")
      setIntroductionStatus("withdrawn");
    setIntroductionBusy(false);
  };

  const updateRequest = async (
    request: PrivateAccessRequest,
    status: "accepted" | "declined" | "revoked",
  ) => {
    const session = await getSessionWithRetry();
    if (!session?.access_token || requestBusy) return;
    setRequestBusy(true);
    setRequestFeedback(null);
    const endpoint =
      status === "revoked"
        ? `/api/private-access/${request.requestId}/revoke`
        : `/api/private-access/${request.requestId}/respond`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(status === "revoked" ? {} : { "Content-Type": "application/json" }),
      },
      ...(status === "revoked" ? {} : { body: JSON.stringify({ status }) }),
    });
    const result = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
    } | null;
    if (!response.ok || !result?.ok)
      setRequestFeedback(result?.message ?? "Unable to update private access.");
    else {
      setRequestFeedback(
        status === "accepted"
          ? "Private access approved."
          : status === "declined"
            ? "Private access declined."
            : "Private access revoked.",
      );
      await loadPrivateState(session.access_token);
    }
    setRequestBusy(false);
  };

  const downloadResume = async () => {
    const session = await getSessionWithRetry();
    if (!session?.access_token || resumeBusy) return;
    setResumeBusy(true);
    const response = await fetch(
      isOwner
        ? "/api/profile/resume"
        : `/api/talent/${encodeURIComponent(slug)}/resume`,
      { headers: { Authorization: `Bearer ${session.access_token}` } },
    );
    const result = (await response.json().catch(() => null)) as {
      ok?: boolean;
      url?: string;
    } | null;
    if (result?.ok && result.url)
      window.open(result.url, "_blank", "noopener,noreferrer");
    setResumeBusy(false);
  };

  if (loading)
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#08111F] px-6 py-12 text-[#0f2744]">
          <div className="mx-auto max-w-6xl rounded-[32px] bg-[#f7ebcf] p-8">
            <p className="font-semibold uppercase tracking-[0.24em]">
              Loading talent passport...
            </p>
          </div>
        </main>
        <Footer />
      </>
    );

  if (!payload?.allowed || !payload.profile || !payload.accessScope)
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#08111F] px-6 py-12 text-[#0f2744]">
          <div className="mx-auto max-w-6xl rounded-[32px] border border-[#cda64d]/60 bg-[#f7ebcf] p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
              Passport restricted
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase">
              This talent passport is unavailable.
            </h1>
            <p className="mt-4 max-w-3xl leading-7 text-[#27405f]">
              {payload?.message ??
                "This passport is not available for your account."}
            </p>
            <Link
              href="/find-talent"
              className="mt-6 inline-flex rounded-full bg-[#0f2744] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]"
            >
              Back to find talent
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );

  const profile = payload.profile;
  const access = payload.privateAccess;
  const isOwner = payload.isOwner === true;
  const salaryLabel = profile.salaryExpectation
    ? salaryExpectationOptions.find(
        (option) => option.value === profile.salaryExpectation,
      )?.label
    : null;
  const showEmployerBackButton = viewerAccountType === "employer" && !isOwner;
  const showTalentBackButton = viewerAccountType === "talent" && isOwner;

  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-x-hidden bg-[#08111F] px-4 py-8 text-[#0f2744] sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap items-end justify-end gap-4">
            {showEmployerBackButton ? (
              <Link
                href="/find-talent"
                className="rounded-full bg-[#aff546] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#071426] transition hover:bg-[#9fea37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#aff546] focus-visible:ring-offset-2"
              >
                Back to talent search
              </Link>
            ) : null}
            {showTalentBackButton ? (
              <Link
                href="/builder"
                className="rounded-full bg-[#aff546] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#071426] transition hover:bg-[#9fea37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#aff546] focus-visible:ring-offset-2"
              >
                Back to create your card
              </Link>
            ) : null}
          </div>
          <div className="relative mx-auto max-w-5xl rounded-[38px] border border-[#D4AF37]/20 bg-[#651D2A] p-2.5 shadow-[0_24px_58px_rgba(46,13,20,0.42)] [background-image:radial-gradient(circle_at_18%_12%,rgba(212,175,55,0.1),transparent_24%),repeating-linear-gradient(135deg,rgba(247,235,207,0.045)_0,rgba(247,235,207,0.045)_1px,transparent_1px,transparent_6px),repeating-linear-gradient(45deg,transparent_0,transparent_10px,rgba(46,13,20,0.2)_11px,transparent_11px)] sm:p-4">
            <section className="relative overflow-hidden rounded-[27px] border border-[#f7ebcf]/80 bg-[#f7ebcf] p-6 shadow-[inset_0_1px_0_rgba(255,250,240,0.8),inset_0_-10px_24px_rgba(111,83,16,0.08),0_8px_18px_rgba(6,16,33,0.12)] [background-image:radial-gradient(circle_at_12%_18%,rgba(255,250,240,0.55),transparent_25%),repeating-linear-gradient(0deg,rgba(15,39,68,0.025)_0,rgba(15,39,68,0.025)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(90deg,transparent_0,transparent_14px,rgba(154,109,21,0.025)_15px,transparent_16px)] sm:p-8 lg:p-10">
              <div className="mt-6 grid gap-8 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-start">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  {profile.photoUrl ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.imageAlt ?? profile.name ?? "Confidential profile"}
                      className="h-40 w-32 rounded-[22px] object-cover"
                    />
                  ) : (
                    <div className="flex h-40 w-32 items-center justify-center rounded-[22px] bg-[#0f2744] text-4xl font-black text-[#f7ebcf]">
                      ?
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-3xl font-black uppercase leading-tight tracking-[0.05em] text-[#0f2744] sm:text-4xl">
                      {profile.name || "Confidential profile"}
                    </h2>
                    <p className="mt-2 text-lg font-semibold text-[#27405f]">
                      {profile.title}
                    </p>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#9a6d15]">
                      {profile.location}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#0f2744] px-3 py-2 text-xs font-semibold text-[#f7ebcf]">
                        {profile.availability}
                      </span>
                      <span className="rounded-full bg-[#8be4c5] px-3 py-2 text-xs font-semibold text-[#071426]">
                        {profile.focusArea}
                      </span>
                      {payload.hasProAccess ? <FreeAgentProBadge size="standard" /> : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center sm:items-end">
                  <div
                    aria-hidden="true"
                    className="flex aspect-square w-[10.35rem] items-center justify-center sm:w-[11.5rem]"
                  >
                    <img
                      src="/Free%20agent%20staff%20talent%20passport.png"
                      alt=""
                      className="h-[10.35rem] w-[10.35rem] object-contain sm:h-[11.5rem] sm:w-[11.5rem]"
                    />
                  </div>
                </div>
              </div>
              {profile.bio?.trim() ? (
                <div className="mt-7 border-t border-[#0f2744]/15 pt-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                    Bio
                  </p>
                  <p className="mt-3 min-w-0 break-words text-sm leading-7 text-[#27405f] [overflow-wrap:anywhere]">
                    {profile.bio.trim()}
                  </p>
                </div>
              ) : null}
              {profile.topStrength ? (
                <div className="mt-6 rounded-[20px] border-l-4 border-[#4f9f4e] bg-[#fffaf0] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">
                    Top strength
                  </p>
                  <p className="mt-2 min-w-0 break-words font-semibold text-[#0f2744] [overflow-wrap:anywhere]">
                    {profile.topStrength}
                  </p>
                </div>
              ) : null}
              {profile.passions?.length ? (
                <div className="mt-6 rounded-[20px] border-l-4 border-[#2bd7ef] bg-[#effcff] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">
                    Passions
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.passions.map((passion) => (
                      <span
                        key={passion}
                        className="rounded-full border border-[#0f2744]/15 bg-[#f7ebcf] px-3 py-2 text-xs font-semibold text-[#0f2744]"
                      >
                        {passion}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
            <PassportFold />
            <section className="relative overflow-hidden rounded-[27px] border border-[#f7ebcf]/80 bg-[#fffaf0] p-6 shadow-[inset_0_10px_24px_rgba(111,83,16,0.07),inset_0_-1px_0_rgba(255,250,240,0.85),0_8px_18px_rgba(6,16,33,0.12)] [background-image:radial-gradient(circle_at_88%_12%,rgba(255,250,240,0.7),transparent_28%),repeating-linear-gradient(0deg,rgba(15,39,68,0.022)_0,rgba(15,39,68,0.022)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(90deg,transparent_0,transparent_14px,rgba(154,109,21,0.022)_15px,transparent_16px)] sm:p-8 lg:p-10">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                <BriefcaseBusiness className="h-4 w-4" /> Professional record
              </div>
              <div className="mt-6">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">
                    Skills
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-[#0f2744]/15 bg-[#f7ebcf] px-3 py-2 text-xs font-semibold text-[#0f2744]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {profile.languages?.length ? (
                <div className="mt-6 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">
                    Languages
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.languages.map((language) => (
                      <span
                        key={language}
                        className="rounded-full border border-[#0f2744]/15 bg-[#effcff] px-3 py-2 text-xs font-semibold text-[#0f2744]"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {salaryLabel ? (
                <div className="mt-6 rounded-[20px] border-l-4 border-[#2bd7ef] bg-[#effcff] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">
                    Salary expectations
                  </p>
                  <p className="mt-2 font-semibold text-[#0f2744]">
                    {salaryLabel}
                  </p>
                </div>
              ) : null}
              <div className="mt-6 min-w-0 rounded-[20px] border-l-4 border-[#cda64d] bg-[#f7ebcf]/65 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">
                  Education
                </p>
                <p className="mt-3 min-w-0 whitespace-pre-line break-words text-sm leading-7 text-[#27405f] [overflow-wrap:anywhere]">
                  {profile.education || "Not listed"}
                </p>
              </div>
              {profile.careerJourney.length > 0 ? (
                <div className="mt-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                    Career journey
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {profile.careerJourney.map((position) => (
                      <div
                        key={position.id}
                        className="min-w-0 rounded-[20px] border-l-2 border-[#cda64d] bg-[#f7ebcf]/45 p-4"
                      >
                        <p className="min-w-0 break-words text-xs font-semibold uppercase tracking-[0.18em] text-[#9a6d15] [overflow-wrap:anywhere]">
                          {position.period}
                        </p>
                        <h3 className="mt-1 min-w-0 break-words font-bold text-[#0f2744] [overflow-wrap:anywhere]">
                          {position.role}
                        </h3>
                        <p className="min-w-0 break-words text-sm text-[#27405f] [overflow-wrap:anywhere]">
                          {[position.company, position.location]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {position.description ? (
                          <p className="mt-2 min-w-0 break-words text-sm leading-6 text-[#27405f] [overflow-wrap:anywhere]">
                            {position.description}
                          </p>
                        ) : null}
                        {position.achievements.length > 0 ? (
                          <div className="mt-3 min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a6d15]">Achievements</p>
                            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[#27405f]">
                              {position.achievements.map((achievement) => (
                                <li key={achievement} className="flex gap-2"><span className="text-[#cda64d]">•</span><span>{achievement}</span></li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {position.skills.length > 0 ? (
                          <div className="mt-3 min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a6d15]">Skills used</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {position.skills.map((skill) => (
                                <span key={skill} className="rounded-full border border-[#0f2744]/15 bg-[#effcff] px-2.5 py-1 text-xs font-semibold text-[#0f2744]">{skill}</span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </div>
          <section className="mt-5 rounded-[28px] border border-[#f7ebcf]/80 bg-[#f7ebcf] p-6 shadow-[0_14px_32px_rgba(6,16,33,0.12)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                  <Lock className="h-4 w-4" /> Private documents & contact
                </div>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.06em] text-[#0f2744]">
                  {access?.isOwner
                    ? "Your private details"
                    : access?.status === "revoked"
                      ? "Connection ended"
                      : accessLabel(access?.status ?? "none")}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[#27405f]">
                  {access?.isOwner
                    ? "Manage which employers can access your resume and contact email."
                    : introductionStatus === "pending"
                      ? "Private contact details and files will unlock if the Talent accepts your introduction request."
                      : access?.status === "accepted"
                        ? "Your active connection unlocks the private details below."
                        : access?.status === "revoked"
                          ? "This connection has ended. Private contact details and files are locked again."
                          : "Contact details and private files are shared after the Talent accepts your introduction request."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!isOwner && introductionStatus === "idle" ? (
                  <button
                    type="button"
                    onClick={() => void requestIntroduction()}
                    disabled={introductionBusy}
                    className="inline-flex min-h-11 items-center rounded-full bg-[#aff546] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#0f2744] transition hover:bg-[#9fea37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#aff546] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Request introduction
                  </button>
                ) : null}
                {!isOwner && introductionStatus === "pending" ? (
                  <button
                    type="button"
                    onClick={() => void withdrawIntroduction()}
                    disabled={introductionBusy}
                    className="inline-flex min-h-11 items-center rounded-full bg-[#aff546] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#0f2744] transition hover:bg-[#9fea37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#aff546] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Introduction pending · Withdraw
                  </button>
                ) : null}
                {!isOwner && introductionStatus === "accepted" && access?.status !== "revoked" ? (
                  <span className="inline-flex min-h-11 items-center rounded-full bg-[#8be4c5] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#071426]">
                    Connected
                  </span>
                ) : null}
                {!isOwner &&
                (introductionStatus === "declined" ||
                  introductionStatus === "withdrawn" ||
                  (introductionStatus === "accepted" && access?.status === "revoked")) ? (
                  <button
                    type="button"
                    onClick={() => void requestIntroduction()}
                    disabled={introductionBusy}
                    className="inline-flex min-h-11 items-center rounded-full border border-[#cda64d] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#0f2744]"
                  >
                    Request introduction again
                  </button>
                ) : null}
              </div>
            </div>
            {requestFeedback ? (
              <p className="mt-4 rounded-2xl bg-[#fff7dc] px-4 py-3 text-sm font-semibold text-[#6f5310]">
                {requestFeedback}
              </p>
            ) : null}
            {access &&
            (access.status === "accepted" || access.status === "owner_full") ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[20px] border border-[#cda64d]/35 bg-[#fffaf0] p-4">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">
                    <Mail className="h-4 w-4" /> Contact email
                  </p>
                  <p className="mt-2 font-semibold text-[#0f2744]">
                    {access.contactEmail ?? "Not available"}
                  </p>
                </div>
                <div className="rounded-[20px] border border-[#cda64d]/35 bg-[#fffaf0] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">
                    Resume
                  </p>
                  {access.resumeAvailable ? (
                    <button
                      type="button"
                      onClick={() => void downloadResume()}
                      disabled={resumeBusy}
                      className="mt-2 inline-flex items-center gap-2 font-semibold text-[#0f2744] underline underline-offset-4"
                    >
                      <Download className="h-4 w-4" />
                      {resumeBusy
                        ? "Opening..."
                        : (access.resumeOriginalFilename ?? "View resume")}
                    </button>
                  ) : (
                    <p className="mt-2 text-sm text-[#27405f]">
                      No resume uploaded.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
            {access?.isOwner && access.requests?.length ? (
              <div className="mt-6 space-y-3">
                {access.requests.map((request) => (
                  <div
                    key={request.requestId}
                    className="flex flex-col gap-3 rounded-[20px] border border-[#cda64d]/35 bg-[#fffaf0] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-[#0f2744]">
                        {request.employerCompanyName ?? "Verified employer"}
                      </p>
                      <p className="text-sm text-[#27405f]">
                        {request.employerContactName ?? "Employer contact"} ·{" "}
                        {accessLabel(request.status)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {request.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void updateRequest(request, "accepted")
                            }
                            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-[#aff546] px-4 text-xs font-semibold text-[#071426]"
                          >
                            <Check className="h-4 w-4" />
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void updateRequest(request, "declined")
                            }
                            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[#cda64d] px-4 text-xs font-semibold text-[#0f2744]"
                          >
                            <X className="h-4 w-4" />
                            Decline
                          </button>
                        </>
                      ) : null}
                      {request.status === "accepted" ? (
                        <button
                          type="button"
                          onClick={() => void updateRequest(request, "revoked")}
                          className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[#0f2744]/25 px-4 text-xs font-semibold text-[#0f2744]"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
            </div>
      </main>
      <Footer />
    </>
  );
}
