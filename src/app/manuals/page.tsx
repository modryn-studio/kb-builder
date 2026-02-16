"use client";

import { useState, useEffect, useCallback } from "react";
import { Library, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface ManualItem {
  slug: string;
  tool: string;
  tagline: string;
  description: string;
  initial: string;
  color: string;
  generatedAt: string; // For sorting only, not displayed
  featureCount: number;
  shortcutCount: number;
  workflowCount: number;
  tipCount: number;
  url: string;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

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

      <main className="mx-auto max-w-7xl px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <Library className="w-5 h-5 text-primary" />
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-foreground">
              Manual Library
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-lg">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {manuals.map((manual) => {
              const totalItems = manual.featureCount + manual.shortcutCount + manual.workflowCount + manual.tipCount;
              
              return (
                <a
                  key={manual.slug}
                  href={manual.url}
                  className="group flex flex-col text-left w-full rounded-xl border border-border/50 bg-card/60 hover:bg-card hover:border-primary/20 p-5 transition-all duration-300 hover:shadow-vault"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-heading font-semibold shrink-0"
                      style={{
                        backgroundColor: `${manual.color.replace(")", " / 0.12)")}`,
                        color: manual.color,
                      }}
                    >
                      {manual.initial}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading text-lg font-semibold text-card-foreground group-hover:text-foreground transition-colors duration-200 leading-snug">
                        {manual.tool}
                      </h3>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">
                        {manual.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4 line-clamp-2">
                    {manual.description}
                  </p>

                  {/* Count Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {manual.featureCount > 0 && (
                      <Badge variant="vault-muted" className="text-[10px] font-mono">
                        {manual.featureCount} features
                      </Badge>
                    )}
                    {manual.shortcutCount > 0 && (
                      <Badge variant="vault-muted" className="text-[10px] font-mono">
                        {manual.shortcutCount} shortcuts
                      </Badge>
                    )}
                    {manual.workflowCount > 0 && (
                      <Badge variant="vault-muted" className="text-[10px] font-mono">
                        {manual.workflowCount} workflows
                      </Badge>
                    )}
                    {manual.tipCount > 0 && (
                      <Badge variant="vault-muted" className="text-[10px] font-mono">
                        {manual.tipCount} tips
                      </Badge>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/30">
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {totalItems} items
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
