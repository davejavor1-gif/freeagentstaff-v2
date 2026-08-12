import { NextResponse } from "next/server";
import { addTalentBlockedCompany } from "@/lib/talent-privacy-access";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { identifier?: string } | null;
  const payload = await addTalentBlockedCompany(getBearerToken(request), body?.identifier ?? "");

  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "invalid_block_identifier"
        ? 422
        : payload.reason === "wrong_account_type"
          ? 403
          : 500;

  return NextResponse.json(payload, { status });
}