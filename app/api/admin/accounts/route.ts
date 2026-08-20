import { NextResponse } from "next/server";
import { listAdminAccounts } from "@/lib/admin-access";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cursorCreatedAt = url.searchParams.get("cursorCreatedAt");
  const cursorUserId = url.searchParams.get("cursorUserId");
  const payload = await listAdminAccounts(getBearerToken(request), {
    query: url.searchParams.get("q") ?? undefined,
    accountType:
      url.searchParams.get("accountType") === "talent" || url.searchParams.get("accountType") === "employer"
        ? (url.searchParams.get("accountType") as "talent" | "employer")
        : null,
    verificationStatus:
      url.searchParams.get("verificationStatus") === "unverified" ||
      url.searchParams.get("verificationStatus") === "pending" ||
      url.searchParams.get("verificationStatus") === "more_info_required" ||
      url.searchParams.get("verificationStatus") === "verified" ||
      url.searchParams.get("verificationStatus") === "rejected"
        ? (url.searchParams.get("verificationStatus") as "unverified" | "pending" | "more_info_required" | "verified" | "rejected")
        : null,
    limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
    cursor:
      cursorCreatedAt && cursorUserId
        ? { createdAt: cursorCreatedAt, userId: cursorUserId }
        : null,
  });

  const verificationStatus = url.searchParams.get("verificationStatus");
  if (payload.ok && verificationStatus) {
    payload.items = payload.items?.filter((item) => item.employerVerificationStatus === verificationStatus);
  }

  const status = payload.ok
    ? 200
    : payload.reason === "not_authenticated"
      ? 401
      : payload.reason === "system_admin_required"
        ? 403
        : payload.reason === "invalid_query"
          ? 422
          : 500;

  return NextResponse.json(payload, { status });
}