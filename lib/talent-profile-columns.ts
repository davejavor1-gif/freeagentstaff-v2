import type { FreeAgentProfile } from "@/types/freeagent";
import type { Json, ProfilesInsert } from "@/types/supabase";

type TalentRowCore = Pick<ProfilesInsert,
  | "visibility"
  | "opportunity_status"
  | "name"
  | "title"
  | "location"
  | "availability"
  | "top_strength"
  | "focus_area"
  | "summary"
  | "bio"
  | "skills"
  | "languages"
  | "passions"
  | "career_journey"
  | "email"
  | "image_alt"
  | "photo_url"
  | "photo_storage_path"
  | "current_employer"
  | "intro_video_url"
  | "intro_video_storage_path"
  | "profile"
  | "education"
  | "salary_expectation"
  | "contact_email"
  | "resume_storage_path"
  | "resume_original_filename"
  | "resume_uploaded_at"
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

function normalizeStringArray(values: string[] | null | undefined, maxItems?: number): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const normalized = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const uniqueValues = Array.from(new Set(normalized));

  if (typeof maxItems === "number" && maxItems > 0) {
    return uniqueValues.slice(0, maxItems);
  }

  return uniqueValues;
}

export function buildCanonicalTalentColumns(
  profile: FreeAgentProfile,
  authEmail?: string | null,
): TalentRowCore {
  const contactEmail = normalizeString(profile.contactEmail) ?? normalizeString(authEmail);
  const canonicalPhotoUrl = profile.photo_storage_path ? null : normalizeString(profile.photoUrl);
  const privateSafeProfile = { ...profile };
  delete privateSafeProfile.email;
  delete privateSafeProfile.contactEmail;

  return {
    visibility: normalizeVisibility(profile.visibility),
    opportunity_status: normalizeOpportunityStatus(profile.opportunityStatus),
    name: normalizeString(profile.name),
    title: normalizeString(profile.title),
    location: normalizeString(profile.location),
    availability: normalizeAvailability(profile.availability),
    top_strength: normalizeString(profile.topStrength),
    focus_area: normalizeString(profile.focusArea),
    education: normalizeString(profile.education),
    salary_expectation: profile.salaryExpectation ?? null,
    contact_email: contactEmail,
    resume_storage_path: normalizeString(profile.resumeStoragePath),
    resume_original_filename: normalizeString(profile.resumeOriginalFilename),
    resume_uploaded_at: profile.resumeUploadedAt ?? null,
    summary: normalizeString(profile.summary),
    bio: normalizeString(profile.bio),
    skills: normalizeStringArray(profile.skills),
    languages: normalizeStringArray(profile.languages, 10),
    passions: normalizeStringArray(profile.passions, 8),
    career_journey: Array.isArray(profile.careerJourney) ? (profile.careerJourney as unknown as Json) : ([] as unknown as Json),
    email: normalizeString(authEmail),
    image_alt: normalizeString(profile.imageAlt),
    photo_url: canonicalPhotoUrl,
    photo_storage_path: normalizeString(profile.photo_storage_path),
    current_employer: normalizeString(profile.currentEmployer),
    intro_video_url: normalizeString(profile.intro_video_url),
    intro_video_storage_path: normalizeString(profile.intro_video_storage_path),
    profile: privateSafeProfile as unknown as Json,
  };
}
