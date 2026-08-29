import { NextResponse } from "next/server";
import { listTalentConnections } from "@/lib/connection-access";
import { listTalentIntroductionRequests } from "@/lib/introduction-request-access";
import { createServiceRoleSupabaseClient, createUserServerSupabaseClient } from "@/lib/server-supabase";
import { hasTalentProAccess, normalizeTalentSubscriptionSnapshot } from "@/lib/talent-subscription";
import type { DashboardSummaryReason, TalentSummaryPayload, TalentSummaryResponse } from "@/types/dashboard";
import type { ProfileVisibility } from "@/types/freeagent";

const REQUEST_PREVIEW_LIMIT = 6;
const CONNECTION_PREVIEW_LIMIT = 6;

type TalentProfileRow = {
  user_id: string;
  account_type: "talent" | "employer";
  visibility: ProfileVisibility | null;
  is_published: boolean | null;
  talent_plan: "free_agent" | "free_agent_pro" | null;
  talent_subscription_status: "inactive" | "active" | "trialing" | "past_due" | "canceled" | null;
  talent_subscription_current_period_ends_at: string | null;
  talent_subscription_cancel_at: string | null;
  talent_subscription_cancel_at_period_end: boolean | null;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

function normalizeVisibility(value: ProfileVisibility | null | undefined): "public" | "verified_employer_network" | "confidential" {
  if (value === "verified_employer_network" || value === "confidential" || value === "public") {
    return value;
  }

  if (value === "employer_network") {
    return "verified_employer_network";
  }

  return "public";
}

function toDashboardReason(reason: string | undefined): DashboardSummaryReason {
  if (
    reason === "not_signed_in" ||
    reason === "wrong_account_type" ||
    reason === "unverified_employer" ||
    reason === "invalid_abn"
  ) {
    return reason;
  }

  return "error";
}

function requestStatusRank(status: string, canTalentRespond: boolean) {
  if (status === "pending" && canTalentRespond) return 0;
  if (status === "pending") return 1;
  if (status === "accepted") return 2;
  if (status === "declined") return 3;
  if (status === "withdrawn") return 4;
  return 5;
}

export async function GET(request: Request) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    const payload: TalentSummaryResponse = {
      ok: false,
      reason: "not_signed_in",
      message: "Sign in required.",
    };

    return NextResponse.json(payload, { status: 401 });
  }

  const userClient = createUserServerSupabaseClient(accessToken);

  if (!userClient) {
    const payload: TalentSummaryResponse = {
      ok: false,
      reason: "error",
      message: "Unable to initialize authenticated client.",
    };

    return NextResponse.json(payload, { status: 500 });
  }

  const [{ data: profileRow, error: profileError }, requestList, connectionList] = await Promise.all([
    userClient
      .from("profiles")
      .select("user_id, account_type, visibility, is_published, talent_plan, talent_subscription_status, talent_subscription_current_period_ends_at, talent_subscription_cancel_at, talent_subscription_cancel_at_period_end")
      .maybeSingle<TalentProfileRow>(),
    listTalentIntroductionRequests(accessToken),
    listTalentConnections(accessToken),
  ]);

  if (profileError) {
    const payload: TalentSummaryResponse = {
      ok: false,
      reason: "error",
      message: profileError.message,
    };

    return NextResponse.json(payload, { status: 500 });
  }

  if (profileRow?.account_type !== "talent") {
    const payload: TalentSummaryResponse = {
      ok: false,
      reason: "wrong_account_type",
      message: "wrong_account_type",
    };

    return NextResponse.json(payload, { status: 403 });
  }

  const firstFailure = [requestList, connectionList].find((result) => !result.ok);

  if (firstFailure && !firstFailure.ok) {
    const payload: TalentSummaryResponse = {
      ok: false,
      reason: toDashboardReason(firstFailure.reason),
      message: firstFailure.message,
    };

    const status = payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "error"
        ? 500
        : 403;

    return NextResponse.json(payload, { status });
  }

  const requestItems = requestList.ok ? requestList.items : [];
  const connectionItems = connectionList.ok ? connectionList.items : [];
  const subscription = normalizeTalentSubscriptionSnapshot({
    plan: profileRow?.talent_plan,
    status: profileRow?.talent_subscription_status,
    currentPeriodEndsAt: profileRow?.talent_subscription_current_period_ends_at,
    cancelAt: profileRow?.talent_subscription_cancel_at,
    cancelAtPeriodEnd: profileRow?.talent_subscription_cancel_at_period_end,
  });
  const hasPro = hasTalentProAccess(subscription);

  let proAnalytics: TalentSummaryPayload["proAnalytics"] = null;

  if (hasPro && profileRow?.user_id) {
    const serviceClient = createServiceRoleSupabaseClient();

    if (!serviceClient) {
      const payload: TalentSummaryResponse = {
        ok: false,
        reason: "error",
        message: "Analytics are temporarily unavailable.",
      };

      return NextResponse.json(payload, { status: 503 });
    }

    const [profileViewsResult, employerSavesResult] = await Promise.all([
      serviceClient
      .from("talent_pro_analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("talent_user_id", profileRow.user_id)
      .eq("event_type", "passport_view"),
      serviceClient
        .from("employer_saved_talent")
        .select("id", { count: "exact", head: true })
        .eq("talent_user_id", profileRow.user_id),
    ]);

    if (profileViewsResult.error || employerSavesResult.error) {
      const payload: TalentSummaryResponse = {
        ok: false,
        reason: "error",
        message: "Analytics are temporarily unavailable.",
      };

      return NextResponse.json(payload, { status: 500 });
    }

    proAnalytics = {
      profileViews: profileViewsResult.count ?? 0,
      employerSaves: employerSavesResult.count ?? 0,
    };
  }

  const payload: TalentSummaryResponse = {
    ok: true,
    summary: {
      isPublished: profileRow?.is_published ?? false,
      visibility: normalizeVisibility(profileRow?.visibility),
      pendingIntroductionRequests: requestItems.filter((item) => item.status === "pending" && item.canTalentRespond).length,
      activeConnections: connectionItems.filter((item) => item.status === "active").length,
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEndsAt: subscription.currentPeriodEndsAt,
        cancelAt: subscription.cancelAt,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        scheduledCancellationAt: subscription.scheduledCancellationAt,
        hasScheduledCancellation: subscription.hasScheduledCancellation,
        hasProAccess: hasPro,
      },
      proAnalytics,
      requestPreview: requestItems
        .map((item) => ({
          requestId: item.requestId,
          employerCompanyName: item.employerCompanyName ?? null,
          employerContactName: item.employerContactName ?? null,
          employerContactRole: item.employerContactRole ?? null,
          status: item.status,
          createdAt: item.createdAt,
          message: item.message,
          canTalentRespond: item.canTalentRespond,
        }))
        .sort((a, b) => {
          const statusDelta = requestStatusRank(a.status, a.canTalentRespond) - requestStatusRank(b.status, b.canTalentRespond);
          if (statusDelta !== 0) {
            return statusDelta;
          }

          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .slice(0, REQUEST_PREVIEW_LIMIT),
      connectionPreview: connectionItems
        .map((item) => ({
          connectionId: item.connectionId,
          status: item.status,
          connectedAt: item.connectedAt,
          revokedAt: item.revokedAt,
          employerCompanyName: item.employerCompanyName,
        }))
        .sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === "active" ? -1 : 1;
          }

          const aDate = new Date(a.status === "active" ? a.connectedAt : (a.revokedAt ?? a.connectedAt)).getTime();
          const bDate = new Date(b.status === "active" ? b.connectedAt : (b.revokedAt ?? b.connectedAt)).getTime();
          return bDate - aDate;
        })
        .slice(0, CONNECTION_PREVIEW_LIMIT),
    },
  };

  return NextResponse.json(payload, { status: 200 });
}
