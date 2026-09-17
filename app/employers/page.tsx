import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Bookmark, Building2, Clock, Search, Send, ShieldCheck, UserRound } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TalentCard from "@/components/TalentCard";
import { homepagePassportProfiles } from "@/data/homepage-passports";

export const metadata: Metadata = {
  title: "For Employers",
  description:
    "Discover professionals open to opportunity through Free Agent Staff FreeAgent Cards, Talent Passports and verified employer access.",
  alternates: { canonical: "/employers" },
  openGraph: {
    title: "For Employers | Free Agent Staff",
    description:
      "Discover professionals open to opportunity through Free Agent Staff FreeAgent Cards, Talent Passports and verified employer access.",
    url: "https://freeagentstaff.com/employers",
  },
};

const danielProfile = {
  ...homepagePassportProfiles["daniel-brooks"],
  intro_video_url: "/videos/daniel-intro.mp4",
};

const employerSteps = [
  {
    icon: Search,
    title: "Discover beyond applications",
    text: "Search and filter Talent by role, skill, experience, location and availability to find professionals who may not be applying to an advertisement.",
  },
  {
    icon: ShieldCheck,
    title: "Build trust first",
    text: "Employer accounts are verified before Talent discovery is provided. Verification helps protect Talent and maintain a trusted employer network.",
  },
  {
    icon: Send,
    title: "Start the right conversation",
    text: "Send introduction requests and establish connections through the platform. Private details are not exposed before the appropriate permission exists.",
  },
];

function RockstarSearchIcon({ className }: { className?: string }) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="relative z-0 h-full w-full">
        <g stroke="#1F3D0A" strokeWidth="1.4" strokeLinecap="round">
          <line x1="6" y1="6" x2="7.7" y2="7.7" />
          <line x1="26" y1="6" x2="24.3" y2="7.7" />
        </g>
        <path
          d="M16 5l3.09 6.26 6.91.99-5 4.87 1.18 6.88L16 20.9l-6.18 3.1L11 17.12l-5-4.87 6.91-.99L16 5z"
          fill="#AFF546"
          stroke="#1F3D0A"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      <Search className="absolute -bottom-[10%] -right-[10%] z-10 h-[58%] w-[58%] text-[#2BD7EF]" strokeWidth={2.5} aria-hidden="true" />
    </div>
  );
}

const shortStaySteps = [
  {
    icon: Search,
    title: "Search",
    text: "Use Short Stay to find Rockstar Talent who are available for one-off shifts.",
  },
  {
    icon: UserRound,
    title: "View profiles",
    text: "See permitted Talent profile information to find the right fit for your shift.",
  },
  {
    icon: Send,
    title: "Reach out",
    text: "Request an introduction through the platform to connect with Talent.",
  },
  {
    icon: Clock,
    title: "Get to work",
    text: "A simple, time-limited way to find great people, fast.",
  },
];

