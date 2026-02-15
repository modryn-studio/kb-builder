"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  Bell,
  BellOff,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getOrCreateSessionId } from "@/lib/session";

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

function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${mins}m ${rem}s`;
}

// Expected generation time with web search: 130-160s
const EXPECTED_GENERATION_MS = 150_000;

const statusMessages = [
  "Searching official documentation...",
  "Reading community tutorials...",
  "Analyzing API references...",
  "Extracting keyboard shortcuts...",
  "Mapping out workflows...",
  "Compiling tips & best practices...",
  "Cross-referencing sources...",
  "Structuring your manual...",
];

// ──────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────

export default function JobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRedirected = useRef(false);

  // Fetch job status
  const fetchJob = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (response.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch job: ${response.status}`);
      }
      const data = await response.json();
      setJob(data);
      setErrorCount(0); // Reset on success
      setPollingError(null);
    } catch (err) {
      console.error("Failed to fetch job:", err);
      setErrorCount((prev) => prev + 1);
      if (errorCount >= 4) { // Will be 5 after this increment
        setPollingError("Unable to check job status. Please refresh the page.");
      }
    } finally {
      setLoading(false);
    }
  }, [jobId, errorCount]);

  // Initial fetch
  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Polling — every 3s while job is active (stop after 5 consecutive errors)
  useEffect(() => {
    if (!job) return;
    if (errorCount >= 5) return; // Stop polling after 5 failures
    const isActive = job.status === "queued" || job.status === "processing";
    if (!isActive) return;

    const interval = setInterval(fetchJob, 3000);
    return () => clearInterval(interval);
  }, [job, fetchJob, errorCount]);

  // Live elapsed timer for processing jobs
  useEffect(() => {
    if (!job || job.status !== "processing" || !job.startedAt) return;

    const start = new Date(job.startedAt).getTime();
    setElapsed(Date.now() - start);

    const interval = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 1000);

    return () => clearInterval(interval);
  }, [job?.status, job?.startedAt]);

  // Rotate status messages
  useEffect(() => {
    if (!job || job.status !== "processing") return;

    const interval = setInterval(() => {
      setStatusMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [job?.status]);

  // Auto-redirect on completion
  useEffect(() => {
    if (!job || job.status !== "completed" || !job.shareableUrl || hasRedirected.current) return;

    hasRedirected.current = true;
    redirectTimerRef.current = setTimeout(() => {
      router.push(job.shareableUrl!);
    }, 2500);

    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [job?.status, job?.shareableUrl, router]);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Send browser notification on completion
  useEffect(() => {
    if (!job || job.status !== "completed") return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    new Notification(`Manual Ready: ${job.toolName}`, {
      body: `${job.featureCount} features, ${job.shortcutCount} shortcuts. Click to view.`,
      icon: "/favicon.ico",
    });
  }, [job?.status, job?.toolName, job?.featureCount, job?.shortcutCount]);

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const handleCopy = () => {
    if (job?.shareableUrl) {
      const fullUrl = window.location.origin + job.shareableUrl;
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRetry = async () => {
    if (!job) return;
    const sessionId = getOrCreateSessionId();

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
        const data = await response.json();
        if (data.id) {
          router.push(`/job/${data.id}`);
        }
      }
    } catch (err) {
      console.error("Retry failed:", err);
    }
  };

  const progressPercent =
    job?.status === "processing"
      ? Math.min(95, Math.round((elapsed / EXPECTED_GENERATION_MS) * 100))
      : job?.status === "completed"
        ? 100
        : 0;

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-40">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !job) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-xl px-6 pt-32 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <XCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Job not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This generation job doesn&apos;t exist or has expired.
          </p>
          <Button
            variant="vault"
            className="mt-6"
            onClick={() => router.push("/")}
          >
            Generate a Manual
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-2xl px-6 pt-28 pb-20">
        {/* Status icon & heading */}
        <div className="text-center">
          {/* Animated icon */}
          <div className="mx-auto mb-6">
            {job.status === "queued" && (
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
                <Clock className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            {job.status === "processing" && (
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 vault-glow-sm">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            )}
            {job.status === "completed" && (
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
            )}
            {job.status === "failed" && (
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
            )}
          </div>

          {/* Tool name */}
          <h1 className="font-heading text-3xl font-bold text-foreground">
            {job.toolName}
          </h1>

          {/* Status text */}
          <div className="mt-3">
            {job.status === "queued" && (
              <p className="text-muted-foreground">Waiting in queue...</p>
            )}
            {job.status === "processing" && (
              <p className="text-primary font-medium">
                {statusMessages[statusMessageIndex]}
              </p>
            )}
            {job.status === "completed" && (
              <p className="text-success font-medium">
                Manual ready — redirecting...
              </p>
            )}
            {job.status === "failed" && (
              <p className="text-destructive font-medium">
                Generation failed
              </p>
            )}
          </div>
        </div>

        {/* Polling error banner */}
        {pollingError && (
          <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Connection Error</p>
                <p className="mt-1 text-xs text-muted-foreground">{pollingError}</p>
              </div>
              <Button
                variant="vault-outline"
                size="sm"
                onClick={() => {
                  setErrorCount(0);
                  setPollingError(null);
                  fetchJob();
                }}
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Notification permission banner */}
        {notificationPermission === "default" && 
         (job.status === "queued" || job.status === "processing") && (
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Enable notifications</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Get notified when your manual is ready
                </p>
              </div>
              <Button
                variant="vault-outline"
                size="sm"
                onClick={requestNotificationPermission}
              >
                <Bell className="h-3 w-3" />
                Enable
              </Button>
            </div>
          </div>
        )}

        {notificationPermission === "denied" && 
         (job.status === "queued" || job.status === "processing") && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <BellOff className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Browser notifications are blocked. You can still check back here for updates.
              </p>
            </div>
          </div>
        )}

        {/* Progress section */}
        {(job.status === "queued" || job.status === "processing") && (
          <div className="mt-10 rounded-xl border border-border bg-card p-6">
            <Progress value={progressPercent} className="h-2" />
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {job.status === "processing"
                  ? `Generating · ${formatTime(elapsed)}`
                  : "Queued"}
              </span>
              {job.status === "processing" && (
                <span className="text-muted-foreground">
                  ~{Math.max(0, Math.round((EXPECTED_GENERATION_MS - elapsed) / 1000))}s remaining
                </span>
              )}
            </div>

            {/* Tip */}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              You can close this tab — your manual will be in the{" "}
              <a href="/manuals" className="text-primary hover:underline">
                library
              </a>{" "}
              when it&apos;s done.
            </p>
          </div>
        )}

        {/* Completed card */}
        {job.status === "completed" && job.shareableUrl && (
          <div className="mt-10 rounded-xl border border-success/20 bg-success/5 p-6">
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-3">
              {job.featureCount > 0 && (
                <Badge variant="vault-muted">{job.featureCount} features</Badge>
              )}
              {job.shortcutCount > 0 && (
                <Badge variant="vault-muted">{job.shortcutCount} shortcuts</Badge>
              )}
              {job.workflowCount > 0 && (
                <Badge variant="vault-muted">{job.workflowCount} workflows</Badge>
              )}
              {job.tipCount > 0 && (
                <Badge variant="vault-muted">{job.tipCount} tips</Badge>
              )}
              {job.coverageScore > 0 && (
                <Badge variant="vault-muted">{Math.round(job.coverageScore * 100)}% coverage</Badge>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="vault" onClick={() => router.push(job.shareableUrl!)}>
                <ExternalLink className="h-4 w-4" />
                View Manual
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="vault-outline" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>

            {/* Meta */}
            {job.generationTimeMs && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Generated in {formatTime(job.generationTimeMs)}
              </p>
            )}
          </div>
        )}

        {/* Failed card */}
        {job.status === "failed" && (
          <div className="mt-10 rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {job.errorMessage || "An unexpected error occurred during generation."}
            </p>
            <Button variant="vault" className="mt-4" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
