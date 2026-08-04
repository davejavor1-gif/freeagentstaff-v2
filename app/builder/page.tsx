"use client";

import { useState } from "react";
import FreeAgentCard from "@/components/cards/FreeAgentCard";
import { freeAgentProfiles } from "@/data/freeagents";
import type { FreeAgentProfile } from "@/types/freeagent";

const initialProfile = freeAgentProfiles[0];

export default function BuilderPage() {
  const [profile, setProfile] = useState<FreeAgentProfile>({
    ...initialProfile,
    name: initialProfile.name,
    title: initialProfile.title,
    location: initialProfile.location,
  });

  const updateTextField = (
    field: "name" | "title" | "location" | "topStrength" | "availability" | "focusArea",
    value: string,
  ) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const updateExperienceField = (value: string) => {
    setProfile((current) => ({
      ...current,
      experienceYears: Number(value) || 0,
    }));
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] px-4 py-8 text-[#071426] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-start">
        <section className="w-full rounded-[32px] border border-[#cda64d]/70 bg-[#0f2744] p-6 text-[#f7ebcf] shadow-[0_18px_55px_rgba(6,16,33,0.28)] lg:w-[40%] lg:p-8">
          <div className="inline-flex items-center rounded-full border border-[#f2cc63]/40 bg-[#f7ebcf]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
            Builder Studio
          </div>
          <h1 className="mt-6 text-3xl font-black uppercase leading-tight tracking-[0.16em] text-[#f7ebcf] sm:text-4xl">
            Create Your FreeAgent Card
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#dfe7ef]">
            Edit your profile and watch your card update live.
          </p>

          <form className="mt-8 space-y-4 rounded-[24px] border border-[#f2cc63]/35 bg-[#f7ebcf] p-5 text-[#071426]">
            <div className="space-y-2">
              <label htmlFor="name" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Name
              </label>
              <input
                id="name"
                value={profile.name}
                onChange={(event) => updateTextField("name", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none ring-0 transition focus:border-[#0f2744]"
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="title" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Professional Title
              </label>
              <input
                id="title"
                value={profile.title}
                onChange={(event) => updateTextField("title", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                placeholder="Enter your role"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="location" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Location
              </label>
              <input
                id="location"
                value={profile.location}
                onChange={(event) => updateTextField("location", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                placeholder="Enter your location"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="availability" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Availability
              </label>
              <select
                id="availability"
                value={profile.availability}
                onChange={(event) => updateTextField("availability", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
              >
                <option value="Available Now">Available Now</option>
                <option value="Open to new projects">Open to Opportunities</option>
                <option value="Booked">Booked</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="topStrength" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Top Strength
              </label>
              <input
                id="topStrength"
                value={profile.topStrength}
                onChange={(event) => updateTextField("topStrength", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                placeholder="Enter your signature strength"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="experienceYears" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Years of Experience
              </label>
              <input
                id="experienceYears"
                type="number"
                min="0"
                value={profile.experienceYears}
                onChange={(event) => updateExperienceField(event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="focusArea" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Focus Area
              </label>
              <input
                id="focusArea"
                value={profile.focusArea}
                onChange={(event) => updateTextField("focusArea", event.target.value)}
                className="w-full rounded-2xl border border-[#cda64d]/50 bg-white/80 px-4 py-3 text-sm text-[#071426] shadow-sm outline-none transition focus:border-[#0f2744]"
                placeholder="Enter your focus area"
              />
            </div>
          </form>
        </section>

        <section className="flex w-full items-center justify-center rounded-[32px] border border-[#cda64d]/70 bg-[#f7ebcf]/70 p-4 shadow-[0_18px_55px_rgba(6,16,33,0.16)] lg:w-[60%] lg:min-h-[700px] lg:p-8">
          <FreeAgentCard profile={profile} className="w-full max-w-[430px]" />
        </section>
      </div>
    </main>
  );
}
