import type { OpportunityStatus, ProfileVisibility } from "@/types/freeagent";

export type TalentPrivacyErrorReason =
  | "not_signed_in"
  | "wrong_account_type"
  | "invalid_visibility"
  | "invalid_opportunity_status"
  | "invalid_block_identifier"
  | "missing_publish_state"
  | "missing_block_key"
  | "talent_privacy_fields_protected"
  | "error";

export interface TalentPrivacySettings {
  slug: string | null;
  visibility: Exclude<ProfileVisibility, "employer_network">;
  opportunityStatus: OpportunityStatus;
  isPublished: boolean;
  blockedCompanies: string[];
}

export interface TalentPrivacySettingsResponse {
  ok: boolean;
  reason?: TalentPrivacyErrorReason;
  message?: string;
  settings?: TalentPrivacySettings;
}

export interface TalentBlockedCompanyMutationResponse {
  ok: boolean;
  reason?: TalentPrivacyErrorReason;
  message?: string;
  blockedKey?: string;
  removed?: boolean;
  blockedCompanies?: string[];
}