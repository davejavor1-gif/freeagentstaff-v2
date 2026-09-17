"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  Bell,
  ClipboardList,
  Eye,
  Handshake,
  History,
  House,
  IdCard,
  Users,
  Undo2,
} from "lucide-react";
import BillingButton from "@/components/BillingButton";
import TalentConnectionsSection from "@/components/connections/TalentConnectionsSection";
import NotificationsPage from "@/app/notifications/page";
import TalentCard from "@/components/TalentCard";
import { getSessionWithRetry, supabase } from "@/lib/supabase-client";
import { formatAvailabilityLabel, normalizeAvailability } from "@/lib/talent-profile-options";
import {
  DashboardAction,
  DashboardActivity,
  DashboardHeader,
  DashboardJourney,
  DashboardMetricCard,
  DashboardPanel,
  DashboardShell,
} from "@/components/dashboard/DashboardPrimitives";
import type { EmployerVerificationStatus, FreeAgentProfile } from "@/types/freeagent";
import type { EmployerSummaryPayload, TalentSummaryPayload } from "@/types/dashboard";

type Audience = "talent" | "employer";
type TalentDashboardSection = "overview" | "activity" | "notifications" | "introductions" | "connections" | "identity" | "journey";

function talentSectionFromHash(hash: string): TalentDashboardSection | null {
  const id = hash.replace(/^#/, "");
  if (id === "introductions" || id === "connections") {
    return id;
  }
  return null;
}

type Props = {
  audience: Audience;
  name: string;
  companyName: string;
  verificationStatus: EmployerVerificationStatus;
  verificationRequestedAt: string;
  verificationRejectionReason: string | null;
  employerSummary: EmployerSummaryPayload | null;
  talentSummary: TalentSummaryPayload | null;
  isVerifiedEmployer: boolean;
  hasEmployerAccess: boolean;
  isPublished: boolean;
  visibility: string;
  isProTalent: boolean;
  hasScheduledCancellation: boolean;
  scheduledCancellationDate: string | null;
  talentPassportHref: string;
  hasCompletedTalentCard: boolean;
  cardStatus: "Not started" | "In progress" | "Created" | "Ready";
  passportStatus: "Not started" | "In progress" | "Created" | "Ready";
  dashboardTalentProfile: FreeAgentProfile | null;
  formatDateTime: (value: string | null | undefined) => string;
  verificationLabel: string;
  formattedRequestedAt: string;
  withdrawRequest: (id: string) => void;
  updateTalentRequest: (id: string, action: "accept" | "decline") => void;
  updatingId: string | null;
  signOut: () => void;
};

const builderSections = [
  { id: "basic", label: "Basic Info" },
  { id: "availability", label: "Availability" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "media", label: "Media" },
  { id: "languages", label: "Languages & Passions" },
  { id: "details", label: "Professional Details" },
  { id: "privacy", label: "Privacy" },
] as const;

const toneFor = (status: string) => status.replaceAll("_", " ");

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Free Agent";
}

function statusIsComplete(status: Props["cardStatus"] | Props["passportStatus"]) {
  return status === "Ready" || status === "Created";
}

function sectionIsComplete(sectionId: (typeof builderSections)[number]["id"], profile: FreeAgentProfile | null, isPublished: boolean) {
  if (!profile) return false;

  switch (sectionId) {
    case "basic":
      return Boolean(profile.name.trim() && profile.title.trim() && profile.location.trim());
    case "availability":
      return Boolean(profile.availability);
    case "skills":
      return profile.skills.length > 0;
    case "experience":
      return profile.careerJourney.some((position) => position.role.trim() && position.company.trim());
    case "education":
      return Boolean(profile.education?.trim() || (profile.educationEntries ?? []).some((entry) => entry.qualification.trim() && entry.institution.trim()));
    case "media":
      return Boolean(profile.photoUrl || profile.photo_storage_path || profile.intro_video_url || profile.intro_video_storage_path);
    case "languages":
      return (profile.languages ?? []).length > 0 || (profile.passions ?? []).length > 0;
    case "details":
      return Boolean(profile.focusArea.trim() || profile.salaryExpectation || profile.contactEmail?.trim() || profile.resumeOriginalFilename);
    case "privacy":
      return Boolean(profile.visibility && (isPublished || profile.visibility === "confidential"));
  }
}

