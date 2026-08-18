import "server-only";

import { createUserServerSupabaseClient } from "@/lib/server-supabase";
import type {
  AdminAccountDetail,
  AdminAccountDetailResponse,
  AdminAccountListItem,
  AdminAccountListQuery,
  AdminAccountListResponse,
  AdminDashboardResponse,
  AdminDashboardSummary,
  AdminResultReason,
} from "@/types/admin";
import type { Database } from "@/types/supabase";

type AdminSummaryRow = Database["public"]["Functions"]["admin_dashboard_summary"]["Returns"][number];
type AdminListRow = Database["public"]["Functions"]["admin_list_accounts"]["Returns"][number];
type AdminDetailRow = Database["public"]["Functions"]["admin_get_account"]["Returns"][number];

function getUserClient(accessToken: string | null | undefined) {
  if (!accessToken) {
    return null;
  }

  return createUserServerSupabaseClient(accessToken);
}

function mapReasonFromError(message: string): AdminResultReason {
  if (message.includes("not_authenticated") || message.includes("invalid jwt") || message.includes("JWT")) {
    return "not_authenticated";
  }

  if (message.includes("system_admin_required")) {
    return "system_admin_required";
  }

  if (message.includes("account_not_found") || message.includes("missing_user_id")) {
    return "not_found";
  }

  if (message.includes("invalid_account_type_filter") || message.includes("invalid_cursor")) {
    return "invalid_query";
  }

  return "error";
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

function mapDashboardSummary(row: AdminSummaryRow): AdminDashboardSummary {
  return {
    totalTalentAccounts: row.total_talent_accounts,
    publishedTalent: row.published_talent,
    unpublishedTalent: row.unpublished_talent,
    totalEmployerAccounts: row.total_employer_accounts,
    verifiedEmployers: row.verified_employers,
    pendingEmployers: row.pending_employers,
    rejectedEmployers: row.rejected_employers,
  };
}

function mapAccountListItem(row: AdminListRow): AdminAccountListItem {
  return {
    userId: row.user_id,
    accountType: row.account_type,
    displayName: row.display_name,
    secondaryLabel: row.secondary_label,
    email: row.email,
    slug: row.slug,
    isPublished: row.is_published,
    visibility: row.visibility,
    opportunityStatus: row.opportunity_status,
    employerVerificationStatus: row.employer_verification_status,
    verificationRequestedAt: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAccountDetail(row: AdminDetailRow): AdminAccountDetail {
  return {
    userId: row.user_id,
    accountType: row.account_type,
    email: row.email,
    slug: row.slug,
    displayName: row.display_name,
    secondaryLabel: row.secondary_label,
    isPublished: row.is_published,
    visibility: row.visibility,
    opportunityStatus: row.opportunity_status,
    employerVerificationStatus: row.employer_verification_status,
    name: row.name,
    title: row.title,
    location: row.location,
    availability: row.availability,
    topStrength: row.top_strength,
    focusArea: row.focus_area,
    summary: row.summary,
    currentEmployer: row.current_employer,
    experienceYears: row.experience_years,
    employerContactName: row.employer_contact_name,
    employerContactRole: row.employer_contact_role,
    employerCompanyName: row.employer_company_name,
    employerAbn: row.employer_abn,
    employerWebsite: row.employer_website,
    employerIndustry: row.employer_industry,
    employerCompanySize: row.employer_company_size,
    verificationRequestedAt: row.verification_requested_at,
    verificationReviewedAt: row.verification_reviewed_at,
    verificationReviewedBy: row.verification_reviewed_by,
    verificationRejectionReason: row.verification_rejection_reason,
    blockedCompanyCount: row.blocked_company_count,
    pendingIntroductionRequests: row.pending_introduction_requests,
    activeConnections: row.active_connections,
    savedTalentCount: row.saved_talent_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAdminDashboardSummary(
  accessToken: string | null | undefined,
): Promise<AdminDashboardResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_authenticated", message: "Sign in required." };
  }

  const { data, error } = await callRpc<AdminSummaryRow[]>(userClient, "admin_dashboard_summary");

  if (error) {
    return { ok: false, reason: mapReasonFromError(error.message), message: error.message };
  }

  const row = data?.[0];
  return {
    ok: true,
    summary: row ? mapDashboardSummary(row) : {
      totalTalentAccounts: 0,
      publishedTalent: 0,
      unpublishedTalent: 0,
      totalEmployerAccounts: 0,
      verifiedEmployers: 0,
      pendingEmployers: 0,
      rejectedEmployers: 0,
    },
  };
}

export async function listAdminAccounts(
  accessToken: string | null | undefined,
  query: AdminAccountListQuery = {},
): Promise<AdminAccountListResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_authenticated", message: "Sign in required.", items: [], nextCursor: null };
  }

  const limit = Number.isFinite(query.limit) ? Math.max(1, Math.min(50, Math.floor(query.limit as number))) : 25;

  const { data, error } = await callRpc<AdminListRow[]>(userClient, "admin_list_accounts", {
    p_query: query.query ?? null,
    p_account_type: query.accountType ?? null,
    p_limit: limit,
    p_after_created_at: query.cursor?.createdAt ?? null,
    p_after_user_id: query.cursor?.userId ?? null,
  });

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
      items: [],
      nextCursor: null,
    };
  }

  const items = (data ?? []).map(mapAccountListItem);
  const tail = items.at(-1);

  return {
    ok: true,
    items,
    nextCursor: tail
      ? {
          createdAt: tail.createdAt,
          userId: tail.userId,
        }
      : null,
  };
}

export async function getAdminAccount(
  accessToken: string | null | undefined,
  userId: string,
): Promise<AdminAccountDetailResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_authenticated", message: "Sign in required." };
  }

  if (!userId.trim()) {
    return { ok: false, reason: "not_found", message: "Account id is required." };
  }

  const { data, error } = await callRpc<AdminDetailRow[]>(userClient, "admin_get_account", {
    p_user_id: userId,
  });

  if (error) {
    return { ok: false, reason: mapReasonFromError(error.message), message: error.message };
  }

  const row = data?.[0];

  if (!row) {
    return { ok: false, reason: "not_found", message: "Account not found." };
  }

  return { ok: true, account: mapAccountDetail(row) };
}