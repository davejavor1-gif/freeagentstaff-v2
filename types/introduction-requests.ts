export type IntroductionRequestStatus = "pending" | "accepted" | "declined" | "withdrawn";

export type IntroductionRequestErrorReason =
  | "not_signed_in"
  | "wrong_account_type"
  | "unverified_employer"
  | "invalid_abn"
  | "missing_slug"
  | "candidate_not_found"
  | "request_not_found"
  | "invalid_state"
  | "invalid_status"
  | "not_authorized_for_candidate"
  | "relationship_no_longer_eligible"
  | "cannot_request_self"
  | "error";

export interface EmployerIntroductionRequestItem {
  requestId: string;
  talentUserId: string;
  talentSlug: string;
  talentName: string;
  status: IntroductionRequestStatus;
  message?: string;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string | null;
  withdrawnAt?: string | null;
  accessScope?: "employer_full" | "employer_confidential" | null;
  isCurrentlyEligible: boolean;
}

export interface TalentIntroductionRequestItem {
  requestId: string;
  employerUserId: string;
  employerCompanyName?: string | null;
  employerContactName?: string | null;
  employerContactRole?: string | null;
  status: IntroductionRequestStatus;
  message?: string;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string | null;
  withdrawnAt?: string | null;
  canTalentRespond: boolean;
}

export interface CreateIntroductionRequestResponse {
  ok: boolean;
  reason?: IntroductionRequestErrorReason;
  message?: string;
  alreadyExists?: boolean;
  requestId?: string;
  status?: IntroductionRequestStatus;
  createdAt?: string;
}

export interface EmployerIntroductionRequestsResponse {
  ok: boolean;
  reason?: IntroductionRequestErrorReason;
  message?: string;
  items: EmployerIntroductionRequestItem[];
}

export interface TalentIntroductionRequestsResponse {
  ok: boolean;
  reason?: IntroductionRequestErrorReason;
  message?: string;
  items: TalentIntroductionRequestItem[];
}

export interface IntroductionRequestMutationResponse {
  ok: boolean;
  reason?: IntroductionRequestErrorReason;
  message?: string;
  requestId?: string;
  status?: IntroductionRequestStatus;
  respondedAt?: string | null;
  withdrawnAt?: string | null;
}
