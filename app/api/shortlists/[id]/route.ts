import { NextResponse } from "next/server";
import { deleteShortlist, renameShortlist } from "@/lib/saved-talent-access";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const payload = await renameShortlist(getBearerToken(request), id, body?.name ?? "");

  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "shortlist_not_found"
        ? 404
        : payload.reason === "invalid_name"
          ? 422
          : payload.reason === "duplicate_name"
            ? 409
            : payload.reason === "error"
              ? 500
              : 403;

  return NextResponse.json(payload, { status });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const payload = await deleteShortlist(getBearerToken(request), id);

  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "error"
        ? 500
        : 403;

  return NextResponse.json(payload, { status });
}
