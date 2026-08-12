import { NextResponse } from "next/server";
import { createIntroductionRequest } from "@/lib/introduction-request-access";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { slug?: string; message?: string } | null;
  const payload = await createIntroductionRequest(
    getBearerToken(request),
    body?.slug ?? "",
    body?.message,
  );

  const status = payload.ok
    ? payload.alreadyExists
      ? 200
      : 201
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "candidate_not_found"
        ? 404
        : payload.reason === "missing_slug" || payload.reason === "invalid_status"
          ? 422
          : payload.reason === "error"
            ? 500
            : 403;

  return NextResponse.json(payload, { status });
}
