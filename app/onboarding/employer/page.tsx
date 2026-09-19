"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/layout/Footer";
import { accountHomePath, resolveAccountIdentity } from "@/lib/account-identity";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import type { AccountType, EmployerVerificationStatus } from "@/types/freeagent";

type EmployerIdentifierType = "abn" | "acn";

type EmployerFormState = {
  contactName: string;
  contactRole: string;
  companyName: string;
  identifierType: EmployerIdentifierType;
  abn: string;
  acn: string;
  website: string;
  industry: string;
};

type EmployerProfileRow = {
  user_id: string;
  account_type?: AccountType;
  employer_verification_status?: EmployerVerificationStatus;
  employer_contact_name?: string | null;
  employer_contact_role?: string | null;
  employer_company_name?: string | null;
  employer_abn?: string | null;
  employer_acn?: string | null;
  employer_identifier_type?: EmployerIdentifierType | null;
  employer_website?: string | null;
  employer_industry?: string | null;
  verification_requested_at?: string | null;
  verification_reviewed_at?: string | null;
  verification_reviewed_by?: string | null;
  verification_rejection_reason?: string | null;
};

const blankForm: EmployerFormState = {
  contactName: "",
  contactRole: "",
  companyName: "",
  identifierType: "abn",
  abn: "",
  acn: "",
  website: "",
  industry: "",
};

const requiredFieldLabels: Record<keyof Omit<EmployerFormState, "identifierType" | "abn" | "acn">, string> = {
  contactName: "Contact name",
  contactRole: "Your role",
  companyName: "Company name",
  website: "Website",
  industry: "Industry",
};

function normalizeAbn(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) {
    return "";
  }

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const adjusted = Number(digits[0]) - 1;
  if (adjusted < 0) {
    return "";
  }

  let total = adjusted * weights[0];
  for (let index = 1; index < digits.length; index += 1) {
    total += Number(digits[index]) * weights[index];
  }

  return total % 89 === 0 ? digits : "";
}

function formatAbnInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

function normalizeAcn(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 9) {
    return "";
  }

  const weights = [8, 7, 6, 5, 4, 3, 2, 1];
  const weightedSum = digits
    .slice(0, 8)
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0);
  const checkDigit = ((10 - (weightedSum % 10)) % 10).toString();

  return checkDigit === digits[8] ? digits : "";
}

function formatAcnInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function mapRpcError(errorMessage: string): string {
  const msg = errorMessage.toLowerCase();
  if (msg.includes("invalid_abn")) {
    return "Enter a valid 11-digit Australian Business Number.";
  }
  if (msg.includes("invalid_acn")) {
    return "Enter a valid 9-digit Australian Company Number.";
  }
  if (msg.includes("missing_required_fields")) {
    return "Please complete all required contact and company fields before submitting for verification.";
  }
  if (msg.includes("invalid_state")) {
    return "Your account cannot be submitted from its current verification state.";
  }
  if (msg.includes("wrong_account_type")) {
    return "Only employer accounts can submit for verification.";
  }
  if (msg.includes("not_signed_in")) {
    return "Your session expired. Please sign in again.";
  }
  return "We couldn’t submit your verification right now. Please try again.";
}

