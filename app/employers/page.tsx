import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, Building2, Search, Send, ShieldCheck } from "lucide-react";
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
            <h1 className="mt-4 max-w-2xl font-serif text-[2rem] font-semibold leading-tight text-[#f7e8c6] sm:text-[2.8rem]">Recruitment takes too much time. Putting up an ad and waiting for resumes to come in. Here, you can browse talented staff right now.</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#f7e8c6]/84 sm:text-lg">Free Agent Staff reverses the traditional job-board model. Instead of relying only on people applying to individual advertisements, discover professionals who are open to their next opportunity.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/employer/auth" className="inline-flex items-center justify-center rounded-full bg-[#2bd7ef] px-6 py-3 text-sm font-semibold text-[#071321] transition hover:-translate-y-0.5 hover:bg-[#1fcce7]">Find Your Next Superstar <span className="ml-2">→</span></Link>
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
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/employer/auth" className="inline-flex items-center rounded-full bg-[#2bd7ef] px-6 py-3 text-sm font-semibold text-[#071321] transition hover:bg-[#1fcce7]">Find Your Next Superstar <span className="ml-2">→</span></Link>
            <Link href="/pricing" className="text-sm font-semibold text-[#071321] underline decoration-[#1bc8e4] underline-offset-4">View Employer Plans</Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}