import { NextResponse } from "next/server";
import { listEmployerConnections } from "@/lib/connection-access";
import { listEmployerIntroductionRequests } from "@/lib/introduction-request-access";
import { getEmployerSavedTalentAndShortlistCounts } from "@/lib/saved-talent-access";
import type {
  DashboardSummaryReason,
  EmployerDashboardConnectionPreview,
  EmployerDashboardSummaryRequestPreview,
  EmployerSummaryResponse,
} from "@/types/dashboard";

const REQUEST_PREVIEW_LIMIT = 6;
const CONNECTION_PREVIEW_LIMIT = 6;

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
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

function requestStatusRank(status: string) {
  if (status === "pending") return 0;
  if (status === "accepted") return 1;
  if (status === "declined") return 2;
  if (status === "withdrawn") return 3;
  return 4;
}

function sortRequestPreview(
  a: EmployerDashboardSummaryRequestPreview,
  b: EmployerDashboardSummaryRequestPreview,
) {
  const statusDelta = requestStatusRank(a.status) - requestStatusRank(b.status);
  if (statusDelta !== 0) {
    return statusDelta;
  }

  const aDate = new Date(a.respondedAt ?? a.withdrawnAt ?? a.createdAt).getTime();
  const bDate = new Date(b.respondedAt ?? b.withdrawnAt ?? b.createdAt).getTime();
  return bDate - aDate;
}

function sortConnectionPreview(
  a: EmployerDashboardConnectionPreview,
  b: EmployerDashboardConnectionPreview,
) {
  if (a.status !== b.status) {
    return a.status === "active" ? -1 : 1;
  }

  const aDate = new Date(a.status === "active" ? a.connectedAt : (a.revokedAt ?? a.connectedAt)).getTime();
  const bDate = new Date(b.status === "active" ? b.connectedAt : (b.revokedAt ?? b.connectedAt)).getTime();
  return bDate - aDate;
}

export async function GET(request: Request) {
  const accessToken = getBearerToken(request);

  const [savedCounts, requestList, connectionList] = await Promise.all([
    getEmployerSavedTalentAndShortlistCounts(accessToken),
    listEmployerIntroductionRequests(accessToken),
    listEmployerConnections(accessToken),
  ]);

  const firstFailure = [savedCounts, requestList, connectionList].find((result) => !result.ok);

  if (firstFailure && !firstFailure.ok) {
    const payload: EmployerSummaryResponse = {
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

  const payload: EmployerSummaryResponse = {
    ok: true,
    summary: {
      savedTalentCount: savedCounts.ok ? savedCounts.savedTalentCount : 0,
      pendingIntroductionRequests: requestItems.filter((item) => item.status === "pending").length,
      activeConnections: connectionItems.filter((item) => item.status === "active").length,
      activeShortlists: savedCounts.ok ? savedCounts.activeShortlists : 0,
      requestPreview: requestItems
        .map((item) => ({
          requestId: item.requestId,
          talentSlug: item.talentSlug,
          talentName: item.talentName,
          status: item.status,
          createdAt: item.createdAt,
          respondedAt: item.respondedAt,
          withdrawnAt: item.withdrawnAt,
          isCurrentlyEligible: item.isCurrentlyEligible,
        }))
        .sort(sortRequestPreview)
        .slice(0, REQUEST_PREVIEW_LIMIT),
      connectionPreview: connectionItems
        .map((item) => ({
          connectionId: item.connectionId,
          status: item.status,
          connectedAt: item.connectedAt,
          revokedAt: item.revokedAt,
          talentSlug: item.talent?.slug ?? null,
          talentName: item.talent?.name ?? null,
          talentTitle: item.talent?.title ?? null,
          accessScope: item.talent?.accessScope ?? null,
        }))
        .sort(sortConnectionPreview)
        .slice(0, CONNECTION_PREVIEW_LIMIT),
    },
  };

  return NextResponse.json(payload, { status: 200 });
}
