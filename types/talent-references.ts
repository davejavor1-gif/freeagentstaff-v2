/** v1 referee-submitted payload stored in talent_references.answers. */
export type TalentReferenceWouldWorkAgain = "yes" | "no" | "prefer_not_to_say";

export type TalentReferenceAnswers = {
  professionalRelationship: string;
  workedTogetherDuration: string;
  keyStrengths: string;
  reliabilityRating: 1 | 2 | 3 | 4 | 5;
  teamworkRating: 1 | 2 | 3 | 4 | 5;
  wouldWorkAgain: TalentReferenceWouldWorkAgain;
  additionalComments: string | null;
  confirmation: true;
};

export type TalentReferenceOwnerStatus = "pending" | "submitted" | "cancelled";

export type TalentReferenceOwnerView = {
  id: string;
  refereeName: string;
  jobTitle: string | null;
  company: string | null;
  relationship: string | null;
  refereeEmail: string;
  status: TalentReferenceOwnerStatus;
  invitationExpiresAt: string | null;
  invitationSentAt: string | null;
  invitationRevokedAt: string | null;
  invitationLive: boolean;
  submittedAt: string | null;
  answers: TalentReferenceAnswers | null;
  shareWithConnectedEmployers: boolean;
  talentDisplayName: string;
  createdAt: string;
  updatedAt: string;
};
