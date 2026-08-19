"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { getSessionWithRetry } from "@/lib/supabase-client";
import TalentCard from "@/components/TalentCard";
import type { DiscoveryApiResponse, DiscoveryProfileCard } from "@/types/discovery";
import type { FreeAgentProfile } from "@/types/freeagent";

type ProfileRow = {
  slug: string;
  profile: FreeAgentProfile;
  verificationStatus: DiscoveryProfileCard["verificationStatus"];
  hasProAccess: boolean;
};

type ExperienceFilter = "all" | "0-3" | "4-7" | "8-12" | "13+";
type SortOption = "recommended" | "most_experienced" | "availability";

const availabilityOptions: ReadonlyArray<string> = [
  "Any availability",
  "Available Now",
  "Open to Opportunities",
  "Open to new projects",
  "Busy this month",
  "Booked",
];

const experienceOptions: ReadonlyArray<{ value: ExperienceFilter; label: string }> = [
  { value: "all", label: "Any experience" },
  { value: "0-3", label: "0-3 years" },
  { value: "4-7", label: "4-7 years" },
  { value: "8-12", label: "8-12 years" },
  { value: "13+", label: "13+ years" },
];

const sortOptions: ReadonlyArray<{ value: SortOption; label: string }> = [
  { value: "recommended", label: "Recommended" },
  { value: "most_experienced", label: "Most experienced" },
  { value: "availability", label: "Availability" },
];

const defaultAvailability = availabilityOptions[0];
const defaultLocation = "All locations";
const defaultFocusArea = "All focus areas";
const defaultSkill = "All skills";

const availabilityRank: Record<string, number> = {
  "Available Now": 0,
  "Open to Opportunities": 1,
  "Open to new projects": 2,
  "Busy this month": 3,
  Booked: 4,
};

const isConfidentialProfile = (profile: FreeAgentProfile) =>
  (profile.visibility ?? "public") === "confidential";

const matchesExperience = (years: number, filter: ExperienceFilter) => {
  if (filter === "all") {
    return true;
  }

  if (filter === "0-3") {
    return years <= 3;
  }

  if (filter === "4-7") {
    return years >= 4 && years <= 7;
  }

  if (filter === "8-12") {
    return years >= 8 && years <= 12;
  }

  return years >= 13;
};

const normalizeSearchableText = (value: string | undefined | null) => (value ?? "").toLowerCase();

const getAccessGateCopy = (reason?: DiscoveryApiResponse["reason"]) => {
  if (reason === "wrong_account_type") {
    return "FreeAgent verifies employers before providing access to our talent network, helping create a trusted space for everyone.";
  }

  if (reason === "not_signed_in") {
    return "Sign in with your employer account to continue to Talent Search.";
  }

  return "FreeAgent verifies employers before providing access to our talent network, helping create a trusted space for everyone.";
};