export default function EmployerOnboardingPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<EmployerVerificationStatus>("unverified");
  const [requestedAt, setRequestedAt] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [form, setForm] = useState<EmployerFormState>(blankForm);
  const [baselineIdentity, setBaselineIdentity] = useState<{ companyName: string; identifierType: EmployerIdentifierType; abn: string; acn: string; website: string }>({ companyName: "", identifierType: "abn", abn: "", acn: "", website: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [touchedSubmit, setTouchedSubmit] = useState(false);
  const [isPendingEditing, setIsPendingEditing] = useState(false);

  const isPendingStatus = verificationStatus === "pending";
  const isPendingReadOnly = isPendingStatus && !isPendingEditing;

  const normalizedAbn = useMemo(() => normalizeAbn(form.abn), [form.abn]);
  const isAbnValid = normalizedAbn.length === 11;
  const normalizedAcn = useMemo(() => normalizeAcn(form.acn), [form.acn]);
  const isAcnValid = normalizedAcn.length === 9;
  const isIdentifierValid = form.identifierType === "acn" ? isAcnValid : isAbnValid;

  const missingRequiredFields = useMemo(() => {
    const missing: string[] = [];
    (Object.keys(requiredFieldLabels) as Array<keyof Omit<EmployerFormState, "identifierType" | "abn" | "acn">>).forEach((key) => {
      if (!form[key].trim()) {
        missing.push(requiredFieldLabels[key]);
      }
    });
    return missing;
  }, [form]);

  const identityChanged = useMemo(() => {
    return (
      form.companyName.trim() !== baselineIdentity.companyName.trim() ||
      form.identifierType !== baselineIdentity.identifierType ||
      normalizeAbn(form.abn) !== normalizeAbn(baselineIdentity.abn) ||
      normalizeAcn(form.acn) !== normalizeAcn(baselineIdentity.acn) ||
      form.website.trim().toLowerCase() !== baselineIdentity.website.trim().toLowerCase()
    );
  }, [baselineIdentity.abn, baselineIdentity.acn, baselineIdentity.companyName, baselineIdentity.identifierType, baselineIdentity.website, form.abn, form.acn, form.companyName, form.identifierType, form.website]);

  const refreshEmployerRow = async (userId: string): Promise<EmployerProfileRow | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "user_id, account_type, employer_verification_status, employer_contact_name, employer_contact_role, employer_company_name, employer_abn, employer_acn, employer_identifier_type, employer_website, employer_industry, verification_requested_at, verification_rejection_reason",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as EmployerProfileRow | null) ?? null;
  };

  const hydrateFromRow = (row: EmployerProfileRow) => {
    const nextVerificationStatus = row.employer_verification_status ?? "unverified";
    setAccountType("employer");
    setVerificationStatus(nextVerificationStatus);
    if (nextVerificationStatus !== "pending") {
      setIsPendingEditing(false);
    }
    setRequestedAt(row.verification_requested_at ?? null);
    setRejectionReason(row.verification_rejection_reason ?? null);

    const nextIdentifierType: EmployerIdentifierType = row.employer_identifier_type ?? (row.employer_abn ? "abn" : "abn");
    const nextForm: EmployerFormState = {
      contactName: row.employer_contact_name ?? "",
      contactRole: row.employer_contact_role ?? "",
      companyName: row.employer_company_name ?? "",
      identifierType: nextIdentifierType,
      abn: formatAbnInput(row.employer_abn ?? ""),
      acn: formatAcnInput(row.employer_acn ?? ""),
      website: row.employer_website ?? "",
      industry: row.employer_industry ?? "",
    };

    setForm(nextForm);
    setBaselineIdentity({
      companyName: nextForm.companyName,
      identifierType: nextForm.identifierType,
      abn: nextForm.abn,
      acn: nextForm.acn,
      website: nextForm.website,
    });
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const session = await getSessionWithRetry();
      if (!mounted) return;

      if (!session) {
        router.replace("/employer/auth");
        return;
      }

      setCurrentUserId(session.user.id);

      let row = await refreshEmployerRow(session.user.id);
      const identity = resolveAccountIdentity({
        profileExists: Boolean(row),
        profileAccountType: row?.account_type,
        metadataAccountType: session.user.user_metadata?.account_type,
      });

      if (identity.status !== "resolved" || identity.accountType !== "employer") {
        router.replace(identity.status === "resolved" ? accountHomePath(identity.accountType) : "/dashboard");
        return;
      }

      if (!row) {
        const { error: createError } = await supabase.from("profiles").insert([
          {
            user_id: session.user.id,
            account_type: "employer",
            employer_verification_status: "unverified",
            profile: {},
          } as never,
        ]);

        if (createError) {
          setFormError(createError.message);
          setLoading(false);
          return;
        }

        row = await refreshEmployerRow(session.user.id);
      }

      if (!row) {
        setFormError("Unable to load your employer profile.");
        setLoading(false);
        return;
      }

      hydrateFromRow(row);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const refreshVerification = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("employer_verification_status, verification_requested_at, verification_rejection_reason")
        .eq("user_id", currentUserId)
        .maybeSingle<EmployerProfileRow>();

      if (!data) {
        return;
      }

      const nextStatus = data.employer_verification_status ?? "unverified";
      setVerificationStatus(nextStatus);
      setRequestedAt(data.verification_requested_at ?? null);
      setRejectionReason(data.verification_rejection_reason ?? null);
      if (nextStatus !== "pending") {
        setIsPendingEditing(false);
      }
    };

    const interval = window.setInterval(() => {
      void refreshVerification();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [currentUserId]);

  const saveDetails = async () => {
    const session = await getSessionWithRetry();
    if (!session) {
      router.replace("/employer/auth");
      return;
    }

    setSaving(true);
    setFormError(null);
    setStatusMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        employer_contact_name: form.contactName.trim() || null,
        employer_contact_role: form.contactRole.trim() || null,
        employer_company_name: form.companyName.trim() || null,
        employer_identifier_type: form.identifierType,
        // Only the active identifier field is written so switching identifier type
        // never overwrites a previously recorded ABN or ACN.
        ...(form.identifierType === "abn"
          ? { employer_abn: form.abn.trim() || null }
          : { employer_acn: form.acn.trim() || null }),
        employer_website: form.website.trim() || null,
        employer_industry: form.industry.trim() || null,
      } as never)
      .eq("user_id", session.user.id);

    if (error) {
      setSaving(false);
      setFormError("We couldn’t save your details right now. Please try again.");
      return;
    }

    try {
      const row = await refreshEmployerRow(session.user.id);
      if (row) {
        hydrateFromRow(row);
      }
    } catch {
      // Keep existing optimistic form state; next refresh will reconcile.
    }

    setSaving(false);
    setStatusMessage("Employer details saved.");
  };

  const submitVerification = async () => {
    setTouchedSubmit(true);
    setFormError(null);
    setStatusMessage(null);

    if (missingRequiredFields.length > 0) {
      setFormError("Please complete all required fields before submitting for verification.");
      return;
    }

    if (!isIdentifierValid) {
      setFormError(
        form.identifierType === "acn"
          ? "Enter a valid 9-digit Australian Company Number."
          : "Enter a valid 11-digit Australian Business Number.",
      );
      return;
    }

    const session = await getSessionWithRetry();
    if (!session) {
      router.replace("/employer/auth");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.rpc("submit_employer_verification");

    if (error) {
      setSubmitting(false);
      setFormError(mapRpcError(error.message));
      return;
    }

    try {
      const row = await refreshEmployerRow(session.user.id);
      if (row) {
        hydrateFromRow(row);
      }
    } catch {
      // If refresh fails, keep success state message only.
    }

    setSubmitting(false);
    setStatusMessage("Your employer account has been submitted for review.");
  };

  const cancelPendingEdit = async () => {
    if (!currentUserId) {
      setIsPendingEditing(false);
      return;
    }

    try {
      const row = await refreshEmployerRow(currentUserId);
      if (row) {
        hydrateFromRow(row);
      }
    } catch {
      // Ignore refresh errors and keep current local form values.
    }

    setIsPendingEditing(false);
    setTouchedSubmit(false);
    setFormError(null);
    setStatusMessage(null);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col bg-[#08111F] text-[#071426]">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 lg:px-10">
          <div className="rounded-[32px] border border-[#cda64d]/55 bg-[#0f2744] p-8 text-[#f7ebcf] shadow-[0_20px_60px_rgba(6,16,33,0.16)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#f2cc63]">Loading employer setup...</p>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (accountType !== "employer") {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#08111F] text-[#071426]">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <section className="rounded-[36px] border border-[#cda64d]/45 bg-[#f7e8c6] p-6 text-[#08111F] shadow-[0_20px_60px_rgba(6,16,33,0.16)] sm:p-8 lg:p-10">
          <div className="grid gap-8 pb-2 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.48fr)] lg:items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#08798a]">EMPLOYER ACCOUNT</p>
              <h1 className="mt-4 font-serif text-4xl leading-[0.95] tracking-tight sm:text-5xl">Your Employer Account</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#08111F]/70">Keep your company information up to date so great talent can find you.</p>
            </div>
            <div className="lg:flex lg:flex-col lg:items-start">
            <div className="rounded-[24px] border border-[#2BD7EF]/45 bg-[#0f2744] p-5 text-[#f7ebcf] shadow-[0_12px_40px_rgba(6,16,33,0.14)]">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2BD7EF]">{verificationStatus === "verified" ? "✓ VERIFIED EMPLOYER" : verificationStatus.replaceAll("_", " ")}</p>
              <p className="mt-3 text-lg font-serif text-[#f7ebcf]">{verificationStatus === "verified" ? "Your business is verified" : "Verification in progress"}</p>
              <p className="mt-2 text-sm leading-7 text-[#dfe7ef]">{verificationStatus === "verified" ? "Your organisation has been approved to join the Free Agent Staff Employer network." : "Your employer verification status is shown here."}</p>
            </div>
            <Link href="/pricing" className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-[#2BD7EF]/60 bg-[#2BD7EF] px-5 py-2.5 text-center text-[11px] font-black uppercase tracking-[0.24em] text-[#08111F] transition hover:brightness-105">Choose your employer plan <span className="ml-2">→</span></Link>
            </div>
          </div>

          {verificationStatus === "pending" ? (
            <div className="mt-6 rounded-[24px] border border-[#08111F]/15 bg-[#fffaf0] p-5 text-sm leading-7 text-[#08111F]/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#08111F]">Under Review</p>
              <p className="mt-2">Your details have been submitted to Free Agent Staff for review. We&apos;ll let you know once your business has been verified.</p>
              <p className="mt-2 text-[#08111F]/60">Submitted: {requestedAt ? new Date(requestedAt).toLocaleString() : "Pending confirmation"}</p>
              <p className="mt-2 text-[#08111F]/60">
                If you edit company verification details like company name, ABN or ACN, your account may need to be reviewed again.
              </p>
            </div>
          ) : null}

          {verificationStatus === "more_info_required" ? (
            <div className="mt-6 rounded-[24px] border border-[#08111F]/15 bg-[#fffaf0] p-5 text-sm leading-7 text-[#08111F]/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#08111F]">More Information Required</p>
              <p className="mt-2">We need some additional information before we can complete your business verification.</p>
              {rejectionReason ? <p className="mt-2 text-[#08111F]/60">Reviewer message: {rejectionReason}</p> : null}
            </div>
          ) : null}

          {verificationStatus === "rejected" ? (
            <div className="mt-6 rounded-[24px] border border-[#e19379]/45 bg-[#f4d5c8]/14 p-5 text-sm leading-7 text-[#ffe9df]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffc7b3]">Unable to Verify</p>
              <p className="mt-2">We weren&apos;t able to verify your organisation or your connection to it.</p>
              {rejectionReason ? <p className="mt-2">Reviewer message: {rejectionReason}</p> : null}
              <Link href="/support" className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#ffc7b3]/45 bg-[#ffc7b3] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#ffe0d5]">
                Contact Support
              </Link>
            </div>
          ) : null}

          {(verificationStatus === "pending" || verificationStatus === "verified") && identityChanged ? (
            <div className="mt-6 rounded-[22px] border border-[#08111F]/15 bg-[#fffaf0] p-4 text-sm leading-7 text-[#08111F]/70">
              Changing your company name, ABN/ACN or company website will require your employer account to be verified again.
            </div>
          ) : null}

          {statusMessage ? (
            <p role="status" className="mt-6 rounded-[18px] border border-[#2BD7EF]/45 bg-[#effcff] px-4 py-3 text-sm text-[#08111F]">
              {statusMessage}
            </p>
          ) : null}

          {formError ? (
            <p role="alert" className="mt-6 rounded-[18px] border border-[#e19379]/40 bg-[#f4d5c8]/16 px-4 py-3 text-sm text-[#ffe9df]">
              {formError}
            </p>
          ) : null}
        <div className="mt-2">
          <form className="space-y-7" onSubmit={(event) => event.preventDefault()}>
            <fieldset className="space-y-4">
              <legend className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Your details</legend>

              <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="contactName" className="text-sm font-semibold text-[#0f2744]">Contact name</label>
                <input
                  id="contactName"
                  name="contactName"
                  value={form.contactName}
                  onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
                  readOnly={isPendingReadOnly}
                  className="mt-2 min-h-[44px] w-full rounded-2xl border border-[#08111F]/20 bg-[#fffaf0] px-4 py-3 text-sm text-[#08111F] outline-none transition focus:border-[#2BD7EF] focus:ring-2 focus:ring-[#2BD7EF]/25"
                  aria-required="true"
                />
                {touchedSubmit && !form.contactName.trim() ? <p className="mt-2 text-sm text-[#a2472f]">Contact name is required.</p> : null}
              </div>

              <div>
                <label htmlFor="contactRole" className="text-sm font-semibold text-[#0f2744]">Your role</label>
                <input
                  id="contactRole"
                  name="contactRole"
                  value={form.contactRole}
                  onChange={(event) => setForm((current) => ({ ...current, contactRole: event.target.value }))}
                  readOnly={isPendingReadOnly}
                  className="mt-2 min-h-[44px] w-full rounded-2xl border border-[#08111F]/20 bg-[#fffaf0] px-4 py-3 text-sm text-[#08111F] outline-none transition focus:border-[#2BD7EF] focus:ring-2 focus:ring-[#2BD7EF]/25"
                  aria-required="true"
                />
                {touchedSubmit && !form.contactRole.trim() ? <p className="mt-2 text-sm text-[#a2472f]">Your role is required.</p> : null}
              </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Business details</legend>

              <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="companyName" className="text-sm font-semibold text-[#0f2744]">Company name</label>
                <input
                  id="companyName"
                  name="companyName"
                  value={form.companyName}
                  onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
                  readOnly={isPendingReadOnly}
                  className="mt-2 min-h-[44px] w-full rounded-2xl border border-[#08111F]/20 bg-[#fffaf0] px-4 py-3 text-sm text-[#08111F] outline-none transition focus:border-[#2BD7EF] focus:ring-2 focus:ring-[#2BD7EF]/25"
                  aria-required="true"
                />
                {touchedSubmit && !form.companyName.trim() ? <p className="mt-2 text-sm text-[#a2472f]">Company name is required.</p> : null}
              </div>

              <div>
                <span className="text-sm font-semibold text-[#0f2744]">Company identifier</span>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={isPendingReadOnly}
                    onClick={() => setForm((current) => ({ ...current, identifierType: "abn" }))}
                    aria-pressed={form.identifierType === "abn"}
                    className={`min-h-[40px] rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${form.identifierType === "abn" ? "border-[#2BD7EF]/60 bg-[#2BD7EF] text-[#08111F]" : "border-[#08111F]/20 bg-[#fffaf0] text-[#08111F]/70"}`}
                  >
                    ABN
                  </button>
                  <button
                    type="button"
                    disabled={isPendingReadOnly}
                    onClick={() => setForm((current) => ({ ...current, identifierType: "acn" }))}
                    aria-pressed={form.identifierType === "acn"}
                    className={`min-h-[40px] rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${form.identifierType === "acn" ? "border-[#2BD7EF]/60 bg-[#2BD7EF] text-[#08111F]" : "border-[#08111F]/20 bg-[#fffaf0] text-[#08111F]/70"}`}
                  >
                    ACN
                  </button>
                </div>
              </div>
              </div>

              {form.identifierType === "abn" ? (
                <div>
                  <label htmlFor="abn" className="mt-2 block text-sm font-semibold text-[#0f2744]">ABN</label>
                  <input
                    id="abn"
                    name="abn"
                    value={form.abn}
                    onChange={(event) => setForm((current) => ({ ...current, abn: formatAbnInput(event.target.value) }))}
                    readOnly={isPendingReadOnly}
                    className="mt-2 min-h-[44px] w-full max-w-xs rounded-2xl border border-[#08111F]/20 bg-[#fffaf0] px-4 py-3 text-sm text-[#08111F] outline-none transition focus:border-[#2BD7EF] focus:ring-2 focus:ring-[#2BD7EF]/25 md:max-w-sm"
                    aria-required="true"
                    aria-describedby="abn-help"
                    inputMode="numeric"
                  />
                  <p id="abn-help" className={`mt-2 text-sm ${isAbnValid ? "text-[#2d6a2e]" : "text-[#a2472f]"}`}>
                    {isAbnValid
                      ? "ABN looks valid. This confirms the number format only. FreeAgent will still review your employer account before talent access is enabled."
                      : "Enter a valid 11-digit Australian Business Number."}
                  </p>
                </div>
              ) : (
                <div>
                  <label htmlFor="acn" className="mt-2 block text-sm font-semibold text-[#0f2744]">ACN</label>
                  <input
                    id="acn"
                    name="acn"
                    value={form.acn}
                    onChange={(event) => setForm((current) => ({ ...current, acn: formatAcnInput(event.target.value) }))}
                    readOnly={isPendingReadOnly}
                    className="mt-2 min-h-[44px] w-full max-w-xs rounded-2xl border border-[#08111F]/20 bg-[#fffaf0] px-4 py-3 text-sm text-[#08111F] outline-none transition focus:border-[#2BD7EF] focus:ring-2 focus:ring-[#2BD7EF]/25 md:max-w-sm"
                    aria-required="true"
                    aria-describedby="acn-help"
                    inputMode="numeric"
                  />
                  <p id="acn-help" className={`mt-2 text-sm ${isAcnValid ? "text-[#2d6a2e]" : "text-[#a2472f]"}`}>
                    {isAcnValid
                      ? "ACN looks valid. This confirms the number format only. FreeAgent will still review your employer account before talent access is enabled."
                      : "Enter a valid 9-digit Australian Company Number."}
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="website" className="text-sm font-semibold text-[#0f2744]">Company website</label>
                  <input
                    id="website"
                    name="website"
                    value={form.website}
                    onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                    readOnly={isPendingReadOnly}
                    className="mt-2 min-h-[44px] w-full rounded-2xl border border-[#08111F]/20 bg-[#fffaf0] px-4 py-3 text-sm text-[#08111F] outline-none transition focus:border-[#2BD7EF] focus:ring-2 focus:ring-[#2BD7EF]/25"
                    aria-required="true"
                  />
                  {touchedSubmit && !form.website.trim() ? <p className="mt-2 text-sm text-[#a2472f]">Website is required.</p> : null}
                </div>

                <div>
                  <label htmlFor="industry" className="text-sm font-semibold text-[#0f2744]">Industry</label>
                  <input
                    id="industry"
                    name="industry"
                    value={form.industry}
                    onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
                    readOnly={isPendingReadOnly}
                    className="mt-2 min-h-[44px] w-full rounded-2xl border border-[#08111F]/20 bg-[#fffaf0] px-4 py-3 text-sm text-[#08111F] outline-none transition focus:border-[#2BD7EF] focus:ring-2 focus:ring-[#2BD7EF]/25"
                    aria-required="true"
                  />
                  {touchedSubmit && !form.industry.trim() ? <p className="mt-2 text-sm text-[#a2472f]">Industry is required.</p> : null}
                </div>
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {isPendingStatus && !isPendingEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsPendingEditing(true);
                    setFormError(null);
                    setStatusMessage(null);
                  }}
                    className="min-h-[44px] rounded-full border border-[#08111F]/20 bg-[#fffaf0] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#08111F] transition hover:bg-[#f0e1bc]"
                >
                  Edit submission
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void saveDetails()}
                    disabled={saving || submitting}
                    className="min-h-[44px] rounded-full border border-[#2BD7EF]/60 bg-[#2BD7EF] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#08111F] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {saving ? "Saving..." : "Save details"}
                  </button>

                  {verificationStatus !== "pending" && verificationStatus !== "verified" ? (
                    <button
                      type="button"
                      onClick={() => void submitVerification()}
                      disabled={submitting || saving}
                      className="min-h-[44px] rounded-full border border-[#2BD7EF]/60 bg-[#2BD7EF] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.24em] text-[#08111F] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {submitting
                        ? "Submitting..."
                        : verificationStatus === "more_info_required"
                          ? "Update Business Details"
                          : verificationStatus === "rejected"
                          ? "Resubmit for verification"
                          : "Submit for Verification"}
                    </button>
                  ) : null}

                  {isPendingStatus ? (
                    <button
                      type="button"
                      onClick={() => void cancelPendingEdit()}
                      className="min-h-[44px] rounded-full border border-[#0f2744]/20 bg-transparent px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#eadbb0]"
                    >
                      Cancel edits
                    </button>
                  ) : null}
                </>
              )}

              <span className="inline-flex min-h-[44px] items-center rounded-full border border-[#2BD7EF]/60 bg-[#2BD7EF] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.24em] text-[#08111F]">
                {verificationStatus === "verified" ? "✓ Verified" : "Verify →"}
              </span>
            </div>
          </form>
        </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
