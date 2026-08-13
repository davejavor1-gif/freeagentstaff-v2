"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import type { AdminDashboardResponse } from "@/types/admin";

async function getSessionWithTimeout() {
  return Promise.race([
    supabase.auth.getSession(),
    new Promise<{ data: { session: null } }>((resolve) => {
      window.setTimeout(() => resolve({ data: { session: null } }), 1500);
    }),
  ]);
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [payload, setPayload] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data } = await getSessionWithTimeout();
        const currentSession = data.session;

        if (!mounted) {
          return;
        }

        setSession(currentSession);

        if (!currentSession?.access_token) {
          setPayload({ ok: false, reason: "not_authenticated", message: "Sign in required." });
          return;
        }

        const response = await fetch("/api/admin/summary", {
          method: "GET",
          headers: { Authorization: `Bearer ${currentSession.access_token}` },
          cache: "no-store",
        });

        const body = (await response.json().catch(() => null)) as AdminDashboardResponse | null;

        if (mounted) {
          setPayload(body ?? { ok: false, reason: "error", message: "Unable to load admin summary." });
        }
      } catch {
        if (mounted) {
          setPayload({ ok: false, reason: "error", message: "Unable to load admin summary." });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="min-h-[60vh] bg-[#f5ecd7] px-6 py-16 text-[#071321]">Loading admin dashboard.</div>;
  }

  if (!session || !payload?.ok || !payload.summary) {
    return (
      <main className="min-h-[60vh] bg-[#f5ecd7] px-6 py-16 text-[#071321]">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#dccca4] bg-white/80 p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#6f5c34]">System Admin</p>
          <h1 className="mt-3 text-3xl font-black">Access denied</h1>
          <p className="mt-3 text-sm text-[#4a5568]">You do not have system admin access.</p>
          <Link href="/dashboard" className="mt-6 inline-flex rounded-full bg-[#071321] px-5 py-2 text-sm font-semibold text-white">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const summary = payload.summary;

  return (
    <main className="min-h-[60vh] bg-[#f5ecd7] px-6 py-10 text-[#071321]">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[2rem] border border-[#dccca4] bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#6f5c34]">System Admin</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-black">Operational control center</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#4a5568]">Read-only operational visibility for support and trust operations.</p>
            </div>
            <Link href="/admin/accounts" className="inline-flex rounded-full bg-[#071321] px-5 py-3 text-sm font-semibold text-white">
              View accounts
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Talent accounts", summary.totalTalentAccounts],
            ["Published talent", summary.publishedTalent],
            ["Employer accounts", summary.totalEmployerAccounts],
            ["Verified employers", summary.verifiedEmployers],
            ["Pending verification", summary.pendingEmployers],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-3xl border border-[#e4d7b5] bg-white p-5 shadow-sm">
              <p className="text-sm text-[#6f5c34]">{label}</p>
              <p className="mt-3 text-4xl font-black">{value as number}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}