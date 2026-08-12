export type TalentContactErrorReason =
  | "not_signed_in"
  | "wrong_account_type"
  | "unverified_employer"
  | "invalid_abn"
  | "missing_slug"
  | "contact_unavailable"
  | "error";

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
