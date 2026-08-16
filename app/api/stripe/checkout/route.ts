import { NextResponse } from "next/server";
import { createUserServerSupabaseClient } from "@/lib/server-supabase";
import {
  billingOrigin,
  findOrCreateStripeCustomer,
  getStripeClient,
  getStripePriceId,
  planForAccount,
} from "@/lib/stripe-billing";

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

  const body = (await request.json().catch(() => null)) as { plan?: unknown } | null;
  const requestedPlan = body?.plan === "free_agent_pro" || body?.plan === "employer" ? body.plan : null;
  if (!requestedPlan) {
    return NextResponse.json({ ok: false, message: "A valid subscription plan is required." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("account_type, email, name, employer_company_name, stripe_talent_subscription_id, talent_subscription_status, stripe_employer_subscription_id, employer_subscription_status")
    .eq("user_id", userData.user.id)
    .maybeSingle<{
      account_type: "talent" | "employer";
      email: string | null;
      name: string | null;
      employer_company_name: string | null;
      stripe_talent_subscription_id: string | null;
      talent_subscription_status: string | null;
      stripe_employer_subscription_id: string | null;
      employer_subscription_status: string | null;
    }>();

  if (profileError || !profile) {
    return NextResponse.json({ ok: false, message: "Your profile could not be loaded." }, { status: 400 });
  }

  const plan = planForAccount(profile.account_type, requestedPlan);
  if (!plan) {
    return NextResponse.json({ ok: false, message: "That subscription is not available for this account type." }, { status: 403 });
  }

  const existingStatus = plan === "free_agent_pro" ? profile.talent_subscription_status : profile.employer_subscription_status;
  const existingSubscriptionId = plan === "free_agent_pro" ? profile.stripe_talent_subscription_id : profile.stripe_employer_subscription_id;
  if (existingSubscriptionId && (existingStatus === "active" || existingStatus === "trialing" || existingStatus === "past_due")) {
    return NextResponse.json({ ok: false, message: "An existing billing subscription is already linked to this account. Use Manage Subscription to change it." }, { status: 409 });
  }

  try {
    const stripe = getStripeClient();
    const customer = await findOrCreateStripeCustomer({
      userId: userData.user.id,
      email: userData.user.email ?? profile.email,
      name: profile.account_type === "employer" ? profile.employer_company_name : profile.name,
    });
    const origin = billingOrigin(request);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: getStripePriceId(plan), quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        freeagentstaff_user_id: userData.user.id,
        account_type: profile.account_type,
        plan,
      },
      subscription_data: {
        metadata: {
          freeagentstaff_user_id: userData.user.id,
          account_type: profile.account_type,
          plan,
        },
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Unable to start checkout.",
    }, { status: 500 });
  }
}
