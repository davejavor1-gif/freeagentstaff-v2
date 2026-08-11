"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Lock, MapPin, Pause, Play, RotateCw, Volume2, VolumeX, X } from "lucide-react";
import type { FreeAgentProfile } from "@/types/freeagent";
import { getSessionWithRetry } from "@/lib/supabase-client";
import { resolveProfilePhotoUrl, resolveProfileVideoUrl } from "@/lib/profile-media";
import { cn } from "@/lib/utils";

interface TalentCardProps {
  profile: FreeAgentProfile;
  href: string;
  verificationStatus?: "unverified" | "pending" | "verified" | "rejected" | null;
  className?: string;
  initiallyFlipped?: boolean;
  showSaveAction?: boolean;
  initiallySaved?: boolean;
  onSavedChange?: (nextSaved: boolean) => void;
}

const isConfidential = (profile: FreeAgentProfile) => (profile.visibility ?? "public") === "confidential";
const isVerified = (verificationStatus?: TalentCardProps["verificationStatus"]) => verificationStatus === "verified";

const buildInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "FA";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

function VerifiedMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-[#f2cc63]/30 bg-[#071426]/70 px-2.25 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f7ebcf] shadow-[0_10px_24px_rgba(0,0,0,0.16)] backdrop-blur-sm", className)}>
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-[#8be4c5]" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeDasharray="44 38" />
      </svg>
      Verified
    </span>
  );
}

