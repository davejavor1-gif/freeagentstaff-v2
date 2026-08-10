import { supabase } from "@/lib/supabase-client";

const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;

interface ResolveMediaOptions {
  currentUserId?: string | null;
  isOwner?: boolean;
  fallbackUrl?: string | null;
  allowEmployerAccess?: boolean;
}

export async function resolveStorageObjectUrl(
  bucket: "profile-media" | "intro-videos",
  objectPath: string | null | undefined,
  options: ResolveMediaOptions = {},
): Promise<string | null> {
  if (!objectPath) {
    return options.fallbackUrl ?? null;
  }

  const isOwner = options.isOwner ?? Boolean(options.currentUserId);
  if (!isOwner && !options.allowEmployerAccess) {
    return options.fallbackUrl ?? null;
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, DEFAULT_SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      return options.fallbackUrl ?? null;
    }

    return data.signedUrl;
  } catch {
    return options.fallbackUrl ?? null;
  }
}

export async function resolveProfilePhotoUrl(
  profile: { photo_storage_path?: string | null; photoUrl?: string | null },
  options: ResolveMediaOptions = {},
): Promise<string | null> {
  if (profile.photo_storage_path) {
    return resolveStorageObjectUrl("profile-media", profile.photo_storage_path, {
      ...options,
      fallbackUrl: profile.photoUrl ?? null,
    });
  }

  return profile.photoUrl ?? null;
}

export async function resolveProfileVideoUrl(
  profile: { intro_video_storage_path?: string | null; intro_video_url?: string | null },
  options: ResolveMediaOptions = {},
): Promise<string | null> {
  if (profile.intro_video_storage_path) {
    return resolveStorageObjectUrl("intro-videos", profile.intro_video_storage_path, {
      ...options,
      fallbackUrl: profile.intro_video_url ?? null,
    });
  }

  return profile.intro_video_url ?? null;
}
