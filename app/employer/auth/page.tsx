"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import OAuthButtons from "@/components/auth/OAuthButtons";
import SignupBrandStory from "@/components/auth/SignupBrandStory";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import { getPublicAppUrl } from "@/lib/site-url";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal-versions";
import type { AccountType, EmployerVerificationStatus } from "@/types/freeagent";

type EmployerProfileRow = {
  account_type?: AccountType;
  employer_verification_status?: EmployerVerificationStatus;
};

const defaultEmployerProfile = {
  employer_contact_name: null,
  employer_contact_role: null,
  employer_company_name: null,
  employer_abn: null,
  employer_website: null,
  employer_industry: null,
  employer_company_size: null,
  employer_verification_status: "unverified" as const,
  slug: null,
  profile: {},
};

const resolveEmployerRoute = (status?: EmployerVerificationStatus | null) =>
  status === "pending" || status === "verified" ? "/dashboard" : "/onboarding/employer";

function EmployerAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authMode = searchParams.get("mode") === "signup" ? "sign-up" : "sign-in";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enterAuthMode = (mode: "sign-in" | "sign-up") => {
    router.push(mode === "sign-up" ? "/employer/auth?mode=signup" : "/employer/auth");
  };

  useEffect(() => {
    let mounted = true;

    const redirectIfSignedIn = async () => {
      const session = await getSessionWithRetry();

      if (!mounted || !session) {
        return;
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("account_type, employer_verification_status")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!mounted) {
        return;
      }

      const row = profileRow as EmployerProfileRow | null | undefined;
      const accountType = row?.account_type ?? (session.user.user_metadata?.account_type === "employer" ? "employer" : "talent");

      if (accountType !== "employer") {
        router.replace("/login");
        return;
      }

      router.replace(resolveEmployerRoute(row?.employer_verification_status));
    };

    void redirectIfSignedIn();

    return () => {
      mounted = false;
    };
  }, [router]);

  const loadEmployerProfile = async (userId: string) => {
    const { data: profileRow, error } = await supabase
      .from("profiles")
      .select("account_type, employer_verification_status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const row = profileRow as EmployerProfileRow | null | undefined;

    if (!row) {
      const { error: insertError } = await supabase.from("profiles").insert([
        {
          user_id: userId,
          account_type: "employer",
          ...defaultEmployerProfile,
        } as never,
      ]);

      if (insertError) {
        throw insertError;
      }

      return { accountType: "employer" as const, verificationStatus: "unverified" as const };
    }

    return {
      accountType: row.account_type ?? "employer",
      verificationStatus: row.employer_verification_status ?? "unverified",
    };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    if (!email || !password) {
      setStatus("Email and password are required.");
      setIsSubmitting(false);
      return;
    }

    if (authMode === "sign-up" && !agreedToTerms) {
      setStatus("You must agree to the Terms & Conditions and acknowledge the Privacy Policy to create an account.");
      setIsSubmitting(false);
      return;
    }

    if (authMode === "sign-in") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setIsSubmitting(false);

      if (error) {
        setStatus(error.message);
        return;
      }

      const session = data.session ?? (await getSessionWithRetry());

      if (!session) {
        setStatus("We couldn’t restore your session yet. Please try again in a moment.");
        return;
      }

      try {
        const resolved = await loadEmployerProfile(session.user.id);

        if (resolved.accountType !== "employer") {
          router.replace("/login");
          return;
        }

        router.replace(resolveEmployerRoute(resolved.verificationStatus));
      } catch (resolveError) {
        const message = resolveError instanceof Error ? resolveError.message : "Unable to load your employer account.";
        setStatus(message);
      }

      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { account_type: "employer" },
        emailRedirectTo: getPublicAppUrl("/onboarding/employer"),
      },
    });
    setIsSubmitting(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    if (data.session) {
      const acceptedAt = new Date().toISOString();
      const { error: insertError } = await supabase.from("profiles").upsert(
        [
          {
            user_id: data.session.user.id,
            account_type: "employer",
            terms_accepted_at: acceptedAt,
            terms_version: TERMS_VERSION,
            privacy_acknowledged_at: acceptedAt,
            privacy_version: PRIVACY_VERSION,
            ...defaultEmployerProfile,
          } as never,
        ],
        { onConflict: "user_id" } as never,
      );

      if (insertError) {
        setStatus(insertError.message);
        return;
      }

      router.replace("/onboarding/employer");
      return;
    }

    setStatus("Sign-up successful. Check your email for confirmation if required, then continue to employer setup.");
  };

  return (
    <main className="min-h-screen bg-[#08111F] text-[#071426]">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full border border-[#2bd7ef]/18" />
        <div className="pointer-events-none absolute right-[-3rem] top-16 h-52 w-52 rounded-full border border-[#aff546]/18" />
        <div className="pointer-events-none absolute bottom-8 left-[45%] hidden h-28 w-28 rounded-full border border-[#071426]/8 lg:block" />

        <div className="relative mx-auto w-[92vw] max-w-[1400px] px-0 py-8 sm:py-10 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.16fr)_minmax(34rem,0.84fr)] lg:items-start lg:gap-12">
            <SignupBrandStory accountType="employer" />

            <div className="rounded-[28px] border border-[#cda64d]/55 bg-[#f7ebcf] p-8 text-[#071426] shadow-[0_20px_60px_rgba(6,16,33,0.14)] sm:p-10 lg:p-14">
              <div className="space-y-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Employer access</p>
                <h2 className="text-3xl font-black tracking-tight text-[#071426] sm:text-4xl lg:text-5xl">
                  {authMode === "sign-up" ? "Create your employer account" : "Welcome back"}
                </h2>
                <p className="text-sm leading-6 text-[#27405f]">
                  {authMode === "sign-up"
                    ? "Discover, connect and hire exceptional talent."
                    : "Sign in to your Employer account."}
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 rounded-2xl border border-[#cda64d]/35 bg-[#fffaf0] p-1 text-sm font-semibold text-[#27405f]">
                <button
                  type="button"
                  className={`rounded-xl px-4 py-3 transition ${authMode === "sign-in" ? "bg-[#0f2744] text-white" : "hover:bg-[#efe0b9]"}`}
                  onClick={() => enterAuthMode("sign-in")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`rounded-xl px-4 py-3 transition ${authMode === "sign-up" ? "bg-[#0f2744] text-white" : "hover:bg-[#efe0b9]"}`}
                  onClick={() => enterAuthMode("sign-up")}
                >
                  Sign up
                </button>
              </div>

              <div className="mt-6">
                <OAuthButtons accountType="employer" />
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="employer-email" className="block text-sm font-semibold text-[#27405f]">
                    Email
                  </label>
                  <input
                    id="employer-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#cda64d]/45 bg-white px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#0f2744] focus:ring-2 focus:ring-[#2bd7ef]/20"
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="employer-password" className="block text-sm font-semibold text-[#27405f]">
                    Password
                  </label>
                  <input
                    id="employer-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#cda64d]/45 bg-white px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#0f2744] focus:ring-2 focus:ring-[#2bd7ef]/20"
                    autoComplete="current-password"
                    required
                  />
                </div>

                {status ? (
                  <div className="rounded-2xl border border-[#cda64d]/45 bg-[#f7ebcf] px-4 py-3 text-sm text-[#27405f]">{status}</div>
                ) : null}

                {authMode === "sign-up" ? (
                  <label className="flex items-start gap-3 text-sm leading-6 text-[#27405f]">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(event) => setAgreedToTerms(event.target.checked)}
                      required
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-[#cda64d]/60 accent-[#2BD7EF]"
                    />
                    <span>
                      I agree to the <Link href="/terms" className="font-semibold text-[#0f2744] underline decoration-[#2bd7ef]/70 underline-offset-4">Terms &amp; Conditions</Link> and acknowledge the <Link href="/privacy" className="font-semibold text-[#0f2744] underline decoration-[#2bd7ef]/70 underline-offset-4">Privacy Policy</Link>.
                    </span>
                  </label>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting || (authMode === "sign-up" && !agreedToTerms)}
                  className="w-full rounded-2xl bg-[#2bd7ef] px-4 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#071426] transition hover:bg-[#1fc5dd] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Processing..." : authMode === "sign-in" ? "Sign in" : "Create employer account →"}
                </button>
              </form>

              {authMode === "sign-up" ? (
                <p className="mt-6 text-center text-sm text-[#27405f]">
                  Already have an account? <button type="button" onClick={() => enterAuthMode("sign-in")} className="font-semibold text-[#0f2744] underline decoration-[#2bd7ef]/70 underline-offset-4">Sign in</button>
                </p>
              ) : (
                <p className="mt-6 text-center text-sm text-[#27405f]">
                  Need an Employer account? <button type="button" onClick={() => enterAuthMode("sign-up")} className="font-semibold text-[#0f2744] underline decoration-[#2bd7ef]/70 underline-offset-4">Sign up</button>
                </p>
              )}

              <p className="mt-6 text-center text-xs leading-5 text-[#27405f]">
                Talent accounts should use the main sign-in page.
                <Link href="/login" className="ml-1 font-semibold text-[#0f2744] underline decoration-[#2bd7ef]/70 underline-offset-4">
                  Go to talent login
                </Link>
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#27405f]">
                <Link href="/forgot-password" className="font-semibold text-[#0f2744] underline decoration-[#2bd7ef]/70 underline-offset-4">
                  Forgot password?
                </Link>
                <div className="flex flex-wrap items-center gap-4">
                  <Link href="/privacy" className="underline decoration-[#2bd7ef]/50 underline-offset-4">Privacy</Link>
                  <Link href="/terms" className="underline decoration-[#2bd7ef]/50 underline-offset-4">Terms</Link>
                  <Link href="/support" className="underline decoration-[#2bd7ef]/50 underline-offset-4">Support</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default function EmployerAuthPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#08111F]" />}>
      <EmployerAuthContent />
    </Suspense>
  );
}