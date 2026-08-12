"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import FreeAgentCard from "@/components/cards/FreeAgentCard";
import { freeAgentProfiles } from "@/data/freeagents";
import { buildCanonicalTalentColumns } from "@/lib/talent-profile-columns";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import VideoIntroductionSection from "@/components/settings/VideoIntroductionSection";
import type { AccountType, CareerPosition, FreeAgentProfile, ProfileVisibility } from "@/types/freeagent";
import type { Database, Json } from "@/types/supabase";

const initialProfile = freeAgentProfiles[0];

type ProfilesTable = Database["public"]["Tables"]["profiles"];
type ProfileInsert = ProfilesTable["Insert"];

type ProfileSelectResult = {
  slug?: string | null;
  profile: Json;
  account_type?: AccountType;
  visibility?: ProfileVisibility | null;
  opportunity_status?: string | null;
  name?: string | null;
  title?: string | null;
  location?: string | null;
  availability?: string | null;
  top_strength?: string | null;
  experience_years?: number | null;
  focus_area?: string | null;
  summary?: string | null;
  skills?: string[] | null;
  career_journey?: Json;
  email?: string | null;
  image_alt?: string | null;
  current_employer?: string | null;
  intro_video_url?: string | null;
  photo_url?: string | null;
  photo_storage_path?: string | null;
  intro_video_storage_path?: string | null;
};

const normalizeVisibility = (value: ProfileVisibility | null | undefined): Exclude<ProfileVisibility, "employer_network"> => {
  if (value === "verified_employer_network" || value === "confidential" || value === "public") {
    return value;
  }

  return "public";
};

const normalizeOpportunityStatus = (value: string | null | undefined): FreeAgentProfile["opportunityStatus"] => {
  if (value === "actively_open" || value === "exploring" || value === "not_open") {
    return value;
  }

  return "actively_open";
};

const normalizeAvailability = (value: string | null | undefined): FreeAgentProfile["availability"] => {
  if (
    value === "Available Now" ||
    value === "Open to Opportunities" ||
    value === "Open to new projects" ||
    value === "Busy this month" ||
    value === "Booked"
  ) {
    return value;
  }

  return "Available Now";
};

function hydrateBuilderProfile(profileResult: ProfileSelectResult, fallbackEmail?: string | null): FreeAgentProfile {
  const loadedProfile = profileResult.profile as unknown as FreeAgentProfile;

  loadedProfile.slug = profileResult.slug ?? loadedProfile.slug;
  loadedProfile.visibility = normalizeVisibility(profileResult.visibility ?? loadedProfile.visibility);
  loadedProfile.opportunityStatus = normalizeOpportunityStatus(profileResult.opportunity_status ?? loadedProfile.opportunityStatus);
  loadedProfile.name = profileResult.name ?? loadedProfile.name ?? "";
  loadedProfile.title = profileResult.title ?? loadedProfile.title ?? "";
  loadedProfile.location = profileResult.location ?? loadedProfile.location ?? "";
  loadedProfile.availability = normalizeAvailability(profileResult.availability ?? loadedProfile.availability);
  loadedProfile.topStrength = profileResult.top_strength ?? loadedProfile.topStrength ?? "";
  loadedProfile.experienceYears = profileResult.experience_years ?? loadedProfile.experienceYears ?? 0;
  loadedProfile.focusArea = profileResult.focus_area ?? loadedProfile.focusArea ?? "";
  loadedProfile.summary = profileResult.summary ?? loadedProfile.summary ?? "";
  loadedProfile.skills = profileResult.skills ?? loadedProfile.skills ?? [];
  loadedProfile.careerJourney = Array.isArray(profileResult.career_journey)
    ? (profileResult.career_journey as unknown as FreeAgentProfile["careerJourney"])
    : (loadedProfile.careerJourney ?? []);
  loadedProfile.email = profileResult.email ?? loadedProfile.email ?? fallbackEmail ?? "";
  loadedProfile.imageAlt = profileResult.image_alt ?? loadedProfile.imageAlt ?? "";
  loadedProfile.currentEmployer = profileResult.current_employer ?? loadedProfile.currentEmployer;
  loadedProfile.photoUrl = loadedProfile.photoUrl ?? profileResult.photo_url ?? undefined;
  loadedProfile.photo_storage_path = loadedProfile.photo_storage_path ?? profileResult.photo_storage_path ?? null;
  loadedProfile.intro_video_url = loadedProfile.intro_video_url ?? profileResult.intro_video_url ?? null;
  loadedProfile.intro_video_storage_path = loadedProfile.intro_video_storage_path ?? profileResult.intro_video_storage_path ?? null;

  return loadedProfile;
}

