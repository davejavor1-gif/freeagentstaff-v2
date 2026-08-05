"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
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
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      }
    });
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setIsSubmitting(false);

      if (error) {
        setStatus(error.message);
        return;
      }

      router.replace("/dashboard");
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
      const verificationStatus: EmployerVerificationStatus = accountType === "employer" ? "pending" : "unverified";
      const slug = accountType === "talent" ? `freeagent-${data.session.user.id.slice(0, 8)}` : null;

      const { error: insertError } = await supabase.from("profiles").upsert(
        [
          {
            user_id: data.session.user.id,
            account_type: accountType,
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

      router.replace("/dashboard");
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
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType("talent")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    accountType === "talent" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Talent
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("employer")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    accountType === "employer" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Employer
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
        </div>
      </div>
    </main>
  );
}
