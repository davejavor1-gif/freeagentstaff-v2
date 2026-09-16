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
