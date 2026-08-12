import "server-only";

import type {
  CreateIntroductionRequestResponse,
  EmployerIntroductionRequestItem,
  EmployerIntroductionRequestsResponse,
  IntroductionRequestErrorReason,
  IntroductionRequestMutationResponse,
  IntroductionRequestStatus,
  TalentIntroductionRequestItem,
  TalentIntroductionRequestsResponse,
} from "@/types/introduction-requests";
import { createUserServerSupabaseClient } from "@/lib/server-supabase";

type CreateRequestRow = {
  success: boolean;
  already_exists: boolean;
  request_id: string;
  status: IntroductionRequestStatus;
  created_at: string;
};

type EmployerRequestListRow = {
  request_id: string;
  talent_user_id: string;
  talent_slug: string;
  talent_name: string;
  status: IntroductionRequestStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  withdrawn_at: string | null;
  access_scope: "employer_full" | "employer_confidential" | null;
  is_currently_eligible: boolean;
};

type TalentRequestListRow = {
  request_id: string;
  employer_user_id: string;
  employer_company_name: string | null;
  employer_contact_name: string | null;
  employer_contact_role: string | null;
  status: IntroductionRequestStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  withdrawn_at: string | null;
  can_talent_respond: boolean;
};

type WithdrawRow = {
  success: boolean;
  status: IntroductionRequestStatus;
  withdrawn_at: string | null;
};

type RespondRow = {
  success: boolean;
  status: IntroductionRequestStatus;
  responded_at: string | null;
};

function mapReasonFromError(message: string): IntroductionRequestErrorReason {
  if (message.includes("not_signed_in")) return "not_signed_in";
  if (message.includes("wrong_account_type")) return "wrong_account_type";
  if (message.includes("unverified_employer")) return "unverified_employer";
  if (message.includes("invalid_abn")) return "invalid_abn";
  if (message.includes("missing_slug")) return "missing_slug";
  if (message.includes("candidate_not_found")) return "candidate_not_found";
  if (message.includes("request_not_found")) return "request_not_found";
  if (message.includes("invalid_state")) return "invalid_state";
  if (message.includes("invalid_status")) return "invalid_status";
  if (message.includes("not_authorized_for_candidate")) return "not_authorized_for_candidate";
  if (message.includes("relationship_no_longer_eligible")) return "relationship_no_longer_eligible";
  if (message.includes("cannot_request_self")) return "cannot_request_self";
  return "error";
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

function mapEmployerItem(row: EmployerRequestListRow): EmployerIntroductionRequestItem {
  return {
    requestId: row.request_id,
    talentUserId: row.talent_user_id,
    talentSlug: row.talent_slug,
    talentName: row.talent_name,
    status: row.status,
    message: row.message ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    respondedAt: row.responded_at,
    withdrawnAt: row.withdrawn_at,
    accessScope: row.access_scope,
    isCurrentlyEligible: row.is_currently_eligible,
  };
}

function mapTalentItem(row: TalentRequestListRow): TalentIntroductionRequestItem {
  return {
    requestId: row.request_id,
    employerUserId: row.employer_user_id,
    employerCompanyName: row.employer_company_name,
    employerContactName: row.employer_contact_name,
    employerContactRole: row.employer_contact_role,
    status: row.status,
    message: row.message ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    respondedAt: row.responded_at,
    withdrawnAt: row.withdrawn_at,
    canTalentRespond: row.can_talent_respond,
  };
}

export async function createIntroductionRequest(
  accessToken: string | null | undefined,
  slug: string,
  message?: string,
): Promise<CreateIntroductionRequestResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await callRpc<CreateRequestRow[]>(userClient, "create_employer_introduction_request", {
    p_slug: slug,
    p_message: message ?? null,
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
    alreadyExists: row?.already_exists ?? false,
    requestId: row?.request_id,
    status: row?.status,
    createdAt: row?.created_at,
  };
}

export async function listEmployerIntroductionRequests(
  accessToken: string | null | undefined,
): Promise<EmployerIntroductionRequestsResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required.", items: [] };
  }

  const { data, error } = await callRpc<EmployerRequestListRow[]>(
    userClient,
    "list_employer_introduction_requests",
  );

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
      items: [],
    };
  }

  return {
    ok: true,
    items: (data ?? []).map(mapEmployerItem),
  };
}

export async function withdrawIntroductionRequest(
  accessToken: string | null | undefined,
  requestId: string,
): Promise<IntroductionRequestMutationResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await callRpc<WithdrawRow[]>(
    userClient,
    "employer_withdraw_introduction_request",
    {
      p_request_id: requestId,
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
    requestId,
    status: row?.status,
    withdrawnAt: row?.withdrawn_at ?? null,
  };
}

export async function listTalentIntroductionRequests(
  accessToken: string | null | undefined,
): Promise<TalentIntroductionRequestsResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required.", items: [] };
  }

  const { data, error } = await callRpc<TalentRequestListRow[]>(
    userClient,
    "list_talent_introduction_requests",
  );

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
      items: [],
    };
  }

  return {
    ok: true,
    items: (data ?? []).map(mapTalentItem),
  };
}

async function respondToIntroductionRequest(
  accessToken: string | null | undefined,
  requestId: string,
  action: "accept" | "decline",
): Promise<IntroductionRequestMutationResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const functionName = action === "accept"
    ? "talent_accept_introduction_request"
    : "talent_decline_introduction_request";

  const { data, error } = await callRpc<RespondRow[]>(
    userClient,
    functionName,
    {
      p_request_id: requestId,
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
    requestId,
    status: row?.status,
    respondedAt: row?.responded_at ?? null,
  };
}

export async function acceptIntroductionRequest(
  accessToken: string | null | undefined,
  requestId: string,
): Promise<IntroductionRequestMutationResponse> {
  return respondToIntroductionRequest(accessToken, requestId, "accept");
}

export async function declineIntroductionRequest(
  accessToken: string | null | undefined,
  requestId: string,
): Promise<IntroductionRequestMutationResponse> {
  return respondToIntroductionRequest(accessToken, requestId, "decline");
}
