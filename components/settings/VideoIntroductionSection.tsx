"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, ImageIcon, Play, RefreshCw, Trash2, UploadCloud, Video } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { resolveProfilePhotoUrl, resolveProfileVideoUrl } from "@/lib/profile-media";
import type { FreeAgentProfile } from "@/types/freeagent";

const MAX_PHOTO_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 60;
const MAX_VIDEO_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const ACCEPTED_PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const ACCEPTED_VIDEO_EXTENSIONS = ["mp4", "mov", "webm"];

interface ProfileMediaSectionProps {
  profile: FreeAgentProfile;
  onProfileChange: (nextProfile: FreeAgentProfile) => void;
  isSaving: boolean;
  visibility?: string;
  hasProAccess?: boolean;
}

const getFileExtension = (fileName: string) => fileName.split(".").pop()?.toLowerCase();

const isAcceptedPhotoFile = (file: File) => {
  const extension = getFileExtension(file.name);
  if (!extension || !ACCEPTED_PHOTO_EXTENSIONS.includes(extension)) {
    return false;
  }

  return file.type === "" || file.type.startsWith("image/");
};

const isAcceptedVideoFile = (file: File) => {
  const extension = getFileExtension(file.name);
  return Boolean(extension && ACCEPTED_VIDEO_EXTENSIONS.includes(extension));
};

const getVideoDuration = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Unable to read the selected video."));
    });

    const duration = video.duration;
    URL.revokeObjectURL(objectUrl);
    return duration;
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
};

