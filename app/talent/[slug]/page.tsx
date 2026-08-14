import TalentProfileExperience from "@/components/TalentProfileExperience";
import { homepagePassportProfiles } from "@/data/homepage-passports";
export default async function TalentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <TalentProfileExperience slug={slug} demoProfile={homepagePassportProfiles[slug]} />;
}
