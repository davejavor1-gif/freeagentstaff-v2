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
    <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
      <Navbar />
      <div className="flex-1 mx-auto w-full max-w-5xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="rounded-[36px] border border-[#cda64d]/60 bg-[#0f2744] p-8 text-[#f7ebcf] shadow-[0_18px_55px_rgba(6,16,33,0.18)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#f2cc63]">
            Settings / Privacy
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-[0.12em] text-[#f7ebcf] sm:text-5xl">
            Privacy & Visibility
          </h1>

          {accountType === "employer" ? (
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#dfe7ef]">
              These settings apply to Talent Passports. Employer profile controls stay in Dashboard.
            </p>
          ) : (
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#dfe7ef]">
              Choose whether your profile is published, how it appears in the employer marketplace, and which employer identities are blocked.
            </p>
          )}

          {activeVisibility === "confidential" && accountType === "talent" ? (
            <div className="mt-8 rounded-[24px] border border-[#f2cc63]/35 bg-[#f7ebcf]/12 p-6 text-sm leading-7 text-[#dfe7ef]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">Confidential Mode active</p>
              <p className="mt-3">
                Name, photo, current employer and contact details are hidden. Employers see an anonymised Talent Card instead.
              </p>
            </div>
          ) : null}

          <div className="mt-10 space-y-4">
            {accountType === "employer" ? (
              <div className="rounded-[24px] border border-[#f2cc63]/20 bg-[#f7ebcf]/10 p-6 text-sm leading-7 text-[#dfe7ef]">
                Employer account detected. Use Dashboard to manage verification details.
              </div>
            ) : null}

            {isLoading ? (
              <div className="rounded-[24px] border border-[#f2cc63]/20 bg-[#f7ebcf]/10 p-6 text-sm text-[#dfe7ef]">
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
                          ? "border-[#f2cc63]/70 bg-[#f7ebcf]/15"
                          : "border-[#f2cc63]/20 bg-[#f7ebcf]/10 hover:bg-[#f7ebcf]/15"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">{option.title}</p>
                          <p className="mt-2 text-sm leading-7 text-[#dfe7ef]">{option.description}</p>
                        </div>
                        <span className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${active ? "bg-[#f2cc63] text-[#0f2744]" : "bg-[#0f2744]/80 text-[#f7ebcf]"}`}>
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">Opportunity status</p>
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
                        ? "border-[#f2cc63]/70 bg-[#f7ebcf]/15"
                        : "border-[#f2cc63]/20 bg-[#f7ebcf]/10 hover:bg-[#f7ebcf]/15"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">{option.title}</p>
                        <p className="mt-2 text-sm leading-7 text-[#dfe7ef]">{option.description}</p>
                      </div>
                      <span className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${active ? "bg-[#f2cc63] text-[#0f2744]" : "bg-[#0f2744]/80 text-[#f7ebcf]"}`}>
                        {active ? "Selected" : "Choose"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {accountType === "talent" && !isLoading ? (
            <div className="mt-10 rounded-[24px] border border-[#f2cc63]/20 bg-[#f7ebcf]/10 p-6 text-sm leading-7 text-[#dfe7ef]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">Publish state</p>
                  <p className="mt-2">
                    Published profiles may participate in employer discovery according to their current visibility, opportunity status, and blocking rules. Unpublished profiles remain editable.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void savePrivacySettings(
                      { isPublished: !(settings?.isPublished ?? false) },
                      !(settings?.isPublished ?? false) ? "Profile published." : "Profile unpublished.",
                    );
                  }}
                  disabled={isSaving || !settings}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#f2cc63]/35 bg-[#f2cc63] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#f7d87d] disabled:opacity-60"
                >
                  {settings?.isPublished ? "Unpublish profile" : "Publish profile"}
                </button>
              </div>
              <p className="mt-3 text-[#f2cc63]">Current state: {settings?.isPublished ? "Published" : "Unpublished"}</p>
              <p className="mt-3 text-xs text-[#dfe7ef]">
                Confidential profiles may still be published. Existing employer connections continue to exist historically, but contact access still follows the current secure eligibility rules.
              </p>
            </div>
          ) : null}

          {accountType === "talent" && !isLoading ? (
            <div className="mt-10 rounded-[24px] border border-[#f2cc63]/20 bg-[#f7ebcf]/10 p-6 text-sm leading-7 text-[#dfe7ef]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">Blocked companies</p>
              <p className="mt-2">
                Block by company name, domain, or ABN. FreeAgent stores a canonical privacy key behind the scenes and hides blocked employers from discovery and contact access where current rules apply.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={blockInput}
                  onChange={(event) => setBlockInput(event.target.value)}
                  placeholder="Company name, domain, or ABN"
                  className="min-h-[44px] w-full rounded-2xl border border-[#f2cc63]/30 bg-[#f7ebcf]/8 px-4 py-3 text-sm text-[#f7ebcf] outline-none transition focus:border-[#f2cc63]"
                />
                <button
                  type="button"
                  onClick={() => {
                    void addBlockedCompany();
                  }}
                  disabled={isSaving || blockInput.trim().length === 0}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#f2cc63]/35 bg-[#0f2744] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f] disabled:opacity-60"
                >
                  Add block
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {settings?.blockedCompanies.length ? settings.blockedCompanies.map((key) => (
                  <div key={key} className="flex flex-col gap-3 rounded-2xl border border-[#f2cc63]/20 bg-[#0f2744]/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-[#f7ebcf]">{formatBlockedKey(key)}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#f2cc63]">{key}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void removeBlockedCompany(key);
                      }}
                      disabled={isSaving}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#f2cc63]/35 px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f2cc63] transition hover:bg-[#f7ebcf]/10 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-[#f2cc63]/20 p-4 text-sm text-[#dfe7ef]">
                    No blocked companies yet.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {accountType === "talent" ? (
            <div className="mt-8 text-xs text-[#dfe7ef]">
              Prefer a full profile edit? <Link href="/builder" className="font-semibold text-[#f2cc63] underline underline-offset-4">Return to your Talent Passport builder</Link>.
            </div>
          ) : null}

          {saveMessage ? (
            <div className="mt-6 rounded-[20px] border border-[#f2cc63]/25 bg-[#f7ebcf]/10 px-4 py-3 text-sm text-[#dfe7ef]">
              {saveMessage}
            </div>
          ) : null}
        </div>
      </div>
      <Footer />
    </main>
  );
}
