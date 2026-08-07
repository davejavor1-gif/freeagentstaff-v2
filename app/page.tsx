import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import { IdCard, Lock, ShieldCheck, CheckCircle2, MapPin } from "lucide-react";

const featureCards = [
  {
    title: "Talent Passport",
    description: "Showcase your skills, experience and achievements in one powerful profile.",
    icon: IdCard,
    tone: "lime" as const,
  },
  {
    title: "Confidential Mode",
    description: "Explore opportunities privately. You control who sees what and when.",
    icon: Lock,
    tone: "cyan" as const,
  },
  {
    title: "Verified Employers",
    description: "Connect with trusted employers who are verified for your peace of mind.",
    icon: ShieldCheck,
    tone: "lime" as const,
  },
];

const howItWorksSteps = [
  {
    number: "01",
    title: "Create your Talent Passport",
    description:
      "Build a professional, visual profile that showcases your skills, experience and achievements beyond a traditional CV.",
    tone: "lime" as const,
  },
  {
    number: "02",
    title: "Control your visibility",
    description: "Choose what employers can see and when. Explore opportunities openly or privately, on your terms.",
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

function SocialProofRow() {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 max-sm:mt-2 max-sm:gap-2.5">
      <div className="flex -space-x-2">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-11 w-11 overflow-hidden rounded-full border-2 border-[#071321] bg-[#102740] max-sm:h-9 max-sm:w-9">
            <Image src="/placeholder-avatar.svg" alt="Professional" width={44} height={44} className="h-full w-full object-cover" />
          </div>
        ))}
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#071321] bg-[#1c3349] text-xs font-semibold text-[#f7e8c6] max-sm:h-9 max-sm:w-9 max-sm:text-[10px]">
          +2K
        </div>
      </div>
      <p className="max-w-xs text-[1.03rem] leading-7 text-[#f7e8c6]/88 max-sm:max-w-[14.8rem] max-sm:text-[0.9rem] max-sm:leading-5">
        Join 2,000+ professionals taking control of their careers.
      </p>
    </div>
  );
}

