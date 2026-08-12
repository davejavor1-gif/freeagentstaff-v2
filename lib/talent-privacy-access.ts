import "server-only";

import { createUserServerSupabaseClient } from "@/lib/server-supabase";
import type { OpportunityStatus, ProfileVisibility } from "@/types/freeagent";
import type {
  TalentBlockedCompanyMutationResponse,
  TalentPrivacyErrorReason,
  TalentPrivacySettings,
  TalentPrivacySettingsResponse,
} from "@/types/talent-privacy";

type PrivacyRow = {
  account_type: "talent" | "employer";
  slug: string | null;
  visibility: ProfileVisibility | null;
  opportunity_status: OpportunityStatus | null;
  is_published: boolean | null;
  blocked_companies: string[] | null;
};

type UpdatePrivacyRow = {
  visibility: Exclude<ProfileVisibility, "employer_network">;
  opportunity_status: OpportunityStatus;
  is_published: boolean;
  blocked_companies: string[] | null;
};

type AddBlockedRow = {
  success: boolean;
  blocked_key: string;
  blocked_companies: string[] | null;
};

type RemoveBlockedRow = {
  success: boolean;
  removed: boolean;
  blocked_companies: string[] | null;
};

function getUserClient(accessToken: string | null | undefined) {
  if (!accessToken) {
    return null;
  }

  return createUserServerSupabaseClient(accessToken);
}

function normalizeVisibility(value: ProfileVisibility | null | undefined): Exclude<ProfileVisibility, "employer_network"> {
  if (value === "verified_employer_network" || value === "confidential" || value === "public") {
    return value;
  }

  return "public";
}

function normalizeOpportunityStatus(value: string | null | undefined): OpportunityStatus {
  if (value === "actively_open" || value === "exploring" || value === "not_open") {
    return value;
  }

  return "actively_open";
}

function mapReasonFromError(message: string): TalentPrivacyErrorReason {
  if (message.includes("not_signed_in")) return "not_signed_in";
  if (message.includes("wrong_account_type")) return "wrong_account_type";
  if (message.includes("invalid_visibility")) return "invalid_visibility";
  if (message.includes("invalid_opportunity_status")) return "invalid_opportunity_status";
  if (message.includes("invalid_block_identifier")) return "invalid_block_identifier";
  if (message.includes("missing_publish_state")) return "missing_publish_state";
  if (message.includes("missing_block_key")) return "missing_block_key";
  if (message.includes("talent_privacy_fields_protected")) return "talent_privacy_fields_protected";
  return "error";
}

function mapSettings(row: PrivacyRow | UpdatePrivacyRow, slug: string | null): TalentPrivacySettings {
  return {
    slug,
    visibility: normalizeVisibility(row.visibility),
    opportunityStatus: normalizeOpportunityStatus(row.opportunity_status),
    isPublished: row.is_published ?? false,
    blockedCompanies: row.blocked_companies ?? [],
  };
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

export async function getTalentPrivacySettings(
  accessToken: string | null | undefined,
): Promise<TalentPrivacySettingsResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await userClient
    .from("profiles")
    .select("account_type, slug, visibility, opportunity_status, is_published, blocked_companies")
    .maybeSingle<PrivacyRow>();

  if (error) {
    return { ok: false, reason: "error", message: error.message };
  }

  if (!data) {
    return { ok: false, reason: "error", message: "Unable to load privacy settings." };
  }

  if (data.account_type !== "talent") {
    return { ok: false, reason: "wrong_account_type", message: "Only talent accounts can manage privacy settings." };
  }

  return {
    ok: true,
    settings: mapSettings(data, data.slug),
  };
}

export async function updateTalentPrivacySettings(
  accessToken: string | null | undefined,
  visibility: string,
  opportunityStatus: string,
  isPublished: boolean,
): Promise<TalentPrivacySettingsResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const currentSettings = await getTalentPrivacySettings(accessToken);
  if (!currentSettings.ok || !currentSettings.settings) {
    return currentSettings;
  }

  const { data, error } = await callRpc<UpdatePrivacyRow[]>(userClient, "update_talent_privacy_settings", {
    p_visibility: visibility,
    p_opportunity_status: opportunityStatus,
    p_is_published: isPublished,
  });

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
      message: "Unable to update privacy settings.",
    };
  }

  return {
    ok: true,
    settings: mapSettings(row, currentSettings.settings.slug),
  };
}

export async function addTalentBlockedCompany(
  accessToken: string | null | undefined,
  identifier: string,
): Promise<TalentBlockedCompanyMutationResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await callRpc<AddBlockedRow[]>(userClient, "add_talent_blocked_company", {
    p_identifier: identifier,
  });

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
    blockedKey: row?.blocked_key,
    blockedCompanies: row?.blocked_companies ?? [],
  };
}

export async function removeTalentBlockedCompany(
  accessToken: string | null | undefined,
  key: string,
): Promise<TalentBlockedCompanyMutationResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await callRpc<RemoveBlockedRow[]>(userClient, "remove_talent_blocked_company", {
    p_key: key,
  });

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
    removed: row?.removed ?? false,
    blockedCompanies: row?.blocked_companies ?? [],
  };
}