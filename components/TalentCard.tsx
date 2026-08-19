"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Lock, MapPin, Pause, Play, RotateCw, Volume2, VolumeX, X } from "lucide-react";
import FreeAgentProBadge from "@/components/FreeAgentProBadge";
import type { FreeAgentProfile } from "@/types/freeagent";
import { getSessionWithRetry } from "@/lib/supabase-client";
import { resolveProfilePhotoUrl, resolveProfileVideoUrl } from "@/lib/profile-media";
import { cn } from "@/lib/utils";

interface TalentCardProps {
  profile: FreeAgentProfile;
  href: string;
  verificationStatus?: "unverified" | "pending" | "verified" | "rejected" | null;
  hasProAccess?: boolean;
  presentation?: "default" | "employer";
  className?: string;
  initiallyFlipped?: boolean;
  showSaveAction?: boolean;
  initiallySaved?: boolean;
  onSavedChange?: (nextSaved: boolean) => void;
}

const isConfidential = (profile: FreeAgentProfile) => (profile.visibility ?? "public") === "confidential";
const buildInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "FA";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

function ConfidentialPortrait() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(140deg,#152d48_0%,#0a1425_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_28%,rgba(242,204,99,0.16),transparent_45%),radial-gradient(circle_at_78%_76%,rgba(99,163,242,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#071426]/45" />

      <svg viewBox="0 0 180 180" className="absolute inset-0 h-full w-full text-[#f2cc63]/70" aria-hidden="true">
        <ellipse cx="90" cy="76" rx="30" ry="31" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M43 146c8-23 24-34 47-34s39 11 47 34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M58 37c8-7 20-11 32-11h1c12 0 24 4 32 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.65" />
      </svg>

      <div className="absolute inset-x-0 bottom-6 flex justify-center px-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f2cc63]/30 bg-[#071426]/75 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] backdrop-blur-sm">
          <Lock className="h-3.5 w-3.5 text-[#f2cc63]" />
          Identity protected
        </span>
      </div>
    </div>
  );
}

