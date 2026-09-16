import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BillingButton from "@/components/BillingButton";
import EmployerPricingButton from "@/components/EmployerPricingButton";
import FreeAgentProBadge from "@/components/FreeAgentProBadge";
import { CANONICAL_PRICING_PLANS } from "@/lib/talent-subscription";
export const metadata: Metadata = {
  title: "Pricing",
  description: "Explore Free Agent Staff plans for professionals creating Talent Passports and employers discovering talent.",
  alternates: { canonical: "/pricing" },
  openGraph: { url: "https://freeagentstaff.com/pricing" },
};

const basicTalentFeatureColumns = [
  [
    "FreeAgent Card",
    "Profile photo",
    "Resume upload",
    "Privacy controls",
    "Employer connections",
  ],
  [
    "Talent Passport",
    "Experience, skills & more",
    "Availability & salary",
    "Verified employer network",
  ],
];

const proTalentFeatures = [
  "Everything in FreeAgent Basic",
  "Video Introduction",
  "Profile Views",
  "Employer Saves analytics",
];

const PLAN_PILL_BASE = "-ml-5 inline-flex items-center rounded-full px-5 py-2 text-2xl font-black uppercase tracking-[0.08em] text-[#08111F] sm:-ml-6 sm:px-6 sm:py-2.5 sm:text-3xl";

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </svg>
  );
}

function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="8.5" cy="8" r="2.8" />
      <circle cx="16.5" cy="9" r="2.3" />
      <path d="M3 19c.9-3.2 3-4.8 5.5-4.8s4.6 1.6 5.5 4.8" />
      <path d="M14.8 14.6c2 .2 3.6 1.7 4.2 4.4" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z" />
      <path d="M12.5 13.5 21 3" />
    </svg>
  );
}

