"use client";

import { useEffect, useState } from "react";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";

export default function EmployerPricingButton({ className }: { className: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [label, setLabel] = useState("Get started");

  useEffect(() => {
    let mounted = true;

    const loadLabel = async () => {
      const session = await getSessionWithRetry();
      if (!session?.access_token) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, employer_verification_status, employer_subscription_status, employer_subscription_current_period_ends_at")
        .eq("user_id", session.user.id)
        .maybeSingle<{
          account_type: "talent" | "employer";
          employer_verification_status: "unverified" | "pending" | "more_info_required" | "verified" | "rejected";
          employer_subscription_status: "inactive" | "active" | "trialing" | "past_due" | "canceled";
          employer_subscription_current_period_ends_at: string | null;
        }>();

      if (!mounted || profile?.account_type !== "employer") return;
      if (profile.employer_verification_status !== "verified") {
        setLabel("Continue verification");
        return;
      }

      const periodEndsAt = profile.employer_subscription_current_period_ends_at ? new Date(profile.employer_subscription_current_period_ends_at).getTime() : null;
      const hasAccess =
        (profile.employer_subscription_status === "active" || profile.employer_subscription_status === "trialing") &&
        (periodEndsAt === null || (!Number.isNaN(periodEndsAt) && periodEndsAt >= Date.now()));

      setLabel(hasAccess ? "Manage subscription" : "Choose Employer Plan");
    };

    void loadLabel();

    return () => {
      mounted = false;
    };
  }, []);

  const openBilling = async (action: "checkout" | "portal", accessToken: string) => {
    const response = await fetch(`/api/stripe/${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(action === "checkout" ? { "Content-Type": "application/json" } : {}),
      },
      ...(action === "checkout" ? { body: JSON.stringify({ plan: "employer" }) } : {}),
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; url?: string; message?: string } | null;

    if (!response.ok || !result?.ok || !result.url) {
      setMessage(result?.message ?? "Unable to open billing.");
      return;
    }

    window.location.assign(result.url);
  };

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);

    try {
      const session = await getSessionWithRetry();
      if (!session?.access_token) {
        window.location.assign("/employer/auth");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("account_type, employer_verification_status, employer_subscription_status, employer_subscription_current_period_ends_at")
        .eq("user_id", session.user.id)
        .maybeSingle<{
          account_type: "talent" | "employer";
          employer_verification_status: "unverified" | "pending" | "more_info_required" | "verified" | "rejected";
          employer_subscription_status: "inactive" | "active" | "trialing" | "past_due" | "canceled";
          employer_subscription_current_period_ends_at: string | null;
        }>();

      if (error || profile?.account_type !== "employer") {
        window.location.assign("/employer/auth");
        return;
      }

      if (profile.employer_verification_status !== "verified") {
        window.location.assign("/onboarding/employer");
        return;
      }

      const periodEndsAt = profile.employer_subscription_current_period_ends_at ? new Date(profile.employer_subscription_current_period_ends_at).getTime() : null;
      const hasAccess =
        (profile.employer_subscription_status === "active" || profile.employer_subscription_status === "trialing") &&
        (periodEndsAt === null || (!Number.isNaN(periodEndsAt) && periodEndsAt >= Date.now()));

      await openBilling(hasAccess ? "portal" : "checkout", session.access_token);
    } catch {
      setMessage("Unable to open employer billing.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={busy} className={className}>
        {busy ? "Opening..." : label}
      </button>
      {message ? <p className="mt-2 text-sm font-semibold text-rose-700">{message}</p> : null}
    </div>
  );
}