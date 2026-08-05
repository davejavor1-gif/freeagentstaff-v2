export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface ProfilesRow {
  id: string;
  user_id: string;
  account_type: "talent" | "employer";
  slug: string | null;
  visibility: "public" | "verified_employer_network" | "confidential";
  opportunity_status: "actively_open" | "exploring" | "not_open";
  blocked_companies: string[];
  verification_status: "unverified" | "pending" | "verified" | "rejected";
  is_published: boolean;
  employer_company_name: string | null;
  employer_abn: string | null;
  employer_website: string | null;
  employer_industry: string | null;
  employer_company_size: string | null;
  employer_verification_status: "unverified" | "pending" | "verified" | "rejected";
  name: string | null;
  title: string | null;
  location: string | null;
  availability: string | null;
  top_strength: string | null;
  experience_years: number;
  focus_area: string | null;
  summary: string | null;
  skills: string[];
  career_journey: Json;
  email: string | null;
  image_alt: string | null;
  photo_url: string | null;
  current_employer: string | null;
  profile: Json;
  created_at: string;
  updated_at: string;
}

export interface ProfilesInsert {
  user_id: string;
  account_type?: "talent" | "employer";
  slug?: string | null;
  visibility?: "public" | "verified_employer_network" | "confidential";
  opportunity_status?: "actively_open" | "exploring" | "not_open";
  blocked_companies?: string[];
  verification_status?: "unverified" | "pending" | "verified" | "rejected";
  is_published?: boolean;
  employer_company_name?: string | null;
  employer_abn?: string | null;
  employer_website?: string | null;
  employer_industry?: string | null;
  employer_company_size?: string | null;
  employer_verification_status?: "unverified" | "pending" | "verified" | "rejected";
  name?: string | null;
  title?: string | null;
  location?: string | null;
  availability?: string | null;
  top_strength?: string | null;
  experience_years?: number;
  focus_area?: string | null;
  summary?: string | null;
  skills?: string[];
  career_journey?: Json;
  email?: string | null;
  image_alt?: string | null;
  photo_url?: string | null;
  current_employer?: string | null;
  profile: Json;
}

export interface ProfilesUpdate {
  account_type?: "talent" | "employer";
  slug?: string | null;
  visibility?: "public" | "verified_employer_network" | "confidential";
  opportunity_status?: "actively_open" | "exploring" | "not_open";
  blocked_companies?: string[];
  verification_status?: "unverified" | "pending" | "verified" | "rejected";
  is_published?: boolean;
  employer_company_name?: string | null;
  employer_abn?: string | null;
  employer_website?: string | null;
  employer_industry?: string | null;
  employer_company_size?: string | null;
  employer_verification_status?: "unverified" | "pending" | "verified" | "rejected";
  name?: string | null;
  title?: string | null;
  location?: string | null;
  availability?: string | null;
  top_strength?: string | null;
  experience_years?: number;
  focus_area?: string | null;
  summary?: string | null;
  skills?: string[];
  career_journey?: Json;
  email?: string | null;
  image_alt?: string | null;
  photo_url?: string | null;
  current_employer?: string | null;
  profile?: Json;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow;
        Insert: ProfilesInsert;
        Update: ProfilesUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
