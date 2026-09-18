import { NextResponse } from "next/server";
import { createUserServerSupabaseClient } from "@/lib/server-supabase";
import { getPasswordPolicyError } from "@/lib/password-policy";

type UpdatePasswordBody = {
  password?: string;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() || null : null;
}

export async function POST(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return NextResponse.json({ ok: false, message: "A valid password recovery session is required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as UpdatePasswordBody | null;
  const password = body?.password ?? "";

  if (!password) {
    return NextResponse.json({ ok: false, message: "Enter and confirm your new password." }, { status: 400 });
  }

  const policyError = getPasswordPolicyError(password);
  if (policyError) {
    return NextResponse.json({ ok: false, message: policyError }, { status: 400 });
  }

  const userClient = createUserServerSupabaseClient(accessToken);
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return NextResponse.json({ ok: false, message: "A valid password recovery session is required." }, { status: 401 });
  }

  const { error } = await userClient.auth.updateUser({ password });
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
