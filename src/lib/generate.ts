import Perplexity from "@perplexity-ai/perplexity_ai";
import { toJSONSchema } from "zod";
import {
  InstructionManualGenerationSchema,
  InstructionManualSchema,
  type InstructionManualGeneration,
  type InstructionManual,
} from "./schema";
import { sanitizeSlug } from "./utils";

// SDK types
import type {
  ResponseStreamChunk,
  OutputItem,
  ResponseCreateResponse,
} from "@perplexity-ai/perplexity_ai/resources/responses";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const MODELS = [
  "anthropic/claude-opus-4-6",   // Only model that works with Agent API
  // "anthropic/claude-sonnet-4-5" - Returns 400 errors (incompatible)
] as const;

const MAX_ATTEMPTS = 1; // No retries - API too slow
const API_TIMEOUT_MS = 180_000; // 180s timeout per attempt

// ──────────────────────────────────────────────
// Client
// ──────────────────────────────────────────────

function getClient(userApiKey?: string): Perplexity {
  const apiKey = userApiKey || process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No API key provided. Please provide your Perplexity API key."
    );
  }
  return new Perplexity({ apiKey });
}

// ──────────────────────────────────────────────
// JSON Schema for generation
// ──────────────────────────────────────────────

const generationJsonSchema = toJSONSchema(InstructionManualGenerationSchema);

// ──────────────────────────────────────────────
// Prompts
// ──────────────────────────────────────────────

function buildInstructions(slug: string): string {
  return `Create an instruction manual for "${slug}" in JSON format.

Return ONLY raw JSON (no markdown blocks). Start with { and end with }.

Include: overview, features (with id/name/description/category/whatItsFor/whenToUse/howToAccess/keywords/powerLevel), shortcuts (with id/keys/action/platforms/keywords/powerLevel), workflows (with id/name/description/steps/useCases/difficulty/estimatedTime), tips (with id/title/description/category/powerLevel), commonMistakes (with id/mistake/whyItHappens/correction/severity/keywords), recentUpdates.

Set all sourceIndices to empty arrays. Use kebab-case for all IDs. Minimum: 4 features, 2 workflows, 3 tips.`;
}

function buildUserPrompt(toolName: string): string {
  return `Create a manual for "${toolName}" in this JSON structure:

{
  "schemaVersion": "4.1",
  "tool": "${toolName}",
  "slug": "kebab-case",
  "coverageScore": 0.85,
  "toolScope": "simple",
  "overview": { "whatItIs": "", "primaryUseCases": [], "platforms": [], "pricing": "", "targetUsers": [] },
  "features": [{ "id": "", "name": "", "category": "", "description": "", "whatItsFor": "", "whenToUse": [], "howToAccess": "", "keywords": [], "powerLevel": "basic", "sourceIndices": [] }],
  "shortcuts": [{ "id": "", "keys": "Ctrl+C", "action": "", "platforms": [], "keywords": [], "powerLevel": "basic", "sourceIndices": [] }],
  "workflows": [{ "id": "", "name": "", "description": "", "steps": [{ "step": 1, "action": "", "details": "" }], "useCases": [], "difficulty": "beginner", "estimatedTime": "2min", "sourceIndices": [] }],
  "tips": [{ "id": "", "title": "", "description": "", "category": "productivity", "powerLevel": "basic", "sourceIndices": [] }],
  "commonMistakes": [{ "id": "", "mistake": "", "whyItHappens": "", "correction": "", "severity": "minor", "keywords": [] }],
  "recentUpdates": [{ "feature": "", "description": "", "impact": "major", "sourceIndices": [] }]
}

Rules: JSON only (no markdown), all IDs kebab-case, shortcuts.keys is STRING not object, tip.category must be one of: productivity/organization/collaboration/automation/shortcuts.`;
}


// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type ProgressCallback = (
  stage: string,
  message: string,
  data?: Record<string, unknown>
) => void;

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function extractCitationsFromResponse(
  response: ResponseCreateResponse
): string[] {
  // Per spec v4.1: Use citations from API response, not extracted from text
  // "Use the `citations` or `search_results` fields from the API response."
  if ("citations" in response && Array.isArray(response.citations)) {
    return response.citations.filter((c): c is string => typeof c === "string");
  }
  
  // Fallback: extract from search_results if available
  if ("search_results" in response && Array.isArray(response.search_results)) {
    const urls = new Set<string>();
    for (const result of response.search_results) {
      if (
        typeof result === "object" &&
        result !== null &&
        "url" in result &&
        typeof result.url === "string"
      ) {
        urls.add(result.url);
      }
    }
    return Array.from(urls);
  }
  
  return [];
}

