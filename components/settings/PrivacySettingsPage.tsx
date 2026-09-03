"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getSessionWithRetry } from "@/lib/supabase-client";
import type { AccountType, OpportunityStatus, ProfileVisibility } from "@/types/freeagent";
import type { TalentPrivacySettings } from "@/types/talent-privacy";

type VisibilityOption = { value: Exclude<ProfileVisibility, "employer_network">; title: string; description: string };
type OpportunityOption = { value: OpportunityStatus; title: string; description: string };

const visibilityOptions: VisibilityOption[] = [
  {
    value: "public",
    title: "Public",
    description: "Visible to employers and searchable from the public talent experience.",
  },
  {
    value: "verified_employer_network",
    title: "Verified Employer Network",
    description: "Shared only with verified employer accounts inside the FreeAgent network.",
  },
  {
    value: "confidential",
    title: "Confidential Mode",
    description: "Shows an anonymised Talent Card and hides personal identity details.",
  },
];

const opportunityOptions: OpportunityOption[] = [
  {
    value: "actively_open",
    title: "Actively Open",
    description: "Ready for immediate opportunities and conversations.",
  },
  {
    value: "exploring",
    title: "Exploring",
    description: "Open to selective conversations for the right fit.",
  },
  {
    value: "not_open",
    title: "Not Open",
    description: "Not currently considering new opportunities.",
  },
];

const normalizeVisibility = (value: ProfileVisibility | undefined): Exclude<ProfileVisibility, "employer_network"> => {
  if (value === "employer_network") {
    return "verified_employer_network";
  }

  if (value === "public" || value === "verified_employer_network" || value === "confidential") {
    return value;
  }

  return "public";
};

