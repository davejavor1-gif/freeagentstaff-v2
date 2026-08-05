import type { FreeAgentProfile } from "@/types/freeagent";
import SkillChip from "@/components/cards/SkillChip";

const isConfidential = (profile: FreeAgentProfile) => (profile.visibility ?? "public") === "confidential";

interface FreeAgentBackProps {
  profile: FreeAgentProfile;
}

export default function FreeAgentBack({ profile }: FreeAgentBackProps) {
  return (
    <div className="flex h-full w-full max-w-full flex-col justify-between overflow-hidden rounded-[28px] border border-amber-300/20 bg-[linear-gradient(135deg,_#0f172a_0%,_#111d33_45%,_#0b1326_100%)] p-5 text-white shadow-[0_18px_60px_rgba(4,12,25,0.45)] sm:p-6">
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">
          {isConfidential(profile) ? "Protected profile" : "About this specialist"}
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-300 break-words">
          {isConfidential(profile)
            ? "This professional has chosen a confidential visibility setting. Only a high-level Talent Passport is shared."
            : profile.summary}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Core skills
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <SkillChip key={skill} label={skill} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Contact
          </p>
          <p className="mt-2 text-sm text-slate-200 break-words">
            {isConfidential(profile) ? "Contact details are hidden in Confidential Mode" : profile.email ?? "Contact available via profile"}
          </p>
        </div>
      </div>
    </div>
  );
}
