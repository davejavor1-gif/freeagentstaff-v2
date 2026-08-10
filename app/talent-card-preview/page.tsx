import TalentCard from "@/components/TalentCard";
import type { FreeAgentProfile } from "@/types/freeagent";

const mayaProfile: FreeAgentProfile = {
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
  location: "Sydney, Australia",
  availability: "Open to new projects",
  topStrength: "Known for calm delivery and exceptional stewardship in fast-moving environments.",
  experienceYears: 14,
  focusArea: "Operations",
  summary: "Senior operator bringing structure and confidence to complex venues.",
  skills: ["Venue Operations", "Team Leadership", "Stakeholder Care", "Client Delivery"],
  careerJourney: [
    { id: "7", role: "Operations Lead", company: "Confidential", period: "2017–Present", location: "Sydney", description: "", achievements: [], skills: [] },
  ],
  qualifications: ["Venue Safety Management"],
  visibility: "confidential",
};

const sampleProfiles: Array<FreeAgentProfile> = [
  {
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
  },
  {
    id: "alex",
    slug: "alex-chen",
    name: "Alex Chen",
    title: "Operations Strategist",
    location: "Melbourne, Australia",
    availability: "Available Now",
    topStrength: "Turns operational complexity into calm, repeatable delivery systems.",
    experienceYears: 12,
    focusArea: "Operations",
    summary: "Trusted operator for scaling teams and improving throughput.",
    skills: ["Operational Design", "Delivery", "Transformation", "Stakeholder Alignment"],
    careerJourney: [
      { id: "3", role: "Head of Operations", company: "Harbour Labs", period: "2020–Present", location: "Melbourne", description: "", achievements: [], skills: [] },
      { id: "4", role: "Senior Project Lead", company: "Northstar", period: "2016–2020", location: "Sydney", description: "", achievements: [], skills: [] },
    ],
    qualifications: ["Lean Six Sigma", "Certified PM"],
    photoUrl: "/FullLogo-clean-v2.png",
    imageAlt: "Alex Chen",
    visibility: "verified_employer_network",
  },
  {
    id: "sophia",
    slug: "sophia-kim",
    name: "Sophia Kim",
    title: "Brand Experience Director",
    location: "Brisbane, Australia",
    availability: "Busy this month",
    topStrength: "Brings a luxury feel to high-velocity brand launches and cultural moments.",
    experienceYears: 10,
    focusArea: "Brand",
    summary: "Creative operator with a strong record of global campaign delivery.",
    skills: ["Brand Strategy", "Campaign Leadership", "Creative Direction", "Partnerships"],
    careerJourney: [
      { id: "5", role: "Director of Brand Experience", company: "Studio North", period: "2021–Present", location: "Brisbane", description: "", achievements: [], skills: [] },
      { id: "6", role: "Senior Brand Strategist", company: "Monarch", period: "2017–2021", location: "Adelaide", description: "", achievements: [], skills: [] },
    ],
    qualifications: ["Brand Strategy Certification"],
    photoUrl: "/FullLogo-clean-v2.png",
    imageAlt: "Sophia Kim",
    visibility: "public",
  },
  {
    id: "confidential",
    slug: "confidential-profile",
    name: "Confidential Profile",
    title: "Venue Operations Leader",
    location: "Sydney, Australia",
    availability: "Open to new projects",
    topStrength: "Known for calm delivery and exceptional stewardship in fast-moving environments.",
    experienceYears: 14,
    focusArea: "Operations",
    summary: "Senior operator bringing structure and confidence to complex venues.",
    skills: ["Venue Operations", "Team Leadership", "Stakeholder Care", "Client Delivery"],
    careerJourney: [
      { id: "7", role: "Operations Lead", company: "Confidential", period: "2017–Present", location: "Sydney", description: "", achievements: [], skills: [] },
    ],
    qualifications: ["Venue Safety Management"],
    visibility: "confidential",
  },
];

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

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Maya front</p>
            <TalentCard profile={mayaProfile} href={`/talent/${mayaProfile.slug}`} verificationStatus="verified" className="max-w-[420px]" />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Maya back</p>
            <TalentCard profile={mayaProfile} href={`/talent/${mayaProfile.slug}`} verificationStatus="verified" initiallyFlipped className="max-w-[420px]" />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Confidential front</p>
            <TalentCard profile={confidentialProfile} href={`/talent/${confidentialProfile.slug}`} verificationStatus="verified" className="max-w-[420px]" />
          </div>
        </div>
      </section>
    </main>
  );
}
