import type { TalentReferenceAnswers, TalentReferenceWouldWorkAgain } from "@/types/talent-references";

export const TALENT_REFERENCE_ANSWER_LIMITS = {
  professionalRelationship: 500,
  workedTogetherDuration: 200,
  keyStrengths: 2000,
  additionalComments: 2000,
} as const;

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseWouldWorkAgain(value: unknown): TalentReferenceWouldWorkAgain | null {
  if (value === "yes" || value === "no" || value === "prefer_not_to_say") {
    return value;
  }
  return null;
}

function parseIntegerRating(value: unknown): 1 | 2 | 3 | 4 | 5 | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5) {
    return value as 1 | 2 | 3 | 4 | 5;
  }
  return null;
}

export function validateTalentReferenceSubmission(input: unknown): TalentReferenceAnswers | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const row = input as Record<string, unknown>;
  const professionalRelationship = asTrimmedString(row.professionalRelationship);
  const workedTogetherDuration = asTrimmedString(row.workedTogetherDuration);
  const keyStrengths = asTrimmedString(row.keyStrengths);
  const additionalCommentsRaw = row.additionalComments;
  const additionalComments =
    additionalCommentsRaw == null || additionalCommentsRaw === ""
      ? null
      : asTrimmedString(additionalCommentsRaw);
  const reliabilityRating = parseIntegerRating(row.reliabilityRating);
  const teamworkRating = parseIntegerRating(row.teamworkRating);
  const wouldWorkAgain = parseWouldWorkAgain(row.wouldWorkAgain);

  if (!professionalRelationship || professionalRelationship.length > TALENT_REFERENCE_ANSWER_LIMITS.professionalRelationship) {
    return null;
  }
  if (!workedTogetherDuration || workedTogetherDuration.length > TALENT_REFERENCE_ANSWER_LIMITS.workedTogetherDuration) {
    return null;
  }
  if (!keyStrengths || keyStrengths.length > TALENT_REFERENCE_ANSWER_LIMITS.keyStrengths) {
    return null;
  }
  if (additionalComments && additionalComments.length > TALENT_REFERENCE_ANSWER_LIMITS.additionalComments) {
    return null;
  }
  if (!reliabilityRating || !teamworkRating || !wouldWorkAgain || row.confirmation !== true) {
    return null;
  }

  return {
    professionalRelationship,
    workedTogetherDuration,
    keyStrengths,
    reliabilityRating,
    teamworkRating,
    wouldWorkAgain,
    additionalComments,
    confirmation: true,
  };
}

export function firstNameFromDisplayName(fullName: string | null | undefined) {
  return fullName?.trim().split(/\s+/).find(Boolean) ?? "";
}
