"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import TalentCard from "@/components/TalentCard";
import type { FreeAgentProfile } from "@/types/freeagent";

const HomepageHeroVideoContext = createContext<{ request: number; play: () => void } | null>(null);

export function HomepageHeroVideoProvider({ children }: { children: ReactNode }) {
  const [playVideoRequest, setPlayVideoRequest] = useState(0);

  return <HomepageHeroVideoContext.Provider value={{ request: playVideoRequest, play: () => setPlayVideoRequest((current) => current + 1) }}>{children}</HomepageHeroVideoContext.Provider>;
}

export function HomepageHeroVideoButton() {
  const videoContext = useContext(HomepageHeroVideoContext);

  return (
    <div className="mt-7 max-sm:mt-2">
      <button
        type="button"
        onClick={() => videoContext?.play()}
        className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full border border-[#8be4c5]/70 bg-[#8be4c5]/12 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#dffcf1] shadow-[0_8px_18px_rgba(0,0,0,0.16)] transition hover:bg-[#8be4c5]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8be4c5]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426] max-[359px]:w-full sm:px-4 sm:text-[10px]"
      >
        Play video introduction
        <span className="ml-2 text-base leading-none">→</span>
      </button>
    </div>
  );
}

export function HomepageHeroVideoCard({ profile }: { profile: FreeAgentProfile }) {
  const videoContext = useContext(HomepageHeroVideoContext);

  return (
    <div className="relative mx-auto flex w-full max-w-[470px] items-center justify-center max-sm:mt-0 max-sm:mb-0 lg:max-w-[560px] lg:self-end">
      <TalentCard
        profile={profile}
        href="/profile/sarah-jones"
        verificationStatus="verified"
        hasProAccess
        playVideoRequest={videoContext?.request ?? 0}
        className="max-w-[430px]"
      />
    </div>
  );
}
