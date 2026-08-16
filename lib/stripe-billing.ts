import "server-only";

import Stripe from "stripe";
import { createServiceRoleSupabaseClient } from "@/lib/server-supabase";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  stripeClient ??= new Stripe(secretKey);
  return stripeClient;
}

export function getStripePriceId(plan: "free_agent_pro" | "employer") {
  const priceId = plan === "free_agent_pro"
    ? process.env.STRIPE_TALENT_PRO_PRICE_ID
    : process.env.STRIPE_EMPLOYER_PRICE_ID;

  if (!priceId) {
    throw new Error(plan === "free_agent_pro"
      ? "STRIPE_TALENT_PRO_PRICE_ID is not configured."
      : "STRIPE_EMPLOYER_PRICE_ID is not configured.");
  }

  return priceId;
}

export type BillingPlan = "free_agent_pro" | "employer";

// Resolves the plan strictly from the subscription's actual Stripe Price ID so webhook
// handling never trusts client- or metadata-supplied plan claims for entitlement grants.
export function planForPriceId(priceId: string | null | undefined): BillingPlan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_TALENT_PRO_PRICE_ID) return "free_agent_pro";
  if (priceId === process.env.STRIPE_EMPLOYER_PRICE_ID) return "employer";
  return null;
}

export function planForAccount(accountType: "talent" | "employer", requestedPlan: BillingPlan) {
  if (accountType === "talent" && requestedPlan === "free_agent_pro") {
    return requestedPlan;
  }

  if (accountType === "employer" && requestedPlan === "employer") {
    return requestedPlan;
  }

  return null;
}

export async function findOrCreateStripeCustomer(input: {
  userId: string;
  email?: string | null;
  name?: string | null;
}) {
  const serviceClient = createServiceRoleSupabaseClient();
  if (!serviceClient) {
    throw new Error("Service role Supabase client is not configured.");
  }

  const { data: profile, error } = await serviceClient
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", input.userId)
    .maybeSingle<{ stripe_customer_id: string | null }>();

  if (error) {
    throw new Error(error.message);
  }

  const stripe = getStripeClient();
  let customerId = profile?.stripe_customer_id ?? null;

  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) {
        return customer;
      }
    } catch {
      customerId = null;
    }
  }

  const customer = await stripe.customers.create({
    email: input.email ?? undefined,
    name: input.name ?? undefined,
    metadata: {
      freeagentstaff_user_id: input.userId,
    },
  });

  const { error: updateError } = await serviceClient
    .from("profiles")
    .update({ stripe_customer_id: customer.id } as never)
    .eq("user_id", input.userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return customer;
}

export function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  if (status === "active" || status === "trialing") return status;
  if (status === "past_due" || status === "unpaid") return "past_due" as const;
  if (status === "canceled") return "canceled" as const;
  return "inactive" as const;
}

export function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
}

export function billingOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  return forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin;
}
