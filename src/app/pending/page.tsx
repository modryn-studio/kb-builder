"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  BookOpen,
  Clock,
  Library,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Plus,
} from "lucide-react";
import Link from "next/link";

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
  coverageScore: number;
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
          ? "border-blue-200 bg-blue-50/50"
          : job.status === "completed"
            ? "border-green-200 bg-green-50/50"
            : job.status === "failed"
              ? "border-red-200 bg-red-50/50"
              : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Status icon */}
          {job.status === "queued" && (
            <Clock className="mt-0.5 h-5 w-5 text-slate-400" />
          )}
          {job.status === "processing" && (
            <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-blue-500" />
          )}
          {job.status === "completed" && (
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
          )}
          {job.status === "failed" && (
            <XCircle className="mt-0.5 h-5 w-5 text-red-500" />
          )}

          <div>
            <h3 className="font-semibold text-slate-900">{job.toolName}</h3>
            <p className="mt-0.5 text-sm text-slate-500">
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
                <span className="text-red-600">
                  {job.errorMessage || "Generation failed"}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            job.status === "queued"
              ? "bg-slate-100 text-slate-600"
              : job.status === "processing"
                ? "bg-blue-100 text-blue-700"
                : job.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
          }`}
        >
          {job.status === "queued" && "Queued"}
          {job.status === "processing" && "Processing"}
          {job.status === "completed" && "Completed"}
          {job.status === "failed" && "Failed"}
        </span>
      </div>

      {/* Progress bar for processing */}
      {(job.status === "processing" || job.status === "queued") && (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                job.status === "processing"
                  ? "bg-blue-500"
                  : "bg-slate-300"
              }`}
              style={{ width: `${job.status === "processing" ? progressPercent : 0}%` }}
            />
          </div>
          {job.status === "processing" && (
            <p className="mt-1 text-xs text-slate-400">
              ~{Math.max(0, Math.round((EXPECTED_GENERATION_MS - elapsed) / 1000))}s remaining
            </p>
          )}
        </div>
      )}

      {/* Actions for completed */}
      {job.status === "completed" && job.shareableUrl && (
        <div className="mt-3 flex items-center gap-2">
          <a
            href={job.shareableUrl}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Manual
          </a>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
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
          </button>
          {job.generationTimeMs && (
            <span className="text-xs text-slate-400">
              Generated in {formatTime(job.generationTimeMs)}
              {job.coverageScore > 0 &&
                ` · ${Math.round(job.coverageScore * 100)}% coverage`}
            </span>
          )}
        </div>
      )}

      {/* Actions for failed */}
      {job.status === "failed" && (
        <div className="mt-3">
          <button
            onClick={() => onRetry(job)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
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
      const savedKey = localStorage.getItem("perplexity_api_key");
      if (!savedKey) {
        alert("Please set your API key on the Builder page first.");
        return;
      }

      try {
        const response = await fetch("/api/jobs/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: job.toolName,
            apiKey: savedKey,
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

  const activeCount = jobs.filter(
    (j) => j.status === "queued" || j.status === "processing"
  ).length;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">KB Builder</h1>
              <p className="text-sm text-slate-500">Your Generations</p>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/kb-builder"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Plus className="h-4 w-4" />
              New
            </Link>
            <Link
              href="/pending"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900"
            >
              <Clock className="h-4 w-4" />
              Pending
              {activeCount > 0 && (
                <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                  {activeCount}
                </span>
              )}
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

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Notification banner */}
        {!notificationsEnabled && typeof window !== "undefined" && "Notification" in window && jobs.length > 0 && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              Enable notifications to know when your manuals are ready — even if you close this tab.
            </p>
            <button
              onClick={requestNotifications}
              className="shrink-0 rounded-lg bg-amber-200 px-3 py-1.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-300"
            >
              Enable Notifications
            </button>
          </div>
        )}

        {/* Jobs list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
            <Clock className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h2 className="text-lg font-semibold text-slate-700">
              No generations yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Submit a tool name to generate your first instruction manual.
            </p>
            <Link
              href="/kb-builder"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Generate a Manual
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onRetry={handleRetry} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
