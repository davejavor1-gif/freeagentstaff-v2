import { NextResponse } from "next/server";
import { setTalentOwnerReferenceSharing } from "@/lib/talent-references";

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
  const body = (await request.json().catch(() => null)) as { share?: unknown } | null;
  if (typeof body?.share !== "boolean") {
    return NextResponse.json(
      { ok: false, reason: "invalid_input", message: "Choose whether this reference should be shared." },
      { status: 422 },
    );
  }

  const payload = await setTalentOwnerReferenceSharing(getBearerToken(request), id, body.share);
  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "wrong_account_type"
        ? 403
        : payload.reason === "reference_not_found"
          ? 404
          : payload.reason === "reference_not_shareable"
            ? 409
            : 500;

  return NextResponse.json(payload, { status });
}
