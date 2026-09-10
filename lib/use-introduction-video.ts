"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveProfilePhotoUrl, resolveProfileVideoUrl } from "@/lib/profile-media";
import type { FreeAgentProfile } from "@/types/freeagent";

export function useIntroductionVideo(
  profile: FreeAgentProfile,
  confidential: boolean,
  playVideoRequest = 0,
) {
  const [videoOpen, setVideoOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const [showVideoControls, setShowVideoControls] = useState(false);
  const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState<string | null>(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasVideo = Boolean(resolvedVideoUrl ?? profile.intro_video_url) && !confidential;

  useEffect(() => {
    let active = true;

    const resolveMedia = async () => {
      const [nextPhotoUrl, nextVideoUrl] = await Promise.all([
        resolveProfilePhotoUrl(profile, { allowEmployerAccess: !confidential }),
        resolveProfileVideoUrl(profile, { allowEmployerAccess: !confidential }),
      ]);

      if (!active) return;

      setResolvedPhotoUrl(nextPhotoUrl);
      setResolvedVideoUrl(nextVideoUrl);
    };

    void resolveMedia();

    return () => {
      active = false;
    };
  }, [profile, confidential]);

  useEffect(() => {
    if (!videoOpen) return;

    const startPlayback = () => {
      const video = videoRef.current;
      if (!video || (!shouldAutoplay && !isPlaying)) return;

      if (shouldAutoplay) {
        video.muted = true;
        video.currentTime = 0;
      }
      video.play().then(() => {
        setIsPlaying(true);
        setShouldAutoplay(false);
      }).catch(() => {
        setIsPlaying(false);
        setShouldAutoplay(false);
      });

      return;
    };

    const video = videoRef.current;
    const retryTimer = window.setTimeout(startPlayback, 0);
    video?.addEventListener("loadeddata", startPlayback);
    startPlayback();

    return () => {
      window.clearTimeout(retryTimer);
      video?.removeEventListener("loadeddata", startPlayback);
    };
  }, [videoOpen, isPlaying, shouldAutoplay]);

  const resetVideoState = useCallback(() => {
    setIsPlaying(false);
    setShouldAutoplay(false);
    setShowVideoControls(false);
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.muted = false;
    }
  }, []);

  const handleOpenVideo = useCallback(async () => {
    if (!hasVideo || confidential) return;

    setVideoOpen(true);
    setShowVideoControls(true);
    setShouldAutoplay(false);
    setIsMuted(true);
  }, [confidential, hasVideo]);

  useEffect(() => {
    if (playVideoRequest <= 0) return;

    const requestTimer = window.setTimeout(() => {
      void handleOpenVideo();
    }, 0);

    return () => window.clearTimeout(requestTimer);
  }, [handleOpenVideo, playVideoRequest]);

  const handleCloseVideo = useCallback(() => {
    setVideoOpen(false);
    resetVideoState();
  }, [resetVideoState]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  const handlePlaybackToggle = useCallback(async () => {
    if (!videoRef.current) return;

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
  }, [isPlaying]);

  const handleReplay = useCallback(async () => {
    if (!videoRef.current) return;

    videoRef.current.currentTime = 0;
    videoRef.current.muted = false;
    setIsMuted(false);

    try {
      await videoRef.current.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    setVideoOpen(false);
    resetVideoState();
  }, [resetVideoState]);

  return {
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
  };
}
