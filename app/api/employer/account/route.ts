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

type DiagnosticOperation = "profile_select" | "profile_insert" | "profile_update";

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

function pathnameOnly(input: RequestInfo | URL) {
  try {
    if (typeof input === "string") {
      return new URL(input).pathname;
    }
    if (input instanceof URL) {
      return input.pathname;
    }
    return new URL(input.url).pathname;
  } catch {
    return "(unparsed)";
  }
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) {
    return init.method;
  }
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.method;
  }
  return "GET";
}

function accountTypeOnly(value: unknown) {
  if (value === "talent" || value === "employer") {
    return value;
  }
  if (value == null) {
    return null;
  }
  return "invalid";
}

function logDbResult(
  operation: DiagnosticOperation,
  stage: string,
  data: unknown,
  error: PostgrestLikeError,
) {
  const isArray = Array.isArray(data);
  const row = !isArray && data && typeof data === "object"
    ? data as { account_type?: unknown }
    : isArray && data.length === 1 && data[0] && typeof data[0] === "object"
      ? data[0] as { account_type?: unknown }
      : null;

  console.info("employer-account db result", {
    operation,
    stage,
    errorExists: Boolean(error),
    errorCode: error?.code ?? null,
    errorMessage: error?.message ?? null,
    errorDetails: error?.details ?? null,
    errorHint: error?.hint ?? null,
    dataIsNull: data == null,
    dataIsArray: isArray,
    dataArrayLength: isArray ? data.length : null,
    rowExists: isArray ? data.length > 0 : data != null,
    returnedAccountType: accountTypeOnly(row?.account_type),
  });
}

async function withObservedPostgrestFetch<T>(
  operation: DiagnosticOperation,
  run: () => T | PromiseLike<T>,
): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    try {
      const outgoing = new Headers(init?.headers);
      const authorization = outgoing.get("authorization");
      const bodyText = await response.clone().text();
      console.info("employer-account postgrest", {
        operation,
        method: requestMethod(input, init),
        pathname: pathnameOnly(input),
        responseStatus: response.status,
        responseBodyEmpty: bodyText.length === 0,
        responseContentType: response.headers.get("content-type"),
        prefer: outgoing.get("prefer"),
        authorizationHeaderPresent: Boolean(authorization),
        authorizationIsBearer: Boolean(authorization?.toLowerCase().startsWith("bearer ")),
        apikeyHeaderPresent: outgoing.has("apikey"),
      });
    } catch {
      console.info("employer-account postgrest", {
        operation,
        diagnosticFailed: true,
      });
    }
    return response;
  }) as typeof fetch;

  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
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

  const { data: existing, error: selectError } = await withObservedPostgrestFetch("profile_select", () =>
    db
      .from("profiles")
      .select("user_id, account_type")
      .eq("user_id", userData.user.id)
      .maybeSingle<{ user_id: string; account_type: "talent" | "employer" }>(),
  );
  logDbResult("profile_select", "select", existing, selectError);

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
    const { data: inserted, error: insertError } = await withObservedPostgrestFetch("profile_insert", () =>
      db
        .from("profiles")
        .insert([
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
        ])
        .select(EMPLOYER_PROFILE_COLUMNS)
        .maybeSingle<EmployerProfileRow>(),
    );
    logDbResult("profile_insert", "insert", inserted, insertError);

    if (insertError) {
      if (insertError.code !== "23505") {
        logSaveError("insert", insertError);
        return NextResponse.json({ ok: false, message: "We couldn't save your details right now. Please try again." }, { status: 500 });
      }
    } else if (inserted) {
      saved = inserted;
    }
  }

  if (!saved) {
    const { data: updated, error: updateError } = await withObservedPostgrestFetch("profile_update", () =>
      db
        .from("profiles")
        .update(employerDetails as never)
        .eq("user_id", userData.user.id)
        .eq("account_type", "employer")
        .select(EMPLOYER_PROFILE_COLUMNS)
        .maybeSingle<EmployerProfileRow>(),
    );
    logDbResult("profile_update", existing ? "update" : "insert-unique-update", updated, updateError);

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