function clampSourceIndices<T extends { sourceIndices?: number[] }>(
  items: T[],
  citationCount: number
): T[] {
  return items.map((item) => ({
    ...item,
    sourceIndices: (item.sourceIndices ?? []).filter(
      (i) => Number.isInteger(i) && i >= 0 && i < citationCount
    ),
  }));
}

function sanitizeManualIndices(
  manual: InstructionManualGeneration,
  citationCount: number
): InstructionManualGeneration {
  return {
    ...manual,
    features: clampSourceIndices(manual.features, citationCount),
    shortcuts: clampSourceIndices(manual.shortcuts, citationCount),
    workflows: clampSourceIndices(manual.workflows, citationCount),
    tips: clampSourceIndices(manual.tips, citationCount),
    recentUpdates: clampSourceIndices(manual.recentUpdates, citationCount),
  };
}

// ──────────────────────────────────────────────
// Normalize model output to match Zod schema
// Models return slightly different shapes than our schema expects.
// This transform layer bridges the gap.
// ──────────────────────────────────────────────

function normalizeTipCategory(cat: string): "productivity" | "organization" | "collaboration" | "automation" | "shortcuts" {
  const valid = ["productivity", "organization", "collaboration", "automation", "shortcuts"] as const;
  if (valid.includes(cat as typeof valid[number])) return cat as typeof valid[number];
  const mapping: Record<string, typeof valid[number]> = {
    quality: "productivity",
    performance: "productivity",
    troubleshooting: "shortcuts",
    general: "productivity",
  };
  return mapping[cat] || "productivity";
}

function normalizeModelOutput(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const data = { ...(raw as Record<string, unknown>) };

  // ── Overview normalization ──
  if (data.overview && typeof data.overview === "object") {
    const ov = { ...(data.overview as Record<string, unknown>) };
    // primaryUseCase (string) → primaryUseCases (array)
    if (!ov.primaryUseCases && ov.primaryUseCase) {
      ov.primaryUseCases = [ov.primaryUseCase as string];
    } else if (!ov.primaryUseCases) {
      ov.primaryUseCases = [];
    }
    // pricingModel → pricing
    if (!ov.pricing && ov.pricingModel) {
      ov.pricing = ov.pricingModel as string;
    }
    // targetAudience (string) → targetUsers (array)
    if (!ov.targetUsers && ov.targetAudience) {
      ov.targetUsers = [ov.targetAudience as string];
    }
    data.overview = ov;
  }

  // ── Features normalization ──
  if (Array.isArray(data.features)) {
    data.features = (data.features as Record<string, unknown>[]).map((f) => ({
      ...f,
      whatItsFor: f.whatItsFor || f.description || "",
      whenToUse: Array.isArray(f.whenToUse) ? f.whenToUse : [],
      howToAccess: f.howToAccess || "",
      keywords: Array.isArray(f.keywords) ? f.keywords : [((f.name as string) || "").toLowerCase()],
      powerLevel: f.powerLevel || "basic",
      relatedFeatures: Array.isArray(f.relatedFeatures) ? f.relatedFeatures : [],
    }));
  }

  // ── Shortcuts normalization ──
  if (Array.isArray(data.shortcuts)) {
    data.shortcuts = (data.shortcuts as Record<string, unknown>[]).map((s) => {
      // keys might be an object like {windows: "Ctrl+C", mac: "Cmd+C"} instead of a string
      let keysStr = s.keys;
      if (typeof s.keys === "object" && s.keys !== null) {
        keysStr = Object.values(s.keys as Record<string, string>).join(" / ");
      }
      return {
        ...s,
        keys: keysStr,
        platforms: Array.isArray(s.platforms)
          ? s.platforms
          : typeof s.keys === "object" && s.keys !== null
            ? Object.keys(s.keys as Record<string, string>)
            : ["Windows"],
        keywords: Array.isArray(s.keywords)
          ? s.keywords
          : [((s.action as string) || "").toLowerCase()],
        powerLevel: s.powerLevel || "basic",
      };
    });
  }

  // ── Workflows normalization ──
  if (Array.isArray(data.workflows)) {
    data.workflows = (data.workflows as Record<string, unknown>[]).map((w) => ({
      ...w,
      name: w.name || w.title || "",
      useCases: Array.isArray(w.useCases) ? w.useCases : [],
      difficulty: w.difficulty || "beginner",
      estimatedTime: w.estimatedTime || "varies",
      steps: Array.isArray(w.steps)
        ? (w.steps as Record<string, unknown>[]).map((step, i) => ({
            step: step.step || i + 1,
            action: step.action || "",
            details: step.details || "",
            featuresUsed: Array.isArray(step.featuresUsed) ? step.featuresUsed : [],
          }))
        : [],
    }));
  }

  // ── Tips normalization ──
  if (Array.isArray(data.tips)) {
    data.tips = (data.tips as Record<string, unknown>[]).map((t) => ({
      ...t,
      category: normalizeTipCategory((t.category as string) || "productivity"),
      powerLevel: t.powerLevel || "basic",
    }));
  }

  // ── Common mistakes normalization ──
  if (Array.isArray(data.commonMistakes)) {
    data.commonMistakes = (data.commonMistakes as Record<string, unknown>[]).map((m, i) => ({
      ...m,
      id: m.id || `mistake-${i + 1}`,
    }));
  }

  return data;
}

