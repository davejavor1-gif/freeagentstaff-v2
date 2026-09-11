"use client";

import Image from "next/image";
import { Search, Send, Zap } from "lucide-react";
import TalentCard from "@/components/TalentCard";
import { homepagePassportProfiles } from "@/data/homepage-passports";
import type { AccountType } from "@/types/freeagent";

const sarah = homepagePassportProfiles["sarah-jones"];

export default function SignupBrandStory({ accountType }: { accountType: AccountType }) {
  if (accountType === "employer") {
    return (
      <div className="relative overflow-hidden bg-[#08111F] px-1 py-6 text-[#f7ebcf] sm:px-2 sm:py-10 lg:py-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#2BD7EF]/20" />
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#2BD7EF]">For employers</p>
          <h1 className="mt-6 max-w-none font-serif text-[clamp(2.4rem,4.2vw,4.5rem)] font-bold uppercase leading-[0.86]">
            FIND<br />EXCEPTIONAL<br />PEOPLE.<br /><span className="text-[#2BD7EF]">DIFFERENTLY.</span>
          </h1>
          <p className="mt-8 max-w-[38rem] text-lg leading-8 text-[#dfe7ef] sm:text-xl">Discover, connect and hire verified talent through rich professional profiles that showcase real skills, experience and personality.</p>
        </div>
        <div className="relative z-10 mt-16 grid gap-8 border-t border-[#2BD7EF]/25 pt-8 sm:grid-cols-3">
          {[{ icon: Search, title: "Discover", text: "Search and filter talent with depth and clarity." }, { icon: Send, title: "Connect", text: "Engage directly with the right people." }, { icon: Zap, title: "Hire faster", text: "Save time and find the right fit, sooner." }].map(({ icon: Icon, title, text }) => (
            <div key={title} className="border-l-2 border-[#2BD7EF]/55 pl-4">
              <Icon className="h-6 w-6 text-[#2BD7EF]" aria-hidden="true" />
              <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-[#2BD7EF]">{title}</p>
              <p className="mt-2 max-w-[14rem] text-base leading-7 text-[#dfe7ef]/80">{text}</p>
            </div>
          ))}
        </div>
        <p className="relative z-10 mt-8 text-xs font-bold uppercase tracking-[0.28em] text-[#2BD7EF]">Real people. Real potential.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-[#08111F] px-1 py-6 text-[#f7ebcf] sm:px-2 sm:py-10 lg:py-12">
      <div className="pointer-events-none absolute -left-24 bottom-[-8rem] h-80 w-80 rounded-full border border-[#AFF546]/20" />
      <div className="relative z-10">
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#AFF546]">Welcome to Free Agent Staff</p>
        <h1 className="mt-6 max-w-none font-serif text-[clamp(3rem,4.2vw,4.5rem)] font-bold uppercase leading-[0.86]">
          YOUR NEXT<br />OPPORTUNITY<br />STARTS WITH<br /><span className="text-[#AFF546]">BEING SEEN.</span>
        </h1>
        <p className="mt-8 max-w-[38rem] text-lg leading-8 text-[#dfe7ef] sm:text-xl">Create your FreeAgent Card. Build your Talent Passport. Get discovered for more than what&apos;s on paper.</p>
      </div>
      <div className="relative z-10 mt-14 flex min-h-[16.5rem] items-center justify-center sm:min-h-[28rem] lg:min-h-[33.5rem]">
        <div className="absolute left-[4%] top-2 w-[min(50vw,13rem)] rotate-[-4deg] drop-shadow-[12px_18px_18px_rgba(0,0,0,0.3)] sm:left-[10%] sm:w-[min(36vw,27rem)]">
          <TalentCard profile={sarah} href="/talent/sarah-jones" verificationStatus="verified" hasProAccess className="w-full" />
        </div>
        <div className="absolute right-[4%] bottom-[-1rem] w-[min(28vw,9rem)] rotate-[5deg] drop-shadow-[12px_18px_18px_rgba(0,0,0,0.32)] sm:right-[8%] sm:w-[min(24vw,19rem)]">
          <Image src="/images/transparentpassportcover.png" alt="FreeAgentStaff Talent Passport" width={1024} height={1536} className="h-auto w-full" />
        </div>
      </div>
      <p className="relative z-10 mt-[3.25rem] text-xs font-bold uppercase tracking-[0.28em] text-[#AFF546] sm:mt-14 lg:mt-16">One profile. Your whole professional story.</p>
    </div>
  );
}
