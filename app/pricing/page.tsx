import Link from "next/link";
import type { Metadata } from "next";
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
    "One profile photo",
    "Resume upload",
    "Privacy & Visibility controls",
    "Accept employer connections",
  ],
  [
    "Talent Passport",
    "Experience, education, skills and languages",
    "Availability and salary expectations",
    "Verified employer network and confidential visibility options",
  ],
];

const proTalentFeatures = [
  "Everything in FreeAgent Basic",
  "Video Introduction",
  "Profile Views",
  "Employer Saves analytics",
];

const PLAN_PILL_BASE = "-ml-5 inline-flex items-center rounded-full px-5 py-2 text-2xl font-black uppercase tracking-[0.08em] text-[#08111F] sm:-ml-6 sm:px-6 sm:py-2.5 sm:text-3xl";

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
      <div className="flex-1 mx-auto w-full max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="mb-12 rounded-[36px] border border-[#cda64d]/40 bg-[#f7e8c6] p-6 shadow-[0_18px_55px_rgba(6,16,33,0.12)] sm:p-10">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#08111F]">
              Pricing
            </p>
            <h1 className="text-4xl font-black uppercase tracking-[0.12em] text-[#08111F] sm:text-5xl">
              Clear plans for free agents and employers.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[#08111F]">
              Choose the Talent profile features that suit you, or unlock verified employer access to discover and connect with Talent.
            </p>
            <p className="max-w-2xl rounded-2xl bg-[#AFF546] px-4 py-3 text-sm font-semibold text-[#08111F]">
              Fairness guarantee: Pro does not influence ranking, ordering, or eligibility in talent discovery.
            </p>
          </div>
        </div>

        <section>
          <div className="mt-4 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[36px] border border-[#cda64d]/40 bg-[#f7ebcf] p-8 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)]">
              <p className={`${PLAN_PILL_BASE} bg-[#AFF546]`}>BASIC</p>
              <p className="mt-2 text-4xl font-black tracking-[0.1em] text-[#08111F]">FREE</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#27405f]">{basicPlan.cadenceLabel}</p>
              <p className="mt-6 text-sm leading-7 text-[#27405f]">Create your FreeAgent Card and Talent Passport and be discovered by employers.</p>
              <div className="mt-6 grid gap-x-6 sm:grid-cols-2">
                {basicTalentFeatureColumns.map((features, columnIndex) => (
                  <ul key={columnIndex} className="space-y-2 text-sm text-[#27405f]">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#cda64d]" /><span className="leading-[1.08]">{feature}</span></li>
                    ))}
                  </ul>
                ))}
              </div>
              <Link href="/builder" className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#AFF546] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#08111F] transition hover:brightness-105">Create your card</Link>
            </div>

            <div className="rounded-[36px] border border-[#cda64d]/40 bg-[#f7ebcf] p-8 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)]">
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
            <div className="rounded-[36px] border border-[#cda64d]/40 bg-[#f7ebcf] p-8 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)]">
              <p className={`${PLAN_PILL_BASE} bg-[#2BD7EF]`}>EMPLOYER</p>
              <p className="mt-2 text-4xl font-black tracking-[0.1em] text-[#08111F]">{employerPlan.priceLabel}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#27405f]">{employerPlan.cadenceLabel}</p>
              <p className="mt-6 text-sm leading-7 text-[#27405f]">{employerPlan.description}</p>
              <ul className="mt-6 space-y-2 text-sm text-[#27405f]">{employerPlan.bullets.map((feature) => <li key={feature} className="flex items-start gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#cda64d]" /><span className="leading-[1.08]">{feature === "Verified employer discovery" ? "Employer Talent discovery" : feature}</span></li>)}</ul>
              <EmployerPricingButton className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#2BD7EF] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#08111F] transition hover:brightness-105" />
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
