import { NextResponse } from "next/server";
import { addSavedTalentToShortlist } from "@/lib/saved-talent-access";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { slug?: string } | null;
  const payload = await addSavedTalentToShortlist(getBearerToken(request), id, body?.slug ?? "");

  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "shortlist_not_found" || payload.reason === "candidate_not_found"
        ? 404
        : payload.reason === "error"
          ? 500
          : 403;

  return NextResponse.json(payload, { status });
}
