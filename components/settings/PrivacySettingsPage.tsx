"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/lib/supabase-client";
import type { AccountType, FreeAgentProfile, OpportunityStatus, ProfileVisibility } from "@/types/freeagent";

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

const createBlankProfile = (userId: string, email?: string | null): FreeAgentProfile => ({
  id: `freeagent-${userId.slice(0, 8)}`,
  slug: `freeagent-${userId.slice(0, 8)}`,
  visibility: "public",
  opportunityStatus: "actively_open",
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

export default function PrivacySettingsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [accountType, setAccountType] = useState<AccountType>("talent");
  const [profile, setProfile] = useState<FreeAgentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;

      if (!mounted) {
        return;
      }

      if (!currentSession) {
        router.replace("/login");
        return;
      }

      setSession(currentSession);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("profile, account_type, slug")
        .eq("user_id", currentSession.user.id)
        .maybeSingle();

      if (!mounted) {
        return;
      }

      const rowData = profileData as { profile?: unknown; account_type?: AccountType; slug?: string | null } | null | undefined;
      const rowAccountType = rowData?.account_type === "employer" ? "employer" : "talent";
      setAccountType(rowAccountType);

      if (rowAccountType === "employer") {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const profilePayload = rowData?.profile;

      if (profilePayload) {
        const loadedProfile = profilePayload as unknown as FreeAgentProfile;
        loadedProfile.slug = loadedProfile.slug ?? rowData?.slug ?? loadedProfile.slug;
        loadedProfile.visibility = normalizeVisibility(loadedProfile.visibility);
        loadedProfile.opportunityStatus = loadedProfile.opportunityStatus ?? "actively_open";
        setProfile(loadedProfile);
      } else {
        setProfile(createBlankProfile(currentSession.user.id, currentSession.user.email));
      }

      setIsLoading(false);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [router]);

  const saveProfileSettings = async (
    updates: Partial<Pick<FreeAgentProfile, "visibility" | "opportunityStatus">>,
    successMessage: string,
  ) => {
    if (!session || !profile) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    const nextProfile: FreeAgentProfile = {
      ...profile,
      ...updates,
    };

    const { error } = await supabase.from("profiles").upsert(
      [
        {
          user_id: session.user.id,
          account_type: "talent",
          slug: nextProfile.slug ?? null,
          profile: nextProfile as unknown as Record<string, unknown>,
        } as never,
      ],
      { onConflict: "user_id" } as never,
    );

    setIsSaving(false);

    if (error) {
      setSaveMessage(error.message);
      return;
    }

    setProfile(nextProfile);
    setSaveMessage(successMessage);
  };

  const activeVisibility = normalizeVisibility(profile?.visibility);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-8 lg:px-12">
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
              Choose visibility and opportunity preferences for how your Talent Card appears to verified employers.
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
                        saveProfileSettings({ visibility: option.value }, "Visibility setting saved.")
                      }
                      disabled={isSaving || !profile}
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
                const active = (profile?.opportunityStatus ?? "actively_open") === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      saveProfileSettings(
                        { opportunityStatus: option.value },
                        "Opportunity status saved.",
                      )
                    }
                    disabled={isSaving || !profile}
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

          {saveMessage ? (
            <div className="mt-6 rounded-[20px] border border-[#f2cc63]/25 bg-[#f7ebcf]/10 px-4 py-3 text-sm text-[#dfe7ef]">
              {saveMessage}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
