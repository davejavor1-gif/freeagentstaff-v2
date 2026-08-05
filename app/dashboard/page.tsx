"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageSquareText, XCircle } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import type { FreeAgentProfile, IntroductionRequest } from "@/types/freeagent";

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
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
      const { data } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setSession(data.session);

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("profile, slug")
        .eq("user_id", data.session.user.id)
        .maybeSingle();

      if (!mounted) {
        return;
      }

      const profileRowData = profileRow as { profile?: unknown; slug?: string | null } | null | undefined;
      const profilePayload = profileRowData?.profile as FreeAgentProfile | undefined;
      const nextProfile = profilePayload
        ? { ...profilePayload, slug: (profilePayload as { slug?: string }).slug ?? profileRowData?.slug ?? undefined }
        : null;
      const nextRequests = Array.isArray(nextProfile?.introductionRequests) ? nextProfile.introductionRequests : [];

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

  const saveRequests = async (nextRequests: IntroductionRequest[]) => {
    if (!session || !profile) {
      return;
    }

    const { error } = await supabase.from("profiles").upsert(
      [
        {
          user_id: session.user.id,
          slug: profile.slug ?? null,
          profile: { ...profile, introductionRequests: nextRequests } as unknown as Record<string, unknown>,
        } as never,
      ],
      { onConflict: "user_id" } as never,
    );

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
    router.replace("/login");
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
                Review employer introduction requests, accept or decline them, and reply with a question when you want more context.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                {pendingCount} pending · {unreadCount} new
              </div>
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
            <Link href="/builder" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              Edit your profile
            </Link>
            <Link href="/privacy" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              Manage privacy
            </Link>
          </div>
        </div>

        {feedback ? (
          <div className="mb-8 rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
            {feedback}
          </div>
        ) : null}

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
      </div>
    </main>
  );
}
