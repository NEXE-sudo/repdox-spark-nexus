/**
 * Vercel Edge Middleware: Rate Limiting
 *
 * Protects against abuse by limiting requests per IP address per time window.
 * Uses Vercel KV for distributed caching across edge nodes.
 *
 * Limits:
 * - signup / verify → 3/hour/IP
 * - create event → 5/hour/IP
 * - register event → 200/hour/IP (allows bursts, limits sustained abuse)
 * - QR fetch/verify → 1000/min/IP
 * - General API → 500/min/IP
 *
 * Implementation:
 * 1. Extract IP from headers
 * 2. Check Redis key: rate_limit:{action}:{ip}
 * 3. If count < limit: increment and set expiry
 * 4. If count >= limit: return 429
 *
 * Requires:
 * - @vercel/kv package installed
 * - KV_REST_API_URL and KV_REST_API_TOKEN environment variables
 */

import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@vercel/kv";

/**
 * Create rate limiters for different endpoints
 */
const rateLimiters = {
  // Auth: 3 requests per hour
  auth: new Ratelimit({
    redis: {
      url: process.env.KV_REST_API_URL || "",
      token: process.env.KV_REST_API_TOKEN || "",
    },
    limiter: Ratelimit.slidingWindow(3, "60 m"),
  }),

  // Event creation: 5 per hour
  createEvent: new Ratelimit({
    redis: {
      url: process.env.KV_REST_API_URL || "",
      token: process.env.KV_REST_API_TOKEN || "",
    },
    limiter: Ratelimit.slidingWindow(5, "60 m"),
  }),

  // Event registration: 200 per hour (allows bursts)
  registerEvent: new Ratelimit({
    redis: {
      url: process.env.KV_REST_API_URL || "",
      token: process.env.KV_REST_API_TOKEN || "",
    },
    limiter: Ratelimit.slidingWindow(200, "60 m"),
  }),

  // QR operations: 1000 per minute per IP (very lenient)
  qr: new Ratelimit({
    redis: {
      url: process.env.KV_REST_API_URL || "",
      token: process.env.KV_REST_API_TOKEN || "",
    },
    limiter: Ratelimit.slidingWindow(1000, "1 m"),
  }),

  // General API: 500 per minute
  general: new Ratelimit({
    redis: {
      url: process.env.KV_REST_API_URL || "",
      token: process.env.KV_REST_API_TOKEN || "",
    },
    limiter: Ratelimit.slidingWindow(500, "1 m"),
  }),
};

/**
 * Extract client IP from request headers
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP) {
    return cfIP;
  }
  return request.ip || "unknown";
}

/**
 * Determine rate limiter based on route
 */
function getApplicableLimiter(
  pathname: string,
): { limiter: Ratelimit; key: string } | null {
  if (
    pathname.includes("/api/auth/") ||
    pathname.includes("/api/profile/verify")
  ) {
    return { limiter: rateLimiters.auth, key: "auth" };
  }

  if (pathname.includes("/api/events/create")) {
    return { limiter: rateLimiters.createEvent, key: "createEvent" };
  }

  if (pathname.includes("/api/events/register")) {
    return { limiter: rateLimiters.registerEvent, key: "registerEvent" };
  }

  if (pathname.includes("/api/qr/")) {
    return { limiter: rateLimiters.qr, key: "qr" };
  }

  if (pathname.includes("/api/")) {
    return { limiter: rateLimiters.general, key: "general" };
  }

  return null;
}

/**
 * Main middleware handler
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the applicable rate limiter
  const applicable = getApplicableLimiter(pathname);
  if (!applicable) {
    return NextResponse.next();
  }

  // Get client IP
  const ip = getClientIP(request);
  if (ip === "unknown") {
    console.warn("Could not determine client IP for:", pathname);
    // Fallback: allow but log for investigation
    return NextResponse.next();
  }

  // Check rate limit
  try {
    const { success, limit, remaining, reset } =
      await applicable.limiter.limit(ip);

    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", reset.toString());

    if (!success) {
      // Rate limit exceeded
      console.warn(
        `Rate limit exceeded for ${applicable.key}:${ip} (limit: ${limit})`,
      );

      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          code: "rate_limit_exceeded",
          retry_after: Math.ceil((reset - Date.now()) / 1000),
          limit,
          remaining: 0,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        },
      );
    }

    return response;
  } catch (err) {
    console.error("Rate limit check failed:", err);
    // On error, allow the request (fail open, not closed)
    return NextResponse.next();
  }
}

/**
 * Configure which paths use this middleware
 */
export const config = {
  matcher: [
    // Apply to all API routes
    "/api/:path*",
    // Exclude health checks
    "!(/_next/|/health|/status)",
  ],
};

/**
 * Alternative implementation using simple in-memory cache
 * (No KV required, but only works on single instance)
 *
 * This is included as a fallback for development/testing
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const inMemoryCache = new Map<string, RateLimitRecord>();

/**
 * In-memory rate limiter (for development/single-instance)
 */
export function rateLimitMemory(
  identifier: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const record = inMemoryCache.get(identifier);

  if (!record || now >= record.resetTime) {
    // New or expired window
    const resetTime = now + windowMs;
    inMemoryCache.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, reset: resetTime };
  }

  // Existing window
  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
    reset: record.resetTime,
  };
}

/**
 * Cleanup old entries from memory cache (run periodically)
 */
export function cleanupMemoryCache() {
  const now = Date.now();
  for (const [key, record] of inMemoryCache.entries()) {
    if (now >= record.resetTime) {
      inMemoryCache.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupMemoryCache, 5 * 60 * 1000);
}
