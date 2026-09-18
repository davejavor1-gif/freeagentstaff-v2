"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

  useLayoutEffect(() => {
    if (!videoOpen || !shouldAutoplay) return;

    let retryTimer = 0;
    let retries = 0;
    let attachedVideo: HTMLVideoElement | null = null;

    const startPlayback = () => {
      const video = attachedVideo ?? videoRef.current;
      if (!video) return;

      void video
        .play()
        .then(() => {
          setIsPlaying(true);
          setShouldAutoplay(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setShouldAutoplay(false);
        });
    };

    const attachAndPlay = () => {
      const video = videoRef.current;
      if (!video) {
        if (retries >= 8) return;
        retries += 1;
        retryTimer = window.setTimeout(attachAndPlay, 0);
        return;
      }

      attachedVideo = video;
      video.muted = false;
      video.currentTime = 0;

      if (video.readyState >= 2) {
        startPlayback();
        return;
      }

      video.addEventListener("loadeddata", startPlayback, { once: true });
      video.addEventListener("canplay", startPlayback, { once: true });
    };

    attachAndPlay();

    return () => {
      window.clearTimeout(retryTimer);
      attachedVideo?.removeEventListener("loadeddata", startPlayback);
      attachedVideo?.removeEventListener("canplay", startPlayback);
    };
  }, [videoOpen, shouldAutoplay]);

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

  const handleOpenVideo = useCallback(() => {
    if (!hasVideo || confidential) return;

    setVideoOpen(true);
    setShowVideoControls(true);
    setIsMuted(false);

    const video = videoRef.current;
    if (video) {
      video.muted = false;
      video.currentTime = 0;
      void video
        .play()
        .then(() => {
          setIsPlaying(true);
          setShouldAutoplay(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setShouldAutoplay(true);
        });
      return;
    }

    setShouldAutoplay(true);
  }, [confidential, hasVideo]);

  useEffect(() => {
    if (playVideoRequest <= 0) return;

    const requestTimer = window.setTimeout(() => {
      handleOpenVideo();
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
