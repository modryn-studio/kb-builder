"use client";

import { useState, useCallback } from "react";
import {
  BookOpen,
  Loader2,
  AlertCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{
    id: string;
    tool: string;
    cached: boolean;
    shareableUrl?: string;
  } | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!toolName.trim() || isSubmitting) return;

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
  }, [toolName, isSubmitting]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 pt-28 pb-12">
        {/* Input Section */}
        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">
            Generate an Instruction Manual
          </h2>
          <p className="mb-6 text-muted-foreground">
            Enter any software tool or website name. Your manual will be
            generated in the background with live web research — completely free.
          </p>

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
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isSubmitting}
              />
            </div>
            <Button
              variant="vault"
              size="lg"
              onClick={handleSubmit}
              disabled={!toolName.trim() || isSubmitting}
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
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
              <div>
                <h3 className="font-heading font-semibold text-foreground">Error</h3>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submission Confirmation */}
        {submitted && (
          <div className="mt-6 rounded-2xl border border-success/30 bg-success/5 p-6">
            {submitted.cached ? (
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  Manual Already Exists
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  A recent manual for &ldquo;{submitted.tool}&rdquo; was found
                  in our library.
                </p>
                {submitted.shareableUrl && (
                  <div className="mt-4 flex gap-3">
                    <Button variant="vault" asChild>
                      <a href={submitted.shareableUrl}>
                        View Manual
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  Generation Started!
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your manual for &ldquo;{submitted.tool}&rdquo; is being
                  generated with live web research. This typically takes 2-3
                  minutes.
                </p>
                <div className="mt-4 flex gap-3">
                  <Link
                    href={`/job/${submitted.id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110"
                  >
                    <Clock className="h-4 w-4" />
                    View Progress
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Button variant="vault-outline" onClick={() => setSubmitted(null)}>
                    Generate Another
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* How It Works */}
        {!submitted && !error && (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
                🔍
              </div>
              <h3 className="font-heading font-semibold text-foreground">
                Live Web Research
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                AI searches official docs, tutorials, and community resources in
                real-time
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
                ⏳
              </div>
              <h3 className="font-heading font-semibold text-foreground">
                Background Processing
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Submit and close the tab — we&apos;ll notify you when it&apos;s
                ready
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
                📘
              </div>
              <h3 className="font-heading font-semibold text-foreground">
                Comprehensive Manual
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Features, shortcuts, workflows, tips — all organized and
                shareable
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
