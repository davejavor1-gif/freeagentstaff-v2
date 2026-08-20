import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient, createUserServerSupabaseClient } from "@/lib/server-supabase";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() || null : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const accessToken = getBearerToken(request);
  if (!accessToken) return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });

  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, message: "Invalid employer account id." }, { status: 422 });

  const actorClient = createUserServerSupabaseClient(accessToken);
  const { data: adminActor, error: adminError } = await actorClient.rpc("require_system_admin_actor");
  if (adminError) return NextResponse.json({ ok: false, message: "System admin access required." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { decision?: string; reason?: string | null } | null;
  const decision = body?.decision;
  if (decision !== "verified" && decision !== "more_info_required" && decision !== "rejected") {
    return NextResponse.json({ ok: false, message: "Invalid verification decision." }, { status: 422 });
  }

  const reason = body?.reason?.trim() ?? "";
  if ((decision === "more_info_required" || decision === "rejected") && !reason) {
    return NextResponse.json({ ok: false, message: "A reviewer message is required." }, { status: 422 });
  }

  const serviceClient = createServiceRoleSupabaseClient();
  if (!serviceClient) return NextResponse.json({ ok: false, message: "Verification service is unavailable." }, { status: 503 });

  const reviewClient = serviceClient as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{
      data: Array<{ success: boolean; employer_verification_status: string }> | null;
      error: { message: string } | null;
    }>;
  };
  const { data, error } = await reviewClient.rpc("admin_review_employer_verification", {
    p_user_id: id,
    p_decision: decision,
    p_reason: decision === "more_info_required" || decision === "rejected" ? reason : null,
    p_reviewer: typeof adminActor === "string" ? adminActor : null,
  });

  if (error || !data?.[0]?.success) {
    return NextResponse.json({ ok: false, message: "Unable to update employer verification." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, status: data[0].employer_verification_status }, { status: 200 });
}