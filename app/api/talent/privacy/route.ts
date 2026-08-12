import { NextResponse } from "next/server";
import {
  getTalentPrivacySettings,
  updateTalentPrivacySettings,
} from "@/lib/talent-privacy-access";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function GET(request: Request) {
  const payload = await getTalentPrivacySettings(getBearerToken(request));

  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "wrong_account_type"
        ? 403
        : 500;

  return NextResponse.json(payload, { status });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    visibility?: string;
    opportunityStatus?: string;
    isPublished?: boolean;
  } | null;

  const payload = await updateTalentPrivacySettings(
    getBearerToken(request),
    body?.visibility ?? "",
    body?.opportunityStatus ?? "",
    body?.isPublished as boolean,
  );

  const status = payload.ok
    ? 200
    : payload.reason === "not_signed_in"
      ? 401
      : payload.reason === "wrong_account_type"
        ? 403
        : payload.reason === "invalid_visibility" || payload.reason === "invalid_opportunity_status" || payload.reason === "missing_publish_state"
          ? 422
          : 500;

  return NextResponse.json(payload, { status });
}