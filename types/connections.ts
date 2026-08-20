import type { EmployerVerificationStatus } from "@/types/freeagent";

export type TalentContactErrorReason =
  | "not_signed_in"
  | "wrong_account_type"
  | "unverified_employer"
  | "invalid_abn"
  | "missing_slug"
  | "contact_unavailable"
  | "error";

export type ConnectionLifecycleStatus = "active" | "revoked";

export type ConnectionErrorReason =
  | "not_signed_in"
  | "wrong_account_type"
  | "unverified_employer"
  | "invalid_abn"
  | "missing_connection_id"
  | "connection_not_found"
  | "not_authorized_connection"
  | "invalid_state"
  | "error";

export interface EmployerConnectionTalentSummary {
  slug: string;
  accessScope: "employer_full" | "employer_confidential";
  visibility: "public" | "verified_employer_network" | "confidential";
  verificationStatus: EmployerVerificationStatus;
  availability: string;
  opportunityStatus: "actively_open" | "exploring" | "not_open";
  experienceYears: number;
  focusArea: string;
  topStrength: string;
  skills: string[];
  location: string;
  name: string | null;
  title: string | null;
  summary: string | null;
  currentEmployer: string | null;
}

export interface EmployerConnectionItem {
  connectionId: string;
  status: ConnectionLifecycleStatus;
  connectedAt: string;
  revokedAt: string | null;
  isCurrentlyEligible: boolean;
  talent: EmployerConnectionTalentSummary | null;
}

export interface TalentConnectionItem {
  connectionId: string;
  status: ConnectionLifecycleStatus;
  connectedAt: string;
  revokedAt: string | null;
  employerCompanyName: string | null;
  employerContactName: string | null;
  employerContactRole: string | null;
}

export interface EmployerConnectionsResponse {
  ok: boolean;
  reason?: ConnectionErrorReason;
  message?: string;
  items: EmployerConnectionItem[];
}

export interface TalentConnectionsResponse {
  ok: boolean;
  reason?: ConnectionErrorReason;
  message?: string;
  items: TalentConnectionItem[];
}

export interface TalentConnectionMutationResponse {
  ok: boolean;
  reason?: ConnectionErrorReason;
  message?: string;
  connectionId?: string;
  status?: ConnectionLifecycleStatus;
  revokedAt?: string | null;
  revokedBy?: "talent" | null;
}

export interface TalentContactDetails {
  talentSlug: string;
  email: string;
}

export interface TalentContactResponse {
  ok: boolean;
  reason?: TalentContactErrorReason;
  message?: string;
  contact?: TalentContactDetails;
}
