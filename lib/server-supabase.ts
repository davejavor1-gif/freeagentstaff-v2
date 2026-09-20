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
 * PostgREST client that always sends the user JWT as Bearer.
 * Do not call `.auth` on this client; `accessToken` disables the Auth namespace.
 */
export function createUserDataClient(accessToken: string): SupabaseClient<Database, "public"> {
  const supabaseKey = getPublishableKey();

  return createClient<Database, "public">(
    getSupabaseUrl(),
    supabaseKey,
    {
      accessToken: async () => accessToken,
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = new Headers(init?.headers);
          headers.set("Authorization", `Bearer ${accessToken}`);
          headers.set("apikey", supabaseKey);
          return fetch(input, { ...init, headers });
        },
      },
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