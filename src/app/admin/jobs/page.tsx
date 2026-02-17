"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Play, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Job {
  id: string;
  toolName: string;
  slug: string;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
  sessionId: string;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState("");

  const fetchAllJobs = async () => {
    try {
      // This would need an admin endpoint that lists ALL jobs
      // For now, we'll just show the manual trigger
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
      setLoading(false);
    }
  };

  const triggerProcessor = async () => {
    setTriggering(true);
    setMessage("");

    try {
      const response = await fetch("/api/cron/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": prompt("Enter CRON_SECRET:") || "dev-secret",
        },
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ ${result.message || "Processor triggered successfully"}`);
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

  useEffect(() => {
    fetchAllJobs();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="font-heading text-4xl font-bold text-foreground">
            Admin: Job Queue
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manually trigger the job processor for testing and debugging
          </p>
        </div>

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
  );
}
