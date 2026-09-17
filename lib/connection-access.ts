import "server-only";

import { createServiceRoleSupabaseClient, createUserServerSupabaseClient } from "@/lib/server-supabase";
import { normalizeAvailability } from "@/lib/talent-profile-options";
import type {
  ConnectionErrorReason,
  EmployerConnectionItem,
  EmployerConnectionsResponse,
  TalentConnectionItem,
  TalentConnectionMutationResponse,
  TalentConnectionsResponse,
  TalentContactErrorReason,
  TalentContactResponse,
} from "@/types/connections";

type ContactRow = {
  talent_slug: string;
  email: string;
};

type EmployerConnectionRow = {
  connection_id: string;
  status: "active" | "revoked";
  connected_at: string;
  revoked_at: string | null;
  is_currently_eligible: boolean;
  talent_slug: string | null;
  access_scope: "employer_full" | "employer_confidential" | null;
  visibility: "public" | "verified_employer_network" | "confidential" | null;
  verification_status: "unverified" | "pending" | "verified" | "rejected" | null;
  availability: string | null;
  opportunity_status: "actively_open" | "exploring" | "not_open" | null;
  experience_years: number | null;
  focus_area: string | null;
  top_strength: string | null;
  skills: string[] | null;
  location: string | null;
  name: string | null;
  title: string | null;
  summary: string | null;
  current_employer: string | null;
};

type TalentConnectionRow = {
  connection_id: string;
  status: "active" | "revoked";
  connected_at: string;
  revoked_at: string | null;
  employer_company_name: string | null;
  employer_contact_name: string | null;
  employer_contact_role: string | null;
};

type RevokeConnectionRow = {
  connection_id: string;
  status: "active" | "revoked";
  revoked_at: string | null;
  revoked_by: "talent" | null;
};

function mapReasonFromError(message: string): TalentContactErrorReason {
  if (message.includes("not_signed_in")) return "not_signed_in";
  if (message.includes("wrong_account_type")) return "wrong_account_type";
  if (message.includes("unverified_employer")) return "unverified_employer";
  if (message.includes("invalid_abn")) return "invalid_abn";
  if (message.includes("missing_slug")) return "missing_slug";
  if (message.includes("contact_unavailable")) return "contact_unavailable";
  return "error";
}

function mapConnectionReasonFromError(message: string): ConnectionErrorReason {
  if (message.includes("not_signed_in")) return "not_signed_in";
  if (message.includes("wrong_account_type")) return "wrong_account_type";
  if (message.includes("unverified_employer")) return "unverified_employer";
  if (message.includes("invalid_abn")) return "invalid_abn";
  if (message.includes("missing_connection_id")) return "missing_connection_id";
  if (message.includes("connection_not_found")) return "connection_not_found";
  if (message.includes("not_authorized_connection")) return "not_authorized_connection";
  if (message.includes("invalid_state")) return "invalid_state";
  return "error";
}

function getUserClient(accessToken: string | null | undefined) {
  if (!accessToken) {
    return null;
  }

  return createUserServerSupabaseClient(accessToken);
}

function mapEmployerConnectionItem(row: EmployerConnectionRow): EmployerConnectionItem {
  const talent = row.talent_slug && row.access_scope && row.visibility
    ? {
        slug: row.talent_slug,
        accessScope: row.access_scope,
        visibility: row.visibility,
        verificationStatus: row.verification_status ?? "unverified",
        availability: normalizeAvailability(row.availability, row.opportunity_status),
        opportunityStatus: row.opportunity_status ?? "actively_open",
        experienceYears: row.experience_years ?? 0,
        focusArea: row.focus_area ?? "",
        topStrength: row.top_strength ?? "",
        skills: row.skills ?? [],
        location: row.location ?? "",
        name: row.name,
        title: row.title,
        summary: row.summary,
        currentEmployer: row.current_employer,
      }
    : null;

  return {
    connectionId: row.connection_id,
    status: row.status,
    connectedAt: row.connected_at,
    revokedAt: row.revoked_at,
    isCurrentlyEligible: row.is_currently_eligible,
    talent,
  };
}

function mapTalentConnectionItem(row: TalentConnectionRow): TalentConnectionItem {
  return {
    connectionId: row.connection_id,
    status: row.status,
    connectedAt: row.connected_at,
    revokedAt: row.revoked_at,
    employerCompanyName: row.employer_company_name,
    employerContactName: row.employer_contact_name,
    employerContactRole: row.employer_contact_role,
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

export async function loadTalentContactForConnectedEmployer(
  accessToken: string | null | undefined,
  slug: string,
): Promise<TalentContactResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await (userClient as unknown as {
    rpc: (name: string, params?: Record<string, unknown>) => Promise<{ data: ContactRow[] | null; error: { message: string } | null }>;
  }).rpc("talent_contact_for_connected_employer", {
    p_talent_slug: slug,
  });

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
    };
  }

  const row = data?.[0];
  if (!row?.talent_slug || !row.email) {
    return {
      ok: false,
      reason: "contact_unavailable",
      message: "Contact details are currently unavailable.",
    };
  }

  return {
    ok: true,
    contact: {
      talentSlug: row.talent_slug,
      email: row.email,
    },
  };
}

