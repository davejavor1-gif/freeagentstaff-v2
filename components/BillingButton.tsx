"use client";

import { useState } from "react";
import { getSessionWithRetry } from "@/lib/supabase-client";

export default function BillingButton({
  action,
  plan,
  children,
  className,
}: {
  action: "checkout" | "portal";
  plan?: "free_agent_pro" | "employer";
  children: React.ReactNode;
  className: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);

    try {
      const session = await getSessionWithRetry();
      if (!session?.access_token) {
        setMessage("Sign in required.");
        return;
      }

      const response = await fetch(`/api/stripe/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          ...(action === "checkout" ? { "Content-Type": "application/json" } : {}),
        },
        ...(action === "checkout" ? { body: JSON.stringify({ plan }) } : {}),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; url?: string; message?: string } | null;

      if (!response.ok || !result?.ok || !result.url) {
        setMessage(result?.message ?? "Unable to open billing.");
        return;
      }

      window.location.assign(result.url);
    } catch {
      setMessage("Unable to open billing.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={busy} className={className}>
        {busy ? "Opening..." : children}
      </button>
      {message ? <p className="mt-2 text-sm font-semibold text-rose-700">{message}</p> : null}
    </div>
  );
}
