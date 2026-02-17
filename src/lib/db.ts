// ──────────────────────────────────────────────
// Job Store — In-memory + Blob persistence
// ──────────────────────────────────────────────

import { randomUUID } from "crypto";
import { hydrateJobs, persistJobs } from "./blob-persistence";

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
}

export type JobSummary = GenerationJob;

// ──────────────────────────────────────────────
// In-Memory Store (hydrated from Blob on first access)
// ──────────────────────────────────────────────

const jobs = new Map<string, GenerationJob>();
let hydrated = false;

async function ensureHydrated(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const saved = await hydrateJobs();
  for (const job of saved) {
    jobs.set(job.id, job);
  }
}

function persistAll(): void {
  persistJobs(Array.from(jobs.values()));
}

// ──────────────────────────────────────────────
// CRUD Operations
// ──────────────────────────────────────────────

export async function createJob(params: {
  toolName: string;
  slug: string;
  sessionId: string;
}): Promise<GenerationJob> {
  await ensureHydrated();

  const job: GenerationJob = {
    id: randomUUID(),
    toolName: params.toolName,
    slug: params.slug,
    status: "queued",
    createdAt: new Date().toISOString(),
    sessionId: params.sessionId,

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
  };

  jobs.set(job.id, job);
  persistAll();
  return job;
}

export async function getJob(id: string): Promise<GenerationJob | undefined> {
  await ensureHydrated();
  return jobs.get(id);
}

/** Check if a job already exists for this slug (queued or processing). */
export async function findExistingJob(slug: string): Promise<GenerationJob | undefined> {
  await ensureHydrated();
  
  for (const job of jobs.values()) {
    if (job.slug === slug && (job.status === "queued" || job.status === "processing")) {
      return job;
    }
  }
  
  return undefined;
}

export async function listJobs(sessionId: string, statuses?: JobStatus[]): Promise<JobSummary[]> {
  await ensureHydrated();
  const results: JobSummary[] = [];

  for (const job of jobs.values()) {
    if (job.sessionId !== sessionId) continue;
    if (statuses && statuses.length > 0 && !statuses.includes(job.status)) continue;
    results.push(job);
  }

  // Sort by createdAt descending (newest first)
  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateJob(id: string, updates: Partial<GenerationJob>): Promise<GenerationJob | undefined> {
  await ensureHydrated();
  const job = jobs.get(id);
  if (!job) return undefined;

  const updated = { ...job, ...updates };
  jobs.set(id, updated);
  persistAll();
  return updated;
}

export async function deleteJob(id: string): Promise<boolean> {
  await ensureHydrated();
  const exists = jobs.has(id);
  if (exists) {
    jobs.delete(id);
    persistAll();
  }
  return exists;
}

/** Force delete job (admin only - no status check). */
export async function forceDeleteJob(id: string): Promise<boolean> {
  await ensureHydrated();
  const exists = jobs.has(id);
  if (exists) {
    jobs.delete(id);
    persistAll();
  }
  return exists;
}

/** Get all jobs (admin only - no session filter). */
export async function getAllJobs(): Promise<JobSummary[]> {
  await ensureHydrated();
  const results = Array.from(jobs.values());
  
  // Sort by createdAt descending (newest first)
  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Delete all jobs (admin only). */
export async function deleteAllJobs(): Promise<number> {
  await ensureHydrated();
  const count = jobs.size;
  jobs.clear();
  persistAll();
  return count;
}

/** Find the oldest queued job, or a stuck processing job (>5 min). */
export async function findNextJob(): Promise<GenerationJob | undefined> {
  await ensureHydrated();
  const now = Date.now();
  const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

  let oldest: GenerationJob | undefined;
  let hasResetStuckJobs = false;

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
        const updated = { ...job, status: "queued" as JobStatus, startedAt: undefined };
        jobs.set(job.id, updated);
        hasResetStuckJobs = true;
        
        if (!oldest || new Date(updated.createdAt).getTime() < new Date(oldest.createdAt).getTime()) {
          oldest = updated;
        }
      }
    }
  }

  // Persist if we reset any stuck jobs
  if (hasResetStuckJobs) {
    persistAll();
  }

  return oldest;
}

/** Count queued jobs ahead of a given job (for position display). */
export async function getQueuePosition(jobId: string): Promise<number> {
  await ensureHydrated();
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
export async function checkJobRateLimit(sessionId: string): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  await ensureHydrated();
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
export async function cleanupOldJobs(): Promise<void> {
  await ensureHydrated();
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
  persistAll();
}
