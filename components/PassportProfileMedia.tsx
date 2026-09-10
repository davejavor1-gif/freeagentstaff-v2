"use client";
/* eslint-disable @next/next/no-img-element */

import { Pause, Play, RotateCw, Volume2, VolumeX, X } from "lucide-react";
import { useIntroductionVideo } from "@/lib/use-introduction-video";
import type { FreeAgentProfile } from "@/types/freeagent";

const isConfidential = (profile: FreeAgentProfile) =>
  (profile.visibility ?? "public") === "confidential" && !profile.confidentialAccessUnveiled;

function buildInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "FA";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export default function PassportProfileMedia({ profile }: { profile: FreeAgentProfile }) {
  const confidential = isConfidential(profile);
  const {
    handleCloseVideo,
    handleOpenVideo,
    handlePlaybackToggle,
    handleReplay,
    handleVideoEnded,
    hasVideo,
    isMuted,
    isPlaying,
    resolvedPhotoUrl,
    resolvedVideoUrl,
    setShowVideoControls,
    showVideoControls,
    toggleMute,
    videoOpen,
    videoRef,
  } = useIntroductionVideo(profile, confidential);
  const photoUrl = resolvedPhotoUrl ?? profile.photoUrl;
  const hasProfilePhoto = Boolean(photoUrl && !/(logo|fullLogo|placeholder-avatar)/i.test(photoUrl));
  const mediaAlt = profile.imageAlt ?? profile.name ?? "Talent profile portrait";

  return (
    <div className="min-w-0">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[20px] border border-[#651D2A]/30 bg-[#651D2A] shadow-[0_8px_18px_rgba(46,13,20,0.16)] lg:aspect-auto lg:h-[35rem]">
        {!videoOpen ? (
          <button
            type="button"
            onClick={hasVideo ? () => void handleOpenVideo() : undefined}
            aria-label={hasVideo ? `Play ${profile.name}'s video introduction` : "Profile portrait"}
            className={`relative h-full w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#651D2A] focus-visible:ring-inset ${hasVideo ? "cursor-pointer" : "cursor-default"}`}
          >
            {hasProfilePhoto ? (
              <img src={photoUrl ?? undefined} alt={mediaAlt} className="h-full w-full object-cover object-center" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#651D2A] text-5xl font-black tracking-[0.16em] text-[#f7ebcf]">
                {buildInitials(profile.name || "Talent")}
              </div>
            )}
            {hasVideo ? (
              <span className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]/18">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[#f7ebcf]/80 bg-[#651D2A]/90 pl-1 text-[#f7ebcf] shadow-[0_8px_18px_rgba(46,13,20,0.3)]">
                  <Play className="h-7 w-7" fill="currentColor" />
                </span>
              </span>
            ) : null}
          </button>
        ) : (
          <div
            className="relative h-full w-full bg-[#1a1a1a]"
            onMouseEnter={() => setShowVideoControls(true)}
            onMouseLeave={() => setShowVideoControls(false)}
            onFocus={() => setShowVideoControls(true)}
            onBlur={() => setShowVideoControls(false)}
            onClick={() => setShowVideoControls(true)}
            aria-label="Introduction video player"
            tabIndex={0}
          >
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              src={resolvedVideoUrl ?? profile.intro_video_url ?? undefined}
              poster={profile.intro_video_thumbnail_url ?? photoUrl ?? undefined}
              playsInline
              muted={isMuted}
              onEnded={handleVideoEnded}
            />
            <div className={`absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/70 to-transparent px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] transition-opacity duration-200 ${showVideoControls ? "opacity-100" : "opacity-0"}`}>
              <span>Introduction video</span>
              <div className="flex items-center gap-1.5">
                <button type="button" aria-label={isMuted ? "Unmute introduction video" : "Mute introduction video"} onClick={toggleMute} className="rounded-full border border-[#f7ebcf]/35 bg-[#651D2A]/80 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7ebcf]">
                  {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
                <button type="button" aria-label={isPlaying ? "Pause introduction video" : "Play introduction video"} onClick={() => void handlePlaybackToggle()} className="rounded-full border border-[#f7ebcf]/70 bg-[#f7ebcf] p-2 text-[#651D2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7ebcf]">
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button type="button" aria-label="Replay introduction video" onClick={() => void handleReplay()} className="rounded-full border border-[#f7ebcf]/35 bg-[#651D2A]/80 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7ebcf]">
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
                <button type="button" aria-label="Return to photo" onClick={handleCloseVideo} className="rounded-full border border-[#f7ebcf]/35 bg-[#651D2A]/80 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7ebcf]">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {hasVideo ? (
        <div className="mt-3 border-t border-[#651D2A]/25 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#651D2A]">Introduction video</p>
          <p className="mt-1 text-xs leading-5 text-[#1a1a1a]/70">A short introduction to who I am.</p>
        </div>
      ) : null}
    </div>
  );
}
