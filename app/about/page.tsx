import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  FileText,
  MapPin,
  MessageCircle,
  Search,
  UserRound,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TalentCard from "@/components/TalentCard";
import { homepagePassportProfiles } from "@/data/homepage-passports";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn how FreeAgentStaff helps people get found for what they can do.",
  alternates: { canonical: "/about" },
  openGraph: { url: "https://freeagentstaff.com/about" },
};

const sarah = homepagePassportProfiles["sarah-jones"];

const talentFeatures = [
  "Professional photo",
  "Role title and professional headline",
  "Top skills and top strength",
  "Recent experience highlights",
  "Intro video, where available",
  "Location and availability",
];

const passportFeatures = [
  "Personal introduction and bio",
  "Career journey and work history",
  "Skills, education and passions",
  "Languages and qualifications",
  "Resume after connection",
  "Contact details after connection",
];

const journey = [
  {
    icon: UserRound,
    title: "Create your Card",
    text: "Show who you are, your skills and what you’re looking for.",
    tone: "text-[#AFF546]",
  },
  {
    icon: FileText,
    title: "Create your Passport",
    text: "Add your full story, experience, education and more.",
    tone: "text-[#cfa0a9]",
  },
  {
    icon: Search,
    title: "Get discovered",
    text: "Employers find you based on skills, experience and fit.",
    tone: "text-[#AFF546]",
  },
  {
    icon: Building2,
    title: "Employer connects",
    text: "Receive an introduction and connection request.",
    tone: "text-[#2BD7EF]",
  },
  {
    icon: CheckCircle2,
    title: "You accept",
    text: "You stay in control and choose who you connect with.",
    tone: "text-[#AFF546]",
  },
  {
    icon: MessageCircle,
    title: "Contact made",
    text: "Start the conversation and take the next step.",
    tone: "text-[#f2cc63]",
  },
];

function PassportPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative mx-auto w-full ${compact ? "-mb-[185px] max-w-[560px] scale-[0.82] origin-top sm:-mb-[330px] sm:scale-[0.68]" : "max-w-[560px]"}`}
    >
      <div className="relative rounded-[28px] bg-[#651D2A] p-2 shadow-[0_28px_70px_rgba(46,13,20,0.28)] sm:rounded-[36px] sm:p-3">
        <section className="relative overflow-hidden rounded-[22px] border border-[#f7ebcf]/80 bg-[#f7ebcf] p-4 text-[#1a1a1a] sm:rounded-[27px] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#651D2A]">
                Talent Passport
              </p>
              <h3 className="mt-2 text-xl font-black uppercase tracking-[0.06em] sm:text-3xl">
                Sarah Gonzales
              </h3>
              <p className="mt-1 text-sm font-semibold text-[#651D2A]">
                Senior Software Engineer
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#651D2A]">
                <MapPin className="h-3 w-3" /> Sydney, Australia
              </p>
            </div>
            <Image
              src="/newpassportlogo.png"
              alt=""
              width={88}
              height={88}
              className="h-16 w-16 shrink-0 object-contain sm:h-24 sm:w-24"
            />
          </div>
          <div className="mt-5 border-t border-[#651D2A]/25 pt-4 sm:mt-7 sm:pt-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#651D2A]">
              Personal introduction
            </p>
            <p className="mt-2 text-xs leading-6 sm:text-sm">
              Experienced software engineer who turns complex product challenges
              into clear, dependable experiences.
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#651D2A]/20 bg-[#fffaf0] p-3 sm:p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#651D2A]">
                Skills
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["React", "TypeScript", "Product Delivery"].map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-[#f7ebcf] px-2 py-1 text-[10px] font-semibold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[#651D2A]/20 bg-[#fffaf0] p-3 sm:p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#651D2A]">
                Career journey
              </p>
              <p className="mt-2 text-xs font-semibold">
                Senior Software Engineer
              </p>
              <p className="mt-1 text-[10px] text-[#651D2A]">
                Northstar Labs · 2021 - Present
              </p>
            </div>
          </div>
        </section>
        <div className="relative z-10 -mx-3 h-10 overflow-visible sm:-mx-4 sm:h-14">
          <Image
            src="/newbinder.png"
            alt=""
            fill
            className="scale-y-[1.65] object-fill"
            sizes="100vw"
          />
        </div>
        <section className="relative overflow-hidden rounded-[22px] border border-[#f7ebcf]/80 bg-[#fffaf0] p-4 text-[#1a1a1a] sm:rounded-[27px] sm:p-7">
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.25em] text-[#651D2A]">
            <BriefcaseBusiness className="h-3.5 w-3.5" /> Professional record
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#651D2A]/20 bg-[#f7ebcf]/65 p-3 sm:p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#651D2A]">
                Education
              </p>
              <p className="mt-2 text-xs font-semibold">
                Bachelor of Computer Science
              </p>
            </div>
            <div className="rounded-2xl border border-[#651D2A]/20 bg-[#f7ebcf]/65 p-3 sm:p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#651D2A]">
                Languages
              </p>
              <p className="mt-2 text-xs font-semibold">English · French</p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-[#651D2A]/20 bg-[#f7ebcf]/65 p-3 sm:p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#651D2A]">
              Connection-gated details
            </p>
            <p className="mt-2 text-xs leading-5">
              Resume and contact details become available when you choose to
              connect.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ClosedPassportCover() {
  return (
    <Image
      src="/images/transparentpassportcover.png"
      alt="FreeAgentStaff Talent Passport cover"
      width={1024}
      height={1536}
      className="h-auto w-full object-contain"
    />
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08111F] text-[#f7ebcf]">
      <Navbar />
      <section className="bg-[#f7e8c6] text-[#08111F]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:px-8 sm:py-24 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-center xl:gap-16 xl:px-12 xl:py-28">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#9a6d15]">
              About FreeAgentStaff
            </p>
            <h1 className="mt-7 max-w-xl font-serif text-5xl font-bold uppercase leading-[0.92] tracking-[-0.03em] sm:text-7xl lg:text-[6.4rem]">
              Careers shouldn&apos;t start with a résumé.
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-[#27405f] sm:text-lg">
              FreeAgentStaff is built around a simple idea: let people show who
              they are, then let the right opportunities find them.
            </p>
          </div>
          <div className="relative flex min-w-0 w-full items-center justify-center xl:justify-self-end">
            <div className="grid w-full max-w-[720px] grid-cols-1 items-center gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:gap-7">
              <div className="relative z-10 min-w-0 w-full rotate-[-3deg]">
                <TalentCard
                  profile={sarah}
                  href="/talent/sarah-jones"
                  initiallyFlipped={false}
                />
              </div>
              <div className="relative z-20 mx-auto min-w-0 w-full max-w-[210px] sm:max-w-none">
                <ClosedPassportCover />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#08111F]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:px-12">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#f2cc63]">
              Why we exist
            </p>
            <h2 className="mt-7 w-full max-w-3xl break-words font-serif text-5xl font-bold uppercase leading-[0.93] sm:text-7xl">
              We don&apos;t want you on Free Agent Staff forever.
            </h2>
            <p className="mt-8 max-w-xl text-base leading-8 text-[#dfe7ef] sm:text-lg">
              We want you to find your next role as quickly as possible. We
              aren&apos;t building a platform designed to keep you searching.
              We&apos;re building one designed to get you found.
            </p>
          </div>
          <div className="rounded-[28px] bg-[#f7ebcf] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.2)] sm:p-8">
            <Image
              src="/images/get-found-get-hired-get-out.png"
              alt="Get Found. Get Hired. Get Out."
              width={607}
              height={412}
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#f7e8c6] text-[#08111F]">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-28 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#9a6d15]">
            Two products, one story
          </p>
          <div className="mt-12 grid gap-20 lg:grid-cols-2 lg:gap-16">
            <div className="min-w-0">
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#4c7f1d]">
                <span className="text-4xl font-serif">01</span> The Talent Card
              </div>
              <h2 className="mt-6 w-full max-w-lg font-serif text-5xl font-bold uppercase leading-[0.95] sm:text-6xl">
                Your first impression.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-8 text-[#27405f]">
                A visual, scannable snapshot of your skills, experience and
                personality. Designed to help the right employers notice you.
              </p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {talentFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-[#27405f]"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4c7f1d]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <TalentCard
                  profile={sarah}
                  href="/talent/sarah-jones"
                  initiallyFlipped={false}
                />
              </div>
            </div>
            <div className="min-w-0 border-t border-[#651D2A]/25 pt-16 lg:border-l lg:border-t-0 lg:pl-16 lg:pt-0">
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#651D2A]">
                <span className="text-4xl font-serif">02</span> The Talent
                Passport
              </div>
              <h2 className="mt-6 w-full max-w-lg font-serif text-5xl font-bold uppercase leading-[0.95] sm:text-6xl">
                The full story.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-8 text-[#27405f]">
                A deeper view of your experience, education and more. Shared
                when you connect, so you stay in control of your information.
              </p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {passportFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-[#27405f]"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#651D2A]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <PassportPreview compact />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#08111F]">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-28 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#2BD7EF]">
            How it works — for talent
          </p>
          <div className="mt-12 grid gap-0 md:grid-cols-2 lg:grid-cols-6">
            {journey.map((step, index) => (
              <div
                key={step.title}
                className="relative border-l border-[#dfe7ef]/25 px-5 py-5 first:border-l-0 lg:border-l lg:px-4 lg:py-0"
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-current bg-[#0f2744] ${step.tone}`}>
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-[#f7ebcf]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#dfe7ef]">
                  {step.text}
                </p>
                {index < journey.length - 1 ? (
                  <ArrowRight className="absolute right-[-9px] top-6 hidden h-4 w-4 text-[#f2cc63] lg:block" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2">
        <div className="relative overflow-hidden bg-[#163D2F] text-[#f7ebcf] [background-image:radial-gradient(circle_at_82%_28%,rgba(175,245,70,0.1),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.035),transparent_45%,rgba(0,0,0,0.12))]">
          <div className="relative z-10 grid min-h-[520px] items-center gap-10 px-6 py-20 sm:px-12 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(180px,0.52fr)] lg:gap-4 lg:px-14">
            <div className="flex h-full min-w-0 flex-col justify-center lg:min-h-[456px] lg:justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#AFF546]">
                For talent
              </p>
              <h2 className="mt-7 max-w-lg font-serif text-5xl font-bold uppercase leading-[0.92] text-[#f7ebcf] sm:text-7xl">
                Be seen for what you can do.
              </h2>
              <Link
                href="/login"
                className="mt-9 inline-flex h-11 items-center gap-3 self-start rounded-full bg-[#AFF546] px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#08111F]"
              >
                Talent sign in <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative mx-auto w-full max-w-[210px] lg:max-w-[250px]">
              <ClosedPassportCover />
            </div>
          </div>
        </div>
        <div className="bg-[#123A59] text-[#f7ebcf] [background-image:radial-gradient(circle_at_18%_25%,rgba(43,215,239,0.1),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.035),transparent_45%,rgba(0,0,0,0.12))]">
          <div className="grid min-h-[520px] items-center gap-10 px-6 py-20 sm:px-12 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(180px,0.52fr)] lg:gap-4 lg:px-14">
            <div className="flex h-full min-w-0 flex-col justify-center lg:min-h-[456px] lg:justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#2BD7EF]">
                For employers
              </p>
              <h2 className="mt-7 max-w-lg font-serif text-5xl font-bold uppercase leading-[0.92] text-[#f7ebcf] sm:text-7xl">
                Find people worth finding.
              </h2>
              <Link
                href="/employer/auth"
                className="mt-9 inline-flex h-11 items-center gap-3 self-start rounded-full bg-[#2BD7EF] px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#08111F]"
              >
                Employer sign in <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative mx-auto w-full max-w-[230px] lg:max-w-[250px]">
              <Image
                src="/images/great%20people.png"
                alt="Great people"
                width={1236}
                height={1273}
                className="h-auto w-full object-contain"
              />
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