export default function ProfileMediaSection({
  profile,
  onProfileChange,
  isSaving,
  visibility,
  hasProAccess = false,
}: ProfileMediaSectionProps) {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState<string | null>(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const photoUrlCandidate = photoPreviewUrl ?? resolvedPhotoUrl ?? profile.photoUrl ?? null;
  const hasPhoto = Boolean(photoUrlCandidate && !/(logo|fullLogo|placeholder-avatar)/i.test(photoUrlCandidate));
  const hasVideo = Boolean(resolvedVideoUrl ?? profile.intro_video_url);
  const isConfidential = visibility === "confidential";
  const canShowVideo = hasVideo && !isConfidential && hasProAccess;
  const activePreviewUrl = photoPreviewUrl ?? resolvedPhotoUrl ?? (hasPhoto ? profile.photoUrl : null);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  useEffect(() => {
    let active = true;

    const resolveMedia = async () => {
      const [nextPhotoUrl, nextVideoUrl] = await Promise.all([
        resolveProfilePhotoUrl(profile, { allowEmployerAccess: true }),
        resolveProfileVideoUrl(profile, { allowEmployerAccess: true }),
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
  }, [profile.photo_storage_path, profile.intro_video_storage_path, profile.photoUrl, profile.intro_video_url]);

  const infoText = useMemo(() => {
    if (isConfidential) {
      return "Your media stays private in your editor and on confidential cards. Employers only see identifying media when visibility permissions allow it.";
    }

    return "Upload a portrait photo and a short introduction video so employers can get to know you beyond your Talent Passport.";
  }, [isConfidential]);

  const clearPreview = () => {
    if (photoPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoPreviewUrl(null);
  };

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);
    setMessage(null);

    if (!isAcceptedPhotoFile(file)) {
      setError("Please upload a JPG, JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) {
      setError("Your photo must be 10MB or smaller.");
      event.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (photoPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoPreviewUrl(previewUrl);

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session) {
      setError("Please sign in again before uploading your profile photo.");
      clearPreview();
      event.target.value = "";
      return;
    }

    const extension = getFileExtension(file.name) ?? "jpg";
    const storagePath = `${session.user.id}/profile-photo.${extension}`;

    setIsUploadingPhoto(true);

    try {
      const { error: uploadError } = await supabase.storage.from("profile-media").upload(storagePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadError) {
        throw uploadError;
      }

      onProfileChange({
        ...profile,
        photoUrl: undefined,
        imageAlt: file.name,
        photo_storage_path: storagePath,
      });

      setMessage("Profile photo uploaded.");
      clearPreview();
    } catch (uploadError) {
      clearPreview();
      setError((uploadError as Error).message || "The photo could not be uploaded right now.");
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm("Remove your profile photo?")) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsDeletingPhoto(true);

    try {
      if (profile.photo_storage_path) {
        const { error: deleteError } = await supabase.storage.from("profile-media").remove([profile.photo_storage_path]);
        if (deleteError) {
          throw deleteError;
        }
      }

      onProfileChange({
        ...profile,
        photoUrl: undefined,
        imageAlt: undefined,
        photo_storage_path: null,
      });
      clearPreview();
      setMessage("Profile photo removed.");
    } catch (deleteError) {
      setError((deleteError as Error).message || "The photo could not be deleted right now.");
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  const handleVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!hasProAccess) {
      setError("Video publishing requires an active Free Agent Pro subscription.");
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);
    setMessage(null);

    if (!isAcceptedVideoFile(file)) {
      setError("Please upload an MP4, MOV, or WebM video.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_VIDEO_FILE_SIZE_BYTES) {
      setError("Your video must be smaller than 100MB.");
      event.target.value = "";
      return;
    }

    try {
      const duration = await getVideoDuration(file);
      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        setError(`Your video must be 60 seconds or less. This file is ${Math.ceil(duration)} seconds.`);
        event.target.value = "";
        return;
      }
    } catch {
      setError("The selected file could not be analysed before upload.");
      event.target.value = "";
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session) {
      setError("Please sign in again before uploading your introduction video.");
      event.target.value = "";
      return;
    }

    const extension = getFileExtension(file.name) ?? "mp4";
    const storagePath = `${session.user.id}/intro.${extension}`;
    const previousStoragePath = profile.intro_video_storage_path;

    setIsUploadingVideo(true);

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage.from("intro-videos").upload(storagePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadError) {
        throw uploadError;
      }

      if (!uploadData?.path) {
        throw new Error("Upload succeeded without returning a storage path.");
      }

      const persistedStoragePath = uploadData.path;

      onProfileChange({
        ...profile,
        intro_video_url: undefined,
        intro_video_storage_path: persistedStoragePath,
      });

      if (previousStoragePath && previousStoragePath !== persistedStoragePath) {
        const { error: previousDeleteError } = await supabase.storage.from("intro-videos").remove([previousStoragePath]);
        if (previousDeleteError) {
          setMessage("Video uploaded, but we could not remove the previous video file.");
          return;
        }
      }

      setMessage("Video introduction uploaded.");
    } catch (uploadError) {
      setError((uploadError as Error).message || "The video could not be uploaded right now.");
    } finally {
      setIsUploadingVideo(false);
      event.target.value = "";
    }
  };

  const handleDeleteVideo = async () => {
    if (!hasProAccess) {
      setError("Video publishing controls are available on Free Agent Pro.");
      return;
    }

    if (!window.confirm("Remove your video introduction?")) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsDeletingVideo(true);

    try {
      if (profile.intro_video_storage_path) {
        const { error: deleteError } = await supabase.storage.from("intro-videos").remove([profile.intro_video_storage_path]);
        if (deleteError) {
          throw deleteError;
        }
      }

      onProfileChange({
        ...profile,
        intro_video_url: null,
        intro_video_storage_path: null,
      });
      setMessage("Video introduction removed.");
    } catch (deleteError) {
      setError((deleteError as Error).message || "The video could not be deleted right now.");
    } finally {
      setIsDeletingVideo(false);
    }
  };

  return (
    <section className="space-y-4 rounded-[24px] border border-[#cda64d]/40 bg-white/80 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">PROFILE MEDIA</p>
          <p className="mt-2 text-sm leading-7 text-[#27405f]">{infoText}</p>
        </div>
        <div className="rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#0f2744]">
          {hasPhoto || hasVideo ? "Media ready" : "No media yet"}
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="space-y-4 rounded-[20px] border border-[#cda64d]/40 bg-[#f7ebcf]/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">PROFILE PHOTO</p>
            <p className="mt-2 text-sm leading-7 text-[#27405f]">
              For best results, use a clear portrait photo with your face centred and enough space around your head and shoulders.
            </p>
          </div>
          <div className="rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#0f2744]">
            {hasPhoto ? "Photo added" : "No photo yet"}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#cda64d]/50 bg-[#0f2744] shadow-[0_10px_24px_rgba(7,20,38,0.18)]">
            {activePreviewUrl ? (
              <Image src={activePreviewUrl} alt={profile.imageAlt ?? profile.name ?? "Profile photo"} width={120} height={120} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-10 w-10 text-[#f7ebcf]" />
            )}
          </div>

          <div className="flex-1 space-y-3">
            <p className="text-sm leading-7 text-[#27405f]">
              Upload a JPG, JPEG, PNG, or WebP file up to 10MB. The card will use the same portrait image without cropping automatically.
            </p>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#f2cc63] disabled:cursor-not-allowed disabled:opacity-60">
                <UploadCloud className="h-4 w-4" />
                {hasPhoto ? "Replace photo" : "Upload profile photo"}
                <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} disabled={isUploadingPhoto || isUploadingVideo} />
              </label>

              <button
                type="button"
                onClick={handleDeletePhoto}
                disabled={!hasPhoto || isDeletingPhoto || isUploadingPhoto || isUploadingVideo}
                className="inline-flex items-center gap-2 rounded-full border border-[#cda64d]/40 bg-transparent px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2cc63] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Remove photo
              </button>
            </div>
            {isUploadingPhoto ? <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Uploading photo...</p> : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-[20px] border border-[#cda64d]/40 bg-[#f7ebcf]/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">VIDEO INTRODUCTION</p>
            <p className="mt-2 text-sm leading-7 text-[#27405f]">
              Introduce yourself in up to 60 seconds and give employers a sense of who you are beyond your Talent Passport.
            </p>
          </div>
          <div className="rounded-full border border-[#f2cc63]/35 bg-[#f7ebcf]/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#0f2744]">
            {hasVideo ? "Video introduction added" : "No video yet"}
          </div>
        </div>

        {isConfidential ? (
          <div className="rounded-2xl border border-[#cda64d]/35 bg-white/70 px-3 py-2 text-sm text-[#27405f]">
            Videos remain hidden on confidential cards. Your introduction stays protected unless your visibility settings allow it.
          </div>
        ) : null}

        {!hasProAccess ? (
          <div className="rounded-2xl border border-[#cda64d]/35 bg-white/70 px-3 py-2 text-sm text-[#27405f]">
            Free Agent Pro is required to publish video introductions. Existing uploads stay stored but are hidden from employer-facing surfaces until Pro is active.
          </div>
        ) : null}

        {canShowVideo ? (
          <div className="rounded-[20px] border border-[#cda64d]/40 bg-[#f7ebcf]/70 p-3">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">
              <Play className="h-3.5 w-3.5" />
              Preview
            </div>
            <video
              className="w-full rounded-[16px] border border-[#0f2744]/15 bg-[#071426]"
              src={resolvedVideoUrl ?? profile.intro_video_url ?? undefined}
              controls
              playsInline
              preload="metadata"
              muted
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#0f2744]/20 bg-[#0f2744] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7ebcf] transition hover:bg-[#17355f] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#f2cc63] disabled:cursor-not-allowed disabled:opacity-60">
            <UploadCloud className="h-4 w-4" />
            {hasVideo ? "Replace video" : "Upload video introduction"}
            <input type="file" className="hidden" accept="video/mp4,video/quicktime,video/webm" onChange={handleVideoUpload} disabled={!hasProAccess || isUploadingPhoto || isUploadingVideo} />
          </label>

          <button
            type="button"
            onClick={handleDeleteVideo}
            disabled={!hasProAccess || !hasVideo || isDeletingVideo || isUploadingPhoto || isUploadingVideo}
            className="inline-flex items-center gap-2 rounded-full border border-[#cda64d]/40 bg-transparent px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f2744] transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2cc63] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Remove video
          </button>
        </div>

        <div className="rounded-[18px] border border-[#cda64d]/30 bg-[#f7ebcf]/50 p-3 text-sm text-[#27405f]">
          <div className="flex flex-wrap items-center gap-2">
            <Video className="h-4 w-4 text-[#0f2744]" />
            <span>Accepted formats: MP4, MOV, WebM. Maximum 60 seconds and 100MB.</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-[#9a6d15]">
            <RefreshCw className="h-3.5 w-3.5" />
            Upload-from-device only in this version. Record video is planned for a future release.
          </div>
        </div>

        {isUploadingVideo ? <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">Uploading video...</p> : null}
      </div>

      {isUploadingPhoto || isUploadingVideo || isDeletingPhoto || isDeletingVideo || isSaving ? (
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9a6d15]">
          {isUploadingPhoto ? "Uploading photo..." : isUploadingVideo ? "Uploading video..." : isDeletingPhoto ? "Deleting photo..." : isDeletingVideo ? "Deleting video..." : "Saving profile..."}
        </div>
      ) : null}
    </section>
  );
}
