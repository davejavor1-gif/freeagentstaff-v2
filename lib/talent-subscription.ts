export type TalentPlanCode = "free_agent" | "free_agent_pro";
export type TalentSubscriptionStatus = "inactive" | "active" | "trialing" | "past_due" | "canceled";

export interface TalentSubscriptionSnapshot {
  plan: TalentPlanCode;
  status: TalentSubscriptionStatus;
  currentPeriodEndsAt: string | null;
}

export interface CanonicalPricingPlan {
  code: "free_agent" | "free_agent_pro" | "employer";
  name: string;
  priceLabel: string;
  cadenceLabel: string;
  audience: "talent" | "employer";
  description: string;
  bullets: string[];
}

export const CANONICAL_PRICING_PLANS: CanonicalPricingPlan[] = [
  {
    code: "free_agent",
    name: "FREE AGENT",
    priceLabel: "$0",
    cadenceLabel: "forever",
    audience: "talent",
    description: "Create your Talent Passport, publish your profile, and stay discoverable by verified employers.",
    bullets: [
      "Talent Passport profile",
      "Discovery visibility controls",
      "Introduction requests and connection workflow",
    ],
  },
  {
    code: "free_agent_pro",
    name: "FREE AGENT PRO",
    priceLabel: "$15.50 AUD",
    cadenceLabel: "per month",
    audience: "talent",
    description: "Unlock analytics and Pro profile media publishing while keeping discovery ranking equal for everyone.",
    bullets: [
      "Pro analytics and insights",
      "Video introduction publishing",
      "Enhanced activity summary",
    ],
  },
  {
    code: "employer",
    name: "EMPLOYER",
    priceLabel: "$265 AUD",
    cadenceLabel: "per month",
    audience: "employer",
    description: "Verified employer access to talent discovery, saved talent workflows, and introductions.",
    bullets: [
      "Verified employer discovery",
      "Saved talent and shortlists",
      "Introduction requests and connections",
    ],
  },
];

function normalizePlanCode(value: string | null | undefined): TalentPlanCode {
  return value === "free_agent_pro" ? "free_agent_pro" : "free_agent";
}

function normalizeStatus(value: string | null | undefined): TalentSubscriptionStatus {
  if (
    value === "active" ||
    value === "trialing" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "inactive"
  ) {
    return value;
  }

  return "inactive";
}

export function normalizeTalentSubscriptionSnapshot(input: {
  plan?: string | null;
  status?: string | null;
  currentPeriodEndsAt?: string | null;
}): TalentSubscriptionSnapshot {
  return {
    plan: normalizePlanCode(input.plan),
    status: normalizeStatus(input.status),
    currentPeriodEndsAt: input.currentPeriodEndsAt ?? null,
  };
}

export function hasTalentProAccess(snapshot: TalentSubscriptionSnapshot, now = new Date()): boolean {
  if (snapshot.plan !== "free_agent_pro") {
    return false;
  }

  if (snapshot.status !== "active" && snapshot.status !== "trialing") {
    return false;
  }

  if (!snapshot.currentPeriodEndsAt) {
    return true;
  }

  const periodEndsAt = new Date(snapshot.currentPeriodEndsAt);
  if (Number.isNaN(periodEndsAt.getTime())) {
    return false;
  }

  return periodEndsAt.getTime() >= now.getTime();
}
