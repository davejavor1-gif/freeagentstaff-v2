export type PrivateAccessStatus = "none" | "pending" | "accepted" | "declined" | "revoked" | "owner_full";

export interface PrivateAccessRequest {
  requestId: string;
  employerUserId: string;
  employerCompanyName: string | null;
  employerContactName: string | null;
  employerContactRole: string | null;
  status: Exclude<PrivateAccessStatus, "none" | "owner_full">;
  requestedAt: string;
  respondedAt: string | null;
  revokedAt: string | null;
}

export interface PrivateAccessState {
  requestId: string | null;
  isOwner: boolean;
  status: PrivateAccessStatus;
  requestedAt: string | null;
  contactEmail: string | null;
  resumeOriginalFilename: string | null;
  resumeUploadedAt: string | null;
  resumeAvailable: boolean;
  requests?: PrivateAccessRequest[];
}

export interface PrivateAccessResponse {
  ok: boolean;
  state?: PrivateAccessState;
  message?: string;
}