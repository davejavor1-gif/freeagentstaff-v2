"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Footer from "@/components/layout/Footer";
import { accountHomePath, parseAccountType, resolveAccountIdentity } from "@/lib/account-identity";
import { buildCanonicalTalentColumns } from "@/lib/talent-profile-columns";
import { trackTalentCompleteRegistration } from "@/components/MetaPixel";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal-versions";
import type { AccountType, FreeAgentProfile } from "@/types/freeagent";

type ProfileRow = {
  account_type: AccountType;
  employer_verification_status?: "unverified" | "pending" | "more_info_required" | "verified" | "rejected" | null;
  terms_accepted_at?: string | null;
  terms_version?: string | null;
  privacy_acknowledged_at?: string | null;
  privacy_version?: string | null;
};

function createBlankTalentProfile(userId: string, email: string | null): FreeAgentProfile {
  return {
    id: `freeagent-${userId.slice(0, 8)}`,
    visibility: "public",
    name: "",
    title: "",
    location: "",
    availability: "Available Now",
    topStrength: "",
    experienceYears: 0,
    focusArea: "",
    summary: "",
    skills: [],
    languages: [],
    passions: [],
    careerJourney: [],
    email: email ?? "",
  };
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedAccountType = searchParams.get("account_type");
  const [session, setSession] = useState<Awaited<ReturnType<typeof getSessionWithRetry>>>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [status, setStatus] = useState("Completing sign in...");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCallback() {
      const providerError = searchParams.get("error_description") ?? searchParams.get("error");
      if (providerError) {
        setStatus(`Sign in was not completed: ${providerError}`);
        return;
      }

      if (requestedAccountType !== "talent" && requestedAccountType !== "employer") {
        setStatus("This sign-in link is invalid. Return to the sign-in page and try again.");
        return;
      }

      const currentSession = await getSessionWithRetry();
      if (!mounted) return;

      if (!currentSession) {
        setStatus("The sign-in was cancelled or could not be completed. Return to the sign-in page and try again.");
        return;
      }

      const { data: profileRow, error } = await supabase
        .from("profiles")
        .select("account_type, employer_verification_status, terms_accepted_at, terms_version, privacy_acknowledged_at, privacy_version")
        .eq("user_id", currentSession.user.id)
        .maybeSingle<ProfileRow>();

      if (!mounted) return;
      if (error) {
        setStatus("We couldn't load your account right now. Please try again.");
        return;
      }

      setSession(currentSession);
      setProfile(profileRow ?? null);
      const identity = resolveAccountIdentity({
        profileExists: Boolean(profileRow),
        profileAccountType: profileRow?.account_type,
        metadataAccountType: currentSession.user.user_metadata?.account_type,
      });

      if (identity.status === "mismatch") {
        setStatus("This account has conflicting identity records. Return to the correct sign-in page and contact support if this continues.");
        return;
      }

      const resolvedType = identity.status === "resolved"
        ? identity.accountType
        : parseAccountType(currentSession.user.user_metadata?.account_type) ?? (requestedAccountType === "talent" || requestedAccountType === "employer" ? requestedAccountType : null);

      if (!resolvedType) {
        setStatus("We couldn't determine this account type. Return to the sign-in page and try again.");
        return;
      }

      if (identity.status === "unresolved" && parseAccountType(currentSession.user.user_metadata?.account_type) && parseAccountType(currentSession.user.user_metadata?.account_type) !== requestedAccountType) {
        setStatus("This sign-in link does not match the account type on file.");
        return;
      }

      const consentRequired = !profileRow?.terms_accepted_at || !profileRow?.privacy_acknowledged_at;
      setNeedsConsent(consentRequired);
      if (profileRow && profileRow.account_type && !consentRequired) {
        setStatus("Sign in complete. Redirecting...");
        window.setTimeout(() => router.replace(accountHomePath(resolvedType, profileRow.employer_verification_status)), 300);
      } else {
        setStatus("Review and accept the Terms & Conditions and Privacy Policy to finish setting up your account.");
      }
    }

    void loadCallback();
    return () => {
      mounted = false;
    };
  }, [requestedAccountType, router, searchParams]);

  const finishSetup = async () => {
    if (!session || !agreedToTerms || (requestedAccountType !== "talent" && requestedAccountType !== "employer")) return;
    setIsSubmitting(true);
    setStatus("Setting up your account...");

    const acceptedAt = new Date().toISOString();

    const metadataType = parseAccountType(session.user.user_metadata?.account_type);
    const identity = resolveAccountIdentity({
      profileExists: Boolean(profile),
      profileAccountType: profile?.account_type,
      metadataAccountType: session.user.user_metadata?.account_type,
    });

    if (identity.status === "mismatch") {
      setStatus("This account has conflicting identity records. We can't finish setup until the account type is resolved.");
      setIsSubmitting(false);
      return;
    }

    const accountType = identity.status === "resolved"
      ? identity.accountType
      : metadataType ?? (requestedAccountType === "talent" || requestedAccountType === "employer" ? requestedAccountType : null);

    if (!accountType) {
      setStatus("We couldn't determine this account type.");
      setIsSubmitting(false);
      return;
    }

    if (identity.status === "unresolved" && metadataType && metadataType !== requestedAccountType) {
      setStatus("This sign-in link does not match the account type on file.");
      setIsSubmitting(false);
      return;
    }

    const existingProfile = profile;

    const { error: consentError } = await supabase
      .from("profiles")
      .update({
        terms_accepted_at: existingProfile?.terms_accepted_at ?? acceptedAt,
        terms_version: existingProfile?.terms_version ?? TERMS_VERSION,
        privacy_acknowledged_at: existingProfile?.privacy_acknowledged_at ?? acceptedAt,
        privacy_version: existingProfile?.privacy_version ?? PRIVACY_VERSION,
      } as never)
      .eq("user_id", session.user.id);

    if (consentError) {
      setStatus("We couldn't save your account setup. Please try again.");
      setIsSubmitting(false);
      return;
    }

    if (!existingProfile) {
      const talentProfile = accountType === "talent" ? createBlankTalentProfile(session.user.id, session.user.email ?? null) : null;
      const { error: insertError } = await supabase.from("profiles").upsert([
        {
          user_id: session.user.id,
          account_type: accountType,
          employer_verification_status: "unverified",
          terms_accepted_at: acceptedAt,
          terms_version: TERMS_VERSION,
          privacy_acknowledged_at: acceptedAt,
          privacy_version: PRIVACY_VERSION,
          ...(talentProfile
            ? buildCanonicalTalentColumns(talentProfile, session.user.email)
            : { profile: {}, slug: null }),
        } as never,
      ], { onConflict: "user_id" } as never);

      if (insertError) {
        setStatus("We couldn't finish setting up your account. Please try again.");
        setIsSubmitting(false);
        return;
      }

      if (accountType === "talent") {
        trackTalentCompleteRegistration();
      }
    }

    router.replace(accountHomePath(accountType, existingProfile?.employer_verification_status));
  };

  return (
    <main className="min-h-screen bg-[#08111F] text-[#f7ebcf]">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-2xl flex-col justify-center px-6 py-16 sm:px-10">
        <div className="rounded-3xl border border-[#cda64d]/55 bg-[#f7ebcf] p-8 text-[#0f2744] shadow-[0_18px_50px_rgba(6,16,33,0.22)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Secure sign in</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Finish setting up your account</h1>
          <p className="mt-4 text-sm leading-7 text-[#27405f]">{status}</p>
          {needsConsent ? (
            <div className="mt-7 space-y-5">
              <label className="flex items-start gap-3 text-sm leading-6 text-[#27405f]">
                <input type="checkbox" checked={agreedToTerms} onChange={(event) => setAgreedToTerms(event.target.checked)} className="mt-1 h-5 w-5 accent-[#aff546]" />
                <span>I agree to the <Link href="/terms" className="font-semibold text-[#0f2744] underline">Terms &amp; Conditions</Link> and acknowledge the <Link href="/privacy" className="font-semibold text-[#0f2744] underline">Privacy Policy</Link>.</span>
              </label>
              <button type="button" onClick={() => void finishSetup()} disabled={!agreedToTerms || isSubmitting} className="w-full rounded-2xl bg-[#aff546] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#071426] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Setting up..." : "Continue"}</button>
            </div>
          ) : null}
        </div>
      </div>
      <Footer />
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#08111F]" />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
