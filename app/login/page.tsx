"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import OAuthButtons from "@/components/auth/OAuthButtons";
import SignupBrandStory from "@/components/auth/SignupBrandStory";
import { buildCanonicalTalentColumns } from "@/lib/talent-profile-columns";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import { getPublicAppUrl } from "@/lib/site-url";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal-versions";
import type { AccountType, EmployerVerificationStatus, FreeAgentProfile } from "@/types/freeagent";

const createBlankTalentProfile = (userId: string, email?: string | null): FreeAgentProfile => ({
  id: `freeagent-${userId.slice(0, 8)}`,
  slug: `freeagent-${userId.slice(0, 8)}`,
  visibility: "public",
  name: "",
  title: "",
  location: "",
  availability: "Available Now",
  topStrength: "",
  experienceYears: 0,
  focusArea: "",
  summary: "",
  skills: [],
  languages: [],
  passions: [],
  careerJourney: [],
  email: email ?? "",
});

function LoginPageContent() {
  const searchParams = useSearchParams();
  const authMode = searchParams.get("mode") === "signup" ? "sign-up" : "sign-in";
  const [accountType] = useState<AccountType>("talent");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const enterAuthMode = (mode: "sign-in" | "sign-up") => {
    router.push(mode === "sign-up" ? "/login?mode=signup" : "/login");
  };

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const session = await getSessionWithRetry();

      if (!mounted) {
        return;
      }

      if (session) {
        router.replace("/dashboard");
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [router]);

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

      if (session) {
        router.replace("/dashboard");
        return;
      }

      setStatus("We couldn’t restore your session yet. Please try again in a moment.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { account_type: accountType },
        emailRedirectTo: getPublicAppUrl(accountType === "employer" ? "/onboarding/employer" : "/dashboard"),
      },
    });
    setIsSubmitting(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    if (data.session) {
      const blankTalentProfile = accountType === "talent"
        ? createBlankTalentProfile(data.session.user.id, data.session.user.email)
        : null;
      const profilePayload = blankTalentProfile
        ? (blankTalentProfile as unknown as Record<string, unknown>)
        : {};
      const verificationStatus: EmployerVerificationStatus = "unverified";
      const slug = accountType === "talent" ? `freeagent-${data.session.user.id.slice(0, 8)}` : null;
      const acceptedAt = new Date().toISOString();

      const { error: insertError } = await supabase.from("profiles").upsert(
        [
          {
            user_id: data.session.user.id,
            account_type: accountType,
            employer_contact_name: null,
            employer_contact_role: null,
            employer_company_name: null,
            employer_abn: null,
            employer_website: null,
            employer_industry: null,
            employer_company_size: null,
            employer_verification_status: verificationStatus,
            terms_accepted_at: acceptedAt,
            terms_version: TERMS_VERSION,
            privacy_acknowledged_at: acceptedAt,
            privacy_version: PRIVACY_VERSION,
            ...(accountType === "talent"
              ? buildCanonicalTalentColumns(blankTalentProfile as FreeAgentProfile, data.session.user.email)
              : {
                  slug,
                  profile: profilePayload,
                }),
          } as never,
        ],
        { onConflict: "user_id" } as never,
      );

      if (insertError) {
        setStatus(insertError.message);
        return;
      }

      router.replace(accountType === "employer" ? "/onboarding/employer" : "/dashboard");
      return;
    }

    setStatus("Sign-up successful. Check your email for confirmation if required, then complete your account in the dashboard.");
  };

  return (
    <main className="min-h-screen bg-[#08111F] text-[#f7ebcf]">
      <Navbar />
      <div className={authMode === "sign-up" ? "mx-auto grid min-h-[calc(100vh-5rem)] w-[92vw] max-w-[1400px] items-start gap-8 px-0 py-8 sm:py-10 lg:grid-cols-[minmax(0,1.16fr)_minmax(34rem,0.84fr)] lg:gap-12 lg:py-12" : "mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16 sm:px-10"}>
        {authMode === "sign-up" ? <SignupBrandStory accountType={accountType} /> : null}
        <div className={`${authMode === "sign-up" ? "rounded-[28px] p-8 sm:p-10 lg:p-14" : "rounded-3xl p-8 sm:p-10"} border border-[#cda64d]/55 bg-[#f7ebcf] text-[#0f2744] shadow-[0_18px_50px_rgba(6,16,33,0.22)]`}>
          <div className="mb-10 space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">{authMode === "sign-up" ? "Join Free Agent Staff" : "Secure access"}</p>
            <h1 className="text-3xl font-black tracking-tight text-[#0f2744] sm:text-4xl lg:text-5xl">{authMode === "sign-up" ? "Create your account" : "Sign in to your dashboard"}</h1>
            <p className="text-sm leading-6 text-[#27405f]">
              {authMode === "sign-up" ? "Start building your professional identity." : "Use your email and password to access a protected dashboard experience."}
            </p>
          </div>

          <div className={`${authMode === "sign-up" ? "hidden" : ""} mb-6 flex items-center justify-center gap-3 text-sm text-[#27405f]`}>
            <button
              type="button"
              className={`rounded-full px-4 py-2 transition ${
                authMode === "sign-in"
                  ? "bg-[#0f2744] text-[#f7ebcf]"
                  : "bg-[#efe0b9] text-[#27405f] hover:bg-[#e7d3a0]"
              }`}
              onClick={() => enterAuthMode("sign-in")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 transition ${
                authMode === "sign-up"
                  ? "bg-[#0f2744] text-[#f7ebcf]"
                  : "bg-[#efe0b9] text-[#27405f] hover:bg-[#e7d3a0]"
              }`}
              onClick={() => enterAuthMode("sign-up")}
            >
              Sign up
            </button>
          </div>

          <OAuthButtons accountType={accountType} />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#27405f]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#cda64d]/45 bg-white px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#2bd7ef] focus:ring-2 focus:ring-[#2bd7ef]/25"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-[#27405f]">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#cda64d]/45 bg-white px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#2bd7ef] focus:ring-2 focus:ring-[#2bd7ef]/25"
                autoComplete="current-password"
                required
              />
            </div>

            {status ? (
              <div className="rounded-2xl border border-[#f2cc63]/60 bg-[#fff7dc] px-4 py-3 text-sm text-[#6f5310]">
                {status}
              </div>
            ) : null}

            {authMode === "sign-up" ? (
              <label className="flex items-start gap-3 text-sm leading-6 text-[#27405f]">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(event) => setAgreedToTerms(event.target.checked)}
                  required
                  className={`mt-0.5 h-5 w-5 shrink-0 rounded border-[#cda64d]/60 ${
                    accountType === "employer" ? "accent-[#2BD7EF]" : "accent-[#AFF546]"
                  }`}
                />
                <span>
                  I agree to the <Link href="/terms" className="font-semibold text-[#0f2744] underline underline-offset-4">Terms &amp; Conditions</Link> and acknowledge the <Link href="/privacy" className="font-semibold text-[#0f2744] underline underline-offset-4">Privacy Policy</Link>.
                </span>
              </label>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || (authMode === "sign-up" && !agreedToTerms)}
              className="w-full rounded-2xl bg-[#aff546] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#071426] transition hover:bg-[#9fea37] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Processing..." : authMode === "sign-in" ? "Sign in" : "Create my account →"}
            </button>
          </form>

          {authMode === "sign-up" ? (
            <p className="mt-6 text-center text-sm text-[#27405f]">
              Already have an account? <button type="button" onClick={() => enterAuthMode("sign-in")} className="font-semibold text-[#0f2744] underline underline-offset-4">Sign in</button>
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[#27405f]">
            <Link href="/forgot-password" className="font-semibold text-[#0f2744] underline underline-offset-4">
              Forgot password?
            </Link>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#27405f]">
              <Link href="/privacy" className="underline underline-offset-4">Privacy</Link>
              <Link href="/terms" className="underline underline-offset-4">Terms</Link>
              <Link href="/support" className="underline underline-offset-4">Support</Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#08111F]" />}>
      <LoginPageContent />
    </Suspense>
  );
}
