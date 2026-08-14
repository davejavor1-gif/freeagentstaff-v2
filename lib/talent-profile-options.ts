import type { SalaryExpectation } from "@/types/freeagent";

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