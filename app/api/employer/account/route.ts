import { NextResponse } from "next/server";
import { resolveAccountIdentity } from "@/lib/account-identity";
import { createUserDataClient, createUserServerSupabaseClient } from "@/lib/server-supabase";

type EmployerIdentifierType = "abn" | "acn";

type SaveBody = {
  contactName?: string;
  contactRole?: string;
  companyName?: string;
  identifierType?: EmployerIdentifierType;
  abn?: string;
  acn?: string;
  website?: string;
  industry?: string;
};

type EmployerProfileRow = {
  user_id: string;
  account_type: "talent" | "employer";
  employer_verification_status?: "unverified" | "pending" | "more_info_required" | "verified" | "rejected" | null;
  employer_contact_name?: string | null;
  employer_contact_role?: string | null;
  employer_company_name?: string | null;
  employer_abn?: string | null;
  employer_acn?: string | null;
  employer_identifier_type?: EmployerIdentifierType | null;
  employer_website?: string | null;
  employer_industry?: string | null;
  verification_requested_at?: string | null;
  verification_rejection_reason?: string | null;
};

type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null;

const EMPLOYER_PROFILE_COLUMNS =
  "user_id, account_type, employer_verification_status, employer_contact_name, employer_contact_role, employer_company_name, employer_abn, employer_acn, employer_identifier_type, employer_website, employer_industry, verification_requested_at, verification_rejection_reason";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() || null : null;
}

function textOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function logSaveError(
  stage: string,
  error: { code?: string; message?: string; details?: string; hint?: string } | null,
) {
  console.error("employer-account save failed", {
    stage,
    code: error?.code ?? null,
    message: error?.message ?? "unknown",
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  });
}

const SLUG_UNIQUE_CONSTRAINT = "profiles_slug_key";
const MAX_SLUG_INSERT_ATTEMPTS = 20;

function uniqueViolationConstraint(error: PostgrestLikeError) {
  if (error?.code !== "23505") {
    return null;
  }

  const haystack = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
  if (haystack.includes(SLUG_UNIQUE_CONSTRAINT) || haystack.includes("profiles_slug_unique_idx")) {
    return "slug";
  }

  return "other";
}

function employerProfileSlug(companyName: string | null, attempt: number) {
  const normalized = (companyName ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = (normalized || "member").slice(0, 48);

  if (attempt <= 1) {
    return base;
  }

  const suffix = `-${attempt}`;
  return `${base.slice(0, Math.max(1, 48 - suffix.length))}${suffix}`;
}

export async function POST(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
  }

  const authClient = createUserServerSupabaseClient(accessToken);
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return NextResponse.json({ ok: false, message: "Unable to verify your account." }, { status: 401 });
  }

  const db = createUserDataClient(accessToken);

  const body = (await request.json().catch(() => null)) as SaveBody | null;
  const identifierType: EmployerIdentifierType = body?.identifierType === "acn" ? "acn" : "abn";
  const details = {
    employer_contact_name: textOrNull(body?.contactName),
    employer_contact_role: textOrNull(body?.contactRole),
    employer_company_name: textOrNull(body?.companyName),
    employer_identifier_type: identifierType,
    employer_abn: identifierType === "abn" ? textOrNull(body?.abn) : undefined,
    employer_acn: identifierType === "acn" ? textOrNull(body?.acn) : undefined,
    employer_website: textOrNull(body?.website),
    employer_industry: textOrNull(body?.industry),
  };

  const { data: existing, error: selectError } = await db
    .from("profiles")
    .select("user_id, account_type")
    .eq("user_id", userData.user.id)
    .maybeSingle<{ user_id: string; account_type: "talent" | "employer" }>();

  if (selectError) {
    logSaveError("select", selectError);
    return NextResponse.json({ ok: false, message: "We couldn't load your employer profile right now. Please try again." }, { status: 500 });
  }

  const identity = resolveAccountIdentity({
    profileExists: Boolean(existing),
    profileAccountType: existing?.account_type,
    metadataAccountType: userData.user.user_metadata?.account_type,
  });

  if (identity.status !== "resolved" || identity.accountType !== "employer") {
    return NextResponse.json({ ok: false, message: "Employer account required." }, { status: 403 });
  }

  const employerDetails = {
    employer_contact_name: details.employer_contact_name,
    employer_contact_role: details.employer_contact_role,
    employer_company_name: details.employer_company_name,
    employer_identifier_type: details.employer_identifier_type,
    ...(identifierType === "abn"
      ? { employer_abn: details.employer_abn ?? null }
      : { employer_acn: details.employer_acn ?? null }),
    employer_website: details.employer_website,
    employer_industry: details.employer_industry,
  };

  let saved: EmployerProfileRow | null = null;

  if (!existing) {
    let inserted: EmployerProfileRow | null = null;
    let insertError: PostgrestLikeError = null;

    for (let attempt = 1; attempt <= MAX_SLUG_INSERT_ATTEMPTS; attempt += 1) {
      const insertResult = await db
        .from("profiles")
        .insert([
          {
            user_id: userData.user.id,
            account_type: "employer",
            employer_verification_status: "unverified",
            profile: {},
            slug: employerProfileSlug(details.employer_company_name, attempt),
            employer_contact_name: details.employer_contact_name,
            employer_contact_role: details.employer_contact_role,
            employer_company_name: details.employer_company_name,
            employer_identifier_type: details.employer_identifier_type,
            employer_abn: details.employer_abn ?? null,
            employer_acn: details.employer_acn ?? null,
            employer_website: details.employer_website,
            employer_industry: details.employer_industry,
          } as never,
        ])
        .select(EMPLOYER_PROFILE_COLUMNS)
        .maybeSingle<EmployerProfileRow>();
      inserted = insertResult.data;
      insertError = insertResult.error;

      if (!insertError) {
        if (inserted) {
          saved = inserted;
        }
        break;
      }

      if (uniqueViolationConstraint(insertError) === "slug" && attempt < MAX_SLUG_INSERT_ATTEMPTS) {
        continue;
      }

      break;
    }

    if (insertError) {
      if (insertError.code === "23505") {
        const ownLookup = await db
          .from("profiles")
          .select("user_id, account_type")
          .eq("user_id", userData.user.id)
          .maybeSingle<{ user_id: string; account_type: "talent" | "employer" }>();

        if (ownLookup.error || ownLookup.data?.account_type !== "employer") {
          logSaveError("insert", insertError);
          return NextResponse.json({ ok: false, message: "We couldn't save your details right now. Please try again." }, { status: 500 });
        }
      } else {
        logSaveError("insert", insertError);
        return NextResponse.json({ ok: false, message: "We couldn't save your details right now. Please try again." }, { status: 500 });
      }
    } else if (inserted) {
      saved = inserted;
    }
  }

  if (!saved) {
    const { data: updated, error: updateError } = await db
      .from("profiles")
      .update(employerDetails as never)
      .eq("user_id", userData.user.id)
      .eq("account_type", "employer")
      .select(EMPLOYER_PROFILE_COLUMNS)
      .maybeSingle<EmployerProfileRow>();

    if (updateError) {
      logSaveError(existing ? "update" : "insert-unique-update", updateError);
      return NextResponse.json({ ok: false, message: "We couldn't save your details right now. Please try again." }, { status: 500 });
    }

    saved = updated ?? null;
  }

  if (!saved || saved.account_type !== "employer") {
    logSaveError("reload", { message: "write returned no employer row" });
    return NextResponse.json({ ok: false, message: "We couldn't save your details right now. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile: saved });
}
