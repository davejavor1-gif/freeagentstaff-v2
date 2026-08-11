import { NextResponse } from "next/server";
import { listSavedTalent, saveTalent } from "@/lib/saved-talent-access";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shortlistId = url.searchParams.get("shortlistId");
  const payload = await listSavedTalent(getBearerToken(request), shortlistId);

  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "error"
        ? 500
        : payload.reason === "shortlist_not_found"
          ? 404
          : 403;

  return NextResponse.json(payload, { status });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { slug?: string; shortlistIds?: string[] } | null;
  const payload = await saveTalent(getBearerToken(request), body?.slug ?? "", body?.shortlistIds ?? null);

  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "candidate_not_found" || payload.reason === "shortlist_not_found"
        ? 404
        : payload.reason === "invalid_shortlist_ids" || payload.reason === "invalid_name"
          ? 422
          : payload.reason === "error"
            ? 500
            : 403;

  return NextResponse.json(payload, { status });
}
