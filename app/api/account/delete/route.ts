import { NextResponse } from "next/server";
import { resolveAccountIdentity } from "@/lib/account-identity";
import { createServiceRoleSupabaseClient, createUserServerSupabaseClient } from "@/lib/server-supabase";
import { getStripeClient } from "@/lib/stripe-billing";

// Every object owned by a user lives under a `<user_id>/` prefix in these private buckets,
// matching the storage RLS policies. Paths are always derived from the authenticated user id.
const OWNED_STORAGE_BUCKETS = ["profile-media", "intro-videos", "talent-resumes"] as const;

type ProfileRow = {
  account_type: "talent" | "employer";
  stripe_talent_subscription_id: string | null;
  talent_subscription_status: "inactive" | "active" | "trialing" | "past_due" | "canceled" | null;
  stripe_employer_subscription_id: string | null;
  employer_subscription_status: "inactive" | "active" | "trialing" | "past_due" | "canceled" | null;
};

const RECURRING_STATUSES = new Set(["active", "trialing", "past_due"]);

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() || null : null;
}

function isMissingStripeResource(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "resource_missing";
}

async function removeOwnedStorageObjects(
  serviceClient: NonNullable<ReturnType<typeof createServiceRoleSupabaseClient>>,
  userId: string,
) {
  for (const bucket of OWNED_STORAGE_BUCKETS) {
    const { data: entries, error } = await serviceClient.storage.from(bucket).list(userId, { limit: 1000 });

    if (error) {
      throw new Error(`storage_list_failed:${bucket}`);
    }

    const paths = (entries ?? []).map((entry) => `${userId}/${entry.name}`);

    if (paths.length === 0) {
      continue;
    }

    const { error: removeError } = await serviceClient.storage.from(bucket).remove(paths);

    if (removeError) {
      throw new Error(`storage_remove_failed:${bucket}`);
    }
  }
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

  // The account to delete is the token holder. No identifier from the request body is read.
  const userId = userData.user.id;

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("account_type, stripe_talent_subscription_id, talent_subscription_status, stripe_employer_subscription_id, employer_subscription_status")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    return NextResponse.json({ ok: false, message: "Your account could not be loaded." }, { status: 500 });
  }

  const identity = resolveAccountIdentity({
    profileExists: Boolean(profile),
    profileAccountType: profile?.account_type,
    metadataAccountType: userData.user.user_metadata?.account_type,
  });

  if (identity.status !== "resolved") {
    return NextResponse.json(
      { ok: false, message: "We couldn't confirm this account type. Your account has not been changed." },
      { status: 409 },
    );
  }

  const serviceClient = createServiceRoleSupabaseClient();
  if (!serviceClient) {
    return NextResponse.json({ ok: false, message: "Account deletion is temporarily unavailable." }, { status: 503 });
  }

  // 1. Stripe first: a subscription left billing a deleted account is the worst outcome,
  // and a failure here is fully recoverable because nothing has been destroyed yet.
  // Short Stay is one-time access and is never cancelled as a recurring subscription.
  const subscriptionId = identity.accountType === "employer"
    ? profile?.stripe_employer_subscription_id ?? null
    : profile?.stripe_talent_subscription_id ?? null;
  const subscriptionStatus = identity.accountType === "employer"
    ? profile?.employer_subscription_status ?? null
    : profile?.talent_subscription_status ?? null;
  const hasRecurringStatus = Boolean(subscriptionStatus && RECURRING_STATUSES.has(subscriptionStatus));
  const needsCancellation = Boolean(subscriptionId) && hasRecurringStatus;

  if (identity.accountType === "employer" && hasRecurringStatus && !subscriptionId) {
    return NextResponse.json(
      { ok: false, message: "We could not cancel your subscription. Your account has not been changed." },
      { status: 502 },
    );
  }

  if (needsCancellation && subscriptionId) {
    try {
      await getStripeClient().subscriptions.cancel(subscriptionId);
    } catch (error) {
      if (!isMissingStripeResource(error)) {
        return NextResponse.json(
          { ok: false, message: "We could not cancel your subscription. Your account has not been changed." },
          { status: 502 },
        );
      }
    }
  }

  // 2. Storage next. Still recoverable: the account remains signed-in and usable if this fails.
  try {
    await removeOwnedStorageObjects(serviceClient, userId);
  } catch {
    return NextResponse.json(
      { ok: false, message: "We could not remove your uploaded files. Your account has not been deleted." },
      { status: 500 },
    );
  }

  // 3. Application data, in a single transaction inside the SECURITY DEFINER function.
  const { error: rpcError } = await userClient.rpc("delete_own_account");

  if (rpcError) {
    return NextResponse.json(
      { ok: false, message: "We could not delete your account data. Your sign-in has not been removed." },
      { status: 500 },
    );
  }

  // 4. Auth user last. profiles.user_id references auth.users without ON DELETE CASCADE,
  // so this ordering is also required by the database.
  const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(userId);

  if (authDeleteError) {
    return NextResponse.json(
      { ok: false, message: "Your data was removed but your sign-in could not be deleted. Contact support." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
