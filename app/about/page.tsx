import type { Metadata } from "next";
import Image from "next/image";
import {
  Briefcase,
  Camera,
  CheckCircle2,
  GraduationCap,
  Handshake,
  Lock,
  Mail,
  MapPin,
  PlayCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  Eye,
  Zap,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "About",
  description: "Learn how Free Agent Staff helps hiring teams discover polished professional talent profiles.",
  alternates: { canonical: "/about" },
  openGraph: { url: "https://freeagentstaff.com/about" },
};

const featureCards = [
  {
    title: "Curated visibility",
    text: "Public talent profiles are built to be discovered by hiring teams, not lost in search results.",
    icon: Eye,
  },
  {
    title: "Quality first",
    text: "We keep the experience premium with polished storytelling, clean filters and a refined interface.",
    icon: Sparkles,
  },
  {
    title: "Fast decisions",
    text: "Find the right candidate quickly with clear contact details, strengths and role context.",
    icon: Zap,
  },
];

const talentCardFields = [
  { icon: Camera, text: "Professional photo" },
  { icon: Briefcase, text: "Role title and professional headline" },
  { icon: CheckCircle2, text: "Top skills and top strength" },
  { icon: Briefcase, text: "Recent experience highlights" },
  { icon: PlayCircle, text: "Intro video, where available" },
  { icon: MapPin, text: "Location and availability" },
  { icon: CheckCircle2, text: "Open to Opportunities status" },
];

const passportFields = [
  { icon: Sparkles, text: "Personal introduction and bio" },
  { icon: Briefcase, text: "Career journey and work history" },
  { icon: CheckCircle2, text: "Skills and areas of expertise" },
  { icon: GraduationCap, text: "Education and training" },
  { icon: Lock, text: "Resume, unlocked once a connection is accepted" },
  { icon: Mail, text: "Contact email, unlocked once a connection is accepted" },
];

const employerSteps = [
  {
    title: "Smart search",
    icon: Search,
    text: "Employers search by keyword, skill or role, then refine results using filters for location, experience level, focus area and availability.",
  },
  {
    title: "Curated results",
    icon: SlidersHorizontal,
    text: "Every result is a fully designed Talent Card, so employers can judge strengths, experience and suitability at a glance.",
  },
  {
    title: "Connect & contact",
    icon: Handshake,
    text: "Send an introduction. Once accepted, view the information made available through the connection and start a conversation.",
  },
];

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#08111F] text-[#f7ebcf]">
      <Navbar />
      <div className="flex-1 mx-auto w-full max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="space-y-10 rounded-[36px] border border-[#cda64d]/50 bg-[#f7e8c6] p-8 text-[#08111F] shadow-[0_18px_55px_rgba(6,16,33,0.18)] sm:p-10">
          <div className="lg:grid lg:grid-cols-[7fr_3fr] lg:gap-10">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#9a6d15]">
                About FreeAgentStaff
              </p>
              <h1 className="text-4xl font-black uppercase tracking-[0.12em] text-[#08111F] sm:text-5xl">
                Premium talent search with a quiet, curated edge.
              </h1>
              <p className="max-w-3xl text-base leading-8 text-[#08111F]">
                We help hiring teams discover public talent profiles that feel polished, thoughtful and easy to evaluate. Every profile is designed to communicate impact, skills and availability clearly.
              </p>
              <div className="grid gap-6 sm:grid-cols-3">
                {featureCards.map((item) => (
                  <div key={item.title} className="rounded-[28px] border border-[#cda64d]/25 bg-[#0f2744] p-6 shadow-[0_10px_24px_rgba(6,16,33,0.12)]">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f7ebcf] text-[#0f2744]">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                      {item.title}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#dfe7ef]">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex lg:mt-0">
              <div className="flex flex-col justify-between rounded-[28px] border border-[#f2cc63]/30 bg-[#0f2744] p-6 sm:p-7">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                    Why we exist
                  </p>
                  <h2 className="mt-3 text-2xl font-black uppercase leading-tight tracking-[0.06em] text-[#f7ebcf]">
                    Built for connecting jobs with the right people.
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-[#dfe7ef]">
                    We don&apos;t want you on FreeAgentStaff forever. We want you hired and thriving in your next role as quickly as possible. We want your dream job to find you, and when it does, we don&apos;t ever want to see you again.
                  </p>
                </div>

                <div className="my-6 h-px w-full bg-[#f2cc63]/25" />

                <div className="flex justify-center rounded-[20px] bg-[#f7ebcf] p-4 sm:p-5">
                  <Image
                    src="/images/get-found-get-hired-get-out.png"
                    alt="Get Found. Get Hired. Get Out."
                    width={607}
                    height={412}
                    className="h-auto w-full max-w-[220px] object-contain sm:max-w-[260px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-[#f2cc63]/25" />

          <div className="grid gap-8 lg:grid-cols-3">
            <section className="rounded-[28px] border border-[#f2cc63]/25 bg-[#0f2744] p-6 sm:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                How Talent Cards are built
              </p>
              <p className="mt-2 text-sm leading-7 text-[#dfe7ef]">Designed to showcase you at your best.</p>
              <ul className="mt-5 space-y-2.5">
                {talentCardFields.map((field) => (
                  <li key={field.text} className="flex items-start gap-2.5 text-sm leading-6 text-[#dfe7ef]">
                    <field.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#8be4c5]" />
                    <span>{field.text}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[28px] border border-[#f2cc63]/25 bg-[#0f2744] p-6 sm:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                How Talent Passports are built
              </p>
              <p className="mt-2 text-sm leading-7 text-[#dfe7ef]">A deeper view of your experience and potential.</p>
              <ul className="mt-5 space-y-2.5">
                {passportFields.map((field) => (
                  <li key={field.text} className="flex items-start gap-2.5 text-sm leading-6 text-[#dfe7ef]">
                    <field.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#8be4c5]" />
                    <span>{field.text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm leading-7 text-[#dfe7ef]">
                Contact details and the resume stay locked until the Talent accepts an introduction request from a verified employer. Once accepted, that connection unlocks the private details above for that employer only.
              </p>
            </section>

            <section className="rounded-[28px] border border-[#f2cc63]/25 bg-[#0f2744] p-6 sm:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                How employers search
              </p>
              <p className="mt-2 text-sm leading-7 text-[#dfe7ef]">A reverse job board, built around discovery.</p>
              <div className="mt-5 space-y-5">
                {employerSteps.map((step) => (
                  <div key={step.title}>
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f2744] text-[#f2cc63]">
                        <step.icon className="h-4 w-4" />
                      </span>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf]">{step.title}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#dfe7ef]">{step.text}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="rounded-full bg-[#f7ebcf] px-6 py-5 text-center sm:px-10">
            <p className="text-base leading-8 text-[#0f2744] sm:text-lg">
              We&apos;re here to create better outcomes for everyone. The right opportunities. The right hires.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