export default function EmployerTalentSearch() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [savedSlugs, setSavedSlugs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [canAccessSearch, setCanAccessSearch] = useState(false);
  const [accessReason, setAccessReason] = useState<DiscoveryApiResponse["reason"]>();
  const [hasSession, setHasSession] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [availability, setAvailability] = useState<string>(defaultAvailability);
  const [focusArea, setFocusArea] = useState<string>(defaultFocusArea);
  const [location, setLocation] = useState<string>(defaultLocation);
  const [experience, setExperience] = useState<ExperienceFilter>("all");
  const [skill, setSkill] = useState<string>(defaultSkill);
  const [sort, setSort] = useState<SortOption>("recommended");
  const [error, setError] = useState(false);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(false);

    try {
      const currentSession = await getSessionWithRetry();
      setHasSession(Boolean(currentSession));

      const response = await fetch("/api/discovery", {
        method: "GET",
        headers: currentSession?.access_token
          ? {
              Authorization: `Bearer ${currentSession.access_token}`,
            }
          : undefined,
        cache: "no-store",
      });

      const payload = (await response.json()) as DiscoveryApiResponse;

      if (!payload.allowed) {
        setCanAccessSearch(false);
        setAccessReason(payload.reason);
        setProfiles([]);
        setSavedSlugs(new Set());
        return;
      }

      setCanAccessSearch(true);
      setAccessReason(undefined);
      setProfiles(
        payload.profiles.map((item) => ({
          slug: item.slug,
          profile: item.profile,
          verificationStatus: item.verificationStatus,
          hasProAccess: item.hasProAccess,
        })),
      );

      if (currentSession?.access_token) {
        const savedResponse = await fetch("/api/saved-talent", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          cache: "no-store",
        });

        const savedPayload = (await savedResponse.json().catch(() => null)) as
          | { ok?: boolean; items?: Array<{ slug?: string }> }
          | null;

        if (savedPayload?.ok && Array.isArray(savedPayload.items)) {
          setSavedSlugs(
            new Set(
              savedPayload.items
                .map((item) => item.slug)
                .filter((slug): slug is string => typeof slug === "string" && slug.length > 0),
            ),
          );
        } else {
          setSavedSlugs(new Set());
        }
      } else {
        setSavedSlugs(new Set());
      }
    } catch {
      setError(true);
      setProfiles([]);
      setSavedSlugs(new Set());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfiles();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadProfiles]);

  const focusAreas = useMemo(
    () => [defaultFocusArea, ...new Set(profiles.map((item) => item.profile.focusArea).filter((value) => Boolean(value)))],
    [profiles],
  );

  const locations = useMemo(
    () => [defaultLocation, ...new Set(profiles.map((item) => item.profile.location).filter((value) => Boolean(value)))],
    [profiles],
  );

  const skills = useMemo(
    () => [
      defaultSkill,
      ...new Set(
        profiles.flatMap((item) => item.profile.skills).filter((value) => Boolean(value)),
      ),
    ],
    [profiles],
  );

  const clearFilters = () => {
    setSearchTerm("");
    setAvailability(defaultAvailability);
    setFocusArea(defaultFocusArea);
    setLocation(defaultLocation);
    setExperience("all");
    setSkill(defaultSkill);
    setSort("recommended");
  };

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    availability !== defaultAvailability ||
    focusArea !== defaultFocusArea ||
    location !== defaultLocation ||
    experience !== "all" ||
    skill !== defaultSkill;

  const filteredProfiles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return profiles.filter((item) => {
      const profile = item.profile;
      const profileSearchText = [
        normalizeSearchableText(profile.title),
        normalizeSearchableText(profile.focusArea),
        normalizeSearchableText(profile.topStrength),
        normalizeSearchableText(profile.location),
        normalizeSearchableText(profile.summary),
        normalizeSearchableText(profile.name),
        profile.skills.map((itemSkill) => itemSkill.toLowerCase()).join(" "),
      ].join(" ");

      const matchesQuery = query.length === 0 || profileSearchText.includes(query);
      const matchesAvailability = availability === defaultAvailability || profile.availability === availability;
      const matchesFocusArea = focusArea === defaultFocusArea || profile.focusArea === focusArea;
      const matchesLocation = location === defaultLocation || profile.location === location;
      const matchesSkill = skill === defaultSkill || profile.skills.includes(skill);
      const matchesExperienceFilter = matchesExperience(profile.experienceYears, experience);

      return matchesQuery && matchesAvailability && matchesFocusArea && matchesLocation && matchesExperienceFilter && matchesSkill;
    });
  }, [profiles, searchTerm, availability, focusArea, location, experience, skill]);

  const sortedProfiles = useMemo(() => {
    if (sort === "recommended") {
      return filteredProfiles;
    }

    const rows = [...filteredProfiles];

    if (sort === "most_experienced") {
      rows.sort((a, b) => b.profile.experienceYears - a.profile.experienceYears);
      return rows;
    }

    rows.sort((a, b) => {
      const aRank = availabilityRank[a.profile.availability] ?? 999;
      const bRank = availabilityRank[b.profile.availability] ?? 999;

      if (aRank !== bRank) {
        return aRank - bRank;
      }

      return b.profile.experienceYears - a.profile.experienceYears;
    });

    return rows;
  }, [filteredProfiles, sort]);

  if (!isLoading && !canAccessSearch) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="rounded-[36px] border border-[#cda64d]/45 bg-[#f7ebcf]/90 p-8 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)] sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">EMPLOYER VERIFICATION REQUIRED</p>
          <h2 className="mt-4 text-3xl font-black uppercase tracking-[0.12em] text-[#0f2744] sm:text-4xl">
            UNLOCK TALENT SEARCH
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#27405f]">
            {getAccessGateCopy(accessReason)}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {hasSession ? (
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#0f2744]/25 bg-[#0f2744] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
              >
                Complete employer verification
              </Link>
            ) : (
              <Link
                href="/employer/auth"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#0f2744]/25 bg-[#0f2744] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
              >
                Create employer account
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
      <div className="rounded-[36px] border border-[#cda64d]/45 bg-[#f7ebcf]/78 p-5 shadow-[0_18px_55px_rgba(6,16,33,0.12)] sm:p-7 lg:p-8">
        <header className="grid gap-6 border-b border-[#cda64d]/30 pb-7 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">PREMIUM TALENT</p>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-[0.12em] text-[#0f2744] sm:text-5xl">FIND TALENT</h1>
            <p className="mt-3 text-base font-semibold text-[#17355f] sm:text-lg">Discover people worth meeting.</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#27405f] sm:text-base">
              Discover experienced professionals open to their next move - including talent exploring opportunities discreetly.
            </p>
          </div>
          <div className="rounded-[24px] border border-[#cda64d]/35 bg-[#0f2744] p-4 text-[#f7ebcf] shadow-[0_12px_40px_rgba(6,16,33,0.14)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">{sortedProfiles.length} TALENT PROFILES</p>
            <p className="mt-3 text-sm leading-7 text-[#dfe7ef]">People open to the right opportunity.</p>
            <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[#f2cc63]">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Sort: {sortOptions.find((option) => option.value === sort)?.label}
            </div>
          </div>
        </header>

        <div className="mt-5 rounded-[24px] border border-[#f2cc63]/35 bg-[#0f2744] p-3 shadow-[0_12px_32px_rgba(6,16,33,0.16)] sm:p-4">
          <label htmlFor="talent-search" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f2cc63]">
            Search
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#9a6d15]">
              <Search className="h-4 w-4" />
            </span>
            <input
              id="talent-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by role, skill or keyword"
              className="h-12 w-full rounded-[16px] border border-[#f2cc63]/35 bg-[#f7ebcf] px-10 text-sm font-semibold text-[#071426] outline-none transition placeholder:text-[#6f7f92] focus:border-[#8be4c5]"
            />
          </div>
          <p className="mt-2 text-xs text-[#dfe7ef]">e.g. Venue Manager, events, operations, leadership</p>
        </div>

        <div className="mt-5 rounded-[24px] border border-[#2bd7ef]/25 bg-[#17355f] p-3 shadow-[0_12px_32px_rgba(6,16,33,0.16)] sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">Filters</p>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="inline-flex min-h-11 items-center rounded-full border border-[#f2cc63]/45 px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition disabled:cursor-not-allowed disabled:opacity-45 hover:bg-[#f2cc63]/15"
            >
              Clear filters
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.15fr_1fr_1fr_1fr_1fr_0.9fr]">
            <div>
              <label htmlFor="filter-location" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfe7ef]">
                Location
              </label>
              <select
                id="filter-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="h-11 w-full rounded-[14px] border border-[#f2cc63]/35 bg-[#f7ebcf] px-3 text-sm text-[#0f2744] outline-none focus:border-[#8be4c5]"
              >
                {locations.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

              <div>
                <label htmlFor="filter-experience" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfe7ef]">
                  Experience
                </label>
                <select
                  id="filter-experience"
                  value={experience}
                  onChange={(event) => setExperience(event.target.value as ExperienceFilter)}
                  className="h-11 w-full rounded-[14px] border border-[#f2cc63]/35 bg-[#f7ebcf] px-3 text-sm text-[#0f2744] outline-none focus:border-[#8be4c5]"
                >
                  {experienceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-availability" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfe7ef]">
                  Availability
                </label>
                <select
                  id="filter-availability"
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value)}
                  className="h-11 w-full rounded-[14px] border border-[#f2cc63]/35 bg-[#f7ebcf] px-3 text-sm text-[#0f2744] outline-none focus:border-[#8be4c5]"
                >
                  {availabilityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-skills" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfe7ef]">
                  Skills
                </label>
                <select
                  id="filter-skills"
                  value={skill}
                  onChange={(event) => setSkill(event.target.value)}
                  className="h-11 w-full rounded-[14px] border border-[#f2cc63]/35 bg-[#f7ebcf] px-3 text-sm text-[#0f2744] outline-none focus:border-[#8be4c5]"
                >
                  {skills.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-focus" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfe7ef]">
                  Focus area
                </label>
                <select
                  id="filter-focus"
                  value={focusArea}
                  onChange={(event) => setFocusArea(event.target.value)}
                  className="h-11 w-full rounded-[14px] border border-[#f2cc63]/35 bg-[#f7ebcf] px-3 text-sm text-[#0f2744] outline-none focus:border-[#8be4c5]"
                >
                  {focusAreas.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

            <div>
              <label htmlFor="sort-results" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfe7ef]">
                Sort
              </label>
              <select
                id="sort-results"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="h-11 w-full rounded-[14px] border border-[#f2cc63]/35 bg-[#f7ebcf] px-3 text-sm text-[#0f2744] outline-none focus:border-[#8be4c5]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!isLoading && sortedProfiles.some((item) => isConfidentialProfile(item.profile)) ? (
          <div className="rounded-[30px] border border-[#cda64d]/55 bg-[#0f2744] p-6 text-[#f7ebcf] shadow-[0_12px_40px_rgba(6,16,33,0.2)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">Confidential Mode</p>
            <p className="mt-3 text-sm leading-7 text-[#dfe7ef]">
              Confidential profiles remain anonymised by design and are surfaced only through employer-authorized information.
            </p>
          </div>
        ) : null}

        <div className="mt-6">

        {isLoading ? (
          <div role="status" aria-live="polite" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`loading-skeleton-${index}`}
                className="aspect-[2.5/3.465] w-full rounded-[28px] border border-[#cda64d]/35 bg-[#fff5db]/70 p-4 shadow-[0_10px_28px_rgba(7,19,38,0.1)]"
              >
                <div className="h-full w-full animate-pulse rounded-[20px] bg-[linear-gradient(135deg,rgba(15,39,68,0.08)_0%,rgba(15,39,68,0.2)_100%)]" />
              </div>
            ))}
            <span className="sr-only">Loading talent profiles</span>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-[36px] border border-[#cda64d]/45 bg-[#fee3b6]/30 p-10 text-[#0f2744] shadow-[0_18px_55px_rgba(6,16,33,0.12)]">
            <p className="text-lg font-semibold uppercase tracking-[0.24em] text-[#0f2744]">WE COULDN&apos;T LOAD TALENT</p>
            <p className="mt-3 text-sm leading-7">Something went wrong while loading the talent network.</p>
            <button
              type="button"
              onClick={() => void loadProfiles()}
              className="mt-5 inline-flex min-h-11 items-center rounded-full border border-[#0f2744]/25 bg-[#0f2744] px-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
            >
              Try again
            </button>
          </div>
        ) : profiles.length === 0 ? (
          <div className="rounded-[36px] border border-[#cda64d]/45 bg-[#f7ebcf]/90 p-10 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)]">
            <p className="text-lg font-black uppercase tracking-[0.24em] text-[#0f2744]">NEW TALENT IS ON THE WAY</p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#27405f]">
              There aren&apos;t any matching profiles available right now. Check back as the FreeAgent network grows.
            </p>
          </div>
        ) : sortedProfiles.length === 0 ? (
          <div className="rounded-[36px] border border-[#cda64d]/45 bg-[#f7ebcf]/90 p-10 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)]">
            <p className="text-lg font-black uppercase tracking-[0.24em] text-[#0f2744]">NO EXACT MATCHES YET</p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#27405f]">
              Try broadening your search or clearing a filter.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 inline-flex min-h-11 items-center rounded-full border border-[#0f2744]/25 bg-[#0f2744] px-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sortedProfiles.map((item) => (
              <TalentCard
                key={item.slug}
                profile={item.profile}
                href={`/talent/${item.slug}`}
                verificationStatus={item.verificationStatus}
                hasProAccess={item.hasProAccess}
                presentation="employer"
                showSaveAction
                initiallySaved={savedSlugs.has(item.slug)}
                onSavedChange={(nextSaved) => {
                  setSavedSlugs((previous) => {
                    const next = new Set(previous);
                    if (nextSaved) {
                      next.add(item.slug);
                    } else {
                      next.delete(item.slug);
                    }
                    return next;
                  });
                }}
                className="w-full"
              />
            ))}
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
