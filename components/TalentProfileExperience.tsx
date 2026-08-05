"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BellRing, BriefcaseBusiness, Compass, Mail, MessageSquareText, Send, Sparkles } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import FreeAgentCard from "@/components/cards/FreeAgentCard";
import SkillChip from "@/components/cards/SkillChip";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/lib/supabase-client";
import type { FreeAgentProfile, IntroductionRequest } from "@/types/freeagent";

type TalentProfileExperienceProps = {
  profile: FreeAgentProfile;
  candidateSlug: string;
  candidateUserId: string;
  candidateName: string;
};

const buildDetails = (profile: FreeAgentProfile) => ({
  story:
    profile.summary ||
    `A premium ${profile.title.toLowerCase()} with ${profile.experienceYears}+ years of experience across ${profile.focusArea.toLowerCase()}.`,
  qualifications: [
    `${profile.experienceYears}+ years of experience`,
    `Expert in ${profile.topStrength}`,
    `Available for ${profile.availability.toLowerCase()}`,
  ],
  contactPoints: [
    { label: "Email", value: profile.email ?? "Open for introductions" },
    { label: "Location", value: profile.location },
    { label: "Availability", value: profile.availability },
  ],
});

const createRequest = ({
  employerUserId,
  employerName,
  employerEmail,
  candidateSlug,
  candidateUserId,
  message,
}: {
  employerUserId: string;
  employerName: string;
  employerEmail?: string;
  candidateSlug: string;
  candidateUserId: string;
  message: string;
}): IntroductionRequest => ({
  id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
  createdAt: new Date().toISOString(),
  status: "pending",
  employerUserId,
  employerName,
  employerEmail,
  candidateSlug,
  candidateUserId,
  message,
  isRead: false,
});

