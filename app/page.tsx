import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { IdCard, Lock, ShieldCheck, Search, Eye, ArrowRight } from "lucide-react";
import TalentCard from "@/components/TalentCard";
import type { FreeAgentProfile } from "@/types/freeagent";
import { homepagePassportProfiles } from "@/data/homepage-passports";

const siteUrl = "https://freeagentstaff.com/";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

const homepageStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Free Agent Staff",
      url: siteUrl,
      logo: `${siteUrl}FullLogo-clean-v2.png`,
    },
    {
      "@type": "WebSite",
      name: "Free Agent Staff",
      url: siteUrl,
    },
  ],
};

const featureCards = [
  {
    title: "Talent Card",
    description:
      "Showcase your skills, experience and achievements in one powerful profile.",
    icon: IdCard,
    tone: "lime" as const,
    href: "/builder",
  },
  {
    title: "Confidential Mode",
    description:
      "Explore opportunities privately. You control who sees what and when.",
    icon: Lock,
    tone: "cyan" as const,
    href: "/settings/privacy",
  },
  {
    title: "Verified Employers",
    description:
      "Connect with trusted employers who are verified for your peace of mind.",
    icon: ShieldCheck,
    tone: "lime" as const,
    href: "/find-talent",
  },
];

const howItWorksSteps = [
  {
    number: "01",
    title: "Create your Talent Card",
    description:
      "Build a professional, visual profile that showcases your skills, experience and achievements beyond a traditional CV.",
    tone: "lime" as const,
  },
  {
    number: "02",
    title: "Control your visibility",
    description:
      "Choose what employers can see and when. Explore opportunities openly or privately, on your terms.",
    tone: "cyan" as const,
  },
  {
    number: "03",
    title: "Get discovered",
    description:
      "Verified employers can discover talent based on skills and experience, creating opportunities without relying solely on job applications.",
    tone: "lime" as const,
  },
];

const employerDiscoveryFilters = ["Sydney", "Leadership", "Available now"];

const employerDiscoveryResults = [
  {
    name: "Sarah Gonzales",
    initials: "SJ",
    role: "Senior Software Engineer",
    location: "Sydney, Australia",
    skills: ["React", "TypeScript", "Product Delivery", "Systems Thinking"],
    availability: "Open to Opportunities",
    topStrength:
      "Turns complex product challenges into calm, reliable delivery.",
    focusArea: "Technology",
    introVideoUrl: "/videos/sarahs%20intro.mp4",
    company: "Northstar Labs",
    period: "2021-Present",
    qualification: "Bachelor of Computer Science",
    photoUrl: "/images/sarah-photo.jpeg",
    tone: "lime" as const,
  },
  {
    name: "Daniel Brooks",
    initials: "DB",
    role: "Operations Director",
    location: "Melbourne, Australia",
    skills: [
      "Operations Strategy",
      "Team Leadership",
      "Service Delivery",
      "Stakeholder Management",
    ],
    availability: "Open to Opportunities",
    topStrength:
      "Builds calm, repeatable operations that help ambitious teams deliver at their best.",
    focusArea: "Operations",
    introVideoUrl: "/videos/daniel-intro.mp4",
    company: "Harbour Works",
    period: "2020–Present",
    qualification: "Certified Operations Professional",
    photoUrl: "/images/daniel-photo.jpeg",
    tone: "cyan" as const,
  },
  {
    name: "James Cole",
    initials: "JC",
    role: "Bartender",
    location: "Newcastle, Australia",
    skills: [
      "Cocktail Making",
      "Customer Service",
      "Bar Operations",
      "Stock Control",
    ],
    availability: "Available Now",
    topStrength:
      "Creates polished, high-volume service experiences with calm, precise execution.",
    focusArea: "Guest Experience",
    photoUrl: "/images/james-cole-photo.jpg",
    tone: "lime" as const,
  },
];

