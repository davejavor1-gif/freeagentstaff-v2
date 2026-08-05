export type AvailabilityStatus =
  | "Available Now"
  | "Open to Opportunities"
  | "Open to new projects"
  | "Busy this month"
  | "Booked";

export type ProfileVisibility = "public" | "employer_network" | "confidential";

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
  email?: string;
  imageAlt?: string;
  photoUrl?: string;
  introductionRequests?: IntroductionRequest[];
}
