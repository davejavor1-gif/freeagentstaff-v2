import "server-only";

import { createServiceRoleSupabaseClient, createUserServerSupabaseClient } from "@/lib/server-supabase";
import type { PrivateAccessRequest, PrivateAccessResponse, PrivateAccessState } from "@/types/private-access";

const BUCKET = "talent-resumes";

function clientFor(accessToken: string | null | undefined) {
  return accessToken ? createUserServerSupabaseClient(accessToken) : null;
}

async function rpc<T>(accessToken: string | null | undefined, name: string, args?: Record<string, unknown>) {
  const client = clientFor(accessToken);
  if (!client) return { data: null as T | null, error: { message: "Sign in required." } };
  return (client as unknown as { rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: T | null; error: { message: string } | null }> }).rpc(name, args);
}

function mapError(error: { message: string } | null) {
  return error?.message || "Unable to complete private access request.";
}

type StateRow = {
  request_id: string | null;
  is_owner: boolean;
  request_status: PrivateAccessState["status"];
  requested_at: string | null;
  contact_email: string | null;
  resume_original_filename: string | null;
  resume_uploaded_at: string | null;
  resume_available: boolean;
};

type RequestRow = {
  request_id: string;
  employer_user_id: string;
  employer_company_name: string | null;
  employer_contact_name: string | null;
  employer_contact_role: string | null;
  request_status: Exclude<PrivateAccessState["status"], "none" | "owner_full">;
  requested_at: string;
  responded_at: string | null;
  revoked_at: string | null;
};

function mapRequest(row: RequestRow): PrivateAccessRequest {
  return {
    requestId: row.request_id,
    employerUserId: row.employer_user_id,
    employerCompanyName: row.employer_company_name,
    employerContactName: row.employer_contact_name,
    employerContactRole: row.employer_contact_role,
    status: row.request_status,
    requestedAt: row.requested_at,
    respondedAt: row.responded_at,
    revokedAt: row.revoked_at,
  };
}

export async function loadPrivateAccess(accessToken: string | null | undefined, slug: string): Promise<PrivateAccessResponse> {
  const { data, error } = await rpc<StateRow[]>(accessToken, "talent_private_access_for_viewer", { p_talent_slug: slug });
  if (error) return { ok: false, message: mapError(error) };
  const row = data?.[0];
  if (!row) return { ok: false, message: "Private access is unavailable." };

  const state: PrivateAccessState = {
    requestId: row.request_id,
    isOwner: row.is_owner,
    status: row.request_status,
    requestedAt: row.requested_at,
    contactEmail: row.contact_email,
    resumeOriginalFilename: row.resume_original_filename,
    resumeUploadedAt: row.resume_uploaded_at,
    resumeAvailable: row.resume_available,
  };

  if (row.is_owner) {
    const requests = await rpc<RequestRow[]>(accessToken, "list_talent_private_access_requests");
    if (!requests.error) state.requests = (requests.data ?? []).map(mapRequest);
  }

  return { ok: true, state };
}

export async function requestPrivateAccess(accessToken: string | null | undefined, slug: string): Promise<PrivateAccessResponse> {
  const { data, error } = await rpc<Array<{ request_id: string; request_status: PrivateAccessState["status"]; requested_at: string }>>(accessToken, "employer_request_talent_private_access", { p_talent_slug: slug });
  if (error) return { ok: false, message: mapError(error) };
  const row = data?.[0];
  return row ? { ok: true, state: { requestId: row.request_id, isOwner: false, status: row.request_status, requestedAt: row.requested_at, contactEmail: null, resumeOriginalFilename: null, resumeUploadedAt: null, resumeAvailable: false } } : { ok: false, message: "Unable to create access request." };
}

export async function respondPrivateAccess(accessToken: string | null | undefined, requestId: string, status: "accepted" | "declined"): Promise<PrivateAccessResponse> {
  const { data, error } = await rpc<Array<{ request_id: string; request_status: PrivateAccessState["status"]; responded_at: string }>>(accessToken, "talent_set_private_access_request_status", { p_request_id: requestId, p_status: status });
  if (error) return { ok: false, message: mapError(error) };
  const row = data?.[0];
  return row ? { ok: true, state: { requestId: row.request_id, isOwner: true, status: row.request_status, requestedAt: null, contactEmail: null, resumeOriginalFilename: null, resumeUploadedAt: null, resumeAvailable: false } } : { ok: false, message: "Unable to update access request." };
}

export async function revokePrivateAccess(accessToken: string | null | undefined, requestId: string): Promise<PrivateAccessResponse> {
  const { data, error } = await rpc<Array<{ request_id: string; request_status: PrivateAccessState["status"]; revoked_at: string }>>(accessToken, "talent_revoke_private_access", { p_request_id: requestId });
  if (error) return { ok: false, message: mapError(error) };
  const row = data?.[0];
  return row ? { ok: true, state: { requestId: row.request_id, isOwner: true, status: row.request_status, requestedAt: null, contactEmail: null, resumeOriginalFilename: null, resumeUploadedAt: null, resumeAvailable: false } } : { ok: false, message: "Unable to revoke access." };
}

export async function getPrivateResumeUrl(accessToken: string | null | undefined, slug: string) {
  const { data, error } = await rpc<Array<{ contact_email: string | null; resume_original_filename: string | null; resume_uploaded_at: string | null; resume_storage_path: string | null }>>(accessToken, "talent_private_details_for_authorized_employer", { p_talent_slug: slug });
  if (error) return { ok: false as const, message: mapError(error) };
  const path = data?.[0]?.resume_storage_path;
  if (!path) return { ok: false as const, message: "Resume is unavailable." };
  const serviceClient = createServiceRoleSupabaseClient();
  if (!serviceClient) return { ok: false as const, message: "Resume service is unavailable." };
  const signed = await serviceClient.storage.from(BUCKET).createSignedUrl(path, 60);
  if (signed.error || !signed.data?.signedUrl) return { ok: false as const, message: "Resume is unavailable." };
  return { ok: true as const, url: signed.data.signedUrl, filename: data[0].resume_original_filename ?? "Resume" };
}