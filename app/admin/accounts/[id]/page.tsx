"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import type { AdminAccountDetailResponse } from "@/types/admin";

async function getSessionWithTimeout() {
  return Promise.race([
    supabase.auth.getSession(),
    new Promise<{ data: { session: null } }>((resolve) => {
      window.setTimeout(() => resolve({ data: { session: null } }), 1500);
    }),
  ]);
}

export default function AdminAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [payload, setPayload] = useState<AdminAccountDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data } = await getSessionWithTimeout();
        const currentSession = data.session;
        if (!mounted) return;

        setSession(currentSession);

        if (!currentSession?.access_token) {
          setPayload({ ok: false, reason: "not_authenticated", message: "Sign in required." });
          return;
        }

        const response = await fetch(`/api/admin/accounts/${params.id}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${currentSession.access_token}` },
          cache: "no-store",
        });

        const body = (await response.json().catch(() => null)) as AdminAccountDetailResponse | null;
        if (!mounted) return;

        setPayload(body ?? { ok: false, reason: "error", message: "Unable to load account." });
      } catch {
        if (mounted) {
          setPayload({ ok: false, reason: "error", message: "Unable to load account." });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [params.id]);

  if (loading) {
    return <main className="min-h-[60vh] bg-[#f5ecd7] px-6 py-10 text-[#071321]">Loading account.</main>;
  }

  if (!session || !payload?.ok || !payload.account) {
    return (
      <main className="min-h-[60vh] bg-[#f5ecd7] px-6 py-10 text-[#071321]">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#dccca4] bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black">Access denied</h1>
          <Link href="/admin/accounts" className="mt-6 inline-flex rounded-full bg-[#071321] px-5 py-2 text-sm font-semibold text-white">Back to accounts</Link>
        </div>
      </main>
    );
  }

  const account = payload.account;

  return (
    <main className="min-h-[60vh] bg-[#f5ecd7] px-6 py-10 text-[#071321]">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-[#dccca4] bg-white p-6 shadow-sm">
          <Link href="/admin/accounts" className="text-sm font-semibold text-[#071321] underline decoration-[#2bd7ef] underline-offset-4">Back to accounts</Link>
          <h1 className="mt-4 text-3xl font-black">{account.displayName ?? account.email ?? account.userId}</h1>
          <p className="mt-2 text-sm text-[#4a5568]">{account.accountType} account</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-[#e4d7b5] bg-white p-5">
            <h2 className="text-lg font-bold">Identity</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-[#6f5c34]">Email</dt><dd>{account.email ?? "Not available"}</dd></div>
              <div><dt className="text-[#6f5c34]">Slug</dt><dd>{account.slug ?? "Not available"}</dd></div>
              <div><dt className="text-[#6f5c34]">Created</dt><dd>{account.createdAt}</dd></div>
            </dl>
          </div>

          <div className="rounded-3xl border border-[#e4d7b5] bg-white p-5">
            <h2 className="text-lg font-bold">Operational status</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-[#6f5c34]">Visibility</dt><dd>{account.visibility ?? "Not available"}</dd></div>
              <div><dt className="text-[#6f5c34]">Publication</dt><dd>{account.isPublished ? "Published" : "Unpublished"}</dd></div>
              <div><dt className="text-[#6f5c34]">Verification</dt><dd>{account.employerVerificationStatus ?? "Not available"}</dd></div>
            </dl>
          </div>
        </section>

        {account.accountType === "talent" ? (
          <section className="rounded-3xl border border-[#e4d7b5] bg-white p-5">
            <h2 className="text-lg font-bold">Talent support context</h2>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div><dt className="text-[#6f5c34]">Name</dt><dd>{account.name ?? "Not available"}</dd></div>
              <div><dt className="text-[#6f5c34]">Title</dt><dd>{account.title ?? "Not available"}</dd></div>
              <div><dt className="text-[#6f5c34]">Location</dt><dd>{account.location ?? "Not available"}</dd></div>
              <div><dt className="text-[#6f5c34]">Opportunity status</dt><dd>{account.opportunityStatus ?? "Not available"}</dd></div>
              <div><dt className="text-[#6f5c34]">Blocked company count</dt><dd>{account.blockedCompanyCount}</dd></div>
              <div><dt className="text-[#6f5c34]">Active connections</dt><dd>{account.activeConnections}</dd></div>
            </dl>
          </section>
        ) : (
          <section className="rounded-3xl border border-[#e4d7b5] bg-white p-5">
            <h2 className="text-lg font-bold">Employer support context</h2>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div><dt className="text-[#6f5c34]">Contact name</dt><dd>{account.employerContactName ?? "Not available"}</dd></div>
              <div><dt className="text-[#6f5c34]">Contact role</dt><dd>{account.employerContactRole ?? "Not available"}</dd></div>
              <div><dt className="text-[#6f5c34]">Company name</dt><dd>{account.employerCompanyName ?? "Not available"}</dd></div>
              <div><dt className="text-[#6f5c34]">ABN</dt><dd>{account.employerAbn ?? "Not available"}</dd></div>
              <div><dt className="text-[#6f5c34]">Website</dt><dd>{account.employerWebsite ?? "Not available"}</dd></div>
              <div><dt className="text-[#6f5c34]">Industry</dt><dd>{account.employerIndustry ?? "Not available"}</dd></div>
              <div><dt className="text-[#6f5c34]">Company size</dt><dd>{account.employerCompanySize ?? "Not available"}</dd></div>
              <div><dt className="text-[#6f5c34]">Saved talent count</dt><dd>{account.savedTalentCount}</dd></div>
            </dl>
          </section>
        )}
      </div>
    </main>
  );
}