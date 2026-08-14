"use client";

import Link from "next/link";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
    } finally {
      setIsSubmitting(false);
      setStatus("If an account exists for that email, password reset instructions have been sent.");
    }
  };

  return (
    <main className="min-h-screen bg-[#0f2744] text-[#f7ebcf]">
      <Navbar />
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-3xl flex-col justify-center px-6 py-16 sm:px-10">
        <div className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-10 text-[#0f2744] shadow-[0_18px_50px_rgba(6,16,33,0.22)]">
          <div className="mb-8 space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Password recovery</p>
            <h1 className="text-3xl font-black tracking-tight text-[#0f2744] sm:text-4xl">Reset your password</h1>
            <p className="text-sm leading-6 text-[#27405f]">
              Enter your email and we&apos;ll send password reset instructions if an account exists.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-semibold text-[#27405f]">Email</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#cda64d]/45 bg-white px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#2bd7ef] focus:ring-2 focus:ring-[#2bd7ef]/25"
                autoComplete="email"
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
              {isSubmitting ? "Sending..." : "Send reset instructions"}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-[#27405f]">
            <Link href="/login" className="font-semibold text-[#0f2744] underline underline-offset-4">Talent sign in</Link>
            <Link href="/employer/auth" className="font-semibold text-[#0f2744] underline underline-offset-4">Employer sign in</Link>
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