export default function EmployersPage() {
  return (
    <main className="min-h-screen bg-[#f7e8c6] text-[#071321]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#0B111D] text-[#f7e8c6]">
        <div className="pointer-events-none absolute -left-16 top-10 h-44 w-44 rounded-full border border-[#2bd7ef]/18" />
        <div className="pointer-events-none absolute right-[-3rem] bottom-8 h-56 w-56 rounded-full border border-[#aff546]/16" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.95fr_0.85fr] lg:px-12 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#2bd7ef]">For Employers</p>
            <h1 className="mt-4 max-w-2xl font-serif text-[2rem] font-semibold leading-tight text-[#f7e8c6] sm:text-[2.8rem]">
              <span className="block">Recruitment takes too much time.</span>
              <span className="block">Putting up an ad and waiting for resumes to come in.</span>
              <span className="block">Here, you can browse talented staff right now.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#f7e8c6]/84 sm:text-lg">Free Agent Staff reverses the traditional job-board model. Instead of relying only on people applying to individual advertisements, discover professionals who are open to their next opportunity.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/employer/auth" className="inline-flex items-center justify-center rounded-full bg-[#2bd7ef] px-6 py-3 text-sm font-semibold text-[#071321] transition hover:-translate-y-0.5 hover:bg-[#1fcce7]">Employer Sign In</Link>
              <Link href="/pricing" className="inline-flex items-center justify-center rounded-full border border-[#2bd7ef]/65 px-6 py-3 text-sm font-semibold text-[#f7e8c6] transition hover:-translate-y-0.5 hover:bg-[#2bd7ef]/10">View Employer Plans</Link>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[390px] lg:justify-self-end">
            <TalentCard profile={danielProfile} href="/profile/daniel-brooks" verificationStatus="verified" hasProAccess presentation="employer" />
          </div>
        </div>
      </section>

      <section className="bg-[#f7e8c6]">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1bc8e4]">A better way to look for people</p>
            <h2 className="mt-3 max-w-[15ch] font-serif text-[2.7rem] font-semibold uppercase leading-[0.94] sm:text-[3.8rem]">Find people worth finding.</h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#071321]/78">Professionals create FreeAgent Cards and Talent Passports to show their skills, experience, availability and what makes them different. Your search can start with the person and their potential, not just an application in your inbox.</p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {employerSteps.map((step) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="border-t border-[#071321]/18 pt-5">
                  <Icon className="h-6 w-6 text-[#2bd7ef]" />
                  <h3 className="mt-5 font-serif text-[1.8rem] leading-tight">{step.title}</h3>
                  <p className="mt-3 text-[0.98rem] leading-7 text-[#071321]/76">{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#08111F] text-[#f7e8c6]">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#aff546]">Responsible access</p>
              <h2 className="mt-3 max-w-[12ch] font-serif text-[2.7rem] font-semibold uppercase leading-[0.94] sm:text-[3.7rem]">Trust is part of the product.</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="border-l border-[#2bd7ef]/35 pl-5">
                <Building2 className="h-5 w-5 text-[#2bd7ef]" />
                <h3 className="mt-4 font-serif text-[1.7rem]">Verify your Employer account</h3>
                <p className="mt-3 text-sm leading-7 text-[#f7e8c6]/78">Employer access starts with an account and business verification. Once approved, an Employer subscription is required before Talent discovery is unlocked.</p>
              </div>
              <div className="border-l border-[#aff546]/35 pl-5">
                <Bookmark className="h-5 w-5 text-[#2bd7ef]" />
                <h3 className="mt-4 font-serif text-[1.7rem]">Save and shortlist Talent</h3>
                <p className="mt-3 text-sm leading-7 text-[#f7e8c6]/78">Save accessible Talent for later review and organise promising candidates into shortlists within your Employer workspace.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7e8c6]">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1bc8e4]">Ready when you are</p>
            <h2 className="mt-3 font-serif text-[2.6rem] font-semibold uppercase leading-[0.94] sm:text-[3.6rem]">The right person may not be applying.</h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#071321]/78">Join Free Agent Staff to discover professionals who are open to opportunity, while respecting the privacy controls and permissions that keep the connection thoughtful.</p>
          </div>
        </div>
      </section>
      <section className="bg-[#08111F] text-[#f7ebcf]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)] lg:gap-16 lg:px-12 lg:py-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#2BD7EF]">THE FIRST MOVE IS YOURS</p>
            <h2 className="mt-5 max-w-4xl font-serif text-[2.6rem] font-semibold uppercase leading-[0.94] sm:text-[3.6rem]">STOP WAITING FOR APPLICATIONS.<br />START DISCOVERING.</h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#dfe7ef] sm:text-lg">The people you need might not be looking for you yet. Find them on FreeAgentStaff, see their story, and make the first move.</p>
            <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f2cc63]">TALENT CARDS · VIDEO INTRODUCTIONS · TALENT PASSPORTS</p>
          </div>
          <div className="flex items-center justify-center lg:justify-end">
            <Image src="/great-people-build-great-things.png" alt="Great people build great things" width={1200} height={1200} className="h-auto w-full max-w-[341px] object-contain" />
          </div>
        </div>
      </section>

      <section id="short-stay" className="scroll-mt-24 bg-[#f7e8c6]">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-12 lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.55fr] lg:gap-16">
            <div>
              <span className="inline-flex items-center rounded-full border border-[#1bc8e4]/40 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-[#1bc8e4]">
                Short Stay Explained
              </span>
              <h2 className="mt-5 font-serif text-4xl font-bold uppercase leading-[0.95] text-[#071321] sm:text-5xl">
                <span className="text-[#08111F]">Find great people</span>
                <br />
                <span className="text-[#1bc8e4]">for the shifts you need.</span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-[#071321]/78 sm:text-lg">
                Short Stay gives you quick, easy access to Rockstar Talent who are available for one-off shifts. A simple, time-limited way to find reliable people, fast.
              </p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <RockstarSearchIcon className="h-28 w-28 sm:h-36 sm:w-36" />
            </div>
          </div>
        </div>
      </section>
      <section className="bg-[#08111F] text-[#f7ebcf]">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12 lg:py-16">
          <h3 className="text-center text-[11px] font-bold uppercase tracking-[0.32em] text-[#2BD7EF]">How Short Stay works</h3>
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-[#f7ebcf]/15">
            {shortStaySteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="lg:px-6 lg:first:pl-0 lg:last:pr-0">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#2BD7EF]/50 text-[#2BD7EF]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h4 className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-[#f7ebcf]">{index + 1}. {step.title}</h4>
                  <p className="mt-3 text-sm leading-6 text-[#f7ebcf]/70">{step.text}</p>
                  <div className="mt-6 h-px bg-[#f7ebcf]/15" />
                </div>
              );
            })}
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 text-center sm:flex-row">
            <Link href="/employer/auth" className="inline-flex items-center rounded-full bg-[#2bd7ef] px-6 py-3 text-sm font-semibold text-[#071321] transition hover:bg-[#1fcce7]">Employer Sign In</Link>
            <Link href="/pricing" className="text-sm font-semibold text-[#f7ebcf] underline decoration-[#2bd7ef] underline-offset-4">View Employer Plans</Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}