function IntroHighlightRow({ icon, label, colorClass }: { icon: ReactNode; label: string; colorClass: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${colorClass}`}>{icon}</span>
      <span className="text-sm font-medium text-[#F7F4EC]/85">{label}</span>
    </li>
  );
}

export default function PricingPage() {
  const basicPlan = CANONICAL_PRICING_PLANS.find((plan) => plan.code === "free_agent");
  const proPlan = CANONICAL_PRICING_PLANS.find((plan) => plan.code === "free_agent_pro");
  const employerPlan = CANONICAL_PRICING_PLANS.find((plan) => plan.code === "employer");

  if (!basicPlan || !proPlan || !employerPlan) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#08111F] text-[#071426]">
      <Navbar />
      <div className="flex-1 mx-auto w-full max-w-[86rem] px-6 py-12 sm:px-8 lg:px-8">
        <div className="mx-auto mb-14 max-w-4xl rounded-[36px] border border-[#cda64d]/40 bg-[#f7e8c6] p-6 text-center shadow-[0_18px_55px_rgba(6,16,33,0.12)] sm:p-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#08111F]">
              Pricing
            </p>
            <h1 className="text-4xl font-black uppercase tracking-[0.08em] text-[#08111F] sm:text-5xl">
              Simple plans. Real opportunities.
            </h1>
            <p className="text-base leading-8 text-[#08111F]">
              Whether you&apos;re showcasing your talent or finding the right people, we&apos;ve got a plan for you.
            </p>
            <p className="rounded-2xl bg-[#AFF546] px-4 py-3 text-sm font-semibold text-[#08111F]">
              Fairness guarantee: Pro does not influence ranking, ordering, or eligibility in talent discovery.
            </p>
          </div>
        </div>

        <section className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start lg:gap-8">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#AFF546]">For Talent</p>
            <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.04em] text-[#F7F4EC] lg:text-3xl">
              Create your profile, get discovered and unlock more opportunities.
            </h2>
            <ul className="mt-6 space-y-3">
              <IntroHighlightRow icon={<PersonIcon className="h-4 w-4" />} label="Showcase your skills" colorClass="border-[#AFF546]/40 text-[#AFF546]" />
              <IntroHighlightRow icon={<EyeIcon className="h-4 w-4" />} label="Be discovered by employers" colorClass="border-[#AFF546]/40 text-[#AFF546]" />
              <IntroHighlightRow icon={<BoltIcon className="h-4 w-4" />} label="Take control of your career" colorClass="border-[#AFF546]/40 text-[#AFF546]" />
            </ul>
          </div>

          <div className="flex flex-wrap items-start gap-4">
            <div className="w-full rounded-[36px] border border-[#cda64d]/40 bg-[#f7ebcf] p-8 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)] sm:w-[calc(50%-0.5rem)] lg:w-[350px]">
              <p className={`${PLAN_PILL_BASE} bg-[#AFF546]`}>BASIC</p>
              <p className="mt-2 text-4xl font-black tracking-[0.1em] text-[#08111F]">FREE</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#27405f]">{basicPlan.cadenceLabel}</p>
              <p className="mt-6 text-sm leading-7 text-[#27405f]">Create your FreeAgent Card and Talent Passport. Get discovered by employers.</p>
              <div className="mt-6 grid gap-x-6 sm:grid-cols-2">
                {basicTalentFeatureColumns.map((features, columnIndex) => (
                  <ul key={columnIndex} className="space-y-2 text-sm text-[#27405f]">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#cda64d]" /><span className="leading-[1.08]">{feature}</span></li>
                    ))}
                  </ul>
                ))}
              </div>
              <Link href="/login?mode=signup" className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#AFF546] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#08111F] transition hover:brightness-105">Create your card</Link>
            </div>

            <div className="w-full rounded-[36px] border border-[#cda64d]/40 bg-[#f7ebcf] p-8 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)] sm:w-[calc(50%-0.5rem)] lg:w-[350px]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`${PLAN_PILL_BASE} bg-[#AFF546]`}>PRO</p>
                  <p className="mt-2 text-4xl font-black tracking-[0.1em] text-[#08111F]">{proPlan.priceLabel}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#27405f]">{proPlan.cadenceLabel}</p>
                </div>
                <FreeAgentProBadge size="large" />
              </div>
              <p className="mt-6 text-sm leading-7 text-[#27405f]">Everything in FreeAgent Basic, plus more ways to showcase yourself and understand employer interest.</p>
              <ul className="mt-6 space-y-2 text-sm text-[#27405f]">
                {proTalentFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#f2cc63]" /><span className="leading-[1.08]">{feature}</span></li>
                ))}
              </ul>
              <BillingButton action="checkout" plan="free_agent_pro" className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#AFF546] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#08111F] transition hover:brightness-105">Go Pro</BillingButton>
            </div>

            <div className="hidden xl:flex xl:w-[10rem] xl:shrink-0 xl:items-center xl:justify-center">
              <Image
                src="/images/moreopps.png"
                alt=""
                aria-hidden="true"
                width={440}
                height={440}
                className="h-auto w-full max-w-[10rem] object-contain"
              />
            </div>
          </div>
        </section>

        <div className="my-14 flex items-center gap-4 sm:my-16">
          <div className="h-px flex-1 bg-[#F7F4EC]/15" />
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#F7F4EC]/50">Or find great talent</span>
          <div className="h-px flex-1 bg-[#F7F4EC]/15" />
        </div>

        <section className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start lg:gap-8">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#2BD7EF]">For Employers</p>
            <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.04em] text-[#F7F4EC] lg:text-3xl">
              Find the right people, faster. Connect with talent for ongoing or short-term opportunities.
            </h2>
            <ul className="mt-6 space-y-3">
              <IntroHighlightRow icon={<SearchIcon className="h-4 w-4" />} label="Search verified talent" colorClass="border-[#2BD7EF]/40 text-[#2BD7EF]" />
              <IntroHighlightRow icon={<PeopleIcon className="h-4 w-4" />} label="Save talent and build shortlists" colorClass="border-[#2BD7EF]/40 text-[#2BD7EF]" />
              <IntroHighlightRow icon={<SendIcon className="h-4 w-4" />} label="Send introductions" colorClass="border-[#2BD7EF]/40 text-[#2BD7EF]" />
            </ul>
          </div>

          <div className="flex flex-wrap items-start gap-4">
            <div className="w-full rounded-[36px] border border-[#cda64d]/40 bg-[#f7ebcf] p-8 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)] sm:w-[calc(50%-0.5rem)] lg:w-[350px]">
              <p className={`${PLAN_PILL_BASE} bg-[#2BD7EF]`}>EMPLOYER</p>
              <p className="mt-2 text-4xl font-black tracking-[0.1em] text-[#08111F]">{employerPlan.priceLabel}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#27405f]">{employerPlan.cadenceLabel}</p>
              <p className="mt-6 text-sm leading-7 text-[#27405f]">{employerPlan.description}</p>
              <ul className="mt-6 space-y-2 text-sm text-[#27405f]">{employerPlan.bullets.map((feature) => <li key={feature} className="flex items-start gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#cda64d]" /><span className="leading-[1.08]">{feature === "Verified employer discovery" ? "Employer Talent discovery" : feature}</span></li>)}</ul>
              <EmployerPricingButton className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#2BD7EF] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#08111F] transition hover:brightness-105" />
            </div>
            <div className="w-full rounded-[36px] border border-[#cda64d]/40 bg-[#f7ebcf] p-8 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)] sm:w-[calc(50%-0.5rem)] lg:w-[350px]">
              <p className={`${PLAN_PILL_BASE} bg-[#2BD7EF]`}>SHORT STAY</p>
              <p className="mt-2 text-4xl font-black tracking-[0.1em] text-[#08111F]">$20 AUD</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#27405f]">3 days access</p>
              <p className="mt-6 text-sm leading-7 text-[#27405f]">
                A one-off pass for employers who need short-term cover. Get 3 days of Talent Search access to a pool of Talent available for one-off shifts, no subscription required.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-[#27405f]">
                {[
                  "3 days of Talent Search access",
                  "One-time payment, no subscription",
                  "Request introductions using the same trusted workflow",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#cda64d]" /><span className="leading-[1.08]">{feature}</span></li>
                ))}
              </ul>
              <BillingButton action="checkout" plan="short_stay_employer" className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#2BD7EF] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#08111F] transition hover:brightness-105">Get Short Stay access</BillingButton>
            </div>

            <div className="hidden xl:flex xl:w-[10rem] xl:shrink-0 xl:items-center xl:justify-center">
              <Image
                src="/images/perfect.png"
                alt=""
                aria-hidden="true"
                width={440}
                height={440}
                className="h-auto w-full max-w-[10rem] object-contain"
              />
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