export default function TalentCard({
  profile,
  href,
  hasProAccess = false,
  presentation = "default",
  className,
  initiallyFlipped = false,
  showSaveAction = false,
  initiallySaved = false,
  onSavedChange,
}: TalentCardProps) {
  const confidential = isConfidential(profile);
  const isEmployerPresentation = presentation === "employer";
  const [isFlipped, setIsFlipped] = useState(initiallyFlipped);
  const [settledFace, setSettledFace] = useState<"front" | "back">(initiallyFlipped ? "back" : "front");
  const [videoOpen, setVideoOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const [showVideoControls, setShowVideoControls] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showBackScrollFade, setShowBackScrollFade] = useState(false);
  const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState<string | null>(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const backContentRef = useRef<HTMLDivElement | null>(null);
  const isSaved = optimisticSaved ?? initiallySaved;

  const hasVideo = Boolean(resolvedVideoUrl ?? profile.intro_video_url) && !confidential;
  const mediaAlt = profile.imageAlt ?? profile.name;
  const confidentialName = profile.name || "Confidential profile";
  const confidentialTitle = profile.title || "Professional profile";
  const confidentialLocation = profile.location || "General location available";
  const confidentialAvailability = profile.availability || "Open to new projects";

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
    const content = backContentRef.current;

    if (!content || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateScrollFade = () => {
      const hasOverflow = content.scrollHeight > content.clientHeight + 1;
      const isAtBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 1;
      setShowBackScrollFade(hasOverflow && !isAtBottom);
    };

    const observer = new ResizeObserver(updateScrollFade);
    observer.observe(content);
    updateScrollFade();

    return () => observer.disconnect();
  }, [profile]);

  useEffect(() => {
    const settleDelay = reducedMotion ? 0 : 520;
    const timer = window.setTimeout(() => {
      setSettledFace(isFlipped ? "back" : "front");
    }, settleDelay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isFlipped, reducedMotion]);

  useEffect(() => {
    if (!videoOpen || !videoRef.current) {
      return;
    }

    const video = videoRef.current;

    if (shouldAutoplay || isPlaying) {
      if (shouldAutoplay) {
        video.muted = false;
        video.currentTime = 0;
      }
      video.play().then(() => {
        setIsPlaying(true);
        setShouldAutoplay(false);
      }).catch(() => {
        setIsPlaying(false);
        setShouldAutoplay(false);
      });
    } else {
      video.pause();
    }
  }, [videoOpen, isPlaying, shouldAutoplay]);

  const resetVideoState = () => {
    setIsPlaying(false);
    setShouldAutoplay(false);
    setShowVideoControls(false);
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.muted = false;
    }
  };

  const handleOpenVideo = async () => {
    if (!hasVideo || confidential) {
      return;
    }

    setVideoOpen(true);
    setIsFlipped(false);
    setShowVideoControls(false);
    setShouldAutoplay(true);

    setIsMuted(false);
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
      setIsPlaying(false);
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
      setIsPlaying(false);
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
      <div className={cn("relative aspect-[2.5/3.465] w-full [perspective:1800px] [-webkit-perspective:1800px]", reducedMotion ? "" : "transition-transform duration-500") }>
        <div
          className={cn(
            "relative h-full w-full rounded-[28px] transition-transform duration-500 [transform-style:preserve-3d] [-webkit-transform-style:preserve-3d] [will-change:transform]",
            reducedMotion ? "" : "duration-500",
            isFlipped ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]",
          )}
        >
          <div className={cn("absolute inset-0 z-20 h-full w-full overflow-hidden rounded-[28px] border border-[#0f2744]/15 bg-[#f7ebcf] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(0deg)_translateZ(1px)]", isFlipped ? "pointer-events-none z-10" : "pointer-events-auto z-20", settledFace === "back" && isFlipped ? "invisible" : "visible")}>
            <div className="flex h-full flex-col bg-[#f7ebcf]">
              <div className="relative flex-1 overflow-hidden bg-[#0f2744] p-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(242,204,99,0.16),transparent_42%),linear-gradient(135deg,#0f2744_0%,#102742_100%)]" />
                <div className="relative flex h-full flex-col">
                  <div className="absolute left-3 top-0.5 z-20 h-[3.7rem] w-[8.86rem] overflow-hidden sm:h-[4.75rem] sm:w-[11.4rem]">
                    <Image src="/FullLogo%20(4)-transparent.png" alt="Free Agent Staff" width={144} height={60} className="h-full w-full object-contain object-left" />
                  </div>

                  <div className="absolute right-3 top-2 z-20 flex flex-col items-end gap-1.5">
                    {hasProAccess ? <FreeAgentProBadge size="compact" /> : null}
                    {showSaveAction ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            void handleSaveToggle();
                          }}
                          aria-pressed={isSaved}
                          aria-label={isSaved ? "Remove from saved talent" : "Save talent"}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#f2cc63]/45 bg-[#071426]/85 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] backdrop-blur transition hover:bg-[#17355f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2cc63]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426] disabled:cursor-not-allowed disabled:opacity-70"
                          disabled={isSaving}
                        >
                          <Heart className={cn("h-3.5 w-3.5", isSaved ? "fill-[#f2cc63] text-[#f2cc63]" : "text-[#f7ebcf]")} />
                          {isSaving ? "Saving" : isSaved ? "Saved" : "Save"}
                        </button>
                        {saveError ? <span className="max-w-[220px] rounded-full bg-[#5c1d1d]/90 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-[#f7d4d4]">{saveError}</span> : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-0 flex-1 overflow-hidden">
                    <div className="relative h-full w-full overflow-hidden">
                      <div className={cn("absolute inset-0", reducedMotion ? "" : "transition-opacity duration-300", videoOpen ? "pointer-events-none opacity-0" : "opacity-100")}>
                        {confidential ? (
                          <div className="group relative flex h-full w-full items-end justify-start overflow-hidden bg-[#0f2744] text-left">
                            <ConfidentialPortrait />

                            <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/90 via-[#071426]/15 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                              <div className="relative rounded-[20px] border border-white/12 bg-[#071426]/70 p-3.5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-md">
                                <div className="space-y-2.5">
                                  <div className="space-y-1">
                                    <h3 className="text-[1rem] font-black uppercase leading-[1.08] tracking-[0.16em] text-[#f7ebcf]">
                                      {confidentialName}
                                    </h3>
                                    <p className="text-sm text-[#dfe7ef]">{confidentialTitle}</p>
                                  </div>
                                  <div className="pt-1">
                                    <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#dfe7ef]">
                                      <span className="h-2.5 w-2.5 rounded-full bg-[#8be4c5]" />
                                      {confidentialAvailability}
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
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2cc63]/80 focus-visible:ring-inset",
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
                                    <h3 className="text-[1rem] font-black uppercase leading-[1.08] tracking-[0.08em] text-[#f7ebcf]">
                                      {confidential ? confidentialName : profile.name}
                                    </h3>
                                    <p className="text-sm text-[#dfe7ef]">{confidential ? confidentialTitle : profile.title}</p>
                                    {hasVideo ? (
                                      <button
                                        type="button"
                                        aria-label={`Play ${profile.name}'s video introduction`}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleOpenVideo();
                                        }}
                                        className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#8be4c5]/70 bg-[#8be4c5]/12 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#dffcf1] shadow-[0_8px_18px_rgba(0,0,0,0.16)] transition hover:bg-[#8be4c5]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8be4c5]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]"
                                      >
                                        <Play className="h-3.5 w-3.5" />
                                        Play video introduction
                                      </button>
                                    ) : null}
                                  </div>
                                  <div className="pt-1">
                                    <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#dfe7ef]">
                                      <span className="h-2.5 w-2.5 rounded-full bg-[#8be4c5]" />
                                      {confidential ? confidentialAvailability : profile.availability}
                                    </span>
                                  </div>
                                </div>
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
                            aria-label="Introduction video player"
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
                                <button type="button" aria-label={isMuted ? "Unmute introduction video" : "Mute introduction video"} onClick={toggleMute} className="rounded-full border border-white/20 bg-white/10 p-2 backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2cc63]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]">
                                  {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                </button>
                                <button type="button" aria-label={isPlaying ? "Pause introduction video" : "Play introduction video"} onClick={handlePlaybackToggle} className="rounded-full border border-[#f2cc63]/45 bg-[#f7ebcf] p-2 text-[#0f2744] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2cc63]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]">
                                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                </button>
                                <button type="button" aria-label="Replay introduction video" onClick={handleReplay} className="rounded-full border border-white/20 bg-white/10 p-2 backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2cc63]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]">
                                  <RotateCw className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" aria-label="Return to photo" onClick={handleCloseVideo} className="rounded-full border border-white/20 bg-white/10 p-2 backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2cc63]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]">
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
                    className="-my-2.5 inline-flex h-11 min-h-11 items-center justify-center rounded-full px-1 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2744]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7ebcf]"
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

          <div className={cn("absolute inset-0 z-10 h-full w-full overflow-hidden rounded-[28px] border border-[#0f2744]/15 bg-[#f7ebcf] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)_translateZ(1px)]", isFlipped ? "pointer-events-auto z-20" : "pointer-events-none z-10", settledFace === "front" && !isFlipped ? "invisible" : "visible")}>
            <div className="flex h-full flex-col bg-[#f7ebcf]">
              <div className={cn("border-b border-[#0f2744]/10 bg-[#0f2744]", isEmployerPresentation ? "p-1 sm:p-1.5" : "p-2 sm:p-2.5")}>
                <div className="flex items-center justify-between gap-3">
                  <div className={cn("overflow-hidden", isEmployerPresentation ? "h-[3.6rem] w-[5.5rem] sm:h-[4.1rem] sm:w-[6.5rem]" : "h-[4.75rem] w-[7.25rem] sm:h-[5.5rem] sm:w-[8.75rem]")}>
                    <Image src="/FullLogo%20(4)-transparent.png" alt="Free Agent Staff" width={144} height={60} className="h-full w-full object-contain object-left" />
                  </div>
                  <button
                    type="button"
                    onClick={handleFlipToggle}
                    aria-label="Return to front"
                    className="-my-2.5 inline-flex h-11 min-h-11 items-center justify-center rounded-full px-1 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2cc63]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f2744]"
                  >
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-[#f7ebcf]">
                      <RotateCw className="h-3 w-3" />
                      Front
                    </span>
                  </button>
                </div>
              </div>

              <div className="relative flex-1 min-h-0">
                <div
                  ref={backContentRef}
                  onScroll={(event) => {
                    const content = event.currentTarget;
                    const hasOverflow = content.scrollHeight > content.clientHeight + 1;
                    const isAtBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 1;
                    setShowBackScrollFade(hasOverflow && !isAtBottom);
                  }}
                  className="h-full overflow-y-auto bg-[#f7ebcf] p-2 sm:p-2.25"
                >
                  <div className="space-y-1">
                  <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[0.9rem] font-black uppercase tracking-[0.08em] text-[#0f2744]">
                        {confidential ? "Confidential profile" : profile.name}
                      </h3>
                      <p className="mt-0.5 text-[0.75rem] text-[#27405f]">{confidential ? confidentialTitle : profile.title}</p>
                    </div>
                    <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.25 text-[0.7rem] text-[#27405f]">
                      <span className="inline-flex items-center gap-1.25 rounded-full border border-[#0f2744]/10 bg-[#f7ebcf]/80 px-2 py-0.5">
                        <MapPin className="h-2.75 w-2.75 text-[#0f2744]" />
                        {confidential ? confidentialLocation : profile.location}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#0f2744]/10 bg-[#0f2744] px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf]">
                        <span className="h-1.75 w-1.75 rounded-full bg-[#8be4c5]" />
                        {confidential ? confidentialAvailability : profile.availability}
                      </span>
                    </div>
                  </div>

                  <div className="h-px w-full bg-[#0f2744]/10" />

                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-[#9a6d15]">Top Strength</p>
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

                  {profile.education?.trim() ? (
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-[#9a6d15]">Education</p>
                      <p className="mt-0.5 whitespace-pre-line text-[0.64rem] leading-4 text-[#27405f]">{profile.education.trim()}</p>
                    </div>
                  ) : null}

                  {profile.education?.trim() ? <div className="h-px w-full bg-[#0f2744]/10" /> : null}

                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-[#9a6d15]">Experience</p>
                    <div className="mt-0.5 grid grid-cols-2 gap-1.5">
                      {recentRoles.map((role, index) => (
                          <div key={`${role.role}-${role.company}`} className={`min-w-0 py-0.25 ${index > 0 ? "border-l border-[#0f2744]/10 pl-1.5" : "pr-1.5"}`}>
                            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#0f2744]">{role.role}</p>
                            <p className="text-[0.64rem] text-[#27405f]">{role.company}</p>
                            <p className="text-[0.58rem] uppercase tracking-[0.2em] text-[#8a6b24]">{role.period}</p>
                            {role.description ? <p className="mt-0.5 line-clamp-2 text-[0.58rem] leading-3 text-[#27405f]">{role.description}</p> : null}
                            {role.achievements.length > 0 ? <p className="mt-0.5 line-clamp-1 text-[0.56rem] leading-3 text-[#27405f]"><span className="font-semibold text-[#0f2744]">Achievement: </span>{role.achievements[0]}</p> : null}
                            {role.skills.length > 0 ? (
                              <div className="mt-0.75 flex flex-wrap gap-1">
                                {role.skills.slice(0, 3).map((skill) => (
                                  <span key={skill} className="rounded-full border border-[#0f2744]/10 bg-[#f7ebcf] px-1 py-0.25 text-[0.5rem] font-semibold uppercase tracking-[0.12em] text-[#27405f]">{skill}</span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                      ))}
                    </div>
                  </div>
                  </div>
                </div>
                {showBackScrollFade ? <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#f7ebcf] via-[#f7ebcf]/85 to-transparent" /> : null}
              </div>

              <div className="border-t border-[#f2cc63]/20 bg-[#0f2744] px-3 py-2.5 sm:px-4 sm:py-3">
                <Link href={href} className="flex w-full items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:text-[#8be4c5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2cc63]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f2744]">
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
