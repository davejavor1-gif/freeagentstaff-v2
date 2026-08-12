import "server-only";

import type { CareerPosition, EmployerVerificationStatus, FreeAgentProfile, OpportunityStatus, ProfileVisibility } from "@/types/freeagent";
import type { DiscoveryApiResponse, DiscoveryProfileCard, TalentPassportApiResponse, TalentPassportAccessScope } from "@/types/discovery";
import type { Database, Json, ProfilesRow } from "@/types/supabase";
import { createServiceRoleSupabaseClient, createUserServerSupabaseClient } from "@/lib/server-supabase";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

type ViewerRow = Pick<ProfilesRow, "account_type" | "employer_verification_status" | "employer_abn">;
type DiscoveryRpcRow = Database["public"]["Functions"]["discovery_profiles_for_verified_employer"]["Returns"][number];
type PassportRpcRow = Database["public"]["Functions"]["talent_passport_for_viewer"]["Returns"][number];

type ViewerContext = {
  userClient: ReturnType<typeof createUserServerSupabaseClient>;
  viewerRow: ViewerRow | null;
};

type TalentPassportRpcArgs = Database["public"]["Functions"]["talent_passport_for_viewer"]["Args"];

function normalizeAbn(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");

  if (digits.length !== 11) {
    return null;
  }

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const checksum = digits
    .split("")
    .map((digit) => Number(digit))
    .reduce((sum, digit, index) => sum + ((index === 0 ? digit - 1 : digit) * weights[index]), 0);

  return checksum % 89 === 0 ? digits : null;
}

function normalizeVisibility(value: string | null | undefined): Exclude<ProfileVisibility, "employer_network"> | null {
  if (value === "employer_network") {
    return "verified_employer_network";
  }

  if (value === "public" || value === "verified_employer_network" || value === "confidential") {
    return value;
  }

  return null;
}

function normalizeAvailability(value: string | null | undefined): FreeAgentProfile["availability"] {
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

function normalizeOpportunityStatus(value: string | null | undefined): OpportunityStatus {
  if (value === "actively_open" || value === "exploring" || value === "not_open") {
    return value;
  }

  return "actively_open";
}

function normalizeVerificationStatus(value: string | null | undefined): EmployerVerificationStatus {
  if (value === "unverified" || value === "pending" || value === "verified" || value === "rejected") {
    return value;
  }

  return "unverified";
}

function toCareerJourney(value: Json | null | undefined): CareerPosition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry): CareerPosition[] => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }

    const candidate = entry as Record<string, Json>;
    return [
      {
        id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
        role: typeof candidate.role === "string" ? candidate.role : "",
        company: typeof candidate.company === "string" ? candidate.company : "",
        period: typeof candidate.period === "string" ? candidate.period : "",
        location: typeof candidate.location === "string" ? candidate.location : "",
        description: typeof candidate.description === "string" ? candidate.description : "",
        achievements: Array.isArray(candidate.achievements)
          ? candidate.achievements.filter((item): item is string => typeof item === "string")
          : [],
        skills: Array.isArray(candidate.skills)
          ? candidate.skills.filter((item): item is string => typeof item === "string")
          : [],
      },
    ];
  });
}

async function signMediaUrls(photoStoragePath: string | null, introVideoStoragePath: string | null) {
  const serviceClient = createServiceRoleSupabaseClient();

  if (!serviceClient) {
    return {
      photoUrl: null,
      videoUrl: null,
    };
  }

  const [photoUrl, videoUrl] = await Promise.all([
    photoStoragePath
      ? serviceClient.storage
          .from("profile-media")
          .createSignedUrl(photoStoragePath, SIGNED_URL_TTL_SECONDS)
          .then(({ data, error }) => (error ? null : data?.signedUrl ?? null))
      : Promise.resolve(null),
    introVideoStoragePath
      ? serviceClient.storage
          .from("intro-videos")
          .createSignedUrl(introVideoStoragePath, SIGNED_URL_TTL_SECONDS)
          .then(({ data, error }) => (error ? null : data?.signedUrl ?? null))
      : Promise.resolve(null),
  ]);

  return { photoUrl, videoUrl };
}

