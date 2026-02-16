import { NextRequest, NextResponse } from "next/server";
import { generateManual } from "@/lib/generate";
import { getLatestManual, storeManual } from "@/lib/storage";
import { sanitizeToolName, sanitizeSlug, isValidSlug } from "@/lib/utils";
import type { InstructionManual } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

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
  try {
    const line = JSON.stringify(data) + "\n";
    controller.enqueue(new TextEncoder().encode(line));
  } catch (error) {
    // Controller already closed - client disconnected or stream ended
    console.warn("Cannot send event - controller closed", data.type);
  }
}

// ──────────────────────────────────────────────
// POST handler
// ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawTool = body?.tool;

    if (!rawTool || typeof rawTool !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'tool' field" },
        { status: 400 }
      );
    }

    if (!process.env.PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: "Service temporarily unavailable — API key not configured" },
        { status: 503 }
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

    // Check cache (30 days)
    const cached = await getLatestManual(slug);
    if (cached && !body.forceRefresh) {
      const generatedAt = new Date(cached.generatedAt).getTime();
      const age = Date.now() - generatedAt;
      if (age < 30 * 24 * 60 * 60 * 1000) {
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
          },
        });
      }
    }

    // Generate manual with synthetic progress updates (SDK streaming is broken)
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial event
          sendEvent(controller, {
            event: "started",
            data: { tool: toolName, slug, timestamp: new Date().toISOString() },
          });

          // Synthetic progress events for better UX
          const progressSteps = [
            { delay: 500, stage: "initializing", message: "Starting research..." },
            { delay: 2000, stage: "searching", message: "Searching official documentation..." },
            { delay: 5000, stage: "searching", message: "Analyzing feature set..." },
            { delay: 8000, stage: "searching", message: "Gathering keyboard shortcuts..." },
            { delay: 12000, stage: "structuring", message: "Building comprehensive manual..." },
            { delay: 18000, stage: "structuring", message: "Organizing workflows and tips..." },
            { delay: 25000, stage: "validating", message: "Validating structure..." },
          ];

          // Start progress timer
          const startTime = Date.now();
          const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const nextStep = progressSteps.find(s => elapsed >= s.delay && elapsed < s.delay + 1000);
            if (nextStep) {
              sendEvent(controller, {
                event: "progress",
                data: { stage: nextStep.stage, message: nextStep.message },
              });
            }
          }, 1000);

          // Actual generation (non-streaming)
          let manual: InstructionManual;
          try {
            manual = await generateManual(
              toolName,
              (stage, message) => {
                // Real progress from generation
                sendEvent(controller, {
                  event: "progress",
                  data: { stage, message },
                });
              }
            );
          } finally {
            clearInterval(progressInterval);
          }

          // Store manual
          sendEvent(controller, {
            event: "progress",
            data: { stage: "storing", message: "Saving manual to storage..." },
          });

          try {
            const result = await storeManual(manual);

            sendEvent(controller, {
              event: "stored",
              data: {
                shareableUrl: result.shareableUrl,
                summary: {
                  features: manual.features.length,
                  shortcuts: manual.shortcuts.length,
                  workflows: manual.workflows.length,
                  tips: manual.tips.length,
                  commonMistakes: manual.commonMistakes.length,
                },
                citationCount: manual.citations.length,
                generationTimeMs: manual.generationTimeMs,
                cost: manual.cost.total,
                version: result.version,
              },
            });

            sendEvent(controller, {
              event: "complete",
              data: {
                generationTimeMs: manual.generationTimeMs,
                citationCount: manual.citations.length,
              },
            });
          } catch (storageErr) {
            console.error("Storage error:", storageErr);
            sendEvent(controller, {
              event: "warning",
              data: {
                message: "Failed to store manual, but generation succeeded",
                slug: manual.slug,
              },
            });
          }

          try {
            controller.close();
          } catch (closeErr) {
            // Controller already closed, ignore
          }
        } catch (err) {
          console.error("Generation error:", err);
          sendEvent(controller, {
            event: "error",
            data: {
              code: "GENERATION_FAILED",
              message: err instanceof Error ? err.message : "Generation failed",
            },
          });
          try {
            controller.close();
          } catch (closeErr) {
            // Controller already closed, ignore
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
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
