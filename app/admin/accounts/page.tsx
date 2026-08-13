"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import type { AdminAccountListResponse } from "@/types/admin";

async function getSessionWithTimeout() {
  return Promise.race([
    supabase.auth.getSession(),
    new Promise<{ data: { session: null } }>((resolve) => {
      window.setTimeout(() => resolve({ data: { session: null } }), 1500);
    }),
  ]);
}

export default function AdminAccountsPage() {
  const [query, setQuery] = useState("");
  const [accountType, setAccountType] = useState<"all" | "talent" | "employer">("all");
  const [payload, setPayload] = useState<AdminAccountListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<{ createdAt: string; userId: string } | null>(null);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (accountType !== "all") params.set("accountType", accountType);
    params.set("limit", "25");
    if (nextCursor) {
      params.set("cursorCreatedAt", nextCursor.createdAt);
      params.set("cursorUserId", nextCursor.userId);
    }
    return params.toString();
  }, [accountType, nextCursor, query]);

  useEffect(() => {
    let mounted = true;

    async function load(cursorReset = false) {
      try {
        const { data } = await getSessionWithTimeout();
        const currentSession = data.session;

        if (!mounted) return;

        if (!currentSession?.access_token) {
          setPayload({ ok: false, reason: "not_authenticated", message: "Sign in required.", items: [], nextCursor: null });
          return;
        }

        const response = await fetch(`/api/admin/accounts?${cursorReset ? new URLSearchParams({ q: query.trim(), accountType: accountType === "all" ? "" : accountType, limit: "25" }).toString() : searchParams}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${currentSession.access_token}` },
          cache: "no-store",
        });

        const body = (await response.json().catch(() => null)) as AdminAccountListResponse | null;
        if (!mounted) return;

        setPayload(body ?? { ok: false, reason: "error", message: "Unable to load accounts.", items: [], nextCursor: null });
        setNextCursor(body?.nextCursor ?? null);
      } catch {
        if (mounted) {
          setPayload({ ok: false, reason: "error", message: "Unable to load accounts.", items: [], nextCursor: null });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load(true);

    return () => {
      mounted = false;
    };
  }, [accountType, searchParams, query]);

  return (
    <main className="min-h-[60vh] bg-[#f5ecd7] px-6 py-10 text-[#071321]">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2rem] border border-[#dccca4] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#6f5c34]">System Admin</p>
              <h1 className="mt-2 text-3xl font-black">Account directory</h1>
            </div>
            <Link href="/admin" className="text-sm font-semibold text-[#071321] underline decoration-[#2bd7ef] underline-offset-4">Back to summary</Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_120px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, slug, company"
              className="w-full rounded-2xl border border-[#d9caa5] px-4 py-3 text-sm outline-none ring-0 focus:border-[#2bd7ef]"
            />
            <select
              value={accountType}
              onChange={(event) => setAccountType(event.target.value as "all" | "talent" | "employer")}
              className="rounded-2xl border border-[#d9caa5] px-4 py-3 text-sm outline-none focus:border-[#2bd7ef]"
            >
              <option value="all">All types</option>
              <option value="talent">Talent</option>
              <option value="employer">Employer</option>
            </select>
            <button type="button" onClick={() => { setQuery(""); setAccountType("all"); }} className="rounded-2xl bg-[#071321] px-4 py-3 text-sm font-semibold text-white">Clear</button>
          </div>
        </section>

        {loading ? <div className="rounded-3xl border border-[#e4d7b5] bg-white p-6">Loading accounts.</div> : null}

        {payload?.ok && payload.items?.length ? (
          <section className="grid gap-4">
            {payload.items.map((item) => (
              <Link key={item.userId} href={`/admin/accounts/${item.userId}`} className="rounded-3xl border border-[#e4d7b5] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2bd7ef]/50">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f5c34]">{item.accountType}</p>
                    <h2 className="text-xl font-bold">{item.displayName ?? item.email ?? item.slug ?? item.userId}</h2>
                    <p className="text-sm text-[#4a5568]">{item.secondaryLabel ?? item.slug ?? "No secondary label"}</p>
                  </div>
                  <div className="text-right text-sm text-[#4a5568]">
                    <p>{item.email ?? "No email"}</p>
                    <p>{item.createdAt}</p>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        ) : null}

        {payload && !payload.ok ? (
          <div className="rounded-3xl border border-[#e4d7b5] bg-white p-6 text-[#7c1d1d]">Access denied or unavailable.</div>
        ) : null}

        {payload?.ok && !payload.items?.length ? (
          <div className="rounded-3xl border border-[#e4d7b5] bg-white p-6 text-[#4a5568]">No accounts matched this search.</div>
        ) : null}
      </div>
    </main>
  );
}