"use client";

import { Apple } from "lucide-react";
import { useState } from "react";
import { getPublicAppUrl } from "@/lib/site-url";
import { supabase } from "@/lib/supabase-client";
import type { AccountType } from "@/types/freeagent";

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
          <span className="text-lg font-black text-[#4285F4]">G</span>
          {loadingProvider === "google" ? "Connecting..." : "Continue with Google"}
        </button>
        <button
          type="button"
          onClick={() => void startOAuth("apple")}
          disabled={loadingProvider !== null}
          aria-label="Continue with Apple"
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-[#0f2744]/20 bg-[#0f2744] px-4 py-3 text-sm font-semibold text-[#f7ebcf] transition hover:bg-[#17355f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2bd7ef] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Apple className="h-5 w-5" aria-hidden="true" />
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
