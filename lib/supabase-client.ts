import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

declare global {
  var __supabaseClient: SupabaseClient<Database, "public"> | undefined;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variables.");
}

const globalForSupabase = globalThis as typeof globalThis & {
  __supabaseClient?: SupabaseClient<Database, "public">;
};

const browserStorage = typeof window !== "undefined" ? window.localStorage : undefined;

export const supabase = globalForSupabase.__supabaseClient ?? createClient<Database, "public">(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: browserStorage,
    },
  },
);

globalForSupabase.__supabaseClient = supabase;

export const getSessionWithRetry = async () => {
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    return data.session;
  }

  if (typeof window === "undefined") {
    return null;
  }

  await new Promise((resolve) => window.setTimeout(resolve, 250));

  const retry = await supabase.auth.getSession();
  return retry.data.session;
};