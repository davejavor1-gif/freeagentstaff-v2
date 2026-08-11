import { NextResponse } from "next/server";
import { loadDiscoveryResults } from "@/lib/discovery-access";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function GET(request: Request) {
  const payload = await loadDiscoveryResults(getBearerToken(request));
  const status = payload.allowed ? 200 : payload.reason === "error" ? 500 : 403;

  return NextResponse.json(payload, { status });
}