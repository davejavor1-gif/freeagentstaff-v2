"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import TalentCard from "@/components/TalentCard";
import { freeAgentProfiles } from "@/data/freeagents";
import { buildCanonicalTalentColumns } from "@/lib/talent-profile-columns";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import VideoIntroductionSection from "@/components/settings/VideoIntroductionSection";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { salaryExpectationOptions } from "@/lib/talent-profile-options";
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
  bio?: string | null;
  skills?: string[] | null;
  career_journey?: Json;
  email?: string | null;
  image_alt?: string | null;
  current_employer?: string | null;
  intro_video_url?: string | null;
  photo_url?: string | null;
  photo_storage_path?: string | null;
  intro_video_storage_path?: string | null;
  education?: string | null;
  salary_expectation?: FreeAgentProfile["salaryExpectation"];
  contact_email?: string | null;
  resume_storage_path?: string | null;
  resume_original_filename?: string | null;
  resume_uploaded_at?: string | null;
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
  loadedProfile.education = profileResult.education ?? loadedProfile.education ?? "";
  loadedProfile.salaryExpectation = profileResult.salary_expectation ?? loadedProfile.salaryExpectation ?? null;
  loadedProfile.contactEmail = profileResult.contact_email ?? loadedProfile.contactEmail ?? fallbackEmail ?? "";
  loadedProfile.resumeStoragePath = profileResult.resume_storage_path ?? loadedProfile.resumeStoragePath ?? null;
  loadedProfile.resumeOriginalFilename = profileResult.resume_original_filename ?? loadedProfile.resumeOriginalFilename ?? null;
  loadedProfile.resumeUploadedAt = profileResult.resume_uploaded_at ?? loadedProfile.resumeUploadedAt ?? null;
  loadedProfile.summary = profileResult.summary ?? loadedProfile.summary ?? "";
  loadedProfile.bio = profileResult.bio ?? loadedProfile.bio ?? "";
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

