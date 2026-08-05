"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import FreeAgentCard from "@/components/cards/FreeAgentCard";
import type { FreeAgentProfile } from "@/types/freeagent";

type ProfileRow = {
  slug: string;
  profile: FreeAgentProfile;
};

const availabilityOptions = [
  "All",
  "Available Now",
  "Open to Opportunities",
  "Open to new projects",
  "Busy this month",
  "Booked",
] as const;

export default function EmployerTalentSearch() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [availability, setAvailability] = useState<string>("All");
  const [focusArea, setFocusArea] = useState<string>("All");
  const [location, setLocation] = useState<string>("All");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfiles() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("slug, profile")
        .not("slug", "is", null)
        .order("updated_at", { ascending: false });

      if (!mounted) {
        return;
      }

      if (error) {
        setError(error.message);
        setProfiles([]);
      } else if (data) {
        const rows = (data as Array<{ slug?: string | null; profile?: unknown }> | null)
          ?.filter((row): row is { slug: string; profile: unknown } => typeof row.slug === "string" && row.profile !== null)
          .map((row) => ({
            slug: row.slug,
            profile: row.profile as FreeAgentProfile,
          })) ?? [];

        setProfiles(rows);
      }

      setIsLoading(false);
    }

    loadProfiles();

    return () => {
      mounted = false;
    };
  }, []);

  const visibleProfiles = useMemo(
    () => profiles.filter((item) => (item.profile.visibility ?? "public") === "public"),
    [profiles],
  );

  const focusAreas = useMemo(
    () => ["All", ...new Set(visibleProfiles.map((item) => item.profile.focusArea).filter(Boolean))],
    [visibleProfiles],
  );

  const locations = useMemo(
    () => ["All", ...new Set(visibleProfiles.map((item) => item.profile.location).filter(Boolean))],
    [visibleProfiles],
  );

  const filteredProfiles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return visibleProfiles.filter((item) => {
      const profile = item.profile;
      const matchesQuery =
        query === "" ||
        [profile.name, profile.title, profile.location, profile.focusArea, profile.topStrength]
          .join(" ")
          .toLowerCase()
          .includes(query) ||
        profile.skills.some((skill) => skill.toLowerCase().includes(query));

      const matchesAvailability = availability === "All" || profile.availability === availability;
      const matchesFocus = focusArea === "All" || profile.focusArea === focusArea;
      const matchesLocation = location === "All" || profile.location === location;

      return matchesQuery && matchesAvailability && matchesFocus && matchesLocation;
    });
  }, [visibleProfiles, availability, focusArea, location, searchTerm]);

  return (
    <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-8 lg:px-12">
      <div className="grid gap-8 rounded-[36px] border border-[#cda64d]/45 bg-[#f7ebcf]/70 p-6 shadow-[0_18px_55px_rgba(6,16,33,0.12)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
              Live talent search
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.12em] text-[#0f2744] sm:text-4xl">
              Filter public profiles the way hiring teams expect.
            </h2>
          </div>
          <div className="rounded-[24px] border border-[#cda64d]/35 bg-[#0f2744] p-4 text-[#f7ebcf] shadow-[0_12px_40px_rgba(6,16,33,0.14)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">Talent live count</p>
            <p className="mt-3 text-3xl font-black text-[#f7ebcf]">{filteredProfiles.length}</p>
            <p className="mt-2 text-sm text-[#dfe7ef]">public profiles available now</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1.3fr_0.7fr] lg:grid-cols-[1.6fr_1fr]">
          <label className="relative block w-full rounded-[24px] border border-[#cda64d]/30 bg-white/90 shadow-sm">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#9a6d15]">
              <Search className="h-4 w-4" />
            </span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, title, skill or location"
              className="w-full rounded-[24px] border-none bg-transparent px-12 py-4 text-sm font-semibold text-[#071426] outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-[#cda64d]/30 bg-white/90 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Availability</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {availabilityOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAvailability(option)}
                    className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition ${
                      availability === option
                        ? "bg-[#0f2744] text-[#f7ebcf]"
                        : "bg-[#f7ebcf]/80 text-[#0f2744] hover:bg-[#f7ebcf]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-[#cda64d]/30 bg-white/90 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Focus area</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {focusAreas.slice(0, 6).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFocusArea(option)}
                    className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition ${
                      focusArea === option
                        ? "bg-[#0f2744] text-[#f7ebcf]"
                        : "bg-[#f7ebcf]/80 text-[#0f2744] hover:bg-[#f7ebcf]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[24px] border border-[#cda64d]/30 bg-white/90 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Location</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {locations.slice(0, 6).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLocation(option)}
                  className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition ${
                    location === option
                      ? "bg-[#0f2744] text-[#f7ebcf]"
                      : "bg-[#f7ebcf]/80 text-[#0f2744] hover:bg-[#f7ebcf]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#cda64d]/30 bg-[#0f2744] p-5 text-[#f7ebcf] shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
              <Sparkles className="h-4 w-4" />
              Premium filters
            </div>
            <p className="mt-3 text-sm leading-7 text-[#dfe7ef]">
              Use search and filters to narrow talent by outcome, availability and experience quickly.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 sm:px-8 lg:px-12">
        {isLoading ? (
          <div className="rounded-[36px] border border-[#cda64d]/45 bg-[#0f2744]/20 p-10 text-[#0f2744] shadow-[0_18px_55px_rgba(6,16,33,0.12)]">
            <p className="text-lg font-semibold uppercase tracking-[0.24em] text-[#0f2744]">Loading talent...</p>
          </div>
        ) : error ? (
          <div className="rounded-[36px] border border-[#cda64d]/45 bg-[#fee3b6]/30 p-10 text-[#0f2744] shadow-[0_18px_55px_rgba(6,16,33,0.12)]">
            <p className="text-lg font-semibold uppercase tracking-[0.24em] text-[#0f2744]">Unable to load profiles</p>
            <p className="mt-3 text-sm leading-7">{error}</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="rounded-[36px] border border-[#cda64d]/45 bg-[#f7ebcf]/90 p-10 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)]">
            <p className="text-lg font-black uppercase tracking-[0.24em] text-[#0f2744]">No talent matched yet</p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#27405f]">
              Try broadening your search, clearing the filters, or checking back once more profiles are published.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
            {filteredProfiles.map((item) => (
              <div key={item.slug} className="group">
                <FreeAgentCard
                  profile={item.profile}
                  href={`/talent/${item.slug}`}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
