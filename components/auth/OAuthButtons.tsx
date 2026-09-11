"use client";

import { useState } from "react";
import { getPublicAppUrl } from "@/lib/site-url";
import { supabase } from "@/lib/supabase-client";
import type { AccountType } from "@/types/freeagent";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.1c0-.7-.06-1.37-.18-2H12v3.79h5.24a4.48 4.48 0 0 1-1.94 2.94v2.48h3.16c1.85-1.7 2.89-4.2 2.89-7.21Z" />
      <path fill="#34A853" d="M12 22c2.65 0 4.87-.87 6.49-2.36l-3.16-2.48c-.87.58-1.98.93-3.33.93-2.56 0-4.73-1.73-5.5-4.06H3.23v2.56A9.8 9.8 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 14.03A5.9 5.9 0 0 1 6.19 12c0-.7.12-1.38.31-2.03V7.41H3.23A9.99 9.99 0 0 0 2 12c0 1.66.4 3.23 1.23 4.59l3.27-2.56Z" />
      <path fill="#EA4335" d="M12 5.91c1.45 0 2.75.5 3.77 1.48l2.82-2.82C16.86 2.96 14.64 2 12 2a9.8 9.8 0 0 0-8.77 5.41l3.27 2.56C7.27 7.64 9.44 5.91 12 5.91Z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current" aria-hidden="true">
      <path d="M17.05 12.54c-.02-2.19 1.79-3.25 1.87-3.3a4.02 4.02 0 0 0-3.17-1.71c-1.33-.14-2.62.79-3.3.79-.69 0-1.73-.77-2.84-.75a4.18 4.18 0 0 0-3.52 2.15c-1.52 2.64-.39 6.53 1.07 8.66.73 1.04 1.58 2.2 2.7 2.16 1.08-.04 1.49-.69 2.8-.69 1.3 0 1.67.69 2.81.67 1.17-.02 1.91-1.05 2.63-2.1a8.6 8.6 0 0 0 1.2-2.42 3.74 3.74 0 0 1-2.25-3.46ZM14.88 6.11A3.85 3.85 0 0 0 15.76 3a3.9 3.9 0 0 0-2.84 1.47 3.63 3.63 0 0 0-.9 2.94 3.22 3.22 0 0 0 2.86-1.3Z" />
    </svg>
  );
}

export default function OAuthButtons({ accountType }: { accountType: AccountType }) {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startOAuth = async (provider: "google" | "apple") => {
    setError(null);
    setLoadingProvider(provider);

    const redirectTo = getPublicAppUrl(`/auth/callback/${accountType}`);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (authError) {
      setError(authError.message);
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void startOAuth("google")}
          disabled={loadingProvider !== null}
          aria-label="Continue with Google"
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-[#0f2744]/20 bg-white px-4 py-3 text-sm font-semibold text-[#0f2744] transition hover:bg-[#fffaf0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2bd7ef] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleLogo />
          {loadingProvider === "google" ? "Connecting..." : "Continue with Google"}
        </button>
        <button
          type="button"
          onClick={() => void startOAuth("apple")}
          disabled={loadingProvider !== null}
          aria-label="Continue with Apple"
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-[#0f2744]/20 bg-[#0f2744] px-4 py-3 text-sm font-semibold text-[#f7ebcf] transition hover:bg-[#17355f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2bd7ef] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <AppleLogo />
          {loadingProvider === "apple" ? "Connecting..." : "Continue with Apple"}
        </button>
      </div>
      {error ? <p className="rounded-2xl border border-[#b83b4b]/40 bg-[#fff0f1] px-4 py-3 text-sm text-[#8b2635]">{error}</p> : null}
      <div className="flex items-center gap-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6a7890]">
        <span className="h-px flex-1 bg-[#0f2744]/15" />
        <span>Or</span>
        <span className="h-px flex-1 bg-[#0f2744]/15" />
      </div>
    </div>
  );
}
