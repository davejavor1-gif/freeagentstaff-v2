import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="mb-12 space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#9a6d15]">
            Pricing
          </p>
          <h1 className="text-4xl font-black uppercase tracking-[0.12em] text-[#0f2744] sm:text-5xl">
            Simple, premium plans for modern hiring teams.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[#27405f]">
            Choose the tier that fits your team. Every plan includes curated public talent search, polished candidate profiles, and fast access to the people you want to interview.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: "Starter",
              price: "$99",
              description: "Best for small teams testing premium talent discovery.",
              features: ["Search public profiles", "Saved searches", "Email support"],
            },
            {
              title: "Growth",
              price: "$249",
              description: "Great for hiring managers who want a curated shortlist.",
              features: ["Priority search", "Advanced filters", "Team seats"],
              featured: true,
            },
            {
              title: "Enterprise",
              price: "Custom",
              description: "Built for larger teams and bespoke talent programs.",
              features: ["Dedicated onboarding", "Custom reporting", "API access"],
            },
          ].map((plan) => (
            <div
              key={plan.title}
              className={`rounded-[36px] border border-[#cda64d]/40 p-8 shadow-[0_18px_55px_rgba(6,16,33,0.12)] ${
                plan.featured ? "bg-[#0f2744] text-[#f7ebcf]" : "bg-[#f7ebcf] text-[#071426]"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                    {plan.title}
                  </p>
                  <p className="mt-2 text-4xl font-black tracking-[0.1em]">{plan.price}</p>
                </div>
                {plan.featured ? (
                  <span className="rounded-full border border-[#f2cc63]/40 bg-[#f2cc63]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f7ebcf]">
                    Most popular
                  </span>
                ) : null}
              </div>
              <p className={`mt-6 text-sm leading-7 ${plan.featured ? "text-[#dfe7ef]" : "text-[#27405f]"}`}>
                {plan.description}
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#cda64d]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/find-talent"
                className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] transition ${
                  plan.featured
                    ? "bg-[#f2cc63] text-[#0f2744] hover:bg-[#f7ebcf]"
                    : "bg-[#0f2744] text-[#f7ebcf] hover:bg-[#17355f]"
                }`}
              >
                Explore talent
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
