"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/lib/supabase-client";
import type { FreeAgentProfile, ProfileVisibility } from "@/types/freeagent";

type VisibilityOption = { value: ProfileVisibility; title: string; description: string };

const visibilityOptions: VisibilityOption[] = [
  {
    value: "public",
    title: "Public",
    description: "Visible to employers and searchable from the public talent experience.",
  },
  {
    value: "employer_network",
    title: "Employer network",
    description: "Shared with employer network contacts and selected hiring teams.",
  },
  {
    value: "confidential",
    title: "Confidential",
    description: "Keeps your identity private and shows an anonymised Talent Passport instead.",
  },
];

export default function PrivacyPage() {
  const [session, setSession] = useState<Session | null>(null);
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

      const { data: profileData } = await supabase.from("profiles").select("profile").eq("user_id", currentSession.user.id).maybeSingle();

      if (!mounted) {
        return;
      }

      const profilePayload = (profileData as { profile?: unknown } | null | undefined)?.profile;

      if (profilePayload) {
        const loadedProfile = profilePayload as unknown as FreeAgentProfile;
        loadedProfile.visibility = loadedProfile.visibility ?? "public";
        setProfile(loadedProfile);
      } else {
        setProfile({
          id: `freeagent-${currentSession.user.id.slice(0, 8)}`,
          slug: `freeagent-${currentSession.user.id.slice(0, 8)}`,
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
          email: currentSession.user.email ?? "",
        });
      }

      setIsLoading(false);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [router]);

  const saveVisibility = async (nextVisibility: ProfileVisibility) => {
    if (!session || !profile) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    const { error } = await supabase.from("profiles").upsert(
      [
        {
          user_id: session.user.id,
          slug: profile.slug ?? null,
          profile: { ...profile, visibility: nextVisibility } as unknown as Record<string, unknown>,
        } as never,
      ],
      { onConflict: "user_id" } as never,
    );

    setIsSaving(false);

    if (error) {
      setSaveMessage(error.message);
      return;
    }

    setProfile((current) => (current ? { ...current, visibility: nextVisibility } : current));
    setSaveMessage("Visibility saved successfully.");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="rounded-[36px] border border-[#cda64d]/60 bg-[#0f2744] p-8 text-[#f7ebcf] shadow-[0_18px_55px_rgba(6,16,33,0.18)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#f2cc63]">
            Privacy & visibility
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-[0.12em] text-[#f7ebcf] sm:text-5xl">
            Control how your profile appears to the world.
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-[#dfe7ef]">
            Choose the level of visibility that fits the moment. Public profiles are searchable, employer network profiles are reserved for trusted hiring conversations, and confidential profiles stay private while still showing an anonymised Talent Passport.
          </p>

          <div className="mt-10 space-y-4">
            {isLoading ? (
              <div className="rounded-[24px] border border-[#f2cc63]/20 bg-[#f7ebcf]/10 p-6 text-sm text-[#dfe7ef]">
                Loading your privacy preferences...
              </div>
            ) : null}

            {visibilityOptions.map((option) => {
              const active = profile?.visibility === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => saveVisibility(option.value)}
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
