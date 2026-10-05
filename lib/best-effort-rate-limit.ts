const WINDOW_MS = 10 * 60 * 1000;
const MAX_LOOKUP_PER_WINDOW = 30;
const MAX_SUBMIT_PER_WINDOW = 10;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 500) {
    return;
  }
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/**
 * Best-effort per-instance guard only. Vercel serverless instances do not share
 * this memory, so it is not a global rate limiter. Token entropy and the
 * one-use SQL update remain the real controls.
 */
export function consumeBestEffortReferenceRateLimit(params: {
  action: "lookup" | "submit";
  ip: string | null;
  tokenHash: string;
}) {
  const now = Date.now();
  prune(now);
  const ipKey = params.ip?.trim() || "unknown";
  const key = `${params.action}:${ipKey}:${params.tokenHash.slice(0, 12)}`;
  const max = params.action === "lookup" ? MAX_LOOKUP_PER_WINDOW : MAX_SUBMIT_PER_WINDOW;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true as const };
  }

  if (existing.count >= max) {
    return { ok: false as const };
  }

  existing.count += 1;
  return { ok: true as const };
}

export function getClientIp(requestHeaders: Headers) {
  const forwarded = requestHeaders.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return requestHeaders.get("x-real-ip")?.trim() || null;
}
