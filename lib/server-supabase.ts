import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

function getSupabaseUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  }

  return supabaseUrl;
}

function getPublishableKey() {
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabasePublishableKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable.");
  }

  return supabasePublishableKey;
}

export function createUserServerSupabaseClient(accessToken: string): SupabaseClient<Database, "public"> {
  return createClient<Database, "public">(
    getSupabaseUrl(),
    getPublishableKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  );
}

/**
 * PostgREST client that sends the user JWT as Bearer via supabase-js `accessToken`.
 * Do not call `.auth` on this client; that option disables the Auth namespace.
 */
export function createUserDataClient(accessToken: string): SupabaseClient<Database, "public"> {
  return createClient<Database, "public">(
    getSupabaseUrl(),
    getPublishableKey(),
    {
      accessToken: async () => accessToken,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export function createServiceRoleSupabaseClient(): SupabaseClient<Database, "public"> | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return null;
  }

  return createClient<Database, "public">(
    getSupabaseUrl(),
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}