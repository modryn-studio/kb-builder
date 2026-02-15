"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Library,
  Loader2,
  ExternalLink,
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

interface ManualItem {
  slug: string;
  tool: string;
  generatedAt: string;
  featureCount: number;
  shortcutCount: number;
  workflowCount: number;
  tipCount: number;
  coverageScore: number;
  url: string;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ──────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────

export default function ManualsPage() {
  const [manuals, setManuals] = useState<ManualItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchManuals = useCallback(async () => {
    try {
      const response = await fetch("/api/manuals");
      if (!response.ok) return;
      const data = await response.json();
      setManuals(data.manuals ?? []);
    } catch (err) {
      console.error("Failed to fetch manuals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManuals();
  }, [fetchManuals]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Manual Library</h1>
          <p className="mt-1 text-muted-foreground">
            Browse all generated instruction manuals.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : manuals.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Library className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="font-heading text-lg font-semibold text-foreground">
              No manuals yet
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Generate your first instruction manual to see it here.
            </p>
            <Button variant="vault" className="mt-4" asChild>
              <Link href="/">Generate a Manual</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {manuals.map((manual) => (
              <a
                key={manual.slug}
                href={manual.url}
                className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-vault"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {manual.tool}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(manual.generatedAt)}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="vault-muted">{manual.featureCount} features</Badge>
                  {manual.shortcutCount > 0 && (
                    <Badge variant="vault-muted">{manual.shortcutCount} shortcuts</Badge>
                  )}
                  {manual.workflowCount > 0 && (
                    <Badge variant="vault-muted">{manual.workflowCount} workflows</Badge>
                  )}
                  {manual.tipCount > 0 && (
                    <Badge variant="vault-muted">{manual.tipCount} tips</Badge>
                  )}
                </div>
                {manual.coverageScore > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Coverage</span>
                      <span>{Math.round(manual.coverageScore * 100)}%</span>
                    </div>
                    <Progress
                      value={Math.round(manual.coverageScore * 100)}
                      className="mt-1 h-1.5"
                    />
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
