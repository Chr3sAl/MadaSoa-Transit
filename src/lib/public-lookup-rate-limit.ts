import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { hasDatabaseUrl, isDemoModeEnabled } from "@/lib/runtime";

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_PUBLIC_LOOKUPS_PER_WINDOW = 10;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalForPublicLookupRateLimit = globalThis as typeof globalThis & {
  publicLookupRateLimitStore?: Map<string, RateLimitEntry>;
};

function getRateLimitStore() {
  if (!globalForPublicLookupRateLimit.publicLookupRateLimitStore) {
    globalForPublicLookupRateLimit.publicLookupRateLimitStore = new Map();
  }

  return globalForPublicLookupRateLimit.publicLookupRateLimitStore;
}

export function getPublicLookupClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "anonymous";
  }

  return request.headers.get("x-real-ip")?.trim() || "anonymous";
}

function buildBucketKey(identifier: string, bucket: number) {
  return createHash("sha256").update(`${identifier}:${bucket}`).digest("hex");
}

function takeInMemoryPublicLookupRateLimit(identifier: string, now = Date.now()) {
  const store = getRateLimitStore();
  const existingEntry = store.get(identifier);

  if (!existingEntry || existingEntry.resetAt <= now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    store.set(identifier, { count: 1, resetAt });

    return {
      limited: false,
      remaining: MAX_PUBLIC_LOOKUPS_PER_WINDOW - 1,
      resetAt,
    };
  }

  if (existingEntry.count >= MAX_PUBLIC_LOOKUPS_PER_WINDOW) {
    return {
      limited: true,
      remaining: 0,
      resetAt: existingEntry.resetAt,
    };
  }

  existingEntry.count += 1;
  store.set(identifier, existingEntry);

  return {
    limited: false,
    remaining: MAX_PUBLIC_LOOKUPS_PER_WINDOW - existingEntry.count,
    resetAt: existingEntry.resetAt,
  };
}

export async function takePublicLookupRateLimit(identifier: string, now = Date.now()) {
  if (isDemoModeEnabled() || !hasDatabaseUrl()) {
    return takeInMemoryPublicLookupRateLimit(identifier, now);
  }

  const bucket = Math.floor(now / RATE_LIMIT_WINDOW_MS);
  const resetAt = (bucket + 1) * RATE_LIMIT_WINDOW_MS;
  const record = await prisma.publicLookupRateLimitBucket.upsert({
    where: {
      key: buildBucketKey(identifier, bucket),
    },
    update: {
      hitCount: {
        increment: 1,
      },
    },
    create: {
      key: buildBucketKey(identifier, bucket),
      hitCount: 1,
    },
  });

  return {
    limited: record.hitCount > MAX_PUBLIC_LOOKUPS_PER_WINDOW,
    remaining: Math.max(0, MAX_PUBLIC_LOOKUPS_PER_WINDOW - record.hitCount),
    resetAt,
  };
}

export function resetPublicLookupRateLimit() {
  getRateLimitStore().clear();
}
