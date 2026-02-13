"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { BookOpen, Loader2, AlertCircle, Copy, Check, RefreshCw, ExternalLink, Eye, EyeOff, Trash2, Download, History, CheckCircle } from "lucide-react";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface StreamEvent {
  event: string;
  data: Record<string, unknown>;
  [key: string]: unknown;
}

interface Summary {
  features: number;
  shortcuts: number;
  workflows: number;
  tips: number;
  commonMistakes: number;
  coverageScore: number;
}

interface GenerationResult {
  cached: boolean;
  shareableUrl: string;
  summary: Summary;
  citations: number;
  generationTimeMs: number;
  cost: number;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "RATE_LIMITED":
      return "Too many requests. Please wait a minute and try again.";
    case "PARSE_FAILED":
      return "The AI returned malformed data. Try again — this is usually transient.";
    case "VALIDATION_FAILED":
      return "The generated manual failed validation. Try again with a clearer tool name.";
    case "GENERATION_FAILED":
      return "Generation failed after multiple attempts. Please try again later.";
    default:
      return fallback;
  }
}

// ──────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────

export default function KBBuilderPage() {
  const [toolName, setToolName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [persistKey, setPersistKey] = useState(true);
  const [totalCost, setTotalCost] = useState(0);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyValidated, setKeyValidated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load API key and cost from storage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("perplexity_api_key");
    const savedPersist = localStorage.getItem("perplexity_persist_key");
    const savedCost = localStorage.getItem("perplexity_total_cost");
    
    if (savedKey) {
      setApiKey(savedKey);
      setKeyValidated(true);
    }
    if (savedPersist !== null) {
      setPersistKey(savedPersist === "true");
    }
    if (savedCost) {
      setTotalCost(parseFloat(savedCost) || 0);
    }
  }, []);

  // Save API key and settings when they change
  useEffect(() => {
    if (persistKey && apiKey.trim()) {
      localStorage.setItem("perplexity_api_key", apiKey.trim());
      localStorage.setItem("perplexity_persist_key", "true");
    } else if (!persistKey) {
      localStorage.removeItem("perplexity_api_key");
      localStorage.setItem("perplexity_persist_key", "false");
      sessionStorage.setItem("perplexity_api_key_session", apiKey.trim());
    }
  }, [apiKey, persistKey]);

  // Save cost when it changes
  useEffect(() => {
    localStorage.setItem("perplexity_total_cost", totalCost.toString());
  }, [totalCost]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Validate API key
  const validateApiKey = useCallback(async () => {
    if (!apiKey.trim()) {
      setError("Please enter your Perplexity API key");
      return false;
    }

    setIsValidatingKey(true);
    setError(null);

    try {
      const response = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await response.json();

      if (data.valid) {
        setKeyValidated(true);
        return true;
      } else {
        setKeyValidated(false);
        setError(data.error || "Invalid API key. Please check your key and try again.");
        return false;
      }
    } catch {
      setError("Failed to validate API key. Check your internet connection.");
      return false;
    } finally {
      setIsValidatingKey(false);
    }
  }, [apiKey]);

  // Clear API key
  const clearApiKey = useCallback(() => {
    setApiKey("");
    setKeyValidated(false);
    localStorage.removeItem("perplexity_api_key");
    sessionStorage.removeItem("perplexity_api_key_session");
  }, []);

  // Reset cost
  const resetCost = useCallback(() => {
    setTotalCost(0);
    localStorage.setItem("perplexity_total_cost", "0");
  }, []);

  const handleGenerate = useCallback(
    async (forceRefresh = false) => {
      if (!toolName.trim() || isGenerating) return;
      
      if (!apiKey.trim()) {
        setError("Please enter your Perplexity API key");
        return;
      }

      // Abort any previous request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Safety timeout
      const timeoutId = setTimeout(() => controller.abort(), 70_000);

      setIsGenerating(true);
      setProgress([]);
      setResult(null);
      setError(null);

      let resultSet = false;

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: toolName.trim(),
            apiKey: apiKey.trim(),
            forceRefresh,
          }),
          signal: controller.signal,
        });

        // Handle non-OK responses that might not be JSON
        if (!response.ok) {
          let errorData: { error?: string; code?: string } = {};
          try {
            errorData = await response.json();
          } catch {
            // non-JSON error response
          }
          const msg = formatErrorMessage(
            errorData.code,
            errorData.error || `Request failed (${response.status})`
          );
          setError(msg);
          return;
        }

        const contentType = response.headers.get("content-type") || "";

        // JSON response (cached)
        if (contentType.includes("application/json")) {
          const data = await response.json();
          if (data.error) {
            setError(formatErrorMessage(data.code, data.error));
            return;
          }
          setResult({
            cached: true,
            shareableUrl: data.shareableUrl,
            summary: data.summary,
            citations: data.manual?.citations?.length ?? 0,
            generationTimeMs: 0,
            cost: data.manual?.cost?.total ?? 0,
          });
          // Update cumulative cost (only if not cached, but keep for consistency)
          const genCost = data.manual?.cost?.total ?? 0;
          if (genCost > 0) {
            setTotalCost((prev) => prev + genCost);
          }
          resultSet = true;
          return;
        }

        // NDJSON streaming
        const reader = response.body?.getReader();
        if (!reader) {
          setError("No response stream available");
          return;
        }

        // Abort listener for reader
        controller.signal.addEventListener("abort", () => {
          reader.cancel().catch(() => {});
        });

        const decoder = new TextDecoder();
        let buffer = "";
        let capturedSlug: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            let event: StreamEvent;
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }

            switch (event.event) {
              case "started":
                if (typeof event.data?.slug === "string") {
                  capturedSlug = event.data.slug;
                }
                setProgress((p) => [
                  ...p,
                  `Starting generation for "${event.data?.tool}"...`,
                ]);
                break;

              case "progress":
                setProgress((p) => [
                  ...p,
                  String(event.data?.message || "Processing..."),
                ]);
                break;

              case "stored": {
                const d = event.data;
                const genCost = Number(d.cost ?? 0);
                setResult({
                  cached: false,
                  shareableUrl: String(d.shareableUrl || ""),
                  summary: d.summary as Summary,
                  citations: Number(d.citationCount ?? 0),
                  generationTimeMs: Number(d.generationTimeMs ?? 0),
                  cost: genCost,
                });
                // Update cumulative cost
                if (genCost > 0) {
                  setTotalCost((prev) => prev + genCost);
                }
                resultSet = true;
                break;
              }

              case "complete":
                if (!resultSet) {
                  setProgress((p) => [...p, "Generation complete!"]);
                }
                break;

              case "warning": {
                // Storage failed — use slug to build fallback URL
                const fallbackSlug = capturedSlug || event.data?.slug;
                if (fallbackSlug) {
                  const baseUrl = window.location.origin;
                  setResult({
                    cached: false,
                    shareableUrl: `${baseUrl}/manual/${fallbackSlug}`,
                    summary: {
                      features: 0,
                      shortcuts: 0,
                      workflows: 0,
                      tips: 0,
                      commonMistakes: 0,
                      coverageScore: 0,
                    },
                    citations: 0,
                    generationTimeMs: 0,
                    cost: 0,
                  });
                  resultSet = true;
                }
                setProgress((p) => [
                  ...p,
                  `⚠️ ${event.data?.message || "Warning"}`,
                ]);
                break;
              }

              case "error":
                setError(
                  formatErrorMessage(
                    event.data?.code as string | undefined,
                    String(event.data?.message || "Generation failed")
                  )
                );
                break;
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setError(
            "Request timed out. The tool name may be too complex — try a simpler name."
          );
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "An unexpected error occurred"
          );
        }
      } finally {
        clearTimeout(timeoutId);
        setIsGenerating(false);
      }
    },
    [toolName, apiKey, isGenerating]
  );

  const handleCopy = () => {
    if (result?.shareableUrl) {
      navigator.clipboard.writeText(result.shareableUrl);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">KB Builder</h1>
            <p className="text-sm text-slate-500">
              AI-powered instruction manuals for any software tool
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Cost Tracker - Always visible */}
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Total API Cost (Session)</p>
              <p className="text-2xl font-bold text-blue-600">${totalCost.toFixed(3)}</p>
            </div>
            <button
              onClick={resetCost}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200"
              title="Reset cost counter"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Input Section */}
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="mb-2 text-2xl font-bold text-slate-900">
            Generate an Instruction Manual
          </h2>
          <p className="mb-6 text-slate-600">
            Enter any software tool name and get a comprehensive manual with
            features, shortcuts, workflows, and tips — all backed by web
            research.
          </p>

          {/* API Key Input */}
          <div className="mb-4 space-y-3">
            <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700">
              Perplexity API Key
              <span className="ml-1 text-xs text-slate-500">
                (Get yours at{" "}
                <a 
                  href="https://www.perplexity.ai/settings/api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  perplexity.ai
                </a>
                )
              </span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setKeyValidated(false);
                  }}
                  placeholder="pplx-..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pr-10 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  disabled={isGenerating}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                  title={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                onClick={validateApiKey}
                disabled={!apiKey.trim() || isValidatingKey}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                title="Test API key"
              >
                {isValidatingKey ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Testing...
                  </>
                ) : keyValidated ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5" />
                    Valid
                  </>
                ) : (
                  "Test Key"
                )}
              </button>
              <button
                onClick={clearApiKey}
                disabled={!apiKey.trim() || isGenerating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                title="Clear API key"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
            
            {/* Storage Option */}
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                id="persistKey"
                checked={persistKey}
                onChange={(e) => setPersistKey(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
              />
              <label htmlFor="persistKey" className="text-slate-600">
                Remember my API key (stored locally in browser{" "}
                {persistKey ? <span className="font-medium text-blue-600">persistently</span> : <span className="font-medium text-orange-600">session only</span>})
              </label>
            </div>
          </div>

          {/* Tool Name Input */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isGenerating) {
                    handleGenerate();
                  }
                }}
                placeholder="e.g., Notion, Figma, VS Code, Slack..."
                maxLength={100}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={isGenerating}
              />
              {toolName.length > 80 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  {toolName.length}/100
                </span>
              )}
            </div>
            <button
              onClick={() => handleGenerate()}
              disabled={!toolName.trim() || isGenerating}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress */}
        {progress.length > 0 && (
          <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Progress
            </h3>
            <div className="space-y-2">
              {progress.map((msg, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-600"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                  {msg}
                </div>
              ))}
              {isGenerating && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Working...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
              <div>
                <h3 className="font-semibold text-red-800">
                  Generation Failed
                </h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <button
                  onClick={() => handleGenerate()}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-green-900">
                  {result.cached
                    ? "📋 Manual Retrieved from Cache"
                    : "✅ Manual Generated Successfully"}
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  {result.summary.features} features ·{" "}
                  {result.summary.shortcuts} shortcuts ·{" "}
                  {result.summary.workflows} workflows ·{" "}
                  {result.summary.tips} tips
                  {result.summary.coverageScore > 0 &&
                    ` · ${Math.round(result.summary.coverageScore * 100)}% coverage`}
                </p>
                {result.generationTimeMs > 0 && (
                  <p className="mt-0.5 text-xs text-green-600">
                    Generated in {(result.generationTimeMs / 1000).toFixed(1)}s
                    {result.citations > 0 &&
                      ` · ${result.citations} citations`}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleGenerate(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
                title="Force regenerate"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            {/* Shareable URL */}
            {result.shareableUrl && (
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 truncate rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-slate-700">
                  {result.shareableUrl}
                </div>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-md border border-green-300 bg-white px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
                <a
                  href={result.shareableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  View
                </a>
              </div>
            )}
          </div>
        )}

        {/* How It Works */}
        {!isGenerating && !result && !error && (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
                🔍
              </div>
              <h3 className="font-semibold text-slate-900">Web Research</h3>
              <p className="mt-1 text-sm text-slate-500">
                AI searches official docs, tutorials, and community resources
              </p>
            </div>
            <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-2xl">
                📝
              </div>
              <h3 className="font-semibold text-slate-900">
                Structured Manual
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Features, shortcuts, workflows, tips — all organized
              </p>
            </div>
            <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
                🔗
              </div>
              <h3 className="font-semibold text-slate-900">Share Instantly</h3>
              <p className="mt-1 text-sm text-slate-500">
                Get a shareable link to your manual in seconds
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50">
        <div className="mx-auto max-w-4xl px-6 py-4 text-center text-xs text-slate-400">
          Powered by Perplexity Agent API · Built with Next.js
        </div>
      </footer>
    </div>
  );
}
