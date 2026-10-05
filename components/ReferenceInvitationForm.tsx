"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { TALENT_REFERENCE_ANSWER_LIMITS } from "@/lib/talent-reference-answers";
import type { TalentReferenceWouldWorkAgain } from "@/types/talent-references";

type FormState = {
  professionalRelationship: string;
  workedTogetherDuration: string;
  keyStrengths: string;
  reliabilityRating: string;
  teamworkRating: string;
  wouldWorkAgain: TalentReferenceWouldWorkAgain | "";
  additionalComments: string;
  confirmation: boolean;
};

const emptyForm: FormState = {
  professionalRelationship: "",
  workedTogetherDuration: "",
  keyStrengths: "",
  reliabilityRating: "",
  teamworkRating: "",
  wouldWorkAgain: "",
  additionalComments: "",
  confirmation: false,
};

export default function ReferenceInvitationForm({
  talentDisplayName,
  talentFirstName,
}: {
  talentDisplayName: string;
  talentFirstName: string;
}) {
  const params = useParams<{ token: string }>();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const token = typeof params.token === "string" ? params.token : "";
    const response = await fetch("/api/references/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        answers: {
          professionalRelationship: form.professionalRelationship,
          workedTogetherDuration: form.workedTogetherDuration,
          keyStrengths: form.keyStrengths,
          reliabilityRating: Number(form.reliabilityRating),
          teamworkRating: Number(form.teamworkRating),
          wouldWorkAgain: form.wouldWorkAgain,
          additionalComments: form.additionalComments.trim() || null,
          confirmation: form.confirmation,
        },
      }),
    });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!response.ok || !payload?.ok) {
      setError(payload?.message ?? "This reference invitation is invalid or no longer available.");
      setSaving(false);
      return;
    }
    setSubmitted(true);
    setSaving(false);
  };

  if (submitted) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="font-serif text-3xl font-bold text-[#08111F]">Thank you</h1>
        <p className="text-sm leading-6 text-[#27405f]">Your reference for {talentFirstName} has been submitted to FreeAgentStaff.</p>
        <p className="text-sm leading-6 text-[#27405f]">You can now close this page.</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#08111F]">Professional reference for {talentDisplayName}</h1>
        <p className="mt-3 text-sm leading-6 text-[#27405f]">{talentDisplayName} has invited you to provide a professional reference through FreeAgentStaff.</p>
        <p className="mt-2 text-sm leading-6 text-[#27405f]">Your reference will be kept private. {talentFirstName} can choose to share it with Employers they connect with.</p>
        <p className="mt-2 text-sm leading-6 text-[#27405f]">You do not need a FreeAgentStaff account.</p>
      </div>

      <label className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a6d15]" htmlFor="professionalRelationship">
        What was your professional relationship with {talentFirstName}?
      </label>
      <input
        id="professionalRelationship"
        required
        maxLength={TALENT_REFERENCE_ANSWER_LIMITS.professionalRelationship}
        value={form.professionalRelationship}
        onChange={(event) => setForm((current) => ({ ...current, professionalRelationship: event.target.value }))}
        className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] outline-none focus:border-[#0f2744]"
      />

      <label className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a6d15]" htmlFor="workedTogetherDuration">
        How long did you work with them?
      </label>
      <input
        id="workedTogetherDuration"
        required
        maxLength={TALENT_REFERENCE_ANSWER_LIMITS.workedTogetherDuration}
        value={form.workedTogetherDuration}
        onChange={(event) => setForm((current) => ({ ...current, workedTogetherDuration: event.target.value }))}
        className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] outline-none focus:border-[#0f2744]"
      />

      <label className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a6d15]" htmlFor="keyStrengths">
        What would you describe as their key strengths?
      </label>
      <textarea
        id="keyStrengths"
        required
        rows={4}
        maxLength={TALENT_REFERENCE_ANSWER_LIMITS.keyStrengths}
        value={form.keyStrengths}
        onChange={(event) => setForm((current) => ({ ...current, keyStrengths: event.target.value }))}
        className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] outline-none focus:border-[#0f2744]"
      />

      <fieldset>
        <legend className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a6d15]">How would you rate their reliability?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={`reliability-${value}`} className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-full border border-[#0f2744]/20 bg-white px-3 text-sm font-semibold text-[#08111F] has-[:checked]:bg-[#0f2744] has-[:checked]:text-[#f7ebcf]">
              <input
                type="radio"
                name="reliabilityRating"
                className="sr-only"
                required
                checked={form.reliabilityRating === String(value)}
                onChange={() => setForm((current) => ({ ...current, reliabilityRating: String(value) }))}
              />
              {value}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a6d15]">How would you rate their ability to work with others?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={`teamwork-${value}`} className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-full border border-[#0f2744]/20 bg-white px-3 text-sm font-semibold text-[#08111F] has-[:checked]:bg-[#0f2744] has-[:checked]:text-[#f7ebcf]">
              <input
                type="radio"
                name="teamworkRating"
                className="sr-only"
                required
                checked={form.teamworkRating === String(value)}
                onChange={() => setForm((current) => ({ ...current, teamworkRating: String(value) }))}
              />
              {value}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a6d15]">Would you employ or work with them again?</legend>
        <div className="mt-2 grid gap-2">
          {[
            { value: "yes" as const, label: "Yes" },
            { value: "no" as const, label: "No" },
            { value: "prefer_not_to_say" as const, label: "Prefer not to say" },
          ].map((option) => (
            <label key={option.value} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-2xl border border-[#cda64d]/50 bg-white px-4 text-sm text-[#071426]">
              <input
                type="radio"
                name="wouldWorkAgain"
                required
                checked={form.wouldWorkAgain === option.value}
                onChange={() => setForm((current) => ({ ...current, wouldWorkAgain: option.value }))}
                className="h-4 w-4 accent-[#AFF546]"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a6d15]" htmlFor="additionalComments">
        Additional comments
      </label>
      <textarea
        id="additionalComments"
        rows={4}
        maxLength={TALENT_REFERENCE_ANSWER_LIMITS.additionalComments}
        value={form.additionalComments}
        onChange={(event) => setForm((current) => ({ ...current, additionalComments: event.target.value }))}
        className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] outline-none focus:border-[#0f2744]"
      />

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#cda64d]/50 bg-white px-4 py-3 text-sm text-[#071426]">
        <input
          type="checkbox"
          required
          checked={form.confirmation}
          onChange={(event) => setForm((current) => ({ ...current, confirmation: event.target.checked }))}
          className="mt-1 h-4 w-4 accent-[#AFF546]"
        />
        <span>I confirm that this reference reflects my own professional experience with this person.</span>
      </label>

      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex min-h-[46px] w-full items-center justify-center rounded-full bg-[#0f2744] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] disabled:opacity-50"
      >
        {saving ? "Submitting..." : "Submit reference"}
      </button>
    </form>
  );
}
