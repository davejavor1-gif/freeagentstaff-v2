"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import TalentCard from "@/components/TalentCard";
import { getSessionWithRetry } from "@/lib/supabase-client";
import type { EmployerIntroductionRequestItem } from "@/types/introduction-requests";
import type { SavedTalentItem, ShortlistSummary } from "@/types/saved-talent";

type SavedTalentResponse = {
  ok: boolean;
  items: SavedTalentItem[];
  reason?: string;
  message?: string;
};

type ShortlistResponse = {
  ok: boolean;
  shortlists: ShortlistSummary[];
  reason?: string;
  message?: string;
};

type SentRequestsResponse = {
  ok: boolean;
  items: EmployerIntroductionRequestItem[];
  reason?: string;
  message?: string;
};

const allSavedOption = "all";

export default function SavedTalentPage() {
  const [items, setItems] = useState<SavedTalentItem[]>([]);
  const [shortlists, setShortlists] = useState<ShortlistSummary[]>([]);
  const [selectedShortlistId, setSelectedShortlistId] = useState<string>(allSavedOption);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [newShortlistName, setNewShortlistName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [requestBySlug, setRequestBySlug] = useState<Record<string, EmployerIntroductionRequestItem | undefined>>({});
  const [requestBusySlug, setRequestBusySlug] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const getAuthHeaders = useCallback(async () => {
    const session = await getSessionWithRetry();

    if (!session?.access_token) {
      return null;
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  }, []);

  const loadShortlists = useCallback(async () => {
    const headers = await getAuthHeaders();

    if (!headers) {
      setShortlists([]);
      return;
    }

    const response = await fetch("/api/shortlists", {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const payload = (await response.json()) as ShortlistResponse;

    if (!payload.ok) {
      setShortlists([]);
      return;
    }

    setShortlists(payload.shortlists);
  }, [getAuthHeaders]);

  const loadSavedTalent = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setItems([]);
        return;
      }

      const shortlistQuery = selectedShortlistId !== allSavedOption
        ? `?shortlistId=${encodeURIComponent(selectedShortlistId)}`
        : "";

      const response = await fetch(`/api/saved-talent${shortlistQuery}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const payload = (await response.json()) as SavedTalentResponse;

      if (!payload.ok) {
        setItems([]);
        setFeedback(payload.message ?? "Unable to load saved talent.");
        return;
      }

      setItems(payload.items ?? []);
    } catch {
      setItems([]);
      setFeedback("Unable to load saved talent.");
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, selectedShortlistId]);

  const loadSentRequests = useCallback(async () => {
    const headers = await getAuthHeaders();

    if (!headers) {
      setRequestBySlug({});
      return;
    }

    const response = await fetch("/api/introduction-requests/sent", {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as SentRequestsResponse | null;

    if (!payload?.ok || !Array.isArray(payload.items)) {
      setRequestBySlug({});
      return;
    }

    const nextMap: Record<string, EmployerIntroductionRequestItem | undefined> = {};
    for (const item of payload.items) {
      if (!nextMap[item.talentSlug]) {
        nextMap[item.talentSlug] = item;
      }
    }

    setRequestBySlug(nextMap);
  }, [getAuthHeaders]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadShortlists();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loadShortlists]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void Promise.all([loadSavedTalent(), loadSentRequests()]);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loadSavedTalent, loadSentRequests]);

  const selectedShortlist = useMemo(
    () => shortlists.find((shortlist) => shortlist.id === selectedShortlistId) ?? null,
    [shortlists, selectedShortlistId],
  );

  const refreshAll = async () => {
    await Promise.all([loadShortlists(), loadSavedTalent(), loadSentRequests()]);
  };

  const createIntroductionRequest = async (slug: string) => {
    if (isMutating || requestBusySlug) {
      return;
    }

    setRequestBusySlug(slug);
    setFeedback(null);

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setFeedback("Sign in required.");
        return;
      }

      const response = await fetch("/api/introduction-requests", {
        method: "POST",
        headers,
        body: JSON.stringify({ slug }),
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!response.ok || !payload?.ok) {
        setFeedback(payload?.message ?? "Unable to request introduction.");
        return;
      }

      await Promise.all([loadSavedTalent(), loadSentRequests()]);
      setFeedback("Introduction request sent.");
    } finally {
      setRequestBusySlug(null);
    }
  };

  const withdrawIntroductionRequest = async (requestId: string, slug: string) => {
    if (isMutating || requestBusySlug) {
      return;
    }

    setRequestBusySlug(slug);
    setFeedback(null);

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setFeedback("Sign in required.");
        return;
      }

      const response = await fetch(`/api/introduction-requests/${encodeURIComponent(requestId)}/withdraw`, {
        method: "POST",
        headers,
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!response.ok || !payload?.ok) {
        setFeedback(payload?.message ?? "Unable to withdraw introduction request.");
        return;
      }

      await loadSentRequests();
      setFeedback("Introduction request withdrawn.");
    } finally {
      setRequestBusySlug(null);
    }
  };

  const createShortlist = async () => {
    const trimmed = newShortlistName.trim();
    if (!trimmed || isMutating) {
      return;
    }

    setIsMutating(true);
    setFeedback(null);

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setFeedback("Sign in required.");
        return;
      }

      const response = await fetch("/api/shortlists", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: trimmed }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string; shortlist?: ShortlistSummary };

      if (!response.ok || !payload.ok || !payload.shortlist) {
        setFeedback(payload.message ?? "Unable to create shortlist.");
        return;
      }

      setNewShortlistName("");
      setSelectedShortlistId(payload.shortlist.id);
      await refreshAll();
    } finally {
      setIsMutating(false);
    }
  };

  const renameShortlist = async () => {
    if (!selectedShortlist || isMutating) {
      return;
    }

    const trimmed = renameInputRef.current?.value.trim() ?? "";
    if (!trimmed) {
      setFeedback("Shortlist name cannot be empty.");
      return;
    }

    setIsMutating(true);
    setFeedback(null);

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setFeedback("Sign in required.");
        return;
      }

      const response = await fetch(`/api/shortlists/${encodeURIComponent(selectedShortlist.id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name: trimmed }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setFeedback(payload.message ?? "Unable to rename shortlist.");
        return;
      }

      await refreshAll();
    } finally {
      setIsMutating(false);
    }
  };

  const deleteShortlist = async () => {
    if (!selectedShortlist || isMutating) {
      return;
    }

    setIsMutating(true);
    setFeedback(null);

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setFeedback("Sign in required.");
        return;
      }

      const response = await fetch(`/api/shortlists/${encodeURIComponent(selectedShortlist.id)}`, {
        method: "DELETE",
        headers,
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setFeedback(payload.message ?? "Unable to delete shortlist.");
        return;
      }

      setSelectedShortlistId(allSavedOption);
      await refreshAll();
    } finally {
      setIsMutating(false);
    }
  };

  const unsaveTalent = async (slug: string) => {
    if (isMutating) {
      return;
    }

    setIsMutating(true);
    setFeedback(null);

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setFeedback("Sign in required.");
        return;
      }

      const response = await fetch(`/api/saved-talent/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        headers,
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setFeedback(payload.message ?? "Unable to unsave talent.");
        return;
      }

      await refreshAll();
    } finally {
      setIsMutating(false);
    }
  };

  const toggleShortlistMembership = async (slug: string, shortlistId: string, isCurrentlyMember: boolean) => {
    if (isMutating) {
      return;
    }

    setIsMutating(true);
    setFeedback(null);

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setFeedback("Sign in required.");
        return;
      }

      const endpoint = isCurrentlyMember
        ? `/api/shortlists/${encodeURIComponent(shortlistId)}/members/${encodeURIComponent(slug)}`
        : `/api/shortlists/${encodeURIComponent(shortlistId)}/members`;

      const response = await fetch(endpoint, {
        method: isCurrentlyMember ? "DELETE" : "POST",
        headers,
        body: isCurrentlyMember ? undefined : JSON.stringify({ slug }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setFeedback(payload.message ?? "Unable to update shortlist membership.");
        return;
      }

      await refreshAll();
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
        <div className="rounded-[36px] border border-[#cda64d]/45 bg-[#f7ebcf]/78 p-5 shadow-[0_18px_55px_rgba(6,16,33,0.12)] sm:p-7 lg:p-8">
          <header className="grid gap-6 border-b border-[#cda64d]/30 pb-7 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">EMPLOYER WORKSPACE</p>
              <h1 className="mt-3 text-4xl font-black uppercase tracking-[0.12em] text-[#0f2744] sm:text-5xl">SAVED TALENT</h1>
              <p className="mt-3 text-base font-semibold text-[#17355f] sm:text-lg">Organise promising candidates for later review.</p>
            </div>
            <div className="rounded-[24px] border border-[#cda64d]/35 bg-[#0f2744] p-4 text-[#f7ebcf] shadow-[0_12px_40px_rgba(6,16,33,0.14)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">{items.length} ACCESSIBLE CANDIDATES</p>
              <p className="mt-3 text-sm leading-7 text-[#dfe7ef]">Only currently authorized profiles are shown.</p>
            </div>
          </header>

          <div className="mt-5 grid gap-4 rounded-[24px] border border-[#cda64d]/30 bg-white/90 p-4 shadow-sm lg:grid-cols-[1.2fr_1fr_1fr]">
            <div>
              <label htmlFor="shortlist-filter" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6a7a91]">
                Shortlist view
              </label>
              <select
                id="shortlist-filter"
                value={selectedShortlistId}
                onChange={(event) => setSelectedShortlistId(event.target.value)}
                className="h-11 w-full rounded-[14px] border border-[#cda64d]/35 bg-[#fffdf7] px-3 text-sm text-[#0f2744] outline-none focus:border-[#0f2744]"
              >
                <option value={allSavedOption}>All Saved Talent</option>
                {shortlists.map((shortlist) => (
                  <option key={shortlist.id} value={shortlist.id}>
                    {shortlist.name} ({shortlist.memberCount})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="new-shortlist" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6a7a91]">
                Create shortlist
              </label>
              <div className="flex gap-2">
                <input
                  id="new-shortlist"
                  value={newShortlistName}
                  onChange={(event) => setNewShortlistName(event.target.value)}
                  placeholder="e.g. Sydney Ops Lead"
                  className="h-11 w-full rounded-[14px] border border-[#cda64d]/35 bg-[#fffdf7] px-3 text-sm text-[#0f2744] outline-none focus:border-[#0f2744]"
                />
                <button
                  type="button"
                  onClick={() => {
                    void createShortlist();
                  }}
                  className="inline-flex min-h-11 items-center rounded-full border border-[#0f2744]/25 bg-[#0f2744] px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
                  disabled={isMutating}
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <p className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6a7a91]">Manage selected shortlist</p>
              <div className="flex gap-2">
                <input
                  key={selectedShortlist?.id ?? "none"}
                  ref={renameInputRef}
                  defaultValue={selectedShortlist?.name ?? ""}
                  disabled={!selectedShortlist}
                  className="h-11 w-full rounded-[14px] border border-[#cda64d]/35 bg-[#fffdf7] px-3 text-sm text-[#0f2744] outline-none focus:border-[#0f2744] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => {
                    void renameShortlist();
                  }}
                  disabled={!selectedShortlist || isMutating}
                  className="inline-flex min-h-11 items-center rounded-full border border-[#0f2744]/25 bg-[#f7ebcf] px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#e9d88f] disabled:opacity-50"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void deleteShortlist();
                  }}
                  disabled={!selectedShortlist || isMutating}
                  className="inline-flex min-h-11 items-center rounded-full border border-[#9f3a2b]/25 bg-[#9f3a2b] px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#8d3326] disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {feedback ? (
            <div className="mt-4 rounded-[20px] border border-[#cda64d]/30 bg-[#fff5db] px-4 py-3 text-sm text-[#27405f]">
              {feedback}
            </div>
          ) : null}

          <div className="mt-6">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="aspect-[2.5/3.5] w-full rounded-[28px] border border-[#cda64d]/35 bg-[#fff5db]/70 p-4 shadow-[0_10px_28px_rgba(7,19,38,0.1)]">
                    <div className="h-full w-full animate-pulse rounded-[20px] bg-[linear-gradient(135deg,rgba(15,39,68,0.08)_0%,rgba(15,39,68,0.2)_100%)]" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-[36px] border border-[#cda64d]/45 bg-[#f7ebcf]/90 p-10 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)]">
                <p className="text-lg font-black uppercase tracking-[0.24em] text-[#0f2744]">NO SAVED TALENT YET</p>
                <p className="mt-4 max-w-2xl text-base leading-8 text-[#27405f]">
                  Save candidates from Find Talent or Talent Passport to build your shortlist-ready collection.
                </p>
                <Link
                  href="/find-talent"
                  className="mt-6 inline-flex min-h-11 items-center rounded-full border border-[#0f2744]/25 bg-[#0f2744] px-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
                >
                  Go to Find Talent
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <div key={item.savedTalentId} className="space-y-3">
                    <TalentCard
                      profile={item.profile}
                      href={`/talent/${item.slug}`}
                      verificationStatus={item.verificationStatus}
                      hasProAccess={item.hasProAccess}
                      showSaveAction
                      initiallySaved
                      onSavedChange={(nextSaved) => {
                        if (!nextSaved) {
                          void unsaveTalent(item.slug);
                        }
                      }}
                    />

                    <div className="rounded-[20px] border border-[#cda64d]/30 bg-white/90 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Introduction</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {requestBySlug[item.slug]?.status === "pending" ? (
                          <>
                            <span className="inline-flex min-h-10 items-center rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]">
                              Introduction requested
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const requestId = requestBySlug[item.slug]?.requestId;
                                if (requestId) {
                                  void withdrawIntroductionRequest(requestId, item.slug);
                                }
                              }}
                              disabled={requestBusySlug === item.slug}
                              className="inline-flex min-h-10 items-center rounded-full border border-[#0f2744]/25 bg-[#f7ebcf] px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0f2744] transition hover:bg-[#e9d88f] disabled:opacity-50"
                            >
                              Withdraw
                            </button>
                          </>
                        ) : requestBySlug[item.slug]?.status === "accepted" ? (
                          <span className="inline-flex min-h-10 items-center rounded-full border border-emerald-300/60 bg-emerald-50 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                            Introduction accepted
                          </span>
                        ) : requestBySlug[item.slug]?.status === "declined" ? (
                          <>
                            <span className="inline-flex min-h-10 items-center rounded-full border border-rose-200 bg-rose-50 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-700">
                              Introduction declined
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                void createIntroductionRequest(item.slug);
                              }}
                              disabled={requestBusySlug === item.slug}
                              className="inline-flex min-h-10 items-center rounded-full border border-[#0f2744]/25 bg-[#f7ebcf] px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0f2744] transition hover:bg-[#e9d88f] disabled:opacity-50"
                            >
                              Request again
                            </button>
                          </>
                        ) : requestBySlug[item.slug]?.status === "withdrawn" ? (
                          <button
                            type="button"
                            onClick={() => {
                              void createIntroductionRequest(item.slug);
                            }}
                            disabled={requestBusySlug === item.slug}
                            className="inline-flex min-h-10 items-center rounded-full border border-[#0f2744]/25 bg-[#f7ebcf] px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0f2744] transition hover:bg-[#e9d88f] disabled:opacity-50"
                          >
                            Request introduction
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              void createIntroductionRequest(item.slug);
                            }}
                            disabled={requestBusySlug === item.slug}
                            className="inline-flex min-h-10 items-center rounded-full border border-[#0f2744]/25 bg-[#0f2744] px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] transition hover:bg-[#17355f] disabled:opacity-50"
                          >
                            Request introduction
                          </button>
                        )}
                      </div>

                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Shortlists</p>
                      <div className="mt-2 space-y-2">
                        {shortlists.map((shortlist) => {
                          const isMember = item.shortlistIds.includes(shortlist.id);
                          return (
                            <label key={`${item.savedTalentId}-${shortlist.id}`} className="flex items-center justify-between gap-2 text-sm text-[#27405f]">
                              <span>{shortlist.name}</span>
                              <input
                                type="checkbox"
                                checked={isMember}
                                onChange={() => {
                                  void toggleShortlistMembership(item.slug, shortlist.id, isMember);
                                }}
                                className="h-4 w-4 rounded border-[#cda64d]/45 text-[#0f2744]"
                                disabled={isMutating}
                              />
                            </label>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void unsaveTalent(item.slug);
                        }}
                        disabled={isMutating}
                        className="mt-3 inline-flex min-h-11 items-center rounded-full border border-[#9f3a2b]/25 bg-[#9f3a2b] px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#8d3326] disabled:opacity-50"
                      >
                        Unsave talent
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
