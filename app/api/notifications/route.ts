import { NextResponse } from "next/server";
import { listMyNotifications } from "@/lib/notification-access";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

function parseLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const numericValue = Number.parseInt(value, 10);
  return Number.isNaN(numericValue) ? undefined : numericValue;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";

  const payload = await listMyNotifications(getBearerToken(request), limit, unreadOnly);

  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "error"
        ? 500
        : 403;

  return NextResponse.json(payload, { status });
}
