"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { buildCanonicalTalentColumns } from "@/lib/talent-profile-columns";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import { getPublicAppUrl } from "@/lib/site-url";
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

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [accountType, setAccountType] = useState<AccountType>("talent");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

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
    <main className="min-h-screen bg-[#0f2744] text-[#f7ebcf]">
      <Navbar />
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16 sm:px-10">
        <div className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-10 text-[#0f2744] shadow-[0_18px_50px_rgba(6,16,33,0.22)]">
          <div className="mb-10 space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Secure access</p>
            <h1 className="text-3xl font-black tracking-tight text-[#0f2744] sm:text-4xl">Sign in to your dashboard</h1>
            <p className="text-sm leading-6 text-[#27405f]">
              Use your email and password to access a protected dashboard experience.
            </p>
          </div>

          <div className="mb-6 flex items-center justify-center gap-3 text-sm text-[#27405f]">
            <button
              type="button"
              className={`rounded-full px-4 py-2 transition ${
                authMode === "sign-in"
                  ? "bg-[#0f2744] text-[#f7ebcf]"
                  : "bg-[#efe0b9] text-[#27405f] hover:bg-[#e7d3a0]"
              }`}
              onClick={() => setAuthMode("sign-in")}
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
              onClick={() => setAuthMode("sign-up")}
            >
              Sign up
            </button>
          </div>

          <p className="mb-6 text-center text-xs leading-5 text-[#27405f]">
            When you choose Sign up, you agree to the <Link href="/terms" className="font-semibold text-[#0f2744] underline underline-offset-4">Terms of Use</Link> and acknowledge the <Link href="/privacy" className="font-semibold text-[#0f2744] underline underline-offset-4">Privacy Policy</Link>.
          </p>

          {authMode === "sign-up" ? (
            <div className="mb-6 rounded-2xl border border-[#cda64d]/40 bg-[#fffaf0] p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9a6d15]">Create account as</p>
              <div className="mt-3 grid gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType("talent")}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    accountType === "talent"
                      ? "border-[#0f2744] bg-[#0f2744] text-[#f7ebcf]"
                      : "border-[#cda64d]/35 bg-white text-[#27405f] hover:bg-[#fffaf0]"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">I&apos;m looking for opportunities</p>
                  <p className="mt-1 text-base font-black uppercase tracking-[0.08em]">Talent</p>
                  <p className={`mt-2 text-sm ${accountType === "talent" ? "text-[#dfe7ef]" : "text-[#27405f]"}`}>
                    Create your FreeAgent profile and be discovered by verified employers.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("employer")}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    accountType === "employer"
                      ? "border-[#0f2744] bg-[#0f2744] text-[#f7ebcf]"
                      : "border-[#cda64d]/35 bg-white text-[#27405f] hover:bg-[#fffaf0]"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">I&apos;m looking for talent</p>
                  <p className="mt-1 text-base font-black uppercase tracking-[0.08em]">Employer</p>
                  <p className={`mt-2 text-sm ${accountType === "employer" ? "text-[#dfe7ef]" : "text-[#27405f]"}`}>
                    Create an employer account and discover professionals open to their next move.
                  </p>
                </button>
              </div>
            </div>
          ) : null}

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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[#aff546] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#071426] transition hover:bg-[#9fea37] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Processing..." : authMode === "sign-in" ? "Sign in" : "Create account"}
            </button>
          </form>

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
