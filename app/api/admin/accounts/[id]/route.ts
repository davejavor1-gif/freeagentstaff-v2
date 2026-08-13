import { NextResponse } from "next/server";
import { getAdminAccount } from "@/lib/admin-access";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const payload = await getAdminAccount(getBearerToken(request), id);

  const status = payload.ok
    ? 200
    : payload.reason === "not_authenticated"
      ? 401
      : payload.reason === "system_admin_required"
        ? 403
        : payload.reason === "not_found"
          ? 404
          : 500;

  return NextResponse.json(payload, { status });
}