async function getViewerContext(accessToken: string): Promise<ViewerContext | null> {
  const userClient = createUserServerSupabaseClient(accessToken);
  const { data, error } = await userClient.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  const { data: viewerRow } = await userClient
    .from("profiles")
    .select("account_type, employer_verification_status, employer_abn")
    .eq("user_id", data.user.id)
    .maybeSingle();

  return {
    userClient,
    viewerRow: (viewerRow as ViewerRow | null | undefined) ?? null,
  };
}

function buildDiscoveryProfile(row: DiscoveryRpcRow, photoUrl: string | null, videoUrl: string | null): DiscoveryProfileCard {
  const visibility = normalizeVisibility(row.visibility);
  const isConfidential = visibility === "confidential";

  if (isConfidential) {
    return {
      slug: row.slug,
      verificationStatus: normalizeVerificationStatus(row.verification_status),
      profile: {
        id: row.slug,
        slug: row.slug,
        visibility: visibility ?? "confidential",
        opportunityStatus: normalizeOpportunityStatus(row.opportunity_status),
        location: row.location ?? "",
        availability: normalizeAvailability(row.availability),
        topStrength: row.top_strength ?? "",
        experienceYears: row.experience_years ?? 0,
        focusArea: row.focus_area ?? "",
        skills: row.skills ?? [],
        careerJourney: [],
        imageAlt: "Confidential profile",
      } as unknown as FreeAgentProfile,
    };
  }

  return {
    slug: row.slug,
    verificationStatus: normalizeVerificationStatus(row.verification_status),
    profile: {
      id: row.slug,
      slug: row.slug,
      visibility: visibility ?? "confidential",
      opportunityStatus: normalizeOpportunityStatus(row.opportunity_status),
      name: row.name ?? "",
      title: row.title ?? "",
      location: row.location ?? "",
      availability: normalizeAvailability(row.availability),
      topStrength: row.top_strength ?? "",
      experienceYears: row.experience_years ?? 0,
      focusArea: row.focus_area ?? "",
      summary: row.summary ?? "",
      skills: row.skills ?? [],
      careerJourney: [],
      photoUrl: photoUrl ?? undefined,
      intro_video_url: videoUrl,
      intro_video_thumbnail_url: photoUrl,
      currentEmployer: row.current_employer ?? undefined,
      imageAlt: row.name ?? undefined,
    },
  };
}

function buildPassportProfile(row: PassportRpcRow, photoUrl: string | null, videoUrl: string | null): FreeAgentProfile {
  const visibility = normalizeVisibility(row.visibility);
  const isConfidential = row.access_scope === "employer_confidential";

  if (isConfidential) {
    return {
      id: row.slug,
      slug: row.slug,
      visibility: visibility ?? "confidential",
      opportunityStatus: normalizeOpportunityStatus(row.opportunity_status),
      location: row.location ?? "",
      availability: normalizeAvailability(row.availability),
      topStrength: row.top_strength ?? "",
      experienceYears: row.experience_years ?? 0,
      focusArea: row.focus_area ?? "",
      skills: row.skills ?? [],
      careerJourney: [],
      imageAlt: "Confidential profile",
    } as unknown as FreeAgentProfile;
  }

  return {
    id: row.slug,
    slug: row.slug,
    visibility: visibility ?? "confidential",
    opportunityStatus: normalizeOpportunityStatus(row.opportunity_status),
    name: row.name ?? "",
    title: row.title ?? "",
    location: row.location ?? "",
    availability: normalizeAvailability(row.availability),
    topStrength: row.top_strength ?? "",
    experienceYears: row.experience_years ?? 0,
    focusArea: row.focus_area ?? "",
    summary: row.summary ?? "",
    skills: row.skills ?? [],
    careerJourney: toCareerJourney(row.career_journey),
    photoUrl: photoUrl ?? undefined,
    intro_video_url: videoUrl,
    intro_video_thumbnail_url: photoUrl,
    currentEmployer: row.current_employer ?? undefined,
    imageAlt: row.name ?? undefined,
  };
}

