import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/marketing/Hero";
import LogoStrip from "@/components/marketing/LogoStrip";
import FeaturedCards from "@/components/marketing/FeaturedCards";
import HowItWorks from "@/components/marketing/HowItWorks";
import FreeAgentCard from "@/components/cards/FreeAgentCard";
import { freeAgentProfiles } from "@/data/freeagents";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <LogoStrip />
      <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-amber-300">
              Premium talent spotlight
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">
              Meet a standout free agent
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            This card is built to be reused across the homepage, dashboard and public profile experiences.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
            <Link
              href="/find-talent"
              className="rounded-full bg-[#0f2744] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
            >
              Find talent
            </Link>
            <Link
              href="/builder"
              className="rounded-full border border-[#cda64d]/40 bg-white/90 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#f7ebcf]"
            >
              Create your card
            </Link>
          </div>
        </div>
        <div className="flex w-full justify-center">
          <FreeAgentCard profile={freeAgentProfiles[0]} className="w-full max-w-[420px]" />
        </div>
      </section>
      <FeaturedCards />
      <HowItWorks />
    </main>
  );
}