const createBlankProfile = (userId: string, email?: string | null): FreeAgentProfile => ({
  id: `freeagent-${userId.slice(0, 8)}`,
  visibility: "public",
  name: "",
  title: "",
  location: "",
  availability: "Available Now",
  topStrength: "",
  experienceYears: 0,
  focusArea: "",
  education: "",
  salaryExpectation: null,
  contactEmail: email ?? "",
  resumeStoragePath: null,
  resumeOriginalFilename: null,
  resumeUploadedAt: null,
  summary: "",
  bio: "",
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
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
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
        .select("slug, profile, account_type, visibility, opportunity_status, name, title, location, availability, top_strength, experience_years, focus_area, education, salary_expectation, contact_email, resume_storage_path, resume_original_filename, resume_uploaded_at, summary, bio, skills, career_journey, email, image_alt, current_employer, intro_video_url, photo_url, photo_storage_path, intro_video_storage_path")
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

        const { data: insertedProfile } = await supabase.from("profiles").select("slug").eq("user_id", supabaseSession.user.id).maybeSingle<{ slug: string | null }>();
        setProfile({ ...blankProfile, slug: insertedProfile?.slug ?? undefined });
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
      if (profile.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contactEmail.trim())) {
        return;
      }

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

    setIsSaving(true);
    setSaveError(null);
    setSaveStatus(null);

    if (profile.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contactEmail.trim())) {
      setSaveError("Enter a valid contact email address.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert(
      [
        {
          user_id: session.user.id,
          account_type: "talent",
          ...buildCanonicalTalentColumns(profile, session.user.email),
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

    const { data: savedProfile } = await supabase.from("profiles").select("slug").eq("user_id", session.user.id).maybeSingle<{ slug: string | null }>();
    setProfile((current: FreeAgentProfile) => ({ ...current, slug: savedProfile?.slug ?? current.slug }));
    setSaveStatus("Profile saved successfully.");
    window.setTimeout(() => setSaveStatus(null), 3000);
  };

  const uploadResume = async (file: File) => {
    if (!session) return;
    setResumeBusy(true);
    setResumeError(null);
    const formData = new FormData();
    formData.append("resume", file);
    const response = await fetch("/api/profile/resume", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; resume?: { storagePath: string; originalFilename: string; uploadedAt: string } } | null;
    if (!response.ok || !result?.ok || !result.resume) {
      setResumeError(result?.message ?? "Unable to upload the resume.");
    } else {
      setProfile((current) => ({ ...current, resumeStoragePath: result.resume?.storagePath ?? null, resumeOriginalFilename: result.resume?.originalFilename ?? null, resumeUploadedAt: result.resume?.uploadedAt ?? null }));
    }
    setResumeBusy(false);
  };

  const removeResume = async () => {
    if (!session) return;
    setResumeBusy(true);
    setResumeError(null);
    const response = await fetch("/api/profile/resume", { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!response.ok || !result?.ok) {
      setResumeError(result?.message ?? "Unable to remove the resume.");
    } else {
      setProfile((current) => ({ ...current, resumeStoragePath: null, resumeOriginalFilename: null, resumeUploadedAt: null }));
    }
    setResumeBusy(false);
  };

  if (isLoading) {
    return (
      <><Navbar /><main className="min-h-screen bg-[#aff546] px-4 py-8 text-[#0f2744] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-24">
          <div className="rounded-[32px] border border-[#cda64d]/70 bg-[#0f2744] px-8 py-12 text-center text-[#f7ebcf] shadow-[0_18px_55px_rgba(6,16,33,0.28)]">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">Loading profile</p>
            <p className="mt-4 text-lg font-semibold">Please wait while we load your profile.</p>
          </div>
        </div>
      </main><Footer /></>
    );
  }

  const updateTextField = (
    field: "name" | "title" | "location" | "topStrength" | "availability" | "focusArea" | "education" | "salaryExpectation" | "contactEmail" | "bio",
    value: string,
  ) => {
    setProfile((current) => ({ ...current, [field]: value }));
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
    <><Navbar /><main className="min-h-screen bg-[#aff546] px-4 py-8 text-[#0f2744] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-start">
        <section className="w-full rounded-[32px] border border-[#cda64d]/70 bg-[#0f2744] p-6 text-[#f7ebcf] shadow-[0_18px_55px_rgba(6,16,33,0.28)] lg:w-[62%] lg:p-8">
          <div className="inline-flex items-center rounded-full border border-[#f2cc63]/40 bg-[#f7ebcf]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
            Builder Studio
          </div>
          <h1 className="mt-6 text-3xl font-black uppercase leading-tight tracking-[0.16em] text-[#f7ebcf] sm:text-4xl">
            Create Your FreeAgent Card
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#dfe7ef]">
            Edit your profile and watch your card update live.
          </p>
          <div className="mt-5 max-w-2xl space-y-3 text-sm leading-6 text-[#dfe7ef]">
            <p>Build your Talent Card and Passport by adding the information employers need to understand who you are, what you do, and what you&apos;re looking for.</p>
            <p className="font-semibold text-[#f7ebcf]">Complete each section below to:</p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              <li>• add your photo and video introduction</li>
              <li>• highlight your skills, education and strengths</li>
              <li>• set your availability and salary expectations</li>
              <li>• upload your resume</li>
              <li>• control how your profile appears to employers</li>
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#8fdc3a]/35 bg-[#17355f] p-3 sm:flex-row sm:items-center sm:justify-between">
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
              className="inline-flex items-center justify-center rounded-full bg-[#aff546] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#071426] transition hover:bg-[#9fea37] disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="mt-4 rounded-[24px] border border-[#0f2744]/15 border-t-4 border-t-[#2bd7ef] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]">
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
            <div className="mt-3 flex min-w-0 items-center gap-1 rounded-2xl border border-[#0f2744]/20 bg-white/90 px-4 py-3 text-sm text-[#071426]">
              {profile.slug ? <><span className="shrink-0 text-[#6a7a91]">/profile/</span><span className="min-w-0 break-all font-semibold">{profile.slug}</span></> : "Save your profile to generate a shareable link."}
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-[#0f2744]/15 border-t-4 border-t-[#4f9f4e] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]">
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

            <div className="space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#4f9f4e] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]">
              <label htmlFor="bio" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Bio <span className="font-normal normal-case tracking-normal text-[#6a7a91]">(optional)</span>
              </label>
              <p className="text-sm leading-6 text-[#27405f]">Introduce yourself in a few sentences. Share your professional background, what you enjoy doing and what you&apos;re looking for next.</p>
              <textarea
                id="bio"
                maxLength={750}
                value={profile.bio ?? ""}
                onChange={(event) => updateTextField("bio", event.target.value)}
                className="min-h-[120px] w-full resize-y rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                placeholder="Tell employers a little about your professional background..."
              />
              <p className="text-right text-xs text-[#6a7a91]">{(profile.bio ?? "").length}/750</p>
            </div>

            <div className="space-y-2 rounded-2xl border border-[#0f2744]/15 border-t-4 border-t-[#2bd7ef] bg-[#fffaf0] px-4 py-4 text-sm text-[#27405f] shadow-[0_10px_24px_rgba(7,20,38,0.08)]">
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

            <div className="space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#cda64d] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]">
              <label htmlFor="education" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Education <span className="font-normal normal-case tracking-normal text-[#6a7a91]">(optional)</span>
              </label>
              <textarea
                id="education"
                value={profile.education ?? ""}
                onChange={(event) => updateTextField("education", event.target.value)}
                className="min-h-24 w-full resize-y rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                placeholder="Bachelor of Business - UTS"
              />
            </div>

            <div className="space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#2bd7ef] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]">
              <label htmlFor="salaryExpectation" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Salary expectations <span className="font-normal normal-case tracking-normal text-[#6a7a91]">(optional)</span>
              </label>
              <select
                id="salaryExpectation"
                value={profile.salaryExpectation ?? ""}
                onChange={(event) => updateTextField("salaryExpectation", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
              >
                <option value="">Select a broad salary band</option>
                {salaryExpectationOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#4f9f4e] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Contact details</p>
                <p className="mt-1 text-sm text-[#27405f]">This stays private until you choose to connect with an employer.</p>
              </div>
              <label htmlFor="contactEmail" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Contact email</label>
              <input
                id="contactEmail"
                type="email"
                value={profile.contactEmail ?? ""}
                onChange={(event) => updateTextField("contactEmail", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#cda64d] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Resume</p>
                <p className="mt-1 text-sm text-[#27405f]">Private PDF, DOC, or DOCX files up to 10 MB.</p>
              </div>
              {profile.resumeOriginalFilename ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-[#cda64d]/35 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="min-w-0 break-all text-sm font-semibold text-[#0f2744]">{profile.resumeOriginalFilename}</p>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]">
                      Replace resume
                      <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" disabled={resumeBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadResume(file); event.target.value = ""; }} />
                    </label>
                    <button type="button" onClick={() => void removeResume()} disabled={resumeBusy} className="min-h-[44px] rounded-full border border-rose-900/20 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-900 disabled:opacity-50">Remove</button>
                  </div>
                </div>
              ) : (
                <label className="inline-flex min-h-[46px] w-full cursor-pointer items-center justify-center rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]">
                  {resumeBusy ? "Uploading..." : "Upload resume"}
                  <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" disabled={resumeBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadResume(file); event.target.value = ""; }} />
                </label>
              )}
              {resumeError ? <p className="text-sm font-semibold text-rose-700">{resumeError}</p> : null}
            </div>

            <div className="space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#2bd7ef] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]">
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

            <div className="space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#cda64d] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]">
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

        <section className="flex w-full items-center justify-center rounded-[32px] border border-[#cda64d]/70 bg-[#f7ebcf] p-4 shadow-[0_12px_32px_rgba(6,16,33,0.12)] lg:w-[38%] lg:min-h-[700px] lg:p-5">
          <div className="flex w-full max-w-[430px] flex-col">
            <div className="flex justify-center">
              <TalentCard profile={profile} href={profile.slug ? `/profile/${profile.slug}` : "#"} className="w-full max-w-[430px]" />
            </div>
          </div>
        </section>
      </div>
    </main><Footer /></>
  );
}