const visibilityStates = [
  {
    key: "open" as const,
    title: "Open to opportunities",
    description: "Ready to be discovered and open to conversations.",
    icon: Eye,
    accent: "#AFF546",
  },
  {
    key: "exploring" as const,
    title: "Exploring",
    description: "Open to selective conversations for the right opportunity.",
    icon: Search,
    accent: "#2BD7EF",
  },
  {
    key: "confidential" as const,
    title: "Confidential",
    description: "Be discovered without revealing your identity.",
    icon: Lock,
    accent: "#AFF546",
  },
];

const confidentialHiddenFields = ["Name", "Photo", "Contact details", "Current employer"];

const homepageDemoProfile: FreeAgentProfile = {
  ...homepagePassportProfiles["sarah-jones"],
  intro_video_url: "/videos/sarahs%20intro.mp4",
};

const homepageLowerDemoProfile: FreeAgentProfile = {
  ...homepagePassportProfiles["daniel-brooks"],
  intro_video_url: "/videos/daniel-intro.mp4",
};

function TalentCardDemo() {
  return (
    <TalentCard
      profile={homepageDemoProfile}
      href="/profile/sarah-jones"
      verificationStatus="verified"
      hasProAccess
      className="max-w-[430px]"
    />
  );
}

function EmployerDiscoveryResult({
  result,
}: {
  result: (typeof employerDiscoveryResults)[number];
}) {
  const fixture = Object.values(homepagePassportProfiles).find(
    (candidate) => candidate.name === result.name,
  );
  const profile: FreeAgentProfile = fixture
    ? { ...fixture, intro_video_url: result.introVideoUrl }
    : {
    id: `homepage-search-${result.name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    slug: `homepage-search-${result.name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    visibility: "public",
    name: result.name,
    title: result.role,
    location: result.location,
    availability:
      result.availability === "Booked"
        ? "Booked"
        : result.availability === "Available Now"
          ? "Available Now"
          : "Open to Opportunities",
    topStrength:
      result.topStrength ??
      `A fictional professional with a strong record in ${result.skills[0].toLowerCase()} and dependable delivery.`,
    experienceYears: 8,
    focusArea: result.focusArea ?? result.role,
    summary:
      "A fictional profile shown in the homepage employer-search demonstration.",
    skills: result.skills,
    languages: [],
    passions: [],
    photoUrl: result.photoUrl,
    imageAlt: "Fictional professional portrait",
    intro_video_url: result.introVideoUrl,
    careerJourney: [
      {
        id: "homepage-search-role",
        role: result.role,
        company: result.company ?? "FreeAgent Demo Collective",
        period: result.period ?? "2021–Present",
        location: result.location,
        description: "",
        achievements: [],
        skills: result.skills,
      },
    ],
    qualifications: [
      result.qualification ?? "Professional industry certification",
    ],
    };

  return (
    <div className="h-[330px] w-[236px] shrink-0">
      <div className="h-[330px] w-[236px] origin-top-left">
        <div className="origin-top-left scale-[0.62]">
          <TalentCard
            profile={profile}
            href={profile.slug === "sarah-jones" ? "/talent/sarah-jones" : `/profile/${profile.slug ?? ""}`}
            verificationStatus="verified"
            hasProAccess={result.name === "Sarah Gonzales" || result.name === "Daniel Brooks"}
            className="w-[380px] max-w-none"
          />
        </div>
      </div>
    </div>
  );
}

function EmployerDiscoveryPanel() {
  return (
    <div className="relative mx-auto w-full max-w-6xl min-w-0 lg:rotate-[-1.5deg]">
      <div className="pointer-events-none absolute -left-8 top-12 h-20 w-20 rounded-full border border-[#2bd7ef]/18" />
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full border border-[#aff546]/18" />

      <div className="rounded-[30px] border border-[#f7e8c6]/12 bg-[linear-gradient(180deg,rgba(247,232,198,0.08),rgba(247,232,198,0.03))] p-2.5 sm:p-3">
        <div className="rounded-[26px] border border-[#071321]/12 bg-[linear-gradient(180deg,rgba(247,232,198,0.96),rgba(243,224,186,0.98))] p-4 text-[#071321] sm:p-5">
          <div className="flex flex-col gap-3 border-b border-[#071321]/10 pb-4 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#1bc8e4]">
                Discover Talent
              </p>
              <p className="mt-2 max-w-[22rem] font-serif text-[1.22rem] leading-tight text-[#071321] sm:text-[1.55rem]">
                Search beyond job applications.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#9be645]/50 bg-[#aff546]/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#071321]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#7fcf2e]" />
              Verified Employer
            </div>
          </div>

          <div className="mt-4 rounded-[18px] border border-[#071321]/10 bg-[#f7e8c6]/85 px-3.5 py-3.5 sm:px-4">
            <div className="flex items-center gap-3 text-[#071321]/54">
              <Search className="h-4 w-4 shrink-0 text-[#1bc8e4]" />
              <span className="text-[0.88rem] leading-5 sm:text-[0.96rem]">
                Search by role, skill or experience...
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {employerDiscoveryFilters.map((filter, index) => {
              const accentClass =
                index % 2 === 0
                  ? "border-[#9be645]/44 bg-[#aff546]/12 text-[#071321]"
                  : "border-[#2bd7ef]/44 bg-[#2bd7ef]/12 text-[#071321]";

              return (
                <span
                  key={filter}
                  className={`rounded-full border px-3 py-1.5 text-[0.72rem] font-medium leading-none sm:text-[0.78rem] ${accentClass}`}
                >
                  {filter}
                </span>
              );
            })}
          </div>

          <div className="mt-5 flex min-w-0 w-full max-w-full gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {employerDiscoveryResults.map((result) => (
              <EmployerDiscoveryResult key={result.name} result={result} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VisibilityControlPanel() {
  return (
    <div className="relative mx-auto w-full max-w-[44rem]">
      <div className="pointer-events-none absolute -left-6 -top-6 h-16 w-16 rounded-full border border-[#2bd7ef]/22" />
      <div className="pointer-events-none absolute -right-8 bottom-8 h-20 w-20 rounded-full border border-[#aff546]/26" />

      <div className="rounded-[30px] border border-[#f7e8c6]/12 bg-[#08111F] p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {visibilityStates.map((state) => {
            const isSelected = state.key === "confidential";
            const Icon = state.icon;

            return (
              <div
                key={state.key}
                className={`rounded-[18px] border bg-[#f7e8c6] px-3.5 py-3.5 text-left ${
                  isSelected ? "border-2 border-[#aff546]" : "border-[#071321]/10"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4" style={{ color: state.accent }} />
                  {isSelected ? (
                    <span className="inline-flex items-center rounded-full bg-[#aff546] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#071321]">
                      Selected
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#071321]">
                  {state.title}
                </p>
                <p className="mt-1.5 text-[0.76rem] leading-5 text-[#071321]/78">
                  {state.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded-[22px] border border-[#071321]/10 bg-[#f7e8c6] px-4 py-4 sm:px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#071321]">
            Confidential Mode
          </p>
          <p className="mt-2 text-[0.82rem] leading-6 text-[#071321]/78">
            Employers can discover your Talent Card while your identity stays
            protected.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {confidentialHiddenFields.map((field) => (
              <span
                key={field}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#f7e8c6]/12 bg-[#08111F] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#f7e8c6]"
              >
                <Lock className="h-2.5 w-2.5 text-[#f7e8c6]" />
                {field}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#071321]">
            <span>Discovered anonymously</span>
            <ArrowRight className="h-3 w-3 text-[#2bd7ef]" />
            <span>Connection</span>
            <ArrowRight className="h-3 w-3 text-[#2bd7ef]" />
            <span className="text-[#7fcf2e]">Identity revealed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinalConversionSection() {
  return (
    <section className="relative overflow-hidden border-t border-[#2bd7ef]/12 bg-[#0B111D] text-[#f7e8c6]">
      <div className="pointer-events-none absolute left-[-3rem] top-12 h-36 w-36 rounded-full border border-[#2bd7ef]/18" />
      <div className="pointer-events-none absolute bottom-16 right-[-3rem] h-44 w-44 rounded-full border border-[#aff546]/16" />
      <div className="pointer-events-none absolute left-[54%] top-24 hidden h-24 w-24 rounded-full border border-[#f7e8c6]/12 lg:block" />

      <div className="relative mx-auto max-w-7xl px-6 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#2bd7ef]">
            Your Next Move
          </p>
          <h2 className="mt-3 max-w-[11.5ch] font-serif text-[clamp(2.2rem,4.5vw,3.4rem)] font-semibold uppercase leading-[0.95] text-[#f7e8c6] sm:max-w-[13ch] sm:text-[3rem] lg:text-[3.5rem]">
            READY TO DO
            <span className="block">CAREERS DIFFERENTLY?</span>
          </h2>
          <p className="mt-4 max-w-2xl text-[1rem] leading-7 text-[#f7e8c6]/84 sm:text-[1.05rem] sm:leading-8">
            Whether you&apos;re ready for your next opportunity or looking for
            the person who can make a difference, start here.
          </p>
        </div>

        <div className="mt-6 grid gap-5 sm:mt-8 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-0 xl:gap-4">
          <div className="relative lg:pr-8 xl:pr-12">
            <div className="pointer-events-none absolute right-[-0.25rem] top-0 hidden h-full w-px bg-gradient-to-b from-[#2bd7ef]/25 via-[#f7e8c6]/15 to-transparent lg:block" />
            <p className="font-serif text-[3.2rem] leading-none text-[#aff546] sm:text-[4rem]">
              01
            </p>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#aff546]">
              FOR TALENT
            </p>
            <h3 className="mt-3 max-w-[12ch] font-serif text-[1.95rem] leading-[0.95] text-[#f7e8c6] sm:text-[2.28rem] lg:text-[2.4rem] xl:text-[2.5rem]">
              BE SEEN FOR
              <span className="block">WHAT YOU CAN DO.</span>
            </h3>
            <p className="mt-4 max-w-[28rem] text-[0.96rem] leading-7 text-[#f7e8c6]/82 sm:text-[1rem]">
              Create a Talent Card that brings your skills, experience and
              potential together in one place.
            </p>
            <Link
              href="/builder"
              className="mt-6 inline-flex items-center rounded-full bg-[#aff546] px-5 py-2.75 text-[0.86rem] font-semibold text-[#071321] transition duration-300 hover:-translate-y-0.5 hover:bg-[#9fea37] max-[359px]:w-full sm:px-6 sm:py-3 sm:text-sm"
            >
              Create your Talent Card
              <span className="ml-2">→</span>
            </Link>
          </div>

          <div className="relative border-t border-[#f7e8c6]/12 pt-7 sm:pt-8 lg:border-t-0 lg:pl-8 lg:pt-0 xl:pl-12">
            <p className="font-serif text-[3.2rem] leading-none text-[#2bd7ef] sm:text-[4rem]">
              02
            </p>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#2bd7ef]">
              FOR EMPLOYERS
            </p>
            <h3 className="mt-3 max-w-[12ch] font-serif text-[1.95rem] leading-[0.95] text-[#f7e8c6] sm:text-[2.28rem] lg:text-[2.4rem] xl:text-[2.5rem]">
              FIND PEOPLE
              <span className="block">WORTH FINDING.</span>
            </h3>
            <p className="mt-4 max-w-[28rem] text-[0.96rem] leading-7 text-[#f7e8c6]/82 sm:text-[1rem]">
              Discover people based on their skills and experience, not simply
              who happened to apply.
            </p>
            <Link
              href="/find-talent"
              className="mt-6 inline-flex items-center rounded-full border border-[#2bd7ef]/70 bg-transparent px-5 py-2.75 text-[0.86rem] font-semibold text-[#f7e8c6] transition duration-300 hover:-translate-y-0.5 hover:bg-[#2bd7ef]/12 max-[359px]:w-full sm:px-6 sm:py-3 sm:text-sm"
            >
              Find talent
              <span className="ml-2 text-[#2bd7ef]">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeFooter() {
  return <Footer />;
}

export default function Home() {
  return (
    <main className="bg-[#0B111D] text-[#f7e8c6]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageStructuredData) }}
      />
      <Navbar />

      <section className="relative isolate mb-8 overflow-hidden border-b border-[#2bd7ef]/12 max-sm:mb-5">
        <div className="absolute inset-0 bg-[#0B111D]" />

        <div className="nav-fade relative mx-auto grid max-w-7xl items-center gap-10 px-6 pb-10 pt-8 max-sm:gap-1 max-sm:px-4 max-sm:pb-0 max-sm:pt-1 sm:px-8 lg:min-h-[calc(100vh-80px)] lg:grid-cols-[44fr_56fr] lg:px-12 lg:py-6">
          <div className="max-w-xl">
            <Image
              src="/FullLogo-clean-v2.png"
              alt="FreeAgent Staff"
              width={960}
              height={768}
              className="h-auto w-[220px] object-contain max-sm:w-[162px] sm:w-[280px] lg:w-[330px]"
              priority
            />

            <h1 className="mt-3 font-serif text-[clamp(4rem,6vw,6.5rem)] font-semibold uppercase leading-[0.9] tracking-[0.01em] text-[#f7e8c6] max-sm:mt-0.5 max-sm:text-[clamp(2.5rem,12vw,3.22rem)] max-sm:leading-[0.92]">
              <span className="block">YOUR CAREER</span>
              <span className="block">DESERVES</span>
              <span className="block">BETTER</span>
              <span className="block">THAN A PDF.</span>
            </h1>

            <p className="mt-5 max-w-lg text-[1.1rem] leading-8 text-[#f7e8c6]/88 max-sm:mt-1 max-sm:text-[0.98rem] max-sm:leading-6">
              Create a Talent Card that showcases your skills, experience and
              value, and get discovered by verified employers, on your terms.
            </p>

            <div className="mt-7 flex flex-row gap-2.5 max-[359px]:flex-col sm:flex-row sm:gap-3 max-sm:mt-2">
              <Link
                href="/builder"
                className="inline-flex items-center justify-center rounded-full bg-[#aff546] px-4 py-2.5 text-[0.78rem] font-semibold text-[#071321] transition duration-300 hover:-translate-y-0.5 hover:bg-[#9fea37] max-[359px]:w-full sm:px-7 sm:py-3 sm:text-sm"
              >
                Create your Talent Card
              </Link>
              <Link
                href="/find-talent"
                className="inline-flex items-center justify-center rounded-full border border-[#2bd7ef]/70 bg-transparent px-4 py-2.5 text-[0.78rem] font-semibold text-[#dff9ff] transition duration-300 hover:-translate-y-0.5 hover:bg-[#2bd7ef]/16 max-[359px]:w-full sm:px-7 sm:py-3 sm:text-sm"
              >
                Find talent
              </Link>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-[470px] items-center justify-center max-sm:mt-0 max-sm:mb-0 lg:max-w-[560px]">
            <TalentCardDemo />
          </div>
        </div>
      </section>

      <section className="bg-[#f7e8c6] text-[#071426]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-11 max-sm:gap-0 max-sm:py-3 sm:px-8 lg:grid-cols-3 lg:gap-0 lg:px-12">
          {featureCards.map((feature, index) => {
            const Icon = feature.icon;
            const iconClass =
              feature.tone === "lime"
                ? "text-[#8fdc3a] border-[#9be645]/50"
                : "text-[#2bd7ef] border-[#2bd7ef]/50";
            const linkClass =
              feature.tone === "lime" ? "text-[#84d735]" : "text-[#1fcce7]";

            return (
              <article
                key={feature.title}
                className={`px-0 max-sm:py-3 lg:px-10 ${
                  index < featureCards.length - 1
                    ? "max-sm:border-b max-sm:border-[#0d233c]/18 lg:border-r lg:border-[#0d233c]/18"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3.5 sm:block">
                  <div
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border sm:h-16 sm:w-16 ${iconClass}`}
                  >
                    <Icon className="h-4.5 w-4.5 sm:h-7 sm:w-7" />
                  </div>
                  <div className="min-w-0 flex-1 sm:mt-5 sm:block">
                    <h3 className="mt-0 font-serif text-[1.75rem] font-semibold leading-tight text-[#071321] sm:text-4xl">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-[0.98rem] leading-6 text-[#071321]/86 sm:mt-3 sm:text-lg sm:leading-8">
                      {feature.description}
                    </p>
                    {feature.href ? (
                      <Link
                        href={feature.href}
                        className={`mt-2 inline-flex items-center text-[0.98rem] font-medium transition hover:translate-x-0.5 sm:mt-5 sm:text-lg ${linkClass}`}
                      >
                        Learn more
                        <span className="ml-2">→</span>
                      </Link>
                    ) : (
                      <span
                        className={`mt-2 inline-flex items-center text-[0.98rem] font-medium sm:mt-5 sm:text-lg ${linkClass} opacity-70`}
                      >
                        Learn more
                        <span className="ml-2">→</span>
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0B111D] text-[#f7e8c6]">
        <div className="pointer-events-none absolute -left-20 top-16 h-48 w-48 rounded-full border border-[#2bd7ef]/18" />
        <div className="pointer-events-none absolute -right-24 bottom-20 h-56 w-56 rounded-full border border-[#aff546]/14" />

        <div className="relative mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-12 lg:py-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2bd7ef]">
            How it works
          </p>
          <h2 className="mt-3 max-w-4xl font-serif text-[2.125rem] font-semibold uppercase leading-[0.95] text-[#f7e8c6] sm:text-[2.9rem] lg:text-[3.02rem]">
            HOW FREE AGENT STAFF WORKS
          </h2>

          <div className="relative mt-7 hidden lg:block">
            <span className="pointer-events-none absolute left-0 right-0 top-[89px] h-px bg-gradient-to-r from-[#2bd7ef]/22 via-[#aff546]/40 to-[#2bd7ef]/22" />
            <span className="pointer-events-none absolute left-1/3 top-[84px] h-[11px] w-[11px] -translate-x-1/2 rounded-full border border-[#2bd7ef]/42 bg-[#0B111D]" />
            <span className="pointer-events-none absolute left-2/3 top-[84px] h-[11px] w-[11px] -translate-x-1/2 rounded-full border border-[#aff546]/46 bg-[#0B111D]" />
            <div className="grid grid-cols-3 gap-12">
              {howItWorksSteps.map((step) => {
                const stepTone =
                  step.tone === "lime" ? "text-[#aff546]" : "text-[#2bd7ef]";

                return (
                  <article key={step.number} className="relative min-w-0">
                    <p
                      className={`h-[5.25rem] font-serif text-[5rem] leading-none ${stepTone}`}
                    >
                      {step.number}
                    </p>
                    <h3 className="mt-3 min-h-[7rem] max-w-[18.5rem] font-serif text-[2.2rem] leading-[1.04] text-[#f7e8c6]">
                      {step.title}
                    </h3>
                    <p className="mt-8 max-w-[19rem] text-[1.11rem] leading-8 text-[#f7e8c6]/84">
                      {step.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="relative mt-9 lg:hidden">
            <span className="pointer-events-none absolute left-[26px] top-6 bottom-10 w-px bg-gradient-to-b from-[#2bd7ef]/38 via-[#aff546]/45 to-[#2bd7ef]/25" />
            <div className="space-y-9">
              {howItWorksSteps.map((step, index) => {
                const stepTone =
                  step.tone === "lime" ? "text-[#aff546]" : "text-[#2bd7ef]";

                return (
                  <article
                    key={step.number}
                    className="relative grid grid-cols-[52px_1fr] gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <p
                        className={`font-serif text-[2.4rem] leading-none ${stepTone}`}
                      >
                        {step.number}
                      </p>
                      {index < howItWorksSteps.length - 1 ? (
                        <span className="mt-2 text-sm text-[#f7e8c6]/55">
                          ↓
                        </span>
                      ) : null}
                    </div>
                    <div className="pr-1">
                      <h3 className="font-serif text-[1.6rem] leading-tight text-[#f7e8c6]">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-[0.98rem] leading-6 text-[#f7e8c6]/84">
                        {step.description}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f7e8c6] text-[#071321]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(7,19,33,0.06),transparent)]" />
        <div className="pointer-events-none absolute -left-16 top-12 h-44 w-44 rounded-full border border-[#071321]/8" />
        <div className="pointer-events-none absolute right-[-3.5rem] top-20 h-52 w-52 rounded-full border border-[#2bd7ef]/24" />
        <div className="pointer-events-none absolute bottom-10 left-[42%] h-36 w-36 rounded-full border border-[#aff546]/28" />

        <div className="relative mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-9 xl:gap-12">
            <div className="max-w-[43rem]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#1bc8e4]">
                Be more than a CV
              </p>
              <h2 className="mt-3 max-w-[14.75ch] font-serif text-[2.5rem] font-semibold uppercase leading-[0.92] text-[#071321] max-sm:max-w-[13.8ch] max-sm:text-[1.82rem] max-sm:leading-[0.95] max-[360px]:text-[1.72rem] sm:mt-4 sm:text-[3.25rem] lg:text-[2.78rem] xl:text-[3.16rem]">
                <span className="inline sm:block">RESUMES LOOK THE SAME.</span>{" "}
                <span className="inline sm:block">PEOPLE DON&apos;T.</span>
              </h2>
              <p className="mt-4 max-w-lg text-[1rem] leading-7 text-[#071321]/78 sm:mt-5 sm:text-[1.08rem] sm:leading-8">
                Your experience is more than a list of job titles. Free Agent
                Staff gives you a place to show employers what you can do, what
                you&apos;ve achieved and what makes you different.
              </p>
              <Link
                href="/builder"
                className="mt-5 inline-flex items-center text-[1rem] font-medium text-[#071321] transition hover:translate-x-0.5 sm:mt-7 sm:text-lg"
              >
                Create your Talent Card
                <span className="ml-2 text-[#1bc8e4]">→</span>
              </Link>
            </div>

            <div className="relative flex min-w-0 justify-center lg:justify-start">
              <TalentCard
                profile={homepageLowerDemoProfile}
                href="/profile/daniel-brooks"
                verificationStatus="verified"
                hasProAccess
                className="max-w-[420px]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0B111D] text-[#f7e8c6]">
        <div className="pointer-events-none absolute left-[-4.5rem] top-14 h-44 w-44 rounded-full border border-[#2bd7ef]/16" />
        <div className="pointer-events-none absolute right-[-5rem] bottom-16 h-52 w-52 rounded-full border border-[#aff546]/14" />
        <div className="pointer-events-none absolute left-[46%] top-24 hidden h-28 w-28 rounded-full border border-[#f7e8c6]/8 lg:block" />

        <div className="relative mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] lg:gap-10 xl:gap-12">
            <div className="max-w-[35rem]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2bd7ef]">
                Looking for talent?
              </p>
              <h2 className="mt-3 max-w-[11.8ch] font-serif text-[2.55rem] font-semibold uppercase leading-[0.92] text-[#f7e8c6] max-sm:max-w-[12.8ch] max-sm:text-[1.86rem] max-sm:leading-[0.95] sm:mt-4 sm:text-[3.05rem] lg:text-[3.35rem] xl:text-[3.65rem]">
                <span className="block">YOUR NEXT GREAT HIRE</span>
                <span className="block">ISN&apos;T ALWAYS</span>
                <span className="block">LOOKING FOR YOU.</span>
              </h2>
              <p className="mt-5 max-w-xl text-[1rem] leading-7 text-[#f7e8c6]/84 sm:text-[1.08rem] sm:leading-8">
                The right person might not be applying for jobs. Free Agent
                Staff helps verified employers discover people based on their
                skills, experience and potential and connect when the
                opportunity is right.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 max-[359px]:flex-col sm:mt-8">
                <Link
                  href="/find-talent"
                  className="inline-flex items-center justify-center rounded-full bg-[#aff546] px-5 py-2.5 text-[0.84rem] font-semibold text-[#071321] transition duration-300 hover:-translate-y-0.5 hover:bg-[#9fea37] max-[359px]:w-full sm:px-6 sm:py-3 sm:text-sm"
                >
                  Find talent
                  <span className="ml-2">→</span>
                </Link>
                <Link
                  href="/employer/auth"
                  className="inline-flex items-center justify-center rounded-full border border-[#2bd7ef]/60 bg-transparent px-5 py-2.5 text-[0.84rem] font-semibold text-[#f7e8c6] transition duration-300 hover:-translate-y-0.5 hover:bg-[#2bd7ef]/10 max-[359px]:w-full sm:px-6 sm:py-3 sm:text-sm"
                >
                  For employers
                  <span className="ml-2 text-[#2bd7ef]">→</span>
                </Link>
              </div>
            </div>

            <EmployerDiscoveryPanel />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f7e8c6] text-[#071321]">
        <div className="pointer-events-none absolute -left-16 top-20 h-44 w-44 rounded-full border border-[#2bd7ef]/20" />
        <div className="pointer-events-none absolute right-[-4rem] bottom-16 h-52 w-52 rounded-full border border-[#aff546]/24" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-12">
            <div className="max-w-[38rem]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#1bc8e4]">
                Your career. Your terms.
              </p>
              <h2 className="mt-4 max-w-[12.5ch] font-serif text-[2.52rem] font-semibold uppercase leading-[0.92] text-[#071321] max-sm:max-w-[13ch] max-sm:text-[1.95rem] max-sm:leading-[0.95] sm:text-[3.06rem] lg:text-[3.3rem]">
                <span className="block">VISIBLE WHEN YOU WANT TO BE.</span>
                <span className="block">INVISIBLE WHEN YOU DON&apos;T.</span>
              </h2>
              <p className="mt-5 max-w-xl text-[1rem] leading-7 text-[#071321]/78 sm:text-[1.08rem] sm:leading-8">
                Explore what&apos;s out there without announcing it to the
                world. You control your visibility, what employers can see and
                when you&apos;re ready to be discovered.
              </p>
            </div>

            <VisibilityControlPanel />
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:mt-9 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-[#071321]/12 bg-[#f7e8c6] px-3.5 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#071321]">
              <Lock className="h-3.5 w-3.5 text-[#1bc8e4]" />
              You&apos;re always in control.
            </p>

            <Link
              href="/settings/privacy"
              className="inline-flex items-center text-[0.98rem] font-medium text-[#071321] transition hover:translate-x-0.5 sm:text-[1.05rem]"
            >
              Explore Privacy & Visibility
              <span className="ml-2 text-[#1bc8e4]">→</span>
            </Link>
          </div>
        </div>
      </section>

      <FinalConversionSection />
      <HomeFooter />
    </main>
  );
}
