import type { FreeAgentProfile } from "@/types/freeagent";

export const freeAgentProfiles: FreeAgentProfile[] = [
  {
    id: "maya-chen",
    name: "Maya Chen",
    title: "Senior Product Designer",
    location: "London, UK",
    availability: "Available Now",
    topStrength: "Design systems",
    experienceYears: 8,
    focusArea: "Product growth",
    summary:
      "Trusted by growth-stage teams for thoughtful product strategy and polished design execution.",
    skills: ["UI Design", "Design Systems", "Figma", "Strategy"],
    careerJourney: [
      {
        id: "journey-maya-1",
        role: "Lead Product Designer",
        company: "Northstar Labs",
        period: "2022 — Present",
        location: "London, UK",
        description:
          "Shaping high-clarity product experiences for ambitious teams across onboarding, platform, and growth initiatives.",
        achievements: ["Built a scalable design system for three product lines", "Led new-user onboarding redesign that increased activation", "Mentored design partners across product and growth"],
        skills: ["Design Systems", "Strategy", "Leadership"],
      },
      {
        id: "journey-maya-2",
        role: "Senior UX Designer",
        company: "Lumen Studio",
        period: "2018 — 2022",
        location: "Remote · London",
        description:
          "Delivered elegant, conversion-focused experiences for fintech and SaaS clients with an emphasis on clarity and trust.",
        achievements: ["Expanded portfolio into digital transformation work", "Designed premium marketing and product experiences", "Aligned stakeholders around thoughtful product journeys"],
        skills: ["UI Design", "Figma", "Research"],
      },
    ],
    email: "maya@freeagentstaff.com",
    imageAlt: "Portrait of Maya Chen",
  },
];
