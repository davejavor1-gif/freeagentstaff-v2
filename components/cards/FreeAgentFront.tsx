import Image from "next/image";
import { BadgeCheck, MapPin, Share2, Sparkles, Star } from "lucide-react";
import type { FreeAgentProfile } from "@/types/freeagent";
import AvailabilityBadge from "@/components/cards/AvailabilityBadge";

interface FreeAgentFrontProps {
  profile: FreeAgentProfile;
}

export default function FreeAgentFront({ profile }: FreeAgentFrontProps) {
  return (
    <div className="flex h-full w-full max-w-full flex-col overflow-hidden rounded-[32px] border border-[#cda64d]/80 bg-[#f5e7c8] p-3 text-[#071426] shadow-[0_20px_55px_rgba(4,12,25,0.34)] sm:p-4">
      <div className="flex h-full flex-col rounded-[26px] border border-[#0f2744]/70 bg-[#0e1f3a] p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[#cda64d]/50 bg-[#102744] px-3 py-2 text-[#f5e7c8]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#cda64d]/60 bg-[#f5e7c8] text-[11px] font-black uppercase tracking-[0.32em] text-[#071426]">
              FA
            </div>
            <div className="leading-none">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#f2cc63]">
                FreeAgent
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.3em] text-[#f5e7c8]/80">
                Talent card
              </p>
            </div>
          </div>
          <div className="rounded-full border border-[#cda64d]/50 bg-[#f5e7c8] p-2 text-[#0f2744]">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        <div className="relative mt-3 overflow-visible rounded-[28px] border border-[#cda64d]/40 bg-[#122744] p-2 shadow-[0_18px_40px_rgba(2,9,24,0.38)]">
          <div className="absolute left-4 top-4 z-20 rounded-full border border-[#0f2744]/70 bg-[#f5e7c8] px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-[#071426] shadow-[0_8px_18px_rgba(0,0,0,0.2)]">
            {profile.experienceYears} yrs
          </div>
          <div className="relative -mt-2 h-64 overflow-hidden rounded-[24px] border border-white/10 bg-[#0d1830] sm:h-[18rem]">
            <Image
              src={profile.photoUrl ?? "/placeholder-avatar.svg"}
              alt={profile.imageAlt ?? profile.name}
              width={520}
              height={520}
              className="h-full w-full object-cover object-center shadow-[inset_0_-20px_60px_rgba(0,0,0,0.25)]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/85 via-[#071426]/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#071426]/70 to-transparent" />
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#f2cc63]">
              Premium specialist
            </p>
            <h3 className="mt-1 text-[1.35rem] font-black uppercase leading-none tracking-[0.16em] text-[#f8efe1] sm:text-[1.55rem]">
              {profile.name}
            </h3>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.24em] text-[#f2cc63] sm:text-[0.95rem]">
              {profile.title}
            </p>
            <div className="mt-2 flex items-center gap-2 text-sm text-[#d6e0ec]">
              <MapPin className="h-4 w-4 shrink-0 text-[#f2cc63]" />
              <span className="break-words">{profile.location}</span>
            </div>
          </div>

          <div className="rounded-[16px] border border-[#cda64d]/40 bg-[#f5e7c8] px-3 py-2">
            <AvailabilityBadge status={profile.availability} className="w-full justify-center" />
          </div>

          <div className="rounded-[20px] border border-[#cda64d]/50 bg-[#122744] p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2cc63] text-[#071426]">
                <Star className="h-4 w-4 fill-current" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                Top strength
              </p>
            </div>
            <p className="mt-3 text-base font-semibold leading-6 text-[#f8efe1] break-words sm:text-lg">
              {profile.topStrength}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-[16px] border border-[#cda64d]/35 bg-[#0a1830] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d6e0ec]">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-[#f2cc63]" />
            <span>Verified</span>
          </div>
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-[#f2cc63]" />
            <span>Share</span>
          </div>
          <div className="text-[#f2cc63]">FA-{profile.id.toUpperCase()}</div>
        </div>
      </div>
    </div>
  );
}
