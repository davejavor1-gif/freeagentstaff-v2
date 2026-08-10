"use client";

import { useEffect, useState } from "react";
import TalentCard from "@/components/TalentCard";
import { supabase } from "@/lib/supabase-client";
import type { FreeAgentProfile } from "@/types/freeagent";
import type { Json } from "@/types/supabase";

export default function MediaVerificationPage() {
  const [profile, setProfile] = useState<FreeAgentProfile | null>(null);
  const [status, setStatus] = useState("Loading authenticated profile...");

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        if (!active) return;
        setStatus("No authenticated session found.");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("slug, profile, account_type, intro_video_url, photo_url, photo_storage_path, intro_video_storage_path")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setStatus(error?.message ?? "No profile row found.");
        return;
      }

      const profilePayload = (data as { profile?: Json } | null | undefined)?.profile as unknown as FreeAgentProfile;
      if (!profilePayload) {
        setStatus("Profile payload was empty.");
        return;
      }

      const mergedProfile: FreeAgentProfile = {
        ...profilePayload,
        photoUrl: profilePayload.photoUrl ?? (data as { photo_url?: string | null }).photo_url ?? undefined,
        photo_storage_path: profilePayload.photo_storage_path ?? (data as { photo_storage_path?: string | null }).photo_storage_path ?? null,
        intro_video_url: profilePayload.intro_video_url ?? (data as { intro_video_url?: string | null }).intro_video_url ?? null,
        intro_video_storage_path: profilePayload.intro_video_storage_path ?? (data as { intro_video_storage_path?: string | null }).intro_video_storage_path ?? null,
      };

      setProfile(mergedProfile);
      setStatus("Profile loaded.");
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f9f2de] px-4 py-8 text-[#071426]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-[24px] border border-[#cda64d]/40 bg-white/80 p-4 text-sm text-[#27405f]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Media verification</p>
          <p className="mt-2">{status}</p>
        </div>
        {profile ? (
          <>
            <div className="rounded-[24px] border border-[#cda64d]/40 bg-white/80 p-4 text-sm text-[#27405f]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">Persisted media fields</p>
              <div className="mt-3 space-y-2 break-all">
                <p><strong>photoUrl:</strong> {profile.photoUrl ?? "(none)"}</p>
                <p><strong>photo_storage_path:</strong> {profile.photo_storage_path ?? "(none)"}</p>
                <p><strong>intro_video_url:</strong> {profile.intro_video_url ?? "(none)"}</p>
                <p><strong>intro_video_storage_path:</strong> {profile.intro_video_storage_path ?? "(none)"}</p>
                <p><strong>visibility:</strong> {profile.visibility ?? "(none)"}</p>
                <p><strong>name:</strong> {profile.name || "(empty)"}</p>
                <p><strong>title:</strong> {profile.title || "(empty)"}</p>
                <p><strong>availability:</strong> {profile.availability || "(empty)"}</p>
              </div>
            </div>
            <div className="mx-auto w-full max-w-[420px]">
              <TalentCard profile={profile} href="#" verificationStatus="verified" />
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
