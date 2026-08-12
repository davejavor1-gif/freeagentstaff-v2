import { NextResponse } from "next/server";
import { removeTalentBlockedCompany } from "@/lib/talent-privacy-access";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  const payload = await removeTalentBlockedCompany(getBearerToken(request), decodeURIComponent(key));

  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "missing_block_key"
        ? 422
        : payload.reason === "wrong_account_type"
          ? 403
          : 500;

  return NextResponse.json(payload, { status });
}