export default function TalentProfileExperience({
  profile,
  candidateSlug,
  candidateUserId,
  candidateName,
}: TalentProfileExperienceProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [requestState, setRequestState] = useState<IntroductionRequest | null>(null);
  const [requests, setRequests] = useState<IntroductionRequest[]>([]);
  const [message, setMessage] = useState(
    "Hi, I’d love to learn more about your background and explore a possible introduction.",
  );
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadState() {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;

      if (!mounted) {
        return;
      }

      setSession(currentSession);

      if (!currentSession || currentSession.user.id === candidateUserId) {
        setLoading(false);
        return;
      }

      const { data: rowData } = await supabase.from("profiles").select("profile").eq("user_id", candidateUserId).maybeSingle();
      const profilePayload = (rowData as { profile?: unknown } | null | undefined)?.profile as
        | { introductionRequests?: IntroductionRequest[] }
        | undefined;
      const candidateRequests = Array.isArray(profilePayload?.introductionRequests)
        ? profilePayload.introductionRequests
        : [];

      const myRequest = candidateRequests.find((item) => item.employerUserId === currentSession.user.id) ?? null;
      setRequests(candidateRequests);
      setRequestState(myRequest);
      setLoading(false);
    }

    loadState();

    return () => {
      mounted = false;
    };
  }, [candidateUserId]);

  const canViewFullProfile = useMemo(() => {
    if (!session) {
      return false;
    }

    return session.user.id === candidateUserId || requestState?.status === "accepted";
  }, [candidateUserId, requestState?.status, session]);

  const pendingCount = useMemo(
    () => requests.filter((item) => item.status === "pending").length,
    [requests],
  );

  const submitRequest = async () => {
    if (!session) {
      setFeedback("Please sign in to request an introduction.");
      return;
    }

    if (session.user.id === candidateUserId) {
      setFeedback("You can’t request an introduction to your own profile.");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const newRequest = createRequest({
      employerUserId: session.user.id,
      employerName: session.user.email?.split("@")[0] ?? "Employer",
      employerEmail: session.user.email ?? undefined,
      candidateSlug,
      candidateUserId,
      message,
    });

    const { data: rowData } = await supabase.from("profiles").select("profile").eq("user_id", candidateUserId).maybeSingle();
    const existingProfile = (rowData as { profile?: unknown } | null | undefined)?.profile as
      | { introductionRequests?: IntroductionRequest[] }
      | undefined;
    const existingRequests = Array.isArray(existingProfile?.introductionRequests)
      ? existingProfile.introductionRequests
      : [];
    const nextRequests = [...existingRequests.filter((item) => item.employerUserId !== session.user.id), newRequest];

    const { error } = await supabase.from("profiles").upsert(
      [
        {
          user_id: candidateUserId,
          slug: candidateSlug,
          profile: { ...(existingProfile ?? {}), introductionRequests: nextRequests } as unknown as Record<string, unknown>,
        } as never,
      ],
      { onConflict: "user_id" } as never,
    );

    setIsSubmitting(false);

    if (error) {
      setFeedback(error.message);
      return;
    }

    setRequests(nextRequests);
    setRequestState(newRequest);
    setFeedback("Introduction request sent. The candidate will review it in the dashboard.");
  };

  const askQuestion = async () => {
    if (!session || !requestState) {
      return;
    }

    setIsSubmitting(true);
    const { data: rowData } = await supabase.from("profiles").select("profile").eq("user_id", candidateUserId).maybeSingle();
    const existingProfile = (rowData as { profile?: unknown } | null | undefined)?.profile as
      | { introductionRequests?: IntroductionRequest[] }
      | undefined;
    const existingRequests = Array.isArray(existingProfile?.introductionRequests)
      ? existingProfile.introductionRequests
      : [];

    const nextRequests = existingRequests.map((item) =>
      item.id === requestState.id ? { ...item, question, status: "pending" as const } : item,
    );

    const { error } = await supabase.from("profiles").upsert(
      [
        {
          user_id: candidateUserId,
          slug: candidateSlug,
          profile: { ...(existingProfile ?? {}), introductionRequests: nextRequests } as unknown as Record<string, unknown>,
        } as never,
      ],
      { onConflict: "user_id" } as never,
    );

    setIsSubmitting(false);

    if (error) {
      setFeedback(error.message);
      return;
    }

    setRequests(nextRequests);
    setRequestState((current) => (current ? { ...current, question, status: "pending" } : current));
    setQuestion("");
    setFeedback("Question sent to the candidate.");
  };

  const details = buildDetails(profile);
  const isConfidential = (profile.visibility ?? "public") === "confidential";

  if (isConfidential) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-start">
            <div className="rounded-[36px] border border-[#cda64d]/70 bg-[#0f2744] p-8 text-[#f7ebcf] shadow-[0_18px_55px_rgba(6,16,33,0.18)] sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#f2cc63]">Confidential talent passport</p>
              <h1 className="mt-4 text-4xl font-black uppercase tracking-[0.12em] text-[#f7ebcf] sm:text-5xl">Anonymous profile</h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-[#dfe7ef]">
                This talent profile is intentionally private. Employers can still request an introduction and begin a trusted conversation.
              </p>
              <div className="mt-8 flex justify-center">
                <FreeAgentCard profile={profile} className="w-full max-w-[430px]" />
              </div>
            </div>

            <aside id="request-introduction" className="rounded-[30px] border border-[#cda64d]/70 bg-[#0f2744] p-6 text-[#f7ebcf] shadow-[0_12px_40px_rgba(6,16,33,0.2)] sm:p-8">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                <BellRing className="h-4 w-4" />
                Confidential Mode status
              </div>
              <p className="mt-4 text-sm leading-7 text-[#dfe7ef]">
                Confidential Mode is active. Introduction requests are intentionally not enabled in this sprint.
              </p>

              <div className="mt-5 rounded-[20px] border border-[#f2cc63]/25 bg-[#f7ebcf]/10 p-4 text-sm leading-7 text-[#dfe7ef]">
                Candidate identity is protected and direct outreach is paused until the introduction flow launches.
              </div>

              {!loading && !session ? (
                <div className="mt-5 rounded-[20px] border border-[#f2cc63]/25 bg-[#f7ebcf]/10 p-4 text-sm leading-7 text-[#dfe7ef]">
                  Sign in with a verified employer account to access future confidential introductions.
                </div>
              ) : null}

              {feedback ? (
                <div className="mt-5 rounded-[20px] border border-[#f2cc63]/25 bg-[#f7ebcf]/10 p-4 text-sm leading-7 text-[#dfe7ef]">
                  {feedback}
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
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#9a6d15]">Talent profile</p>
            <h1 className="mt-4 text-4xl font-black uppercase tracking-[0.12em] text-[#0f2744] sm:text-5xl">{candidateName}</h1>
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
                    {canViewFullProfile ? "Premium profile unlocked" : "Public profile preview"}
                  </div>
                  <h2 className="mt-5 text-3xl font-black uppercase leading-tight tracking-[0.16em] text-[#f7ebcf] sm:text-4xl lg:text-5xl">
                    {profile.title}
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
                  </div>
                </div>
                <div className="flex justify-center">
                  <FreeAgentCard profile={profile} className="w-full max-w-[430px]" />
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
                {canViewFullProfile ? details.story : "Unlock the full profile once the candidate accepts your introduction request."}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#0f2744] p-6 text-[#f7ebcf] shadow-[0_12px_40px_rgba(6,16,33,0.2)] sm:p-8">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                <BellRing className="h-4 w-4" />
                Introduction requests
              </div>
              <p className="mt-4 text-sm leading-7 text-[#dfe7ef]">
                Request an introduction to open the candidate’s full profile after acceptance.
              </p>
              <div className="mt-5 flex items-center gap-3 rounded-[20px] border border-[#f2cc63]/30 bg-white/10 px-4 py-3 text-sm font-semibold text-[#f7ebcf]">
                <span className="rounded-full bg-[#f2cc63] px-2.5 py-1 text-[11px] uppercase tracking-[0.24em] text-[#0f2744]">{pendingCount} pending</span>
                {canViewFullProfile ? "Your request was accepted." : "Waiting for candidate approval."}
              </div>

              {!session ? (
                <div className="mt-5 rounded-[20px] border border-[#f2cc63]/25 bg-[#f7ebcf]/10 p-4 text-sm leading-7 text-[#dfe7ef]">
                  Sign in to send an introduction request.
                </div>
              ) : null}

              {session && session.user.id !== candidateUserId ? (
                <div className="mt-5 space-y-4">
                  <label className="block text-sm font-semibold uppercase tracking-[0.24em] text-[#f2cc63]">
                    Your note to the candidate
                    <textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      rows={4}
                      className="mt-3 w-full rounded-[20px] border border-[#f2cc63]/25 bg-[#f7ebcf]/10 px-4 py-3 text-sm text-[#f7ebcf] outline-none placeholder:text-[#dfe7ef]/70"
                      placeholder="Describe what you’re hoping to explore"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={submitRequest}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-full border border-[#f2cc63]/30 bg-[#f2cc63] px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#e8c85c]"
                  >
                    <Send className="h-4 w-4" />
                    {isSubmitting ? "Sending..." : "Request introduction"}
                  </button>
                </div>
              ) : null}

              {requestState && !canViewFullProfile ? (
                <div className="mt-5 rounded-[20px] border border-[#f2cc63]/25 bg-[#f7ebcf]/10 p-4 text-sm leading-7 text-[#dfe7ef]">
                  <p className="font-semibold uppercase tracking-[0.24em] text-[#f2cc63]">Your request</p>
                  <p className="mt-2">Status: {requestState.status}</p>
                  {requestState.message ? <p className="mt-2">Note: {requestState.message}</p> : null}
                  {requestState.question ? <p className="mt-2">Question: {requestState.question}</p> : null}
                </div>
              ) : null}

              {feedback ? (
                <div className="mt-5 rounded-[20px] border border-[#f2cc63]/25 bg-[#f7ebcf]/10 p-4 text-sm leading-7 text-[#dfe7ef]">
                  {feedback}
                </div>
              ) : null}
            </div>

            {canViewFullProfile ? (
              <>
                <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#f7ebcf]/80 p-6 shadow-[0_12px_40px_rgba(6,16,33,0.12)] sm:p-8">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                    <BriefcaseBusiness className="h-4 w-4" />
                    Key strengths
                  </div>
                  <div className="mt-5 space-y-4">
                    {details.qualifications.map((item) => (
                      <div key={item} className="rounded-[20px] border border-[#cda64d]/35 bg-white/70 p-4 text-sm leading-7 text-[#27405f]">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#f7ebcf]/80 p-6 shadow-[0_12px_40px_rgba(6,16,33,0.12)] sm:p-8">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                    <Mail className="h-4 w-4" />
                    Contact details
                  </div>
                  <div className="mt-5 space-y-4">
                    {details.contactPoints.map((item) => (
                      <div key={item.label} className="rounded-[20px] border border-[#cda64d]/35 bg-white/70 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">{item.label}</p>
                        <p className="mt-2 text-lg font-semibold text-[#0f2744]">{item.value}</p>
                      </div>
                    ))}
                    <Link
                      href={`mailto:${profile.email ?? "hello@freeagentstaff.com"}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
                    >
                      <Mail className="h-4 w-4" />
                      Reach out
                    </Link>
                  </div>
                </div>

                <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#f7ebcf]/80 p-6 shadow-[0_12px_40px_rgba(6,16,33,0.12)] sm:p-8">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                    <MessageSquareText className="h-4 w-4" />
                    Skills
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {profile.skills.map((skill) => (
                      <SkillChip key={skill} label={skill} />
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
