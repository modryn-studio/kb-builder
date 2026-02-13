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
  "anthropic/claude-opus-4-6",
  "anthropic/claude-sonnet-4-5",
] as const;

const MAX_ATTEMPTS = 2;
const API_TIMEOUT_MS = 55_000;

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
  return `You are an expert technical writer creating a comprehensive instruction manual for a software tool.

## Research Rules
- Use web_search extensively to find official documentation, tutorials, release notes, and community resources
- Cross-reference multiple sources for accuracy
- Include all keyboard shortcuts from official docs
- Check for recent updates from the past 6 months

## Structuring Rules
- Group features into logical categories (e.g., "Editing", "Navigation", "Collaboration")
- Every feature MUST have a unique kebab-case ID
- Every shortcut MUST include platform info
- Workflows must have at least 2 steps with concrete actions
- Tips should go beyond basic usage — focus on power-user knowledge

## Quality Rules
- coverageScore should honestly reflect how complete the manual is (0-1)
- toolScope: "enterprise" for complex tools (Notion, Figma, VSCode), "standard" for moderate tools, "simple" for basic tools
- Aim for at least 15 features for enterprise tools, 8 for standard, 4 for simple
- At least 3 workflows showing real use cases
- At least 5 tips per tool

## Citation Rules (CRITICAL)
- sourceIndices reference positions in the citations array (0-based)
- Only use indices for sources you actually found via search
- Each feature, shortcut, workflow, and tip should cite its sources

## Schema Rules
- schemaVersion must be exactly "4.1"
- slug must be exactly "${slug}"
- All IDs must be unique within their section
- All arrays that require .min(1) must have at least one element

## Completeness Targets by Scope
- enterprise: 15+ features, 10+ shortcuts, 5+ workflows, 10+ tips
- standard: 8+ features, 5+ shortcuts, 3+ workflows, 5+ tips
- simple: 4+ features, 2+ shortcuts, 2+ workflows, 3+ tips`;
}

function buildUserPrompt(toolName: string): string {
  return `Create a comprehensive instruction manual for "${toolName}".

Research thoroughly using web search. Cover these areas:
1. Official documentation and feature list
2. Keyboard shortcuts and hotkeys
3. Common workflows and tutorials
4. Tips and tricks from power users
5. Common mistakes and how to avoid them
6. Recent updates and new features
7. Integration capabilities
8. Pricing and platform availability

Generate a complete, well-structured manual following the schema exactly.`;
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

function extractCitationsFromOutput(
  output: OutputItem[] | undefined
): string[] {
  if (!output) return [];

  const urls = new Set<string>();
  for (const item of output) {
    if (
      item.type === "message" &&
      "content" in item &&
      Array.isArray(item.content)
    ) {
      for (const block of item.content) {
        if (
          typeof block === "object" &&
          block !== null &&
          "type" in block &&
          block.type === "output_text" &&
          "text" in block &&
          typeof block.text === "string"
        ) {
          const urlRegex = /https?:\/\/[^\s)"']+/g;
          const matches = block.text.match(urlRegex);
          if (matches) {
            for (const url of matches) urls.add(url);
          }
        }
      }
    }
  }
  return Array.from(urls);
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

function parseGenerationJSON(text: string): InstructionManualGeneration {
  if (!text || text.trim().length === 0) {
    throw new Error("Empty response text");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    const preview = text.slice(0, 200);
    throw new Error(
      `JSON parse failed: ${e instanceof Error ? e.message : "unknown"}. Preview: ${preview}`
    );
  }

  return InstructionManualGenerationSchema.parse(raw);
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
          () => controller.abort(),
          API_TIMEOUT_MS
        );

        let response: ResponseCreateResponse;
        try {
          response = await client.responses.create(
            {
              model,
              instructions: buildInstructions(slug),
              input: buildUserPrompt(toolName),
              tools: [{ type: "web_search" }],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "instruction_manual",
                  schema: generationJsonSchema,
                  strict: true,
                },
              },
              max_output_tokens: 65536,
              stream: false,
            },
            { signal: controller.signal }
          );
        } finally {
          clearTimeout(timeout);
        }

        // Extract text from output
        let text = "";
        if (response.output) {
          for (const item of response.output) {
            if (
              item.type === "message" &&
              "content" in item &&
              Array.isArray(item.content)
            ) {
              for (const block of item.content) {
                if (
                  typeof block === "object" &&
                  block !== null &&
                  "type" in block &&
                  block.type === "output_text" &&
                  "text" in block
                ) {
                  text += (block as { text: string }).text;
                }
              }
            }
          }
        }

        const parsed = parseGenerationJSON(text);
        const citations = extractCitationsFromOutput(response.output);
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
          stream = await client.responses.create(
            {
              model,
              instructions: buildInstructions(slug),
              input: buildUserPrompt(toolName),
              tools: [{ type: "web_search" }],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "instruction_manual",
                  schema: generationJsonSchema,
                  strict: true,
                },
              },
              max_output_tokens: 65536,
              stream: true,
            },
            { signal: controller.signal }
          );
        } catch (err) {
          clearTimeout(timeout);
          throw err;
        }

        let fullText = "";
        let searchQueries: string[] = [];
        const searchResultUrls = new Set<string>();
        let finalResponse: ResponseCreateResponse | undefined;

        try {
          for await (const chunk of stream) {
            if (!chunk.type) continue;

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
