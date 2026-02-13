import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/validate-key
 * Validates a Perplexity API key by checking if it can access the Agent API
 */
export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { valid: false, error: "API key is required" },
        { status: 400 }
      );
    }

    // Validate the key by calling Perplexity's Agent API responses endpoint with a minimal request
    const response = await fetch("https://api.perplexity.ai/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-opus-4-6",
        input: "test",
        max_output_tokens: 1,
      }),
    });

    console.log("Perplexity API response status:", response.status);

    if (response.ok) {
      return NextResponse.json({ valid: true });
    } else {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Perplexity API error:", response.status, errorText);
      
      return NextResponse.json(
        { 
          valid: false, 
          error: response.status === 401 
            ? "Invalid or expired API key. Please check your Perplexity API key." 
            : "Failed to validate API key",
          details: errorText 
        },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error validating API key:", error);
    return NextResponse.json(
      { 
        valid: false, 
        error: "Failed to validate API key. Please try again." 
      },
      { status: 500 }
    );
  }
}
