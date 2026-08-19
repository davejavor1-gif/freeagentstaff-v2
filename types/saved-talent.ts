import type { EmployerVerificationStatus, FreeAgentProfile } from "@/types/freeagent";

export type SavedTalentErrorReason =
  | "not_signed_in"
  | "wrong_account_type"
  | "unverified_employer"
  | "invalid_abn"
  | "shortlist_not_found"
  | "invalid_shortlist_ids"
  | "candidate_not_found"
  | "not_authorized_for_candidate"
  | "duplicate_name"
  | "invalid_name"
  | "error";

export interface SavedTalentItem {
  savedTalentId: string;
  savedAt: string;
  slug: string;
  accessScope: "employer_full" | "employer_confidential";
  verificationStatus: EmployerVerificationStatus;
  hasProAccess: boolean;
  shortlistIds: string[];
  profile: FreeAgentProfile;
}

export interface ShortlistSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

export interface SavedTalentListResponse {
  ok: boolean;
  reason?: SavedTalentErrorReason;
  message?: string;
  shortlistId?: string | null;
  items: SavedTalentItem[];
}

export interface SaveTalentResponse {
  ok: boolean;
  reason?: SavedTalentErrorReason;
  message?: string;
  alreadySaved?: boolean;
  savedTalentId?: string;
  savedAt?: string;
}

export interface RemoveSavedTalentResponse {
  ok: boolean;
  reason?: SavedTalentErrorReason;
  message?: string;
  removed?: boolean;
}

export interface ShortlistsResponse {
  ok: boolean;
  reason?: SavedTalentErrorReason;
  message?: string;
  shortlists: ShortlistSummary[];
}

export interface CreateShortlistResponse {
  ok: boolean;
  reason?: SavedTalentErrorReason;
  message?: string;
  shortlist?: ShortlistSummary;
}

export interface UpdateShortlistResponse {
  ok: boolean;
  reason?: SavedTalentErrorReason;
  message?: string;
  shortlist?: ShortlistSummary;
}

export interface DeleteShortlistResponse {
  ok: boolean;
  reason?: SavedTalentErrorReason;
  message?: string;
  removed?: boolean;
}

export interface ShortlistMemberMutationResponse {
  ok: boolean;
  reason?: SavedTalentErrorReason;
  message?: string;
  removed?: boolean;
}