export async function loadDiscoveryResults(accessToken: string | null | undefined): Promise<DiscoveryApiResponse> {
  if (!accessToken) {
    return {
      allowed: false,
      reason: "not_signed_in",
      message: "Please sign in with a verified employer account to access the employer marketplace.",
      profiles: [],
    };
  }

  const viewer = await getViewerContext(accessToken);

  if (!viewer) {
    return {
      allowed: false,
      reason: "not_signed_in",
      message: "Please sign in with a verified employer account to access the employer marketplace.",
      profiles: [],
    };
  }

  if (viewer.viewerRow?.account_type !== "employer") {
    return {
      allowed: false,
      reason: "wrong_account_type",
      message: "Talent Search is available only to verified employer accounts.",
      profiles: [],
    };
  }

  if (viewer.viewerRow.employer_verification_status !== "verified") {
    return {
      allowed: false,
      reason: "unverified_employer",
      message:
        viewer.viewerRow.employer_verification_status === "pending"
          ? "Your employer verification is pending. Discovery unlocks once your account is verified."
          : viewer.viewerRow.employer_verification_status === "rejected"
            ? "Your employer verification was rejected. Update your company details before accessing discovery."
            : "Your employer account must be verified before you can access discovery.",
      profiles: [],
    };
  }

  if (!normalizeAbn(viewer.viewerRow.employer_abn)) {
    return {
      allowed: false,
      reason: "invalid_abn",
      message: "A valid structured ABN is required before employer discovery is available.",
      profiles: [],
    };
  }

  const { data, error } = await viewer.userClient.rpc("discovery_profiles_for_verified_employer");

  if (error) {
    return {
      allowed: false,
      reason: "error",
      message: error.message,
      profiles: [],
    };
  }

  const rows = (data ?? []) as DiscoveryRpcRow[];
  const profiles = await Promise.all(
    rows.map(async (row) => {
      const { photoUrl, videoUrl } = row.can_view_media
        ? await signMediaUrls(row.photo_storage_path, row.intro_video_storage_path)
        : { photoUrl: null, videoUrl: null };

      return buildDiscoveryProfile(row, photoUrl, videoUrl);
    }),
  );

  return {
    allowed: true,
    profiles,
  };
}

export async function loadTalentPassport(accessToken: string | null | undefined, slug: string): Promise<TalentPassportApiResponse> {
  if (!accessToken) {
    return {
      allowed: false,
      reason: "not_signed_in",
      message: "Sign in with your talent account or a verified employer account to view this passport.",
    };
  }

  const viewer = await getViewerContext(accessToken);

  if (!viewer) {
    return {
      allowed: false,
      reason: "not_signed_in",
      message: "Sign in with your talent account or a verified employer account to view this passport.",
    };
  }

  if (viewer.viewerRow?.account_type === "employer") {
    if (viewer.viewerRow.employer_verification_status !== "verified") {
      return {
        allowed: false,
        reason: "unverified_employer",
        message: "Your employer account must be verified before you can open talent passports.",
      };
    }

    if (!normalizeAbn(viewer.viewerRow.employer_abn)) {
      return {
        allowed: false,
        reason: "invalid_abn",
        message: "A valid structured ABN is required before employer passport access is available.",
      };
    }
  } else if (viewer.viewerRow?.account_type !== "talent") {
    return {
      allowed: false,
      reason: "wrong_account_type",
      message: "This passport is restricted to the profile owner or verified employer accounts.",
    };
  }

  const passportArgs: TalentPassportRpcArgs = { p_slug: slug };
  const { data, error } = await viewer.userClient.rpc("talent_passport_for_viewer", passportArgs as never);

  if (error) {
    return {
      allowed: false,
      reason: "error",
      message: error.message,
    };
  }

  const row = ((data ?? []) as PassportRpcRow[])[0];

  if (!row) {
    return {
      allowed: false,
      reason: "not_available",
      message: "This passport is unavailable for your account or the profile is no longer discoverable.",
    };
  }

  const accessScope = row.access_scope as TalentPassportAccessScope;
  const { photoUrl, videoUrl } = accessScope === "employer_confidential"
    ? { photoUrl: null, videoUrl: null }
    : await signMediaUrls(row.photo_storage_path, row.intro_video_storage_path);

  return {
    allowed: true,
    accessScope,
    isOwner: row.is_owner,
    verificationStatus: normalizeVerificationStatus(row.verification_status),
    profile: buildPassportProfile(row, photoUrl, videoUrl),
  };
}