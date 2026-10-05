import "server-only";

import { sendTalentReferenceInvitationEmail } from "@/lib/send-reference-invitation-email";
import { createServiceRoleSupabaseClient, createUserServerSupabaseClient } from "@/lib/server-supabase";
import { FREEAGENTSTAFF_PRODUCTION_ORIGIN, getConfiguredSiteUrl } from "@/lib/site-url";
import {
  generateTalentReferenceInvitationToken,
  hashTalentReferenceInvitationToken,
} from "@/lib/talent-reference-token";
import type { Json } from "@/types/supabase";
import { loadPrivateAccess } from "@/lib/private-access";
import type {
  PassportTalentReference,
  TalentReferenceAnswers,
  TalentReferenceOwnerStatus,
  TalentReferenceOwnerView,
  TalentReferenceWouldWorkAgain,
} from "@/types/talent-references";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OwnerRpcRow = {
  reference_id: string;
  referee_name: string;
  job_title: string | null;
  company: string | null;
  relationship: string | null;
  referee_email: string;
  status: string;
  invitation_expires_at: string | null;
  invitation_sent_at: string | null;
  invitation_revoked_at: string | null;
  invitation_pending: boolean;
  submitted_at: string | null;
  answers: Json | null;
  share_with_connected_employers: boolean;
  talent_display_name: string;
  created_at: string;
  updated_at: string;
};

type Failure = {
  ok: false;
  reason: string;
  message: string;
};

function fail(reason: string, message: string): Failure {
  return { ok: false, reason, message };
}

function invitationOrigin() {
  return getConfiguredSiteUrl() || FREEAGENTSTAFF_PRODUCTION_ORIGIN;
}

function mapRpcError(message: string | undefined): Failure {
  const code = (message ?? "").trim();

  if (code === "not_signed_in") {
    return fail("not_signed_in", "Sign in required.");
  }
  if (code === "wrong_account_type") {
    return fail("wrong_account_type", "References are available on Talent accounts.");
  }
  if (code === "pending_reference_limit") {
    return fail("pending_reference_limit", "You can have up to 10 pending reference requests.");
  }
  if (code === "missing_talent_display_name") {
    return fail("missing_talent_display_name", "Add your name in Basic Information before requesting a reference.");
  }
  if (code === "missing_referee_name") {
    return fail("invalid_input", "Enter the referee's name.");
  }
  if (code === "missing_referee_email") {
    return fail("invalid_input", "Enter the referee's email address.");
  }
  if (code === "reference_not_found") {
    return fail("reference_not_found", "That reference could not be found.");
  }
  if (code === "reference_not_shareable") {
    return fail("reference_not_shareable", "Only a submitted reference can be shared with connected Employers.");
  }
  if (code === "invitation_cooldown") {
    return fail("invitation_cooldown", "Please wait 60 seconds before sending another invitation.");
  }
  if (code === "invalid_state") {
    return fail("invalid_state", "This reference cannot be invited again.");
  }

  return fail("error", "Unable to update references right now.");
}

function parseWouldWorkAgain(value: unknown): TalentReferenceWouldWorkAgain | null {
  if (value === "yes" || value === "no" || value === "prefer_not_to_say") {
    return value;
  }
  return null;
}

function parseRating(value: unknown): 1 | 2 | 3 | 4 | 5 | null {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
    return value;
  }
  if (value === "1" || value === "2" || value === "3" || value === "4" || value === "5") {
    return Number(value) as 1 | 2 | 3 | 4 | 5;
  }
  return null;
}

export function parseTalentReferenceAnswers(value: Json | null | undefined): TalentReferenceAnswers | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const professionalRelationship = typeof row.professionalRelationship === "string" ? row.professionalRelationship : "";
  const workedTogetherDuration = typeof row.workedTogetherDuration === "string" ? row.workedTogetherDuration : "";
  const keyStrengths = typeof row.keyStrengths === "string" ? row.keyStrengths : "";
  const reliabilityRating = parseRating(row.reliabilityRating);
  const teamworkRating = parseRating(row.teamworkRating);
  const wouldWorkAgain = parseWouldWorkAgain(row.wouldWorkAgain);
  const additionalComments = typeof row.additionalComments === "string" ? row.additionalComments : row.additionalComments === null ? null : null;

  if (!professionalRelationship || !workedTogetherDuration || !keyStrengths || !reliabilityRating || !teamworkRating || !wouldWorkAgain) {
    return null;
  }

  return {
    professionalRelationship,
    workedTogetherDuration,
    keyStrengths,
    reliabilityRating,
    teamworkRating,
    wouldWorkAgain,
    additionalComments,
    confirmation: true,
  };
}

