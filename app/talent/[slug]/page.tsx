import { notFound } from "next/navigation";
import TalentProfileExperience from "@/components/TalentProfileExperience";
import { supabase } from "@/lib/supabase-client";
import type { FreeAgentProfile } from "@/types/freeagent";

export async function generateStaticParams() {
  const { data, error } = await supabase.from("profiles").select("slug").not("slug", "is", null);

  if (error || !data) {
    return [];
  }

  return (data as Array<{ slug?: string | null }> | null)
    ?.filter((row) => typeof row.slug === "string")
    .map((row) => ({ slug: row.slug as string })) ?? [];
}

export default async function TalentPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, profile")
    .eq("slug", slug)
    .maybeSingle();

  const profilePayload = (data as { profile?: unknown } | null | undefined)?.profile;
  const candidateUserId = (data as { user_id?: string } | null | undefined)?.user_id;

  if (error || !data || typeof data !== "object" || !profilePayload || !candidateUserId) {
    notFound();
  }

  const profile = profilePayload as unknown as FreeAgentProfile;

  return (
    <TalentProfileExperience
      profile={profile}
      candidateSlug={slug}
      candidateUserId={candidateUserId}
      candidateName={profile.name}
    />
  );
}
