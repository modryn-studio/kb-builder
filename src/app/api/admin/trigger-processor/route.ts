import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Admin-only endpoint to manually trigger the queue processor
 * Requires valid ADMIN_SECRET in query params (user already authenticated)
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const expectedKey = process.env.ADMIN_SECRET;
    
    if (!expectedKey || key !== expectedKey) {
      return NextResponse.json(
        { error: "Unauthorized. Admin authentication required." },
        { status: 401 }
      );
    }

    // Construct cron processor URL
    const host = request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = host ? `${protocol}://${host}` : "http://localhost:3000";
    const cronUrl = `${baseUrl}/api/cron/process`;

    console.log(`[ADMIN TRIGGER] Triggering queue processor at: ${cronUrl}`);

    // Trigger the queue processor (use server-side CRON_SECRET)
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("CRON_SECRET is not configured");
      return NextResponse.json(
        { error: "Server misconfiguration: CRON_SECRET not set" },
        { status: 500 }
      );
    }
    
    const response = await fetch(cronUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": cronSecret,
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[ADMIN TRIGGER] Processor failed: ${response.status} - ${text}`);
      return NextResponse.json(
        { error: "Failed to trigger processor", details: text },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log(`[ADMIN TRIGGER] Processor result:`, result);
    
    return NextResponse.json({ 
      success: true,
      message: result.message || "Queue processor triggered successfully",
      result
    });
  } catch (err) {
    // Timeout is expected for long-running operations
    if ((err as Error).name === "AbortError") {
      console.log(`[ADMIN TRIGGER] Processor started (timed out as expected)`);
      return NextResponse.json({ 
        success: true,
        message: "Queue processor started (processing in background)"
      });
    }

    console.error("Admin trigger error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: (err as Error).message },
      { status: 500 }
    );
  }
}
