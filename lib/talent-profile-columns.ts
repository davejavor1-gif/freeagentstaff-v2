import type { FreeAgentProfile } from "@/types/freeagent";
import type { Json, ProfilesInsert } from "@/types/supabase";

type TalentRowCore = Pick<ProfilesInsert,
  | "slug"
  | "visibility"
  | "opportunity_status"
  | "name"
  | "title"
  | "location"
  | "availability"
  | "top_strength"
  | "experience_years"
  | "focus_area"
  | "summary"
  | "skills"
  | "career_journey"
  | "email"
  | "image_alt"
  | "photo_url"
  | "photo_storage_path"
  | "current_employer"
  | "intro_video_url"
  | "intro_video_storage_path"
  | "profile"
>;

function normalizeVisibility(value: FreeAgentProfile["visibility"]): ProfilesInsert["visibility"] {
  if (value === "verified_employer_network" || value === "confidential" || value === "public") {
    return value;
  }

  return "public";
}

function normalizeOpportunityStatus(value: FreeAgentProfile["opportunityStatus"]): ProfilesInsert["opportunity_status"] {
  if (value === "actively_open" || value === "exploring" || value === "not_open") {
    return value;
  }

  return "actively_open";
}

function normalizeAvailability(value: FreeAgentProfile["availability"]): string {
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
}

function normalizeString(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringArray(values: string[] | null | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const normalized = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set(normalized));
}

export function buildCanonicalTalentColumns(
  profile: FreeAgentProfile,
  authEmail?: string | null,
): TalentRowCore {
  const canonicalEmail = normalizeString(profile.email) ?? normalizeString(authEmail);

  return {
    slug: normalizeString(profile.slug) ?? null,
    visibility: normalizeVisibility(profile.visibility),
    opportunity_status: normalizeOpportunityStatus(profile.opportunityStatus),
    name: normalizeString(profile.name),
    title: normalizeString(profile.title),
    location: normalizeString(profile.location),
    availability: normalizeAvailability(profile.availability),
    top_strength: normalizeString(profile.topStrength),
    experience_years: Number.isFinite(profile.experienceYears) ? Math.max(0, Math.floor(profile.experienceYears)) : 0,
    focus_area: normalizeString(profile.focusArea),
    summary: normalizeString(profile.summary),
    skills: normalizeStringArray(profile.skills),
    career_journey: Array.isArray(profile.careerJourney) ? (profile.careerJourney as unknown as Json) : ([] as unknown as Json),
    email: canonicalEmail,
    image_alt: normalizeString(profile.imageAlt),
    photo_url: normalizeString(profile.photoUrl),
    photo_storage_path: normalizeString(profile.photo_storage_path),
    current_employer: normalizeString(profile.currentEmployer),
    intro_video_url: normalizeString(profile.intro_video_url),
    intro_video_storage_path: normalizeString(profile.intro_video_storage_path),
    profile: profile as unknown as Json,
  };
}
