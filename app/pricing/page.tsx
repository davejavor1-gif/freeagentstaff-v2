import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BillingButton from "@/components/BillingButton";
import { CANONICAL_PRICING_PLANS } from "@/lib/talent-subscription";

export default function PricingPage() {
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
            Pricing is transparent and server-enforced. Free Agent Pro unlocks analytics and video publishing, but never buys preferential discovery.
          </p>
          <p className="max-w-2xl rounded-2xl border border-[#cda64d]/45 bg-[#fff6de] px-4 py-3 text-sm font-semibold text-[#6f5310]">
            Fairness guarantee: Pro does not influence ranking, ordering, or eligibility in talent discovery.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {CANONICAL_PRICING_PLANS.map((plan) => (
            <div
              key={plan.code}
              className={`rounded-[36px] border border-[#cda64d]/40 p-8 shadow-[0_18px_55px_rgba(6,16,33,0.12)] ${
                plan.code === "free_agent_pro" ? "bg-[#0f2744] text-[#f7ebcf]" : "bg-[#f7ebcf] text-[#071426]"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                    {plan.name}
                  </p>
                  <p className="mt-2 text-4xl font-black tracking-[0.1em]">{plan.priceLabel}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] opacity-80">{plan.cadenceLabel}</p>
                </div>
                {plan.code === "free_agent_pro" ? (
                  <span className="rounded-full border border-[#f2cc63]/40 bg-[#f2cc63]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f7ebcf]">
                    Talent Pro
                  </span>
                ) : null}
              </div>
              <p className={`mt-6 text-sm leading-7 ${plan.code === "free_agent_pro" ? "text-[#dfe7ef]" : "text-[#27405f]"}`}>
                {plan.description}
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {plan.bullets.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#cda64d]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {plan.code === "free_agent" ? (
                <Link
                  href="/builder"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#0f2744] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
                >
                  Create your card
                </Link>
              ) : (
                <BillingButton
                  action="checkout"
                  plan={plan.code}
                  className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] transition ${
                    plan.code === "free_agent_pro"
                      ? "bg-[#f2cc63] text-[#0f2744] hover:bg-[#f7ebcf]"
                      : "bg-[#0f2744] text-[#f7ebcf] hover:bg-[#17355f]"
                  }`}
                >
                  {plan.code === "free_agent_pro" ? "Go Pro" : "Get started"}
                </BillingButton>
              )}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
