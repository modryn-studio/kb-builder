import { NextRequest, NextResponse } from "next/server";
import Perplexity from "@perplexity-ai/perplexity_ai";

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

    // Validate the key by making a minimal Agent API request using the SDK
    const client = new Perplexity({ apiKey: apiKey.trim() });

    try {
      await client.responses.create({
        model: "anthropic/claude-opus-4-6",
        input: "test",
        max_output_tokens: 1,
        stream: false,
      });

      return NextResponse.json({ valid: true });
    } catch (apiError: unknown) {
      console.error("Perplexity API error:", apiError);
      
      // Check if it's an authentication error
      const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
      const isAuthError = errorMessage.toLowerCase().includes("401") || 
                         errorMessage.toLowerCase().includes("unauthorized") ||
                         errorMessage.toLowerCase().includes("invalid") ||
                         errorMessage.toLowerCase().includes("authentication");
      
      return NextResponse.json(
        { 
          valid: false, 
          error: isAuthError
            ? "Invalid or expired API key. Please check your Perplexity API key." 
            : "Failed to validate API key. Please try again.",
          details: errorMessage
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
