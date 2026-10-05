import { createHash, randomBytes } from "node:crypto";

const TOKEN_MIN_LENGTH = 16;
const TOKEN_MAX_LENGTH = 128;

export function generateTalentReferenceInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function normalizeTalentReferenceInvitationToken(raw: string | null | undefined) {
  const token = raw?.trim() ?? "";
  if (token.length < TOKEN_MIN_LENGTH || token.length > TOKEN_MAX_LENGTH) {
    return null;
  }
  if (/[^A-Za-z0-9_-]/.test(token)) {
    return null;
  }
  return token;
}

export function hashTalentReferenceInvitationToken(rawToken: string) {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}
