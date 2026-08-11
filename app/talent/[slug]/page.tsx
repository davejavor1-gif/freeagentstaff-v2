import TalentProfileExperience from "@/components/TalentProfileExperience";
export default async function TalentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <TalentProfileExperience slug={slug} />;
}
