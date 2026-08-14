import type { EmployerVerificationStatus, FreeAgentProfile } from "@/types/freeagent";
import type { PrivateAccessState } from "@/types/private-access";

export type DiscoveryDeniedReason =
  | "not_signed_in"
  | "wrong_account_type"
  | "unverified_employer"
  | "invalid_abn"
  | "not_available"
  | "error";

export type TalentPassportAccessScope = "owner_full" | "employer_full" | "employer_confidential";

export interface DiscoveryProfileCard {
  slug: string;
  verificationStatus: EmployerVerificationStatus;
  profile: FreeAgentProfile;
}

export interface DiscoveryApiResponse {
  allowed: boolean;
  reason?: DiscoveryDeniedReason;
  message?: string;
  profiles: DiscoveryProfileCard[];
}

export interface TalentPassportApiResponse {
  allowed: boolean;
  reason?: DiscoveryDeniedReason;
  message?: string;
  accessScope?: TalentPassportAccessScope;
  isOwner?: boolean;
  verificationStatus?: EmployerVerificationStatus;
  profile?: FreeAgentProfile;
  privateAccess?: PrivateAccessState;
}