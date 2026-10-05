import "server-only";

import { headers } from "next/headers";
import { consumeBestEffortReferenceRateLimit, getClientIp } from "@/lib/best-effort-rate-limit";
import { firstNameFromDisplayName, validateTalentReferenceSubmission } from "@/lib/talent-reference-answers";
import {
  hashTalentReferenceInvitationToken,
  normalizeTalentReferenceInvitationToken,
} from "@/lib/talent-reference-token";
import { createServiceRoleSupabaseClient } from "@/lib/server-supabase";

export type PublicReferenceInvitationState = "valid" | "expired" | "invalid";

export type PublicReferenceInvitationView = {
  state: PublicReferenceInvitationState;
  talentDisplayName: string | null;
  talentFirstName: string | null;
};

type LookupRow = {
  invitation_state: string;
  talent_display_name: string | null;
  invitation_expires_at: string | null;
};

function emptyInvalid(): PublicReferenceInvitationView {
  return {
    state: "invalid",
    talentDisplayName: null,
    talentFirstName: null,
  };
}

function mapLookup(row: LookupRow | undefined): PublicReferenceInvitationView {
  if (!row || (row.invitation_state !== "valid" && row.invitation_state !== "expired")) {
    return emptyInvalid();
  }

  const talentDisplayName = row.talent_display_name?.trim() || null;
  return {
    state: row.invitation_state,
    talentDisplayName,
    talentFirstName: firstNameFromDisplayName(talentDisplayName) || null,
  };
}

export async function lookupPublicTalentReferenceInvitation(
  rawToken: string | null | undefined,
  requestHeaders?: Headers,
): Promise<PublicReferenceInvitationView> {
  const token = normalizeTalentReferenceInvitationToken(rawToken);
  if (!token) {
    return emptyInvalid();
  }

  const tokenHash = hashTalentReferenceInvitationToken(token);
  const headerStore = requestHeaders ?? (await headers());
  const limited = consumeBestEffortReferenceRateLimit({
    action: "lookup",
    ip: getClientIp(headerStore),
    tokenHash,
  });
  if (!limited.ok) {
    return emptyInvalid();
  }

  const serviceClient = createServiceRoleSupabaseClient();
  if (!serviceClient) {
    return emptyInvalid();
  }

  const { data, error } = await serviceClient.rpc(
    "service_lookup_talent_reference_invitation" as never,
    { p_token_hash: tokenHash } as never,
  );

  if (error) {
    console.error("lookupPublicTalentReferenceInvitation: lookup failed.");
    return emptyInvalid();
  }

  const rows = data as LookupRow[] | null;
  return mapLookup(rows?.[0]);
}

export async function submitPublicTalentReferenceInvitation(
  rawToken: string | null | undefined,
  answersInput: unknown,
  requestHeaders: Headers,
): Promise<{ ok: true } | { ok: false; reason: "invalid" | "invalid_answers" | "rate_limited"; message: string }> {
  const answers = validateTalentReferenceSubmission(answersInput);
  if (!answers) {
    return {
      ok: false,
      reason: "invalid_answers",
      message: "Please complete the required reference fields.",
    };
  }

  const token = normalizeTalentReferenceInvitationToken(rawToken);
  if (!token) {
    return {
      ok: false,
      reason: "invalid",
      message: "This reference invitation is invalid or no longer available.",
    };
  }

  const tokenHash = hashTalentReferenceInvitationToken(token);
  const limited = consumeBestEffortReferenceRateLimit({
    action: "submit",
    ip: getClientIp(requestHeaders),
    tokenHash,
  });
  if (!limited.ok) {
    return {
      ok: false,
      reason: "rate_limited",
      message: "Please wait a moment and try again.",
    };
  }

  const serviceClient = createServiceRoleSupabaseClient();
  if (!serviceClient) {
    return {
      ok: false,
      reason: "invalid",
      message: "This reference invitation is invalid or no longer available.",
    };
  }

  const { error } = await serviceClient.rpc(
    "service_submit_talent_reference" as never,
    {
      p_token_hash: tokenHash,
      p_answers: answers,
    } as never,
  );

  if (error) {
    const code = error.message?.trim();
    if (code === "invalid_answers") {
      return {
        ok: false,
        reason: "invalid_answers",
        message: "Please complete the required reference fields.",
      };
    }
    return {
      ok: false,
      reason: "invalid",
      message: "This reference invitation is invalid or no longer available.",
    };
  }

  return { ok: true };
}
