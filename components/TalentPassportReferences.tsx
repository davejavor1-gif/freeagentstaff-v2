import type { PassportTalentReference, TalentReferenceAnswers } from "@/types/talent-references";

function wouldWorkAgainLabel(value: TalentReferenceAnswers["wouldWorkAgain"]) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return "Prefer not to say";
}

function roleLine(reference: PassportTalentReference) {
  return [reference.jobTitle, reference.company].filter(Boolean).join(" · ");
}

function AnswerBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a6d15]">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#0f2744]">{value}</dd>
    </div>
  );
}

export default function TalentPassportReferences({
  references,
  viewer,
}: {
  references: PassportTalentReference[];
  viewer: "owner" | "employer" | null;
}) {
  return (
    <div className="mt-4 rounded-[20px] border border-[#cda64d]/35 bg-[#fffaf0] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">References</p>
      {references.length === 0 ? (
        <p className="mt-2 text-sm text-[#27405f]">No references available.</p>
      ) : (
        <div className="mt-4 space-y-5">
          {references.map((reference, index) => {
            const subtitle = roleLine(reference);
            return (
              <article
                key={`${reference.refereeName}-${index}`}
                className={index > 0 ? "border-t border-[#cda64d]/25 pt-5" : undefined}
              >
                <p className="font-semibold text-[#0f2744]">{reference.refereeName}</p>
                {subtitle ? <p className="mt-0.5 text-sm text-[#27405f]">{subtitle}</p> : null}
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4C8C15]">
                  Referee submitted
                </p>
                {reference.answers ? (
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    <AnswerBlock
                      label="Professional relationship"
                      value={reference.answers.professionalRelationship}
                    />
                    <AnswerBlock label="Worked together" value={reference.answers.workedTogetherDuration} />
                    <div className="sm:col-span-2">
                      <AnswerBlock label="Key strengths" value={reference.answers.keyStrengths} />
                    </div>
                    <AnswerBlock label="Reliability" value={`${reference.answers.reliabilityRating} / 5`} />
                    <AnswerBlock label="Working with others" value={`${reference.answers.teamworkRating} / 5`} />
                    <AnswerBlock
                      label="Would work with them again"
                      value={wouldWorkAgainLabel(reference.answers.wouldWorkAgain)}
                    />
                    {reference.answers.additionalComments ? (
                      <div className="sm:col-span-2">
                        <AnswerBlock label="Additional comments" value={reference.answers.additionalComments} />
                      </div>
                    ) : null}
                  </dl>
                ) : null}
                {viewer === "owner" ? (
                  <p className="mt-3 text-sm text-[#27405f]">
                    {reference.shareWithConnectedEmployers
                      ? "Shared with connected Employers"
                      : "Private — not shared with connected Employers"}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
