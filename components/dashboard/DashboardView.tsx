"use client";

import Link from "next/link";
import { Activity, BriefcaseBusiness, CheckCircle2, Link2, Sparkles, Users, Undo2, XCircle } from "lucide-react";
import BillingButton from "@/components/BillingButton";
import TalentCard from "@/components/TalentCard";
import {
  DashboardAction,
  DashboardActivity,
  DashboardHeader,
  DashboardJourney,
  DashboardMetricCard,
  DashboardPanel,
  DashboardShell,
} from "@/components/dashboard/DashboardPrimitives";
import type { EmployerVerificationStatus } from "@/types/freeagent";
import type { FreeAgentProfile } from "@/types/freeagent";
import type { EmployerSummaryPayload, TalentSummaryPayload } from "@/types/dashboard";

type Audience = "talent" | "employer";

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

const toneFor = (status: string) => status.replaceAll("_", " ");

export default function DashboardView(props: Props) {
  const { audience } = props;
  return <DashboardShell audience={audience}>{audience === "employer" ? <EmployerView {...props} /> : <TalentView {...props} />}</DashboardShell>;
}

function EmployerView(props: Props) {
  const summary = props.employerSummary;
  const canWork = props.hasEmployerAccess;
  const requestItems = summary?.requestPreview ?? [];
  const connectionItems = summary?.connectionPreview ?? [];
  const activity = [
    ...connectionItems.map((item) => ({ title: `${item.talentName ?? "Confidential talent"} connection ${item.status}`, detail: props.formatDateTime(item.status === "active" ? item.connectedAt : item.revokedAt ?? item.connectedAt) })),
    ...requestItems.filter((item) => item.status !== "pending").map((item) => ({ title: `${item.talentName} introduction ${item.status}`, detail: props.formatDateTime(item.respondedAt ?? item.withdrawnAt ?? item.createdAt) })),
  ].slice(0, 5);

  return <>
    <DashboardHeader audience="employer" name={props.name} status={props.verificationLabel}>
      {canWork ? <DashboardAction href="/find-talent">Find talent</DashboardAction> : <DashboardAction href="/onboarding/employer">Employer account</DashboardAction>}
      {canWork ? <BillingButton action="portal" className="dashboard-employer-blue-action">Manage subscription</BillingButton> : null}
    </DashboardHeader>

    <div className="space-y-6">
      <DashboardJourney title="Your hiring journey" stages={[
        { label: "Verified", detail: props.isVerifiedEmployer ? "Account verified" : props.verificationLabel, state: props.isVerifiedEmployer ? "complete" : "current" },
        { label: "Subscribed", detail: summary?.subscription.hasAccess ? "Plan active" : "Access required", state: summary?.subscription.hasAccess ? "complete" : "upcoming" },
        { label: "Discovering", detail: "Finding talent", state: canWork ? "current" : "upcoming" },
        { label: "Connecting", detail: "Building relationships", state: (summary?.activeConnections ?? 0) > 0 ? "complete" : "upcoming" },
      ]} />

      {!props.isVerifiedEmployer ? <VerificationPanel {...props} /> : null}
      {props.isVerifiedEmployer && !canWork ? <DashboardPanel title="Employer access is ready" eyebrow="Subscription" action={<BillingButton action="checkout" plan="employer" className="dashboard-action">Choose plan</BillingButton>}><p className="mt-5 max-w-2xl text-sm leading-7 text-[#08111F]/60">Your organisation is verified. Activate Employer Access to begin discovering eligible talent.</p></DashboardPanel> : null}

      {canWork ? <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard href="/saved-talent" label="Saved talent" value={summary?.savedTalentCount ?? 0} detail="People you bookmarked" icon={Users} />
          <DashboardMetricCard href="/introduction-requests" label="Introductions" value={summary?.pendingIntroductionRequests ?? 0} detail="Waiting for a response" icon={Link2} />
          <DashboardMetricCard href="/connections" label="Connections" value={summary?.activeConnections ?? 0} detail="Talent you can contact" icon={Link2} />
          <DashboardMetricCard href="/saved-talent" label="Shortlists" value={summary?.activeShortlists ?? 0} detail="Candidates you are considering" icon={BriefcaseBusiness} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <DashboardPanel title="Recent activity" eyebrow="Live workspace" action={<Link href="/connections" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2BD7EF]">View all</Link>}><DashboardActivity items={activity} empty="Your introduction and connection activity will appear here." /></DashboardPanel>
          <DashboardPanel title="Sent introductions" eyebrow="Relationship pipeline" action={<Link href="/find-talent" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2BD7EF]">Find talent</Link>}>
            <div className="mt-6 space-y-3 border-t border-[#08111F]/15 pt-5">{requestItems.length === 0 ? <p className="text-base leading-7 text-[#08111F]/60">No introduction requests yet. Request an introduction from an eligible talent profile.</p> : requestItems.slice(0, 4).map((request) => <div key={request.requestId} className="flex items-start justify-between gap-3 border-b border-[#08111F]/15 pb-3 last:border-0"><div><p className="text-lg font-semibold text-[#08111F]">{request.talentName}</p><p className="mt-1 text-sm text-[#08111F]/60">{props.formatDateTime(request.createdAt)} / {request.isCurrentlyEligible ? "Eligible" : "Access limited"}</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-[#2BD7EF]/40 bg-[#2BD7EF]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08798a]">{toneFor(request.status)}</span>{request.status === "pending" ? <button type="button" onClick={() => props.withdrawRequest(request.requestId)} disabled={props.updatingId === request.requestId} className="text-[#08798a]" aria-label={`Withdraw introduction to ${request.talentName}`}><Undo2 className="h-4 w-4" /></button> : null}</div></div>)}</div>
          </DashboardPanel>
        </div>

        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]">
          <DashboardPanel title="Connected talent" eyebrow="Your network" action={<Link href="/connections" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2BD7EF]">Open connections</Link>}>
            <div className="mt-6 grid gap-3 border-t border-[#08111F]/15 pt-5 md:grid-cols-2">{connectionItems.length === 0 ? <p className="text-base text-[#08111F]/60">Connections are created when introductions are accepted.</p> : connectionItems.map((item) => <div key={item.connectionId} className="rounded-xl border border-[#08111F]/15 bg-[#08111F]/[0.04] p-4"><div className="flex justify-between gap-4"><div><p className="text-lg font-semibold text-[#08111F]">{item.talentName ?? "Confidential talent"}</p><p className="mt-1 text-sm text-[#08111F]/60">{item.talentTitle ?? "Professional profile"}</p></div><span className="text-xs font-bold uppercase tracking-[0.12em] text-[#08798a]">{item.status}</span></div></div>)}</div>
          </DashboardPanel>
          <DashboardPanel title="Sign out" eyebrow="Account"><p className="mt-4 text-sm text-[#08111F]/60">Finished for now?</p><button type="button" onClick={props.signOut} className="dashboard-employer-blue-action">Sign out <span aria-hidden="true">→</span></button></DashboardPanel>
        </div>
      </> : null}
    </div>
  </>;
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

function TalentView(props: Props) {
  const summary = props.talentSummary;
  const requestItems = summary?.requestPreview ?? [];
  const connectionItems = summary?.connectionPreview ?? [];
  const status = props.isPublished ? "Available for opportunities" : "Profile not discoverable";
  const activity = [...requestItems.map((item) => ({ title: `${item.employerCompanyName ?? "Verified employer"} sent an introduction`, detail: props.formatDateTime(item.createdAt), state: item.status })), ...connectionItems.map((item) => ({ title: `Connection with ${item.employerCompanyName ?? "verified employer"}`, detail: props.formatDateTime(item.connectedAt), state: item.status }))].slice(0, 5);

  return <>
    <DashboardHeader audience="talent" name={props.name} status={status}>
      <DashboardAction href="/builder">EDIT CARD</DashboardAction>
      <DashboardAction href={props.talentPassportHref}>VIEW PASSPORT</DashboardAction>
    </DashboardHeader>
    <div className="space-y-6">
      <section className="dashboard-panel overflow-hidden p-6 sm:p-8"><div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><p className="dashboard-kicker">Profile status</p><h2 className="mt-3 font-serif text-3xl text-[#08111F]">{props.isPublished ? "Your profile is visible to verified employers." : "Your profile is currently unpublished."}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-[#08111F]/60">{props.isPublished ? `Visibility: ${props.visibility.replaceAll("_", " ")}.` : "Publish your profile and review your privacy settings to be considered for introductions."}</p></div><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#AFF546]/35 bg-[#AFF546]/10 text-[#AFF546]"><span className="h-3 w-3 rounded-full bg-[#AFF546] shadow-[0_0_16px_rgba(175,245,70,0.5)]" /></span></div></section>
      <DashboardJourney compact title="Your profile journey" stages={[
        { label: "FreeAgent Card", detail: props.cardStatus, state: props.cardStatus === "Ready" || props.cardStatus === "Created" ? "complete" : "current" },
        { label: "Talent Passport", detail: props.passportStatus, state: props.passportStatus === "Ready" || props.passportStatus === "Created" ? "complete" : "current" },
        { label: "Published", detail: props.isPublished ? "Profile live" : "Not published", state: props.isPublished ? "complete" : "current" },
        { label: "Discoverable", detail: props.isPublished ? props.visibility.replaceAll("_", " ") : "Waiting for publication", state: props.isPublished ? "current" : "upcoming" },
      ]} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><DashboardMetricCard compact href="/connections" inlineAction label="Introductions" value={summary?.pendingIntroductionRequests ?? 0} detail="Waiting for your response" icon={Link2} /><DashboardMetricCard compact href="/connections" inlineAction label="Connections" value={summary?.activeConnections ?? 0} detail="Active employer relationships" icon={Link2} />{props.isProTalent && summary?.proAnalytics ? <><DashboardMetricCard compact label="Profile views" value={summary.proAnalytics.profileViews} detail="Verified engagement" icon={Activity} /><DashboardMetricCard compact label="Employer saves" value={summary.proAnalytics.employerSaves} detail="Saved by employers" icon={Sparkles} /></> : <><DashboardMetricCard compact label="Profile views" value="" detail="Unlock employer views" icon={Activity} middle={<BillingButton action="checkout" plan="free_agent_pro" className="dashboard-upgrade-pill">Upgrade to Pro <span aria-hidden="true">→</span></BillingButton>} /><DashboardMetricCard compact label="Employer saves" value="" detail="Unlock employer saves" icon={Sparkles} middle={<BillingButton action="checkout" plan="free_agent_pro" className="dashboard-upgrade-pill">Upgrade to Pro <span aria-hidden="true">→</span></BillingButton>} /></>}</section>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><DashboardPanel title="Your FreeAgent Card" eyebrow="Professional identity" action={<div className="flex flex-wrap gap-3"><DashboardAction href="/builder">EDIT CARD</DashboardAction><DashboardAction href={props.talentPassportHref}>VIEW PASSPORT</DashboardAction></div>}><div className="mt-6 border-t border-[#08111F]/15 pt-5">{props.dashboardTalentProfile ? <TalentCard profile={props.dashboardTalentProfile} href={props.talentPassportHref} className="max-w-[310px]" /> : <p className="text-base text-[#08111F]/60">Build your profile to see your FreeAgent Card.</p>}</div></DashboardPanel><DashboardPanel title="Recent activity" eyebrow="Your network" action={<Link href="/connections" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4b7f08]">View all</Link>}><DashboardActivity items={activity} empty="Your introduction and connection activity will appear here." /></DashboardPanel></div>
      <DashboardPanel title="Incoming introductions" eyebrow="Employer interest" action={<Link href="/connections" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4b7f08]">Open connections</Link>}><div className="mt-6 space-y-3 border-t border-[#08111F]/15 pt-5">{requestItems.length === 0 ? <p className="text-base leading-7 text-[#08111F]/60">No incoming requests yet. Eligible employers can request introductions from your profile.</p> : requestItems.map((request) => <div key={request.requestId} className="flex flex-col gap-4 rounded-xl border border-[#08111F]/15 bg-[#08111F]/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-lg font-semibold text-[#08111F]">{request.employerCompanyName ?? "Verified employer"}</p><p className="mt-1 text-sm text-[#08111F]/60">{props.formatDateTime(request.createdAt)} / {toneFor(request.status)}</p></div>{request.status === "pending" && request.canTalentRespond ? <div className="flex gap-2"><button type="button" disabled={props.updatingId === request.requestId} onClick={() => props.updateTalentRequest(request.requestId, "accept")} className="dashboard-action"><CheckCircle2 className="h-4 w-4" /> Accept</button><button type="button" disabled={props.updatingId === request.requestId} onClick={() => props.updateTalentRequest(request.requestId, "decline")} className="dashboard-action dashboard-action-outline"><XCircle className="h-4 w-4" /> Decline</button></div> : null}</div>)}</div></DashboardPanel>
      <div className="grid gap-4 md:grid-cols-3"><DashboardPanel title="Privacy & visibility" eyebrow="Control your profile"><p className="mt-4 text-sm text-[#08111F]/60">Control who can discover you and what employers can see.</p><DashboardAction href="/settings/privacy" variant="green">MANAGE PRIVACY</DashboardAction></DashboardPanel><DashboardPanel title="Free Agent Pro" eyebrow="Subscription">{props.isProTalent ? <><p className="mt-4 text-sm text-[#08111F]/60">Your Pro subscription is active.</p><BillingButton action="portal" className="dashboard-upgrade-pill">MANAGE SUBSCRIPTION <span aria-hidden="true">→</span></BillingButton></> : <><p className="mt-4 text-sm text-[#08111F]/60">Unlock additional visibility insights and Pro features.</p><BillingButton action="checkout" plan="free_agent_pro" className="dashboard-upgrade-pill">UPGRADE TO PRO <span aria-hidden="true">→</span></BillingButton></>}</DashboardPanel><DashboardPanel title="Sign out" eyebrow="Account"><p className="mt-4 text-sm text-[#08111F]/60">Finished for now?</p><button type="button" onClick={props.signOut} className="dashboard-talent-green-action">SIGN OUT <span aria-hidden="true">→</span></button></DashboardPanel></div>
      {props.hasScheduledCancellation ? <p className="text-sm text-[#F7F4EC]/70">Your Pro access remains active until {props.scheduledCancellationDate}.</p> : null}
    </div>
  </>;
}

