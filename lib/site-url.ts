export const FREEAGENTSTAFF_PRODUCTION_ORIGIN = "https://freeagentstaff.com";

export function getConfiguredSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return configured ? configured.replace(/\/+$/, "") : null;
}

export function getPublicAppOrigin(options?: {
  forStripe?: boolean;
  allowPreviewHost?: boolean;
  request?: Request;
}) {
  const configured = getConfiguredSiteUrl();

  if (options?.forStripe) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") {
      return FREEAGENTSTAFF_PRODUCTION_ORIGIN;
    }
  }

  if (configured) {
    return configured;
  }

  if (options?.allowPreviewHost && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  if (options?.request) {
    const forwardedHost = options.request.headers.get("x-forwarded-host") ?? options.request.headers.get("host");
    const forwardedProto = options.request.headers.get("x-forwarded-proto") ?? "https";
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }

    return new URL(options.request.url).origin;
  }

  return "http://localhost:3000";
}

export function getPublicAppUrl(pathname: string, options?: { forStripe?: boolean; allowPreviewHost?: boolean; request?: Request }) {
  const base = getPublicAppOrigin(options).replace(/\/+$/, "");
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${normalizedPath}`;
}
