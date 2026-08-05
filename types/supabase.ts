export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface ProfilesRow {
  id: string;
  user_id: string;
  profile: Json;
  created_at: string;
  updated_at: string;
}

export interface ProfilesInsert {
  user_id: string;
  profile: Json;
}

export interface ProfilesUpdate {
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
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