function ConfidentialSymbol() {
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-28 w-28 text-[#f2cc63]" aria-hidden="true">
        <circle cx="60" cy="60" r="42" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3.6" />
        <circle cx="60" cy="53" r="16" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M38 95c4-14 13-20 22-20s18 6 22 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-full border border-[#f7ebcf]/30 bg-[#071426]/55 p-2 text-[#f7ebcf]">
          <Lock className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export default function TalentCard({
  profile,
  href,
  verificationStatus,
  className,
  initiallyFlipped = false,
  showSaveAction = false,
  initiallySaved = false,
  onSavedChange,
}: TalentCardProps) {
  const confidential = isConfidential(profile);
  const verified = isVerified(verificationStatus) || profile.visibility === "verified_employer_network" || profile.visibility === "employer_network";
  const [isFlipped, setIsFlipped] = useState(initiallyFlipped);
  const [videoOpen, setVideoOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showVideoControls, setShowVideoControls] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState<string | null>(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isSaved = optimisticSaved ?? initiallySaved;

  const hasVideo = Boolean(resolvedVideoUrl ?? profile.intro_video_url) && !confidential;
  const mediaAlt = profile.imageAlt ?? profile.name;

  const initials = useMemo(() => buildInitials(confidential ? "Confidential Profile" : profile.name), [confidential, profile.name]);
  const hasProfilePhoto = Boolean((resolvedPhotoUrl ?? profile.photoUrl) && !/(logo|fullLogo|placeholder-avatar)/i.test((resolvedPhotoUrl ?? profile.photoUrl ?? "")));

  useEffect(() => {
    let active = true;

    const resolveMedia = async () => {
      const [nextPhotoUrl, nextVideoUrl] = await Promise.all([
        resolveProfilePhotoUrl(profile, { allowEmployerAccess: !confidential }),
        resolveProfileVideoUrl(profile, { allowEmployerAccess: !confidential }),
      ]);

      if (!active) {
        return;
      }

      setResolvedPhotoUrl(nextPhotoUrl);
      setResolvedVideoUrl(nextVideoUrl);
    };

    void resolveMedia();

    return () => {
      active = false;
    };
  }, [profile, confidential]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (!videoOpen || !videoRef.current) {
      return;
    }

    const video = videoRef.current;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [videoOpen, isPlaying]);

  const resetVideoState = () => {
    setIsPlaying(false);
    setShowVideoControls(false);
    setIsMuted(true);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.muted = true;
    }
  };

  const handleOpenVideo = async () => {
    if (!hasVideo || confidential) {
      return;
    }

    setVideoOpen(true);
    setIsFlipped(false);
    setShowVideoControls(false);

    if (!videoRef.current) {
      return;
    }

    const video = videoRef.current;
    video.currentTime = 0;
    video.muted = false;
    setIsMuted(false);

    try {
      await video.play();
      setIsPlaying(true);
    } catch {
      video.muted = true;
      setIsMuted(true);
      try {
        await video.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleCloseVideo = () => {
    setVideoOpen(false);
    resetVideoState();
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handlePlaybackToggle = async () => {
    if (!videoRef.current) {
      return;
    }

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await videoRef.current.play();
      setIsPlaying(true);
    } catch {
      videoRef.current.muted = true;
      setIsMuted(true);
      try {
        await videoRef.current.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleReplay = async () => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.currentTime = 0;
    videoRef.current.muted = false;
    setIsMuted(false);

    try {
      await videoRef.current.play();
      setIsPlaying(true);
    } catch {
      videoRef.current.muted = true;
      setIsMuted(true);
      try {
        await videoRef.current.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setShowVideoControls(false);
    setVideoOpen(false);
    resetVideoState();
  };

  const handleFlipToggle = () => {
    if (videoOpen) {
      handleCloseVideo();
    }
    setIsFlipped((prev) => !prev);
  };

  const handleSaveToggle = async () => {
    if (!showSaveAction || isSaving) {
      return;
    }

    const slug = profile.slug;
    if (!slug) {
      setSaveError("Unable to save this profile right now.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    const previousValue = isSaved;
    const nextValue = !previousValue;
    setOptimisticSaved(nextValue);

    try {
      const session = await getSessionWithRetry();
      const method = nextValue ? "POST" : "DELETE";
      const endpoint = nextValue ? "/api/saved-talent" : `/api/saved-talent/${encodeURIComponent(slug)}`;
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : {}),
        },
        body: nextValue ? JSON.stringify({ slug }) : undefined,
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!response.ok || !payload?.ok) {
        setOptimisticSaved(previousValue);
        setSaveError(payload?.message ?? "Unable to update saved talent.");
        return;
      }

      setOptimisticSaved(null);
      onSavedChange?.(nextValue);
    } catch {
      setOptimisticSaved(previousValue);
      setSaveError("Unable to update saved talent.");
    } finally {
      setIsSaving(false);
    }
  };

  const recentRoles = profile.careerJourney?.slice(0, 2) ?? [];

  return (
    <article
      className={cn(
        "group relative mx-auto w-full max-w-[380px] overflow-visible rounded-[30px] border border-[#0f2744]/15 bg-transparent text-[#071426] shadow-[0_24px_60px_rgba(7,19,38,0.16)]",
        className,
      )}
    >
      {showSaveAction ? (
        <div className="pointer-events-none absolute right-3 top-3 z-30 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => {
              void handleSaveToggle();
            }}
            aria-pressed={isSaved}
            aria-label={isSaved ? "Remove from saved talent" : "Save talent"}
            className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-[#f2cc63]/45 bg-[#071426]/85 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] backdrop-blur transition hover:bg-[#17355f] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSaving}
          >
            <Heart className={cn("h-3.5 w-3.5", isSaved ? "fill-[#f2cc63] text-[#f2cc63]" : "text-[#f7ebcf]")} />
            {isSaving ? "Saving" : isSaved ? "Saved" : "Save talent"}
          </button>
          {saveError ? <span className="max-w-[220px] rounded-full bg-[#5c1d1d]/90 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-[#f7d4d4]">{saveError}</span> : null}
        </div>
      ) : null}

      <div className={cn("relative aspect-[2.5/3.5] w-full [perspective:1800px]", reducedMotion ? "" : "transition-transform duration-500") }>
        <div
          className={cn(
            "relative h-full w-full rounded-[28px] transition-transform duration-500 [transform-style:preserve-3d]",
            reducedMotion ? "" : "duration-500",
            isFlipped ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]",
          )}
        >
          <div className="absolute inset-0 h-full w-full overflow-hidden rounded-[28px] border border-[#0f2744]/15 bg-[#f7ebcf] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]">
            <div className="flex h-full flex-col bg-[#f7ebcf]">
              <div className="relative flex-1 overflow-hidden bg-[#0f2744] p-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(242,204,99,0.16),transparent_42%),linear-gradient(135deg,#0f2744_0%,#102742_100%)]" />
                <div className="relative flex h-full flex-col">
                  <div className="pointer-events-none absolute left-3 top-3 z-20 h-10 w-14 overflow-hidden sm:h-12 sm:w-18">
                    <Image src="/FullLogo%20(4)-transparent.png" alt="Free Agent Staff" width={144} height={60} className="h-full w-full object-contain object-left" />
                  </div>
                  {verified ? (
                    <div className="pointer-events-none absolute right-3 top-3 z-20">
                      <VerifiedMark />
                    </div>
                  ) : null}

                  <div className="mt-0 flex-1 overflow-hidden">
                    <div className="relative h-full w-full overflow-hidden">
                      <div className={cn("absolute inset-0", reducedMotion ? "" : "transition-opacity duration-300", videoOpen ? "pointer-events-none opacity-0" : "opacity-100")}>
                        {confidential ? (
                          <div className="group relative flex h-full w-full items-end justify-start overflow-hidden bg-[#0f2744] text-left">
                            <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#152c46_0%,#0a1425_100%)] p-6">
                              <div className="flex flex-col items-center justify-center gap-4 rounded-[24px] border border-[#f2cc63]/15 bg-[#071426]/30 p-7 text-center text-[#f7ebcf] backdrop-blur-sm">
                                <ConfidentialSymbol />
                                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#f2cc63]">Confidential</p>
                              </div>
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/90 via-[#071426]/15 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                              <div className="relative rounded-[20px] border border-white/12 bg-[#071426]/70 p-3.5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-md">
                                <div className="space-y-2.5">
                                  <div className="space-y-1">
                                    <h3 className="text-[1rem] font-black uppercase leading-[1.08] tracking-[0.16em] text-[#f7ebcf]">
                                      VENUE OPERATIONS LEADER
                                    </h3>
                                    <p className="text-sm text-[#dfe7ef]">Sydney</p>
                                  </div>
                                  <div className="pt-1">
                                    <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#dfe7ef]">
                                      <span className="h-2.5 w-2.5 rounded-full bg-[#8be4c5]" />
                                      Open to new projects
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={hasVideo ? handleOpenVideo : undefined}
                            onKeyDown={(event) => {
                              if (hasVideo && (event.key === "Enter" || event.key === " ")) {
                                event.preventDefault();
                                handleOpenVideo();
                              }
                            }}
                            aria-label={hasVideo ? `Play ${profile.name}'s video introduction` : "Profile portrait"}
                            className={cn(
                              "group relative flex h-full w-full items-end justify-start overflow-hidden bg-[#0f2744] text-left",
                              hasVideo ? "cursor-pointer" : "cursor-default",
                            )}
                          >
                            {hasProfilePhoto ? (
                              <Image src={resolvedPhotoUrl ?? profile.photoUrl ?? "/placeholder-avatar.svg"} alt={mediaAlt} fill className="object-cover object-center" sizes="(max-width: 768px) 100vw, 380px" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#152c46_0%,#0a1425_100%)] p-6">
                                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/15 text-[#f7ebcf] shadow-[0_12px_24px_rgba(0,0,0,0.16)]">
                                  <span className="text-3xl font-black uppercase tracking-[0.24em]">{initials}</span>
                                </div>
                              </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/90 via-[#071426]/15 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                              <div className="relative rounded-[20px] border border-white/12 bg-[#071426]/70 p-3.5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-md">
                                <div className="space-y-2.5">
                                  <div className="space-y-1">
                                    <h3 className="text-[1rem] font-black uppercase leading-[1.08] tracking-[0.16em] text-[#f7ebcf]">
                                      {confidential ? "VENUE OPERATIONS LEADER" : profile.name}
                                    </h3>
                                    <p className="text-sm text-[#dfe7ef]">{confidential ? "Sydney" : profile.title}</p>
                                  </div>
                                  <div className="pt-1">
                                    <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#dfe7ef]">
                                      <span className="h-2.5 w-2.5 rounded-full bg-[#8be4c5]" />
                                      {confidential ? "Open to new projects" : profile.availability}
                                    </span>
                                  </div>
                                </div>
                                {hasVideo ? (
                                  <button
                                    type="button"
                                    aria-label={`Play ${profile.name}'s video introduction`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleOpenVideo();
                                    }}
                                    className="absolute bottom-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[#f2cc63]/60 bg-[#071426]/90 text-[#f7ebcf] shadow-[0_10px_24px_rgba(0,0,0,0.2)]"
                                  >
                                    <Play className="ml-0.5 h-4 w-4" />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {hasVideo && !confidential ? (
                        <div className={cn("absolute inset-0", reducedMotion ? "" : "transition-opacity duration-300", videoOpen ? "opacity-100" : "pointer-events-none opacity-0")}>
                          <div
                            className="relative flex h-full w-full flex-col justify-end bg-[#071426]"
                            onMouseEnter={() => setShowVideoControls(true)}
                            onMouseLeave={() => setShowVideoControls(false)}
                            onFocus={() => setShowVideoControls(true)}
                            onBlur={() => setShowVideoControls(false)}
                            onClick={() => setShowVideoControls(true)}
                            tabIndex={0}
                          >
                            <video
                              ref={videoRef}
                              className="h-full w-full object-cover"
                              src={resolvedVideoUrl ?? profile.intro_video_url ?? undefined}
                              poster={profile.intro_video_thumbnail_url ?? resolvedPhotoUrl ?? profile.photoUrl ?? undefined}
                              playsInline
                              muted={isMuted}
                              onEnded={handleVideoEnded}
                            />
                            <div className={cn("absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-[#071426] via-[#071426]/70 to-transparent px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf]", reducedMotion ? "" : "transition-opacity duration-200", showVideoControls ? "opacity-100" : "opacity-0")}>
                              <span>{confidential ? "Confidential introduction" : "Introduction video"}</span>
                              <div className="flex items-center gap-2">
                                <button type="button" aria-label={isMuted ? "Unmute introduction video" : "Mute introduction video"} onClick={toggleMute} className="rounded-full border border-white/20 bg-white/10 p-2 backdrop-blur">
                                  {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                </button>
                                <button type="button" aria-label={isPlaying ? "Pause introduction video" : "Play introduction video"} onClick={handlePlaybackToggle} className="rounded-full border border-[#f2cc63]/45 bg-[#f7ebcf] p-2 text-[#0f2744]">
                                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                </button>
                                <button type="button" aria-label="Replay introduction video" onClick={handleReplay} className="rounded-full border border-white/20 bg-white/10 p-2 backdrop-blur">
                                  <RotateCw className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" aria-label="Return to photo" onClick={handleCloseVideo} className="rounded-full border border-white/20 bg-white/10 p-2 backdrop-blur">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#0f2744]/10 bg-[#f7ebcf] px-3 py-3 sm:px-4 sm:py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.85rem] font-black uppercase tracking-[0.16em] text-[#0f2744]">Front of card</p>
                  <button
                    type="button"
                    onClick={handleFlipToggle}
                    aria-label="Flip card"
                    className="-my-2.5 inline-flex h-11 min-h-11 items-center justify-center rounded-full px-1 touch-manipulation"
                  >
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#0f2744]/10 bg-white/80 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-white">
                      <RotateCw className="h-3 w-3" />
                      <span>Flip card</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 h-full w-full overflow-hidden rounded-[28px] border border-[#0f2744]/15 bg-[#f7ebcf] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="flex h-full flex-col bg-[#f7ebcf]">
              <div className="border-b border-[#0f2744]/10 bg-[#0f2744] p-2.5 sm:p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="h-10 w-14 overflow-hidden sm:h-12 sm:w-18">
                    <Image src="/FullLogo%20(4)-transparent.png" alt="Free Agent Staff" width={144} height={60} className="h-full w-full object-contain object-left" />
                  </div>
                  <button
                    type="button"
                    onClick={handleFlipToggle}
                    aria-label="Return to front"
                    className="-my-2.5 inline-flex h-11 min-h-11 items-center justify-center rounded-full px-1 touch-manipulation"
                  >
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#f7ebcf]">
                      <RotateCw className="h-3 w-3" />
                      Front
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden bg-[#f7ebcf] p-2 sm:p-2.25">
                <div className="space-y-1">
                  <div className="space-y-0.25">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-[#9a6d15]">Professional dossier</p>
                    <h3 className="text-[0.9rem] font-black uppercase tracking-[0.16em] text-[#0f2744]">
                      {confidential ? "Confidential profile" : profile.name}
                    </h3>
                    <p className="text-[0.75rem] text-[#27405f]">{confidential ? profile.title || "Professional profile" : profile.title}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.25 text-[0.7rem] text-[#27405f]">
                    <span className="inline-flex items-center gap-1.25 rounded-full border border-[#0f2744]/10 bg-[#f7ebcf]/80 px-2 py-0.5">
                      <MapPin className="h-2.75 w-2.75 text-[#0f2744]" />
                      {confidential ? "General location available" : profile.location}
                    </span>
                    <span className="rounded-full border border-[#0f2744]/10 bg-[#f7ebcf]/80 px-2 py-0.5 text-[7.5px] font-semibold uppercase tracking-[0.24em] text-[#0f2744]">
                      {profile.experienceYears}+ years
                    </span>
                    {verified ? <span className="inline-flex items-center gap-1.25 rounded-full border border-[#0f2744]/10 bg-[#0f2744]/10 px-2 py-0.5 text-[7.5px] font-semibold uppercase tracking-[0.24em] text-[#0f2744]"><svg viewBox="0 0 24 24" className="h-2.75 w-2.75" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeDasharray="44 38" /></svg>Verified</span> : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#0f2744]/10 bg-[#0f2744] px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf]">
                      <span className="h-1.75 w-1.75 rounded-full bg-[#8be4c5]" />
                      {confidential ? "Open to new projects" : profile.availability}
                    </span>
                  </div>

                  <div className="h-px w-full bg-[#0f2744]/10" />

                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-[#9a6d15]">What stands out</p>
                    <p className="mt-0.25 text-[0.68rem] leading-4 text-[#27405f]">
                      {profile.topStrength || profile.summary || "A polished professional with clear evidence of capability and steadiness under pressure."}
                    </p>
                  </div>

                  <div className="h-px w-full bg-[#0f2744]/10" />

                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-[#9a6d15]">Top skills</p>
                    <div className="mt-0.25 flex flex-wrap gap-1.25">
                      {profile.skills.slice(0, 4).map((skill) => (
                        <span key={skill} className="rounded-full border border-[#0f2744]/10 bg-[#f7ebcf] px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.2em] text-[#071426]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="h-px w-full bg-[#0f2744]/10" />

                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-[#9a6d15]">Experience</p>
                      <div className="mt-0.5 space-y-1">
                        {recentRoles.map((role) => (
                          <div key={`${role.role}-${role.company}`} className="py-0.25">
                            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#0f2744]">{role.role}</p>
                            <p className="text-[0.64rem] text-[#27405f]">{role.company}</p>
                            <p className="text-[0.58rem] uppercase tracking-[0.2em] text-[#8a6b24]">{role.period}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-[#9a6d15]">Qualifications</p>
                      <ul className="mt-0.5 space-y-0.5 text-[0.64rem] text-[#27405f]">
                        {(profile.qualifications ?? []).slice(0, 2).map((qualification) => (
                          <li key={qualification} className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0f2744]" />
                            <span>{qualification}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#f2cc63]/20 bg-[#0f2744] px-3 py-2.5 sm:px-4 sm:py-3">
                <Link href={href} className="flex w-full items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:text-[#8be4c5]">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8be4c5]" />
                    {confidential ? "View confidential passport" : "View full talent passport"}
                  </span>
                  <span className="text-base leading-none">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
