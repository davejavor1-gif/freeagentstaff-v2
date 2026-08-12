"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import type { EmployerVerificationStatus } from "@/types/freeagent";

const RECOVERY_READY_KEY = "phase1h_recovery_ready";

function hasRecoveryMarkerInCurrentUrl() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.location.hash.includes("type=recovery") ||
    window.location.hash.includes("access_token=") ||
    window.location.hash.includes("recovery_token=") ||
    window.location.search.includes("code=") ||
    window.location.search.includes("type=recovery")
  );
}

function resolveEmployerDestination(status?: EmployerVerificationStatus | null) {
  return status === "pending" || status === "verified" ? "/dashboard" : "/onboarding/employer";
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const markRecoveryReady = () => {
      if (!mounted) {
        return;
      }

      setIsRecoveryReady(true);
      setStatus(null);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(RECOVERY_READY_KEY, "1");
        window.history.replaceState({}, document.title, "/reset-password");
      }
    };

    async function hydrateRecoveryState() {
      const hasRecoveryMarker = hasRecoveryMarkerInCurrentUrl();
      const recoveryWasEstablished = typeof window !== "undefined" && window.sessionStorage.getItem(RECOVERY_READY_KEY) === "1";
      const session = await getSessionWithRetry();

      if (!mounted) {
        return;
      }

      if (hasRecoveryMarker && session) {
        markRecoveryReady();
        setLoading(false);
        return;
      }

      if (recoveryWasEstablished && session) {
        setIsRecoveryReady(true);
        setLoading(false);
        return;
      }

      if (!hasRecoveryMarker) {
        setStatus(session
          ? "For security, open this page from your password recovery link."
          : "Use the forgot password flow to request a valid reset link.");
        setLoading(false);
        return;
      }

      window.setTimeout(async () => {
        const retrySession = await getSessionWithRetry();
        if (!mounted) {
          return;
        }

        if (retrySession) {
          markRecoveryReady();
        } else {
          setIsRecoveryReady(false);
          setStatus("This password reset link is invalid or has expired.");
        }

        setLoading(false);
      }, 400);
    }

    void hydrateRecoveryState();

    const { data: listener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      const hasRecoveryMarker = hasRecoveryMarkerInCurrentUrl();

      if (!mounted) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" && currentSession) {
        markRecoveryReady();
        setLoading(false);
      }

      if (event === "SIGNED_OUT") {
        setIsRecoveryReady(false);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(RECOVERY_READY_KEY);
        }
      }

      if (event === "INITIAL_SESSION" && !currentSession && !hasRecoveryMarker) {
        setIsRecoveryReady(false);
      }

      if (event === "SIGNED_IN" && hasRecoveryMarker && currentSession) {
        markRecoveryReady();
        setLoading(false);
      }

      if (event === "INITIAL_SESSION" && hasRecoveryMarker && currentSession) {
        markRecoveryReady();
        if (typeof window !== "undefined") {
          window.history.replaceState({}, document.title, "/reset-password");
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!isRecoveryReady) {
      setStatus("A valid password recovery session is required.");
      return;
    }

    if (!password || !confirmPassword) {
      setStatus("Enter and confirm your new password.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(RECOVERY_READY_KEY);
    }

    const session = await getSessionWithRetry();
    if (!session) {
      setStatus("Password updated. Please sign in again.");
      router.replace("/login");
      return;
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("account_type, employer_verification_status")
      .eq("user_id", session.user.id)
      .maybeSingle();

    const row = (profileRow as { account_type?: "talent" | "employer"; employer_verification_status?: EmployerVerificationStatus } | null | undefined) ?? null;

    if (row?.account_type === "employer") {
      router.replace(resolveEmployerDestination(row.employer_verification_status));
      return;
    }

    router.replace("/dashboard");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-3xl flex-col justify-center px-6 py-16 sm:px-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-lg shadow-slate-200/40">
          <div className="mb-8 space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-500">Password recovery</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Choose a new password</h1>
            <p className="text-sm leading-6 text-slate-600">
              Reset your password using the secure recovery link from your email.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Loading recovery session...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="new-password" className="block text-sm font-semibold text-slate-700">New password</label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-700">Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  autoComplete="new-password"
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
                disabled={isSubmitting || !isRecoveryReady}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Updating..." : "Update password"}
              </button>
            </form>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
            <Link href="/privacy" className="underline underline-offset-4">Privacy</Link>
            <Link href="/terms" className="underline underline-offset-4">Terms</Link>
            <Link href="/support" className="underline underline-offset-4">Support</Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}