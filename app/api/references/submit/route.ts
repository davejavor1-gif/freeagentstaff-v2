import { NextResponse } from "next/server";
import { submitPublicTalentReferenceInvitation } from "@/lib/talent-reference-public";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0, must-revalidate" };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
    answers?: unknown;
  } | null;

  const payload = await submitPublicTalentReferenceInvitation(
    typeof body?.token === "string" ? body.token : null,
    body?.answers,
    request.headers,
  );

  if (payload.ok) {
    return NextResponse.json({ ok: true }, { status: 200, headers: NO_STORE });
  }

  const status =
    payload.reason === "invalid_answers" ? 422 : payload.reason === "rate_limited" ? 429 : 404;

  return NextResponse.json(
    { ok: false, message: payload.message },
    { status, headers: NO_STORE },
  );
}
