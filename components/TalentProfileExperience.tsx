"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BriefcaseBusiness, Compass, Lock, Mail, Sparkles } from "lucide-react";
import SkillChip from "@/components/cards/SkillChip";
import Navbar from "@/components/layout/Navbar";
import TalentCard from "@/components/TalentCard";
import { getSessionWithRetry } from "@/lib/supabase-client";
import type { TalentPassportApiResponse } from "@/types/discovery";

export default function TalentProfileExperience({ slug }: { slug: string }) {
  const [payload, setPayload] = useState<TalentPassportApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [requestState, setRequestState] = useState<"idle" | "pending" | "accepted" | "declined" | "withdrawn">("idle");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPassport() {
      try {
        const session = await getSessionWithRetry();
        const response = await fetch(`/api/talent/${encodeURIComponent(slug)}`, {
          method: "GET",
          headers: session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : undefined,
          cache: "no-store",
        });

        const nextPayload = (await response.json()) as TalentPassportApiResponse;

        if (!mounted) {
          return;
        }

        setPayload(nextPayload);

        if (nextPayload.allowed && nextPayload.accessScope && !nextPayload.isOwner && session?.access_token) {
          const [savedResponse, sentResponse] = await Promise.all([
            fetch("/api/saved-talent", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              cache: "no-store",
            }),
            fetch("/api/introduction-requests/sent", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              cache: "no-store",
            }),
          ]);

          const savedPayload = (await savedResponse.json().catch(() => null)) as
            | { ok?: boolean; items?: Array<{ slug?: string }> }
            | null;
          const sentPayload = (await sentResponse.json().catch(() => null)) as
            | { ok?: boolean; items?: Array<{ requestId: string; talentSlug: string; status: "pending" | "accepted" | "declined" | "withdrawn" }> }
            | null;

          if (savedPayload?.ok && Array.isArray(savedPayload.items)) {
            setIsSaved(savedPayload.items.some((item) => item.slug === slug));
          } else {
            setIsSaved(false);
          }

          const matchingRequest = sentPayload?.ok && Array.isArray(sentPayload.items)
            ? sentPayload.items.find((item) => item.talentSlug === slug)
            : null;

          if (matchingRequest) {
            setRequestState(matchingRequest.status);
            setRequestId(matchingRequest.requestId);
          } else {
            setRequestState("idle");
            setRequestId(null);
          }
        } else {
          setIsSaved(false);
          setRequestState("idle");
          setRequestId(null);
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        setPayload({
          allowed: false,
          reason: "error",
          message: error instanceof Error ? error.message : "Unable to load this passport.",
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadPassport();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const requestIntroduction = async () => {
    const session = await getSessionWithRetry();

    if (!session?.access_token || requestBusy) {
      return;
    }

    setRequestBusy(true);
    setRequestFeedback(null);

    try {
      const response = await fetch("/api/introduction-requests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; requestId?: string; status?: "pending" | "accepted" | "declined" | "withdrawn"; alreadyExists?: boolean; message?: string }
        | null;

      if (!response.ok || !result?.ok || !result.requestId || !result.status) {
        setRequestFeedback(result?.message ?? "Unable to create introduction request.");
        return;
      }

      setRequestId(result.requestId);
      setRequestState(result.status);
      setIsSaved(true);
      setRequestFeedback(result.alreadyExists ? "Introduction request already pending." : "Introduction request sent.");
    } catch {
      setRequestFeedback("Unable to create introduction request.");
    } finally {
      setRequestBusy(false);
    }
  };

  const withdrawIntroduction = async () => {
    const session = await getSessionWithRetry();

    if (!session?.access_token || !requestId || requestBusy) {
      return;
    }

    setRequestBusy(true);
    setRequestFeedback(null);

    try {
      const response = await fetch(`/api/introduction-requests/${encodeURIComponent(requestId)}/withdraw`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = (await response.json().catch(() => null)) as { ok?: boolean; status?: "withdrawn"; message?: string } | null;

      if (!response.ok || !result?.ok || result.status !== "withdrawn") {
        setRequestFeedback(result?.message ?? "Unable to withdraw request.");
        return;
      }

      setRequestState("withdrawn");
      setRequestFeedback("Introduction request withdrawn.");
    } catch {
      setRequestFeedback("Unable to withdraw request.");
    } finally {
      setRequestBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 lg:px-12">
          <div className="rounded-[36px] border border-[#cda64d]/45 bg-[#f7ebcf]/85 p-8 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)] sm:p-10">
            <p className="text-lg font-semibold uppercase tracking-[0.24em] text-[#0f2744]">Loading talent passport...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!payload?.allowed || !payload.profile || !payload.accessScope) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 lg:px-12">
          <div className="rounded-[36px] border border-[#cda64d]/45 bg-[#f7ebcf]/85 p-8 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)] sm:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Passport restricted</p>
            <h1 className="mt-4 text-3xl font-black uppercase tracking-[0.12em] text-[#0f2744] sm:text-4xl">
              This talent passport is unavailable.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[#27405f]">
              {payload?.message ?? "This passport is not available for your account or the profile is no longer discoverable."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/find-talent"
                className="inline-flex items-center justify-center rounded-full border border-[#0f2744]/25 bg-[#0f2744] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
              >
                Back to find talent
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-[#cda64d]/40 bg-[#f7ebcf] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#e9d88f]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const profile = payload.profile;
  const isConfidentialEmployerView = payload.accessScope === "employer_confidential";
  const isOwner = payload.isOwner === true;
  const cardHref = `/talent/${profile.slug ?? slug}`;

  if (isConfidentialEmployerView) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-start">
            <div className="rounded-[36px] border border-[#cda64d]/70 bg-[#0f2744] p-8 text-[#f7ebcf] shadow-[0_18px_55px_rgba(6,16,33,0.18)] sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#f2cc63]">Confidential talent passport</p>
              <h1 className="mt-4 text-4xl font-black uppercase tracking-[0.12em] text-[#f7ebcf] sm:text-5xl">Anonymous profile</h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-[#dfe7ef]">
                This talent profile is intentionally private. Verified employers can review anonymous signals without receiving identifying or contact information.
              </p>
              <div className="mt-6">
                <Link
                  href="/find-talent"
                  className="inline-flex items-center justify-center rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#f7ebcf]/20"
                >
                  Back to talent search
                </Link>
              </div>
              <div className="mt-8 flex justify-center">
                <TalentCard
                  profile={profile}
                  href={cardHref}
                  verificationStatus={payload.verificationStatus}
                  className="w-full max-w-[430px]"
                  showSaveAction
                  initiallySaved={isSaved}
                  onSavedChange={setIsSaved}
                />
              </div>
            </div>

            <aside className="rounded-[30px] border border-[#cda64d]/70 bg-[#0f2744] p-6 text-[#f7ebcf] shadow-[0_12px_40px_rgba(6,16,33,0.2)] sm:p-8">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                <Lock className="h-4 w-4" />
                Confidential Mode status
              </div>
              <p className="mt-4 text-sm leading-7 text-[#dfe7ef]">
                Confidential Mode is active. Identifying fields, media, current employer, and direct contact information never reach the employer browser.
              </p>

              <div className="mt-5 rounded-[20px] border border-[#f2cc63]/25 bg-[#f7ebcf]/10 p-4 text-sm leading-7 text-[#dfe7ef]">
                Anonymous signals remain available: focus area, availability, opportunity status, experience, top strength, and skills.
              </div>

              {!isOwner ? (
                <div className="mt-5 rounded-[20px] border border-[#f2cc63]/25 bg-[#f7ebcf]/10 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f2cc63]">Introduction</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {requestState === "idle" ? (
                      <button
                        type="button"
                        onClick={() => {
                          void requestIntroduction();
                        }}
                        disabled={requestBusy}
                        className="inline-flex min-h-11 items-center rounded-full border border-[#f2cc63]/35 bg-[#f2cc63] px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#f5d987] disabled:opacity-50"
                      >
                        Request introduction
                      </button>
                    ) : null}

                    {requestState === "pending" ? (
                      <>
                        <span className="inline-flex min-h-11 items-center rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf]">
                          Introduction requested
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void withdrawIntroduction();
                          }}
                          disabled={requestBusy}
                          className="inline-flex min-h-11 items-center rounded-full border border-[#f2cc63]/35 bg-transparent px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f2cc63] transition hover:bg-[#f7ebcf]/10 disabled:opacity-50"
                        >
                          Withdraw
                        </button>
                      </>
                    ) : null}

                    {requestState === "accepted" ? (
                      <span className="inline-flex min-h-11 items-center rounded-full border border-emerald-400/45 bg-emerald-500/15 px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
                        Introduction accepted
                      </span>
                    ) : null}

                    {requestState === "declined" ? (
                      <>
                        <span className="inline-flex min-h-11 items-center rounded-full border border-rose-300/45 bg-rose-500/15 px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-100">
                          Introduction declined
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void requestIntroduction();
                          }}
                          disabled={requestBusy}
                          className="inline-flex min-h-11 items-center rounded-full border border-[#f2cc63]/35 bg-transparent px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f2cc63] transition hover:bg-[#f7ebcf]/10 disabled:opacity-50"
                        >
                          Request again
                        </button>
                      </>
                    ) : null}

                    {requestState === "withdrawn" ? (
                      <button
                        type="button"
                        onClick={() => {
                          void requestIntroduction();
                        }}
                        disabled={requestBusy}
                        className="inline-flex min-h-11 items-center rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f2cc63] transition hover:bg-[#f7ebcf]/20 disabled:opacity-50"
                      >
                        Request introduction
                      </button>
                    ) : null}
                  </div>
                  {requestFeedback ? <p className="mt-3 text-sm text-[#dfe7ef]">{requestFeedback}</p> : null}
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#9a6d15]">
              {isOwner ? "Owner access" : "Employer marketplace"}
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase tracking-[0.12em] text-[#0f2744] sm:text-5xl">
              {profile.name || "Talent Passport"}
            </h1>
          </div>
          <Link
            href="/find-talent"
            className="inline-flex items-center justify-center rounded-full border border-[#cda64d]/40 bg-[#f7ebcf] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#e9d88f]"
          >
            Back to talent search
          </Link>
        </div>

        <section className="mb-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[36px] border border-[#cda64d]/70 bg-[#0f2744] p-6 shadow-[0_18px_55px_rgba(6,16,33,0.18)] sm:p-8">
              <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#f2cc63]/40 bg-[#f7ebcf]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                    <Sparkles className="h-3.5 w-3.5" />
                    {isOwner ? "Owner passport view" : "Verified employer passport"}
                  </div>
                  <h2 className="mt-5 text-3xl font-black uppercase leading-tight tracking-[0.16em] text-[#f7ebcf] sm:text-4xl lg:text-5xl">
                    {profile.title || profile.focusArea}
                  </h2>
                  <p className="mt-3 text-lg font-semibold uppercase tracking-[0.24em] text-[#f2cc63]">
                    {profile.location}
                  </p>
                  <p className="mt-3 text-base leading-8 text-[#dfe7ef] sm:text-lg">
                    {profile.summary}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <div className="rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-3 py-2 text-sm font-semibold text-[#f7ebcf]">
                      {profile.availability}
                    </div>
                    <div className="rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-3 py-2 text-sm font-semibold text-[#f7ebcf]">
                      {profile.focusArea}
                    </div>
                    <div className="rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-3 py-2 text-sm font-semibold text-[#f7ebcf]">
                      {profile.experienceYears}+ years
                    </div>
                    {profile.currentEmployer ? (
                      <div className="rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-3 py-2 text-sm font-semibold text-[#f7ebcf]">
                        {profile.currentEmployer}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex justify-center">
                  <TalentCard
                    profile={profile}
                    href={cardHref}
                    verificationStatus={payload.verificationStatus}
                    className="w-full max-w-[430px]"
                    showSaveAction={!isOwner}
                    initiallySaved={isSaved}
                    onSavedChange={setIsSaved}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#f7ebcf]/80 p-6 shadow-[0_12px_40px_rgba(6,16,33,0.12)] sm:p-8">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                <Compass className="h-4 w-4" />
                Profile story
              </div>
              <h2 className="mt-4 text-2xl font-black uppercase tracking-[0.16em] text-[#0f2744]">
                Built to help hiring teams move faster
              </h2>
              <p className="mt-4 text-base leading-8 text-[#27405f]">
                {profile.summary || `A premium ${profile.focusArea.toLowerCase()} specialist ready for verified employer review.`}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#0f2744] p-6 text-[#f7ebcf] shadow-[0_12px_40px_rgba(6,16,33,0.2)] sm:p-8">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                <BriefcaseBusiness className="h-4 w-4" />
                Access summary
              </div>
              <p className="mt-4 text-sm leading-7 text-[#dfe7ef]">
                {isOwner
                  ? "You are viewing your own passport with owner-level access."
                  : "This employer-safe view excludes private contact information while preserving authorised profile details."}
              </p>
              <div className="mt-5 flex items-center gap-3 rounded-[20px] border border-[#f2cc63]/30 bg-white/10 px-4 py-3 text-sm font-semibold text-[#f7ebcf]">
                <span className="rounded-full bg-[#f2cc63] px-2.5 py-1 text-[11px] uppercase tracking-[0.24em] text-[#0f2744]">
                  {isOwner ? "Owner" : "Employer-safe"}
                </span>
                {isOwner ? "Private contact information remains owner-only." : "Email, phone, and private contact fields are withheld in V1."}
              </div>

              {!isOwner ? (
                <div className="mt-5 rounded-[20px] border border-[#f2cc63]/30 bg-white/10 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f2cc63]">Introduction</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {requestState === "idle" ? (
                      <button
                        type="button"
                        onClick={() => {
                          void requestIntroduction();
                        }}
                        disabled={requestBusy}
                        className="inline-flex min-h-11 items-center rounded-full border border-[#f2cc63]/35 bg-[#f2cc63] px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#f5d987] disabled:opacity-50"
                      >
                        Request introduction
                      </button>
                    ) : null}

                    {requestState === "pending" ? (
                      <>
                        <span className="inline-flex min-h-11 items-center rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf]">
                          Introduction requested
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void withdrawIntroduction();
                          }}
                          disabled={requestBusy}
                          className="inline-flex min-h-11 items-center rounded-full border border-[#f2cc63]/35 bg-transparent px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f2cc63] transition hover:bg-[#f7ebcf]/10 disabled:opacity-50"
                        >
                          Withdraw
                        </button>
                      </>
                    ) : null}

                    {requestState === "accepted" ? (
                      <span className="inline-flex min-h-11 items-center rounded-full border border-emerald-400/45 bg-emerald-500/15 px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
                        Introduction accepted
                      </span>
                    ) : null}

                    {requestState === "declined" ? (
                      <>
                        <span className="inline-flex min-h-11 items-center rounded-full border border-rose-300/45 bg-rose-500/15 px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-100">
                          Introduction declined
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void requestIntroduction();
                          }}
                          disabled={requestBusy}
                          className="inline-flex min-h-11 items-center rounded-full border border-[#f2cc63]/35 bg-transparent px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f2cc63] transition hover:bg-[#f7ebcf]/10 disabled:opacity-50"
                        >
                          Request again
                        </button>
                      </>
                    ) : null}

                    {requestState === "withdrawn" ? (
                      <button
                        type="button"
                        onClick={() => {
                          void requestIntroduction();
                        }}
                        disabled={requestBusy}
                        className="inline-flex min-h-11 items-center rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f2cc63] transition hover:bg-[#f7ebcf]/20 disabled:opacity-50"
                      >
                        Request introduction
                      </button>
                    ) : null}
                  </div>
                  {requestFeedback ? <p className="mt-3 text-sm text-[#dfe7ef]">{requestFeedback}</p> : null}
                </div>
              ) : null}
            </div>

            {isOwner ? (
              <>
                <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#f7ebcf]/80 p-6 shadow-[0_12px_40px_rgba(6,16,33,0.12)] sm:p-8">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                    <Mail className="h-4 w-4" />
                    Owner contact details
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-[20px] border border-[#cda64d]/35 bg-white/70 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Email</p>
                      <p className="mt-2 text-lg font-semibold text-[#0f2744]">{profile.email ?? "Not listed"}</p>
                    </div>
                    <div className="rounded-[20px] border border-[#cda64d]/35 bg-white/70 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Current employer</p>
                      <p className="mt-2 text-lg font-semibold text-[#0f2744]">{profile.currentEmployer ?? "Not listed"}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#f7ebcf]/80 p-6 shadow-[0_12px_40px_rgba(6,16,33,0.12)] sm:p-8">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                <BriefcaseBusiness className="h-4 w-4" />
                Skills
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {profile.skills.map((skill) => (
                  <SkillChip key={skill} label={skill} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {profile.careerJourney.length > 0 ? (
          <section className="rounded-[30px] border border-[#cda64d]/70 bg-[#0f2744] p-6 text-[#f7ebcf] shadow-[0_12px_40px_rgba(6,16,33,0.2)] sm:p-8">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
              <BriefcaseBusiness className="h-4 w-4" />
              Career Journey
            </div>
            <div className="mt-5 space-y-4">
              {profile.careerJourney.map((position, index) => (
                <div key={position.id} className="rounded-[24px] border border-[#f2cc63]/25 bg-[#f7ebcf]/10 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                        {position.period || "Timeline entry"}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-[#f7ebcf]">
                        {position.role || "New role"}
                      </h3>
                      <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-[#f2cc63]">
                        {[position.company, position.location].filter(Boolean).join(" · ") || "Details available"}
                      </p>
                    </div>
                    <div className="rounded-full border border-[#f2cc63]/35 bg-[#0f2744] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf]">
                      {index + 1}
                    </div>
                  </div>
                  {position.description ? (
                    <p className="mt-4 text-sm leading-7 text-[#dfe7ef]">{position.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
