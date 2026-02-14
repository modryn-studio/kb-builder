/**
 * Tool Name Pre-Validation
 * 
 * Uses Perplexity's sonar model (~$0.001 per call) to verify that a
 * tool/website name corresponds to a real product before spending ~$1
 * on a full manual generation with Claude Opus.
 */

import Perplexity from "@perplexity-ai/perplexity_ai";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  normalizedName: string;
  type: "software" | "website" | "unknown";
  reason: string;
}

// ──────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────

const VALIDATION_TIMEOUT_MS = 15_000; // 15s — sonar is fast

/**
 * Pre-validate a tool/website name using Perplexity sonar.
 * Returns whether the name refers to a real product and its normalized form.
 * 
 * Cost: ~$0.001 per call (sonar pricing)
 * Latency: typically 1-3 seconds
 */
export async function validateToolName(rawName: string): Promise<ValidationResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    // If no API key, skip validation (fail open)
    return {
      valid: true,
      normalizedName: rawName,
      type: "unknown",
      reason: "Validation skipped — no API key configured",
    };
  }

  const client = new Perplexity({ apiKey });

  const prompt = `Is "${rawName}" a real software tool, application, website, or online service that currently exists?

Respond with ONLY a JSON object (no markdown, no code blocks), with these exact fields:
- "valid": boolean — true if this is a real, identifiable product/website
- "normalizedName": string — the official/proper name (e.g. "vscode" → "Visual Studio Code", "gh" → "GitHub")
- "type": "software" | "website" — whether it's primarily a software tool/app or a website/online service
- "reason": string — one sentence explaining your determination

If the name is gibberish, a random string, or doesn't correspond to any known product, set valid to false.
If it's ambiguous but could reasonably refer to a known product, set valid to true with your best guess for the normalized name.`;

  let timeout: NodeJS.Timeout | undefined;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

    const response = await client.chat.completions.create(
      {
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are a validation assistant. Respond only with valid JSON, no markdown formatting.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 200,
        temperature: 0,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);
    timeout = undefined;

    const rawContent = response.choices?.[0]?.message?.content;
    const text = typeof rawContent === "string" ? rawContent.trim() : "";
    if (!text) {
      return failOpen(rawName, "Empty response from validation model");
    }

    // Strip markdown code blocks if present
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      valid: Boolean(parsed.valid),
      normalizedName: typeof parsed.normalizedName === "string" ? parsed.normalizedName : rawName,
      type: parsed.type === "website" ? "website" : parsed.type === "software" ? "software" : "unknown",
      reason: typeof parsed.reason === "string" ? parsed.reason : "No reason provided",
    };
  } catch (err) {
    console.warn("[ValidateTool] Validation failed, allowing through:", err);
    return failOpen(rawName, `Validation error: ${err instanceof Error ? err.message : "unknown"}`);
  } finally {
    // Ensure timeout is always cleared
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

/** Fail-open: if validation itself fails, allow the request through. */
function failOpen(name: string, reason: string): ValidationResult {
  return {
    valid: true,
    normalizedName: name,
    type: "unknown",
    reason,
  };
}
