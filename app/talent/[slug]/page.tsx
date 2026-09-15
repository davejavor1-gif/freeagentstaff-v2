import type { Metadata } from "next";
import TalentProfileExperience from "@/components/TalentProfileExperience";
import { homepagePassportProfiles } from "@/data/homepage-passports";
import { getPublicPassportUrl } from "@/lib/passport-share";
import { loadPublicTalentPassport } from "@/lib/discovery-access";

type Props = { params: Promise<{ slug: string }> };

const siteName = "FreeAgentStaff";
const passportOgImageSize = {
  width: 1200,
  height: 630,
};
const fallbackImage = {
  url: "/FullLogo-clean-v2.png",
  width: 1280,
  height: 1024,
  alt: "FreeAgentStaff Talent Passport",
};
const noindexRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};

function cleanText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

function firstNameForDescription(name: string) {
  return name.trim().split(/\s+/)[0] || "their";
}

function buildMetadataDescription(name: string, title: string | null, location: string | null) {
  const owner = firstNameForDescription(name);

  if (title && location) {
    return `${title} in ${location}. Discover ${owner}'s skills, experience and career story on their FreeAgentStaff Talent Passport.`;
  }

  if (title) {
    return `${title}. Discover ${owner}'s skills, experience and career story on their FreeAgentStaff Talent Passport.`;
  }

  if (location) {
    return `Discover ${owner}'s skills, experience and career story from ${location} on their FreeAgentStaff Talent Passport.`;
  }

  return `Discover ${owner}'s skills, experience and career story on their FreeAgentStaff Talent Passport.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const payload = await loadPublicTalentPassport(slug);
  const profile = payload.profile;
  const canonicalSlug = profile?.slug;

  if (!payload.allowed || !profile || !canonicalSlug) {
    return {
      title: "Talent Passport",
      robots: noindexRobots,
    };
  }

  const name = cleanText(profile.name) ?? "Talent";
  const title = cleanText(profile.title);
  const location = cleanText(profile.location);
  const metadataTitle = title ? `${name} — ${title} | Talent Passport` : `${name} | Talent Passport`;
  const description = buildMetadataDescription(name, title, location);
  const url = getPublicPassportUrl(canonicalSlug);
  const imageUrl = `${url}/opengraph-image`;

  return {
    title: metadataTitle,
    description,
    alternates: {
      canonical: url,
    },
    robots: noindexRobots,
    openGraph: {
      type: "website",
      title: metadataTitle,
      description,
      url,
      siteName,
      images: [{ ...fallbackImage, url: imageUrl, ...passportOgImageSize }],
    },
    twitter: {
      card: "summary_large_image",
      title: metadataTitle,
      description,
      images: [imageUrl],
    },
  };
}

// Demo Talent explicitly intended to showcase the Free Agent Pro badge/features.
const proDemoSlugs = new Set(["sarah-jones", "daniel-brooks"]);

export default async function TalentPage({ params }: Props) {
  const { slug } = await params;

  return (
    <TalentProfileExperience
      slug={slug}
      demoProfile={homepagePassportProfiles[slug]}
      demoHasProAccess={proDemoSlugs.has(slug)}
    />
  );
}