export default function DashboardView(props: Props) {
  const { audience } = props;
  return <DashboardShell audience={audience}>{audience === "employer" ? <EmployerView {...props} /> : <TalentView {...props} />}</DashboardShell>;
}

type EmployerDashboardSection = "overview" | "activity" | "notifications" | "introductions" | "connections" | "account";

function EmployerMenuButton({ section, activeSection, icon: Icon, children, onSelect }: { section: EmployerDashboardSection; activeSection: EmployerDashboardSection; icon: typeof House; children: React.ReactNode; onSelect: (section: EmployerDashboardSection) => void }) {
  const active = activeSection === section;

  return (
    <button type="button" onClick={() => onSelect(section)} className={`flex min-h-11 w-full items-center justify-start gap-3 rounded-xl border px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.08em] transition ${active ? "border-[#08111F] bg-[#08111F] text-[#f7ebcf]" : "border-transparent text-[#08111F]/70 hover:border-[#2BD7EF]/60 hover:bg-[#e8fbff] hover:text-[#08111F]"}`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-[#2BD7EF] text-[#08111F]" : "bg-[#08111F]/5 text-[#08111F]"}`}><Icon className="h-3.5 w-3.5" /></span>
      {children}
    </button>
  );
}

function EmployerView(props: Props) {
  const [activeSection, setActiveSection] = useState<EmployerDashboardSection>("overview");
  const summary = props.employerSummary;
  const canWork = props.hasEmployerAccess;
  const requestItems = summary?.requestPreview ?? [];
  const connectionItems = summary?.connectionPreview ?? [];
  const activity = [
    ...connectionItems.map((item) => ({ title: `${item.talentName ?? "Confidential talent"} connection ${item.status}`, detail: props.formatDateTime(item.status === "active" ? item.connectedAt : item.revokedAt ?? item.connectedAt) })),
    ...requestItems.filter((item) => item.status !== "pending").map((item) => ({ title: `${item.talentName} introduction ${item.status}`, detail: props.formatDateTime(item.respondedAt ?? item.withdrawnAt ?? item.createdAt) })),
  ].slice(0, 5);

  return <div className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start xl:gap-6">
    <aside className="rounded-[24px] border border-[#cda64d]/45 bg-[#f7e8c6] p-5 text-[#08111F] shadow-[0_18px_45px_rgba(6,16,33,0.2)] lg:sticky lg:top-24 lg:h-fit">
      <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#08798a]">Employer Dashboard</p><h1 className="mt-3 font-serif text-4xl leading-[0.95] tracking-tight">Hello,<br />{firstName(props.name)}</h1></div><span className="mt-1 h-3 w-3 rounded-full bg-[#2BD7EF] shadow-[0_0_0_6px_rgba(43,215,239,0.14)]" /></div>
      <nav className="mt-7 space-y-1.5" aria-label="Employer dashboard sections">
        <EmployerMenuButton section="overview" activeSection={activeSection} icon={House} onSelect={setActiveSection}>Dashboard</EmployerMenuButton>
        <EmployerMenuButton section="activity" activeSection={activeSection} icon={History} onSelect={setActiveSection}>Recent Activity</EmployerMenuButton>
        <EmployerMenuButton section="notifications" activeSection={activeSection} icon={Bell} onSelect={setActiveSection}>Notifications</EmployerMenuButton>
        <EmployerMenuButton section="introductions" activeSection={activeSection} icon={Handshake} onSelect={setActiveSection}>Introductions</EmployerMenuButton>
        <EmployerMenuButton section="connections" activeSection={activeSection} icon={Users} onSelect={setActiveSection}>Connections</EmployerMenuButton>
        <EmployerMenuButton section="account" activeSection={activeSection} icon={BriefcaseBusiness} onSelect={setActiveSection}>Employer Account</EmployerMenuButton>
      </nav>
    </aside>

    <main className="min-w-0 space-y-5">
      {activeSection === "overview" ? <>
        <section className="rounded-[24px] border border-[#cda64d]/45 bg-[#f7e8c6] p-6 text-[#08111F] shadow-[0_18px_45px_rgba(6,16,33,0.18)] sm:p-8">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#08798a]">Welcome</p>
              <h2 className="mt-5 font-serif text-5xl leading-[0.95] tracking-tight sm:text-6xl">Hello, {firstName(props.name)}</h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#08111F]/66">{props.isVerifiedEmployer ? "Your employer account is ready for you to connect with exceptional talent." : "Complete employer verification to begin discovering eligible talent."}</p>
              <div className="mt-6 flex flex-wrap gap-3">{canWork ? <><DashboardAction href="/find-talent" variant="accent">FIND TALENT</DashboardAction><BillingButton action="portal" className="dashboard-employer-blue-action">MANAGE SUBSCRIPTION</BillingButton></> : <DashboardAction href="/onboarding/employer" variant="accent">OPEN EMPLOYER ACCOUNT</DashboardAction>}</div>
            </div>
            <div className="flex min-h-[180px] items-center justify-center px-2 sm:min-h-[210px] lg:min-h-[250px] lg:px-4"><Image src="/images/discover.png" alt="Discover people and applications" width={1536} height={1024} className="h-full max-h-[250px] w-full max-w-[360px] object-contain" priority /></div>
          </div>
        </section>

        {canWork ? <section className="rounded-[24px] border border-[#cda64d]/45 bg-[#f7e8c6] p-6 text-[#08111F] shadow-[0_18px_45px_rgba(6,16,33,0.16)] sm:p-7"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#08798a]">Employer metrics</p><div className="mt-6 grid divide-y divide-[#08111F]/12 border-t border-[#08111F]/12 pt-2 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4"><EmployerMetric label="Saved talent" value={summary?.savedTalentCount ?? 0} detail="People you bookmarked" icon={Bookmark} /><EmployerMetric label="Introductions" value={summary?.pendingIntroductionRequests ?? 0} detail="Waiting for a response" icon={Handshake} /><EmployerMetric label="Connections" value={summary?.activeConnections ?? 0} detail="Talent you can contact" icon={Users} /><EmployerMetric label="Shortlists" value={summary?.activeShortlists ?? 0} detail="Candidates you are considering" icon={ClipboardList} /></div></section> : null}

        <section className="rounded-[24px] border border-[#cda64d]/45 bg-[#f7e8c6] p-6 text-[#08111F] shadow-[0_18px_45px_rgba(6,16,33,0.16)] sm:p-7"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#08798a]">Account & employer actions</p><div className="mt-6 divide-y divide-[#08111F]/12 border-t border-[#08111F]/12">{!props.isVerifiedEmployer ? <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-serif text-2xl">{props.verificationLabel}</h3><p className="mt-1 text-sm leading-6 text-[#08111F]/60">{props.verificationRejectionReason ?? "Submit your organisation details for review."}</p></div><DashboardAction href="/onboarding/employer" variant="accent">OPEN EMPLOYER ACCOUNT</DashboardAction></div> : null}{props.isVerifiedEmployer && !canWork ? <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-serif text-2xl">Employer access is ready</h3><p className="mt-1 text-sm leading-6 text-[#08111F]/60">Activate Employer Access to begin discovering eligible talent.</p></div><Link href="/pricing" className="dashboard-employer-blue-action">CHOOSE PLAN</Link></div> : null}<div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-serif text-2xl">Find talent</h3><p className="mt-1 text-sm leading-6 text-[#08111F]/60">Search eligible professional profiles.</p></div><DashboardAction href="/find-talent" variant="accent">OPEN TALENT SEARCH</DashboardAction></div><div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-serif text-2xl">Saved talent</h3><p className="mt-1 text-sm leading-6 text-[#08111F]/60">Review candidates you have saved.</p></div><DashboardAction href="/saved-talent" variant="accent">OPEN SAVED TALENT</DashboardAction></div><div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-serif text-2xl">Sign out</h3><p className="mt-1 text-sm leading-6 text-[#08111F]/60">Finished for now?</p></div><button type="button" onClick={props.signOut} className="dashboard-employer-blue-action">SIGN OUT <span aria-hidden="true">→</span></button></div></div></section>
      </> : null}

      {activeSection === "activity" ? <DashboardPanel title="Recent Activity" eyebrow="Live workspace"><DashboardActivity items={activity} empty="Your introduction and connection activity will appear here." /></DashboardPanel> : null}
      {activeSection === "notifications" ? <NotificationsPage embedded /> : null}
      {activeSection === "introductions" ? <DashboardPanel title="Introductions" eyebrow="Relationship pipeline" action={<DashboardAction href="/find-talent" variant="accent">Find talent</DashboardAction>}><div className="mt-6 space-y-3 border-t border-[#08111F]/15 pt-5">{requestItems.length === 0 ? <p className="text-base leading-7 text-[#08111F]/60">No introduction requests yet. Request an introduction from an eligible talent profile.</p> : requestItems.map((request) => <div key={request.requestId} className="flex items-start justify-between gap-3 border-b border-[#08111F]/15 pb-3 last:border-0"><div><p className="text-lg font-semibold">{request.talentName}</p><p className="mt-1 text-sm text-[#08111F]/60">{props.formatDateTime(request.createdAt)} / {request.isCurrentlyEligible ? "Eligible" : "Access limited"}</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-[#2BD7EF]/40 bg-[#2BD7EF]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08798a]">{toneFor(request.status)}</span>{request.status === "pending" ? <button type="button" onClick={() => props.withdrawRequest(request.requestId)} disabled={props.updatingId === request.requestId} className="text-[#08798a]" aria-label={`Withdraw introduction to ${request.talentName}`}><Undo2 className="h-4 w-4" /></button> : null}</div></div>)}</div></DashboardPanel> : null}
      {activeSection === "connections" ? <DashboardPanel title="Connected talent" eyebrow="Your network"><div className="mt-6 grid gap-3 border-t border-[#08111F]/15 pt-5 md:grid-cols-2">{connectionItems.length === 0 ? <p className="text-base text-[#08111F]/60">Connections are created when introductions are accepted.</p> : connectionItems.map((item) => <div key={item.connectionId} className="rounded-xl border border-[#08111F]/15 bg-[#08111F]/[0.04] p-4"><div className="flex justify-between gap-4"><div><p className="text-lg font-semibold">{item.talentName ?? "Confidential talent"}</p><p className="mt-1 text-sm text-[#08111F]/60">{item.talentTitle ?? "Professional profile"}</p></div><span className="text-xs font-bold uppercase tracking-[0.12em] text-[#08798a]">{item.status}</span></div></div>)}</div></DashboardPanel> : null}
      {activeSection === "account" ? <DashboardPanel title="Employer Account" eyebrow="Verification and subscription"><VerificationPanel {...props} />{props.isVerifiedEmployer && canWork ? <div className="mt-5 border-t border-[#08111F]/12 pt-5"><BillingButton action="portal" className="dashboard-employer-blue-action">MANAGE SUBSCRIPTION</BillingButton></div> : null}</DashboardPanel> : null}
    </main>
  </div>;
}

function EmployerMetric({ label, value, detail, icon: Icon }: { label: string; value: number | string; detail: string; icon: typeof Activity }) {
  return <div className="min-w-0 px-0 py-4 text-[#08111F] sm:px-5 lg:py-2"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2BD7EF] text-[#08111F] shadow-[0_0_0_6px_rgba(43,215,239,0.12)]"><Icon className="h-4 w-4" /></span><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#08111F]/60">{label}</p></div><p className="mt-4 font-serif text-5xl leading-none">{value}</p><p className="mt-3 text-sm leading-6 text-[#08111F]/62">{detail}</p></div>;
}

function VerificationPanel(props: Props) {
  const copy: Record<EmployerVerificationStatus, { title: string; body: string; action: string }> = {
    unverified: { title: "Verify your business", body: "Free Agent Staff verifies employers before providing access to the Talent network.", action: "Submit for verification" },
    pending: { title: "We are verifying your business", body: `Your details have been submitted for review. Submitted: ${props.formattedRequestedAt}.`, action: "Open employer account" },
    more_info_required: { title: "We need a little more information", body: props.verificationRejectionReason ?? "Update your business details so verification can continue.", action: "Update business details" },
    rejected: { title: "We could not verify this Employer account", body: props.verificationRejectionReason ?? "Review your organisation details and submit them again.", action: "Review details" },
    verified: { title: "Business verified", body: "Your organisation is ready for Employer Access.", action: "Open employer account" },
  };
  const item = copy[props.verificationStatus];
  return <DashboardPanel title={item.title} eyebrow="Verification required" action={<DashboardAction href="/onboarding/employer">{item.action}</DashboardAction>}><p className="mt-5 max-w-2xl text-sm leading-7 text-[#08111F]/60">{item.body}</p></DashboardPanel>;
}

function DashboardMenuButton({ section, activeSection, icon: Icon, children, onSelect }: { section: TalentDashboardSection; activeSection: TalentDashboardSection; icon: typeof House; children: React.ReactNode; onSelect: (section: TalentDashboardSection) => void }) {
  const active = activeSection === section;

  return (
    <button
      type="button"
      onClick={() => onSelect(section)}
      className={`flex min-h-11 w-full items-center justify-start gap-3 rounded-xl border px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.08em] transition ${active ? "border-[#08111F] bg-[#08111F] text-[#f7ebcf]" : "border-transparent text-[#08111F]/70 hover:border-[#AFF546]/60 hover:bg-[#eefebf] hover:text-[#08111F]"}`}
    >
      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-[#AFF546] text-[#08111F]" : "bg-[#08111F]/5 text-[#08111F]"}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      {children}
    </button>
  );
}

function TalentMetric({ label, value, detail, icon: Icon }: { label: string; value: number | string; detail: string; icon: typeof Activity }) {
  return (
    <div className="min-w-0 px-0 py-4 text-[#08111F] sm:px-5 lg:py-2">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#AFF546] text-[#08111F] shadow-[0_0_0_6px_rgba(175,245,70,0.12)]">
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#08111F]/60">{label}</p>
      </div>
      <p className="mt-4 font-serif text-5xl leading-none text-[#08111F]">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[#08111F]/62">{detail}</p>
    </div>
  );
}

function ProgressStep({ label, detail, complete }: { label: string; detail: string; complete: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${complete ? "border-[#8fca45] bg-[#f1f8df]" : "border-[#d8d1c2] bg-[#fffaf0]"}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${complete ? "border-[#8fca45] bg-[#AFF546] text-[#08111F]" : "border-[#a9a49a] text-[#737b86]"}`}>
          {complete ? <Check className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#08111F]">{label}</p>
          <p className="mt-1 text-sm leading-5 text-[#08111F]/60">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function TalentView(props: Props) {
  const [activeSection, setActiveSection] = useState<TalentDashboardSection>(() => talentSectionFromHash(typeof window === "undefined" ? "" : window.location.hash) ?? "overview");
  const [deleteAccountConfirmationOpen, setDeleteAccountConfirmationOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const summary = props.talentSummary;
  const requestItems = summary?.requestPreview ?? [];
  const connectionItems = summary?.connectionPreview ?? [];
  const availability = normalizeAvailability(props.dashboardTalentProfile?.availability, props.dashboardTalentProfile?.opportunityStatus);
  const status = formatAvailabilityLabel(availability);
  const displayFirstName = firstName(props.name);
  const activity = [
    ...requestItems.map((item) => ({ title: `${item.employerCompanyName ?? "Verified employer"} sent an introduction`, detail: props.formatDateTime(item.createdAt), state: item.status })),
    ...connectionItems.map((item) => ({ title: `Connection with ${item.employerCompanyName ?? "verified employer"}`, detail: props.formatDateTime(item.connectedAt), state: item.status })),
  ].slice(0, 5);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deletingAccount) {
        setDeleteAccountConfirmationOpen(false);
        setDeleteAccountError(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deletingAccount]);

  useEffect(() => {
    const applyHashSection = () => {
      const section = talentSectionFromHash(window.location.hash);
      if (section) {
        setActiveSection(section);
      }
    };

    applyHashSection();
    window.addEventListener("hashchange", applyHashSection);
    return () => window.removeEventListener("hashchange", applyHashSection);
  }, []);

  useEffect(() => {
    if (activeSection !== "introductions" && activeSection !== "connections") {
      return;
    }
    if (talentSectionFromHash(window.location.hash) !== activeSection) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      document.getElementById(activeSection)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [activeSection]);

  const closeDeleteAccountConfirmation = () => {
    if (deletingAccount) return;
    setDeleteAccountConfirmationOpen(false);
    setDeleteAccountError(null);
  };

  const deleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    setDeleteAccountError(null);

    try {
      const session = await getSessionWithRetry();

      if (!session?.access_token) {
        setDeleteAccountError("Your session has expired. Sign in again to delete your account.");
        return;
      }

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!response.ok || !result?.ok) {
        setDeleteAccountError(result?.message ?? "We could not delete your account. Please try again.");
        return;
      }

      await supabase.auth.signOut().catch(() => undefined);
      window.location.assign("/");
    } catch {
      setDeleteAccountError("We could not delete your account. Please try again.");
    } finally {
      setDeletingAccount(false);
    }
  };

  return <>
    <div className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start xl:gap-6">
      <aside className="rounded-[24px] border border-[#cda64d]/45 bg-[#f7e8c6] p-5 text-[#08111F] shadow-[0_18px_45px_rgba(6,16,33,0.2)] lg:sticky lg:top-24 lg:h-fit">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#4b7f08]">Talent Dashboard</p>
            <h1 className="mt-3 font-serif text-4xl leading-[0.95] tracking-tight">Hello,<br />{displayFirstName}</h1>
          </div>
          <span className="mt-1 h-3 w-3 rounded-full bg-[#AFF546] shadow-[0_0_0_6px_rgba(175,245,70,0.14)]" />
        </div>

        <nav className="mt-7 space-y-1.5" aria-label="Dashboard sections">
          <DashboardMenuButton section="overview" activeSection={activeSection} icon={House} onSelect={setActiveSection}>Dashboard</DashboardMenuButton>
          <DashboardMenuButton section="activity" activeSection={activeSection} icon={History} onSelect={setActiveSection}>Recent Activity</DashboardMenuButton>
          <DashboardMenuButton section="notifications" activeSection={activeSection} icon={Bell} onSelect={setActiveSection}>Notifications</DashboardMenuButton>
          <DashboardMenuButton section="introductions" activeSection={activeSection} icon={Handshake} onSelect={setActiveSection}>Introductions</DashboardMenuButton>
          <DashboardMenuButton section="connections" activeSection={activeSection} icon={Users} onSelect={setActiveSection}>Connections</DashboardMenuButton>
          <DashboardMenuButton section="identity" activeSection={activeSection} icon={IdCard} onSelect={setActiveSection}>Professional Identity</DashboardMenuButton>
          <DashboardMenuButton section="journey" activeSection={activeSection} icon={Check} onSelect={setActiveSection}>Builder Journey</DashboardMenuButton>
        </nav>
      </aside>

      <main className="min-w-0 space-y-5">
        {activeSection === "overview" ? <>
          <section className="relative overflow-hidden rounded-[24px] border border-[#cda64d]/45 bg-[#f7e8c6] p-6 text-[#08111F] shadow-[0_18px_45px_rgba(6,16,33,0.18)] sm:p-8 lg:min-h-[310px]">
          <div className="absolute right-[-5rem] top-[-7rem] h-72 w-72 rounded-full bg-[#AFF546]/20 blur-2xl" />
          <div className="relative z-10 grid min-h-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#4b7f08]">Welcome back</p>
              <h2 className="mt-5 font-serif text-5xl leading-[0.95] tracking-tight text-[#08111F] sm:text-6xl xl:text-7xl">Hello, {displayFirstName}</h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#08111F]/66">
                {props.isPublished ? `Your profile is visible as ${props.visibility}. Keep your profile up to date to attract more opportunities.` : "Your profile is currently unpublished. Build and publish your profile when you are ready to be discovered."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <DashboardAction href={props.talentPassportHref} variant="green">VIEW YOUR TALENT PASSPORT</DashboardAction>
                <DashboardAction href="/builder" variant="outline">EDIT PROFILE</DashboardAction>
              </div>
            </div>
            <div className="flex min-h-[180px] items-center justify-center px-2 sm:min-h-[210px] lg:min-h-[250px] lg:px-4">
              <Image src="/images/moreopp.png" alt="More opportunities" width={1536} height={1024} className="h-full max-h-[250px] w-full max-w-[360px] object-contain" priority />
            </div>
          </div>
          </section>

          <section className="rounded-[24px] border border-[#cda64d]/45 bg-[#f7e8c6] p-6 text-[#08111F] shadow-[0_18px_45px_rgba(6,16,33,0.16)] sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4b7f08]">Engagement</p>
            <div className="mt-6 grid divide-y divide-[#08111F]/12 border-t border-[#08111F]/12 pt-2 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
              <TalentMetric label="Profile views" value={props.isProTalent && summary?.proAnalytics ? summary.proAnalytics.profileViews : "Pro"} detail={props.isProTalent ? "Verified employer engagement" : "Upgrade to unlock profile views"} icon={Eye} />
              <TalentMetric label="Employer saves" value={props.isProTalent && summary?.proAnalytics ? summary.proAnalytics.employerSaves : "Pro"} detail={props.isProTalent ? "Saved by employers" : "Upgrade to unlock employer saves"} icon={Bookmark} />
              <TalentMetric label="Connections" value={summary?.activeConnections ?? 0} detail="Active employer connections" icon={Users} />
              <TalentMetric label="Introductions" value={summary?.pendingIntroductionRequests ?? 0} detail="Pending requests you can review" icon={Handshake} />
            </div>
          </section>

          <section className="rounded-[24px] border border-[#cda64d]/45 bg-[#f7e8c6] p-6 text-[#08111F] shadow-[0_18px_45px_rgba(6,16,33,0.16)] sm:p-7">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4b7f08]">Account & Profile</p>
              <h2 className="mt-2 font-serif text-3xl tracking-tight text-[#08111F]">Manage your account</h2>
            </div>
            <div className="mt-6 divide-y divide-[#08111F]/12 border-t border-[#08111F]/12">
              <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-serif text-2xl text-[#08111F]">Privacy & visibility</h3><p className="mt-1 text-sm leading-6 text-[#08111F]/60">Control who can discover you and what employers can see.</p></div><DashboardAction href="/settings/privacy" variant="green">MANAGE PRIVACY</DashboardAction></div>
              <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-serif text-2xl text-[#08111F]">Free Agent Pro</h3><p className="mt-1 text-sm leading-6 text-[#08111F]/60">{props.isProTalent ? "Your Pro subscription is active." : "Unlock additional visibility insights and Pro features."}</p></div>{props.isProTalent ? <BillingButton action="portal" className="dashboard-upgrade-pill">MANAGE SUBSCRIPTION <span aria-hidden="true">→</span></BillingButton> : <BillingButton action="checkout" plan="free_agent_pro" className="dashboard-upgrade-pill">UPGRADE TO PRO <span aria-hidden="true">→</span></BillingButton>}</div>
              <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-serif text-2xl text-[#08111F]">Delete account</h3><p className="mt-1 text-sm leading-6 text-[#08111F]/60">Permanently delete your account and your data.</p></div><button type="button" onClick={() => { setDeleteAccountError(null); setDeleteAccountConfirmationOpen(true); }} className="dashboard-talent-green-action">DELETE ACCOUNT <span aria-hidden="true">→</span></button></div>
              <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-serif text-2xl text-[#08111F]">Sign out</h3><p className="mt-1 text-sm leading-6 text-[#08111F]/60">Finished for now?</p></div><button type="button" onClick={props.signOut} className="dashboard-talent-green-action">SIGN OUT <span aria-hidden="true">→</span></button></div>
            </div>
          </section>
          {props.hasScheduledCancellation ? <p className="text-sm text-[#F7F4EC]/70">Your Pro access remains active until {props.scheduledCancellationDate}.</p> : null}
        </> : null}

        {activeSection === "activity" ? <DashboardPanel title="Recent Activity" eyebrow="Your network"><DashboardActivity items={activity} empty="Your introduction and connection activity will appear here." /></DashboardPanel> : null}

        {activeSection === "notifications" ? <NotificationsPage embedded /> : null}

        {activeSection === "introductions" ? <TalentConnectionsSection view="introductions" /> : null}

        {activeSection === "connections" ? <TalentConnectionsSection /> : null}

        {activeSection === "identity" ? <section className="rounded-[24px] border border-[#cda64d]/45 bg-[#f7e8c6] p-6 text-[#08111F] shadow-[0_18px_45px_rgba(6,16,33,0.16)] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4b7f08]">Professional identity</p>
              <h2 className="mt-2 font-serif text-3xl tracking-tight text-[#08111F]">Your FreeAgent Card</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <DashboardAction href="/builder" variant="green">EDIT CARD</DashboardAction>
              <DashboardAction href={props.talentPassportHref} variant="outline">VIEW PASSPORT</DashboardAction>
            </div>
          </div>
          <div className="mt-7 grid gap-7 border-t border-[#08111F]/12 pt-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-center">
            {props.dashboardTalentProfile ? <TalentCard profile={props.dashboardTalentProfile} href={props.talentPassportHref} className="mx-auto w-full max-w-[340px] lg:mx-0" /> : <p className="rounded-2xl border border-[#08111F]/10 bg-[#fffaf0] p-5 text-base leading-7 text-[#08111F]/60">Build your profile to see your FreeAgent Card.</p>}
            <div className="rounded-2xl border border-[#08111F]/10 bg-[#fffaf0] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#08111F]/55">Current status</p>
              <h3 className="mt-3 font-serif text-3xl text-[#08111F]">{status}</h3>
              <p className="mt-3 text-sm leading-7 text-[#08111F]/64">Your Card uses the same profile information employers see across FreeAgentStaff. Update it in Talent Builder whenever your story changes.</p>
            </div>
          </div>
        </section> : null}

        {activeSection === "journey" ? <section className="rounded-[24px] border border-[#cda64d]/45 bg-[#f7e8c6] p-6 text-[#08111F] shadow-[0_18px_45px_rgba(6,16,33,0.16)] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4b7f08]">Your progress</p>
              <h2 className="mt-2 font-serif text-3xl tracking-tight text-[#08111F]">Builder Journey</h2>
              <p className="mt-2 text-sm leading-6 text-[#08111F]/60">Complete the real profile sections that shape your Card and Passport.</p>
            </div>
            <Link href="/builder" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#AFF546] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#08111F] transition hover:-translate-y-0.5 hover:brightness-105">CONTINUE BUILDING<ArrowUpRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ProgressStep label="FreeAgent Card" detail={props.cardStatus} complete={statusIsComplete(props.cardStatus)} />
            <ProgressStep label="Talent Passport" detail={props.passportStatus} complete={statusIsComplete(props.passportStatus)} />
            <ProgressStep label="Published" detail={props.isPublished ? "Profile live" : "Not published"} complete={props.isPublished} />
            <ProgressStep label="Discoverable" detail={props.isPublished ? props.visibility : "Waiting for publication"} complete={props.isPublished} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {builderSections.map((section) => {
              const complete = sectionIsComplete(section.id, props.dashboardTalentProfile, props.isPublished);
              return <span key={section.id} className={`rounded-full border px-3 py-2 text-[9px] font-bold uppercase tracking-[0.1em] ${complete ? "border-[#8fca45] bg-[#AFF546] text-[#08111F]" : "border-[#08111F]/10 bg-[#fffaf0] text-[#08111F]/55"}`}>{section.label}</span>;
            })}
          </div>
        </section> : null}
      </main>
    </div>

    {deleteAccountConfirmationOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08111F]/70 p-5" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onClick={closeDeleteAccountConfirmation}><div className="w-full max-w-lg rounded-2xl border border-[#cda64d]/45 bg-[#f7ebcf] p-6 text-[#08111F] shadow-2xl sm:p-8" onClick={(event) => event.stopPropagation()}><h2 id="delete-account-title" className="font-serif text-2xl">ARE YOU SURE?</h2><p className="mt-4 text-sm leading-7 text-[#27405f]">Are you sure you want to delete your account? This action cannot be undone.</p>{deleteAccountError ? <p role="alert" className="mt-4 text-sm font-semibold text-[#8f2018]">{deleteAccountError}</p> : null}<div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={closeDeleteAccountConfirmation} disabled={deletingAccount} className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#0f2744]/20 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#071426] transition hover:bg-[#fffaf0] disabled:opacity-50">CANCEL</button><button type="button" onClick={deleteAccount} disabled={deletingAccount} className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#d85a4f] px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#08111F] disabled:opacity-50">{deletingAccount ? "DELETING..." : "DELETE ACCOUNT"}</button></div></div></div> : null}
  </>;
}
