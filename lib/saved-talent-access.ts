import "server-only";

import type { CareerPosition, EmployerVerificationStatus, FreeAgentProfile, OpportunityStatus, ProfileVisibility } from "@/types/freeagent";
import type {
  CreateShortlistResponse,
  DeleteShortlistResponse,
  RemoveSavedTalentResponse,
  SaveTalentResponse,
  SavedTalentErrorReason,
  SavedTalentItem,
  SavedTalentListResponse,
  ShortlistMemberMutationResponse,
  ShortlistSummary,
  ShortlistsResponse,
  UpdateShortlistResponse,
} from "@/types/saved-talent";
import type { Database, Json } from "@/types/supabase";
import { createServiceRoleSupabaseClient, createUserServerSupabaseClient } from "@/lib/server-supabase";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

type ListSavedRow = Database["public"]["Functions"]["list_saved_talent_for_employer"]["Returns"][number];
type ListShortlistRow = Database["public"]["Functions"]["list_employer_shortlists"]["Returns"][number];

function mapReasonFromError(message: string): SavedTalentErrorReason {
  if (message.includes("not_signed_in")) return "not_signed_in";
  if (message.includes("wrong_account_type")) return "wrong_account_type";
  if (message.includes("unverified_employer")) return "unverified_employer";
  if (message.includes("invalid_abn")) return "invalid_abn";
  if (message.includes("shortlist_not_found")) return "shortlist_not_found";
  if (message.includes("invalid_shortlist_ids")) return "invalid_shortlist_ids";
  if (message.includes("candidate_not_found")) return "candidate_not_found";
  if (message.includes("not_authorized_for_candidate")) return "not_authorized_for_candidate";
  if (message.includes("invalid_name")) return "invalid_name";
  if (message.includes("duplicate") || message.includes("unique")) return "duplicate_name";
  return "error";
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

function mapSavedItem(row: ListSavedRow, photoUrl: string | null, videoUrl: string | null): SavedTalentItem {
  const visibility = normalizeVisibility(row.visibility);
  const isConfidential = row.access_scope === "employer_confidential";

  const profile: FreeAgentProfile = isConfidential
    ? {
        id: row.slug,
        slug: row.slug,
        visibility: visibility ?? "confidential",
        opportunityStatus: normalizeOpportunityStatus(row.opportunity_status),
        name: "Confidential candidate",
        title: row.title ?? "Professional profile",
        location: row.location ?? "",
        availability: normalizeAvailability(row.availability),
        topStrength: row.top_strength ?? "",
        experienceYears: row.experience_years ?? 0,
        focusArea: row.focus_area ?? "",
        summary: row.summary ?? "Confidential profile details are available to authorized employers.",
        skills: row.skills ?? [],
        careerJourney: [],
        imageAlt: "Confidential profile",
      }
    : {
        id: row.slug,
        slug: row.slug,
        visibility: visibility ?? "public",
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
        email: row.email ?? undefined,
        imageAlt: row.name ?? undefined,
      };

  return {
    savedTalentId: row.saved_talent_id,
    savedAt: row.saved_at,
    slug: row.slug,
    accessScope: row.access_scope as "employer_full" | "employer_confidential",
    verificationStatus: normalizeVerificationStatus(row.verification_status),
    shortlistIds: row.shortlist_ids ?? [],
    profile,
  };
}

function mapShortlist(row: ListShortlistRow): ShortlistSummary {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memberCount: row.member_count,
  };
}

function getUserClient(accessToken: string | null | undefined) {
  if (!accessToken) {
    return null;
  }

  return createUserServerSupabaseClient(accessToken);
}

async function callRpc<TData>(
  userClient: NonNullable<ReturnType<typeof getUserClient>>,
  fn: string,
  args?: Record<string, unknown>,
): Promise<{ data: TData | null; error: { message: string } | null }> {
  return (userClient as unknown as {
    rpc: (name: string, params?: Record<string, unknown>) => Promise<{ data: TData | null; error: { message: string } | null }>;
  }).rpc(fn, args);
}

export async function listSavedTalent(accessToken: string | null | undefined, shortlistId?: string | null): Promise<SavedTalentListResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required.", items: [] };
  }

  const { data, error } = await callRpc<ListSavedRow[]>(userClient, "list_saved_talent_for_employer", {
    p_shortlist_id: shortlistId ?? null,
  });

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
      items: [],
      shortlistId: shortlistId ?? null,
    };
  }

  const rows = (data ?? []) as ListSavedRow[];
  const items = await Promise.all(
    rows.map(async (row) => {
      const { photoUrl, videoUrl } = row.access_scope === "employer_confidential"
        ? { photoUrl: null, videoUrl: null }
        : await signMediaUrls(row.photo_storage_path, row.intro_video_storage_path);

      return mapSavedItem(row, photoUrl, videoUrl);
    }),
  );

  return {
    ok: true,
    shortlistId: shortlistId ?? null,
    items,
  };
}

export async function saveTalent(accessToken: string | null | undefined, slug: string, shortlistIds?: string[] | null): Promise<SaveTalentResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await callRpc<Database["public"]["Functions"]["save_talent_for_employer"]["Returns"]>(
    userClient,
    "save_talent_for_employer",
    {
    p_slug: slug,
    p_shortlist_ids: shortlistIds && shortlistIds.length > 0 ? shortlistIds : null,
    },
  );

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
    };
  }

  const row = data?.[0];
  return {
    ok: true,
    alreadySaved: row?.already_saved ?? false,
    savedTalentId: row?.saved_talent_id,
    savedAt: row?.saved_at,
  };
}

