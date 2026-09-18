import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BicepsFlexed, CalendarCheck, Eye, IdCard, Lock, Search, Send, ShieldCheck } from "lucide-react";
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

function RockstarStarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
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
  );
}

const TALENT_BRAND_GREEN = "#AFF546";

function TalentMaskedIcon({
  src,
  className,
  sizePx,
}: {
  src: string;
  className?: string;
  sizePx?: number;
}) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-visible ${className ?? ""}`}>
      <span
        aria-hidden="true"
        className={`block shrink-0 ${sizePx ? "" : "h-full w-full"}`.trim()}
        style={{
          ...(sizePx ? { width: sizePx, height: sizePx } : {}),
          backgroundColor: TALENT_BRAND_GREEN,
          maskImage: `url("${src}")`,
          WebkitMaskImage: `url("${src}")`,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskSize: "contain",
          WebkitMaskSize: "contain",
        }}
      />
    </span>
  );
}

function DiscoverSearchIcon({ className, artworkSizePx }: { className?: string; artworkSizePx?: number }) {
  return (
    <span className={`inline-flex items-center justify-center overflow-visible ${className ?? ""}`}>
      <Search
        className={artworkSizePx ? "shrink-0" : "h-full w-full"}
        style={artworkSizePx ? { width: artworkSizePx, height: artworkSizePx } : undefined}
        strokeWidth={1.85}
        aria-hidden="true"
      />
    </span>
  );
}

function RockstarOnIcon({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center ${className ?? ""}`}>
      <span
        aria-hidden="true"
        className="block h-full w-auto max-h-full"
        style={{
          aspectRatio: "1774 / 887",
          backgroundColor: TALENT_BRAND_GREEN,
          maskImage: 'url("/new turn it on.png")',
          WebkitMaskImage: 'url("/new turn it on.png")',
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskMode: "luminance",
        }}
      />
    </span>
  );
}

function StayInControlIcon({ className }: { className?: string }) {
  return <TalentMaskedIcon src="/stayincontrol.png" className={className} />;
}

function ShareYourStoryIcon({ className }: { className?: string }) {
  return <TalentMaskedIcon src="/share your story.png" className={className} sizePx={70} />;
}

function VideoIntroIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="1.55" y="5.7" width="14.6" height="12.6" rx="2.35" stroke="currentColor" strokeWidth="1.85" />
      <circle cx="8.85" cy="10.55" r="1.85" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5.45 16.55c.55-2.35 1.75-3.35 3.4-3.35 1.65 0 2.85 1 3.4 3.35" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M16.15 9.15 22.2 6.35v11.3L16.15 14.85Z" stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
    </svg>
  );
}

function PassportSparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="4.4" y="3.55" width="12.1" height="16.9" rx="1.7" stroke="currentColor" strokeWidth="1.85" />
      <path d="M7.15 8.2h6.4M7.15 11.45h6.4M7.15 14.7h4.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M19.15 1.85 20.05 5.15 23.35 6.05 20.05 6.95 19.15 10.25 18.25 6.95 14.95 6.05 18.25 5.15Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PersonalityIcon({ className }: { className?: string }) {
  return <TalentMaskedIcon src="/showpersonaility.png" className={className} sizePx={70} />;
}

function ReceiveOpportunitiesIcon({ className }: { className?: string }) {
  return <CalendarCheck className={className} strokeWidth={1.85} aria-hidden="true" />;
}

function CareerProgressIcon({ className }: { className?: string }) {
  return <TalentMaskedIcon src="/take yourcareer.png" className={className} sizePx={70} />;
}

const rockstarTalentSteps = [
  {
    icon: RockstarOnIcon,
    iconClass: "h-8 w-auto sm:h-12",
    title: "Turn it on",
    text: "Switch on Rockstar in your settings whenever you're open to one-off shifts.",
    tone: "green" as const,
  },
  {
    icon: DiscoverSearchIcon,
    iconClass: "h-8 w-8 sm:h-12 sm:w-12",
    title: "Get discovered",
    text: "Verified employers can see you're available for short-term opportunities.",
    tone: "blue" as const,
  },
  {
    icon: ReceiveOpportunitiesIcon,
    iconClass: "h-8 w-8 sm:h-12 sm:w-12",
    title: "Receive opportunities",
    text: "Employers may reach out with shift opportunities that match your skills.",
    tone: "green" as const,
  },
  {
    icon: StayInControlIcon,
    iconClass: "h-14 w-14 sm:h-20 sm:w-20",
    title: "Stay in control",
    text: "Switch it off anytime. Your privacy settings still apply.",
    tone: "green" as const,
  },
];