export async function listEmployerConnections(
  accessToken: string | null | undefined,
): Promise<EmployerConnectionsResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required.", items: [] };
  }

  const { data, error } = await callRpc<EmployerConnectionRow[]>(userClient, "list_employer_connections");

  if (error) {
    return {
      ok: false,
      reason: mapConnectionReasonFromError(error.message),
      message: error.message,
      items: [],
    };
  }

  return {
    ok: true,
    items: (data ?? []).map(mapEmployerConnectionItem),
  };
}

export async function listTalentConnections(
  accessToken: string | null | undefined,
): Promise<TalentConnectionsResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required.", items: [] };
  }

  const { data, error } = await callRpc<TalentConnectionRow[]>(userClient, "list_talent_connections");

  if (error) {
    return {
      ok: false,
      reason: mapConnectionReasonFromError(error.message),
      message: error.message,
      items: [],
    };
  }

  return {
    ok: true,
    items: (data ?? []).map(mapTalentConnectionItem),
  };
}

export async function revokeTalentConnection(
  accessToken: string | null | undefined,
  connectionId: string,
): Promise<TalentConnectionMutationResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  if (!connectionId.trim()) {
    return { ok: false, reason: "missing_connection_id", message: "Connection id is required." };
  }

  const { data, error } = await callRpc<RevokeConnectionRow[]>(userClient, "talent_revoke_connection", {
    p_connection_id: connectionId,
  });

  if (error) {
    return {
      ok: false,
      reason: mapConnectionReasonFromError(error.message),
      message: error.message,
    };
  }

  const row = data?.[0];
  if (!row) {
    return {
      ok: false,
      reason: "error",
      message: "Unable to revoke connection.",
    };
  }

  return {
    ok: true,
    connectionId: row.connection_id,
    status: row.status,
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by,
  };
}

export async function revokeEmployerConnection(
  accessToken: string | null | undefined,
  connectionId: string,
): Promise<TalentConnectionMutationResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  if (!connectionId.trim()) {
    return { ok: false, reason: "missing_connection_id", message: "Connection id is required." };
  }

  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken ?? undefined);
  if (userError || !userData.user) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data: profileRow } = await userClient
    .from("profiles")
    .select("account_type")
    .eq("user_id", userData.user.id)
    .maybeSingle<{ account_type: "talent" | "employer" }>();

  if (profileRow?.account_type !== "employer") {
    return { ok: false, reason: "wrong_account_type", message: "Employer account required." };
  }

  const listed = await listEmployerConnections(accessToken);
  if (!listed.ok) {
    return { ok: false, reason: listed.reason ?? "error", message: listed.message ?? "Unable to revoke connection." };
  }

  const item = listed.items.find((connection) => connection.connectionId === connectionId);
  if (!item) {
    return { ok: false, reason: "connection_not_found", message: "Connection not found." };
  }

  if (item.status === "revoked") {
    return {
      ok: true,
      connectionId: item.connectionId,
      status: item.status,
      revokedAt: item.revokedAt,
      revokedBy: null,
    };
  }

  if (item.status !== "active") {
    return { ok: false, reason: "invalid_state", message: "This connection cannot be disconnected." };
  }

  const serviceClient = createServiceRoleSupabaseClient();
  if (!serviceClient) {
    return { ok: false, reason: "error", message: "Unable to revoke connection." };
  }

  const now = new Date().toISOString();
  const { data: updatedRow, error } = await serviceClient
    .from("employer_talent_connections")
    .update({
      status: "revoked",
      revoked_at: now,
      revoked_by: null,
    } as never)
    .eq("id", connectionId)
    .eq("employer_user_id", userData.user.id)
    .eq("status", "active")
    .select("id, status, revoked_at, revoked_by, talent_user_id")
    .maybeSingle();

  const updated = updatedRow as {
    id: string;
    status: "active" | "revoked";
    revoked_at: string | null;
    revoked_by: "talent" | null;
    talent_user_id: string;
  } | null;

  if (error || !updated) {
    return {
      ok: false,
      reason: mapConnectionReasonFromError(error?.message ?? "connection_not_found"),
      message: error?.message ?? "Unable to revoke connection.",
    };
  }

  const privateAccessClient = serviceClient as unknown as {
    from: (table: "talent_private_access_requests") => {
      update: (values: Record<string, unknown>) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
    };
  };

  await privateAccessClient
    .from("talent_private_access_requests")
    .update({
      status: "revoked",
      revoked_at: now,
      updated_at: now,
    })
    .eq("employer_user_id", userData.user.id)
    .eq("talent_user_id", updated.talent_user_id)
    .eq("status", "accepted");

  return {
    ok: true,
    connectionId: updated.id,
    status: updated.status,
    revokedAt: updated.revoked_at,
    revokedBy: updated.revoked_by,
  };
}

export async function revokeConnectionForViewer(
  accessToken: string | null | undefined,
  connectionId: string,
): Promise<TalentConnectionMutationResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken ?? undefined);
  if (userError || !userData.user) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data: profileRow } = await userClient
    .from("profiles")
    .select("account_type")
    .eq("user_id", userData.user.id)
    .maybeSingle<{ account_type: "talent" | "employer" }>();

  if (profileRow?.account_type === "employer") {
    return revokeEmployerConnection(accessToken, connectionId);
  }

  return revokeTalentConnection(accessToken, connectionId);
}
