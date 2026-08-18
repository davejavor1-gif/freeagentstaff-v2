"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
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

export default function EmployerAuthPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        emailRedirectTo: `${window.location.origin}/onboarding/employer`,
      },
    });
    setIsSubmitting(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    if (data.session) {
      const { error: insertError } = await supabase.from("profiles").upsert(
        [
          {
            user_id: data.session.user.id,
            account_type: "employer",
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_38%,_#d9bf7d_100%)] text-[#071426]">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full border border-[#2bd7ef]/18" />
        <div className="pointer-events-none absolute right-[-3rem] top-16 h-52 w-52 rounded-full border border-[#aff546]/18" />
        <div className="pointer-events-none absolute bottom-8 left-[45%] hidden h-28 w-28 rounded-full border border-[#071426]/8 lg:block" />

        <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start xl:gap-12">
            <div className="rounded-[36px] border border-[#cda64d]/55 bg-[#0f2744] p-7 text-[#f7ebcf] shadow-[0_20px_60px_rgba(6,16,33,0.16)] sm:p-8 lg:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">Employer access</p>
              <h1 className="mt-4 max-w-[12ch] font-serif text-[2.55rem] font-semibold uppercase leading-[0.92] text-[#f7ebcf] sm:text-[3.1rem] lg:text-[3.35rem]">
                <span className="block">HIRE SMARTER.</span>
                <span className="block">VERIFY ONCE.</span>
                <span className="block">MOVE FASTER.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[1rem] leading-7 text-[#dfe7ef] sm:text-[1.08rem] sm:leading-8">
                Create an employer account or sign in to continue your verification journey and unlock talent search when ready.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: Building2, title: "Create account", text: "Set up your employer profile and company details." },
                  { icon: ShieldCheck, title: "Verify access", text: "Submit verification before talent search unlocks." },
                  { icon: Sparkles, title: "Find talent", text: "Browse people once your employer status is approved." },
                ].map((card) => {
                  const Icon = card.icon;

                  return (
                    <div key={card.title} className="rounded-[24px] border border-[#f2cc63]/20 bg-[#f7ebcf]/8 p-4">
                      <Icon className="h-5 w-5 text-[#2bd7ef]" />
                      <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#f2cc63]">{card.title}</p>
                      <p className="mt-2 text-sm leading-6 text-[#dfe7ef]">{card.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[36px] border border-[#cda64d]/55 bg-[#f7ebcf] p-6 text-[#071426] shadow-[0_20px_60px_rgba(6,16,33,0.14)] sm:p-8 lg:p-10">
              <div className="space-y-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Employer authentication</p>
                <h2 className="text-3xl font-black tracking-tight text-[#071426] sm:text-4xl">
                  {authMode === "sign-up" ? "Create employer account" : "Sign in as employer"}
                </h2>
                <p className="text-sm leading-6 text-[#27405f]">
                  {authMode === "sign-up"
                    ? "Create your employer account to continue into company setup."
                    : "Use your employer credentials to resume verification or access the dashboard."}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3 text-sm text-[#27405f]">
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 transition ${
                    authMode === "sign-in" ? "bg-[#0f2744] text-white" : "bg-[#f7ebcf] text-[#27405f] hover:bg-[#efe0b9]"
                  }`}
                  onClick={() => setAuthMode("sign-in")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 transition ${
                    authMode === "sign-up" ? "bg-[#0f2744] text-white" : "bg-[#f7ebcf] text-[#27405f] hover:bg-[#efe0b9]"
                  }`}
                  onClick={() => setAuthMode("sign-up")}
                >
                  Create account
                </button>
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

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-[#aff546] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#071426] transition hover:bg-[#9fea37] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Processing..." : authMode === "sign-in" ? "Sign in" : "Create employer account"}
                </button>

                {authMode === "sign-up" ? (
                  <p className="text-xs leading-5 text-[#27405f]">
                    By creating an account, you agree to the <Link href="/terms" className="font-semibold text-[#0f2744] underline decoration-[#2bd7ef]/70 underline-offset-4">Terms of Use</Link> and acknowledge the <Link href="/privacy" className="font-semibold text-[#0f2744] underline decoration-[#2bd7ef]/70 underline-offset-4">Privacy Policy</Link>.
                  </p>
                ) : null}
              </form>

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