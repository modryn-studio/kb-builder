// ──────────────────────────────────────────────
// Job Store — In-memory for dev, swap to Neon/Postgres for production
// ──────────────────────────────────────────────

import { randomUUID } from "crypto";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface GenerationJob {
  id: string;
  toolName: string;
  slug: string;
  status: JobStatus;

  // Timestamps
  createdAt: string;      // ISO-8601
  startedAt?: string;
  completedAt?: string;

  // Result (populated on completion)
  manualUrl?: string;
  shareableUrl?: string;

  // Cost tracking
  inputTokens: number;
  outputTokens: number;
  modelCost: number;
  searchCost: number;
  totalCost: number;

  // Metadata
  modelUsed?: string;
  citationCount: number;
  generationTimeMs?: number;
  errorMessage?: string;

  // Session
  sessionId: string;

  // Summary (populated on completion)
  featureCount: number;
  shortcutCount: number;
  workflowCount: number;
  tipCount: number;
  coverageScore: number;

  // API key (stored temporarily for processing, never exposed to client)
  apiKey?: string;
}

export type JobSummary = Omit<GenerationJob, "apiKey">;

// ──────────────────────────────────────────────
// In-Memory Store
// ──────────────────────────────────────────────

const jobs = new Map<string, GenerationJob>();

// ──────────────────────────────────────────────
// CRUD Operations
// ──────────────────────────────────────────────

export function createJob(params: {
  toolName: string;
  slug: string;
  sessionId: string;
  apiKey: string;
}): GenerationJob {
  const job: GenerationJob = {
    id: randomUUID(),
    toolName: params.toolName,
    slug: params.slug,
    status: "queued",
    createdAt: new Date().toISOString(),
    sessionId: params.sessionId,
    apiKey: params.apiKey,

    // Defaults
    inputTokens: 0,
    outputTokens: 0,
    modelCost: 0,
    searchCost: 0,
    totalCost: 0,
    citationCount: 0,
    featureCount: 0,
    shortcutCount: 0,
    workflowCount: 0,
    tipCount: 0,
    coverageScore: 0,
  };

  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): GenerationJob | undefined {
  return jobs.get(id);
}

export function listJobs(sessionId: string, statuses?: JobStatus[]): JobSummary[] {
  const results: JobSummary[] = [];

  for (const job of jobs.values()) {
    if (job.sessionId !== sessionId) continue;
    if (statuses && statuses.length > 0 && !statuses.includes(job.status)) continue;
    
    // Strip API key before returning
    const { apiKey: _, ...summary } = job;
    results.push(summary);
  }

  // Sort by createdAt descending (newest first)
  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function updateJob(id: string, updates: Partial<GenerationJob>): GenerationJob | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;

  const updated = { ...job, ...updates };
  jobs.set(id, updated);
  return updated;
}

/** Find the oldest queued job, or a stuck processing job (>5 min). */
export function findNextJob(): GenerationJob | undefined {
  const now = Date.now();
  const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

  let oldest: GenerationJob | undefined;

  for (const job of jobs.values()) {
    // Queued jobs
    if (job.status === "queued") {
      if (!oldest || new Date(job.createdAt).getTime() < new Date(oldest.createdAt).getTime()) {
        oldest = job;
      }
    }

    // Stuck processing jobs (started > 5 min ago)
    if (job.status === "processing" && job.startedAt) {
      const elapsed = now - new Date(job.startedAt).getTime();
      if (elapsed > STUCK_THRESHOLD_MS) {
        // Reset to queued so it gets re-processed
        job.status = "queued";
        job.startedAt = undefined;
        if (!oldest || new Date(job.createdAt).getTime() < new Date(oldest.createdAt).getTime()) {
          oldest = job;
        }
      }
    }
  }

  return oldest;
}

/** Count queued jobs ahead of a given job (for position display). */
export function getQueuePosition(jobId: string): number {
  const job = jobs.get(jobId);
  if (!job || job.status !== "queued") return 0;

  let position = 0;
  for (const j of jobs.values()) {
    if (j.status === "queued" && new Date(j.createdAt).getTime() < new Date(job.createdAt).getTime()) {
      position++;
    }
  }
  return position + 1; // 1-indexed
}

/** Check rate limit: max jobs per session in a time window. */
export function checkJobRateLimit(sessionId: string): { allowed: boolean; retryAfterMs?: number } {
  const MAX_JOBS_PER_MINUTE = 5;
  const WINDOW_MS = 60_000;
  const now = Date.now();

  let count = 0;
  let oldestInWindow = now;

  for (const job of jobs.values()) {
    if (job.sessionId !== sessionId) continue;
    const createdAt = new Date(job.createdAt).getTime();
    if (now - createdAt < WINDOW_MS) {
      count++;
      if (createdAt < oldestInWindow) oldestInWindow = createdAt;
    }
  }

  if (count >= MAX_JOBS_PER_MINUTE) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - oldestInWindow) };
  }
  return { allowed: true };
}

/** Cleanup old completed/failed jobs (keep last 100 per session). */
export function cleanupOldJobs(): void {
  const MAX_JOBS_PER_SESSION = 100;
  const sessionCounts = new Map<string, GenerationJob[]>();

  for (const job of jobs.values()) {
    const list = sessionCounts.get(job.sessionId) || [];
    list.push(job);
    sessionCounts.set(job.sessionId, list);
  }

  for (const [, sessionJobs] of sessionCounts) {
    if (sessionJobs.length <= MAX_JOBS_PER_SESSION) continue;

    // Sort by createdAt descending, remove oldest
    sessionJobs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const toRemove = sessionJobs.slice(MAX_JOBS_PER_SESSION);
    for (const job of toRemove) {
      if (job.status === "completed" || job.status === "failed") {
        jobs.delete(job.id);
      }
    }
  }
}
