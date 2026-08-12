import { NextResponse } from "next/server";
import { loadTalentContactForConnectedEmployer } from "@/lib/connection-access";

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
  const payload = await loadTalentContactForConnectedEmployer(getBearerToken(request), slug);

  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "missing_slug"
        ? 422
        : payload.reason === "error"
          ? 500
          : 403;

  return NextResponse.json(payload, { status });
}