export async function unsaveTalent(accessToken: string | null | undefined, slug: string): Promise<RemoveSavedTalentResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await callRpc<Database["public"]["Functions"]["unsave_talent_for_employer"]["Returns"]>(
    userClient,
    "unsave_talent_for_employer",
    {
    p_slug: slug,
    },
  );

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
    };
  }

  return {
    ok: true,
    removed: data?.[0]?.removed ?? false,
  };
}

export async function listShortlists(accessToken: string | null | undefined): Promise<ShortlistsResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required.", shortlists: [] };
  }

  const { data, error } = await callRpc<ListShortlistRow[]>(userClient, "list_employer_shortlists");

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
      shortlists: [],
    };
  }

  return {
    ok: true,
    shortlists: ((data ?? []) as ListShortlistRow[]).map(mapShortlist),
  };
}

export async function createShortlist(accessToken: string | null | undefined, name: string): Promise<CreateShortlistResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await callRpc<Database["public"]["Functions"]["create_employer_shortlist"]["Returns"]>(
    userClient,
    "create_employer_shortlist",
    {
    p_name: name,
    },
  );

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
    };
  }

  const row = data?.[0];
  if (!row) {
    return {
      ok: false,
      reason: "error",
      message: "Unable to create shortlist.",
    };
  }

  return {
    ok: true,
    shortlist: mapShortlist({
      id: row.shortlist_id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      member_count: 0,
    }),
  };
}

export async function renameShortlist(accessToken: string | null | undefined, shortlistId: string, name: string): Promise<UpdateShortlistResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await callRpc<Database["public"]["Functions"]["rename_employer_shortlist"]["Returns"]>(
    userClient,
    "rename_employer_shortlist",
    {
    p_shortlist_id: shortlistId,
    p_name: name,
    },
  );

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
    };
  }

  const row = data?.[0];
  if (!row) {
    return {
      ok: false,
      reason: "shortlist_not_found",
      message: "shortlist_not_found",
    };
  }

  return {
    ok: true,
    shortlist: mapShortlist({
      id: row.shortlist_id,
      name: row.name,
      created_at: row.updated_at,
      updated_at: row.updated_at,
      member_count: 0,
    }),
  };
}

export async function deleteShortlist(accessToken: string | null | undefined, shortlistId: string): Promise<DeleteShortlistResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await callRpc<Database["public"]["Functions"]["delete_employer_shortlist"]["Returns"]>(
    userClient,
    "delete_employer_shortlist",
    {
    p_shortlist_id: shortlistId,
    },
  );

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
    };
  }

  return {
    ok: true,
    removed: data?.[0]?.removed ?? false,
  };
}

export async function addSavedTalentToShortlist(accessToken: string | null | undefined, shortlistId: string, slug: string): Promise<ShortlistMemberMutationResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { error } = await callRpc<Database["public"]["Functions"]["add_saved_talent_to_shortlist"]["Returns"]>(
    userClient,
    "add_saved_talent_to_shortlist",
    {
    p_shortlist_id: shortlistId,
    p_slug: slug,
    },
  );

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
    };
  }

  return { ok: true };
}

export async function removeSavedTalentFromShortlist(accessToken: string | null | undefined, shortlistId: string, slug: string): Promise<ShortlistMemberMutationResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await callRpc<Database["public"]["Functions"]["remove_saved_talent_from_shortlist"]["Returns"]>(
    userClient,
    "remove_saved_talent_from_shortlist",
    {
    p_shortlist_id: shortlistId,
    p_slug: slug,
    },
  );

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
    };
  }

  return {
    ok: true,
    removed: data?.[0]?.removed ?? false,
  };
}

export async function getEmployerSavedTalentAndShortlistCounts(
  accessToken: string | null | undefined,
): Promise<{
  ok: boolean;
  reason?: SavedTalentErrorReason;
  message?: string;
  savedTalentCount: number;
  activeShortlists: number;
}> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return {
      ok: false,
      reason: "not_signed_in",
      message: "Sign in required.",
      savedTalentCount: 0,
      activeShortlists: 0,
    };
  }

  const [savedResult, shortlistResult] = await Promise.all([
    callRpc<ListSavedRow[]>(userClient, "list_saved_talent_for_employer", {
      p_shortlist_id: null,
    }),
    callRpc<ListShortlistRow[]>(userClient, "list_employer_shortlists"),
  ]);

  if (savedResult.error) {
    return {
      ok: false,
      reason: mapReasonFromError(savedResult.error.message),
      message: savedResult.error.message,
      savedTalentCount: 0,
      activeShortlists: 0,
    };
  }

  if (shortlistResult.error) {
    return {
      ok: false,
      reason: mapReasonFromError(shortlistResult.error.message),
      message: shortlistResult.error.message,
      savedTalentCount: 0,
      activeShortlists: 0,
    };
  }

  const savedTalentCount = (savedResult.data ?? []).length;
  const activeShortlists = (shortlistResult.data ?? []).filter((item) => (item.member_count ?? 0) > 0).length;

  return {
    ok: true,
    savedTalentCount,
    activeShortlists,
  };
}