function TalentPassportCard() {
  return (
    <div className="mx-auto flex w-full justify-center max-sm:h-[746px] max-[360px]:!h-[800px]">
      <div className="relative w-full overflow-visible">
        <article className="fa-float-compose relative origin-center rotate-[2.5deg] rounded-[36px] border border-[#f7e8c6]/90 bg-[#f7e8c6] p-3 shadow-[0_38px_110px_rgba(2,9,24,0.62)] transition duration-500 hover:-translate-y-1 hover:rotate-[4.2deg] max-sm:absolute max-sm:inset-x-0 max-sm:top-0 max-sm:mx-auto max-sm:w-full max-sm:origin-center max-sm:scale-[0.8] max-sm:rotate-[1deg] sm:rotate-[4.5deg]">
          <div className="overflow-hidden rounded-[28px] border border-[#2bd7ef]/26 bg-[#081a31]">
        <div className="border-b border-[#2bd7ef]/18 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full border-2 border-[#aff546] [border-right-color:transparent] [border-bottom-color:transparent]" />
                <div className="h-16 w-16 overflow-hidden rounded-full border border-[#b8cde2]/40">
                  <Image src="/placeholder-avatar.svg" alt="Sarah Chen" width={64} height={64} className="h-full w-full object-cover" />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2bd7ef]">Talent Passport</p>
                <h3 className="mt-1 font-serif text-[2.9rem] font-semibold leading-none text-[#f7e8c6]">Sarah Chen</h3>
                <p className="mt-1 text-[1.55rem] font-medium leading-tight text-[#2bd7ef]">Senior Software Engineer</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-lg font-semibold text-[#aff546]">
                  <CheckCircle2 className="h-4 w-4" />
                  Verified
                </p>
              </div>
            </div>
            <span className="rounded-full border border-[#aff546]/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#aff546]">
              Visible
            </span>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5 text-[#f7e8c6]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#2bd7ef]">Expertise</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["React", "TypeScript", "Node.js", "AWS", "Python"].map((skill) => (
                <span key={skill} className="rounded-full border border-[#f7e8c6]/26 px-3 py-1 text-xs text-[#f7e8c6]/92">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#2bd7ef]">Experience</p>
            <div className="mt-4 space-y-4">
              {[
                { title: "Senior Software Engineer", company: "Fintech Co.", years: "2021 - Present" },
                { title: "Software Engineer", company: "Tech Solutions", years: "2019 - 2021" },
                { title: "Junior Developer", company: "Webcraft", years: "2017 - 2019" },
              ].map((role, index) => (
                <div key={role.title} className="grid grid-cols-[20px_1fr] gap-3">
                  <div className="relative mt-1">
                    {index < 2 ? <span className="absolute left-[8px] top-3 h-[34px] w-px bg-[#f7e8c6]/22" /> : null}
                    <span className="relative block h-4 w-4 rounded-full border border-[#f7e8c6]/34 bg-[#2bd7ef]/25" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[#f7e8c6]">{role.title}</p>
                    <p className="text-sm text-[#f7e8c6]/74">
                      {role.company} • {role.years}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 border-t border-[#f7e8c6]/14 pt-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#2bd7ef]">Location</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-[#f7e8c6]">
                <MapPin className="h-4 w-4" />
                Sydney, Australia
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#2bd7ef]">Availability</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-[#f7e8c6]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#aff546]" />
                Open to opportunities
              </p>
            </div>
          </div>
        </div>
          </div>
        </article>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="bg-[#0B111D] text-[#f7e8c6]">
      <Navbar />

      <section className="relative isolate overflow-hidden border-b border-[#2bd7ef]/12">
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
              Create a Talent Passport that showcases your skills, experience and value, and get discovered by verified employers, on
              your terms.
            </p>

            <div className="mt-7 flex flex-row gap-2.5 max-[359px]:flex-col sm:flex-row sm:gap-3 max-sm:mt-2">
              <Link
                href="/builder"
                className="inline-flex items-center justify-center rounded-full bg-[#aff546] px-4 py-2.5 text-[0.78rem] font-semibold text-[#071321] transition duration-300 hover:-translate-y-0.5 hover:bg-[#9fea37] max-[359px]:w-full sm:px-7 sm:py-3 sm:text-sm"
              >
                Create your Talent Passport
              </Link>
              <Link
                href="/find-talent"
                className="inline-flex items-center justify-center rounded-full border border-[#2bd7ef]/70 bg-transparent px-4 py-2.5 text-[0.78rem] font-semibold text-[#dff9ff] transition duration-300 hover:-translate-y-0.5 hover:bg-[#2bd7ef]/16 max-[359px]:w-full sm:px-7 sm:py-3 sm:text-sm"
              >
                Find talent
              </Link>
            </div>

            <SocialProofRow />
          </div>

          <div className="relative mx-auto flex w-full max-w-[470px] items-center justify-center max-sm:mt-0 max-sm:mb-0 lg:max-w-[560px]">
            <TalentPassportCard />
          </div>
        </div>
      </section>

      <section className="bg-[#f7e8c6] text-[#071426]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-11 max-sm:gap-0 max-sm:py-3 sm:px-8 lg:grid-cols-3 lg:gap-0 lg:px-12">
          {featureCards.map((feature, index) => {
            const Icon = feature.icon;
            const iconClass = feature.tone === "lime" ? "text-[#8fdc3a] border-[#9be645]/50" : "text-[#2bd7ef] border-[#2bd7ef]/50";
            const linkClass = feature.tone === "lime" ? "text-[#84d735]" : "text-[#1fcce7]";

            return (
              <article
                key={feature.title}
                className={`px-0 max-sm:py-3 lg:px-10 ${
                  index < featureCards.length - 1 ? "max-sm:border-b max-sm:border-[#0d233c]/18 lg:border-r lg:border-[#0d233c]/18" : ""
                }`}
              >
                <div className="flex items-start gap-3.5 sm:block">
                  <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border sm:h-16 sm:w-16 ${iconClass}`}>
                    <Icon className="h-4.5 w-4.5 sm:h-7 sm:w-7" />
                  </div>
                  <div className="min-w-0 flex-1 sm:mt-5 sm:block">
                    <h3 className="mt-0 font-serif text-[1.75rem] font-semibold leading-tight text-[#071321] sm:text-4xl">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-[0.98rem] leading-6 text-[#071321]/86 sm:mt-3 sm:text-lg sm:leading-8">
                      {feature.description}
                    </p>
                    <Link
                      href="#"
                      className={`mt-2 inline-flex items-center text-[0.98rem] font-medium transition hover:translate-x-0.5 sm:mt-5 sm:text-lg ${linkClass}`}
                    >
                      Learn more
                      <span className="ml-2">→</span>
                    </Link>
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2bd7ef]">How it works</p>
          <h2 className="mt-3 max-w-4xl font-serif text-[2.125rem] font-semibold uppercase leading-[0.95] text-[#f7e8c6] sm:text-[2.9rem] lg:text-[3.02rem]">
            HOW FREE AGENT STAFF WORKS
          </h2>

          <div className="relative mt-7 hidden lg:block">
            <span className="pointer-events-none absolute left-0 right-0 top-[89px] h-px bg-gradient-to-r from-[#2bd7ef]/22 via-[#aff546]/40 to-[#2bd7ef]/22" />
            <span className="pointer-events-none absolute left-1/3 top-[84px] h-[11px] w-[11px] -translate-x-1/2 rounded-full border border-[#2bd7ef]/42 bg-[#0B111D]" />
            <span className="pointer-events-none absolute left-2/3 top-[84px] h-[11px] w-[11px] -translate-x-1/2 rounded-full border border-[#aff546]/46 bg-[#0B111D]" />
            <div className="grid grid-cols-3 gap-12">
              {howItWorksSteps.map((step) => {
                const stepTone = step.tone === "lime" ? "text-[#aff546]" : "text-[#2bd7ef]";

                return (
                  <article key={step.number} className="relative min-w-0">
                    <p className={`h-[5.25rem] font-serif text-[5rem] leading-none ${stepTone}`}>{step.number}</p>
                    <h3 className="mt-3 min-h-[7rem] max-w-[18.5rem] font-serif text-[2.2rem] leading-[1.04] text-[#f7e8c6]">{step.title}</h3>
                    <p className="mt-8 max-w-[19rem] text-[1.11rem] leading-8 text-[#f7e8c6]/84">{step.description}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="relative mt-9 lg:hidden">
            <span className="pointer-events-none absolute left-[26px] top-6 bottom-10 w-px bg-gradient-to-b from-[#2bd7ef]/38 via-[#aff546]/45 to-[#2bd7ef]/25" />
            <div className="space-y-9">
              {howItWorksSteps.map((step, index) => {
                const stepTone = step.tone === "lime" ? "text-[#aff546]" : "text-[#2bd7ef]";

                return (
                  <article key={step.number} className="relative grid grid-cols-[52px_1fr] gap-4">
                    <div className="flex flex-col items-center">
                      <p className={`font-serif text-[2.4rem] leading-none ${stepTone}`}>{step.number}</p>
                      {index < howItWorksSteps.length - 1 ? <span className="mt-2 text-sm text-[#f7e8c6]/55">↓</span> : null}
                    </div>
                    <div className="pr-1">
                      <h3 className="font-serif text-[1.6rem] leading-tight text-[#f7e8c6]">{step.title}</h3>
                      <p className="mt-2 text-[0.98rem] leading-6 text-[#f7e8c6]/84">{step.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
