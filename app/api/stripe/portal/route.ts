import { NextResponse } from "next/server";
import { createUserServerSupabaseClient } from "@/lib/server-supabase";
import { getPublicAppOrigin } from "@/lib/site-url";
import { getStripeClient } from "@/lib/stripe-billing";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() || null : null;
}

export async function POST(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
  }

  const userClient = createUserServerSupabaseClient(accessToken);
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return NextResponse.json({ ok: false, message: "Unable to verify your account." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", userData.user.id)
    .maybeSingle<{ stripe_customer_id: string | null }>();

  if (profileError || !profile?.stripe_customer_id) {
    return NextResponse.json({ ok: false, message: "No billing customer is linked to this account." }, { status: 400 });
  }

  try {
    const session = await getStripeClient().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getPublicAppOrigin({ forStripe: true })}/dashboard`,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Unable to open the billing portal.",
    }, { status: 500 });
  }
}
