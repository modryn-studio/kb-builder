"use client";

import { useState, useCallback, useEffect } from "react";
import {
  BookOpen,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  CheckCircle,
  Clock,
  ArrowRight,
  Library,
} from "lucide-react";
import Link from "next/link";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("kb_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("kb_session_id", id);
  }
  return id;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{
    id: string;
    tool: string;
    cached: boolean;
    shareableUrl?: string;
  } | null>(null);

  // Load persisted state
  useEffect(() => {
    const savedKey = localStorage.getItem("perplexity_api_key");
    const savedPersist = localStorage.getItem("perplexity_persist_key");
    const savedCost = localStorage.getItem("perplexity_total_cost");

    if (savedKey) {
      setApiKey(savedKey);
      setKeyValidated(true);
    }
    if (savedPersist !== null) setPersistKey(savedPersist === "true");
    if (savedCost) setTotalCost(parseFloat(savedCost) || 0);
  }, []);

  // Save API key
  useEffect(() => {
    if (persistKey && apiKey.trim()) {
      localStorage.setItem("perplexity_api_key", apiKey.trim());
      localStorage.setItem("perplexity_persist_key", "true");
    } else if (!persistKey) {
      localStorage.removeItem("perplexity_api_key");
      localStorage.setItem("perplexity_persist_key", "false");
    }
  }, [apiKey, persistKey]);

  // Save cost
  useEffect(() => {
    localStorage.setItem("perplexity_total_cost", totalCost.toString());
  }, [totalCost]);

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
        setError(data.error || "Invalid API key.");
        return false;
      }
    } catch {
      setError("Failed to validate API key.");
      return false;
    } finally {
      setIsValidatingKey(false);
    }
  }, [apiKey]);

  const clearApiKey = useCallback(() => {
    setApiKey("");
    setKeyValidated(false);
    localStorage.removeItem("perplexity_api_key");
  }, []);

  const resetCost = useCallback(() => {
    setTotalCost(0);
    localStorage.setItem("perplexity_total_cost", "0");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!toolName.trim() || isSubmitting) return;
    if (!apiKey.trim()) {
      setError("Please enter your Perplexity API key");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmitted(null);

    try {
      const sessionId = getOrCreateSessionId();
      const response = await fetch("/api/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: toolName.trim(),
          apiKey: apiKey.trim(),
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Request failed (${response.status})`);
        return;
      }

      // Cached result — manual already exists
      if (data.cached) {
        setSubmitted({
          id: data.id,
          tool: data.tool,
          cached: true,
          shareableUrl: data.shareableUrl,
        });
        if (data.totalCost > 0) {
          setTotalCost((prev) => prev + data.totalCost);
        }
        return;
      }

      // Job created
      setSubmitted({
        id: data.id,
        tool: data.tool,
        cached: false,
      });
      setToolName("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [toolName, apiKey, isSubmitting]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">KB Builder</h1>
              <p className="text-sm text-slate-500">
                AI-powered instruction manuals
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/pending"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Clock className="h-4 w-4" />
              Pending
            </Link>
            <Link
              href="/manuals"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Library className="h-4 w-4" />
              Manuals
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Cost Tracker */}
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">
                Total API Cost (Session)
              </p>
              <p className="text-2xl font-bold text-blue-600">
                ${totalCost.toFixed(3)}
              </p>
            </div>
            <button
              onClick={resetCost}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200"
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
            Enter any software tool name. Your manual will be generated in the
            background with live web research — you&apos;ll be notified when
            it&apos;s ready.
          </p>

          {/* API Key Input */}
          <div className="mb-4 space-y-3">
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-slate-700"
            >
              Perplexity API Key
              <span className="ml-1 text-xs text-slate-500">
                (
                <a
                  href="https://www.perplexity.ai/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  get yours
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
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <button
                onClick={validateApiKey}
                disabled={!apiKey.trim() || isValidatingKey}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                disabled={!apiKey.trim() || isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                id="persistKey"
                checked={persistKey}
                onChange={(e) => setPersistKey(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
              />
              <label htmlFor="persistKey" className="text-slate-600">
                Remember my API key (
                {persistKey ? (
                  <span className="font-medium text-blue-600">persistent</span>
                ) : (
                  <span className="font-medium text-orange-600">
                    session only
                  </span>
                )}
                )
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
                  if (e.key === "Enter" && !isSubmitting) handleSubmit();
                }}
                placeholder="e.g., Notion, Figma, VS Code, Slack..."
                maxLength={100}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={isSubmitting}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!toolName.trim() || isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
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

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
              <div>
                <h3 className="font-semibold text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submission Confirmation */}
        {submitted && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6">
            {submitted.cached ? (
              <div>
                <h3 className="text-lg font-bold text-green-900">
                  Manual Already Exists
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  A recent manual for &ldquo;{submitted.tool}&rdquo; was found
                  in cache.
                </p>
                {submitted.shareableUrl && (
                  <div className="mt-4 flex gap-3">
                    <a
                      href={submitted.shareableUrl}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                    >
                      View Manual
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-green-900">
                  Generation Started!
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  Your manual for &ldquo;{submitted.tool}&rdquo; is being
                  generated with live web research. This typically takes 2-3
                  minutes.
                </p>
                <div className="mt-4 flex gap-3">
                  <Link
                    href="/pending"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <Clock className="h-4 w-4" />
                    View Progress
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => setSubmitted(null)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Generate Another
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* How It Works */}
        {!submitted && !error && (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
                🔍
              </div>
              <h3 className="font-semibold text-slate-900">
                Live Web Research
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                AI searches official docs, tutorials, and community resources in
                real-time
              </p>
            </div>
            <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-2xl">
                ⏳
              </div>
              <h3 className="font-semibold text-slate-900">
                Background Processing
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Submit and close the tab — we&apos;ll notify you when it&apos;s
                ready
              </p>
            </div>
            <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
                📘
              </div>
              <h3 className="font-semibold text-slate-900">
                Comprehensive Manual
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Features, shortcuts, workflows, tips — all organized and
                shareable
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50">
        <div className="mx-auto max-w-4xl px-6 py-4 text-center text-xs text-slate-400">
          Powered by Perplexity Agent API + Claude Opus 4.6 · Built with
          Next.js
        </div>
      </footer>
    </div>
  );
}
