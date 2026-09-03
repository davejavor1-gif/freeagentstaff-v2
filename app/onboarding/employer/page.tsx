"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import type { AccountType, EmployerVerificationStatus } from "@/types/freeagent";

type EmployerFormState = {
  contactName: string;
  contactRole: string;
  companyName: string;
  abn: string;
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
  abn: "",
  website: "",
  industry: "",
};

const requiredFieldLabels: Record<keyof EmployerFormState, string> = {
  contactName: "Contact name",
  contactRole: "Your role",
  companyName: "Company name",
  abn: "ABN",
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

function mapRpcError(errorMessage: string): string {
  const msg = errorMessage.toLowerCase();
  if (msg.includes("invalid_abn")) {
    return "Enter a valid 11-digit Australian Business Number.";
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
  const [baselineIdentity, setBaselineIdentity] = useState<{ companyName: string; abn: string; website: string }>({ companyName: "", abn: "", website: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [touchedSubmit, setTouchedSubmit] = useState(false);
  const [isPendingEditing, setIsPendingEditing] = useState(false);

  const isPendingStatus = verificationStatus === "pending";
  const isPendingReadOnly = isPendingStatus && !isPendingEditing;

  const normalizedAbn = useMemo(() => normalizeAbn(form.abn), [form.abn]);
  const isAbnValid = normalizedAbn.length === 11;

  const missingRequiredFields = useMemo(() => {
    const missing: string[] = [];
    (Object.keys(requiredFieldLabels) as Array<keyof EmployerFormState>).forEach((key) => {
      if (!form[key].trim()) {
        missing.push(requiredFieldLabels[key]);
      }
    });
    return missing;
  }, [form]);

  const identityChanged = useMemo(() => {
    return (
      form.companyName.trim() !== baselineIdentity.companyName.trim() ||
      normalizeAbn(form.abn) !== normalizeAbn(baselineIdentity.abn) ||
      form.website.trim().toLowerCase() !== baselineIdentity.website.trim().toLowerCase()
    );
  }, [baselineIdentity.abn, baselineIdentity.companyName, baselineIdentity.website, form.abn, form.companyName, form.website]);

  const refreshEmployerRow = async (userId: string): Promise<EmployerProfileRow | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "user_id, account_type, employer_verification_status, employer_contact_name, employer_contact_role, employer_company_name, employer_abn, employer_website, employer_industry, verification_requested_at, verification_rejection_reason",
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
    setAccountType(row.account_type ?? "talent");
    setVerificationStatus(nextVerificationStatus);
    if (nextVerificationStatus !== "pending") {
      setIsPendingEditing(false);
    }
    setRequestedAt(row.verification_requested_at ?? null);
    setRejectionReason(row.verification_rejection_reason ?? null);

    const nextForm = {
      contactName: row.employer_contact_name ?? "",
      contactRole: row.employer_contact_role ?? "",
      companyName: row.employer_company_name ?? "",
      abn: formatAbnInput(row.employer_abn ?? ""),
      website: row.employer_website ?? "",
      industry: row.employer_industry ?? "",
    };

    setForm(nextForm);
    setBaselineIdentity({ companyName: nextForm.companyName, abn: nextForm.abn, website: nextForm.website });
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

      const metadataAccountType = session.user.user_metadata?.account_type;
      const metadataType: AccountType = metadataAccountType === "employer" ? "employer" : "talent";

      let row = await refreshEmployerRow(session.user.id);

      if (!row) {
        if (metadataType !== "employer") {
          router.replace("/dashboard");
          return;
        }

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

      if ((row.account_type ?? metadataType) !== "employer") {
        router.replace("/dashboard");
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
        employer_abn: form.abn.trim() || null,
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

    if (!isAbnValid) {
      setFormError("Enter a valid 11-digit Australian Business Number.");
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
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
        <Navbar />
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 lg:px-10">
          <div className="rounded-[32px] border border-[#cda64d]/55 bg-[#0f2744] p-8 text-[#f7ebcf] shadow-[0_20px_60px_rgba(6,16,33,0.16)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#f2cc63]">Loading employer setup...</p>
          </div>
        </div>
      </main>
    );
  }

  if (accountType !== "employer") {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#08111F] text-[#071426]">
      <Navbar />
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10">
        <section className="rounded-[36px] border border-[#cda64d]/60 bg-[#0f2744] p-6 text-[#f7ebcf] shadow-[0_20px_60px_rgba(6,16,33,0.16)] sm:p-8 lg:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">Employer setup</p>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-[0.12em] text-[#f7ebcf] sm:text-4xl">
            {verificationStatus === "pending"
              ? "We're verifying your business"
              : verificationStatus === "more_info_required"
                ? "We need a little more information"
                : verificationStatus === "rejected"
                  ? "We couldn't verify this Employer account"
                  : verificationStatus === "verified"
                    ? "Your business is verified"
                    : "Verify your business"}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#dfe7ef] sm:text-base sm:leading-8">
            {verificationStatus === "pending"
              ? "Your details have been submitted to Free Agent Staff for review. We'll let you know once your business has been verified."
              : verificationStatus === "more_info_required"
                ? "We need some additional information before we can complete your business verification."
                : verificationStatus === "rejected"
                  ? "We weren't able to verify your organisation or your connection to it."
                  : verificationStatus === "verified"
                    ? "Your organisation has been approved to join the Free Agent Staff Employer network. Activate Employer Access from your dashboard to start discovering Talent."
                    : "Free Agent Staff verifies employers before providing access to the Talent network."}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[#f2cc63]/45 bg-[#f7ebcf]/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f2cc63]">
              Status: {verificationStatus === "pending" ? "Under Review" : verificationStatus === "more_info_required" ? "More Information Required" : verificationStatus === "rejected" ? "Unable to Verify" : verificationStatus === "verified" ? "Verified" : "Unverified"}
            </span>
            {verificationStatus === "verified" ? (
              <span className="rounded-full border border-[#9fdd66]/55 bg-[#9fdd66]/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e7ffd1]">
                Verification complete
              </span>
            ) : (
              <span className="rounded-full border border-[#f2cc63]/30 bg-[#f7ebcf]/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf]">
                Find Talent locked until verified
              </span>
            )}
          </div>

          {verificationStatus === "pending" ? (
            <div className="mt-6 rounded-[24px] border border-[#f2cc63]/35 bg-[#f7ebcf]/10 p-5 text-sm leading-7 text-[#f7ebcf]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">Under Review</p>
              <p className="mt-2">Your details have been submitted to Free Agent Staff for review. We&apos;ll let you know once your business has been verified.</p>
              <p className="mt-2 text-[#dfe7ef]">Submitted: {requestedAt ? new Date(requestedAt).toLocaleString() : "Pending confirmation"}</p>
              <p className="mt-2 text-[#dfe7ef]">
                If you edit company verification details like company name or ABN, your account may need to be reviewed again.
              </p>
            </div>
          ) : null}

          {verificationStatus === "more_info_required" ? (
            <div className="mt-6 rounded-[24px] border border-[#f2cc63]/35 bg-[#f7ebcf]/10 p-5 text-sm leading-7 text-[#f7ebcf]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">More Information Required</p>
              <p className="mt-2">We need some additional information before we can complete your business verification.</p>
              {rejectionReason ? <p className="mt-2 text-[#dfe7ef]">Reviewer message: {rejectionReason}</p> : null}
            </div>
          ) : null}

          {verificationStatus === "verified" ? (
            <div className="mt-6 rounded-[24px] border border-[#9fdd66]/35 bg-[#9fdd66]/12 p-5 text-sm leading-7 text-[#e8ffd2]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d8ffab]">Your business is verified</p>
              <p className="mt-2">Your organisation has been approved to join the Free Agent Staff Employer network. Activate Employer Access to start discovering Talent.</p>
              <Link
                href="/dashboard"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#d8ffab]/45 bg-[#d8ffab] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#e8ffc4]"
              >
                Choose Employer Plan
              </Link>
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
            <div className="mt-6 rounded-[22px] border border-[#f2cc63]/40 bg-[#f7ebcf]/12 p-4 text-sm leading-7 text-[#f7ebcf]">
              Changing your company name, ABN or company website will require your employer account to be verified again.
            </div>
          ) : null}

          {statusMessage ? (
            <p role="status" className="mt-6 rounded-[18px] border border-[#9fdd66]/35 bg-[#9fdd66]/12 px-4 py-3 text-sm text-[#e8ffd2]">
              {statusMessage}
            </p>
          ) : null}

          {formError ? (
            <p role="alert" className="mt-6 rounded-[18px] border border-[#e19379]/40 bg-[#f4d5c8]/16 px-4 py-3 text-sm text-[#ffe9df]">
              {formError}
            </p>
          ) : null}
        </section>

        <section className="mt-8 rounded-[30px] border border-[#cda64d]/55 bg-[#f7ebcf]/88 p-6 shadow-[0_12px_40px_rgba(6,16,33,0.12)] sm:p-8">
          <form className="space-y-7" onSubmit={(event) => event.preventDefault()}>
            <fieldset className="space-y-4">
              <legend className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Your details</legend>

              <div>
                <label htmlFor="contactName" className="text-sm font-semibold text-[#0f2744]">Contact name</label>
                <input
                  id="contactName"
                  name="contactName"
                  value={form.contactName}
                  onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
                  readOnly={isPendingReadOnly}
                  className="mt-2 min-h-[44px] w-full rounded-2xl border border-[#cda64d]/35 bg-white px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#9a6d15] focus:ring-2 focus:ring-[#f2cc63]/45"
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
                  className="mt-2 min-h-[44px] w-full rounded-2xl border border-[#cda64d]/35 bg-white px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#9a6d15] focus:ring-2 focus:ring-[#f2cc63]/45"
                  aria-required="true"
                />
                {touchedSubmit && !form.contactRole.trim() ? <p className="mt-2 text-sm text-[#a2472f]">Your role is required.</p> : null}
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Business details</legend>

              <div>
                <label htmlFor="companyName" className="text-sm font-semibold text-[#0f2744]">Company name</label>
                <input
                  id="companyName"
                  name="companyName"
                  value={form.companyName}
                  onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
                  readOnly={isPendingReadOnly}
                  className="mt-2 min-h-[44px] w-full rounded-2xl border border-[#cda64d]/35 bg-white px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#9a6d15] focus:ring-2 focus:ring-[#f2cc63]/45"
                  aria-required="true"
                />
                {touchedSubmit && !form.companyName.trim() ? <p className="mt-2 text-sm text-[#a2472f]">Company name is required.</p> : null}
              </div>

              <div>
                <label htmlFor="abn" className="text-sm font-semibold text-[#0f2744]">ABN</label>
                <input
                  id="abn"
                  name="abn"
                  value={form.abn}
                  onChange={(event) => setForm((current) => ({ ...current, abn: formatAbnInput(event.target.value) }))}
                  readOnly={isPendingReadOnly}
                  className="mt-2 min-h-[44px] w-full rounded-2xl border border-[#cda64d]/35 bg-white px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#9a6d15] focus:ring-2 focus:ring-[#f2cc63]/45"
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

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="website" className="text-sm font-semibold text-[#0f2744]">Company website</label>
                  <input
                    id="website"
                    name="website"
                    value={form.website}
                    onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                    readOnly={isPendingReadOnly}
                    className="mt-2 min-h-[44px] w-full rounded-2xl border border-[#cda64d]/35 bg-white px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#9a6d15] focus:ring-2 focus:ring-[#f2cc63]/45"
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
                    className="mt-2 min-h-[44px] w-full rounded-2xl border border-[#cda64d]/35 bg-white px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#9a6d15] focus:ring-2 focus:ring-[#f2cc63]/45"
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
                  className="min-h-[44px] rounded-full border border-[#0f2744]/25 bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#f0e1bc]"
                >
                  Edit submission
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void saveDetails()}
                    disabled={saving || submitting}
                    className="min-h-[44px] rounded-full border border-[#0f2744]/25 bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#f0e1bc] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {saving ? "Saving..." : "Save details"}
                  </button>

                  {verificationStatus !== "pending" && verificationStatus !== "verified" ? (
                    <button
                      type="button"
                      onClick={() => void submitVerification()}
                      disabled={submitting || saving}
                      className="min-h-[44px] rounded-full border border-[#0f2744]/25 bg-[#0f2744] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f] disabled:cursor-not-allowed disabled:opacity-55"
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

              <Link
                href="/dashboard"
                className="min-h-[44px] rounded-full border border-[#cda64d]/35 bg-[#f7ebcf] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#e9d88f]"
              >
                Back to dashboard
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
