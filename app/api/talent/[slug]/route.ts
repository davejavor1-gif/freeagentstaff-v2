import { NextResponse } from "next/server";
import { loadPublicTalentPassport, loadTalentPassport } from "@/lib/discovery-access";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const accessToken = getBearerToken(request);
  const isAnonymous = !accessToken;
  const payload = isAnonymous
    ? await loadPublicTalentPassport(slug)
    : await loadTalentPassport(accessToken, slug);
  const status = payload.allowed ? 200 : isAnonymous ? 404 : payload.reason === "error" ? 500 : 403;

  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}