"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
          <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-lg shadow-slate-200/40">
            <p className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Loading dashboard</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
        <div className="mb-10 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-10 shadow-lg shadow-slate-200/40">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-500">Secure dashboard</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Welcome back, {session?.user.email ?? "Free Agent"}</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              This content is protected and only available after authentication.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={signOut}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
            >
              Sign out
            </button>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              User ID: <span className="font-medium text-slate-900">{session?.user.id}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/40">
            <h2 className="text-xl font-semibold text-slate-900">Account details</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">Your session is active and your dashboard is protected from unauthenticated visitors.</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/40">
            <h2 className="text-xl font-semibold text-slate-900">Next steps</h2>
            <ul className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
              <li>• Keep your email/password sign in flow secure.</li>
              <li>• Add profile saving after authentication in the next iteration.</li>
              <li>• Use this page as the authenticated dashboard entry point.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
