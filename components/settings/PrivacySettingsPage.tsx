"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, LockKeyhole, ShieldCheck, Ban } from "lucide-react";
import Image from "next/image";
import type { Session } from "@supabase/supabase-js";
import Footer from "@/components/layout/Footer";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import { accountHomePath, resolveAccountIdentity } from "@/lib/account-identity";
import type { AccountType, AvailabilityStatus, ProfileVisibility } from "@/types/freeagent";
import { availabilityOptions, availabilityStatusColors } from "@/lib/talent-profile-options";
import type { TalentPrivacySettings } from "@/types/talent-privacy";

type VisibilityOption = { value: Exclude<ProfileVisibility, "employer_network">; title: string; description: string };
type OpportunityOption = { value: AvailabilityStatus; title: string; description: string };

const visibilityIcons = {
  verified_employer_network: Building2,
  confidential: LockKeyhole,
};

function EarthIcon({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`h-7 w-7 shrink-0 ${active ? "bg-[#AFF546]" : "bg-[#651D2A]"}`}
      style={{
        maskImage: "url('/images/earth.png')",
        WebkitMaskImage: "url('/images/earth.png')",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

const visibilityOptions: VisibilityOption[] = [
  {
    value: "public",
    title: "Public",
    description: "Visible to everyone with your Passport link, including people outside FreeAgentStaff.",
  },
  {
    value: "verified_employer_network",
    title: "Employer Network",
    description: "Visible only to verified employers on FreeAgentStaff.",
  },
  {
    value: "confidential",
    title: "Confidential",
    description: "Keep your identity private while staying discoverable through Confidential Mode.",
  },
];

const opportunityOptions: OpportunityOption[] = availabilityOptions.map((option) => ({
  value: option.value,
  title: option.label,
  description: option.description,
}));

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
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [identityMessage, setIdentityMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<TalentPrivacySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [, setSaveMessage] = useState<string | null>(null);
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

      const { data: profileRow, error: profileSelectError } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("user_id", currentSession.user.id)
        .maybeSingle<{ account_type?: string }>();

      if (!mounted) {
        return;
      }

      if (profileSelectError) {
        setAccountType(null);
        setIdentityMessage("We couldn't determine your account type right now. Please try again.");
        setIsLoading(false);
        return;
      }

      const identity = resolveAccountIdentity({
        profileExists: Boolean(profileRow),
        profileAccountType: profileRow?.account_type,
        metadataAccountType: currentSession.user.user_metadata?.account_type,
      });

      if (identity.status === "mismatch") {
        setAccountType(null);
        setIdentityMessage("This account has conflicting identity records. Privacy settings are paused until the account type is resolved.");
        setIsLoading(false);
        return;
      }

      if (identity.status !== "resolved") {
        setAccountType(null);
        setIdentityMessage("We couldn't determine whether this is a Talent or Employer account.");
        setIsLoading(false);
        return;
      }

      if (identity.accountType !== "talent") {
        router.replace(accountHomePath(identity.accountType));
        return;
      }

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
          router.replace(accountHomePath("employer"));
          return;
        }

        setAccountType(null);
        setIdentityMessage(payload?.message ?? "Unable to load your privacy settings.");
        setIsLoading(false);
        return;
      }

      setAccountType("talent");
      setIdentityMessage(null);
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

  if (isLoading || accountType !== "talent") {
    return (
      <main className="privacy-page flex min-h-screen flex-col bg-[#08111F] text-[#08111F]">
        <div className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
          <div className="rounded-[32px] border border-[#cda64d]/45 bg-[#f7e8c6] p-8 text-[#08111F]">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#9a6d15]">Settings</p>
            <p className="mt-4 text-sm">{isLoading ? "Loading privacy settings..." : (identityMessage ?? "Privacy settings are available for Talent accounts only.")}</p>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const formatBlockedKey = (key: string) => {
    if (key.startsWith("abn:")) {
      return `ABN ${key.slice(4)}`;
    }

    if (key.startsWith("acn:")) {
      return `ACN ${key.slice(4)}`;
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
      <div className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="privacy-panel rounded-[32px] border border-[#cda64d]/45 bg-[#f7e8c6] p-5 text-[#08111F] shadow-[0_18px_55px_rgba(6,16,33,0.18)] sm:p-8 lg:p-10">
          <section className="relative overflow-hidden rounded-[28px] border border-[#cda64d]/35 bg-[#fffaf0] p-6 sm:p-8 lg:p-10">
            <div className="relative z-10 max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#9a6d15]">Settings</p>
              <h1 className="mt-4 font-serif text-4xl font-semibold uppercase leading-[0.95] tracking-tight text-[#08111F] sm:text-6xl">Privacy &amp; Visibility</h1>
              <p className="mt-5 max-w-lg text-base leading-8 text-[#27405f]">Choose who can see your profile, how it appears in the employer marketplace, and which parts of your information are visible. You can update these settings anytime.</p>
            </div>
            <Image src="/images/control.png" alt="" width={640} height={440} className="pointer-events-none absolute right-2 top-0 hidden h-auto w-[32rem] max-w-[45%] object-contain lg:block" priority />
          </section>

          <p className="sr-only">Choose who can see your profile when it is published, how it appears in the employer marketplace, and which employer identities are blocked. Publishing is managed in Talent Builder.</p>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#8fca45]/45 bg-[#f1f8df] p-4 text-sm text-[#27405f]"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#527c1b]" /><div><p className="font-bold text-[#08111F]">Your information is safe with us.</p><p className="mt-1">We never share your data without your permission.</p></div></div>

          {activeVisibility === "confidential" ? (
            <div className="privacy-light-row mt-8 rounded-[24px] border border-[#08111F]/15 bg-[#08111F]/[0.03] p-6 text-sm leading-7 text-[#08111F]/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#08111F]/60">Confidential Mode active</p>
              <p className="mt-3">
                Name, photo, current employer and contact details are hidden. Employers see an anonymised Talent Card instead.
              </p>
            </div>
          ) : null}

          <div className="mt-8 space-y-8">
            <section className="rounded-[26px] border border-[#cda64d]/35 bg-[#fffaf0] p-5 sm:p-7">
                  <div className="flex items-start gap-3">
                    <div><p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#9a6d15]">Profile Visibility</p><p className="mt-2 text-sm leading-6 text-[#52627a]">Choose who can see your profile in the employer marketplace.</p></div>
                  </div>
                  <div className="mt-6 grid gap-3 lg:grid-cols-3">
                  {visibilityOptions.map((option) => {
                  const active = activeVisibility === option.value;
                  const Icon = option.value === "public" ? null : visibilityIcons[option.value];

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        savePrivacySettings({ visibility: option.value }, "Visibility setting saved.")
                      }
                      disabled={isSaving || !settings}
                      aria-pressed={active}
                      className={`w-full rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AFF546] focus-visible:ring-offset-2 ${
                        active
                          ? "border-[#AFF546] bg-[#0f2744] text-[#f7ebcf]"
                          : "border-[#d8d1c2] bg-[#fffaf0] hover:border-[#9a6d15]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {option.value === "public" ? <EarthIcon active={active} /> : Icon ? <Icon className={`h-6 w-6 ${active ? "text-[#AFF546]" : "text-[#651D2A]"}`} /> : null}
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${active ? "border-[#AFF546] bg-[#AFF546] text-[#08111F]" : "border-[#d8d1c2] text-[#737b86]"}`}>{active ? "Selected" : "Choose"}</span>
                      </div>
                      <div className="mt-5">
                          <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${active ? "text-[#f7ebcf]" : "text-[#08111F]"}`}>{option.title}</p>
                          <p className={`mt-2 text-sm leading-6 ${active ? "text-[#f7ebcf]/80" : "text-[#52627a]"}`}>{option.description}</p>
                        </div>
                    </button>
                  );
                })}
                  </div>
                </section>
          </div>

          <section className="rounded-[26px] border border-[#cda64d]/35 bg-[#fffaf0] p-5 sm:p-7">
              <div><p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#9a6d15]">Opportunity Status</p><p className="mt-2 text-sm leading-6 text-[#52627a]">Let employers know what opportunities you&apos;re open to.</p></div>
              <div className="mt-6 grid gap-3 lg:grid-cols-3">{opportunityOptions.map((option) => {
                const active = (settings?.opportunityStatus ?? "Available Now") === option.value;
                const selectedColor = availabilityStatusColors[option.value];

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
                    aria-pressed={active}
                    style={active ? { borderColor: selectedColor } : undefined}
                    className={`w-full rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AFF546] focus-visible:ring-offset-2 ${
                        active
                          ? "bg-[#0f2744] text-[#f7ebcf]"
                        : "border-[#d8d1c2] bg-[#fffaf0] hover:border-[#9a6d15]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3"><div><p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${active ? "text-[#f7ebcf]" : "text-[#08111F]"}`}>{option.title}</p><p className={`mt-2 text-sm leading-6 ${active ? "text-[#f7ebcf]/80" : "text-[#52627a]"}`}>{option.description}</p></div>
                      <span style={active ? { borderColor: selectedColor, backgroundColor: selectedColor } : undefined} className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${active ? "text-[#08111F]" : "border-[#d8d1c2] text-[#737b86]"}`}>{active ? "Selected" : "Choose"}</span>
                      </div>
                  </button>
                );
              })}</div>
            </section>

            <section className="rounded-[26px] border border-[#cda64d]/35 bg-[#fffaf0] p-5 text-[#08111F] sm:p-7">
              <div className="flex items-start gap-3"><Ban className="mt-0.5 h-5 w-5 text-[#651D2A]" /><div><p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#9a6d15]">Blocked Companies</p><p className="mt-2 text-sm leading-6 text-[#52627a]">Block specific companies from viewing your profile.</p></div></div>
              <p className="mt-5 text-sm leading-7 text-[#52627a]">
                Block by company name, domain, ABN, or ACN. FreeAgent stores a canonical privacy key behind the scenes and hides blocked employers from discovery and contact access where current rules apply.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={blockInput}
                  onChange={(event) => setBlockInput(event.target.value)}
                  placeholder="Company name, domain, ABN, or ACN"
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

              <div className="mt-5 rounded-2xl border border-[#d8d1c2] bg-[#f7e8c6]/55 p-4">
                <p className="text-sm font-semibold text-[#08111F]">Blocked companies ({settings?.blockedCompanies.length ?? 0})</p>
                <div className="mt-3 space-y-3">
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
            </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
