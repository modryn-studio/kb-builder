"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { AdminAuth } from "@/components/AdminAuth";
import { 
  MessageSquare, 
  Cog, 
  ShieldCheck,
  ArrowRight,
  Database,
  BarChart3
} from "lucide-react";

export default function AdminPage() {
  return (
    <AdminAuth>
      <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 pt-24 pb-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="font-heading text-4xl font-bold text-foreground">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage job processing, view user feedback, and monitor system health.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Job Management */}
          <Link
            href="/admin/jobs"
            className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:bg-primary/5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Cog className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                    Job Queue
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    Manually trigger the job processor to process queued manual generations.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <span>Manage Jobs</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Feedback Management */}
          <Link
            href="/admin/feedback"
            className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:bg-primary/5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                    User Feedback
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    View bug reports, feature requests, and user messages.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <span>View Feedback</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Storage Management */}
          <div className="rounded-xl border border-border bg-card p-6 opacity-60">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-muted/30 p-3">
                <Database className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                  Storage Management
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  View Blob storage usage, manage manual versions, cleanup old jobs.
                </p>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>

          {/* Analytics */}
          <div className="rounded-xl border border-border bg-card p-6 opacity-60">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-muted/30 p-3">
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                  Analytics
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Generation costs, completion rates, popular tools, user engagement.
                </p>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="vault" size="sm" asChild>
              <Link href="/admin/jobs">Trigger Processor</Link>
            </Button>
            <Button variant="vault-outline" size="sm" asChild>
              <Link href="/admin/feedback">View Feedback</Link>
            </Button>
            <Button variant="vault-outline" size="sm" asChild>
              <Link href="/pending">View All Jobs</Link>
            </Button>
            <Button variant="vault-outline" size="sm" asChild>
              <Link href="/manuals">Browse Manuals</Link>
            </Button>
          </div>
        </div>

        {/* Admin Info */}
        <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
          <h4 className="text-sm font-semibold text-foreground mb-2">Admin Access</h4>
          <p className="text-xs text-muted-foreground">
            Some endpoints require <code className="px-1 py-0.5 rounded bg-muted text-foreground">ADMIN_SECRET</code> or{" "}
            <code className="px-1 py-0.5 rounded bg-muted text-foreground">CRON_SECRET</code> authentication.
            Configure these in your environment variables.
          </p>
        </div>
      </main>

      <Footer />
    </div>
    </AdminAuth>
  );
}
