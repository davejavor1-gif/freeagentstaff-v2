import TalentCard from "@/components/TalentCard";
import type { FreeAgentProfile } from "@/types/freeagent";

const normalProfile: FreeAgentProfile = {
  id: "maya",
  slug: "maya-rodriguez",
  name: "Maya Rodriguez",
  title: "Event Manager",
  location: "Sydney, Australia",
  availability: "Open to Opportunities",
  topStrength: "Creates elegant, high-pressure experiences that feel effortless and premium.",
  experienceYears: 8,
  focusArea: "Events",
  summary: "Specialist in premium event delivery and stakeholder management.",
  skills: ["Event Design", "Vendor Management", "Stakeholder Leadership", "Luxury Experience"],
  languages: ["English", "Spanish"],
  passions: ["Hospitality", "Travel", "Food & Wine"],
  careerJourney: [
    { id: "1", role: "Senior Events Lead", company: "Northstar Collective", period: "2022–Present", location: "Sydney", description: "", achievements: [], skills: [] },
    { id: "2", role: "Event Producer", company: "Lumen House", period: "2018–2022", location: "Melbourne", description: "", achievements: [], skills: [] },
  ],
  qualifications: ["Certified Event Professional", "First Aid Certificate"],
  photoUrl: "/maya-portrait.svg",
  imageAlt: "Maya Rodriguez",
  intro_video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  intro_video_thumbnail_url: "/maya-portrait.svg",
  visibility: "public",
};

const confidentialProfile: FreeAgentProfile = {
  id: "confidential",
  slug: "confidential-profile",
  name: "Confidential Profile",
  title: "Venue Operations Leader",
  location: "Location protected",
  availability: "Open to new projects",
  topStrength: "Known for calm delivery and exceptional stewardship in fast-moving environments.",
  experienceYears: 14,
  focusArea: "Operations",
  summary: "Senior operator bringing structure and confidence to complex venues.",
  skills: ["Venue Operations", "Team Leadership", "Stakeholder Care", "Client Delivery"],
  languages: ["English"],
  passions: ["Leadership", "Community Events"],
  careerJourney: [
    { id: "7", role: "Operations Lead", company: "Confidential", period: "2017–Present", location: "Sydney", description: "", achievements: [], skills: [] },
  ],
  qualifications: ["Venue Safety Management"],
  visibility: "confidential",
};

const notAvailableProfile: FreeAgentProfile = {
  ...normalProfile,
  id: "not-available",
  slug: "not-available",
  name: "Jordan Patel",
  title: "Guest Services Lead",
  availability: "Booked",
  opportunityStatus: "not_open",
  topStrength: "Delivers polished guest experiences while leading cross-functional teams calmly under pressure.",
  skills: ["Guest Experience", "Team Leadership", "Escalation Management", "Service Standards"],
};

const missingPhotoProfile: FreeAgentProfile = {
  ...normalProfile,
  id: "maya-missing-photo",
  slug: "maya-missing-photo",
  photoUrl: undefined,
  intro_video_url: undefined,
  intro_video_thumbnail_url: undefined,
};

const longContentProfile: FreeAgentProfile = {
  ...normalProfile,
  id: "long-content",
  slug: "long-content",
  name: "Ariana Delacroix Montgomery",
  title: "Senior Experiential Event and Partnership Strategy Lead",
  location: "Sydney and regional New South Wales",
  topStrength:
    "Builds composure and clarity inside high-pressure activations, aligning stakeholders and operations without losing quality.",
  skills: ["Event Design", "Vendor Management", "Stakeholder Leadership", "Luxury Experience", "Operations"],
};

export default function TalentCardPreviewPage() {
  return (
    <main className="min-h-screen bg-[#f9f2de] px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#9a6d15]">Discover talent</p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.16em] text-[#0f2744] sm:text-4xl">
            Discover talent
          </h1>
          <p className="mt-3 text-base leading-8 text-[#27405f]">
            Meet people for what they can do, not just what fits on a resume.
          </p>
        </div>

        <div className="mb-10">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Availability comparison</p>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">A. Available talent</p>
              <TalentCard profile={normalProfile} href={`/talent/${normalProfile.slug}`} verificationStatus="verified" className="max-w-[420px]" />
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">B. Not available talent</p>
              <TalentCard profile={notAvailableProfile} href={`/talent/${notAvailableProfile.slug}`} verificationStatus="verified" className="max-w-[420px]" />
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">C. Confidential talent</p>
            <TalentCard profile={confidentialProfile} href={`/talent/${confidentialProfile.slug}`} verificationStatus="verified" className="max-w-[420px]" />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">D. Saved talent</p>
            <TalentCard
              profile={normalProfile}
              href={`/talent/${normalProfile.slug}`}
              verificationStatus="verified"
              className="max-w-[420px]"
              showSaveAction
              initiallySaved
            />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Missing photo</p>
            <TalentCard profile={missingPhotoProfile} href={`/talent/${missingPhotoProfile.slug}`} verificationStatus="verified" className="max-w-[420px]" />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Long content</p>
            <TalentCard profile={longContentProfile} href={`/talent/${longContentProfile.slug}`} verificationStatus="verified" className="max-w-[420px]" />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Back side</p>
            <TalentCard profile={normalProfile} href={`/talent/${normalProfile.slug}`} verificationStatus="verified" initiallyFlipped className="max-w-[420px]" />
          </div>
        </div>
      </section>
    </main>
  );
}
