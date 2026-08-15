import type { ConnectionLifecycleStatus } from "@/types/connections";
import type { IntroductionRequestStatus } from "@/types/introduction-requests";
import type { ProfileVisibility } from "@/types/freeagent";

export type DashboardSummaryReason =
  | "not_signed_in"
  | "wrong_account_type"
  | "unverified_employer"
  | "invalid_abn"
  | "error";

export interface EmployerDashboardSummaryRequestPreview {
  requestId: string;
  talentSlug: string;
  talentName: string;
  status: IntroductionRequestStatus;
  createdAt: string;
  respondedAt?: string | null;
  withdrawnAt?: string | null;
  isCurrentlyEligible: boolean;
}

export interface EmployerDashboardConnectionPreview {
  connectionId: string;
  status: ConnectionLifecycleStatus;
  connectedAt: string;
  revokedAt: string | null;
  talentSlug: string | null;
  talentName: string | null;
  talentTitle: string | null;
  accessScope: "employer_full" | "employer_confidential" | null;
}

export interface EmployerSummaryPayload {
  savedTalentCount: number;
  pendingIntroductionRequests: number;
  activeConnections: number;
  activeShortlists: number;
  requestPreview: EmployerDashboardSummaryRequestPreview[];
  connectionPreview: EmployerDashboardConnectionPreview[];
}

export interface EmployerSummaryResponse {
  ok: boolean;
  reason?: DashboardSummaryReason;
  message?: string;
  summary?: EmployerSummaryPayload;
}

export interface TalentDashboardRequestPreview {
  requestId: string;
  employerCompanyName: string | null;
  employerContactName: string | null;
  employerContactRole: string | null;
  status: IntroductionRequestStatus;
  createdAt: string;
  message?: string;
  canTalentRespond: boolean;
}

export interface TalentDashboardConnectionPreview {
  connectionId: string;
  status: ConnectionLifecycleStatus;
  connectedAt: string;
  revokedAt: string | null;
  employerCompanyName: string | null;
}

export interface TalentSubscriptionSummary {
  plan: "free_agent" | "free_agent_pro";
  status: "inactive" | "active" | "trialing" | "past_due" | "canceled";
  currentPeriodEndsAt: string | null;
  hasProAccess: boolean;
}

export interface TalentProAnalyticsSummary {
  searchImpressions30d: number;
  passportViews30d: number;
  uniqueEmployerViewers30d: number;
  recentEmployerViewers: string[];
  insights: string[];
}

export interface TalentSummaryPayload {
  isPublished: boolean;
  visibility: Exclude<ProfileVisibility, "employer_network">;
  pendingIntroductionRequests: number;
  activeConnections: number;
  subscription: TalentSubscriptionSummary;
  proAnalytics: TalentProAnalyticsSummary | null;
  requestPreview: TalentDashboardRequestPreview[];
  connectionPreview: TalentDashboardConnectionPreview[];
}

export interface TalentSummaryResponse {
  ok: boolean;
  reason?: DashboardSummaryReason;
  message?: string;
  summary?: TalentSummaryPayload;
}
