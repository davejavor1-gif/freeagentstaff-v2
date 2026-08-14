export type AvailabilityStatus =
  | "Available Now"
  | "Open to Opportunities"
  | "Open to new projects"
  | "Busy this month"
  | "Booked";

export type ProfileVisibility = "public" | "verified_employer_network" | "confidential" | "employer_network";

export type OpportunityStatus = "actively_open" | "exploring" | "not_open";

export type SalaryExpectation =
  | "under_60k"
  | "60k_80k"
  | "80k_100k"
  | "100k_120k"
  | "120k_150k"
  | "150k_200k"
  | "200k_plus"
  | "prefer_not_to_say";

export type AccountType = "talent" | "employer";

export type EmployerVerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface EmployerProfileDetails {
  contactName: string;
  contactRole: string;
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
  bio?: string;
  skills: string[];
  careerJourney: CareerPosition[];
  education?: string;
  salaryExpectation?: SalaryExpectation | null;
  contactEmail?: string;
  resumeStoragePath?: string | null;
  resumeOriginalFilename?: string | null;
  resumeUploadedAt?: string | null;
  qualifications?: string[];
  intro_video_url?: string | null;
  intro_video_thumbnail_url?: string | null;
  intro_video_storage_path?: string | null;
  email?: string;
  imageAlt?: string;
  photoUrl?: string;
  photo_storage_path?: string | null;
  currentEmployer?: string;
}
