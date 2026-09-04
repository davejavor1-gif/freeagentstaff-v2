import TalentProfileExperience from "@/components/TalentProfileExperience";
import { homepagePassportProfiles } from "@/data/homepage-passports";

// Demo Talent explicitly intended to showcase the Free Agent Pro badge/features.
const proDemoSlugs = new Set(["sarah-jones", "daniel-brooks"]);

export default async function TalentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <TalentProfileExperience
      slug={slug}
      demoProfile={homepagePassportProfiles[slug]}
      demoHasProAccess={proDemoSlugs.has(slug)}
    />
  );
}
