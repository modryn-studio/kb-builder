"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface Job {
  id: string;
  toolName: string;
  slug: string;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  shareableUrl?: string;
  totalCost: number;
  generationTimeMs?: number;
  errorMessage?: string;
  featureCount: number;
  shortcutCount: number;
  workflowCount: number;
  tipCount: number;
  elapsedMs?: number;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("kb_session_id") || "";
}

function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${mins}m ${rem}s`;
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Expected generation time with web search: 130-160s
const EXPECTED_GENERATION_MS = 150_000;

// ──────────────────────────────────────────────
// Job Card Component
// ──────────────────────────────────────────────

function JobCard({ job, onRetry }: { job: Job; onRetry: (job: Job) => void }) {
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Live elapsed timer for processing jobs
  useEffect(() => {
    if (job.status !== "processing" || !job.startedAt) return;

    const start = new Date(job.startedAt).getTime();
    setElapsed(Date.now() - start);

    const interval = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 1000);

    return () => clearInterval(interval);
  }, [job.status, job.startedAt]);

  const handleCopy = () => {
    if (job.shareableUrl) {
      const fullUrl = window.location.origin + job.shareableUrl;
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const progressPercent =
    job.status === "processing"
      ? Math.min(95, Math.round((elapsed / EXPECTED_GENERATION_MS) * 100))
      : job.status === "completed"
        ? 100
        : 0;

  return (
    <div
      className={`rounded-xl border p-5 transition-colors ${
        job.status === "processing"
          ? "border-primary/30 bg-primary/5"
          : job.status === "completed"
            ? "border-success/30 bg-success/5"
            : job.status === "failed"
              ? "border-destructive/30 bg-destructive/5"
              : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Status icon */}
          {job.status === "queued" && (
            <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
          )}
          {job.status === "processing" && (
            <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-primary" />
          )}
          {job.status === "completed" && (
            <CheckCircle className="mt-0.5 h-5 w-5 text-success" />
          )}
          {job.status === "failed" && (
            <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
          )}

          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">{job.toolName}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {job.status === "queued" && "Waiting in queue..."}
              {job.status === "processing" && (
                <>
                  Generating · {formatTime(elapsed)}
                  {elapsed > 30000 && " · Searching web..."}
                </>
              )}
              {job.status === "completed" && (
                <>
                  {formatTimeAgo(job.completedAt!)} ·{" "}
                  {job.featureCount} features ·{" "}
                  {job.shortcutCount} shortcuts ·{" "}
                  ${job.totalCost.toFixed(3)}
                </>
              )}
              {job.status === "failed" && (
                <span className="text-destructive">
                  {job.errorMessage || "Generation failed"}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Status badge */}
        {job.status === "queued" && <Badge variant="vault-muted">Queued</Badge>}
        {job.status === "processing" && <Badge variant="vault">Processing</Badge>}
        {job.status === "completed" && (
          <Badge className="border-transparent bg-success/15 text-success">Completed</Badge>
        )}
        {job.status === "failed" && <Badge variant="destructive">Failed</Badge>}
      </div>

      {/* Progress bar for processing */}
      {(job.status === "processing" || job.status === "queued") && (
        <div className="mt-3">
          <Progress value={job.status === "processing" ? progressPercent : 0} className="h-2" />
          {job.status === "processing" && (
            <p className="mt-1 text-xs text-muted-foreground">
              ~{Math.max(0, Math.round((EXPECTED_GENERATION_MS - elapsed) / 1000))}s remaining
            </p>
          )}
        </div>
      )}

      {/* Actions for completed */}
      {job.status === "completed" && job.shareableUrl && (
        <div className="mt-3 flex items-center gap-2">
          <Button variant="vault" size="sm" asChild>
            <a href={job.shareableUrl}>
              <ExternalLink className="h-3.5 w-3.5" />
              View Manual
            </a>
          </Button>
          <Button variant="vault-outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Link
              </>
            )}
          </Button>
          {job.generationTimeMs && (
            <span className="text-xs text-muted-foreground">
              Generated in {formatTime(job.generationTimeMs)}
            </span>
          )}
        </div>
      )}

      {/* Actions for failed */}
      {job.status === "failed" && (
        <div className="mt-3">
          <Button
            variant="vault-outline"
            size="sm"
            onClick={() => onRetry(job)}
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────

export default function PendingPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const notifiedJobsRef = useRef<Set<string>>(new Set());

  const fetchJobs = useCallback(async () => {
    const sessionId = getSessionId();
    if (!sessionId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/jobs?sessionId=${sessionId}`);
      if (!response.ok) return;
      const data = await response.json();
      setJobs(data.jobs ?? []);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Request notification permission
  const requestNotifications = useCallback(async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
  }, []);

  // Check notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Polling — every 3s while active jobs exist
  useEffect(() => {
    const hasActiveJobs = jobs.some(
      (j) => j.status === "queued" || j.status === "processing"
    );
    if (!hasActiveJobs && !loading) return;

    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, [jobs, loading, fetchJobs]);

  // Send browser notification when a job completes
  useEffect(() => {
    if (!notificationsEnabled) return;

    for (const job of jobs) {
      if (job.status === "completed" && !notifiedJobsRef.current.has(job.id)) {
        notifiedJobsRef.current.add(job.id);
        const notification = new Notification(
          `Manual Ready: ${job.toolName}`,
          {
            body: `${job.featureCount} features, ${job.shortcutCount} shortcuts. Click to view.`,
            icon: "/favicon.ico",
          }
        );
        notification.onclick = () => {
          if (job.shareableUrl) {
            window.open(job.shareableUrl, "_blank");
          }
          notification.close();
        };
      }
    }
  }, [jobs, notificationsEnabled]);

  const handleRetry = useCallback(
    async (job: Job) => {
      const sessionId = getSessionId();

      try {
        const response = await fetch("/api/jobs/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: job.toolName,
            sessionId,
            forceRefresh: true,
          }),
        });

        if (response.ok) {
          fetchJobs();
        }
      } catch (err) {
        console.error("Retry failed:", err);
      }
    },
    [fetchJobs]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Your Generations</h1>
          <p className="mt-1 text-muted-foreground">
            Track progress and access your generated manuals.
          </p>
        </div>

        {/* Notification banner */}
        {!notificationsEnabled && typeof window !== "undefined" && "Notification" in window && jobs.length > 0 && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm text-foreground">
              Enable notifications to know when your manuals are ready.
            </p>
            <Button variant="vault" size="sm" onClick={requestNotifications}>
              Enable
            </Button>
          </div>
        )}

        {/* Jobs list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="font-heading text-lg font-semibold text-foreground">
              No generations yet
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Submit a tool name to generate your first instruction manual.
            </p>
            <Button variant="vault" className="mt-4" asChild>
              <Link href="/">Generate a Manual</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onRetry={handleRetry} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
