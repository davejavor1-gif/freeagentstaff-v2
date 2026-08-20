import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BillingButton from "@/components/BillingButton";
import EmployerPricingButton from "@/components/EmployerPricingButton";
import FreeAgentProBadge from "@/components/FreeAgentProBadge";
import { CANONICAL_PRICING_PLANS } from "@/lib/talent-subscription";

const basicTalentFeatures = [
  "FreeAgent Card",
  "Full Talent Passport",
  "One profile photo",
  "Experience, education, skills and languages",
  "Resume upload",
  "Availability and salary expectations",
  "Privacy & Visibility controls",
  "Public, Verified Employer Network and Confidential visibility options",
  "Equal exposure in Find Talent",
  "Employer saves",
  "Receive introduction requests",
  "Accept employer introductions and connections",
];

const proTalentFeatures = [
  "Everything in FreeAgent Basic",
  "Video Introduction",
  "FreeAgent Pro sport badge",
  "Profile Views",
  "Employer Saves analytics",
];

export default function PricingPage() {
  const basicPlan = CANONICAL_PRICING_PLANS.find((plan) => plan.code === "free_agent");
  const proPlan = CANONICAL_PRICING_PLANS.find((plan) => plan.code === "free_agent_pro");
  const employerPlan = CANONICAL_PRICING_PLANS.find((plan) => plan.code === "employer");

  if (!basicPlan || !proPlan || !employerPlan) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
      <Navbar />
      <div className="flex-1 mx-auto w-full max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="mb-12 space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#9a6d15]">
            Pricing
          </p>
          <h1 className="text-4xl font-black uppercase tracking-[0.12em] text-[#0f2744] sm:text-5xl">
            Clear plans for free agents and employers.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[#27405f]">
            Choose the Talent profile features that suit you, or unlock verified employer access to discover and connect with Talent.
          </p>
          <p className="max-w-2xl rounded-2xl border border-[#f2cc63]/40 bg-[#0f2744] px-4 py-3 text-sm font-semibold text-[#f7ebcf]">
            Fairness guarantee: Pro does not influence ranking, ordering, or eligibility in talent discovery.
          </p>
        </div>

        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">For Talent</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[36px] border border-[#cda64d]/40 bg-[#f7ebcf] p-8 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">FREEAGENT BASIC</p>
              <p className="mt-2 text-4xl font-black tracking-[0.1em]">FREE</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#27405f]">{basicPlan.cadenceLabel}</p>
              <p className="mt-6 text-sm leading-7 text-[#27405f]">Create your FreeAgent Card and Talent Passport and be discovered by employers.</p>
              <ul className="mt-6 grid gap-3 text-sm text-[#27405f] sm:grid-cols-2">
                {basicTalentFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#cda64d]" /><span>{feature}</span></li>
                ))}
              </ul>
              <Link href="/builder" className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#0f2744] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]">Create your card</Link>
            </div>

            <div className="rounded-[36px] border border-[#cda64d]/40 bg-[#0f2744] p-8 text-[#f7ebcf] shadow-[0_18px_55px_rgba(6,16,33,0.12)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">FREEAGENT PRO</p>
                  <p className="mt-2 text-4xl font-black tracking-[0.1em]">{proPlan.priceLabel}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#dfe7ef]">{proPlan.cadenceLabel}</p>
                </div>
                <FreeAgentProBadge size="large" />
              </div>
              <p className="mt-6 text-sm leading-7 text-[#dfe7ef]">Everything in FreeAgent Basic, plus more ways to showcase yourself and understand employer interest.</p>
              <ul className="mt-6 space-y-3 text-sm text-[#dfe7ef]">
                {proTalentFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#f2cc63]" /><span>{feature}</span></li>
                ))}
              </ul>
              <BillingButton action="checkout" plan="free_agent_pro" className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#f2cc63] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#f7ebcf]">Go Pro</BillingButton>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">For Employers</p>
          <div className="mt-4 max-w-xl rounded-[36px] border border-[#cda64d]/40 bg-[#f7ebcf] p-8 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">{employerPlan.name}</p>
            <p className="mt-2 text-4xl font-black tracking-[0.1em]">{employerPlan.priceLabel}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#27405f]">{employerPlan.cadenceLabel}</p>
            <p className="mt-6 text-sm leading-7 text-[#27405f]">{employerPlan.description}</p>
            <ul className="mt-6 space-y-3 text-sm text-[#27405f]">{employerPlan.bullets.map((feature) => <li key={feature} className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-[#cda64d]" />{feature === "Verified employer discovery" ? "Employer Talent discovery" : feature}</li>)}</ul>
            <EmployerPricingButton className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#0f2744] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]" />
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
