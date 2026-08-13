import { NextResponse } from "next/server";
import { createUserServerSupabaseClient } from "@/lib/server-supabase";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function GET(request: Request) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json({ ok: true, isSystemAdmin: false }, { status: 200 });
  }

  const userClient = createUserServerSupabaseClient(accessToken);
  const { error } = await userClient.rpc("require_system_admin_actor");

  if (error) {
    return NextResponse.json({ ok: true, isSystemAdmin: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true, isSystemAdmin: true }, { status: 200 });
}