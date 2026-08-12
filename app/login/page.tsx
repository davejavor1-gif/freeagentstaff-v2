"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/layout/Footer";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
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
      options: { data: { account_type: accountType } },
    });
    setIsSubmitting(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    if (data.session) {
      const profilePayload =
        accountType === "talent" ? (createBlankTalentProfile(data.session.user.id, data.session.user.email) as unknown as Record<string, unknown>) : {};
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
            slug,
            profile: profilePayload,
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16 sm:px-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-lg shadow-slate-200/40">
          <div className="mb-10 space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-500">Secure access</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Sign in to your dashboard</h1>
            <p className="text-sm leading-6 text-slate-600">
              Use your email and password to access a protected dashboard experience.
            </p>
          </div>

          <div className="mb-6 flex items-center justify-center gap-3 text-sm text-slate-600">
            <button
              type="button"
              className={`rounded-full px-4 py-2 transition ${
                authMode === "sign-in"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              onClick={() => setAuthMode("sign-in")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 transition ${
                authMode === "sign-up"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              onClick={() => setAuthMode("sign-up")}
            >
              Sign up
            </button>
          </div>

          {authMode === "sign-up" ? (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Create account as</p>
              <div className="mt-3 grid gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType("talent")}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    accountType === "talent"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">I&apos;m looking for opportunities</p>
                  <p className="mt-1 text-base font-black uppercase tracking-[0.08em]">Talent</p>
                  <p className={`mt-2 text-sm ${accountType === "talent" ? "text-slate-200" : "text-slate-600"}`}>
                    Create your FreeAgent profile and be discovered by verified employers.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("employer")}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    accountType === "employer"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">I&apos;m looking for talent</p>
                  <p className="mt-1 text-base font-black uppercase tracking-[0.08em]">Employer</p>
                  <p className={`mt-2 text-sm ${accountType === "employer" ? "text-slate-200" : "text-slate-600"}`}>
                    Create an employer account and discover professionals open to their next move.
                  </p>
                </button>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                autoComplete="current-password"
                required
              />
            </div>

            {status ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {status}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Processing..." : authMode === "sign-in" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <Link href="/forgot-password" className="font-semibold text-slate-900 underline underline-offset-4">
              Forgot password?
            </Link>
            <div className="flex flex-wrap items-center gap-4 text-xs">
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
