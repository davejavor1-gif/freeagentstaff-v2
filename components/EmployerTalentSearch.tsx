"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import TalentCard from "@/components/TalentCard";
import type { AccountType, EmployerVerificationStatus, FreeAgentProfile } from "@/types/freeagent";

type ProfileRow = {
  slug: string;
  profile: FreeAgentProfile;
};

type ExperienceFilter = "All" | "0-3" | "4-7" | "8-12" | "13+";
type ConfidentialFilter = "All" | "Confidential only" | "Non-confidential";
type EmployerNetworkFilter = "All" | "Verified network only" | "Outside verified network";

const availabilityOptions = [
  "All",
  "Available Now",
  "Open to Opportunities",
  "Open to new projects",
  "Busy this month",
  "Booked",
] as const;

const experienceOptions: ExperienceFilter[] = ["All", "0-3", "4-7", "8-12", "13+"];
const confidentialOptions: ConfidentialFilter[] = ["All", "Confidential only", "Non-confidential"];
const employerNetworkOptions: EmployerNetworkFilter[] = ["All", "Verified network only", "Outside verified network"];

const normalize = (value: string) => value.trim().toLowerCase();

const isConfidentialProfile = (profile: FreeAgentProfile) =>
  (profile.visibility ?? "public") === "confidential";

const getIndustry = (profile: FreeAgentProfile) => {
  const metaIndustry = (profile as FreeAgentProfile & { industry?: unknown }).industry;

  if (typeof metaIndustry === "string" && metaIndustry.trim().length > 0) {
    return metaIndustry.trim();
  }

  return profile.focusArea || "General";
};

const toBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();

    if (lowered === "true") {
      return true;
    }

    if (lowered === "false") {
      return false;
    }
  }

  return null;
};

const isPublishedProfile = (profile: FreeAgentProfile) => {
  const meta = profile as FreeAgentProfile & {
    published?: unknown;
    isPublished?: unknown;
    searchPublished?: unknown;
    status?: unknown;
    profileStatus?: unknown;
  };

  const explicitFlags = [meta.published, meta.isPublished, meta.searchPublished]
    .map(toBoolean)
    .filter((flag): flag is boolean => flag !== null);

  if (explicitFlags.length > 0) {
    return explicitFlags.some((flag) => flag);
  }

  const status = typeof meta.status === "string" ? normalize(meta.status) : "";
  const profileStatus = typeof meta.profileStatus === "string" ? normalize(meta.profileStatus) : "";
  const statusValue = status || profileStatus;

  if (statusValue) {
    if (["draft", "unpublished", "private", "hidden", "archived"].includes(statusValue)) {
      return false;
    }

    if (["published", "live", "active"].includes(statusValue)) {
      return true;
    }
  }

  return true;
};

const isEmployerNetworkProfile = (profile: FreeAgentProfile) => {
  if (
    (profile.visibility ?? "public") === "verified_employer_network" ||
    (profile.visibility ?? "public") === "employer_network"
  ) {
    return true;
  }

  const meta = profile as FreeAgentProfile & {
    employerNetwork?: unknown;
    employer_network?: unknown;
    network?: unknown;
  };

  const booleanMeta = [meta.employerNetwork, meta.employer_network]
    .map(toBoolean)
    .find((value): value is boolean => value !== null);

  if (typeof booleanMeta === "boolean") {
    return booleanMeta;
  }

  if (typeof meta.network === "string") {
    const networkValue = normalize(meta.network);
    return networkValue === "verified_employer_network" || networkValue === "employer_network";
  }

  return false;
};

