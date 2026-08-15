import "server-only";

import { createServiceRoleSupabaseClient } from "@/lib/server-supabase";
import { hasTalentProAccess, normalizeTalentSubscriptionSnapshot } from "@/lib/talent-subscription";

export type TalentAnalyticsEventType = "search_impression" | "passport_view";

type TalentProfileSubscriptionRow = {
  slug: string | null;
  user_id: string;
  talent_plan: string | null;
  talent_subscription_status: string | null;
  talent_subscription_current_period_ends_at: string | null;
};

type AnalyticsUpsertRow = {
  talent_user_id: string;
  viewer_user_id: string;
  employer_company_name: string | null;
  event_type: TalentAnalyticsEventType;
  event_day: string;
  event_at: string;
};

function isoUtcDay(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function loadTalentSubscriptionRowsBySlugs(slugs: string[]) {
  const serviceClient = createServiceRoleSupabaseClient();

  if (!serviceClient || slugs.length === 0) {
    return new Map<string, TalentProfileSubscriptionRow>();
  }

  const { data, error } = await serviceClient
    .from("profiles")
    .select("slug, user_id, talent_plan, talent_subscription_status, talent_subscription_current_period_ends_at")
    .in("slug", slugs)
    .eq("account_type", "talent");

  if (error || !Array.isArray(data)) {
    return new Map<string, TalentProfileSubscriptionRow>();
  }

  const rows = (data as unknown[])
    .filter((row): row is TalentProfileSubscriptionRow => {
      if (!row || typeof row !== "object") {
        return false;
      }

      const candidate = row as Record<string, unknown>;
      return typeof candidate.slug === "string" && typeof candidate.user_id === "string";
    });

  return new Map(rows.map((row) => [row.slug as string, row]));
}

export async function trackTalentAnalyticsEvents(input: {
  talentUserIds: string[];
  viewerUserId: string;
  employerCompanyName?: string | null;
  eventType: TalentAnalyticsEventType;
}) {
  const serviceClient = createServiceRoleSupabaseClient();

  if (!serviceClient || input.talentUserIds.length === 0) {
    return;
  }

  const uniqueTalentUserIds = Array.from(new Set(input.talentUserIds));
  const { data: subscriptionRows } = await serviceClient
    .from("profiles")
    .select("user_id, talent_plan, talent_subscription_status, talent_subscription_current_period_ends_at")
    .in("user_id", uniqueTalentUserIds)
    .eq("account_type", "talent");

  const entitledTalentUserIds = new Set(
    (subscriptionRows as unknown[])
      .filter((row): row is {
        user_id: string;
        talent_plan: string | null;
        talent_subscription_status: string | null;
        talent_subscription_current_period_ends_at: string | null;
      } => Boolean(row && typeof row === "object" && typeof (row as Record<string, unknown>).user_id === "string"))
      .filter((row) => hasTalentProAccess(normalizeTalentSubscriptionSnapshot({
        plan: row.talent_plan,
        status: row.talent_subscription_status,
        currentPeriodEndsAt: row.talent_subscription_current_period_ends_at,
      })))
      .map((row) => row.user_id),
  );

  const entitledTalentIds = uniqueTalentUserIds.filter((talentUserId) => entitledTalentUserIds.has(talentUserId));
  if (entitledTalentIds.length === 0) {
    return;
  }

  const now = new Date();
  const rows: AnalyticsUpsertRow[] = entitledTalentIds.map((talentUserId) => ({
    talent_user_id: talentUserId,
    viewer_user_id: input.viewerUserId,
    employer_company_name: input.employerCompanyName ?? null,
    event_type: input.eventType,
    event_day: isoUtcDay(now),
    event_at: now.toISOString(),
  }));

  await serviceClient.from("talent_pro_analytics_events").upsert(rows as never, {
    onConflict: "talent_user_id,viewer_user_id,event_type,event_day",
    ignoreDuplicates: true,
  } as never);
}