function mapOwnerRow(row: OwnerRpcRow): TalentReferenceOwnerView {
  return {
    id: row.reference_id,
    refereeName: row.referee_name,
    jobTitle: row.job_title,
    company: row.company,
    relationship: row.relationship,
    refereeEmail: row.referee_email,
    status: (row.status === "submitted" || row.status === "cancelled" ? row.status : "pending") as TalentReferenceOwnerStatus,
    invitationExpiresAt: row.invitation_expires_at,
    invitationSentAt: row.invitation_sent_at,
    invitationRevokedAt: row.invitation_revoked_at,
    invitationLive: row.invitation_pending === true,
    submittedAt: row.submitted_at,
    answers: parseTalentReferenceAnswers(row.answers),
    shareWithConnectedEmployers: row.share_with_connected_employers === true,
    talentDisplayName: row.talent_display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function authenticateTalent(accessToken: string | null | undefined) {
  if (!accessToken) {
    return fail("not_signed_in", "Sign in required.");
  }

  const userClient = createUserServerSupabaseClient(accessToken);
  const { data, error } = await userClient.auth.getUser(accessToken);
  if (error || !data.user) {
    return fail("not_signed_in", "Sign in required.");
  }

  return { ok: true as const, userId: data.user.id, userClient };
}

async function ownerRpc<T>(userClient: ReturnType<typeof createUserServerSupabaseClient>, name: string, args?: Record<string, unknown>) {
  return userClient.rpc(name as never, (args ?? {}) as never) as unknown as Promise<{ data: T | null; error: { message: string } | null }>;
}

export async function listTalentOwnerReferences(accessToken: string | null | undefined) {
  const auth = await authenticateTalent(accessToken);
  if (!auth.ok) {
    return auth;
  }

  const { data, error } = await ownerRpc<OwnerRpcRow[]>(auth.userClient, "list_talent_references");
  if (error) {
    return mapRpcError(error.message);
  }

  const references = (data ?? [])
    .map(mapOwnerRow)
    .filter((row) => row.status !== "cancelled");

  return { ok: true as const, references };
}

export async function createTalentOwnerReference(
  accessToken: string | null | undefined,
  input: {
    refereeName: string;
    jobTitle?: string;
    company?: string;
    relationship?: string;
    refereeEmail: string;
  },
) {
  const refereeName = input.refereeName.trim();
  const refereeEmail = input.refereeEmail.trim();
  const jobTitle = input.jobTitle?.trim() || null;
  const company = input.company?.trim() || null;
  const relationship = input.relationship?.trim() || null;

  if (!refereeName) {
    return fail("invalid_input", "Enter the referee's name.");
  }
  if (!EMAIL_PATTERN.test(refereeEmail)) {
    return fail("invalid_input", "Enter a valid referee email address.");
  }

  const auth = await authenticateTalent(accessToken);
  if (!auth.ok) {
    return auth;
  }

  const { data, error } = await ownerRpc<OwnerRpcRow[]>(auth.userClient, "create_talent_reference", {
    p_referee_name: refereeName,
    p_job_title: jobTitle,
    p_company: company,
    p_relationship: relationship,
    p_referee_email: refereeEmail,
  });

  if (error) {
    return mapRpcError(error.message);
  }

  const row = data?.[0];
  if (!row) {
    return fail("error", "Unable to create the reference request.");
  }

  return { ok: true as const, reference: mapOwnerRow(row) };
}

async function loadOwnedPendingReference(
  userClient: ReturnType<typeof createUserServerSupabaseClient>,
  referenceId: string,
) {
  const listed = await ownerRpc<OwnerRpcRow[]>(userClient, "list_talent_references");
  if (listed.error) {
    return mapRpcError(listed.error.message);
  }

  const row = (listed.data ?? []).find((item) => item.reference_id === referenceId);
  if (!row) {
    return fail("reference_not_found", "That reference could not be found.");
  }

  const mapped = mapOwnerRow(row);
  if (mapped.status !== "pending") {
    return fail("invalid_state", "Invitations can only be sent for pending reference requests.");
  }

  return { ok: true as const, reference: mapped };
}

export async function sendTalentOwnerReferenceInvitation(
  accessToken: string | null | undefined,
  referenceId: string,
) {
  const auth = await authenticateTalent(accessToken);
  if (!auth.ok) {
    return auth;
  }

  const existing = await loadOwnedPendingReference(auth.userClient, referenceId);
  if (!existing.ok) {
    return existing;
  }

  const serviceClient = createServiceRoleSupabaseClient();
  if (!serviceClient) {
    return fail("error", "Reference invitations are temporarily unavailable.");
  }

  const rawToken = generateTalentReferenceInvitationToken();
  const tokenHash = hashTalentReferenceInvitationToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  const invitationUrl = `${invitationOrigin()}/reference/${rawToken}`;

  const { error: prepareError } = await serviceClient.rpc(
    "service_prepare_talent_reference_invitation" as never,
    {
      p_reference_id: referenceId,
      p_talent_user_id: auth.userId,
    } as never,
  );

  if (prepareError) {
    return mapRpcError(prepareError.message);
  }

  const emailed = await sendTalentReferenceInvitationEmail({
    refereeEmail: existing.reference.refereeEmail,
    refereeName: existing.reference.refereeName,
    talentDisplayName: existing.reference.talentDisplayName,
    invitationUrl,
  });

  if (!emailed.ok) {
    return fail("invite_failed", emailed.message);
  }

  const { error: activateError } = await serviceClient.rpc(
    "service_activate_talent_reference_invitation" as never,
    {
      p_reference_id: referenceId,
      p_talent_user_id: auth.userId,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
    } as never,
  );

  if (activateError) {
    console.error("sendTalentOwnerReferenceInvitation: activation failed after email send.");
    return fail(
      "invite_failed",
      "The invitation email was sent, but it is not active yet. Please retry so a new invitation can be issued.",
    );
  }

  const refreshed = await loadOwnedPendingReference(auth.userClient, referenceId);
  if (!refreshed.ok) {
    return {
      ok: true as const,
      reference: {
        ...existing.reference,
        invitationLive: true,
        invitationSentAt: new Date().toISOString(),
        invitationExpiresAt: expiresAt,
        invitationRevokedAt: null,
      },
    };
  }

  return { ok: true as const, reference: refreshed.reference };
}

export async function createAndInviteTalentOwnerReference(
  accessToken: string | null | undefined,
  input: {
    refereeName: string;
    jobTitle?: string;
    company?: string;
    relationship?: string;
    refereeEmail: string;
  },
) {
  const created = await createTalentOwnerReference(accessToken, input);
  if (!created.ok) {
    return created;
  }

  const invited = await sendTalentOwnerReferenceInvitation(accessToken, created.reference.id);
  if (!invited.ok) {
    return {
      ok: false as const,
      reason: invited.reason,
      message: invited.message,
      reference: created.reference,
    };
  }

  return invited;
}

export async function deleteTalentOwnerReference(accessToken: string | null | undefined, referenceId: string) {
  const auth = await authenticateTalent(accessToken);
  if (!auth.ok) {
    return auth;
  }

  const { data, error } = await ownerRpc<Array<{ success: boolean; action: string; reference_id: string; status: string }>>(
    auth.userClient,
    "talent_delete_reference",
    { p_reference_id: referenceId },
  );

  if (error) {
    return mapRpcError(error.message);
  }

  const row = data?.[0];
  if (!row?.success) {
    return fail("error", "Unable to remove that reference.");
  }

  return { ok: true as const, action: row.action, referenceId: row.reference_id };
}

export async function setTalentOwnerReferenceSharing(
  accessToken: string | null | undefined,
  referenceId: string,
  share: boolean,
) {
  const auth = await authenticateTalent(accessToken);
  if (!auth.ok) {
    return auth;
  }

  const { data, error } = await ownerRpc<Array<{
    success: boolean;
    reference_id: string;
    status: string;
    share_with_connected_employers: boolean;
  }>>(auth.userClient, "talent_set_reference_sharing", {
    p_reference_id: referenceId,
    p_share: share,
  });

  if (error) {
    return mapRpcError(error.message);
  }

  const row = data?.[0];
  if (!row?.success) {
    return fail("error", "Unable to update sharing.");
  }

  return {
    ok: true as const,
    referenceId: row.reference_id,
    shareWithConnectedEmployers: row.share_with_connected_employers,
    status: row.status,
  };
}

function toOwnerPassportReference(row: TalentReferenceOwnerView): PassportTalentReference {
  return {
    refereeName: row.refereeName,
    jobTitle: row.jobTitle,
    company: row.company,
    answers: row.answers,
    shareWithConnectedEmployers: row.shareWithConnectedEmployers,
  };
}

export async function listPassportTalentReferences(
  accessToken: string | null | undefined,
  slug: string,
): Promise<{ ok: true; viewer: "owner" | "employer" | null; references: PassportTalentReference[] }> {
  const empty = { ok: true as const, viewer: null, references: [] as PassportTalentReference[] };
  const trimmedSlug = slug.trim();
  if (!accessToken || !trimmedSlug) {
    return empty;
  }

  const access = await loadPrivateAccess(accessToken, trimmedSlug);
  if (!access.ok || !access.state) {
    return empty;
  }

  if (access.state.isOwner || access.state.status === "owner_full") {
    const listed = await listTalentOwnerReferences(accessToken);
    if (!listed.ok) {
      return empty;
    }

    return {
      ok: true,
      viewer: "owner",
      references: listed.references
        .filter((row) => row.status === "submitted")
        .map(toOwnerPassportReference),
    };
  }

  if (access.state.status !== "accepted") {
    return empty;
  }

  const userClient = createUserServerSupabaseClient(accessToken);
  const { data, error } = await ownerRpc<Array<{
    referee_name: string;
    job_title: string | null;
    company: string | null;
    answers: Json | null;
  }>>(userClient, "list_connected_talent_references", { p_talent_slug: trimmedSlug });

  if (error) {
    return empty;
  }

  return {
    ok: true,
    viewer: "employer",
    references: (data ?? []).map((row) => ({
      refereeName: row.referee_name,
      jobTitle: row.job_title,
      company: row.company,
      answers: parseTalentReferenceAnswers(row.answers),
    })),
  };
}