export default function PrivacySettingsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [accountType, setAccountType] = useState<AccountType>("talent");
  const [settings, setSettings] = useState<TalentPrivacySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [blockInput, setBlockInput] = useState("");
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const currentSession = await getSessionWithRetry();

      if (!mounted) {
        return;
      }

      if (!currentSession) {
        router.replace("/login");
        return;
      }

      setSession(currentSession);

      const response = await fetch("/api/talent/privacy", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        reason?: string;
        message?: string;
        settings?: TalentPrivacySettings;
      } | null;

      if (!mounted) {
        return;
      }

      if (!payload?.ok) {
        if (payload?.reason === "wrong_account_type") {
          setAccountType("employer");
          setSettings(null);
        } else {
          setSaveMessage(payload?.message ?? "Unable to load your privacy settings.");
        }

        setIsLoading(false);
        return;
      }

      setAccountType("talent");
      setSettings(payload.settings ?? null);

      setIsLoading(false);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [router]);

  const savePrivacySettings = async (
    updates: Partial<Pick<TalentPrivacySettings, "visibility" | "opportunityStatus" | "isPublished">>,
    successMessage: string,
  ) => {
    if (!session || !settings) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    const nextSettings: TalentPrivacySettings = {
      ...settings,
      ...updates,
    };

    const response = await fetch("/api/talent/privacy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visibility: nextSettings.visibility,
        opportunityStatus: nextSettings.opportunityStatus,
        isPublished: nextSettings.isPublished,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      settings?: TalentPrivacySettings;
    } | null;

    setIsSaving(false);

    if (!response.ok || !payload?.ok || !payload.settings) {
      setSaveMessage(payload?.message ?? "Unable to save privacy settings.");
      return;
    }

    setSettings(payload.settings);
    setSaveMessage(successMessage);
  };

  const addBlockedCompany = async () => {
    if (!session || !blockInput.trim()) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    const response = await fetch("/api/talent/privacy/blocked-companies", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier: blockInput.trim() }),
    });

    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      blockedCompanies?: string[];
    } | null;

    setIsSaving(false);

    if (!response.ok || !payload?.ok) {
      setSaveMessage(payload?.message ?? "Unable to block that company right now.");
      return;
    }

    setSettings((current) => current ? { ...current, blockedCompanies: payload.blockedCompanies ?? [] } : current);
    setBlockInput("");
    setSaveMessage("Company blocked.");
  };

  const removeBlockedCompany = async (key: string) => {
    if (!session) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    const response = await fetch(`/api/talent/privacy/blocked-companies/${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      blockedCompanies?: string[];
    } | null;

    setIsSaving(false);

    if (!response.ok || !payload?.ok) {
      setSaveMessage(payload?.message ?? "Unable to unblock that company right now.");
      return;
    }

    setSettings((current) => current ? { ...current, blockedCompanies: payload.blockedCompanies ?? [] } : current);
    setSaveMessage("Company unblocked.");
  };

  const activeVisibility = normalizeVisibility(settings?.visibility);

  const formatBlockedKey = (key: string) => {
    if (key.startsWith("abn:")) {
      return `ABN ${key.slice(4)}`;
    }

    if (key.startsWith("domain:")) {
      return `Domain ${key.slice(7)}`;
    }

    if (key.startsWith("name:")) {
      return `Company ${key.slice(5)}`;
    }

    return key;
  };

  return (
    <main className="privacy-page flex min-h-screen flex-col bg-[#08111F] text-[#08111F]">
      <Navbar />
      <div className="flex-1 mx-auto w-full max-w-5xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="privacy-panel rounded-[36px] border border-[#08111F]/15 bg-[#f7e8c6] p-8 text-[#08111F] shadow-[0_18px_55px_rgba(6,16,33,0.18)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#08111F]/60">
            Settings / Privacy
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-[0.12em] text-[#08111F] sm:text-5xl">
            Privacy & Visibility
          </h1>
          {accountType === "talent" ? (
            <div className="mt-6">
              <Link
                href="/builder"
                className="inline-flex rounded-full bg-[#aff546] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#071426] transition hover:bg-[#9fea37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#aff546] focus-visible:ring-offset-2"
              >
                Back to create your card
              </Link>
            </div>
          ) : null}

          {accountType === "employer" ? (
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#08111F]/70">
              These settings apply to Talent Passports. Employer profile controls stay in Dashboard.
            </p>
          ) : (
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#08111F]/70">
              Choose who can see your profile when it is published, how it appears in the employer marketplace, and which employer identities are blocked. Publishing is managed in Builder Studio.
            </p>
          )}

          {activeVisibility === "confidential" && accountType === "talent" ? (
            <div className="privacy-light-row mt-8 rounded-[24px] border border-[#08111F]/15 bg-[#08111F]/[0.03] p-6 text-sm leading-7 text-[#08111F]/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#08111F]/60">Confidential Mode active</p>
              <p className="mt-3">
                Name, photo, current employer and contact details are hidden. Employers see an anonymised Talent Card instead.
              </p>
            </div>
          ) : null}

          <div className="mt-10 space-y-4">
            {accountType === "employer" ? (
              <div className="privacy-light-row rounded-[24px] border border-[#08111F]/15 bg-[#08111F]/[0.03] p-6 text-sm leading-7 text-[#08111F]/70">
                Employer account detected. Use Dashboard to manage verification details.
              </div>
            ) : null}

            {isLoading ? (
              <div className="privacy-light-row rounded-[24px] border border-[#08111F]/15 bg-[#08111F]/[0.03] p-6 text-sm text-[#08111F]/70">
                Loading your settings...
              </div>
            ) : null}

            {accountType === "talent"
              ? visibilityOptions.map((option) => {
                  const active = activeVisibility === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        savePrivacySettings({ visibility: option.value }, "Visibility setting saved.")
                      }
                      disabled={isSaving || !settings}
                      className={`w-full rounded-[24px] border p-5 text-left transition ${
                        active
                          ? "border-[#AFF546]/70 bg-[#0f2744]"
                          : "border-[#cda64d]/25 bg-[#0f2744] hover:bg-[#17355f]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f7ebcf]">{option.title}</p>
                          <p className="mt-2 text-sm leading-7 text-[#f7ebcf]/80">{option.description}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${active ? "border-[#AFF546]/70 bg-[#AFF546] text-[#08111F]" : "border-[#f7ebcf]/40 bg-[#f7ebcf] text-[#08111F]"}`}>
                          {active ? "Selected" : "Choose"}
                        </span>
                      </div>
                    </button>
                  );
                })
              : null}
          </div>

          {accountType === "talent" && !isLoading ? (
            <div className="mt-10 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#08111F]">Opportunity status</p>
              {opportunityOptions.map((option) => {
                const active = (settings?.opportunityStatus ?? "actively_open") === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      savePrivacySettings(
                        { opportunityStatus: option.value },
                        "Opportunity status saved.",
                      )
                    }
                    disabled={isSaving || !settings}
                    className={`w-full rounded-[24px] border p-5 text-left transition ${
                      active
                        ? "border-[#AFF546]/70 bg-[#0f2744]"
                        : "border-[#cda64d]/25 bg-[#0f2744] hover:bg-[#17355f]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f7ebcf]">{option.title}</p>
                          <p className="mt-2 text-sm leading-7 text-[#f7ebcf]/80">{option.description}</p>
                      </div>
                        <span className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${active ? "border-[#AFF546]/70 bg-[#AFF546] text-[#08111F]" : "border-[#f7ebcf]/40 bg-[#f7ebcf] text-[#08111F]"}`}>
                        {active ? "Selected" : "Choose"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {accountType === "talent" && !isLoading ? (
            <div className="privacy-light-row mt-10 rounded-[24px] border border-[#cda64d]/25 bg-[#0f2744] p-6 text-sm leading-7 text-[#f7ebcf]/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f7ebcf]">Blocked companies</p>
              <p className="mt-2">
                Block by company name, domain, or ABN. FreeAgent stores a canonical privacy key behind the scenes and hides blocked employers from discovery and contact access where current rules apply.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={blockInput}
                  onChange={(event) => setBlockInput(event.target.value)}
                  placeholder="Company name, domain, or ABN"
                  className="min-h-[44px] w-full rounded-2xl border border-[#08111F]/20 bg-[#fffaf0] px-4 py-3 text-sm text-[#08111F] outline-none transition focus:border-[#AFF546]"
                />
                <button
                  type="button"
                  onClick={() => {
                    void addBlockedCompany();
                  }}
                  disabled={isSaving || blockInput.trim().length === 0}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#AFF546]/70 bg-[#AFF546] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.24em] text-[#08111F] transition hover:brightness-105 disabled:opacity-60"
                >
                  Add block
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {settings?.blockedCompanies.length ? settings.blockedCompanies.map((key) => (
                  <div key={key} className="flex flex-col gap-3 rounded-2xl border border-[#08111F]/15 bg-[#fffaf0] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-[#08111F]">{formatBlockedKey(key)}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#08111F]/60">{key}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void removeBlockedCompany(key);
                      }}
                      disabled={isSaving}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#08111F]/20 px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#08111F] transition hover:bg-[#08111F]/[0.05] disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-[#08111F]/20 p-4 text-sm text-[#08111F]/60">
                    No blocked companies yet.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {accountType === "talent" ? (
            <div className="mt-8 text-xs text-[#08111F]/60">
              Prefer a full profile edit? <Link href="/builder" className="font-semibold text-[#08111F] underline underline-offset-4">Return to your Talent Passport builder</Link>.
            </div>
          ) : null}

          {saveMessage ? (
            <div className="mt-6 rounded-[20px] border border-[#08111F]/15 bg-[#fffaf0] px-4 py-3 text-sm text-[#08111F]/70">
              {saveMessage}
            </div>
          ) : null}
        </div>
      </div>
      <Footer />
    </main>
  );
}
