import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPublicAppOrigin } from "@/lib/site-url";

const GENERIC_MESSAGE = "If an account exists for that email, password reset instructions have been sent.";

type ForgotPasswordBody = {
  email?: string;
};

function getResetRedirect(request: Request) {
  const baseOrigin = getPublicAppOrigin({ request });
  return `${baseOrigin}/reset-password`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ForgotPasswordBody | null;
  const email = body?.email?.trim() ?? "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (email && supabaseUrl && supabasePublishableKey) {
    const supabase = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getResetRedirect(request),
    });
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}