import { NextRequest, NextResponse } from "next/server";
import { generateManualStreaming } from "@/lib/generate";
import { getLatestManual, storeManual } from "@/lib/storage";
import { sanitizeToolName, sanitizeSlug, isValidSlug } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 90;

// ──────────────────────────────────────────────
// In-memory rate limiting
// ──────────────────────────────────────────────

const MAX_RATE_LIMIT_ENTRIES = 10_000;

const rateLimitMap = new Map<
  string,
  { count: number; resetAt: number }
>();

function cleanupRateLimitMap() {
  if (rateLimitMap.size <= MAX_RATE_LIMIT_ENTRIES) return;
  const now = Date.now();
  for (const [key, value] of rateLimitMap) {
    if (value.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
  // If still over limit, evict oldest
  if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
    const entries = Array.from(rateLimitMap.entries()).sort(
      (a, b) => a[1].resetAt - b[1].resetAt
    );
    const toRemove = entries.slice(
      0,
      rateLimitMap.size - MAX_RATE_LIMIT_ENTRIES
    );
    for (const [key] of toRemove) {
      rateLimitMap.delete(key);
    }
  }
}

function checkRateLimit(ip: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  cleanupRateLimitMap();
  const now = Date.now();
  const windowMs = 60_000; // 1 minute
  const maxRequests = 5;

  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true };
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ──────────────────────────────────────────────
// NDJSON helper
// ──────────────────────────────────────────────

function sendEvent(
  controller: ReadableStreamDefaultController,
  data: Record<string, unknown>
) {
  const line = JSON.stringify(data) + "\n";
  controller.enqueue(new TextEncoder().encode(line));
}

// ──────────────────────────────────────────────
// POST handler
// ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawTool = body?.tool;
    const userApiKey = body?.apiKey;

    if (!rawTool || typeof rawTool !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'tool' field" },
        { status: 400 }
      );
    }

    if (!userApiKey || typeof userApiKey !== "string" || !userApiKey.trim()) {
      return NextResponse.json(
        { error: "Perplexity API key is required. Get yours at https://www.perplexity.ai/settings/api" },
        { status: 400 }
      );
    }

    const toolName = sanitizeToolName(rawTool);
    if (toolName.length === 0) {
      return NextResponse.json(
        { error: "Tool name is empty after sanitization" },
        { status: 400 }
      );
    }

    const slug = sanitizeSlug(toolName);
    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: "Could not generate a valid slug from tool name" },
        { status: 400 }
      );
    }

    // Rate limit
    const ip = getClientIP(request);
    const { allowed, retryAfter } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    // Check cache (24h)
    const cached = await getLatestManual(slug);
    if (cached && !body.forceRefresh) {
      const generatedAt = new Date(cached.generatedAt).getTime();
      const age = Date.now() - generatedAt;
      if (age < 24 * 60 * 60 * 1000) {
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        return NextResponse.json({
          cached: true,
          manual: cached,
          shareableUrl: `${baseUrl}/manual/${slug}`,
          summary: {
            features: cached.features.length,
            shortcuts: cached.shortcuts.length,
            workflows: cached.workflows.length,
            tips: cached.tips.length,
            commonMistakes: cached.commonMistakes.length,
            coverageScore: cached.coverageScore,
          },
        });
      }
    }

    // Stream generation
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let storedManual: Record<string, unknown> | null = null;

          for await (const event of generateManualStreaming(toolName, userApiKey)) {
            if (event.event === "manual") {
              // Capture but don't forward — wait for storage
              storedManual = event.data;
              continue;
            }

            if (event.event === "complete" && storedManual) {
              // Store before sending complete
              try {
                const manual = storedManual.manual as import("@/lib/schema").InstructionManual;
                const result = await storeManual(manual);
                sendEvent(controller, {
                  event: "stored",
                  data: {
                    shareableUrl: result.shareableUrl,
                    version: result.version,
                    summary: {
                      features: manual.features.length,
                      shortcuts: manual.shortcuts.length,
                      workflows: manual.workflows.length,
                      tips: manual.tips.length,
                      commonMistakes: manual.commonMistakes.length,
                      coverageScore: manual.coverageScore,
                    },
                    generationTimeMs: event.data.generationTimeMs,
                    citationCount: event.data.citationCount,
                    featureCount: event.data.featureCount,
                    model: event.data.model,
                    cost: manual.cost?.total ?? 0,
                  },
                });
              } catch (storageErr) {
                console.error("Storage failed:", storageErr);
                sendEvent(controller, {
                  event: "warning",
                  data: {
                    message: "Manual generated but storage failed",
                    slug,
                  },
                });
              }
              sendEvent(controller, { ...event });
            } else {
              sendEvent(controller, { ...event });
            }
          }
        } catch (err) {
          sendEvent(controller, {
            event: "error",
            data: {
              code: "GENERATION_FAILED",
              message:
                err instanceof Error
                  ? err.message
                  : "Unknown generation error",
            },
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("Generate route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