const normalizeSlug = (value: string, fallback: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return slug || fallback;
};

const createSlugFromName = (name: string, fallback: string) => normalizeSlug(name || fallback, fallback);

const ensureUniqueSlug = async (slug: string, userId: string) => {
  let candidate = normalizeSlug(slug, `freeagent-${userId.slice(0, 8)}`);
  let suffix = 1;

  while (true) {
    const { data, error } = await supabase.from("profiles").select("user_id").eq("slug", candidate).maybeSingle();
    const row = data as { user_id?: string } | null;

    if (error) {
      break;
    }

    if (!row || row.user_id === userId) {
      return candidate;
    }

    candidate = `${normalizeSlug(slug, `freeagent-${userId.slice(0, 8)}`)}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const createBlankProfile = (userId: string, email?: string | null): FreeAgentProfile => ({
  id: `freeagent-${userId.slice(0, 8)}`,
  slug: `freeagent-${userId.slice(0, 8)}`,
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
  email: email ?? "",
  imageAlt: "",
  photoUrl: undefined,
  photo_storage_path: null,
  intro_video_url: null,
  intro_video_storage_path: null,
});

export default function BuilderPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<FreeAgentProfile>({
    ...initialProfile,
    name: initialProfile.name,
    title: initialProfile.title,
    location: initialProfile.location,
  });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopySuccess, setIsCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [skillInput, setSkillInput] = useState("");
  const [journeyDrafts, setJourneyDrafts] = useState<Record<string, { achievement: string; skill: string }>>({});
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const supabaseSession = await getSessionWithRetry();

      if (!mounted) {
        return;
      }

      if (!supabaseSession) {
        router.replace("/login");
        return;
      }

      setSession(supabaseSession);

      const { data, error } = await supabase
        .from("profiles")
        .select("slug, profile, account_type, visibility, opportunity_status, name, title, location, availability, top_strength, experience_years, focus_area, summary, skills, career_journey, email, image_alt, current_employer, intro_video_url, photo_url, photo_storage_path, intro_video_storage_path")
        .eq("user_id", supabaseSession.user.id)
        .maybeSingle();

      if (!mounted) {
        return;
      }

      if (error) {
        setSaveError(error.message);
        setProfile(createBlankProfile(supabaseSession.user.id, supabaseSession.user.email));
        setProfileLoaded(true);
        setIsLoading(false);
        return;
      }

      if (data && typeof data === "object" && "profile" in data) {
        const profileResult = data as ProfileSelectResult;

        if (profileResult.account_type === "employer") {
          router.replace("/dashboard");
          return;
        }

        setProfile(hydrateBuilderProfile(profileResult, supabaseSession.user.email));
      } else {
        const blankProfile = createBlankProfile(supabaseSession.user.id, supabaseSession.user.email);
        const insertPayload: ProfileInsert = {
          user_id: supabaseSession.user.id,
          account_type: "talent",
          ...buildCanonicalTalentColumns(blankProfile, supabaseSession.user.email),
        };
        const { error: insertError } = await supabase.from("profiles").insert([insertPayload] as never);

        if (!mounted) {
          return;
        }

        if (insertError) {
          setSaveError(insertError.message);
        }

        setProfile(blankProfile);
      }

      setProfileLoaded(true);
      setIsLoading(false);
    }

    loadProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((_, currentSession) => {
      if (!mounted) {
        return;
      }

      if (!currentSession) {
        router.replace("/login");
        return;
      }

      setSession(currentSession);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!profileLoaded || !session) {
      return;
    }

    const debounce = window.setTimeout(async () => {
      const upsertPayload: ProfileInsert = {
        user_id: session.user.id,
        account_type: "talent",
        ...buildCanonicalTalentColumns(profile, session.user.email),
      };

      const { error } = await supabase.from("profiles").upsert([upsertPayload] as never, {
        onConflict: "user_id",
        returning: "minimal",
      } as never);

      if (error) {
        setSaveError(error.message);
      }
    }, 700);

    return () => {
      window.clearTimeout(debounce);
    };
  }, [profile, profileLoaded, session]);

  const copyShareLink = async () => {
    if (!profile.slug) {
      return;
    }

    const shareUrl = `${window.location.origin}/profile/${profile.slug}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopySuccess(true);
      window.setTimeout(() => setIsCopySuccess(false), 2500);
    } catch {
      setSaveError("Unable to copy share link. Please try again.");
    }
  };

  const saveProfile = async () => {
    if (!session || !profileLoaded) {
      return;
    }

    const preferredSlug = profile.slug?.trim() || createSlugFromName(profile.name, `freeagent-${session.user.id.slice(0, 8)}`);
    const uniqueSlug = await ensureUniqueSlug(preferredSlug, session.user.id);
    const profileToSave = { ...profile, slug: uniqueSlug };

    setIsSaving(true);
    setSaveError(null);
    setSaveStatus(null);

    const { error } = await supabase.from("profiles").upsert(
      [
        {
          user_id: session.user.id,
          account_type: "talent",
          ...buildCanonicalTalentColumns(profileToSave, session.user.email),
        },
      ] as never,
      {
        onConflict: "user_id",
        returning: "minimal",
      } as never,
    );

    setIsSaving(false);

    if (error) {
      setSaveError(error.message);
      return;
    }

    setProfile(profileToSave);
    setSaveStatus("Profile saved successfully.");
    window.setTimeout(() => setSaveStatus(null), 3000);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] px-4 py-8 text-[#071426] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-24">
          <div className="rounded-[32px] border border-[#cda64d]/70 bg-[#0f2744] px-8 py-12 text-center text-[#f7ebcf] shadow-[0_18px_55px_rgba(6,16,33,0.28)]">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">Loading profile</p>
            <p className="mt-4 text-lg font-semibold">Please wait while we load your profile.</p>
          </div>
        </div>
      </main>
    );
  }

  const updateTextField = (
    field: "slug" | "name" | "title" | "location" | "topStrength" | "availability" | "focusArea",
    value: string,
  ) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const updateExperienceField = (value: string) => {
    setProfile((current) => ({
      ...current,
      experienceYears: Number(value) || 0,
    }));
  };

  const createCareerPosition = (): CareerPosition => ({
    id: `journey-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role: "",
    company: "",
    period: "",
    location: "",
    description: "",
    achievements: [],
    skills: [],
  });

  const addSkill = () => {
    const trimmedSkill = skillInput.trim();

    if (!trimmedSkill) {
      return;
    }

    setProfile((current) => {
      const normalizedSkill = trimmedSkill.replace(/\s+/g, " ");
      const alreadyExists = current.skills.some(
        (skill) => skill.toLowerCase() === normalizedSkill.toLowerCase(),
      );

      if (alreadyExists) {
        setSkillInput("");
        return current;
      }

      return {
        ...current,
        skills: [...current.skills, normalizedSkill],
      };
    });
    setSkillInput("");
  };

  const removeSkill = (skillToRemove: string) => {
    setProfile((current) => ({
      ...current,
      skills: current.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  const addCareerPosition = () => {
    setProfile((current) => ({
      ...current,
      careerJourney: [...current.careerJourney, createCareerPosition()],
    }));
  };

  const removeCareerPosition = (positionId: string) => {
    setProfile((current) => ({
      ...current,
      careerJourney: current.careerJourney.filter((position) => position.id !== positionId),
    }));
  };

  const moveCareerPosition = (positionId: string, direction: -1 | 1) => {
    setProfile((current) => {
      const index = current.careerJourney.findIndex((position) => position.id === positionId);

      if (index < 0) {
        return current;
      }

      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= current.careerJourney.length) {
        return current;
      }

      const nextJourney = [...current.careerJourney];
      const [movedItem] = nextJourney.splice(index, 1);
      nextJourney.splice(targetIndex, 0, movedItem);

      return {
        ...current,
        careerJourney: nextJourney,
      };
    });
  };

  const updateCareerPosition = (positionId: string, field: "role" | "company" | "period" | "location" | "description", value: string) => {
    setProfile((current) => ({
      ...current,
      careerJourney: current.careerJourney.map((position) => (position.id === positionId ? { ...position, [field]: value } : position)),
    }));
  };

  const updateJourneyDraft = (positionId: string, kind: "achievement" | "skill", value: string) => {
    setJourneyDrafts((current) => ({
      ...current,
      [positionId]: {
        achievement: current[positionId]?.achievement ?? "",
        skill: current[positionId]?.skill ?? "",
        [kind]: value,
      },
    }));
  };

  const addCareerListItem = (positionId: string, kind: "achievement" | "skill") => {
    const draftValue = (journeyDrafts[positionId]?.[kind] ?? "").trim();

    if (!draftValue) {
      return;
    }

    setProfile((current) => ({
      ...current,
      careerJourney: current.careerJourney.map((position) => {
        if (position.id !== positionId) {
          return position;
        }

        const nextItems = kind === "achievement" ? [...position.achievements, draftValue] : [...position.skills, draftValue];
        return {
          ...position,
          [kind === "achievement" ? "achievements" : "skills"]: nextItems,
        };
      }),
    }));

    setJourneyDrafts((current) => ({
      ...current,
      [positionId]: {
        achievement: kind === "achievement" ? "" : current[positionId]?.achievement ?? "",
        skill: kind === "skill" ? "" : current[positionId]?.skill ?? "",
      },
    }));
  };

  const removeCareerListItem = (positionId: string, kind: "achievement" | "skill", valueToRemove: string) => {
    setProfile((current) => ({
      ...current,
      careerJourney: current.careerJourney.map((position) => {
        if (position.id !== positionId) {
          return position;
        }

        const nextItems = kind === "achievement" ? position.achievements.filter((item) => item !== valueToRemove) : position.skills.filter((item) => item !== valueToRemove);

        return {
          ...position,
          [kind === "achievement" ? "achievements" : "skills"]: nextItems,
        };
      }),
    }));
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] px-4 py-8 text-[#071426] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-start">
        <section className="w-full rounded-[32px] border border-[#cda64d]/70 bg-[#0f2744] p-6 text-[#f7ebcf] shadow-[0_18px_55px_rgba(6,16,33,0.28)] lg:w-[40%] lg:p-8">
          <div className="inline-flex items-center rounded-full border border-[#f2cc63]/40 bg-[#f7ebcf]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
            Builder Studio
          </div>
          <h1 className="mt-6 text-3xl font-black uppercase leading-tight tracking-[0.16em] text-[#f7ebcf] sm:text-4xl">
            Create Your FreeAgent Card
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#dfe7ef]">
            Edit your profile and watch your card update live.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              {saveStatus ? (
                <p className="text-sm font-semibold text-emerald-700">{saveStatus}</p>
              ) : null}
              {saveError ? (
                <p className="text-sm font-semibold text-rose-700">{saveError}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={saveProfile}
              disabled={isSaving || !profileLoaded}
              className="inline-flex items-center justify-center rounded-full bg-[#0f2744] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save profile"}
            </button>
          </div>

          <form
            className="mt-8 space-y-4 rounded-[24px] border border-[#f2cc63]/35 bg-[#f7ebcf] p-5 text-[#071426]"
            onSubmit={(event) => {
              event.preventDefault();
              saveProfile();
            }}
          >
            <div className="mt-4 rounded-[24px] border border-[#cda64d]/40 bg-[#f7ebcf]/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Public profile URL</p>
                <p className="mt-1 text-sm text-[#27405f]">Save your profile and share it with employers or collaborators.</p>
              </div>
              <button
                type="button"
                onClick={copyShareLink}
                disabled={!profile.slug}
                className="rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCopySuccess ? "Copied!" : "Copy share link"}
              </button>
            </div>
            <div className="mt-3 rounded-2xl border border-[#0f2744]/20 bg-white/90 px-4 py-3 text-sm text-[#071426]">
              {profile.slug ? `${window.location.origin}/profile/${profile.slug}` : "Save your profile to generate a shareable link."}
            </div>
          </div>

          <div className="mt-6">
            <VideoIntroductionSection
              profile={profile}
              onProfileChange={(nextProfile) => setProfile(nextProfile)}
              isSaving={isSaving}
              visibility={profile.visibility}
            />
          </div>

          <div className="space-y-2">
              <label htmlFor="name" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Name
              </label>
              <input
                id="name"
                value={profile.name}
                onChange={(event) => updateTextField("name", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none ring-0 transition focus:border-[#0f2744]"
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="slug" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Public profile slug
              </label>
              <input
                id="slug"
                value={profile.slug ?? ""}
                onChange={(event) => updateTextField("slug", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none ring-0 transition focus:border-[#0f2744]"
                placeholder="Enter a short URL slug"
              />
              <p className="text-xs text-[#dfe7ef]">
                A slug is used for your public profile URL: /profile/<span className="font-mono">{profile.slug ?? "your-slug"}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="title" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Professional Title
              </label>
              <input
                id="title"
                value={profile.title}
                onChange={(event) => updateTextField("title", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                placeholder="Enter your role"
              />
            </div>

            <div className="space-y-2 rounded-2xl border border-[#cda64d]/35 bg-white/70 px-4 py-4 text-sm text-[#27405f]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Privacy & visibility</p>
              <p>
                Marketplace visibility, publish state, and blocked companies are now managed from Privacy & Visibility so the canonical access-control settings stay in one place.
              </p>
              <Link
                href="/settings/privacy"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
              >
                Open privacy settings
              </Link>
            </div>

            <div className="space-y-2">
              <label htmlFor="location" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Location
              </label>
              <input
                id="location"
                value={profile.location}
                onChange={(event) => updateTextField("location", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                placeholder="Enter your location"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="availability" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Availability
              </label>
              <select
                id="availability"
                value={profile.availability}
                onChange={(event) => updateTextField("availability", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
              >
                <option value="Available Now">Available Now</option>
                <option value="Open to new projects">Open to Opportunities</option>
                <option value="Booked">Booked</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="topStrength" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Top Strength
              </label>
              <input
                id="topStrength"
                value={profile.topStrength}
                onChange={(event) => updateTextField("topStrength", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                placeholder="Enter your signature strength"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="experienceYears" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Years of Experience
              </label>
              <input
                id="experienceYears"
                type="number"
                min="0"
                value={profile.experienceYears}
                onChange={(event) => updateExperienceField(event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="focusArea" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Focus Area
              </label>
              <input
                id="focusArea"
                value={profile.focusArea}
                onChange={(event) => updateTextField("focusArea", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                placeholder="Enter your focus area"
              />
            </div>

            <div className="space-y-3 rounded-[20px] border border-[#cda64d]/40 bg-white/70 p-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                  Skills
                </p>
                <p className="mt-1 text-sm text-[#27405f]">
                  Build a skill set that appears on the card.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={skillInput}
                  onChange={(event) => setSkillInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addSkill();
                    }
                  }}
                  className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                  placeholder="Type a skill..."
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
                >
                  Add
                </button>
              </div>

              {profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="inline-flex items-center gap-2 rounded-full border border-[#f2cc63]/70 bg-[#0f2744] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#f2cc63] hover:bg-[#17355f] hover:shadow-[0_8px_16px_rgba(7,20,38,0.16)]"
                    >
                      <span>{skill}</span>
                      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#f2cc63]/40 bg-[#f7ebcf]/10 text-[10px] leading-none text-[#f7ebcf]">
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-[20px] border border-[#cda64d]/40 bg-white/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                    Career Journey
                  </p>
                  <p className="mt-1 text-sm text-[#27405f]">
                    Shape a rich timeline with multiple roles, achievements and skills.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addCareerPosition}
                  className="rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
                >
                  Add role
                </button>
              </div>

              <div className="space-y-3">
                {profile.careerJourney.map((position, index) => {
                  const draft = journeyDrafts[position.id] ?? { achievement: "", skill: "" };

                  return (
                    <div key={position.id} className="rounded-[24px] border border-[#cda64d]/40 bg-[#f7ebcf] p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                            Position {index + 1}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#0f2744]">
                            {position.role || "New position"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => moveCareerPosition(position.id, -1)}
                            className="rounded-full border border-[#cda64d]/40 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0f2744]"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCareerPosition(position.id, 1)}
                            className="rounded-full border border-[#cda64d]/40 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0f2744]"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCareerPosition(position.id)}
                            className="rounded-full border border-[#cda64d]/40 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0f2744]"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                            Role
                          </label>
                          <input
                            value={position.role}
                            onChange={(event) => updateCareerPosition(position.id, "role", event.target.value)}
                            className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-3 py-2.5 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]"
                            placeholder="e.g. Lead Product Designer"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                            Company
                          </label>
                          <input
                            value={position.company}
                            onChange={(event) => updateCareerPosition(position.id, "company", event.target.value)}
                            className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-3 py-2.5 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]"
                            placeholder="e.g. Northstar Labs"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                            Period
                          </label>
                          <input
                            value={position.period}
                            onChange={(event) => updateCareerPosition(position.id, "period", event.target.value)}
                            className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-3 py-2.5 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]"
                            placeholder="e.g. 2022 — Present"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                            Location
                          </label>
                          <input
                            value={position.location}
                            onChange={(event) => updateCareerPosition(position.id, "location", event.target.value)}
                            className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-3 py-2.5 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]"
                            placeholder="e.g. London, UK"
                          />
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                          Description
                        </label>
                        <textarea
                          value={position.description}
                          onChange={(event) => updateCareerPosition(position.id, "description", event.target.value)}
                          rows={4}
                          className="min-h-[110px] w-full rounded-[20px] border border-[#cda64d]/50 bg-white/80 px-3 py-2.5 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]"
                          placeholder="Describe the role, scope and impact in a professional way."
                        />
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="space-y-3 rounded-[20px] border border-[#cda64d]/35 bg-white/70 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                              Achievements
                            </p>
                            <span className="text-[11px] text-[#27405f]">{position.achievements.length}</span>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              value={draft.achievement}
                              onChange={(event) => updateJourneyDraft(position.id, "achievement", event.target.value)}
                              className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-3 py-2 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]"
                              placeholder="Add an achievement"
                            />
                            <button
                              type="button"
                              onClick={() => addCareerListItem(position.id, "achievement")}
                              className="rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {position.achievements.map((item) => (
                              <button
                                key={`${position.id}-${item}`}
                                type="button"
                                onClick={() => removeCareerListItem(position.id, "achievement", item)}
                                className="inline-flex items-center gap-2 rounded-full border border-[#f2cc63]/70 bg-[#0f2744] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]"
                              >
                                <span>{item}</span>
                                <span className="text-[#f7ebcf]">×</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 rounded-[20px] border border-[#cda64d]/35 bg-white/70 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                              Skills used
                            </p>
                            <span className="text-[11px] text-[#27405f]">{position.skills.length}</span>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              value={draft.skill}
                              onChange={(event) => updateJourneyDraft(position.id, "skill", event.target.value)}
                              className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-3 py-2 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]"
                              placeholder="Add a skill"
                            />
                            <button
                              type="button"
                              onClick={() => addCareerListItem(position.id, "skill")}
                              className="rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {position.skills.map((item) => (
                              <button
                                key={`${position.id}-${item}`}
                                type="button"
                                onClick={() => removeCareerListItem(position.id, "skill", item)}
                                className="inline-flex items-center gap-2 rounded-full border border-[#f2cc63]/70 bg-[#0f2744] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]"
                              >
                                <span>{item}</span>
                                <span className="text-[#f7ebcf]">×</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </form>
        </section>

        <section className="flex w-full items-center justify-center rounded-[32px] border border-[#cda64d]/70 bg-[#f7ebcf]/70 p-4 shadow-[0_18px_55px_rgba(6,16,33,0.16)] lg:w-[60%] lg:min-h-[700px] lg:p-8">
          <div className="flex w-full max-w-[980px] flex-col gap-6">
            <div className="flex justify-center">
              <FreeAgentCard profile={profile} className="w-full max-w-[430px]" />
            </div>

            <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#0f2744] p-6 text-[#f7ebcf] shadow-[0_12px_40px_rgba(6,16,33,0.2)] sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                    Live career journey
                  </p>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.16em] text-[#f7ebcf]">
                    Premium timeline preview
                  </h2>
                </div>
                <div className="rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-3 py-2 text-sm font-semibold text-[#f7ebcf]">
                  {profile.careerJourney.length} positions
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {profile.careerJourney.length > 0 ? (
                  profile.careerJourney.map((position, index) => (
                    <div key={position.id} className="rounded-[24px] border border-[#f2cc63]/25 bg-[#f7ebcf]/10 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                            {position.period || "Timeline entry"}
                          </p>
                          <h3 className="mt-2 text-xl font-semibold text-[#f7ebcf]">
                            {position.role || "New role"}
                          </h3>
                          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-[#f2cc63]">
                            {position.company || "Company"} · {position.location || "Location"}
                          </p>
                        </div>
                        <div className="rounded-full border border-[#f2cc63]/35 bg-[#0f2744] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf]">
                          {index + 1}
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-[#dfe7ef]">
                        {position.description || "Add a rich description to tell the story behind this role."}
                      </p>

                      {position.achievements.length > 0 ? (
                        <div className="mt-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f2cc63]">
                            Achievements
                          </p>
                          <ul className="mt-2 space-y-2 text-sm leading-7 text-[#dfe7ef]">
                            {position.achievements.map((achievement) => (
                              <li key={achievement} className="flex gap-2">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f2cc63]" />
                                <span>{achievement}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {position.skills.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {position.skills.map((skill) => (
                            <span key={skill} className="rounded-full border border-[#f2cc63]/70 bg-[#0f2744] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]">
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[#f2cc63]/35 bg-[#f7ebcf]/10 p-6 text-center text-sm text-[#dfe7ef]">
                    Add your first role to start building a compelling timeline.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
