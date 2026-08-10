export type AvailabilityStatus =
  | "Available Now"
  | "Open to Opportunities"
  | "Open to new projects"
  | "Busy this month"
  | "Booked";

export type ProfileVisibility = "public" | "verified_employer_network" | "confidential" | "employer_network";

export type OpportunityStatus = "actively_open" | "exploring" | "not_open";

export type AccountType = "talent" | "employer";

export type EmployerVerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface EmployerProfileDetails {
  companyName: string;
  abn: string;
  website: string;
  industry: string;
  companySize: string;
}

export interface CareerPosition {
  id: string;
  role: string;
  company: string;
  period: string;
  location: string;
  description: string;
  achievements: string[];
  skills: string[];
}

export interface IntroductionRequest {
  id: string;
  createdAt: string;
  status: "pending" | "accepted" | "declined";
  employerUserId: string;
  employerName: string;
  employerEmail?: string;
  candidateSlug: string;
  candidateUserId: string;
  message?: string;
  question?: string;
  isRead?: boolean;
}

export interface FreeAgentProfile {
  id: string;
  slug?: string;
  visibility?: ProfileVisibility;
  opportunityStatus?: OpportunityStatus;
  name: string;
  title: string;
  location: string;
  availability: AvailabilityStatus;
  topStrength: string;
  experienceYears: number;
  focusArea: string;
  summary: string;
  skills: string[];
  careerJourney: CareerPosition[];
  qualifications?: string[];
  intro_video_url?: string | null;
  intro_video_thumbnail_url?: string | null;
  intro_video_storage_path?: string | null;
  email?: string;
  imageAlt?: string;
  photoUrl?: string;
  photo_storage_path?: string | null;
  currentEmployer?: string;
  introductionRequests?: IntroductionRequest[];
}
