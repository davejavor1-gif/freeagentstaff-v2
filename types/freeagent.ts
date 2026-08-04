export type AvailabilityStatus =
  | "Available Now"
  | "Open to Opportunities"
  | "Open to new projects"
  | "Busy this month"
  | "Booked";

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
  email?: string;
  imageAlt?: string;
}
