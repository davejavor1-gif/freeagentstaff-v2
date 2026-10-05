import { NextResponse } from "next/server";
import { deleteTalentOwnerReference } from "@/lib/talent-references";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  return authorization.slice("Bearer ".length).trim() || null;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const payload = await deleteTalentOwnerReference(getBearerToken(request), id);
  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "wrong_account_type"
        ? 403
        : payload.reason === "reference_not_found"
          ? 404
          : 500;

  return NextResponse.json(payload, { status });
}
