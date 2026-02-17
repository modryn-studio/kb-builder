"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Play, Loader2, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminAuth } from "@/components/AdminAuth";
import { useAdmin } from "@/contexts/AdminContext";

interface Job {
  id: string;
  toolName: string;
  slug: string;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  sessionId: string;
  totalCost: number;
  errorMessage?: string;
  generationTimeMs?: number;
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

function formatCost(cost: number): string {
  return `$${cost.toFixed(3)}`;
}

export default function AdminJobsPage() {
  const { isAuthenticated } = useAdmin();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [message, setMessage] = useState("");

  const getAdminKey = () => sessionStorage.getItem("kb_admin_key") || "";

  const fetchAllJobs = useCallback(async () => {
    try {
      setLoading(true);
      const adminKey = getAdminKey();
      const response = await fetch("/api/admin/jobs", {
        headers: {
          "x-admin-key": adminKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      } else {
        console.error("Failed to fetch jobs:", await response.text());
      }
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerProcessor = async () => {
    setTriggering(true);
    setMessage("");

    try {
      const adminKey = getAdminKey();
      const response = await fetch(`/api/admin/trigger-processor?key=${encodeURIComponent(adminKey)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ ${result.message || "Processor triggered successfully"}`);
        // Refresh jobs after a delay
        setTimeout(() => fetchAllJobs(), 2000);
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.error || "Failed to trigger processor"}`);
      }
    } catch (err) {
      setMessage(`❌ Error: ${(err as Error).message}`);
    } finally {
      setTriggering(false);
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!confirm("Delete this job? This cannot be undone.")) return;

    try {
      setDeleting(jobId);
      const adminKey = getAdminKey();
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "DELETE",
        headers: {
          "x-admin-key": adminKey,
        },
      });

      if (response.ok) {
        setMessage("✅ Job deleted");
        fetchAllJobs();
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.error || "Failed to delete job"}`);
      }
    } catch (err) {
      setMessage(`❌ Error: ${(err as Error).message}`);
    } finally {
      setDeleting(null);
    }
  };

  const clearAllJobs = async () => {
    if (!confirm(`Delete ALL ${jobs.length} jobs? This cannot be undone.`)) return;

    try {
      setClearingAll(true);
      const adminKey = getAdminKey();
      const response = await fetch("/api/admin/jobs", {
        method: "DELETE",
        headers: {
          "x-admin-key": adminKey,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ ${result.message}`);
        setJobs([]);
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.error || "Failed to clear jobs"}`);
      }
    } catch (err) {
      setMessage(`❌ Error: ${(err as Error).message}`);
    } finally {
      setClearingAll(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllJobs();
    }
  }, [isAuthenticated, fetchAllJobs]);

  const getStatusBadge = (status: Job["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="vault" className="bg-success/20 text-success border-success/30">Completed</Badge>;
      case "processing":
        return <Badge variant="vault-outline">Processing</Badge>;
      case "queued":
        return <Badge variant="vault-muted">Queued</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  return (
    <AdminAuth>
      <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 pt-24 pb-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-4xl font-bold text-foreground">
              Admin: Job Queue
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage all generation jobs across all sessions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="vault-outline"
              onClick={fetchAllJobs}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button
              variant="destructive"
              onClick={clearAllJobs}
              disabled={clearingAll || jobs.length === 0}
            >
              {clearingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Clear All ({jobs.length})
                </>
              )}
            </Button>
          </div>
        </div>

        {message && (
          <div className={`mb-6 rounded-lg p-4 border ${message.startsWith("✅") ? "bg-success/10 border-success/30 text-success" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
            {message}
          </div>
        )}

        {/* Job List */}
        <div className="mb-8 rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-6 border-b border-border bg-secondary/30">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              All Jobs ({jobs.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-muted-foreground">Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No jobs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="p-4 font-medium">Tool</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Created</th>
                    <th className="p-4 font-medium">Cost</th>
                    <th className="p-4 font-medium">Session ID</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-4">
                        <div>
                          <Link 
                            href={`/job/${job.id}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {job.toolName}
                          </Link>
                          {job.errorMessage && (
                            <p className="text-xs text-destructive mt-1" title={job.errorMessage}>
                              {job.errorMessage.slice(0, 50)}...
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(job.status)}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatTimeAgo(job.createdAt)}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatCost(job.totalCost)}
                      </td>
                      <td className="p-4 text-xs font-mono text-muted-foreground">
                        {job.sessionId.slice(0, 8)}...
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteJob(job.id)}
                          disabled={deleting === job.id}
                        >
                          {deleting === job.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Manual Processor Trigger */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
            Manual Processor Trigger
          </h2>
          
          <p className="text-sm text-muted-foreground mb-4">
            This will trigger the cron processor to pick up the next queued job and process it.
            If no jobs are queued, you'll get a "No jobs to process" message.
          </p>

          <div className="flex items-center gap-3">
            <Button
              variant="vault"
              onClick={triggerProcessor}
              disabled={triggering}
            >
              {triggering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Trigger Processor
                </>
              )}
            </Button>

            {message && (
              <span className={`text-sm ${message.startsWith("✅") ? "text-success" : "text-destructive"}`}>
                {message}
              </span>
            )}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
            <h3 className="font-semibold text-sm text-foreground mb-2">How it works:</h3>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Processor picks the oldest queued job</li>
              <li>Job status changes to "processing"</li>
              <li>Manual generation runs (130-160s with web search)</li>
              <li>Job status changes to "completed" or "failed"</li>
              <li>Users polling /pending page see the update</li>
            </ol>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h3 className="font-semibold text-sm text-foreground mb-2">Production setup:</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Jobs process immediately when created via the queue processor trigger.
            </p>
            <p className="text-xs text-muted-foreground">
              Vercel Cron runs daily at 2am UTC for cleanup and stuck job recovery.
              Use this manual trigger for immediate processing during testing.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
    </AdminAuth>
  );
}