export default function TalentPage() {
  return (
    <main className="min-h-screen bg-[#0B111D] text-[#f7e8c6]">

      <section className="relative overflow-hidden border-b border-[#2bd7ef]/15">
        <div className="pointer-events-none absolute -left-20 top-12 h-48 w-48 rounded-full border border-[#2bd7ef]/18" />
        <div className="pointer-events-none absolute -right-20 bottom-8 h-64 w-64 rounded-full border border-[#aff546]/16" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1fr_0.8fr] lg:px-12 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#aff546]">For Talent</p>
            <h1 className="mt-4 max-w-2xl font-serif text-[2rem] font-semibold leading-tight text-[#f7e8c6] sm:text-[2.8rem]">
              <span className="block">Want to stand out?</span>
              <span className="block">Create your Talent Card and Passport.</span>
              <span className="block">Record a video and let your personality and experience shine.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#f7e8c6]/84">
              Free Agent Staff gives professionals a different way to present themselves to employers. Create a FreeAgent Card and Talent Passport that show what you can do, what you&apos;ve achieved and what makes you different.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center justify-center rounded-full bg-[#aff546] px-6 py-3 text-sm font-semibold text-[#071321] transition hover:-translate-y-0.5 hover:bg-[#9fea37]">
                Talent Sign In
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#9a6d15]">A fuller picture of you</p>
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
                  <p className="mt-3 text-base leading-8 text-[#071321]/76">{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#08111F] text-[#f7e8c6]">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#aff546]">Video introductions</p>
            <h2 className="mt-3 max-w-[12ch] font-serif text-[2.6rem] font-semibold uppercase leading-[0.94] sm:text-[3.7rem]">
              Let them
              <br />
              meet you
              <br />
              before you
              <br />
              meet.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#f7e8c6]/78">
              Your experience tells employers what you&apos;ve done. Your video introduction lets them see the person behind it. Add a short introduction to your Talent Passport and give employers a better sense of who you are before you connect.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <article className="border-t border-[#f7e8c6]/18 pt-5">
              <VideoIntroIcon className="h-8 w-8 text-[#aff546] sm:h-12 sm:w-12" />
              <h3 className="mt-5 font-serif text-[1.8rem] leading-tight">Introduce yourself</h3>
              <p className="mt-3 text-base leading-8 text-[#f7e8c6]/76">Share who you are and what excites you professionally.</p>
            </article>
            <article className="border-t border-[#f7e8c6]/18 pt-5">
              <BicepsFlexed className="h-8 w-8 text-[#aff546] sm:h-12 sm:w-12" />
              <h3 className="mt-5 font-serif text-[1.8rem] leading-tight">Show your strengths</h3>
              <p className="mt-3 text-base leading-8 text-[#f7e8c6]/76">Talk about your best skills and the kind of work you do well.</p>
            </article>
            <article className="border-t border-[#f7e8c6]/18 pt-5">
              <PassportSparkleIcon className="h-8 w-8 text-[#aff546] sm:h-12 sm:w-12" />
              <h3 className="mt-5 font-serif text-[1.8rem] leading-tight">Add personality to your Passport</h3>
              <p className="mt-3 text-base leading-8 text-[#f7e8c6]/76">Give employers more than a list of roles and experience.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#f7e8c6] text-[#071321]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-12">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#9a6d15]">Public when you want to be</p>
            <h2 className="mt-3 max-w-[16ch] font-serif text-[2.6rem] font-semibold uppercase leading-[0.94] sm:text-[3.7rem]">Take your Passport with you.</h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#071321]/78">
              Make your Talent Passport public and you&apos;ve got one link that tells employers the whole story. Add it to your résumé, email signature or portfolio and give people a better way to discover you.
            </p>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#651D2A]">Public + published = your Passport link</p>
          </div>
          <div className="min-w-0 rounded-[28px] border border-[#651D2A]/20 bg-[#fffaf0] p-6 shadow-[0_20px_50px_rgba(7,19,33,0.14)] sm:p-10">
            <div className="grid items-center gap-5 sm:grid-cols-[auto_1fr] sm:gap-7">
              <Image src="/newpassportlogo.png" alt="Free Agent Staff Talent Passport" width={2000} height={2000} className="mx-auto h-32 w-32 object-contain sm:h-40 sm:w-40" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#651D2A]">Your personal link</p>
                <p className="mt-3 break-all rounded-2xl border border-[#651D2A]/20 bg-[#f7e8c6] px-4 py-3 text-sm font-bold text-[#27405f]">freeagentstaff.com/talent/your-name</p>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-center gap-3 text-[#651D2A] sm:justify-start">
                <span className="text-[11px] font-bold uppercase tracking-[0.22em]">Passport</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                <span className="text-[11px] font-bold uppercase tracking-[0.22em]">Your link</span>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4c7f1d] sm:justify-end">
                <span>Résumé</span><span>Email</span><span>Web</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#08111F] text-[#f7e8c6]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#aff546]">Your privacy matters</p>
            <h2 className="mt-3 max-w-[12ch] font-serif text-[2.6rem] font-semibold uppercase leading-[0.94] sm:text-[3.7rem]">Visible when you want to be.</h2>
            <p className="mt-5 max-w-md text-base leading-8 text-[#f7e8c6]/78">Free Agent Staff is for people across professions and industries. Whether you work in technology, operations, hospitality, creative work or somewhere entirely different, your Talent Passport gives employers a more useful view of your potential.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="border-l border-[#2bd7ef]/35 pl-5">
              <Lock className="h-5 w-5 text-[#aff546]" />
              <h3 className="mt-4 font-serif text-[1.7rem]">Control your visibility</h3>
              <p className="mt-3 text-base leading-8 text-[#f7e8c6]/78">Explore opportunities openly or privately. Your profile visibility and the information employers can see remain under your control.</p>
            </div>
            <div className="border-l border-[#aff546]/35 pl-5">
              <Send className="h-5 w-5 text-[#aff546]" />
              <h3 className="mt-4 font-serif text-[1.7rem]">Connect with intention</h3>
              <p className="mt-3 text-base leading-8 text-[#f7e8c6]/78">When an employer is interested, introduction requests and connections create a considered next step instead of an unexpected handover of private details.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="rockstar" className="scroll-mt-24 bg-[#f7e8c6] text-[#08111F]">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-12 lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.55fr] lg:gap-16">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#9a6d15]">
                Rockstar Explained
              </p>
              <h2 className="mt-5 font-serif text-[2.6rem] font-bold uppercase leading-[0.94] sm:text-[3.7rem]">
                <span className="text-[#08111F]">More opportunities</span>
                <br />
                <span className="text-[#AFF546]">on your terms.</span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-[#08111F]/78">
                Rockstar helps you get discovered for one-off shifts by verified employers. It&apos;s a simple way to show you&apos;re open to short-term work, while staying in control.
              </p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <RockstarStarIcon className="h-28 w-28 sm:h-36 sm:w-36" />
            </div>
          </div>

          <div className="mt-8 pt-6">
            <h3 className="text-center text-[11px] font-bold uppercase tracking-[0.32em] text-[#9a6d15]">How Rockstar works</h3>
            <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_auto_auto] lg:gap-0 lg:divide-x lg:divide-[#08111F]/15">
              {rockstarTalentSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="lg:row-span-3 lg:grid lg:grid-rows-subgrid lg:px-6 lg:first:pl-0 lg:last:pr-0">
                    <span className={`flex h-14 items-center sm:h-20 ${step.tone === "blue" ? "text-[#2bd7ef]" : "text-[#AFF546]"}`}>
                      <Icon className={step.iconClass} aria-hidden="true" />
                    </span>
                    <h4 className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-[#08111F]">{index + 1}. {step.title}</h4>
                    <p className="mt-3 text-base leading-8 text-[#08111F]/70">{step.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#08111F] text-[#f7e8c6]">
        <div className="mx-auto max-w-[1450px] px-6 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-[#f7e8c6]">One story, two impressions</p>
          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto_auto] lg:gap-0">
            <article className="min-w-0 lg:col-start-1 lg:row-span-4 lg:grid lg:grid-rows-subgrid lg:border-r lg:border-[#f7e8c6]/20 lg:pr-12 xl:pr-16">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#aff546]">Talent Card</p>
              <h2 className="mt-4 font-serif text-[2.6rem] font-semibold uppercase leading-[0.94] sm:text-[3.7rem]">Get <span className="text-[#aff546]">discovered</span><br />by employers.</h2>
              <div className="mt-7 flex justify-center lg:h-[620px] lg:items-start lg:justify-start">
                <TalentCard profile={sarahProfile} href="/profile/sarah-jones" verificationStatus="verified" hasProAccess className="w-full max-w-[430px]" />
              </div>
              <div className="mt-8 max-w-xl border-l-2 border-[#aff546]/70 pl-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#aff546]">A first impression.</p>
                <p className="mt-3 text-base leading-8 text-[#f7e8c6]/80">Your Talent Card gets you in front of the right employers. It highlights your key skills, experience and availability so you can be discovered.</p>
              </div>
            </article>
            <article className="min-w-0 lg:col-start-2 lg:row-span-4 lg:grid lg:grid-rows-subgrid lg:pl-12 xl:pl-16">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#f2cc63]">Talent Passport</p>
              <h2 className="mt-4 font-serif text-[2.6rem] font-semibold uppercase leading-[0.94] sm:text-[3.7rem]">Help employers<br /><span className="text-[#f2cc63]">get to know you.</span></h2>
              <div className="mt-7 flex justify-center lg:h-[620px] lg:items-start lg:justify-start">
                <div className="w-full max-w-[310px] drop-shadow-[16px_24px_20px_rgba(0,0,0,0.3)] lg:h-[600px] lg:w-auto lg:max-w-full">
                  <Image src="/images/transparentpassportcover.png" alt="FreeAgentStaff Talent Passport" width={1024} height={1536} className="h-auto w-full lg:h-full lg:w-auto" />
                </div>
              </div>
              <div className="mt-8 max-w-xl border-l-2 border-[#651D2A] pl-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#f2cc63]">A lasting impression.</p>
                <p className="mt-3 text-base leading-8 text-[#f7e8c6]/80">Your Talent Passport gives employers the fuller picture. It brings together your experience, personality and what makes you, you.</p>
              </div>
            </article>
          </div>
          <div className="mt-12 grid gap-6 border-t border-[#f7e8c6]/20 pt-7 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-[#f7e8c6]/20">
            <div className="lg:px-6 lg:first:pl-0"><DiscoverSearchIcon className="h-5 w-5 text-[#2bd7ef]" artworkSizePx={52} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f7e8c6]">Get discovered</p><p className="mt-2 text-xs leading-5 text-[#f7e8c6]/65">Appear in employer searches</p></div>
            <div className="lg:px-6"><ShareYourStoryIcon className="h-5 w-5 text-[#aff546]" /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f7e8c6]">Share your story</p><p className="mt-2 text-xs leading-5 text-[#f7e8c6]/65">Show more than a résumé</p></div>
            <div className="lg:px-6"><PersonalityIcon className="h-5 w-5 text-[#aff546]" /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f7e8c6]">Show your personality</p><p className="mt-2 text-xs leading-5 text-[#f7e8c6]/65">Help employers understand you</p></div>
            <div className="lg:px-6 lg:last:pr-0"><CareerProgressIcon className="h-5 w-5 text-[#aff546]" /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f7e8c6]">Take your career further</p><p className="mt-2 text-xs leading-5 text-[#f7e8c6]/65">Your Passport goes beyond the platform</p></div>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link href="/login" className="inline-flex items-center rounded-full bg-[#aff546] px-6 py-3 text-sm font-semibold text-[#071321] transition hover:bg-[#9fea37]">Talent Sign In</Link>
            <Link href="/employers" className="text-sm font-semibold text-[#f7e8c6] underline decoration-[#2bd7ef] underline-offset-4">See the employer side</Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}