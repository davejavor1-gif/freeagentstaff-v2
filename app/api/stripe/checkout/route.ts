import { NextResponse } from "next/server";
import { createUserServerSupabaseClient } from "@/lib/server-supabase";
import { getPublicAppOrigin } from "@/lib/site-url";
import {
  findOrCreateStripeCustomer,
  getShortStayPriceId,
  getStripeClient,
  getStripePriceId,
  planForAccount,
} from "@/lib/stripe-billing";
import { hasActiveShortStayAccess } from "@/lib/employer-entitlement";

// Stripe idempotency keys last 24h. A short window suppresses concurrent duplicate
// Checkout Sessions for one purchase attempt without blocking a later repurchase
// after the 72-hour Short Stay pass expires.
const SHORT_STAY_CHECKOUT_IDEMPOTENCY_WINDOW_MS = 15 * 60 * 1000;

function shortStayCheckoutIdempotencyKey(userId: string, nowMs = Date.now()) {
  return `short-stay-checkout:${userId}:${Math.floor(nowMs / SHORT_STAY_CHECKOUT_IDEMPOTENCY_WINDOW_MS)}`;
}

function normalizeAbn(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");

  if (digits.length !== 11) {
    return null;
  }

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const total = digits
    .split("")
    .map((digit) => Number(digit))
    .reduce((sum, digit, index) => sum + ((index === 0 ? digit - 1 : digit) * weights[index]), 0);

  return total % 89 === 0 ? digits : null;
}

function normalizeAcn(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");

  if (digits.length !== 9) {
    return null;
  }

  const weights = [8, 7, 6, 5, 4, 3, 2, 1];
  const weightedSum = digits
    .slice(0, 8)
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0);
  const checkDigit = ((10 - (weightedSum % 10)) % 10).toString();

  return checkDigit === digits[8] ? digits : null;
}

function hasValidEmployerIdentifier(profile: {
  employer_abn: string | null;
  employer_acn: string | null;
  employer_identifier_type: string | null;
}) {
  if (profile.employer_identifier_type === "acn") {
    return Boolean(normalizeAcn(profile.employer_acn));
  }

  if (profile.employer_identifier_type === "abn") {
    return Boolean(normalizeAbn(profile.employer_abn));
  }

  // Legacy rows without an explicit identifier type fall back to ABN-only behavior.
  return Boolean(normalizeAbn(profile.employer_abn));
}

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
  const requestedPlan = body?.plan === "free_agent_pro" || body?.plan === "employer" || body?.plan === "short_stay_employer" ? body.plan : null;
  if (!requestedPlan) {
    return NextResponse.json({ ok: false, message: "A valid subscription plan is required." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("account_type, email, name, employer_company_name, employer_abn, employer_acn, employer_identifier_type, employer_verification_status, stripe_talent_subscription_id, talent_subscription_status, stripe_employer_subscription_id, employer_subscription_status, short_stay_access_expires_at")
    .eq("user_id", userData.user.id)
    .maybeSingle<{
      account_type: "talent" | "employer";
      email: string | null;
      name: string | null;
      employer_company_name: string | null;
      employer_abn: string | null;
      employer_acn: string | null;
      employer_identifier_type: string | null;
      employer_verification_status: string | null;
      stripe_talent_subscription_id: string | null;
      talent_subscription_status: string | null;
      stripe_employer_subscription_id: string | null;
      employer_subscription_status: string | null;
      short_stay_access_expires_at: string | null;
    }>();

  if (profileError || !profile) {
    return NextResponse.json({ ok: false, message: "Your profile could not be loaded." }, { status: 400 });
  }

  if (requestedPlan === "short_stay_employer") {
    if (profile.account_type !== "employer") {
      return NextResponse.json({ ok: false, message: "Short Stay Employer access is only available for employer accounts." }, { status: 403 });
    }

    if (profile.employer_verification_status !== "verified" || !hasValidEmployerIdentifier(profile)) {
      return NextResponse.json({ ok: false, message: "Employer verification must be completed before checkout." }, { status: 403 });
    }

    if (hasActiveShortStayAccess(profile.short_stay_access_expires_at)) {
      return NextResponse.json({ ok: false, message: "You already have active Short Stay access. You can purchase another pass once it expires." }, { status: 409 });
    }

    try {
      const stripe = getStripeClient();
      const customer = await findOrCreateStripeCustomer({
        userId: userData.user.id,
        email: userData.user.email ?? profile.email,
        name: profile.employer_company_name,
      });
      const origin = getPublicAppOrigin({ forStripe: true });

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customer.id,
        line_items: [{ price: getShortStayPriceId(), quantity: 1 }],
        success_url: `${origin}/find-talent?checkout=success`,
        cancel_url: `${origin}/find-talent?checkout=cancelled`,
        metadata: {
          freeagentstaff_user_id: userData.user.id,
          account_type: profile.account_type,
          plan: "short_stay_employer",
        },
      }, {
        idempotencyKey: shortStayCheckoutIdempotencyKey(userData.user.id),
      });

      return NextResponse.json({ ok: true, url: session.url });
    } catch (error) {
      return NextResponse.json({
        ok: false,
        message: error instanceof Error ? error.message : "Unable to start checkout.",
      }, { status: 500 });
    }
  }

  const plan = planForAccount(profile.account_type, requestedPlan);
  if (!plan) {
    return NextResponse.json({ ok: false, message: "That subscription is not available for this account type." }, { status: 403 });
  }

  if (plan === "employer" && (profile.employer_verification_status !== "verified" || !hasValidEmployerIdentifier(profile))) {
    return NextResponse.json({ ok: false, message: "Employer verification must be completed before checkout." }, { status: 403 });
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
    const origin = getPublicAppOrigin({ forStripe: true });

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
