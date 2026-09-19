import type { AccountType } from "@/types/freeagent";

export type ResolvedAccountIdentity =
  | { status: "resolved"; accountType: AccountType }
  | { status: "unresolved" }
  | { status: "mismatch"; profileType: AccountType; metadataType: AccountType };

export function parseAccountType(value: unknown): AccountType | null {
  return value === "talent" || value === "employer" ? value : null;
}

export function resolveAccountIdentity(input: {
  profileExists: boolean;
  profileAccountType?: unknown;
  metadataAccountType?: unknown;
}): ResolvedAccountIdentity {
  const profileType = parseAccountType(input.profileAccountType);
  const metadataType = parseAccountType(input.metadataAccountType);

  if (input.profileExists) {
    if (!profileType) {
      return { status: "unresolved" };
    }

    if (metadataType && metadataType !== profileType) {
      return { status: "mismatch", profileType, metadataType };
    }

    return { status: "resolved", accountType: profileType };
  }

  if (metadataType) {
    return { status: "resolved", accountType: metadataType };
  }

  return { status: "unresolved" };
}

export function accountHomePath(
  accountType: AccountType,
  employerVerificationStatus?: string | null,
) {
  if (accountType !== "employer") {
    return "/dashboard";
  }

  if (employerVerificationStatus === "pending" || employerVerificationStatus === "verified") {
    return "/dashboard";
  }

  return "/onboarding/employer";
}
