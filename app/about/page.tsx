import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
      <Navbar />
      <div className="flex-1 mx-auto w-full max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="space-y-6 rounded-[36px] border border-[#cda64d]/50 bg-[#0f2744] p-8 text-[#f7ebcf] shadow-[0_18px_55px_rgba(6,16,33,0.18)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#f2cc63]">
            About FreeAgentStaff
          </p>
          <h1 className="text-4xl font-black uppercase tracking-[0.12em] sm:text-5xl">
            Premium talent search with a quiet, curated edge.
          </h1>
          <p className="max-w-3xl text-base leading-8 text-[#dfe7ef]">
            We help hiring teams discover public talent profiles that feel polished, thoughtful and easy to evaluate. Every profile is designed to communicate impact, skills and availability clearly.
          </p>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Curated visibility",
                text: "Public talent profiles are built to be discovered by hiring teams, not lost in search results.",
              },
              {
                title: "Quality first",
                text: "We keep the experience premium with polished storytelling, clean filters and a refined interface.",
              },
              {
                title: "Fast decisions",
                text: "Find the right candidate quickly with clear contact details, strengths and role context.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[28px] border border-[#f2cc63]/20 bg-[#f7ebcf]/10 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                  {item.title}
                </p>
                <p className="mt-3 text-sm leading-7 text-[#dfe7ef]">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-base leading-8 text-[#dfe7ef]">
              Ready to see talent that matches your next hire? Start with the premium search experience.
            </p>
            <Link
              href="/find-talent"
              className="inline-flex items-center justify-center rounded-full bg-[#f2cc63] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#f7ebcf]"
            >
              Find talent
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
