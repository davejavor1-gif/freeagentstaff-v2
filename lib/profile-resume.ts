import "server-only";

import { createServiceRoleSupabaseClient, createUserServerSupabaseClient } from "@/lib/server-supabase";

export const RESUME_BUCKET = "talent-resumes";
export const RESUME_MAX_BYTES = 10 * 1024 * 1024;

const allowedExtensions = new Map([
  [".pdf", "application/pdf"],
  [".doc", "application/msword"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
]);

type ResumeMetadata = {
  resume_storage_path: string | null;
  resume_original_filename: string | null;
  resume_uploaded_at: string | null;
};

function getExtension(filename: string) {
  const match = /\.[a-z0-9]+$/i.exec(filename.trim());
  return match?.[0].toLowerCase() ?? "";
}

export function validateResumeFile(file: File) {
  if (!file || file.size <= 0) {
    return "Choose a non-empty resume file.";
  }

  if (file.size > RESUME_MAX_BYTES) {
    return "Resume files must be 10 MB or smaller.";
  }

  const extension = getExtension(file.name);
  const expectedMime = allowedExtensions.get(extension);

  if (!expectedMime) {
    return "Resume files must be PDF, DOC, or DOCX.";
  }

  if (file.type && file.type !== expectedMime && !(extension === ".docx" && file.type === "application/octet-stream")) {
    return "The selected file type does not match its extension.";
  }

  return null;
}

function displayFilename(filename: string) {
  const base = filename.replace(/[/\\]/g, "_").replace(/[^a-zA-Z0-9._ -]/g, "_").trim();
  return base.slice(0, 160) || "resume";
}

async function authenticateTalent(accessToken: string | null | undefined) {
  if (!accessToken) {
    return { error: "Sign in required." } as const;
  }

  const userClient = createUserServerSupabaseClient(accessToken);
  const { data, error } = await userClient.auth.getUser(accessToken);

  if (error || !data.user) {
    return { error: "Sign in required." } as const;
  }

  const serviceClient = createServiceRoleSupabaseClient();
  if (!serviceClient) {
    return { error: "Resume service is unavailable." } as const;
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("account_type, resume_storage_path, resume_original_filename, resume_uploaded_at")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const profileRow = profile as unknown as (ResumeMetadata & { account_type: string }) | null;

  if (profileError || profileRow?.account_type !== "talent") {
    return { error: "Resume access is unavailable." } as const;
  }

  return { userId: data.user.id, serviceClient, profile: profileRow as ResumeMetadata } as const;
}

export async function uploadTalentResume(accessToken: string | null | undefined, file: File) {
  const auth = await authenticateTalent(accessToken);
  if ("error" in auth) return { ok: false as const, message: auth.error };

  const validationError = validateResumeFile(file);
  if (validationError) return { ok: false as const, message: validationError };

  const extension = getExtension(file.name);
  const storagePath = `${auth.userId}/${crypto.randomUUID()}${extension}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await auth.serviceClient.storage.from(RESUME_BUCKET).upload(storagePath, bytes, {
    contentType: allowedExtensions.get(extension),
    upsert: false,
  });

  if (uploadError) return { ok: false as const, message: "Unable to upload the resume." };

  const uploadedAt = new Date().toISOString();
  const { error: updateError } = await auth.serviceClient
    .from("profiles")
    .update({
      resume_storage_path: storagePath,
      resume_original_filename: displayFilename(file.name),
      resume_uploaded_at: uploadedAt,
    } as never)
    .eq("user_id", auth.userId);

  if (updateError) {
    await auth.serviceClient.storage.from(RESUME_BUCKET).remove([storagePath]);
    return { ok: false as const, message: "Unable to save resume details." };
  }

  if (auth.profile.resume_storage_path && auth.profile.resume_storage_path !== storagePath) {
    await auth.serviceClient.storage.from(RESUME_BUCKET).remove([auth.profile.resume_storage_path]);
  }

  return {
    ok: true as const,
    resume: {
      storagePath,
      originalFilename: displayFilename(file.name),
      uploadedAt,
      size: file.size,
      contentType: allowedExtensions.get(extension),
    },
  };
}

export async function removeTalentResume(accessToken: string | null | undefined) {
  const auth = await authenticateTalent(accessToken);
  if ("error" in auth) return { ok: false as const, message: auth.error };

  if (auth.profile.resume_storage_path) {
    await auth.serviceClient.storage.from(RESUME_BUCKET).remove([auth.profile.resume_storage_path]);
  }

  const { error } = await auth.serviceClient
    .from("profiles")
    .update({ resume_storage_path: null, resume_original_filename: null, resume_uploaded_at: null } as never)
    .eq("user_id", auth.userId);

  return error ? { ok: false as const, message: "Unable to remove the resume." } : { ok: true as const };
}

export async function getTalentResume(accessToken: string | null | undefined) {
  const auth = await authenticateTalent(accessToken);
  if ("error" in auth) return { ok: false as const, message: auth.error };
  if (!auth.profile.resume_storage_path) return { ok: false as const, message: "No resume has been uploaded." };

  const { data, error } = await auth.serviceClient.storage.from(RESUME_BUCKET).createSignedUrl(auth.profile.resume_storage_path, 60);
  if (error || !data?.signedUrl) return { ok: false as const, message: "Unable to open the resume." };

  return { ok: true as const, url: data.signedUrl, filename: auth.profile.resume_original_filename };
}