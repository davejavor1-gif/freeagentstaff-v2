import { NextResponse } from "next/server";
import { sendTalentOwnerReferenceInvitation } from "@/lib/talent-references";

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
  const payload = await sendTalentOwnerReferenceInvitation(getBearerToken(request), id);
  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "wrong_account_type"
        ? 403
        : payload.reason === "reference_not_found"
          ? 404
          : payload.reason === "invalid_state"
            ? 409
            : payload.reason === "invitation_cooldown"
              ? 429
              : payload.reason === "invite_failed"
                ? 502
                : 500;

  return NextResponse.json(payload, { status });
}
