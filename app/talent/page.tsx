import type { Metadata } from "next";
import Link from "next/link";
import { Eye, IdCard, Lock, Send, ShieldCheck } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TalentCard from "@/components/TalentCard";
import { homepagePassportProfiles } from "@/data/homepage-passports";

export const metadata: Metadata = {
  title: "For Talent",
  description:
    "Create a FreeAgent Card and Talent Passport to show employers your skills, experience, availability and what makes you different.",
  alternates: { canonical: "/talent" },
  openGraph: {
    title: "For Talent | Free Agent Staff",
    description:
      "Create a FreeAgent Card and Talent Passport to show employers your skills, experience, availability and what makes you different.",
    url: "https://freeagentstaff.com/talent",
  },
};

const sarahProfile = {
  ...homepagePassportProfiles["sarah-jones"],
  intro_video_url: "/videos/sarahs%20intro.mp4",
};

const talentSteps = [
  {
    icon: IdCard,
    title: "Create your FreeAgent Card",
    text: "Build a visual professional profile with your experience, skills, strengths, availability and the work you want to do.",
  },
  {
    icon: Eye,
    title: "Choose your visibility",
    text: "Use the privacy and visibility controls to decide whether your profile is public, visible to the Verified Employer Network or confidential.",
  },
  {
    icon: ShieldCheck,
    title: "Be discovered on your terms",
    text: "Verified employers can discover Talent based on skills and experience, without reducing you to a traditional resume.",
  },
];

export default function TalentPage() {
  return (
    <main className="min-h-screen bg-[#0B111D] text-[#f7e8c6]">
      <Navbar />

      <section className="relative overflow-hidden border-b border-[#2bd7ef]/15">
        <div className="pointer-events-none absolute -left-20 top-12 h-48 w-48 rounded-full border border-[#2bd7ef]/18" />
        <div className="pointer-events-none absolute -right-20 bottom-8 h-64 w-64 rounded-full border border-[#aff546]/16" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1fr_0.8fr] lg:px-12 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#aff546]">For Talent</p>
            <h1 className="mt-4 max-w-2xl font-serif text-[2rem] font-semibold leading-tight text-[#f7e8c6] sm:text-[2.8rem]">
              Want to stand out? Create your Talent Card, record a video and let your experience and personality shine.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#f7e8c6]/84 sm:text-lg">
              Free Agent Staff gives professionals a different way to present themselves to employers. Create a FreeAgent Card and Talent Passport that show what you can do, what you&apos;ve achieved and what makes you different.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center justify-center rounded-full bg-[#aff546] px-6 py-3 text-sm font-semibold text-[#071321] transition hover:-translate-y-0.5 hover:bg-[#9fea37]">
                Create Your FreeAgent Card
                <span className="ml-2">→</span>
              </Link>
              <Link href="/about" className="inline-flex items-center justify-center rounded-full border border-[#2bd7ef]/65 px-6 py-3 text-sm font-semibold text-[#f7e8c6] transition hover:-translate-y-0.5 hover:bg-[#2bd7ef]/10">
                How it works
              </Link>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[390px] lg:justify-self-end">
            <TalentCard profile={sarahProfile} href="/profile/sarah-jones" verificationStatus="verified" hasProAccess />
          </div>
        </div>
      </section>

      <section className="bg-[#f7e8c6] text-[#071321]">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#aff546]">A fuller picture of you</p>
            <h2 className="mt-3 max-w-[16ch] font-serif text-[2.6rem] font-semibold uppercase leading-[0.94] sm:text-[3.7rem]">Your career is more than a document.</h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#071321]/78">
              Your FreeAgent Card is the clear, visual front door to your professional story. Your Talent Passport gives you space to add the detail employers need to understand your skills, experience, availability, education and goals.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {talentSteps.map((step) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="border-t border-[#071321]/18 pt-5">
                  <Icon className="h-6 w-6 text-[#aff546]" />
                  <h3 className="mt-5 font-serif text-[1.8rem] leading-tight">{step.title}</h3>
                  <p className="mt-3 text-[0.98rem] leading-7 text-[#071321]/76">{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#08111F] text-[#f7e8c6]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#aff546]">Your privacy matters</p>
            <h2 className="mt-3 max-w-[12ch] font-serif text-[2.7rem] font-semibold uppercase leading-[0.94] sm:text-[3.7rem]">Visible when you want to be.</h2>
            <p className="mt-5 max-w-md text-base leading-8 text-[#f7e8c6]/78">Free Agent Staff is for people across professions and industries. Whether you work in technology, operations, hospitality, creative work or somewhere entirely different, your Talent Passport gives employers a more useful view of your potential.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="border-l border-[#2bd7ef]/35 pl-5">
              <Lock className="h-5 w-5 text-[#aff546]" />
              <h3 className="mt-4 font-serif text-[1.7rem]">Control your visibility</h3>
              <p className="mt-3 text-sm leading-7 text-[#f7e8c6]/78">Explore opportunities openly or privately. Your profile visibility and the information employers can see remain under your control.</p>
            </div>
            <div className="border-l border-[#aff546]/35 pl-5">
              <Send className="h-5 w-5 text-[#aff546]" />
              <h3 className="mt-4 font-serif text-[1.7rem]">Connect with intention</h3>
              <p className="mt-3 text-sm leading-7 text-[#f7e8c6]/78">When an employer is interested, introduction requests and connections create a considered next step instead of an unexpected handover of private details.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
            <Link href="/login" className="inline-flex items-center rounded-full bg-[#aff546] px-6 py-3 text-sm font-semibold text-[#071321] transition hover:bg-[#9fea37]">Create Your FreeAgent Card <span className="ml-2">→</span></Link>
            <Link href="/employers" className="text-sm font-semibold text-[#f7e8c6] underline decoration-[#aff546] underline-offset-4">See the employer side</Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}