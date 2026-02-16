"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, ExternalLink, Loader2 } from "lucide-react";
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
  featureCount: number;
  shortcutCount: number;
  workflowCount: number;
  tipCount: number;
  url: string;
}

// ──────────────────────────────────────────────
// Card Component
// ──────────────────────────────────────────────

function ManualCard({ manual, index }: { manual: ManualItem; index: number }) {
  const totalItems = manual.featureCount + manual.shortcutCount + manual.workflowCount + manual.tipCount;

  return (
    <motion.a
      href={manual.url}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
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
    </motion.a>
  );
}

// ──────────────────────────────────────────────
// Browser Component
// ──────────────────────────────────────────────

export function ManualBrowser() {
  const [manuals, setManuals] = useState<ManualItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchManuals = useCallback(async () => {
    try {
      const response = await fetch("/api/manuals");
      if (!response.ok) return;
      const data = await response.json();
      const allManuals = data.manuals ?? [];
      setTotalCount(allManuals.length);
      // Show only top 8 most recent
      setManuals(allManuals.slice(0, 8));
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
    <section id="manuals" className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-foreground">
              Knowledge Base
            </h2>
            {totalCount > 0 && (
              <Badge variant="vault" className="text-[10px] font-mono">
                {totalCount} manuals
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-body max-w-lg">
            Browse existing manuals or generate a new one for any tool. Each
            manual is synthesized from official docs, tutorials, Reddit, and
            community resources.
          </p>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : manuals.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No manuals generated yet. Be the first to create one!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {manuals.map((manual, i) => (
                <ManualCard key={manual.slug} manual={manual} index={i} />
              ))}
            </div>

            {/* Browse all link */}
            {totalCount > 8 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-center"
              >
                <a
                  href="/manuals"
                  className="inline-flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-primary transition-colors duration-200 group"
                >
                  Browse All {totalCount} Manuals
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </a>
              </motion.div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
