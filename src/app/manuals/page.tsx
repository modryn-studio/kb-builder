"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Clock,
  Library,
  Loader2,
  Plus,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

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
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">KB Builder</h1>
              <p className="text-sm text-slate-500">Generated Manuals</p>
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
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Clock className="h-4 w-4" />
              Pending
            </Link>
            <Link
              href="/manuals"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900"
            >
              <Library className="h-4 w-4" />
              Manuals
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : manuals.length === 0 ? (
          <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
            <Library className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h2 className="text-lg font-semibold text-slate-700">
              No manuals yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Generate your first instruction manual to see it here.
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
          <div className="grid gap-4 sm:grid-cols-2">
            {manuals.map((manual) => (
              <a
                key={manual.slug}
                href={manual.url}
                className="group rounded-xl border bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">
                      {manual.tool}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(manual.generatedAt)}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-300 transition-colors group-hover:text-blue-500" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {manual.featureCount} features
                  </span>
                  {manual.shortcutCount > 0 && (
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                      {manual.shortcutCount} shortcuts
                    </span>
                  )}
                  {manual.workflowCount > 0 && (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      {manual.workflowCount} workflows
                    </span>
                  )}
                  {manual.tipCount > 0 && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {manual.tipCount} tips
                    </span>
                  )}
                </div>
                {manual.coverageScore > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Coverage</span>
                      <span>{Math.round(manual.coverageScore * 100)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{
                          width: `${Math.round(manual.coverageScore * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
