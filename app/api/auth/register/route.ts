import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPasswordPolicyError } from "@/lib/password-policy";
import { getPublicAppUrl } from "@/lib/site-url";

type RegisterBody = {
  email?: string;
  password?: string;
  accountType?: "talent" | "employer";
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RegisterBody | null;
  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";
  const accountType = body?.accountType === "employer" ? "employer" : "talent";

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "Email and password are required." }, { status: 400 });
  }

  const policyError = getPasswordPolicyError(password);
  if (policyError) {
    return NextResponse.json({ ok: false, message: policyError }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.json({ ok: false, message: "Sign-up is temporarily unavailable." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { account_type: accountType },
      emailRedirectTo: getPublicAppUrl(accountType === "employer" ? "/onboarding/employer" : "/dashboard", { request }),
    },
  });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    userId: data.user?.id ?? null,
    email: data.user?.email ?? email,
    session: data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }
      : null,
  });
}
