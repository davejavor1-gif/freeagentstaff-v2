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
  education: string | null;
  salary_expectation: "under_60k" | "60k_80k" | "80k_100k" | "100k_120k" | "120k_150k" | "150k_200k" | "200k_plus" | "prefer_not_to_say" | null;
  contact_email: string | null;
  resume_storage_path: string | null;
  resume_original_filename: string | null;
  resume_uploaded_at: string | null;
  summary: string | null;
  bio: string | null;
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
  education?: string | null;
  salary_expectation?: ProfilesRow["salary_expectation"];
  contact_email?: string | null;
  resume_storage_path?: string | null;
  resume_original_filename?: string | null;
  resume_uploaded_at?: string | null;
  summary?: string | null;
  bio?: string | null;
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
  education?: string | null;
  salary_expectation?: ProfilesRow["salary_expectation"];
  contact_email?: string | null;
  resume_storage_path?: string | null;
  resume_original_filename?: string | null;
  resume_uploaded_at?: string | null;
  summary?: string | null;
  bio?: string | null;
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

export interface EmployerSavedTalentRow {
  id: string;
  employer_user_id: string;
  talent_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface EmployerSavedTalentInsert {
  employer_user_id: string;
  talent_user_id: string;
}

export interface EmployerSavedTalentUpdate {
  employer_user_id?: string;
  talent_user_id?: string;
}

export interface EmployerShortlistsRow {
  id: string;
  employer_user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface EmployerShortlistsInsert {
  employer_user_id: string;
  name: string;
}

export interface EmployerShortlistsUpdate {
  employer_user_id?: string;
  name?: string;
}

export interface EmployerShortlistMembersRow {
  shortlist_id: string;
  employer_user_id: string;
  talent_user_id: string;
  created_at: string;
}

export interface EmployerShortlistMembersInsert {
  shortlist_id: string;
  employer_user_id: string;
  talent_user_id: string;
}

export interface EmployerShortlistMembersUpdate {
  shortlist_id?: string;
  employer_user_id?: string;
  talent_user_id?: string;
}

export interface EmployerTalentConnectionsRow {
  id: string;
  employer_user_id: string;
  talent_user_id: string;
  introduction_request_id: string | null;
  status: "active" | "revoked";
  revoked_at: string | null;
  revoked_by: "talent" | null;
  connected_at: string;
  created_at: string;
}

export interface EmployerTalentConnectionsInsert {
  employer_user_id: string;
  talent_user_id: string;
  introduction_request_id?: string | null;
  status?: "active" | "revoked";
  revoked_at?: string | null;
  revoked_by?: "talent" | null;
  connected_at?: string;
  created_at?: string;
}

export interface EmployerTalentConnectionsUpdate {
  employer_user_id?: string;
  talent_user_id?: string;
  introduction_request_id?: string | null;
  status?: "active" | "revoked";
  revoked_at?: string | null;
  revoked_by?: "talent" | null;
  connected_at?: string;
  created_at?: string;
}

export interface NotificationsRow {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  notification_type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  event_key: string;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsInsert {
  recipient_user_id: string;
  actor_user_id?: string | null;
  notification_type: string;
  title: string;
  body?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  event_key: string;
  read_at?: string | null;
  created_at?: string;
}

export interface NotificationsUpdate {
  recipient_user_id?: string;
  actor_user_id?: string | null;
  notification_type?: string;
  title?: string;
  body?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  event_key?: string;
  read_at?: string | null;
  created_at?: string;
}

export interface SystemAdminsRow {
  user_id: string;
  created_at: string;
  created_by: string | null;
}

export interface SystemAdminsInsert {
  user_id: string;
  created_at?: string;
  created_by?: string | null;
}

export interface SystemAdminsUpdate {
  user_id?: string;
  created_at?: string;
  created_by?: string | null;
}

export interface Database {
  public: {
    Tables: {
      employer_saved_talent: {
        Row: EmployerSavedTalentRow;
        Insert: EmployerSavedTalentInsert;
        Update: EmployerSavedTalentUpdate;
      };
      employer_shortlist_members: {
        Row: EmployerShortlistMembersRow;
        Insert: EmployerShortlistMembersInsert;
        Update: EmployerShortlistMembersUpdate;
      };
      employer_shortlists: {
        Row: EmployerShortlistsRow;
        Insert: EmployerShortlistsInsert;
        Update: EmployerShortlistsUpdate;
      };
      employer_talent_connections: {
        Row: EmployerTalentConnectionsRow;
        Insert: EmployerTalentConnectionsInsert;
        Update: EmployerTalentConnectionsUpdate;
      };
      notifications: {
        Row: NotificationsRow;
        Insert: NotificationsInsert;
        Update: NotificationsUpdate;
      };
      profiles: {
        Row: ProfilesRow;
        Insert: ProfilesInsert;
        Update: ProfilesUpdate;
      };
      system_admins: {
        Row: SystemAdminsRow;
        Insert: SystemAdminsInsert;
        Update: SystemAdminsUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: {
      require_system_admin_actor: {
        Args: Record<string, never>;
        Returns: string;
      };
      admin_dashboard_summary: {
        Args: Record<string, never>;
        Returns: Array<{
          total_talent_accounts: number;
          published_talent: number;
          unpublished_talent: number;
          total_employer_accounts: number;
          verified_employers: number;
          pending_employers: number;
          rejected_employers: number;
        }>;
      };
      admin_list_accounts: {
        Args: {
          p_query?: string | null;
          p_account_type?: "talent" | "employer" | null;
          p_limit?: number;
          p_after_created_at?: string | null;
          p_after_user_id?: string | null;
        };
        Returns: Array<{
          user_id: string;
          account_type: "talent" | "employer";
          display_name: string | null;
          secondary_label: string | null;
          email: string | null;
          slug: string | null;
          is_published: boolean | null;
          visibility: "public" | "verified_employer_network" | "confidential" | "employer_network" | null;
          opportunity_status: "actively_open" | "exploring" | "not_open" | null;
          employer_verification_status: "unverified" | "pending" | "verified" | "rejected" | null;
          created_at: string;
          updated_at: string;
        }>;
      };
      admin_get_account: {
        Args: { p_user_id: string };
        Returns: Array<{
          user_id: string;
          account_type: "talent" | "employer";
          email: string | null;
          slug: string | null;
          display_name: string | null;
          secondary_label: string | null;
          is_published: boolean | null;
          visibility: "public" | "verified_employer_network" | "confidential" | "employer_network" | null;
          opportunity_status: "actively_open" | "exploring" | "not_open" | null;
          employer_verification_status: "unverified" | "pending" | "verified" | "rejected" | null;
          name: string | null;
          title: string | null;
          location: string | null;
          availability: string | null;
          top_strength: string | null;
          focus_area: string | null;
          summary: string | null;
          current_employer: string | null;
          experience_years: number | null;
          employer_contact_name: string | null;
          employer_contact_role: string | null;
          employer_company_name: string | null;
          employer_abn: string | null;
          employer_website: string | null;
          employer_industry: string | null;
          employer_company_size: string | null;
          verification_requested_at: string | null;
          verification_reviewed_at: string | null;
          verification_reviewed_by: string | null;
          verification_rejection_reason: string | null;
          blocked_company_count: number;
          pending_introduction_requests: number;
          active_connections: number;
          saved_talent_count: number;
          created_at: string;
          updated_at: string;
        }>;
      };
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
          education: string | null;
          salary_expectation: ProfilesRow["salary_expectation"];
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
      discovery_profiles_for_verified_employer_v2: {
        Args: Record<string, never>;
        Returns: Array<{
          slug: string;
          visibility: "public" | "verified_employer_network" | "confidential" | null;
          verification_status: "unverified" | "pending" | "verified" | "rejected" | null;
          availability: string | null;
          opportunity_status: "actively_open" | "exploring" | "not_open" | null;
          experience_years: number | null;
          focus_area: string | null;
          education: string | null;
          salary_expectation: ProfilesRow["salary_expectation"];
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
          education: string | null;
          salary_expectation: ProfilesRow["salary_expectation"];
          top_strength: string | null;
          skills: string[] | null;
          location: string | null;
          name: string | null;
          title: string | null;
          summary: string | null;
          current_employer: string | null;
          career_journey: Json | null;
          photo_storage_path: string | null;
          intro_video_storage_path: string | null;
        }>;
      };
      talent_passport_for_viewer_v2: {
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
          education: string | null;
          salary_expectation: ProfilesRow["salary_expectation"];
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
      talent_passport_for_viewer_v3: {
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
          bio: string | null;
          current_employer: string | null;
          email: string | null;
          career_journey: Json | null;
          photo_storage_path: string | null;
          intro_video_storage_path: string | null;
          education: string | null;
          salary_expectation: ProfilesRow["salary_expectation"];
        }>;
      };
      employer_request_talent_private_access: {
        Args: { p_talent_slug: string };
        Returns: Array<{ request_id: string; request_status: string; requested_at: string }>;
      };
      list_talent_private_access_requests: {
        Args: Record<string, never>;
        Returns: Array<{
          request_id: string;
          employer_user_id: string;
          employer_company_name: string | null;
          employer_contact_name: string | null;
          employer_contact_role: string | null;
          request_status: string;
          requested_at: string;
          responded_at: string | null;
          revoked_at: string | null;
        }>;
      };
      talent_set_private_access_request_status: {
        Args: { p_request_id: string; p_status: "accepted" | "declined" };
        Returns: Array<{ request_id: string; request_status: string; responded_at: string }>;
      };
      talent_revoke_private_access: {
        Args: { p_request_id: string };
        Returns: Array<{ request_id: string; request_status: string; revoked_at: string }>;
      };
      talent_private_access_for_viewer: {
        Args: { p_talent_slug: string };
        Returns: Array<{
          request_id: string | null;
          is_owner: boolean;
          request_status: string;
          requested_at: string | null;
          contact_email: string | null;
          resume_original_filename: string | null;
          resume_uploaded_at: string | null;
          resume_available: boolean;
        }>;
      };
      talent_private_details_for_authorized_employer: {
        Args: { p_talent_slug: string };
        Returns: Array<{
          contact_email: string | null;
          resume_original_filename: string | null;
          resume_uploaded_at: string | null;
          resume_storage_path: string | null;
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
      save_talent_for_employer: {
        Args: {
          p_slug: string;
          p_shortlist_ids?: string[] | null;
        };
        Returns: Array<{
          success: boolean;
          already_saved: boolean;
          saved_talent_id: string;
          saved_at: string;
        }>;
      };
      unsave_talent_for_employer: {
        Args: { p_slug: string };
        Returns: Array<{
          success: boolean;
          removed: boolean;
        }>;
      };
      create_employer_shortlist: {
        Args: { p_name: string };
        Returns: Array<{
          shortlist_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        }>;
      };
      rename_employer_shortlist: {
        Args: {
          p_shortlist_id: string;
          p_name: string;
        };
        Returns: Array<{
          shortlist_id: string;
          name: string;
          updated_at: string;
        }>;
      };
      delete_employer_shortlist: {
        Args: { p_shortlist_id: string };
        Returns: Array<{
          success: boolean;
          removed: boolean;
        }>;
      };
      add_saved_talent_to_shortlist: {
        Args: {
          p_slug: string;
          p_shortlist_id: string;
        };
        Returns: Array<{
          success: boolean;
        }>;
      };
      remove_saved_talent_from_shortlist: {
        Args: {
          p_slug: string;
          p_shortlist_id: string;
        };
        Returns: Array<{
          success: boolean;
          removed: boolean;
        }>;
      };
      list_employer_shortlists: {
        Args: Record<string, never>;
        Returns: Array<{
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
          member_count: number;
        }>;
      };
      list_saved_talent_for_employer: {
        Args: {
          p_shortlist_id: string | null;
        };
        Returns: Array<{
          saved_talent_id: string;
          saved_at: string;
          slug: string;
          access_scope: "owner_full" | "employer_full" | "employer_confidential" | null;
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
          career_journey: Json | null;
          photo_storage_path: string | null;
          intro_video_storage_path: string | null;
          shortlist_ids: string[] | null;
        }>;
      };
      talent_contact_for_connected_employer: {
        Args: { p_talent_slug: string };
        Returns: Array<{
          talent_slug: string;
          email: string;
        }>;
      };
      list_employer_connections: {
        Args: Record<string, never>;
        Returns: Array<{
          connection_id: string;
          status: "active" | "revoked" | null;
          connected_at: string;
          revoked_at: string | null;
          is_currently_eligible: boolean;
          talent_slug: string | null;
          access_scope: "owner_full" | "employer_full" | "employer_confidential" | null;
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
        }>;
      };
      list_talent_connections: {
        Args: Record<string, never>;
        Returns: Array<{
          connection_id: string;
          status: "active" | "revoked" | null;
          connected_at: string;
          revoked_at: string | null;
          employer_company_name: string | null;
          employer_contact_name: string | null;
          employer_contact_role: string | null;
        }>;
      };
      talent_revoke_connection: {
        Args: { p_connection_id: string };
        Returns: Array<{
          connection_id: string;
          status: "active" | "revoked" | null;
          revoked_at: string | null;
          revoked_by: "talent" | null;
        }>;
      };
      list_my_notifications: {
        Args: {
          p_limit?: number;
          p_unread_only?: boolean;
        };
        Returns: Array<{
          notification_id: string;
          notification_type: string;
          title: string;
          body: string | null;
          entity_type: string | null;
          entity_id: string | null;
          read_at: string | null;
          created_at: string;
          action_path: string;
        }>;
      };
      mark_notification_read: {
        Args: { p_notification_id: string };
        Returns: Array<{
          success: boolean;
          notification_id: string;
          read_at: string | null;
        }>;
      };
      mark_all_notifications_read: {
        Args: Record<string, never>;
        Returns: Array<{
          success: boolean;
          updated_count: number;
        }>;
      };
      get_unread_notification_count: {
        Args: Record<string, never>;
        Returns: Array<{
          unread_count: number;
        }>;
      };
      update_talent_privacy_settings: {
        Args: {
          p_visibility: string;
          p_opportunity_status: string;
          p_is_published: boolean;
        };
        Returns: Array<{
          visibility: "public" | "verified_employer_network" | "confidential" | null;
          opportunity_status: "actively_open" | "exploring" | "not_open" | null;
          is_published: boolean;
          blocked_companies: string[] | null;
        }>;
      };
      add_talent_blocked_company: {
        Args: { p_identifier: string };
        Returns: Array<{
          success: boolean;
          blocked_key: string;
          blocked_companies: string[] | null;
        }>;
      };
      remove_talent_blocked_company: {
        Args: { p_key: string };
        Returns: Array<{
          success: boolean;
          removed: boolean;
          blocked_companies: string[] | null;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
