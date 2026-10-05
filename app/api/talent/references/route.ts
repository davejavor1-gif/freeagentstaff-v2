import { NextResponse } from "next/server";
import {
  createAndInviteTalentOwnerReference,
  listTalentOwnerReferences,
} from "@/lib/talent-references";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  return authorization.slice("Bearer ".length).trim() || null;
}

function statusForReason(reason: string | undefined) {
  if (reason === "not_signed_in") return 401;
  if (reason === "wrong_account_type") return 403;
  if (reason === "invalid_input" || reason === "pending_reference_limit" || reason === "missing_talent_display_name") {
    return 422;
  }
  if (reason === "invitation_cooldown") return 429;
  if (reason === "invite_failed") return 502;
  return 500;
}

export async function GET(request: Request) {
  const payload = await listTalentOwnerReferences(getBearerToken(request));
  const status = payload.ok ? 200 : statusForReason(payload.reason);
  return NextResponse.json(payload, { status });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    refereeName?: string;
    jobTitle?: string;
    company?: string;
    relationship?: string;
    refereeEmail?: string;
  } | null;

  const payload = await createAndInviteTalentOwnerReference(getBearerToken(request), {
    refereeName: body?.refereeName ?? "",
    jobTitle: body?.jobTitle,
    company: body?.company,
    relationship: body?.relationship,
    refereeEmail: body?.refereeEmail ?? "",
  });

  const status = payload.ok ? 200 : statusForReason(payload.reason);
  return NextResponse.json(payload, { status });
}
