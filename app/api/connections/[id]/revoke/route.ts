import { NextResponse } from "next/server";
import { revokeTalentConnection } from "@/lib/connection-access";

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
  const payload = await revokeTalentConnection(getBearerToken(request), id);

  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "missing_connection_id"
        ? 422
        : payload.reason === "connection_not_found"
          ? 404
          : payload.reason === "error"
            ? 500
            : 403;

  return NextResponse.json(payload, { status });
}
