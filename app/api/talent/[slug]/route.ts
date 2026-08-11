import { NextResponse } from "next/server";
import { loadTalentPassport } from "@/lib/discovery-access";

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
  const payload = await loadTalentPassport(getBearerToken(request), slug);
  const status = payload.allowed ? 200 : payload.reason === "error" ? 500 : 403;

  return NextResponse.json(payload, { status });
}