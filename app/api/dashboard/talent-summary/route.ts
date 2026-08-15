import { NextResponse } from "next/server";
import { listTalentConnections } from "@/lib/connection-access";
import { listTalentIntroductionRequests } from "@/lib/introduction-request-access";
import { createUserServerSupabaseClient } from "@/lib/server-supabase";
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
};

type TalentAnalyticsRow = {
  event_type: "search_impression" | "passport_view";
  viewer_user_id: string;
  employer_company_name: string | null;
  event_at: string;
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

function buildProInsights(input: {
  searchImpressions30d: number;
  passportViews30d: number;
  uniqueEmployerViewers30d: number;
  pendingIntroductionRequests: number;
}) {
  const insights: string[] = [];

  if (input.searchImpressions30d === 0) {
    insights.push("No search impressions in the last 30 days. Refresh your title, focus area, and skills to improve match coverage.");
  } else if (input.searchImpressions30d >= 40) {
    insights.push("Strong search visibility this month. Keep your profile published to maintain momentum.");
  }

  if (input.passportViews30d > 0 && input.uniqueEmployerViewers30d === 0) {
    insights.push("Passport views are rising, but we could not attribute unique employer viewers. Keep profile details complete for clearer attribution.");
  } else if (input.uniqueEmployerViewers30d >= 5) {
    insights.push("Multiple unique employers viewed your passport this month.");
  }

  if (input.pendingIntroductionRequests > 0) {
    insights.push("You have pending introduction requests waiting for action.");
  }

  if (insights.length === 0) {
    insights.push("Your Pro analytics are active. Keep your profile current and monitor weekly changes.");
  }

  return insights;
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
      .select("user_id, account_type, visibility, is_published, talent_plan, talent_subscription_status, talent_subscription_current_period_ends_at")
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

  if (profileRow?.account_type === "employer") {
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
  });
  const hasPro = hasTalentProAccess(subscription);

  let proAnalytics: TalentSummaryPayload["proAnalytics"] = null;

  if (hasPro && profileRow?.user_id) {
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - 29);

    const { data: analyticsRows, error: analyticsError } = await userClient
      .from("talent_pro_analytics_events")
      .select("event_type, viewer_user_id, employer_company_name, event_at")
      .eq("talent_user_id", profileRow.user_id)
      .gte("event_day", startDate.toISOString().slice(0, 10))
      .order("event_at", { ascending: false })
      .limit(500);

    if (!analyticsError) {
      const rows = (analyticsRows ?? []) as TalentAnalyticsRow[];
      const searchImpressions30d = rows.filter((row) => row.event_type === "search_impression").length;
      const passportViewRows = rows.filter((row) => row.event_type === "passport_view");
      const uniqueEmployerViewersSet = new Set(passportViewRows.map((row) => row.viewer_user_id));
      const recentEmployerViewers = Array.from(
        new Set(
          passportViewRows
            .map((row) => row.employer_company_name?.trim() ?? "")
            .filter((name) => name.length > 0),
        ),
      ).slice(0, 5);

      proAnalytics = {
        searchImpressions30d,
        passportViews30d: passportViewRows.length,
        uniqueEmployerViewers30d: uniqueEmployerViewersSet.size,
        recentEmployerViewers,
        insights: buildProInsights({
          searchImpressions30d,
          passportViews30d: passportViewRows.length,
          uniqueEmployerViewers30d: uniqueEmployerViewersSet.size,
          pendingIntroductionRequests: requestItems.filter((item) => item.status === "pending" && item.canTalentRespond).length,
        }),
      };
    }
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