function parseGenerationJSON(text: string): InstructionManualGeneration {
  if (!text || text.trim().length === 0) {
    throw new Error("Empty response text");
  }

  // Strip markdown code blocks if present (models sometimes wrap despite instructions)
  let cleanedText = text.trim();
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(cleanedText);
  } catch (e) {
    const preview = cleanedText.slice(0, 200);
    throw new Error(
      `JSON parse failed: ${e instanceof Error ? e.message : "unknown"}. Preview: ${preview}`
    );
  }

  // Normalize model output to match schema expectations
  const normalized = normalizeModelOutput(raw);
  return InstructionManualGenerationSchema.parse(normalized);
}

// ──────────────────────────────────────────────
// Non-streaming generation (with retry + fallback)
// ──────────────────────────────────────────────

export async function generateManual(
  toolName: string,
  onProgress?: ProgressCallback,
  userApiKey?: string
): Promise<InstructionManual> {
  const client = getClient(userApiKey);
  const slug = sanitizeSlug(toolName);
  const startTime = Date.now();

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        onProgress?.(
          "generating",
          `Using ${model} (attempt ${attempt}/${MAX_ATTEMPTS})`,
          { model, attempt }
        );

        const controller = new AbortController();
        const timeout = setTimeout(
          () => {
            console.log(`[${new Date().toISOString()}] API call timeout after ${API_TIMEOUT_MS}ms`);
            controller.abort();
          },
          API_TIMEOUT_MS
        );

        console.log(`[${new Date().toISOString()}] Making API call to ${model}...`);
        console.log("Instructions length:", buildInstructions(slug).length);
        console.log("Prompt length:", buildUserPrompt(toolName).length);

        let response: ResponseCreateResponse;
        try {
          response = await client.responses.create(
            {
              model,
              instructions: buildInstructions(slug),
              input: buildUserPrompt(toolName),
              // Temporarily removed web_search to test if that's causing slowness
              // tools: [{ type: "web_search" }],
              max_output_tokens: 65536,
              stream: false,
            },
            { signal: controller.signal }
          );
          console.log(`[${new Date().toISOString()}] API call succeeded!`);
        } catch (apiError) {
          console.error("API call error:", apiError);
          throw apiError;
        } finally {
          clearTimeout(timeout);
        }

        // Extract text from response with detailed debugging
        console.log("Response keys:", Object.keys(response));
        console.log("Response status:", response.status);
        console.log("Has output_text:", "output_text" in response);
        console.log("output_text value:", response.output_text);
        console.log("Has output array:", "output" in response);
        
        // Try multiple extraction methods
        let text = "";
        
        // Method 1: convenience property
        if (response.output_text && typeof response.output_text === "string") {
          text = response.output_text;
        }
        
        // Method 2: extract from output array
        if (!text && "output" in response && Array.isArray(response.output)) {
          console.log("Trying to extract from output array, length:", response.output.length);
          for (const item of response.output) {
            console.log("Output item:", JSON.stringify(item, null, 2));
            // Output items can be: message, search_results, fetch_url_results, function_call
            if (item.type === "message" && "content" in item && typeof item.content === "string") {
              text += item.content;
            }
          }
        }

        if (!text || text.trim().length === 0) {
          console.error("Empty response from API");
          console.error("Full response:", JSON.stringify(response, null, 2));
          throw new Error("Empty response from API - model may have refused or failed to generate");
        }

        console.log("Extracted text length:", text.length);
        console.log("Text preview:", text.substring(0, 200));

        const parsed = parseGenerationJSON(text);
        const citations = extractCitationsFromResponse(response);
        const sanitized = sanitizeManualIndices(parsed, citations.length);

        // Calculate cost (Perplexity pricing: $5/$25 per million tokens)
        const inputTokens = response.usage?.input_tokens ?? 0;
        const outputTokens = response.usage?.output_tokens ?? 0;
        const modelCost =
          inputTokens * 0.000005 + outputTokens * 0.000025;
        // Estimate search invocations (~1 per 3 citations, minimum 1)
        const searchInvocations = Math.max(1, Math.ceil(citations.length / 3));
        const searchCost = searchInvocations * 0.005;

        const manual: InstructionManual = InstructionManualSchema.parse({
          ...sanitized,
          generatedAt: new Date().toISOString(),
          citations,
          generationTimeMs: Date.now() - startTime,
          cost: {
            model: Math.round(modelCost * 10000) / 10000,
            search: Math.round(searchCost * 10000) / 10000,
            total:
              Math.round((modelCost + searchCost) * 10000) / 10000,
          },
        });

        return manual;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error";
        
        // Enhanced error logging for debugging
        console.error(`\n${"=".repeat(60)}`);
        console.error(`GENERATION ATTEMPT FAILED (${model}, attempt ${attempt}/${MAX_ATTEMPTS})`);
        console.error(`${"=".repeat(60)}`);
        console.error("Error message:", msg);
        
        // If it's a Zod error, log the validation issues
        if (err && typeof err === "object" && "issues" in err) {
          console.error("\nZod Validation Errors:");
          console.error(JSON.stringify((err as any).issues, null, 2));
        }
        
        // Log full error for debugging
        console.error("\nFull error object:", err);
        console.error(`${"=".repeat(60)}\n`);
        
        onProgress?.("error", `Attempt ${attempt} failed: ${msg}`, {
          model,
          attempt,
          error: msg,
        });

        if (attempt === MAX_ATTEMPTS) {
          onProgress?.(
            "fallback",
            `All attempts exhausted for ${model}, trying next model`,
            { model }
          );
        }
      }
    }
  }

  console.error("\n❌ FINAL FAILURE: All models exhausted");
  console.error(`Tried models: ${MODELS.join(", ")}`);
  console.error(`Max attempts per model: ${MAX_ATTEMPTS}\n`);
  
  throw new Error(
    `Generation failed after trying all models (${MODELS.join(", ")})`
  );
}

