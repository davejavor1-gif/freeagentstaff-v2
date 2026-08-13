import type { ProfileVisibility } from "@/types/freeagent";

export type AdminResultReason =
  | "not_authenticated"
  | "system_admin_required"
  | "not_found"
  | "invalid_query"
  | "error";

export interface AdminDashboardSummary {
  totalTalentAccounts: number;
  publishedTalent: number;
  unpublishedTalent: number;
  totalEmployerAccounts: number;
  verifiedEmployers: number;
  pendingEmployers: number;
  rejectedEmployers: number;
}

export interface AdminDashboardResponse {
  ok: boolean;
  reason?: AdminResultReason;
  message?: string;
  summary?: AdminDashboardSummary;
}

export interface AdminAccountCursor {
  createdAt: string;
  userId: string;
}

export interface AdminAccountListItem {
  userId: string;
  accountType: "talent" | "employer";
  displayName: string | null;
  secondaryLabel: string | null;
  email: string | null;
  slug: string | null;
  isPublished: boolean | null;
  visibility: ProfileVisibility | null;
  opportunityStatus: "actively_open" | "exploring" | "not_open" | null;
  employerVerificationStatus: "unverified" | "pending" | "verified" | "rejected" | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAccountListResponse {
  ok: boolean;
  reason?: AdminResultReason;
  message?: string;
  items?: AdminAccountListItem[];
  nextCursor?: AdminAccountCursor | null;
}

export interface AdminAccountDetail {
  userId: string;
  accountType: "talent" | "employer";
  email: string | null;
  slug: string | null;
  displayName: string | null;
  secondaryLabel: string | null;
  isPublished: boolean | null;
  visibility: ProfileVisibility | null;
  opportunityStatus: "actively_open" | "exploring" | "not_open" | null;
  employerVerificationStatus: "unverified" | "pending" | "verified" | "rejected" | null;
  name: string | null;
  title: string | null;
  location: string | null;
  availability: string | null;
  topStrength: string | null;
  focusArea: string | null;
  summary: string | null;
  currentEmployer: string | null;
  experienceYears: number | null;
  employerContactName: string | null;
  employerContactRole: string | null;
  employerCompanyName: string | null;
  employerAbn: string | null;
  employerWebsite: string | null;
  employerIndustry: string | null;
  employerCompanySize: string | null;
  verificationRequestedAt: string | null;
  verificationReviewedAt: string | null;
  verificationReviewedBy: string | null;
  verificationRejectionReason: string | null;
  blockedCompanyCount: number;
  pendingIntroductionRequests: number;
  activeConnections: number;
  savedTalentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAccountDetailResponse {
  ok: boolean;
  reason?: AdminResultReason;
  message?: string;
  account?: AdminAccountDetail;
}

export interface AdminAccountListQuery {
  query?: string;
  accountType?: "talent" | "employer" | null;
  limit?: number;
  cursor?: AdminAccountCursor | null;
}