export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface ProfilesRow {
  id: string;
  user_id: string;
  account_type: "talent" | "employer";
  slug: string | null;
  visibility: "public" | "verified_employer_network" | "confidential" | "employer_network";
  opportunity_status: "actively_open" | "exploring" | "not_open";
  blocked_companies: string[];
  verification_status: "unverified" | "pending" | "verified" | "rejected";
  is_published: boolean;
  employer_company_name: string | null;
  employer_contact_name: string | null;
  employer_contact_role: string | null;
  employer_abn: string | null;
  employer_website: string | null;
  employer_industry: string | null;
  employer_company_size: string | null;
  employer_verification_status: "unverified" | "pending" | "verified" | "rejected";
  verification_requested_at: string | null;
  verification_reviewed_at: string | null;
  verification_reviewed_by: string | null;
  verification_rejection_reason: string | null;
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
  photo_storage_path: string | null;
  current_employer: string | null;
  intro_video_url: string | null;
  intro_video_storage_path: string | null;
  profile: Json;
  created_at: string;
  updated_at: string;
}

export interface ProfilesInsert {
  user_id: string;
  account_type?: "talent" | "employer";
  slug?: string | null;
  visibility?: "public" | "verified_employer_network" | "confidential" | "employer_network";
  opportunity_status?: "actively_open" | "exploring" | "not_open";
  blocked_companies?: string[];
  verification_status?: "unverified" | "pending" | "verified" | "rejected";
  is_published?: boolean;
  employer_company_name?: string | null;
  employer_contact_name?: string | null;
  employer_contact_role?: string | null;
  employer_abn?: string | null;
  employer_website?: string | null;
  employer_industry?: string | null;
  employer_company_size?: string | null;
  employer_verification_status?: "unverified" | "pending" | "verified" | "rejected";
  verification_requested_at?: string | null;
  verification_reviewed_at?: string | null;
  verification_reviewed_by?: string | null;
  verification_rejection_reason?: string | null;
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
  photo_storage_path?: string | null;
  current_employer?: string | null;
  intro_video_url?: string | null;
  intro_video_storage_path?: string | null;
  profile: Json;
}

export interface ProfilesUpdate {
  account_type?: "talent" | "employer";
  slug?: string | null;
  visibility?: "public" | "verified_employer_network" | "confidential" | "employer_network";
  opportunity_status?: "actively_open" | "exploring" | "not_open";
  blocked_companies?: string[];
  verification_status?: "unverified" | "pending" | "verified" | "rejected";
  is_published?: boolean;
  employer_company_name?: string | null;
  employer_contact_name?: string | null;
  employer_contact_role?: string | null;
  employer_abn?: string | null;
  employer_website?: string | null;
  employer_industry?: string | null;
  employer_company_size?: string | null;
  employer_verification_status?: "unverified" | "pending" | "verified" | "rejected";
  verification_requested_at?: string | null;
  verification_reviewed_at?: string | null;
  verification_reviewed_by?: string | null;
  verification_rejection_reason?: string | null;
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
  photo_storage_path?: string | null;
  current_employer?: string | null;
  intro_video_url?: string | null;
  intro_video_storage_path?: string | null;
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
    Functions: {
      discovery_profiles_for_verified_employer: {
        Args: Record<string, never>;
        Returns: Array<{
          slug: string;
          visibility: "public" | "verified_employer_network" | "confidential" | null;
          verification_status: "unverified" | "pending" | "verified" | "rejected" | null;
          availability: string | null;
          opportunity_status: "actively_open" | "exploring" | "not_open" | null;
          experience_years: number | null;
          focus_area: string | null;
          top_strength: string | null;
          skills: string[] | null;
          location: string | null;
          name: string | null;
          title: string | null;
          summary: string | null;
          current_employer: string | null;
          photo_storage_path: string | null;
          intro_video_storage_path: string | null;
          can_view_identifying_info: boolean | null;
          can_view_media: boolean | null;
        }>;
      };
      talent_passport_for_viewer: {
        Args: { p_slug: string };
        Returns: Array<{
          slug: string;
          visibility: "public" | "verified_employer_network" | "confidential" | null;
          is_owner: boolean;
          access_scope: "owner_full" | "employer_full" | "employer_confidential" | null;
          verification_status: "unverified" | "pending" | "verified" | "rejected" | null;
          availability: string | null;
          opportunity_status: "actively_open" | "exploring" | "not_open" | null;
          experience_years: number | null;
          focus_area: string | null;
          top_strength: string | null;
          skills: string[] | null;
          location: string | null;
          name: string | null;
          title: string | null;
          summary: string | null;
          current_employer: string | null;
          email: string | null;
          career_journey: Json | null;
          photo_storage_path: string | null;
          intro_video_storage_path: string | null;
        }>;
      };
      submit_employer_verification: {
        Args: Record<string, never>;
        Returns: Array<{
          success: boolean;
          employer_verification_status: "unverified" | "pending" | "verified" | "rejected" | null;
          verification_requested_at: string | null;
          normalized_abn: string | null;
          message: string | null;
        }>;
      };
      admin_review_employer_verification: {
        Args: {
          p_user_id: string;
          p_decision: "verified" | "rejected";
          p_reason?: string | null;
          p_reviewer?: string | null;
        };
        Returns: Array<{
          success: boolean;
          employer_verification_status: "unverified" | "pending" | "verified" | "rejected" | null;
          verification_reviewed_at: string | null;
          verification_reviewed_by: string | null;
          verification_rejection_reason: string | null;
          message: string | null;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
