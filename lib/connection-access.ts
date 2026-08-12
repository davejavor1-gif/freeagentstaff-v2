import "server-only";

import { createUserServerSupabaseClient } from "@/lib/server-supabase";
import type { TalentContactErrorReason, TalentContactResponse } from "@/types/connections";

type ContactRow = {
  talent_slug: string;
  email: string;
};

function mapReasonFromError(message: string): TalentContactErrorReason {
  if (message.includes("not_signed_in")) return "not_signed_in";
  if (message.includes("wrong_account_type")) return "wrong_account_type";
  if (message.includes("unverified_employer")) return "unverified_employer";
  if (message.includes("invalid_abn")) return "invalid_abn";
  if (message.includes("missing_slug")) return "missing_slug";
  if (message.includes("contact_unavailable")) return "contact_unavailable";
  return "error";
}

function getUserClient(accessToken: string | null | undefined) {
  if (!accessToken) {
    return null;
  }

  return createUserServerSupabaseClient(accessToken);
}

export async function loadTalentContactForConnectedEmployer(
  accessToken: string | null | undefined,
  slug: string,
): Promise<TalentContactResponse> {
  const userClient = getUserClient(accessToken);

  if (!userClient) {
    return { ok: false, reason: "not_signed_in", message: "Sign in required." };
  }

  const { data, error } = await (userClient as unknown as {
    rpc: (name: string, params?: Record<string, unknown>) => Promise<{ data: ContactRow[] | null; error: { message: string } | null }>;
  }).rpc("talent_contact_for_connected_employer", {
    p_talent_slug: slug,
  });

  if (error) {
    return {
      ok: false,
      reason: mapReasonFromError(error.message),
      message: error.message,
    };
  }

  const row = data?.[0];
  if (!row?.talent_slug || !row.email) {
    return {
      ok: false,
      reason: "contact_unavailable",
      message: "Contact details are currently unavailable.",
    };
  }

  return {
    ok: true,
    contact: {
      talentSlug: row.talent_slug,
      email: row.email,
    },
  };
}
