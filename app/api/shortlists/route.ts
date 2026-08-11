import { NextResponse } from "next/server";
import { createShortlist, listShortlists } from "@/lib/saved-talent-access";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function GET(request: Request) {
  const payload = await listShortlists(getBearerToken(request));

  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "error"
        ? 500
        : 403;

  return NextResponse.json(payload, { status });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const payload = await createShortlist(getBearerToken(request), body?.name ?? "");

  const status = payload.ok
    ? 201
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "invalid_name"
        ? 422
        : payload.reason === "duplicate_name"
          ? 409
          : payload.reason === "error"
            ? 500
            : 403;

  return NextResponse.json(payload, { status });
}
