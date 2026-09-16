import "server-only";

import { createUserServerSupabaseClient } from "@/lib/server-supabase";
import { hasEmployerSubscriptionAccess, type EmployerSubscriptionSnapshot } from "@/lib/talent-subscription";

export async function isSystemAdminEmployer(accessToken: string | null | undefined) {
  if (!accessToken) {
    return false;
  }

  const client = createUserServerSupabaseClient(accessToken);
  const [{ data: adminId, error: adminError }, { data: profile, error: profileError }] = await Promise.all([
    client.rpc("require_system_admin_actor"),
    client.from("profiles").select("account_type").maybeSingle<{ account_type: "talent" | "employer" }>(),
  ]);

  return !adminError && Boolean(adminId) && !profileError && profile?.account_type === "employer";
}

export async function hasEmployerPaidAccess(
  accessToken: string | null | undefined,
  snapshot: EmployerSubscriptionSnapshot,
) {
  return (await isSystemAdminEmployer(accessToken)) || hasEmployerSubscriptionAccess(snapshot);
}

export type EmployerDiscoveryScope = "full" | "rockstar_only" | "none";

// Short Stay access is intentionally excluded from hasEmployerPaidAccess(): it is a narrower,
// Rockstar-only discovery entitlement, never full employer access.
export function hasActiveShortStayAccess(
  shortStayAccessExpiresAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (!shortStayAccessExpiresAt) {
    return false;
  }

  const expiresAt = new Date(shortStayAccessExpiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > now.getTime();
}

export function resolveEmployerDiscoveryScope(
  hasFullAccess: boolean,
  shortStayAccessExpiresAt: string | null | undefined,
  now = new Date(),
): EmployerDiscoveryScope {
  if (hasFullAccess) {
    return "full";
  }

  if (hasActiveShortStayAccess(shortStayAccessExpiresAt, now)) {
    return "rockstar_only";
  }

  return "none";
}
