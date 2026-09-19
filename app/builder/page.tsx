"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import TalentCard from "@/components/TalentCard";
import { freeAgentProfiles } from "@/data/freeagents";
import { buildCanonicalTalentColumns, buildTalentProfileUpdateColumns } from "@/lib/talent-profile-columns";
import { accountHomePath, resolveAccountIdentity } from "@/lib/account-identity";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import VideoIntroductionSection from "@/components/settings/VideoIntroductionSection";
import Footer from "@/components/layout/Footer";
import { availabilityToOpportunityStatus, normalizeAvailability, salaryExpectationOptions } from "@/lib/talent-profile-options";
import { hasTalentProAccess, normalizeTalentSubscriptionSnapshot } from "@/lib/talent-subscription";
import type { AccountType, CareerPosition, EducationEntry, FreeAgentProfile, ProfileVisibility } from "@/types/freeagent";
import type { Database, Json } from "@/types/supabase";

const initialProfile = freeAgentProfiles[0];

function RockstarStarIcon({ checked }: { checked: boolean }) {
  const fill = checked ? "#AFF546" : "#f7ebcf";
  const stroke = checked ? "#1F3D0A" : "#4C8C15";

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="h-10 w-10 shrink-0">
      <g stroke={stroke} strokeWidth="1.4" strokeLinecap="round" className={checked ? "opacity-100" : "opacity-0"}>
        <line x1="6" y1="6" x2="7.7" y2="7.7" />
        <line x1="26" y1="6" x2="24.3" y2="7.7" />
      </g>
      <path
        d="M16 5l3.09 6.26 6.91.99-5 4.87 1.18 6.88L16 20.9l-6.18 3.1L11 17.12l-5-4.87 6.91-.99L16 5z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DestinationPill({ tone, label }: { tone: "card" | "passport"; label: string }) {
  if (label.includes("Card + Passport")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <span className="inline-flex items-center rounded-full bg-[#AFF546] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#08111F]">Card</span>
        <span className="inline-flex items-center rounded-full bg-[#651D2A] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#f7ebcf]">Passport</span>
      </span>
    );
  }

  const toneClasses =
    tone === "card" ? "bg-[#AFF546] text-[#08111F]" : "bg-[#651D2A] text-[#f7ebcf]";

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${toneClasses}`}
    >
      {label}
    </span>
  );
}

type BuilderSectionId = "basic" | "availability" | "skills" | "experience" | "education" | "media" | "languages" | "details" | "privacy" | "preview";

const builderSections: Array<{ id: BuilderSectionId; label: string; shortLabel: string; eyebrow: "card" | "passport" | "both" }> = [
  { id: "basic", label: "Basic Information", shortLabel: "Basic Info", eyebrow: "both" },
  { id: "availability", label: "Availability", shortLabel: "Availability", eyebrow: "both" },
  { id: "skills", label: "Skills", shortLabel: "Skills", eyebrow: "both" },
  { id: "experience", label: "Experience", shortLabel: "Experience", eyebrow: "both" },
  { id: "education", label: "Education", shortLabel: "Education", eyebrow: "both" },
  { id: "media", label: "Media", shortLabel: "Media", eyebrow: "passport" },
  { id: "languages", label: "Languages & Passions", shortLabel: "Languages & Passions", eyebrow: "passport" },
  { id: "details", label: "Professional Details", shortLabel: "Professional Details", eyebrow: "passport" },
  { id: "privacy", label: "Privacy & Visibility", shortLabel: "Privacy", eyebrow: "both" },
  { id: "preview", label: "Talent Card Preview", shortLabel: "Talent Card Preview", eyebrow: "card" },
];

const meaningfulBuilderSections = builderSections.filter((section) => section.id !== "preview");

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
  rockstar_available?: boolean | null;
  top_strength?: string | null;
  experience_years?: number | null;
  focus_area?: string | null;
  summary?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  languages?: string[] | null;
  passions?: string[] | null;
  career_journey?: Json;
  email?: string | null;
  image_alt?: string | null;
  current_employer?: string | null;
  intro_video_url?: string | null;
  photo_url?: string | null;
  photo_storage_path?: string | null;
  intro_video_storage_path?: string | null;
  education?: string | null;
  education_entries?: Json;
  salary_expectation?: FreeAgentProfile["salaryExpectation"];
  contact_email?: string | null;
  mobile_number?: string | null;
  resume_storage_path?: string | null;
  resume_original_filename?: string | null;
  resume_uploaded_at?: string | null;
  talent_plan?: "free_agent" | "free_agent_pro" | null;
  talent_subscription_status?: "inactive" | "active" | "trialing" | "past_due" | "canceled" | null;
  talent_subscription_current_period_ends_at?: string | null;
  is_published?: boolean | null;
};

const normalizeVisibility = (value: ProfileVisibility | null | undefined): Exclude<ProfileVisibility, "employer_network"> => {
  if (value === "verified_employer_network" || value === "confidential" || value === "public") {
    return value;
  }

  return "public";
};

function toEducationEntries(value: Json | null | undefined): EducationEntry[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index): EducationEntry[] => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const candidate = entry as Record<string, Json>;
      return [{
        id: typeof candidate.id === "string" ? candidate.id : `education-${index + 1}`,
        qualification: typeof candidate.qualification === "string" ? candidate.qualification : "",
        institution: typeof candidate.institution === "string" ? candidate.institution : "",
      }];
    });
  }

  return [];
}

function hydrateBuilderProfile(profileResult: ProfileSelectResult, fallbackEmail?: string | null): FreeAgentProfile {
  const loadedProfile = profileResult.profile as unknown as FreeAgentProfile;

  loadedProfile.slug = profileResult.slug ?? loadedProfile.slug;
  loadedProfile.visibility = normalizeVisibility(profileResult.visibility ?? loadedProfile.visibility);
  loadedProfile.name = profileResult.name ?? loadedProfile.name ?? "";
  loadedProfile.title = profileResult.title ?? loadedProfile.title ?? "";
  loadedProfile.location = profileResult.location ?? loadedProfile.location ?? "";
  loadedProfile.availability = normalizeAvailability(profileResult.availability ?? loadedProfile.availability, profileResult.opportunity_status ?? loadedProfile.opportunityStatus);
  loadedProfile.opportunityStatus = availabilityToOpportunityStatus(loadedProfile.availability);
  loadedProfile.rockstarAvailable = profileResult.rockstar_available ?? loadedProfile.rockstarAvailable ?? false;
  loadedProfile.topStrength = profileResult.top_strength ?? loadedProfile.topStrength ?? "";
  loadedProfile.experienceYears = profileResult.experience_years ?? loadedProfile.experienceYears ?? 0;
  loadedProfile.focusArea = profileResult.focus_area ?? loadedProfile.focusArea ?? "";
  loadedProfile.education = profileResult.education ?? loadedProfile.education ?? "";
  loadedProfile.educationEntries = toEducationEntries(profileResult.education_entries);
  loadedProfile.salaryExpectation = profileResult.salary_expectation ?? loadedProfile.salaryExpectation ?? null;
  loadedProfile.contactEmail = profileResult.contact_email ?? loadedProfile.contactEmail ?? fallbackEmail ?? "";
  loadedProfile.mobileNumber = profileResult.mobile_number ?? loadedProfile.mobileNumber ?? "";
  loadedProfile.resumeStoragePath = profileResult.resume_storage_path ?? loadedProfile.resumeStoragePath ?? null;
  loadedProfile.resumeOriginalFilename = profileResult.resume_original_filename ?? loadedProfile.resumeOriginalFilename ?? null;
  loadedProfile.resumeUploadedAt = profileResult.resume_uploaded_at ?? loadedProfile.resumeUploadedAt ?? null;
  loadedProfile.summary = profileResult.summary ?? loadedProfile.summary ?? "";
  loadedProfile.bio = profileResult.bio ?? loadedProfile.bio ?? "";
  loadedProfile.skills = profileResult.skills ?? loadedProfile.skills ?? [];
  loadedProfile.languages = profileResult.languages ?? loadedProfile.languages ?? [];
  loadedProfile.passions = profileResult.passions ?? loadedProfile.passions ?? [];
  loadedProfile.careerJourney = Array.isArray(profileResult.career_journey)
    ? (profileResult.career_journey as unknown as FreeAgentProfile["careerJourney"])
    : (loadedProfile.careerJourney ?? []);
  loadedProfile.email = profileResult.email ?? loadedProfile.email ?? fallbackEmail ?? "";
  loadedProfile.imageAlt = profileResult.image_alt ?? loadedProfile.imageAlt ?? "";
  loadedProfile.currentEmployer = profileResult.current_employer ?? loadedProfile.currentEmployer;
  loadedProfile.photoUrl = profileResult.photo_storage_path ? undefined : (profileResult.photo_url ?? loadedProfile.photoUrl ?? undefined);
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
  rockstarAvailable: false,
  topStrength: "",
  experienceYears: 0,
  focusArea: "",
  education: "",
  educationEntries: [],
  salaryExpectation: null,
  contactEmail: email ?? "",
  resumeStoragePath: null,
  resumeOriginalFilename: null,
  resumeUploadedAt: null,
  summary: "",
  bio: "",
  skills: [],
  languages: [],
  passions: [],
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
  const [activeSection, setActiveSection] = useState<BuilderSectionId>("basic");
  const [profile, setProfile] = useState<FreeAgentProfile>({
    ...initialProfile,
    name: initialProfile.name,
    title: initialProfile.title,
    location: initialProfile.location,
  });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [hasProAccess, setHasProAccess] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [languageInput, setLanguageInput] = useState("");
  const [passionInput, setPassionInput] = useState("");
  const lastSavedAvailabilityRef = useRef<string | null>(null);
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
        .select("slug, profile, account_type, visibility, opportunity_status, is_published, name, title, location, availability, rockstar_available, top_strength, experience_years, focus_area, education, education_entries, salary_expectation, contact_email, mobile_number, resume_storage_path, resume_original_filename, resume_uploaded_at, summary, bio, skills, languages, passions, career_journey, email, image_alt, current_employer, intro_video_url, photo_url, photo_storage_path, intro_video_storage_path, talent_plan, talent_subscription_status, talent_subscription_current_period_ends_at")
        .eq("user_id", supabaseSession.user.id)
        .maybeSingle();

      if (!mounted) {
        return;
      }

      if (error) {
        setSaveError("We couldn't load your profile right now. Please try again.");
        setIsLoading(false);
        return;
      }

      const profileResult = data && typeof data === "object" && "account_type" in data
        ? data as ProfileSelectResult
        : null;
      const identity = resolveAccountIdentity({
        profileExists: Boolean(profileResult),
        profileAccountType: profileResult?.account_type,
        metadataAccountType: supabaseSession.user.user_metadata?.account_type,
      });

      if (identity.status !== "resolved" || identity.accountType !== "talent") {
        if (identity.status === "resolved") {
          router.replace(accountHomePath(identity.accountType));
          return;
        }

        router.replace("/dashboard");
        return;
      }

      if (profileResult) {
        const hydratedProfile = hydrateBuilderProfile(profileResult, supabaseSession.user.email);
        lastSavedAvailabilityRef.current = normalizeAvailability(hydratedProfile.availability, profileResult.opportunity_status);
        setProfile(hydratedProfile);
        setIsPublished(profileResult.is_published === true);
        const subscription = normalizeTalentSubscriptionSnapshot({
          plan: profileResult.talent_plan,
          status: profileResult.talent_subscription_status,
          currentPeriodEndsAt: profileResult.talent_subscription_current_period_ends_at,
        });
        setHasProAccess(hasTalentProAccess(subscription));
      } else {
        const blankProfile = createBlankProfile(supabaseSession.user.id, supabaseSession.user.email);
        const insertPayload: ProfileInsert = {
          user_id: supabaseSession.user.id,
          account_type: "talent",
          ...buildCanonicalTalentColumns(blankProfile, supabaseSession.user.email),
        };
        const { error: insertError } = await supabase.from("profiles").upsert([insertPayload] as never, { onConflict: "user_id" } as never);

        if (!mounted) {
          return;
        }

        if (insertError) {
          setSaveError("We couldn't create your profile right now. Please try again.");
          setIsLoading(false);
          return;
        }

        const { data: insertedProfile } = await supabase.from("profiles").select("slug").eq("user_id", supabaseSession.user.id).maybeSingle<{ slug: string | null }>();
        lastSavedAvailabilityRef.current = normalizeAvailability(blankProfile.availability, blankProfile.opportunityStatus);
        setProfile({ ...blankProfile, slug: insertedProfile?.slug ?? undefined });
        setHasProAccess(false);
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

  const updateCanonicalAvailability = useCallback(async (nextProfile: FreeAgentProfile, nextPublishedState = isPublished): Promise<boolean> => {
    if (!session?.access_token) {
      return false;
    }

    const response = await fetch("/api/talent/privacy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visibility: nextProfile.visibility,
        opportunityStatus: nextProfile.availability,
        isPublished: nextPublishedState,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      settings?: { visibility?: ProfileVisibility; opportunityStatus?: FreeAgentProfile["availability"] };
    } | null;

    if (!response.ok || !payload?.ok || !payload.settings) {
      setSaveError(payload?.message ?? "Unable to save availability.");
      return false;
    }

    const savedAvailability = normalizeAvailability(payload.settings.opportunityStatus ?? nextProfile.availability);
    lastSavedAvailabilityRef.current = savedAvailability;
    setProfile((current) => ({
      ...current,
      availability: savedAvailability,
      opportunityStatus: availabilityToOpportunityStatus(savedAvailability),
      visibility: payload.settings?.visibility ?? current.visibility,
    }));
    return true;
  }, [isPublished, session]);

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
        ...buildTalentProfileUpdateColumns(profile, session.user.email),
      };

      const { error } = await supabase.from("profiles").upsert([upsertPayload] as never, {
        onConflict: "user_id",
        returning: "minimal",
      } as never);

      if (error) {
        setSaveError("We couldn't save your profile. Please try again.");
        return;
      }

      const nextAvailability = normalizeAvailability(profile.availability, profile.opportunityStatus);
      if (nextAvailability !== lastSavedAvailabilityRef.current) {
        await updateCanonicalAvailability({ ...profile, availability: nextAvailability });
      }
    }, 700);

    return () => {
      window.clearTimeout(debounce);
    };
  }, [profile, profileLoaded, session, updateCanonicalAvailability]);

  const saveProfile = async (): Promise<boolean> => {
    if (!session || !profileLoaded) {
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveStatus(null);

    if (profile.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contactEmail.trim())) {
      setSaveError("Enter a valid contact email address.");
      setIsSaving(false);
      return false;
    }

    const { error } = await supabase.from("profiles").upsert(
      [
        {
          user_id: session.user.id,
          account_type: "talent",
          ...buildTalentProfileUpdateColumns(profile, session.user.email),
        },
      ] as never,
      {
        onConflict: "user_id",
        returning: "minimal",
      } as never,
    );

    if (error) {
      setIsSaving(false);
      setSaveError("We couldn't save your profile. Please try again.");
      return false;
    }

    const nextAvailability = normalizeAvailability(profile.availability, profile.opportunityStatus);
    if (nextAvailability !== lastSavedAvailabilityRef.current) {
      const availabilitySaved = await updateCanonicalAvailability({ ...profile, availability: nextAvailability });
      if (!availabilitySaved) {
        setIsSaving(false);
        return false;
      }
    }

    const { data: savedProfile } = await supabase.from("profiles").select("slug, availability, opportunity_status").eq("user_id", session.user.id).maybeSingle<{ slug: string | null; availability: string | null; opportunity_status: string | null }>();
    if (savedProfile) {
      const savedAvailability = normalizeAvailability(savedProfile.availability, savedProfile.opportunity_status);
      lastSavedAvailabilityRef.current = savedAvailability;
      setProfile((current: FreeAgentProfile) => ({
        ...current,
        slug: savedProfile.slug ?? current.slug,
        availability: savedAvailability,
        opportunityStatus: availabilityToOpportunityStatus(savedAvailability),
      }));
    }
    setIsSaving(false);
    setSaveStatus("Profile saved successfully.");
    window.setTimeout(() => setSaveStatus(null), 3000);
    return true;
  };

  const publishProfile = async (nextPublishedState: boolean) => {
    if (!session || !profileLoaded || isSaving || nextPublishedState === isPublished) {
      return;
    }

    const saved = await saveProfile();
    if (!saved) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    const response = await fetch("/api/talent/privacy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visibility: profile.visibility,
        opportunityStatus: profile.availability,
        isPublished: nextPublishedState,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      settings?: { isPublished?: boolean; visibility?: ProfileVisibility; opportunityStatus?: FreeAgentProfile["availability"] };
    } | null;
    setIsSaving(false);

    if (!response.ok || !payload?.ok || !payload.settings) {
      setSaveError(payload?.message ?? "Unable to publish your profile.");
      return;
    }

    setIsPublished(payload.settings.isPublished === true);
    setProfile((current) => ({
      ...current,
      visibility: payload.settings?.visibility ?? current.visibility,
      opportunityStatus: availabilityToOpportunityStatus(payload.settings?.opportunityStatus ?? current.availability),
    }));
    setSaveStatus(nextPublishedState ? "Profile published." : "Profile unpublished.");
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

  if (isLoading || !profileLoaded) {
    return (
      <><main className="min-h-screen bg-[#08111F] px-4 py-8 text-[#0f2744] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-24">
          <div className="rounded-[32px] border border-[#cda64d]/70 bg-[#0f2744] px-8 py-12 text-center text-[#f7ebcf] shadow-[0_18px_55px_rgba(6,16,33,0.28)]">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">{isLoading ? "Loading profile" : "Profile unavailable"}</p>
            <p className="mt-4 text-lg font-semibold">
              {isLoading ? "Please wait while we load your profile." : saveError ?? "We couldn't open Talent Builder for this account."}
            </p>
          </div>
        </div>
      </main><Footer /></>
    );
  }

  const updateTextField = (
    field: "name" | "title" | "location" | "topStrength" | "availability" | "focusArea" | "salaryExpectation" | "contactEmail" | "mobileNumber" | "bio",
    value: string,
  ) => {
    if (field === "availability") {
      setProfile((current) => ({
        ...current,
        availability: normalizeAvailability(value),
        opportunityStatus: availabilityToOpportunityStatus(value),
      }));
      return;
    }

    setProfile((current) => ({ ...current, [field]: value }));
  };

  const createEducationEntry = (): EducationEntry => ({
    id: `education-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    qualification: "",
    institution: "",
  });

  const addEducationEntry = () => {
    setProfile((current) => ({ ...current, educationEntries: [...(current.educationEntries ?? []), createEducationEntry()] }));
  };

  const updateEducationEntry = (entryId: string, field: keyof Omit<EducationEntry, "id">, value: string) => {
    setProfile((current) => ({
      ...current,
      educationEntries: (current.educationEntries ?? []).map((entry) => entry.id === entryId ? { ...entry, [field]: value } : entry),
    }));
  };

  const removeEducationEntry = (entryId: string) => {
    setProfile((current) => ({ ...current, educationEntries: (current.educationEntries ?? []).filter((entry) => entry.id !== entryId) }));
  };

  const createCareerPosition = (): CareerPosition => ({
    id: `journey-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role: "",
    company: "",
    period: "",
    location: "",
    description: "",
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

  const addListItem = (field: "languages" | "passions", value: string) => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return;
    }

    setProfile((current) => {
      const normalizedValue = trimmedValue.replace(/\s+/g, " ");
      const existingValues = current[field] ?? [];
      const alreadyExists = existingValues.some(
        (item) => item.toLowerCase() === normalizedValue.toLowerCase(),
      );

      if (alreadyExists) {
        if (field === "languages") setLanguageInput("");
        if (field === "passions") setPassionInput("");
        return current;
      }

      const maxItems = field === "languages" ? 10 : 8;

      return {
        ...current,
        [field]: [...existingValues, normalizedValue].slice(0, maxItems),
      };
    });

    if (field === "languages") setLanguageInput("");
    if (field === "passions") setPassionInput("");
  };

  const removeListItem = (field: "languages" | "passions", valueToRemove: string) => {
    setProfile((current) => ({
      ...current,
      [field]: (current[field] ?? []).filter((item) => item !== valueToRemove),
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

  const sectionIsComplete = (sectionId: BuilderSectionId) => {
    switch (sectionId) {
      case "basic":
        return Boolean(profile.name.trim() && profile.title.trim() && profile.location.trim());
      case "availability":
        return Boolean(profile.availability);
      case "skills":
        return profile.skills.length > 0;
      case "experience":
        return profile.careerJourney.some((position) => position.role.trim() && position.company.trim());
      case "education":
        return (profile.educationEntries ?? []).some((entry) => entry.qualification.trim() && entry.institution.trim());
      case "media":
        return Boolean(profile.photoUrl || profile.photo_storage_path || profile.intro_video_url || profile.intro_video_storage_path);
      case "languages":
        return (profile.languages ?? []).length > 0 || (profile.passions ?? []).length > 0;
      case "details":
        return Boolean(profile.focusArea.trim() || profile.salaryExpectation || profile.contactEmail?.trim() || profile.resumeOriginalFilename);
      case "privacy":
        return Boolean(profile.visibility && (isPublished || profile.visibility === "confidential"));
      case "preview":
        return false;
    }
  };

  const completedMeaningfulSections = meaningfulBuilderSections.filter((section) => sectionIsComplete(section.id)).length;
  const activeSectionIndex = builderSections.findIndex((section) => section.id === activeSection);
  const activeSectionMeta = builderSections[activeSectionIndex] ?? builderSections[0];
  const journeyStatus = (sectionId: BuilderSectionId) => sectionId === "preview" ? (activeSection === "preview" ? "current" : "review") : sectionId === activeSection ? "current" : sectionIsComplete(sectionId) ? "complete" : "incomplete";
  const journeyTileClass = (sectionId: BuilderSectionId) => {
    const status = journeyStatus(sectionId);
    if (status === "current") return "border-[#08111F] bg-[#08111F] text-[#f7ebcf]";
    if (status === "complete") return "border-[#8fca45] bg-[#f1f8df] text-[#08111F]";
    if (status === "review") return "border-[#08111F]/30 bg-[#eefebf] text-[#08111F]";
    return "border-[#d8d1c2] bg-[#f7ebcf] text-[#08111F]";
  };
  const journeyIconClass = (sectionId: BuilderSectionId) => {
    const status = journeyStatus(sectionId);
    if (status === "current") return "border-[#AFF546] bg-[#AFF546] text-[#08111F]";
    if (status === "complete") return "border-[#8fca45] bg-[#AFF546] text-[#08111F]";
    if (status === "review") return "border-[#08111F]/40 bg-[#eef3f7] text-[#08111F]";
    return "border-[#a9a49a] bg-transparent text-[#737b86]";
  };
  const sectionClass = (sectionId: BuilderSectionId, className: string) => `${activeSection === sectionId ? "" : "hidden"} ${className}`;
  const activeFormClassName = "mt-8 space-y-4";

  const contextCopy: Record<BuilderSectionId, { card: string; passport: string; tip: string }> = {
    basic: {
      card: "Name, title and location help employers understand your profile at a glance.",
      passport: "Your bio adds the fuller professional story behind the first impression.",
      tip: "Start with the clearest version of who you are and what you do.",
    },
    availability: {
      card: "Your current availability is visible during Talent discovery.",
      passport: "The same availability status keeps your Passport current.",
      tip: "Update this whenever your search status changes.",
    },
    skills: {
      card: "Your selected skills support quick employer discovery.",
      passport: "Skills also contribute to the deeper professional record.",
      tip: "Lead with the capabilities you want to be known for.",
    },
    experience: {
      card: "Your two most recent career entries appear on your Talent Card.",
      passport: "Your complete career journey appears on your Talent Passport.",
      tip: "Keep the newest role at the top, then add the detail behind your impact.",
    },
    education: {
      card: "Education is included in the concise discovery profile.",
      passport: "The same education entries are part of your professional record.",
      tip: "Use the qualification and institution fields to keep entries scannable.",
    },
    media: {
      card: "Your profile photo helps employers recognise your Talent Card.",
      passport: "Your video introduction gives the Passport more personality and context.",
      tip: "Choose media that feels current, clear and professional.",
    },
    languages: {
      card: "Languages and passions are reserved for the full professional story.",
      passport: "Languages and passions help employers understand how you work and what motivates you.",
      tip: "A short, considered list is more useful than an exhaustive one.",
    },
    details: {
      card: "These details are not used as a discovery-card preview.",
      passport: "Focus area, salary expectations, contact and resume details support connection-based Passport access.",
      tip: "Private contact and resume details stay protected until permissions allow access.",
    },
    privacy: {
      card: "Visibility settings control whether employers can discover your profile.",
      passport: "Publish state controls whether your Passport is available under its existing access rules.",
      tip: "Review privacy settings before publishing, especially blocked companies.",
    },
    preview: {
      card: "This is how employers discover you on FreeAgentStaff.",
      passport: "Your Card brings together the key information you've added throughout your Talent Builder.",
      tip: "Review your Card, then return to any section to make a change.",
    },
  };

  return (
    <><main className="min-h-screen bg-[#08111F] px-3 py-4 text-[#0f2744] sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[230px_minmax(0,1fr)_320px] lg:items-start lg:gap-x-6 lg:gap-y-0">
        <aside className="rounded-[24px] border border-[#cda64d]/45 bg-[#f7ebcf] p-4 text-[#08111F] shadow-[0_18px_45px_rgba(6,16,33,0.2)] lg:row-span-3 lg:h-fit lg:self-start lg:sticky lg:top-24">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#AFF546]">Talent Builder</p>
              <h1 className="mt-3 text-xl font-black uppercase leading-[0.95] tracking-[0.08em]">Build your<br />Talent Profile</h1>
            </div>
            <span className="mt-1 h-3 w-3 rounded-full bg-[#AFF546] shadow-[0_0_0_5px_rgba(175,245,70,0.12)]" />
          </div>
          <label htmlFor="builder-section-select" className="sr-only">Choose a Builder section</label>
          <select id="builder-section-select" value={activeSection} onChange={(event) => setActiveSection(event.target.value as BuilderSectionId)} className="mt-5 w-full rounded-xl border border-[#0f2744]/20 bg-[#fffaf0] px-3 py-3 text-sm text-[#08111F] outline-none lg:hidden">
            {builderSections.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}
          </select>
          <nav className="mt-6 hidden space-y-1 lg:block" aria-label="Builder sections">
            {builderSections.map((section, index) => {
              const isActive = section.id === activeSection;
              const complete = sectionIsComplete(section.id);
              return (
                <button key={section.id} type="button" onClick={() => setActiveSection(section.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${isActive ? "bg-[#AFF546] text-[#08111F]" : "text-[#08111F] hover:bg-[#fffaf0]"}`}>
                  {section.id === "preview" ? (
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${isPublished ? "border-[#527c1b] bg-[#AFF546] text-[#08111F]" : isActive ? "border-[#08111F]/50 text-[#52627a]" : "border-[#0f2744]/30 text-[#52627a]"}`}>✓</span>
                  ) : <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${complete ? "border-[#527c1b] bg-[#AFF546] text-[#08111F]" : isActive ? "border-[#08111F]/30" : "border-[#0f2744]/25"}`}>{complete ? "✓" : index + 1}</span>}
                  <span>{section.shortLabel}</span>
                </button>
              );
            })}
          </nav>
          <button type="button" onClick={() => void saveProfile()} disabled={isSaving || !profileLoaded} className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#AFF546] px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[#08111F] transition hover:bg-[#9fea37] disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </aside>

        <div className="min-w-0 rounded-[24px] bg-[#fffaf0] shadow-[0_18px_55px_rgba(6,16,33,0.12)] lg:col-start-2 lg:row-span-3">
        <section className={`box-border w-full rounded-t-[24px] rounded-b-none border border-[#cda64d]/45 bg-[#fffaf0] p-4 sm:p-6 lg:p-8 ${activeSection === "languages" || activeSection === "details" || activeSection === "privacy" ? "border-b-0" : ""}`}>
          <div className="mt-5 rounded-2xl border border-[#651D2A]/20 bg-[#f7ebcf] p-5 sm:p-6">
            <p className={`text-[11px] font-bold uppercase tracking-[0.24em] ${activeSection === "preview" ? "text-[#527c1b]" : activeSectionMeta.eyebrow === "passport" ? "text-[#651D2A]" : "text-[#527c1b]"}`}>{activeSection === "preview" ? "Talent Card Preview" : activeSectionMeta.eyebrow === "passport" ? "Talent Passport" : "Talent Card + Passport"}</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold uppercase leading-[0.95] text-[#08111F] sm:text-5xl">{activeSectionMeta.label}</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#27405f]">{contextCopy[activeSection].card} {contextCopy[activeSection].passport}</p>

            {activeSection !== "preview" ? (
              <div className="mt-6 grid gap-4 border-t border-[#d8cfae] pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-2xl border border-[#8fca45]/55 bg-[#f1f8df] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#527c1b]">Publish status</p>
                  <p className="mt-2 text-sm font-semibold text-[#08111F]">Let employers discover you on FreeAgentStaff.</p>
                  <button type="button" onClick={() => void publishProfile(!isPublished)} disabled={isSaving || !profileLoaded} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#AFF546] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#08111F] transition hover:bg-[#9fea37] disabled:cursor-not-allowed disabled:opacity-60">
                    {isPublished ? "Published ✓" : "Publish profile"}
                  </button>
                </div>
                <div className="rounded-2xl border border-[#651D2A]/30 bg-[#f8ecef] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#651D2A]">View your Passport</p>
                  <p className="mt-2 text-sm font-semibold text-[#4e2630]">See your full Passport information.</p>
                  {profile.slug ? <Link href={`/talent/${profile.slug}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#651D2A] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#f7ebcf] transition hover:bg-[#7a2536]">View your Passport →</Link> : <span className="mt-4 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-full bg-[#651D2A]/40 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#f7ebcf]/70">View your Passport →</span>}
                </div>
              </div>
            ) : null}
            {saveStatus ? <p className="mt-1 text-xs font-semibold text-emerald-700">{saveStatus}</p> : null}
            {saveError ? <p className="mt-1 text-xs font-semibold text-rose-700">{saveError}</p> : null}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#0f2744]/10 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6a7a91]">Where your information appears</p>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#08111F]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#AFF546]" /> Card + Passport
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#08111F]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#651D2A]" /> Passport only
              </span>
            </div>
          </div>

          <div className={sectionClass("preview", "mt-8 space-y-6")}>
            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#527c1b]">Talent Card Preview</p>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-[#08111F]">Your Talent Card</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#52627a]">See how your Talent Card appears to employers when they discover you on FreeAgentStaff.</p>
            </div>
            <div className="flex justify-center rounded-2xl bg-[#f7ebcf] p-4 sm:p-8">
              <TalentCard
                profile={hasProAccess ? profile : { ...profile, intro_video_url: null, intro_video_storage_path: null }}
                href={profile.slug ? `/profile/${profile.slug}` : "#"}
                hasProAccess={hasProAccess}
                className="w-full max-w-[430px]"
              />
            </div>
          </div>

          <form
            className={activeSection === "languages" || activeSection === "details" || activeSection === "privacy" || activeSection === "preview" ? "hidden" : activeFormClassName}
            onSubmit={(event) => {
              event.preventDefault();
              saveProfile();
            }}
          >
          <div className={sectionClass("basic", "space-y-2 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#AFF546] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="name" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                  Name
                </label>
                <DestinationPill tone="card" label="Card + Passport" />
              </div>
              <input
                id="name"
                value={profile.name}
                onChange={(event) => updateTextField("name", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none ring-0 transition focus:border-[#0f2744]"
                placeholder="Enter your name"
              />
            </div>

            <div className={sectionClass("availability", "rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#AFF546] bg-[#fffaf0] p-4 text-[#071426] shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="availability" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Availability</label>
                <DestinationPill tone="card" label="Card + Passport" />
              </div>
              <select
                id="availability"
                value={profile.availability}
                onChange={(event) => updateTextField("availability", event.target.value)}
                className="mt-3 w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
              >
                <option value="Available Now">Available Now</option>
                <option value="Open to Opportunities">Open to Opportunities</option>
                <option value="Closed to Opportunities">Closed to Opportunities</option>
              </select>
              <label className="mt-3 flex w-fit max-w-full items-center gap-3 rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-1.5 text-sm text-[#071426] shadow-sm cursor-pointer lg:w-[55%]">
                <input
                  type="checkbox"
                  checked={profile.rockstarAvailable === true}
                  onChange={(event) => setProfile((current) => ({ ...current, rockstarAvailable: event.target.checked }))}
                  className="peer sr-only"
                />
                <span className="rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-[#0f2744] peer-focus-visible:ring-offset-2">
                  <RockstarStarIcon checked={profile.rockstarAvailable === true} />
                </span>
                <span className="text-left">
                  <span className="block text-sm text-[#071426]">Rockstar Available for one-off shifts</span>
                  <span className="mt-0.5 block text-xs text-[#0f2744]/70">
                    Let employers looking for short-term cover find you for one-off shifts.
                  </span>
                </span>
              </label>
            </div>

            <div className={sectionClass("basic", "space-y-2 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#AFF546] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="title" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                  Professional Title
                </label>
                <DestinationPill tone="card" label="Card + Passport" />
              </div>
              <input
                id="title"
                value={profile.title}
                onChange={(event) => updateTextField("title", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                placeholder="Enter your role"
              />
            </div>

            <div className={sectionClass("media", "space-y-2")}>
              <VideoIntroductionSection
                profile={profile}
                onProfileChange={(nextProfile) => setProfile(nextProfile)}
                isSaving={isSaving}
                visibility={profile.visibility}
                hasProAccess={hasProAccess}
              />
            </div>

            <div className={sectionClass("basic", "space-y-2 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#AFF546] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="location" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                  Location
                </label>
                <DestinationPill tone="card" label="Card + Passport" />
              </div>
              <input
                id="location"
                value={profile.location}
                onChange={(event) => updateTextField("location", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                placeholder="Enter your location"
              />
            </div>

            <div className={sectionClass("basic", "space-y-2 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#AFF546] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="topStrength" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                  Top Strength
                </label>
                <DestinationPill tone="card" label="Card + Passport" />
              </div>
              <input
                id="topStrength"
                value={profile.topStrength}
                onChange={(event) => updateTextField("topStrength", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                placeholder="Enter your signature strength"
              />
            </div>

            <div className={sectionClass("education", "space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#AFF546] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                  Education <span className="font-normal normal-case tracking-normal text-[#6a7a91]">(optional)</span>
                </p>
                <DestinationPill tone="card" label="Card + Passport" />
                <button type="button" onClick={addEducationEntry} className="rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]">
                  Add education
                </button>
              </div>
              <div className="space-y-3">
                {(profile.educationEntries ?? []).map((entry, index) => (
                  <div key={entry.id} className="space-y-3 rounded-[20px] border border-[#cda64d]/35 bg-[#f7ebcf] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Education {index + 1}</p>
                      <button type="button" onClick={() => removeEducationEntry(entry.id)} className="rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] transition hover:bg-[#17355f]">Remove</button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input value={entry.qualification} onChange={(event) => updateEducationEntry(entry.id, "qualification", event.target.value)} className="w-full rounded-2xl border border-[#cda64d]/50 bg-white px-3 py-2.5 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]" placeholder="Qualification or course" />
                      <input value={entry.institution} onChange={(event) => updateEducationEntry(entry.id, "institution", event.target.value)} className="w-full rounded-2xl border border-[#cda64d]/50 bg-white px-3 py-2.5 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]" placeholder="Institution" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={sectionClass("skills", "space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#AFF546] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                    Skills
                  </p>
                  <p className="mt-1 text-sm text-[#27405f]">
                    Build a skill set that appears on the card.
                  </p>
                </div>
                <DestinationPill tone="card" label="Card + Passport" />
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

            <div className={sectionClass("experience", "space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#AFF546] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                      Career Journey
                    </p>
                    <DestinationPill tone="card" label="Card + Passport" />
                  </div>
                  <p className="mt-1 text-sm text-[#27405f]">
                    Your two most recent roles appear on your Talent Card. Your full career history appears in your Talent Passport.
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
                  return (
                    <div key={position.id} className="rounded-[24px] border border-[#cda64d]/45 bg-[#f7ebcf] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                            Position {index + 1}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#08111F]">
                            {position.role || "New position"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => moveCareerPosition(position.id, -1)}
                            className="rounded-full border border-[#0f2744]/20 bg-[#10233A] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCareerPosition(position.id, 1)}
                            className="rounded-full border border-[#0f2744]/20 bg-[#10233A] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCareerPosition(position.id)}
                            className="rounded-full border border-[#0f2744]/20 bg-[#10233A] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 rounded-[20px] border border-[#cda64d]/30 bg-[#fffaf0] p-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                            Role
                          </label>
                          <input
                            value={position.role}
                            onChange={(event) => updateCareerPosition(position.id, "role", event.target.value)}
                            className="w-full rounded-2xl border border-[#cda64d]/50 bg-[#fffaf0] px-3 py-2.5 text-sm text-[#08111F] outline-none transition focus:border-[#0f2744]"
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
                            className="w-full rounded-2xl border border-[#cda64d]/50 bg-[#fffaf0] px-3 py-2.5 text-sm text-[#08111F] outline-none transition focus:border-[#0f2744]"
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
                            className="w-full rounded-2xl border border-[#cda64d]/50 bg-[#fffaf0] px-3 py-2.5 text-sm text-[#08111F] outline-none transition focus:border-[#0f2744]"
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
                            className="w-full rounded-2xl border border-[#cda64d]/50 bg-[#fffaf0] px-3 py-2.5 text-sm text-[#08111F] outline-none transition focus:border-[#0f2744]"
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
                          className="min-h-[110px] w-full rounded-[20px] border border-[#cda64d]/50 bg-[#fffaf0] px-3 py-2.5 text-sm text-[#08111F] outline-none transition focus:border-[#0f2744]"
                          placeholder="Describe the role, scope and impact in a professional way."
                        />
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </form>

          <div className={`${activeSection === "languages" || activeSection === "details" || activeSection === "privacy" ? "" : "hidden"} ${activeFormClassName}`}>
              <div className={sectionClass("details", "space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#651D2A] bg-[#fffaf0] p-4 text-[#071426] shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="bio" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                    Bio <span className="font-normal normal-case tracking-normal text-[#6a7a91]">(optional)</span>
                  </label>
                  <DestinationPill tone="passport" label="Passport only" />
                </div>
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

              <div className={sectionClass("details", "space-y-2 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#651D2A] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="focusArea" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Focus Area</label>
                  <DestinationPill tone="passport" label="Passport only" />
                </div>
                <input id="focusArea" value={profile.focusArea} onChange={(event) => updateTextField("focusArea", event.target.value)} className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]" placeholder="Enter your focus area" />
              </div>

              <div className={sectionClass("languages", "space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#651D2A] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Passions</p>
                  <DestinationPill tone="passport" label="Passport only" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[#27405f]">
                    Add up to 8 passions to show what motivates you.
                  </p>
                  <p className="text-xs font-semibold text-[#6a7a91]">{(profile.passions ?? []).length}/8</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={passionInput}
                    onChange={(event) => setPassionInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addListItem("passions", passionInput);
                      }
                    }}
                    className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                    placeholder="Type a passion..."
                  />
                  <button
                    type="button"
                    onClick={() => addListItem("passions", passionInput)}
                    disabled={(profile.passions ?? []).length >= 8}
                    className="rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Add
                  </button>
                </div>

                {(profile.passions ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(profile.passions ?? []).map((passion) => (
                      <button
                        key={passion}
                        type="button"
                        onClick={() => removeListItem("passions", passion)}
                        className="inline-flex items-center gap-2 rounded-full border border-[#f2cc63]/70 bg-[#0f2744] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#f2cc63] hover:bg-[#17355f] hover:shadow-[0_8px_16px_rgba(7,20,38,0.16)]"
                      >
                        <span>{passion}</span>
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#f2cc63]/40 bg-[#f7ebcf]/10 text-[10px] leading-none text-[#f7ebcf]">
                          ×
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className={sectionClass("languages", "space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#651D2A] bg-[#fffaf0] p-4 text-[#071426] shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Languages</p>
                  <DestinationPill tone="passport" label="Passport only" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[#27405f]">Add up to 10 languages for your talent passport.</p>
                  <p className="text-xs font-semibold text-[#6a7a91]">{(profile.languages ?? []).length}/10</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={languageInput}
                    onChange={(event) => setLanguageInput(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addListItem("languages", languageInput); } }}
                    className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                    placeholder="Type a language..."
                  />
                  <button type="button" onClick={() => addListItem("languages", languageInput)} disabled={(profile.languages ?? []).length >= 10} className="rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f] disabled:cursor-not-allowed disabled:opacity-60">Add</button>
                </div>
                {(profile.languages ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(profile.languages ?? []).map((language) => (
                      <button key={language} type="button" onClick={() => removeListItem("languages", language)} className="inline-flex items-center gap-2 rounded-full border border-[#f2cc63]/70 bg-[#0f2744] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#f2cc63] hover:bg-[#17355f] hover:shadow-[0_8px_16px_rgba(7,20,38,0.16)]">
                        <span>{language}</span>
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#f2cc63]/40 bg-[#f7ebcf]/10 text-[10px] leading-none text-[#f7ebcf]">×</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className={sectionClass("details", "space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#651D2A] bg-[#fffaf0] p-4 text-[#071426] shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="salaryExpectation" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Salary expectations <span className="font-normal normal-case tracking-normal text-[#6a7a91]">(optional)</span></label>
                  <DestinationPill tone="passport" label="Passport only" />
                </div>
                <select
                  id="salaryExpectation"
                  value={profile.salaryExpectation ?? ""}
                  onChange={(event) => updateTextField("salaryExpectation", event.target.value)}
                  className="mt-3 w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                >
                  <option value="">Select a broad salary band</option>
                  {salaryExpectationOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className={sectionClass("details", "space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#651D2A] bg-[#fffaf0] p-4 shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Contact details</p>
                    <p className="mt-1 text-sm text-[#27405f]">Your contact email is only shared with employers when your connection permissions allow access.</p>
                  </div>
                  <DestinationPill tone="passport" label="Passport · After connection" />
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
                <label htmlFor="mobileNumber" className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Mobile number <span className="font-normal normal-case tracking-normal text-[#6a7a91]">(optional)</span></label>
                <input
                  id="mobileNumber"
                  type="tel"
                  value={profile.mobileNumber ?? ""}
                  onChange={(event) => updateTextField("mobileNumber", event.target.value)}
                  className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]"
                  placeholder="04XX XXX XXX"
                  autoComplete="tel"
                />
              </div>

              <div className={sectionClass("details", "space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#651D2A] bg-[#fffaf0] p-4 text-[#071426] shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Resume</p>
                    <p className="mt-1 text-sm text-[#27405f]">Private PDF, DOC, or DOCX files up to 10 MB.</p>
                  </div>
                  <DestinationPill tone="passport" label="Passport · After connection" />
                </div>
                {profile.resumeOriginalFilename ? (
                  <div className="space-y-3 rounded-2xl border border-[#cda64d]/35 bg-white/80 p-3">
                    <p className="whitespace-nowrap text-sm font-semibold uppercase tracking-[0.18em] text-[#AFF546]">Resume uploaded ✓</p>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]">
                        Replace resume
                        <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" disabled={resumeBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadResume(file); event.target.value = ""; }} />
                      </label>
                      <button type="button" onClick={() => void removeResume()} disabled={resumeBusy} className="min-h-[44px] rounded-full border border-rose-900/20 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-900 disabled:opacity-50">Remove</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="whitespace-nowrap text-sm font-semibold uppercase tracking-[0.18em] text-[#9a6d15]">Upload resume</p>
                    <label className="inline-flex min-h-[46px] w-full cursor-pointer items-center justify-center rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]">
                      {resumeBusy ? "Uploading..." : "Upload resume"}
                      <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" disabled={resumeBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadResume(file); event.target.value = ""; }} />
                    </label>
                  </div>
                )}
                {resumeError ? <p className="text-sm font-semibold text-rose-700">{resumeError}</p> : null}
              </div>

              <div className={sectionClass("privacy", "rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#2bd7ef] bg-[#fffaf0] p-4 text-sm leading-6 text-[#27405f] shadow-[0_10px_24px_rgba(7,20,38,0.08)]")}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Privacy & visibility</p>
                <p className="mt-2">Marketplace visibility and blocked companies are managed from Privacy & Visibility. Publish state is managed here in Talent Builder.</p>
                <Link href="/settings/privacy" className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]">Open privacy settings</Link>
              </div>

          </div>
        </section>

          <section className="order-2 w-full rounded-b-[24px] rounded-t-none border border-t-0 border-[#cda64d]/45 bg-[#fffaf0] p-5 text-[#0f2744] shadow-[0_18px_45px_rgba(6,16,33,0.1)] lg:order-none lg:col-start-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9a6d15]">Builder Journey</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-[#08111F]">Your Progress</h2>
                <p className="mt-1 text-sm leading-6 text-[#52627a]">Complete the sections that matter most to your next opportunity.</p>
              </div>
              <div className="min-w-[150px] sm:text-right">
                <p className="text-2xl font-black text-[#08111F]">{completedMeaningfulSections} / {meaningfulBuilderSections.length}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7e2d8]"><div className="h-full rounded-full bg-[#AFF546]" style={{ width: `${(completedMeaningfulSections / meaningfulBuilderSections.length) * 100}%` }} /></div>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#52627a]">Sections complete</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {meaningfulBuilderSections.map((section, index) => {
                const status = journeyStatus(section.id);
                return <button key={section.id} type="button" onClick={() => setActiveSection(section.id)} className={`flex min-h-[72px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${journeyTileClass(section.id)}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black ${journeyIconClass(section.id)}`}>{status === "complete" ? "✓" : status === "review" ? "R" : index + 1}</span>
                  <span><span className="block text-[10px] font-black uppercase tracking-[0.1em]">{section.shortLabel}</span><span className={`mt-1 block text-[9px] font-bold uppercase tracking-[0.12em] ${status === "current" ? "text-[#AFF546]" : "opacity-60"}`}>{status === "complete" ? "Complete" : status === "current" ? "Current" : status === "review" ? "Review" : "Incomplete"}</span></span>
                </button>;
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#0f2744]/10 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#52627a]">
              <span><span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#AFF546] text-[#08111F]">✓</span> Completed section</span>
              <span><span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#a9a49a] text-[#737b86]">•</span> Incomplete section</span>
              <span><span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#08111F] text-[#AFF546]">•</span> Current section</span>
            </div>
          </section>
        </div>

        <section className="w-full rounded-[24px] border border-[#cda64d]/45 bg-[#fffaf0] p-5 shadow-[0_18px_45px_rgba(6,16,33,0.1)] lg:col-start-3 lg:row-start-1 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:sticky lg:top-24">
          <div className={activeSection === "preview" ? "" : "hidden"}>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9a6d15]">Your Talent Card</p>
            <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.08em] text-[#08111F]">Card Content</h2>
            <p className="mt-3 text-sm leading-6 text-[#27405f]">This is how employers discover you on FreeAgentStaff. Your Card brings together the key information you&apos;ve added throughout your Talent Builder.</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-[#52627a]"><li>Basic information</li><li>Availability</li><li>Top Strength and skills</li><li>Education</li><li>Recent career journey</li></ul>
            <h2 className="mt-6 text-2xl font-black uppercase tracking-[0.08em] text-[#08111F]">Want to make a change?</h2>
            <p className="mt-3 text-sm leading-6 text-[#27405f]">Return to any section in your Talent Builder to update your information.</p>
            <button type="button" onClick={() => setActiveSection("basic")} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#AFF546] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-[#08111F]">Edit Talent Builder</button>
            {profile.slug ? <Link href={`/talent/${profile.slug}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#651D2A] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-[#f7ebcf]">Go to Passport</Link> : null}
          </div>
          <div className={activeSection === "preview" ? "hidden" : ""}>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9a6d15]">Where this information appears</p>
          <div className="mt-4 rounded-2xl border border-[#AFF546]/60 bg-[#f3fbdc] p-4">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#AFF546]" /><h2 className="text-sm font-black uppercase tracking-[0.12em] text-[#08111F]">Talent Card</h2></div>
            <p className="mt-2 text-sm leading-6 text-[#27405f]">A snapshot for quick discovery by employers.</p>
            <p className="mt-3 text-xs leading-5 text-[#527c1b]">Name, title, location, top strength, selected skills, availability, education and your two most recent career entries.</p>
          </div>
          <div className="mt-3 rounded-2xl border border-[#651D2A]/45 bg-[#f8ecef] p-4">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#651D2A]" /><h2 className="text-sm font-black uppercase tracking-[0.12em] text-[#651D2A]">Talent Passport</h2></div>
            <p className="mt-2 text-sm leading-6 text-[#4e2630]">Your complete professional story.</p>
            <p className="mt-3 text-xs leading-5 text-[#651D2A]">Everything relevant from your Card, plus your full career journey, bio, passions, languages, salary expectations, video and protected contact or resume details.</p>
          </div>
          </div>
        </section>
      </div>
    </main><Footer /></>
  );
}
