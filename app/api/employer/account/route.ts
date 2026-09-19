import { NextResponse } from "next/server";
import { resolveAccountIdentity } from "@/lib/account-identity";
import { createUserServerSupabaseClient } from "@/lib/server-supabase";

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

function logSaveError(stage: string, error: { code?: string; message?: string } | null) {
  console.error("employer-account save failed", {
    stage,
    code: error?.code ?? null,
    message: error?.message ?? "unknown",
  });
}

export async function POST(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
  }

  const userClient = createUserServerSupabaseClient(accessToken);
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return NextResponse.json({ ok: false, message: "Unable to verify your account." }, { status: 401 });
  }

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

  const { data: existing, error: selectError } = await userClient
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

  if (!existing) {
    const { error: insertError } = await userClient.from("profiles").insert([
      {
        user_id: userData.user.id,
        account_type: "employer",
        employer_verification_status: "unverified",
        profile: {},
        employer_contact_name: details.employer_contact_name,
        employer_contact_role: details.employer_contact_role,
        employer_company_name: details.employer_company_name,
        employer_identifier_type: details.employer_identifier_type,
        employer_abn: details.employer_abn ?? null,
        employer_acn: details.employer_acn ?? null,
        employer_website: details.employer_website,
        employer_industry: details.employer_industry,
      } as never,
    ]);

    if (insertError) {
      if (insertError.code !== "23505") {
        logSaveError("insert", insertError);
        return NextResponse.json({ ok: false, message: "We couldn't save your details right now. Please try again." }, { status: 500 });
      }

      const { error: racedUpdateError } = await userClient
        .from("profiles")
        .update(employerDetails as never)
        .eq("user_id", userData.user.id)
        .eq("account_type", "employer");

      if (racedUpdateError) {
        logSaveError("insert-unique-update", racedUpdateError);
        return NextResponse.json({ ok: false, message: "We couldn't save your details right now. Please try again." }, { status: 500 });
      }
    }
  } else {
    const { error: updateError } = await userClient
      .from("profiles")
      .update(employerDetails as never)
      .eq("user_id", userData.user.id);

    if (updateError) {
      logSaveError("update", updateError);
      return NextResponse.json({ ok: false, message: "We couldn't save your details right now. Please try again." }, { status: 500 });
    }
  }

  const { data: saved, error: savedError } = await userClient
    .from("profiles")
    .select(EMPLOYER_PROFILE_COLUMNS)
    .eq("user_id", userData.user.id)
    .maybeSingle<EmployerProfileRow>();

  if (savedError || !saved) {
    logSaveError("reload", savedError);
    return NextResponse.json({ ok: false, message: "Details were saved but we couldn't reload them. Refresh this page." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile: saved });
}
