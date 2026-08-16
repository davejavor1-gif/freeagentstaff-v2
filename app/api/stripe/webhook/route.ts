import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleSupabaseClient } from "@/lib/server-supabase";
import {
  getStripeClient,
  mapStripeSubscriptionStatus,
  planForPriceId,
  subscriptionPeriodEnd,
} from "@/lib/stripe-billing";

function subscriptionUserId(subscription: Stripe.Subscription) {
  return subscription.metadata.freeagentstaff_user_id ?? null;
}

async function findProfile(subscription: Stripe.Subscription) {
  const serviceClient = createServiceRoleSupabaseClient();
  if (!serviceClient) throw new Error("Service role Supabase client is not configured.");

  const userId = subscriptionUserId(subscription);
  if (userId) {
    const { data } = await serviceClient.from("profiles").select("user_id, account_type").eq("user_id", userId).maybeSingle<{ user_id: string; account_type: "talent" | "employer" }>();
    if (data) return data;
  }

  const { data } = await serviceClient.from("profiles").select("user_id, account_type").eq("stripe_customer_id", String(subscription.customer)).maybeSingle<{ user_id: string; account_type: "talent" | "employer" }>();
  return data ?? null;
}

async function applySubscription(subscription: Stripe.Subscription) {
  const serviceClient = createServiceRoleSupabaseClient();
  if (!serviceClient) throw new Error("Service role Supabase client is not configured.");

  const profile = await findProfile(subscription);
  if (!profile) return;

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const resolvedPlan = planForPriceId(priceId);
  if (!resolvedPlan) return; // unknown price: never grant access

  const status = mapStripeSubscriptionStatus(subscription.status);
  const periodEnd = subscriptionPeriodEnd(subscription);
  const customerId = String(subscription.customer);

  if (resolvedPlan === "employer" && profile.account_type === "employer") {
    await serviceClient.from("profiles").update({
      stripe_customer_id: customerId,
      stripe_employer_subscription_id: subscription.id,
      stripe_employer_price_id: priceId,
      employer_subscription_status: status,
      employer_subscription_current_period_ends_at: periodEnd,
      employer_subscription_cancel_at_period_end: subscription.cancel_at_period_end,
    } as never).eq("user_id", profile.user_id);
    return;
  }

  if (resolvedPlan === "free_agent_pro" && profile.account_type === "talent") {
    await serviceClient.from("profiles").update({
      stripe_customer_id: customerId,
      stripe_talent_subscription_id: subscription.id,
      stripe_talent_price_id: priceId,
      talent_plan: status === "canceled" || status === "inactive" ? "free_agent" : "free_agent_pro",
      talent_subscription_status: status,
      talent_subscription_current_period_ends_at: periodEnd,
      talent_subscription_cancel_at_period_end: subscription.cancel_at_period_end,
    } as never).eq("user_id", profile.user_id);
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ ok: false, message: "Webhook signature required." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = getStripeClient().webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid webhook signature." }, { status: 400 });
  }

  const serviceClient = createServiceRoleSupabaseClient();
  if (!serviceClient) {
    return NextResponse.json({ ok: false, message: "Billing service unavailable." }, { status: 500 });
  }

  const { error: ledgerError } = await serviceClient.from("stripe_processed_events").insert({
    event_id: event.id,
    event_type: event.type,
  } as never);

  if (ledgerError) {
    if (ledgerError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ ok: false, message: ledgerError.message }, { status: 500 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === "string") {
        await applySubscription(await getStripeClient().subscriptions.retrieve(session.subscription));
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted" ||
      event.type === "invoice.paid" ||
      event.type === "invoice.payment_failed"
    ) {
      const object = event.data.object as Stripe.Subscription | Stripe.Invoice;
      const invoiceSubscription = (object as unknown as { subscription?: string | { id: string } | null }).subscription;
      const subscriptionId = event.type.startsWith("customer.subscription")
        ? object.id
        : typeof invoiceSubscription === "string"
          ? invoiceSubscription
          : invoiceSubscription?.id;
      if (subscriptionId) {
        const subscription = event.type.startsWith("customer.subscription")
          ? object as Stripe.Subscription
          : await getStripeClient().subscriptions.retrieve(subscriptionId);
        await applySubscription(subscription);
      }
    }
  } catch (error) {
    await serviceClient.from("stripe_processed_events").delete().eq("event_id", event.id);
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Webhook processing failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
