import type { AvailabilityStatus, OpportunityStatus, SalaryExpectation } from "@/types/freeagent";

export const availabilityOptions: ReadonlyArray<{ value: AvailabilityStatus; label: string; description: string }> = [
  { value: "Available Now", label: "Available Now", description: "Ready for immediate opportunities and conversations." },
  { value: "Open to Opportunities", label: "Open to Opportunities", description: "Open to conversations about the right opportunity." },
  { value: "Closed to Opportunities", label: "Closed to Opportunities", description: "Not currently considering new opportunities." },
];

export const availabilityStatusColors: Record<AvailabilityStatus, string> = {
  "Available Now": "#AFF546",
  "Open to Opportunities": "#E58A3A",
  "Closed to Opportunities": "#C95B5B",
};

export const availabilityStatusClasses: Record<AvailabilityStatus, { dot: string; pill: string; border: string }> = {
  "Available Now": { dot: "bg-[#AFF546]", pill: "bg-[#AFF546] text-[#08111F]", border: "border-[#AFF546]/70" },
  "Open to Opportunities": { dot: "bg-[#E58A3A]", pill: "bg-[#E58A3A] text-[#08111F]", border: "border-[#E58A3A]/70" },
  "Closed to Opportunities": { dot: "bg-[#C95B5B]", pill: "bg-[#C95B5B] text-[#fffaf0]", border: "border-[#C95B5B]/70" },
};

const legacyAvailabilityMap: Record<string, AvailabilityStatus> = {
  "Available Now": "Available Now",
  "Open to Opportunities": "Open to Opportunities",
  "Open to new projects": "Open to Opportunities",
  "Closed to Opportunities": "Closed to Opportunities",
  "Busy this month": "Closed to Opportunities",
  Booked: "Closed to Opportunities",
};

const opportunityStatusMap: Record<OpportunityStatus, AvailabilityStatus> = {
  actively_open: "Available Now",
  exploring: "Open to Opportunities",
  not_open: "Closed to Opportunities",
};

export function normalizeAvailability(
  value: string | null | undefined,
  opportunityStatus?: string | null,
): AvailabilityStatus {
  if (value && opportunityStatusMap[value as OpportunityStatus]) {
    return opportunityStatusMap[value as OpportunityStatus];
  }

  if (value && legacyAvailabilityMap[value]) {
    return legacyAvailabilityMap[value];
  }

  if (opportunityStatus && opportunityStatusMap[opportunityStatus as OpportunityStatus]) {
    return opportunityStatusMap[opportunityStatus as OpportunityStatus];
  }

  return "Available Now";
}

export function availabilityToOpportunityStatus(value: string | null | undefined): OpportunityStatus {
  const canonical = normalizeAvailability(value);

  if (canonical === "Open to Opportunities") return "exploring";
  if (canonical === "Closed to Opportunities") return "not_open";
  return "actively_open";
}

export const salaryExpectationOptions: ReadonlyArray<{ value: SalaryExpectation; label: string }> = [
  { value: "under_60k", label: "Under $60,000" },
  { value: "60k_80k", label: "$60,000-$80,000" },
  { value: "80k_100k", label: "$80,000-$100,000" },
  { value: "100k_120k", label: "$100,000-$120,000" },
  { value: "120k_150k", label: "$120,000-$150,000" },
  { value: "150k_200k", label: "$150,000-$200,000" },
  { value: "200k_plus", label: "$200,000+" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const salaryExpectationLabels: Record<SalaryExpectation, string> = Object.fromEntries(
  salaryExpectationOptions.map((option) => [option.value, option.label]),
) as Record<SalaryExpectation, string>;

export function formatAvailabilityLabel(
  value: AvailabilityStatus | string | null | undefined,
  opportunityStatus?: string | null,
): string {
  if (!value) {
    return normalizeAvailability(value, opportunityStatus);
  }

  return normalizeAvailability(value, opportunityStatus);
}