const matchesExperience = (years: number, filter: ExperienceFilter) => {
  if (filter === "All") {
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

export default function EmployerTalentSearch() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canAccessSearch, setCanAccessSearch] = useState(false);
  const [accessStatus, setAccessStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [availability, setAvailability] = useState<string>("All");
  const [industry, setIndustry] = useState<string>("All");
  const [location, setLocation] = useState<string>("All");
  const [experience, setExperience] = useState<ExperienceFilter>("All");
  const [confidentialMode, setConfidentialMode] = useState<ConfidentialFilter>("All");
  const [employerNetwork, setEmployerNetwork] = useState<EmployerNetworkFilter>("All");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfiles() {
      setIsLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData.session;

      if (!currentSession) {
        if (mounted) {
          setCanAccessSearch(false);
          setAccessStatus("Please sign in with a verified employer account to access Talent Search.");
          setProfiles([]);
          setIsLoading(false);
        }
        return;
      }

      const { data: accountData, error: accountError } = await supabase
        .from("profiles")
        .select("account_type, employer_verification_status")
        .eq("user_id", currentSession.user.id)
        .maybeSingle();

      if (!mounted) {
        return;
      }

      if (accountError) {
        setCanAccessSearch(false);
        setAccessStatus(accountError.message);
        setProfiles([]);
        setIsLoading(false);
        return;
      }

      const accountRow = accountData as
        | { account_type?: AccountType; employer_verification_status?: EmployerVerificationStatus }
        | null
        | undefined;
      const accountType = accountRow?.account_type ?? "talent";
      const verificationStatus = accountRow?.employer_verification_status ?? "unverified";

      if (accountType !== "employer") {
        setCanAccessSearch(false);
        setAccessStatus("Talent Search is available only to employer accounts.");
        setProfiles([]);
        setIsLoading(false);
        return;
      }

      if (verificationStatus !== "verified") {
        setCanAccessSearch(false);
        setAccessStatus(
          verificationStatus === "pending"
            ? "Your employer verification is pending. Talent Search unlocks once your account is verified."
            : verificationStatus === "rejected"
              ? "Your employer verification was rejected. Update company details in Dashboard and contact support."
              : "Your employer account is not verified yet. Complete your details in Dashboard to begin verification.",
        );
        setProfiles([]);
        setIsLoading(false);
        return;
      }

      setCanAccessSearch(true);
      setAccessStatus(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("slug, profile")
        .eq("account_type", "talent")
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
          }))
          .filter((row) => isPublishedProfile(row.profile)) ?? [];

        setProfiles(rows);
      }

      setIsLoading(false);
    }

    loadProfiles();

    return () => {
      mounted = false;
    };
  }, []);

  const industries = useMemo(
    () => ["All", ...new Set(profiles.map((item) => getIndustry(item.profile)).filter(Boolean))],
    [profiles],
  );

  const locations = useMemo(
    () => ["All", ...new Set(profiles.map((item) => item.profile.location).filter(Boolean))],
    [profiles],
  );

  const filteredProfiles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return profiles.filter((item) => {
      const profile = item.profile;
      const isConfidential = isConfidentialProfile(profile);
      const isEmployerNetwork = isEmployerNetworkProfile(profile);
      const profileIndustry = getIndustry(profile);

      const matchesQuery =
        query === "" ||
        [profile.name, profile.title, profile.location, profile.focusArea, profileIndustry, profile.topStrength]
          .join(" ")
          .toLowerCase()
          .includes(query) ||
        profile.skills.some((skill) => skill.toLowerCase().includes(query));

      const matchesAvailability = availability === "All" || profile.availability === availability;
      const matchesIndustry = industry === "All" || profileIndustry === industry;
      const matchesLocation = location === "All" || profile.location === location;
      const matchesExperienceFilter = matchesExperience(profile.experienceYears, experience);
      const matchesConfidentialMode =
        confidentialMode === "All" ||
        (confidentialMode === "Confidential only" && isConfidential) ||
        (confidentialMode === "Non-confidential" && !isConfidential);

      const matchesEmployerNetwork =
        employerNetwork === "All" ||
        (employerNetwork === "Verified network only" && isEmployerNetwork) ||
        (employerNetwork === "Outside verified network" && !isEmployerNetwork);

      return (
        matchesQuery &&
        matchesAvailability &&
        matchesIndustry &&
        matchesLocation &&
        matchesExperienceFilter &&
        matchesConfidentialMode &&
        matchesEmployerNetwork
      );
    });
  }, [profiles, availability, industry, location, experience, confidentialMode, employerNetwork, searchTerm]);

  if (!isLoading && !canAccessSearch) {
    return (
      <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-8 lg:px-12">
        <div className="rounded-[36px] border border-[#cda64d]/45 bg-[#f7ebcf]/85 p-8 text-[#071426] shadow-[0_18px_55px_rgba(6,16,33,0.12)] sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Employer verification required</p>
          <h2 className="mt-4 text-3xl font-black uppercase tracking-[0.12em] text-[#0f2744] sm:text-4xl">
            Talent Search is restricted to verified employers.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#27405f]">
            {accessStatus ?? "Please verify your employer account to continue."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-[#0f2744]/25 bg-[#0f2744] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f]"
            >
              Open dashboard
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-[#cda64d]/40 bg-[#f7ebcf] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#e9d88f]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    );
  }

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
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Industry</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {industries.slice(0, 8).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setIndustry(option)}
                    className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition ${
                      industry === option
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

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border border-[#cda64d]/30 bg-white/90 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Location</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {locations.slice(0, 8).map((option) => (
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

          <div className="rounded-[24px] border border-[#cda64d]/30 bg-white/90 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Experience</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {experienceOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setExperience(option)}
                  className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition ${
                    experience === option
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

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1.1fr_0.8fr]">
          <div className="rounded-[24px] border border-[#cda64d]/30 bg-white/90 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Confidential mode</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {confidentialOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setConfidentialMode(option)}
                  className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition ${
                    confidentialMode === option
                      ? "bg-[#0f2744] text-[#f7ebcf]"
                      : "bg-[#f7ebcf]/80 text-[#0f2744] hover:bg-[#f7ebcf]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#cda64d]/30 bg-white/90 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Verified employer network</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {employerNetworkOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setEmployerNetwork(option)}
                  className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition ${
                    employerNetwork === option
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
              Search published Talent Passports and quickly narrow results for specific hiring outcomes.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 sm:px-8 lg:px-12">
        {!isLoading && filteredProfiles.some((item) => isConfidentialProfile(item.profile)) ? (
          <div className="rounded-[30px] border border-[#cda64d]/55 bg-[#0f2744] p-6 text-[#f7ebcf] shadow-[0_12px_40px_rgba(6,16,33,0.2)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">Confidential Mode</p>
            <p className="mt-3 text-sm leading-7 text-[#dfe7ef]">
              Confidential profiles are anonymised by design. Name, photo, current employer and contact details are hidden to protect candidate privacy.
            </p>
          </div>
        ) : null}

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
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProfiles.map((item) => (
              <TalentCard
                key={item.slug}
                profile={item.profile}
                href={`/talent/${item.slug}`}
                verificationStatus={null}
                className="w-full"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