// ──────────────────────────────────────────────
// Streaming generation (with retry + fallback)
// ──────────────────────────────────────────────

interface StreamEvent {
  event: string;
  data: Record<string, unknown>;
}

export async function* generateManualStreaming(
  toolName: string,
  userApiKey?: string
): AsyncGenerator<StreamEvent> {
  const client = getClient(userApiKey);
  const slug = sanitizeSlug(toolName);
  const startTime = Date.now();

  yield {
    event: "started",
    data: { tool: toolName, slug, timestamp: new Date().toISOString() },
  };

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        yield {
          event: "progress",
          data: {
            stage: "generating",
            message: `Using ${model} (attempt ${attempt}/${MAX_ATTEMPTS})`,
            model,
            attempt,
          },
        };

        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          API_TIMEOUT_MS
        );

        let stream: AsyncIterable<ResponseStreamChunk>;
        try {
          console.log("Creating stream request...");
          const response = await client.responses.create(
            {
              model,
              instructions: buildInstructions(slug),
              input: buildUserPrompt(toolName),
              tools: [{ type: "web_search" }],
              // Removed response_format to enable streaming (incompatible with json_schema)
              // Schema validation handled via prompt instructions + post-validation
              max_output_tokens: 65536,
              stream: true,
            },
            { signal: controller.signal }
          );
          
          // Treat response directly as async iterable stream
          stream = response as AsyncIterable<ResponseStreamChunk>;
          console.log("Stream created successfully");
        } catch (err) {
          clearTimeout(timeout);
          throw err;
        }

        let fullText = "";
        let searchQueries: string[] = [];
        const searchResultUrls = new Set<string>();
        let finalResponse: ResponseCreateResponse | undefined;
        let chunkCount = 0;

        console.log("Starting stream iteration...");
        try {
          let iterationCount = 0;
          const maxIterations = 1000; // Safety limit
          
          for await (const chunk of stream) {
            iterationCount++;
            chunkCount++;
            
            if (iterationCount > maxIterations) {
              console.error("Too many iterations, breaking");
              break;
            }
            
            // Debug: Log every chunk we receive
            console.log(`Chunk ${chunkCount}:`, {
              type: chunk.type,
              keys: Object.keys(chunk),
              hasResponse: "response" in chunk,
              hasDelta: "delta" in chunk
            });
            
            if (!chunk.type) {
              console.log("Skipping chunk without type");
              continue;
            }

            switch (chunk.type) {
              case "response.reasoning.started":
                yield {
                  event: "progress",
                  data: {
                    stage: "reasoning",
                    message: "Analyzing and planning research...",
                  },
                };
                break;

              case "response.reasoning.search_queries":
                if ("queries" in chunk && Array.isArray(chunk.queries)) {
                  searchQueries = chunk.queries as string[];
                  yield {
                    event: "progress",
                    data: {
                      stage: "searching",
                      message: `Searching: ${searchQueries.join(", ")}`,
                      queries: searchQueries,
                    },
                  };
                }
                break;

              case "response.reasoning.search_results":
                if ("results" in chunk && Array.isArray(chunk.results)) {
                  for (const r of chunk.results) {
                    if (
                      typeof r === "object" &&
                      r !== null &&
                      "url" in r &&
                      typeof r.url === "string"
                    ) {
                      searchResultUrls.add(r.url);
                    }
                  }
                  yield {
                    event: "progress",
                    data: {
                      stage: "search_results",
                      message: `Found ${searchResultUrls.size} sources`,
                      sourceCount: searchResultUrls.size,
                    },
                  };
                }
                break;

              case "response.reasoning.stopped":
                yield {
                  event: "progress",
                  data: {
                    stage: "stopped",
                    message: "Reasoning complete, generating content...",
                  },
                };
                break;

              case "response.output_text.delta":
                if ("delta" in chunk && typeof chunk.delta === "string") {
                  fullText += chunk.delta;
                }
                break;

              case "response.completed":
                if ("response" in chunk) {
                  finalResponse =
                    chunk.response as unknown as ResponseCreateResponse;
                }
                break;

              case "response.failed":
                throw new Error(
                  `Stream failed: ${JSON.stringify(chunk)}`
                );
            }
          }
        } finally {
          clearTimeout(timeout);
          console.log(`Stream iteration ended. Total chunks: ${chunkCount}`);
        }

        // Debug: Log extraction results
        console.log("Text extraction complete:", {
          textLength: fullText.length,
          citationCount: searchResultUrls.size,
          hasResponse: !!finalResponse
        });
        
        // If fullText is empty but we have finalResponse, use output_text convenience property
        if (!fullText && finalResponse && "output_text" in finalResponse) {
          console.log("Using output_text convenience property");
          fullText = String(finalResponse.output_text || "");
        }

        // Parse and validate
        const parsed = parseGenerationJSON(fullText);
        const citations = Array.from(searchResultUrls);
        const sanitized = sanitizeManualIndices(
          parsed,
          citations.length
        );

        // Calculate cost (Perplexity pricing: $5/$25 per million tokens)
        const inputTokens =
          finalResponse?.usage?.input_tokens ?? 0;
        const outputTokens =
          finalResponse?.usage?.output_tokens ?? 0;
        const modelCost =
          inputTokens * 0.000005 + outputTokens * 0.000025;
        // Estimate search invocations (~1 per 3 citations, minimum 1)
        const searchInvocations = Math.max(1, Math.ceil(citations.length / 3));
        const searchCost = searchInvocations * 0.005;

        const manual: InstructionManual = InstructionManualSchema.parse({
          ...sanitized,
          generatedAt: new Date().toISOString(),
          citations,
          generationTimeMs: Date.now() - startTime,
          cost: {
            model: Math.round(modelCost * 10000) / 10000,
            search: Math.round(searchCost * 10000) / 10000,
            total:
              Math.round((modelCost + searchCost) * 10000) / 10000,
          },
        });

        yield { event: "manual", data: { manual } };
        yield {
          event: "complete",
          data: {
            generationTimeMs: Date.now() - startTime,
            citationCount: citations.length,
            featureCount: manual.features.length,
            model,
            attempt,
          },
        };
        return; // Success — stop retrying
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error";
        yield {
          event: "progress",
          data: {
            stage: "retry",
            message: `Attempt ${attempt} with ${model} failed: ${msg}`,
            model,
            attempt,
            error: msg,
          },
        };

        if (attempt === MAX_ATTEMPTS) {
          yield {
            event: "progress",
            data: {
              stage: "fallback",
              message: `Exhausted retries for ${model}, trying next model...`,
              model,
            },
          };
        }
      }
    }
  }

  yield {
    event: "error",
    data: {
      code: "GENERATION_FAILED",
      message: `Generation failed after trying all models (${MODELS.join(", ")})`,
    },
  };
}
