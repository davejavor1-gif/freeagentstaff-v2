import { FREEAGENTSTAFF_PRODUCTION_ORIGIN } from "@/lib/site-url";

export type PublicPassportShareState = {
  slug?: string | null;
  visibility?: string | null;
  isPublished?: boolean | null;
};

export function getPublicPassportPath(slug: string) {
  const normalizedSlug = slug.trim();
  return `/talent/${encodeURIComponent(normalizedSlug)}`;
}

export function getPublicPassportUrl(slug: string) {
  return `${FREEAGENTSTAFF_PRODUCTION_ORIGIN}${getPublicPassportPath(slug)}`;
}

export function canSharePublicPassport(state: PublicPassportShareState) {
  return Boolean(
    state.slug?.trim()
    && state.isPublished === true
    && state.visibility === "public",
  );
}
