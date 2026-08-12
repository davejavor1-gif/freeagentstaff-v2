import { NextResponse } from "next/server";
import { listTalentIntroductionRequests } from "@/lib/introduction-request-access";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function GET(request: Request) {
  const payload = await listTalentIntroductionRequests(getBearerToken(request));

  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "error"
        ? 500
        : 403;

  return NextResponse.json(payload, { status });
}
