export type AvailabilityStatus =
  | "Available Now"
  | "Open to Opportunities"
  | "Open to new projects"
  | "Busy this month"
  | "Booked";

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
}
