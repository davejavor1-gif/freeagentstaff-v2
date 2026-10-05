"use client";

import { useCallback, useEffect, useState } from "react";
import type { TalentReferenceAnswers, TalentReferenceOwnerView } from "@/types/talent-references";

function DestinationPill({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#651D2A] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#f7ebcf]">
      {label}
    </span>
  );
}

function formatSentDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function wouldWorkAgainLabel(value: TalentReferenceAnswers["wouldWorkAgain"]) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return "Prefer not to say";
}

const emptyForm = {
  refereeName: "",
  jobTitle: "",
  company: "",
  relationship: "",
  refereeEmail: "",
};

export default function TalentBuilderReferences({ accessToken }: { accessToken: string }) {
  const [references, setReferences] = useState<TalentReferenceOwnerView[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const headers = useCallback(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    [accessToken],
  );

  const loadReferences = useCallback(async () => {
    const response = await fetch("/api/talent/references", { headers: { Authorization: `Bearer ${accessToken}` } });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      references?: TalentReferenceOwnerView[];
    } | null;

    if (!response.ok || !payload?.ok) {
      setError(payload?.message ?? "Unable to load references.");
      return;
    }

    setReferences(payload.references ?? []);
  }, [accessToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async owner list refresh after mount
    void loadReferences();
  }, [loadReferences]);

  const submitInvitation = async () => {
    setSaving(true);
    setError(null);
    const response = await fetch("/api/talent/references", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(form),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      reference?: TalentReferenceOwnerView;
    } | null;

    if (payload?.reference) {
      await loadReferences();
      if (payload.ok) {
        setForm(emptyForm);
        setFormOpen(false);
      }
    }

    if (!payload?.ok) {
      setError(payload?.message ?? "Unable to send the invitation.");
    }

    setSaving(false);
  };

  const inviteAgain = async (id: string) => {
    setBusyId(id);
    setError(null);
    const response = await fetch(`/api/talent/references/${id}/invite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!response.ok || !payload?.ok) {
      setError(payload?.message ?? "Unable to send the invitation.");
    }
    await loadReferences();
    setBusyId(null);
  };

  const removeReference = async (id: string) => {
    setBusyId(id);
    setError(null);
    const response = await fetch(`/api/talent/references/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!response.ok || !payload?.ok) {
      setError(payload?.message ?? "Unable to remove that reference.");
    }
    await loadReferences();
    setBusyId(null);
  };

  const setSharing = async (id: string, share: boolean) => {
    setBusyId(id);
    setError(null);
    const response = await fetch(`/api/talent/references/${id}/share`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ share }),
    });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!response.ok || !payload?.ok) {
      setError(payload?.message ?? "Unable to update sharing.");
    }
    await loadReferences();
    setBusyId(null);
  };

  return (
    <div className="space-y-3 rounded-[20px] border border-[#0f2744]/15 border-t-4 border-t-[#651D2A] bg-[#fffaf0] p-4 text-[#071426] shadow-[0_10px_24px_rgba(7,20,38,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">References</p>
        <DestinationPill label="Passport · After connection" />
      </div>
      <p className="text-sm text-[#27405f]">Request professional references and keep them securely in your Talent Passport.</p>
      <p className="text-sm text-[#27405f]">References are private. Only references you choose to share become visible to Employers after you accept their introduction.</p>

      <button
        type="button"
        onClick={() => setFormOpen((open) => !open)}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]"
      >
        {formOpen ? "Close form" : "+ Request a reference"}
      </button>

      {formOpen ? (
        <form
          className="space-y-3 rounded-2xl border border-[#cda64d]/35 bg-white/80 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitInvitation();
          }}
        >
          <label className="block text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]" htmlFor="refereeName">
            Referee name *
          </label>
          <input
            id="refereeName"
            value={form.refereeName}
            onChange={(event) => setForm((current) => ({ ...current, refereeName: event.target.value }))}
            className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]"
            required
          />
          <label className="block text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]" htmlFor="refereeJobTitle">
            Job title
          </label>
          <input
            id="refereeJobTitle"
            value={form.jobTitle}
            onChange={(event) => setForm((current) => ({ ...current, jobTitle: event.target.value }))}
            className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]"
          />
          <label className="block text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]" htmlFor="refereeCompany">
            Company / organisation
          </label>
          <input
            id="refereeCompany"
            value={form.company}
            onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
            className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]"
          />
          <label className="block text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]" htmlFor="refereeRelationship">
            Relationship to you
          </label>
          <input
            id="refereeRelationship"
            value={form.relationship}
            onChange={(event) => setForm((current) => ({ ...current, relationship: event.target.value }))}
            className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]"
          />
          <label className="block text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]" htmlFor="refereeEmail">
            Email address *
          </label>
          <input
            id="refereeEmail"
            type="email"
            value={form.refereeEmail}
            onChange={(event) => setForm((current) => ({ ...current, refereeEmail: event.target.value }))}
            className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] outline-none transition focus:border-[#0f2744]"
            required
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] disabled:opacity-50"
          >
            {saving ? "Sending..." : "Send invitation"}
          </button>
        </form>
      ) : null}

      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}

      <div className="space-y-3">
        {references.map((reference) => {
          const roleLine = [reference.jobTitle, reference.company].filter(Boolean).join(" · ");
          const sentDate = formatSentDate(reference.invitationSentAt);
          const busy = busyId === reference.id;

          return (
            <article key={reference.id} className="space-y-3 rounded-2xl border border-[#cda64d]/35 bg-white/80 p-3">
              <div>
                <p className="text-base font-semibold text-[#08111F]">{reference.refereeName}</p>
                {roleLine ? <p className="mt-0.5 text-sm text-[#27405f]">{roleLine}</p> : null}
              </div>

              {reference.status === "submitted" ? (
                <>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4C8C15]">Referee submitted</p>
                  <button
                    type="button"
                    onClick={() => setExpandedId((current) => (current === reference.id ? null : reference.id))}
                    className="text-sm font-semibold text-[#0f2744] underline underline-offset-2"
                  >
                    {expandedId === reference.id ? "Hide submitted reference" : "View submitted reference"}
                  </button>
                  {expandedId === reference.id && reference.answers ? (
                    <dl className="space-y-2 rounded-2xl border border-[#0f2744]/10 bg-[#fffaf0] p-3 text-sm text-[#071426]">
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a6d15]">Professional relationship</dt>
                        <dd className="mt-1">{reference.answers.professionalRelationship}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a6d15]">Worked together</dt>
                        <dd className="mt-1">{reference.answers.workedTogetherDuration}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a6d15]">Key strengths</dt>
                        <dd className="mt-1">{reference.answers.keyStrengths}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a6d15]">Reliability</dt>
                        <dd className="mt-1">{reference.answers.reliabilityRating} / 5</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a6d15]">Teamwork</dt>
                        <dd className="mt-1">{reference.answers.teamworkRating} / 5</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a6d15]">Would work again</dt>
                        <dd className="mt-1">{wouldWorkAgainLabel(reference.answers.wouldWorkAgain)}</dd>
                      </div>
                      {reference.answers.additionalComments ? (
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a6d15]">Additional comments</dt>
                          <dd className="mt-1">{reference.answers.additionalComments}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#cda64d]/50 bg-white px-4 py-3 text-sm text-[#071426]">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[#AFF546]"
                      checked={reference.shareWithConnectedEmployers}
                      disabled={busy}
                      onChange={(event) => void setSharing(reference.id, event.target.checked)}
                    />
                    <span>
                      <span className="block font-semibold">Share with connected Employers</span>
                      <span className="mt-1 block text-xs text-[#27405f]">Only Employers you have an active accepted connection with can view shared references.</span>
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeReference(reference.id)}
                    className="min-h-[44px] rounded-full border border-rose-900/20 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-900 disabled:opacity-50"
                  >
                    Delete reference
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a6d15]">Pending reference</p>
                  {reference.invitationLive && sentDate ? (
                    <p className="text-sm text-[#27405f]">Invitation sent {sentDate}</p>
                  ) : (
                    <p className="text-sm text-[#651D2A]">Invitation not sent. You can retry sending this request.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void inviteAgain(reference.id)}
                      className="min-h-[44px] rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] disabled:opacity-50"
                    >
                      {reference.invitationLive ? "Resend invitation" : "Send invitation"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeReference(reference.id)}
                      className="min-h-[44px] rounded-full border border-rose-900/20 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-900 disabled:opacity-50"
                    >
                      Cancel request
                    </button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
