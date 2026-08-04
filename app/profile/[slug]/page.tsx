import Link from "next/link";
import { ArrowUpRight, Award, BriefcaseBusiness, Compass, Layers3, Mail, Sparkles } from "lucide-react";
import FreeAgentCard from "@/components/cards/FreeAgentCard";
import SkillChip from "@/components/cards/SkillChip";
import { freeAgentProfiles } from "@/data/freeagents";

const profileDetails: Record<string, { story: string; qualifications: string[]; contactPoints: Array<{ label: string; value: string }> }> = {
  "maya-chen": {
    story:
      "I help ambitious teams shape product experiences that feel calm, intuitive and deeply considered. My work blends strategy, systems thinking and refined visual craft so products can scale with clarity rather than noise.",
    qualifications: [
      "Certified in product design systems strategy and UX leadership",
      "Trusted advisor for B2B and consumer products with a strong growth lens",
      "Known for bridging visual polish with clear product outcomes",
    ],
    contactPoints: [
      { label: "Email", value: "maya@freeagentstaff.com" },
      { label: "Location", value: "London, UK" },
      { label: "Availability", value: "Available Now" },
    ],
  },
};

export function generateStaticParams() {
  return freeAgentProfiles.map((profile) => ({ slug: profile.id }));
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = freeAgentProfiles.find((item) => item.id === slug);

  if (!profile) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] px-4 py-8 text-[#071426] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center rounded-[36px] border border-[#cda64d]/70 bg-[#0f2744] px-6 py-16 text-center shadow-[0_18px_55px_rgba(6,16,33,0.28)] sm:px-8 lg:px-12">
          <div className="inline-flex items-center rounded-full border border-[#f2cc63]/40 bg-[#f7ebcf]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Profile unavailable
          </div>
          <h1 className="mt-6 text-3xl font-black uppercase leading-tight tracking-[0.16em] text-[#f7ebcf] sm:text-4xl">
            Profile not found
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-[#dfe7ef]">
            The profile you are looking for does not exist yet. Return home and explore other FreeAgent profiles.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf] px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#f2cc63]"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  const details = profileDetails[profile.id] ?? profileDetails["maya-chen"];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] px-4 py-8 text-[#071426] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="overflow-hidden rounded-[36px] border border-[#cda64d]/70 bg-[#0f2744] p-4 shadow-[0_18px_55px_rgba(6,16,33,0.28)] sm:p-6 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f2cc63]/40 bg-[#f7ebcf]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                <Sparkles className="h-3.5 w-3.5" />
                Premium public profile
              </div>
              <h1 className="mt-5 text-3xl font-black uppercase leading-tight tracking-[0.16em] text-[#f7ebcf] sm:text-4xl lg:text-5xl">
                {profile.name}
              </h1>
              <p className="mt-3 text-lg font-semibold uppercase tracking-[0.24em] text-[#f2cc63]">
                {profile.title}
              </p>
              <p className="mt-3 text-base leading-8 text-[#dfe7ef] sm:text-lg">
                {profile.summary}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-3 py-2 text-sm font-semibold text-[#f7ebcf]">
                  {profile.availability}
                </div>
                <div className="rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-3 py-2 text-sm font-semibold text-[#f7ebcf]">
                  {profile.focusArea}
                </div>
                <div className="rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-3 py-2 text-sm font-semibold text-[#f7ebcf]">
                  {profile.experienceYears}+ years
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <FreeAgentCard profile={profile} className="w-full max-w-[430px]" />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#f7ebcf]/80 p-6 shadow-[0_12px_40px_rgba(6,16,33,0.12)] sm:p-8">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
              <Compass className="h-4 w-4" />
              My Story
            </div>
            <h2 className="mt-4 text-2xl font-black uppercase tracking-[0.16em] text-[#0f2744]">
              A calm, strategic operator with a premium eye for detail
            </h2>
            <p className="mt-4 text-base leading-8 text-[#27405f]">
              {details.story}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-[#cda64d]/40 bg-white/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Based in</p>
                <p className="mt-2 text-lg font-semibold text-[#0f2744]">{profile.location}</p>
              </div>
              <div className="rounded-[20px] border border-[#cda64d]/40 bg-white/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Top strength</p>
                <p className="mt-2 text-lg font-semibold text-[#0f2744]">{profile.topStrength}</p>
              </div>
              <div className="rounded-[20px] border border-[#cda64d]/40 bg-white/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Primary focus</p>
                <p className="mt-2 text-lg font-semibold text-[#0f2744]">{profile.focusArea}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#0f2744] p-6 text-[#f7ebcf] shadow-[0_12px_40px_rgba(6,16,33,0.2)] sm:p-8">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
              <BriefcaseBusiness className="h-4 w-4" />
              Career Journey
            </div>
            <div className="mt-5 space-y-4">
              {profile.careerJourney.map((position, index) => (
                <div key={position.id} className="rounded-[24px] border border-[#f2cc63]/25 bg-[#f7ebcf]/10 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                        {position.period || "Timeline entry"}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-[#f7ebcf]">
                        {position.role || "New role"}
                      </h3>
                      <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-[#f2cc63]">
                        {position.company || "Company"} · {position.location || "Location"}
                      </p>
                    </div>
                    <div className="rounded-full border border-[#f2cc63]/35 bg-[#0f2744] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf]">
                      {index + 1}
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[#dfe7ef]">
                    {position.description || "A thoughtfully written overview of the role and impact."}
                  </p>
                  {position.achievements.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f2cc63]">Achievements</p>
                      <ul className="mt-2 space-y-2 text-sm leading-7 text-[#dfe7ef]">
                        {position.achievements.map((achievement) => (
                          <li key={achievement} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f2cc63]" />
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {position.skills.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {position.skills.map((skill) => (
                        <span key={skill} className="rounded-full border border-[#f2cc63]/70 bg-[#0f2744] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#f7ebcf]/80 p-6 shadow-[0_12px_40px_rgba(6,16,33,0.12)] sm:p-8">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
              <Layers3 className="h-4 w-4" />
              Skills
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {profile.skills.map((skill) => (
                <SkillChip key={skill} label={skill} />
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#f7ebcf]/80 p-6 shadow-[0_12px_40px_rgba(6,16,33,0.12)] sm:p-8">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
              <Award className="h-4 w-4" />
              Qualifications
            </div>
            <div className="mt-5 space-y-3">
              {details.qualifications.map((item) => (
                <div key={item} className="rounded-[20px] border border-[#cda64d]/35 bg-white/70 p-4 text-sm leading-7 text-[#27405f]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#f7ebcf]/80 p-6 shadow-[0_12px_40px_rgba(6,16,33,0.12)] sm:p-8">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
              <Mail className="h-4 w-4" />
              Contact
            </div>
            <div className="mt-5 space-y-4">
              {details.contactPoints.map((item) => (
                <div key={item.label} className="rounded-[20px] border border-[#cda64d]/35 bg-white/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold text-[#0f2744]">{item.value}</p>
                </div>
              ))}
              <Link
                href={`mailto:${profile.email ?? "hello@freeagentstaff.com"}`}
                className="inline-flex items-center gap-2 rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
              >
                <Mail className="h-4 w-4" />
                Reach out
              </Link>
            </div>
          </div>

          <div className="rounded-[30px] border border-[#cda64d]/70 bg-[#0f2744] p-6 text-[#f7ebcf] shadow-[0_12px_40px_rgba(6,16,33,0.2)] sm:p-8">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
              <ArrowUpRight className="h-4 w-4" />
              Why work with me
            </div>
            <p className="mt-4 text-base leading-8 text-[#dfe7ef]">
              I bring calm leadership, sharp execution and a genuine premium feel to the work. The result is a profile that feels elevated, clear and easy to trust.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-3 py-2 text-sm font-semibold text-[#f7ebcf]">
                Premium presentation
              </div>
              <div className="rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-3 py-2 text-sm font-semibold text-[#f7ebcf]">
                Strategic execution
              </div>
              <div className="rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/10 px-3 py-2 text-sm font-semibold text-[#f7ebcf]">
                Trusted collaboration
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
