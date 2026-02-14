"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  Zap,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  Keyboard,
  BookOpen,
  Star,
  ThumbsUp,
  ThumbsDown,
  ArrowUp,
  Copy,
  Check,
  Link as LinkIcon,
  Download,
  History,
  X,
  Send,
  MessageSquare,
} from "lucide-react";
import type { InstructionManual } from "@/lib/schema";

// ──────────────────────────────────────────────
// Citation Links
// ──────────────────────────────────────────────

function CitationLinks({
  sourceIndices,
  citations,
}: {
  sourceIndices: number[];
  citations: string[];
}) {
  if (!sourceIndices || sourceIndices.length === 0) return null;

  return (
    <span className="ml-1 inline-flex gap-0.5">
      {sourceIndices.map((idx) => {
        if (idx < 0 || idx >= citations.length) return null;
        return (
          <a
            key={idx}
            href={citations[idx]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-4 w-4 items-center justify-center rounded bg-blue-100 text-[10px] font-medium text-blue-700 hover:bg-blue-200"
            title={citations[idx]}
          >
            {idx + 1}
          </a>
        );
      })}
    </span>
  );
}

// ──────────────────────────────────────────────
// Badges
// ──────────────────────────────────────────────

function PowerBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    basic: "bg-green-100 text-green-700",
    beginner: "bg-green-100 text-green-700",
    intermediate: "bg-yellow-100 text-yellow-700",
    advanced: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[level] || "bg-slate-100 text-slate-600"}`}
    >
      {level}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    minor: "bg-yellow-100 text-yellow-700",
    moderate: "bg-orange-100 text-orange-700",
    major: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[severity] || "bg-slate-100 text-slate-600"}`}
    >
      {severity}
    </span>
  );
}

// ──────────────────────────────────────────────
// Collapsible Section
// ──────────────────────────────────────────────

function Collapsible({
  title,
  icon: Icon,
  defaultOpen = false,
  count,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left hover:bg-slate-50"
      >
        {open ? (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-slate-400" />
        )}
        <Icon className="h-5 w-5 text-blue-600" />
        <span className="flex-1 font-semibold text-slate-900">{title}</span>
        {count !== undefined && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm text-slate-600">
            {count}
          </span>
        )}
      </button>
      {open && <div className="border-t px-6 py-4">{children}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────
// Per-Section Feedback
// ──────────────────────────────────────────────

function SectionFeedback({
  slug,
  sectionType,
  sectionId,
}: {
  slug: string;
  sectionType: string;
  sectionId: string;
}) {
  const [sent, setSent] = useState<boolean | null>(null);

  const send = async (helpful: boolean) => {
    try {
      await fetch(`/api/manual/${slug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful, sectionType, sectionId }),
      });
      setSent(helpful);
    } catch {
      // best-effort
    }
  };

  if (sent !== null) {
    return (
      <span className="text-xs text-slate-400">Thanks!</span>
    );
  }

  return (
    <span className="inline-flex gap-1">
      <button
        onClick={() => send(true)}
        className="rounded p-0.5 text-slate-400 hover:bg-green-50 hover:text-green-600"
        title="Helpful"
      >
        <ThumbsUp className="h-3 w-3" />
      </button>
      <button
        onClick={() => send(false)}
        className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
        title="Not helpful"
      >
        <ThumbsDown className="h-3 w-3" />
      </button>
    </span>
  );
}

// ──────────────────────────────────────────────
// Table of Contents
// ──────────────────────────────────────────────

interface TocEntry {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

function TableOfContents({
  entries,
  activeId,
}: {
  entries: TocEntry[];
  activeId: string;
}) {
  return (
    <nav className="sticky top-6 rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Contents
      </h3>
      <ul className="space-y-1">
        {entries.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                activeId === e.id
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="w-4 text-center text-xs">{e.icon}</span>
              <span className="flex-1 truncate">{e.label}</span>
              {e.count !== undefined && (
                <span className="text-xs text-slate-400">{e.count}</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ──────────────────────────────────────────────
// Star Rating Widget
// ──────────────────────────────────────────────

function StarRatingWidget({
  slug,
}: {
  slug: string;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);

  // Fetch existing rating stats on mount
  useEffect(() => {
    fetch(`/api/manual/${slug}/rate`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setAverage(data.average || 0);
          setCount(data.count || 0);
        }
      })
      .catch(() => {});
  }, [slug]);

  const submitRating = async (value: number) => {
    setRating(value);
    try {
      let sessionId = "";
      if (typeof window !== "undefined") {
        sessionId = localStorage.getItem("kb_session_id") || crypto.randomUUID();
        localStorage.setItem("kb_session_id", sessionId);
      }
      const res = await fetch(`/api/manual/${slug}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value, sessionId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAverage(data.average || value);
        setCount(data.count || 1);
        setSubmitted(true); // Only set after successful submission
      }
    } catch {
      // If it fails, user can try again
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => !submitted && submitRating(star)}
            onMouseEnter={() => !submitted && setHover(star)}
            onMouseLeave={() => !submitted && setHover(0)}
            disabled={submitted}
            className="p-0.5 transition-transform hover:scale-110 disabled:cursor-default"
            title={submitted ? `You rated ${rating}/5` : `Rate ${star}/5`}
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                star <= (hover || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : star <= Math.round(average) && !hover && !rating
                    ? "fill-yellow-200 text-yellow-300"
                    : "text-slate-300"
              }`}
            />
          </button>
        ))}
      </div>
      {count > 0 && (
        <span className="text-sm text-slate-500">
          {average.toFixed(1)} ({count} {count === 1 ? "rating" : "ratings"})
        </span>
      )}
      {submitted && (
        <span className="text-sm text-green-600">Thanks!</span>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Feedback Message Modal
// ──────────────────────────────────────────────

const MESSAGE_TYPES = [
  { value: "manual-feedback", label: "Manual Feedback", description: "About this specific manual" },
  { value: "bug-report", label: "Bug Report", description: "Something isn't working" },
  { value: "feature-request", label: "Feature Request", description: "Suggest an improvement" },
  { value: "general", label: "General", description: "Anything else" },
] as const;

function FeedbackModal({
  slug,
  onClose,
}: {
  slug: string;
  onClose: () => void;
}) {
  const [type, setType] = useState<string>("manual-feedback");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    setError("");
    try {
      let sessionId: string | undefined;
      if (typeof window !== "undefined") {
        sessionId = localStorage.getItem("kb_session_id") || undefined;
      }

      const res = await fetch("/api/feedback/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          type,
          message: message.trim(),
          email: email.trim() || undefined,
          sessionId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send feedback");
    } finally {
      setSending(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Feedback Sent!</h3>
          <p className="mt-2 text-sm text-slate-600">Thanks for helping us improve.</p>
          <button
            onClick={onClose}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">Send Feedback</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            {MESSAGE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`rounded-lg border-2 p-3 text-left transition ${
                  type === t.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-sm font-medium text-slate-900">{t.label}</div>
                <div className="text-xs text-slate-500">{t.description}</div>
              </button>
            ))}
          </div>

          {/* Message */}
          <div>
            <label htmlFor="fb-message" className="block text-sm font-medium text-slate-700 mb-1">
              Message
            </label>
            <textarea
              id="fb-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind..."
              rows={4}
              maxLength={5000}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="mt-1 text-right text-xs text-slate-400">{message.length}/5000</div>
          </div>

          {/* Email (optional) */}
          <div>
            <label htmlFor="fb-email" className="block text-sm font-medium text-slate-700 mb-1">
              Email <span className="text-slate-400 font-normal">(optional, for follow-up)</span>
            </label>
            <input
              id="fb-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : "Send Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export default function ManualContent({
  manual,
}: {
  manual: InstructionManual;
}) {
  const [feedbackSent, setFeedbackSent] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [showVersions, setShowVersions] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [versions, setVersions] = useState<Array<{ version: string; uploadedAt: string; url: string }>>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track active section via IntersectionObserver
  useEffect(() => {
    const sections = mainRef.current?.querySelectorAll("[data-toc-id]");
    if (!sections || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.tocId;
            if (id) setActiveSection(id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    for (const section of sections) observer.observe(section);
    return () => {
      observer.disconnect();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const sendFeedback = async (helpful: boolean) => {
    try {
      await fetch(`/api/manual/${manual.slug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful }),
      });
      setFeedbackSent(helpful);
    } catch {
      // Feedback is best-effort
    }
  };

  // Export as Markdown
  const exportAsMarkdown = () => {
    const lines: string[] = [];
    
    lines.push(`# ${manual.tool} - Instruction Manual\n`);
    lines.push(`**Generated**: ${new Date().toLocaleDateString()}\n`);
    lines.push(`**Tool Scope**: ${manual.toolScope}\n`);
    lines.push(`**Coverage Score**: ${Math.round(manual.coverageScore * 100)}%\n\n`);
    
    if (manual.overview) {
      lines.push(`## Overview\n\n${manual.overview.whatItIs}\n\n`);
      if (manual.overview.primaryUseCases.length > 0) {
        lines.push(`**Primary Use Cases**:\n`);
        manual.overview.primaryUseCases.forEach(uc => lines.push(`- ${uc}\n`));
        lines.push('\n');
      }
    }
    
    // Features
    if (manual.features.length > 0) {
      lines.push(`## Features (${manual.features.length})\n\n`);
      const featuresByCategory = manual.features.reduce((acc: Record<string, typeof manual.features>, f) => {
        const cat = f.category || "General";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(f);
        return acc;
      }, {});
      
      for (const [category, features] of Object.entries(featuresByCategory)) {
        lines.push(`### ${category}\n\n`);
        for (const f of features) {
          lines.push(`#### ${f.name}\n\n`);
          lines.push(`${f.description}\n\n`);
          if (f.whatItsFor) lines.push(`**What It's For**: ${f.whatItsFor}\n\n`);
          if (f.howToAccess) lines.push(`**How to Access**: ${f.howToAccess}\n\n`);
        }
      }
    }
    
    // Shortcuts
    if (manual.shortcuts.length > 0) {
      lines.push(`## Keyboard Shortcuts (${manual.shortcuts.length})\n\n`);
      for (const s of manual.shortcuts) {
        lines.push(`- **${s.action}**: \`${s.keys}\` (${s.platforms.join(", ")})\n`);
      }
      lines.push("\n");
    }
    
    // Workflows
    if (manual.workflows.length > 0) {
      lines.push(`## Workflows (${manual.workflows.length})\n\n`);
      for (const w of manual.workflows) {
        lines.push(`### ${w.name}\n\n`);
        if (w.description) lines.push(`${w.description}\n\n`);
        lines.push(`**Steps**:\n\n`);
        w.steps.forEach((step, i) => {
          lines.push(`${i + 1}. **${step.action}**${step.details ? `: ${step.details}` : ''}\n`);
        });
        lines.push("\n");
      }
    }
    
    // Tips
    if (manual.tips.length > 0) {
      lines.push(`## Tips & Best Practices (${manual.tips.length})\n\n`);
      for (const t of manual.tips) {
        lines.push(`- **${t.title}**: ${t.description}\n`);
      }
      lines.push("\n");
    }
    
    // Common Mistakes
    if (manual.commonMistakes.length > 0) {
      lines.push(`## Common Mistakes (${manual.commonMistakes.length})\n\n`);
      for (const m of manual.commonMistakes) {
        lines.push(`### ${m.mistake}\n\n`);
        lines.push(`**Why It Happens**: ${m.whyItHappens}\n\n`);
        lines.push(`**How to Fix**: ${m.correction}\n\n`);
      }
    }
    
    // Citations
    if (manual.citations && manual.citations.length > 0) {
      lines.push(`## Sources\n\n`);
      manual.citations.forEach((url, i) => {
        lines.push(`${i + 1}. ${url}\n`);
      });
    }
    
    const markdown = lines.join("");
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${manual.slug}-manual.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load version history
  const loadVersionHistory = async () => {
    setLoadingVersions(true);
    try {
      const response = await fetch(`/api/manual/${manual.slug}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
        setShowVersions(true);
      }
    } catch {
      // Handle silently
    } finally {
      setLoadingVersions(false);
    }
  };

  // Group features by category
  const featuresByCategory = manual.features.reduce(
    (acc, feature) => {
      const cat = feature.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(feature);
      return acc;
    },
    {} as Record<string, typeof manual.features>
  );

  // Build TOC entries
  const tocEntries: TocEntry[] = [
    { id: "overview", label: "Overview", icon: "📋" },
    ...Object.keys(featuresByCategory).map((cat) => ({
      id: `cat-${cat.toLowerCase().replace(/\s+/g, "-")}`,
      label: cat,
      icon: "⚡",
      count: featuresByCategory[cat].length,
    })),
  ];
  if (manual.shortcuts.length > 0)
    tocEntries.push({ id: "shortcuts", label: "Shortcuts", icon: "⌨️", count: manual.shortcuts.length });
  if (manual.workflows.length > 0)
    tocEntries.push({ id: "workflows", label: "Workflows", icon: "📖", count: manual.workflows.length });
  if (manual.tips.length > 0)
    tocEntries.push({ id: "tips", label: "Tips & Tricks", icon: "💡", count: manual.tips.length });
  if (manual.commonMistakes.length > 0)
    tocEntries.push({ id: "mistakes", label: "Common Mistakes", icon: "⚠️", count: manual.commonMistakes.length });
  if (manual.recentUpdates.length > 0)
    tocEntries.push({ id: "updates", label: "Recent Updates", icon: "🆕", count: manual.recentUpdates.length });
  if (manual.citations.length > 0)
    tocEntries.push({ id: "citations", label: "Sources", icon: "🔗", count: manual.citations.length });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <span className="text-lg font-bold text-slate-900">
              KB Builder
            </span>
          </div>
          <a
            href="/kb-builder"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back to Builder
          </a>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <LinkIcon className="h-3.5 w-3.5" />
                Copy Link
              </>
            )}
          </button>
          <button
            onClick={exportAsMarkdown}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            title="Export as Markdown file"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            onClick={loadVersionHistory}
            disabled={loadingVersions}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            title="View version history"
          >
            <History className="h-3.5 w-3.5" />
            {loadingVersions ? "Loading..." : "Versions"}
          </button>
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
            title="Send feedback or report an issue"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Feedback
          </button>
        </div>
      </header>

      {/* Version History Modal */}
      {showVersions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Version History</h3>
              <button
                onClick={() => setShowVersions(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {versions.length === 0 ? (
                <p className="text-center text-slate-500">No previous versions found.</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((v) => (
                    <div
                      key={v.version}
                      className="flex items-center justify-between rounded-lg border p-4 hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {new Date(v.uploadedAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">{v.version}</p>
                      </div>
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View JSON
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex gap-8">
          {/* TOC Sidebar */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <TableOfContents entries={tocEntries} activeId={activeSection} />
          </aside>

          {/* Main Content */}
          <main className="min-w-0 flex-1" ref={mainRef}>
        {/* Coverage Warning */}
        {manual.coverageScore < 0.5 && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Limited Coverage</p>
              <p className="text-sm text-yellow-700">
                This manual has a coverage score of{" "}
                {Math.round(manual.coverageScore * 100)}%. Some information may
                be incomplete. Consider regenerating for better results.
              </p>
            </div>
          </div>
        )}

        {/* Title & Overview */}
        <div className="mb-8" id="overview" data-toc-id="overview">
          <h1 className="text-3xl font-bold text-slate-900">{manual.tool}</h1>
          <p className="mt-2 text-lg text-slate-600">
            {manual.overview.whatItIs}
          </p>

          {/* Star Rating */}
          <div className="mt-3">
            <StarRatingWidget slug={manual.slug} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {manual.overview.platforms.map((p) => (
              <span
                key={p}
                className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
              >
                {p}
              </span>
            ))}
            {manual.overview.pricing && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                {manual.overview.pricing}
              </span>
            )}
          </div>

          {manual.overview.primaryUseCases.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Primary Use Cases
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {manual.overview.primaryUseCases.map((uc) => (
                  <li
                    key={uc}
                    className="rounded-lg bg-slate-100 px-3 py-1 text-sm text-slate-700"
                  >
                    {uc}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {manual.features.length}
            </div>
            <div className="text-xs text-slate-500">Features</div>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {manual.shortcuts.length}
            </div>
            <div className="text-xs text-slate-500">Shortcuts</div>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {manual.workflows.length}
            </div>
            <div className="text-xs text-slate-500">Workflows</div>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">
              {manual.tips.length}
            </div>
            <div className="text-xs text-slate-500">Tips</div>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-red-600">
              {manual.commonMistakes.length}
            </div>
            <div className="text-xs text-slate-500">Mistakes</div>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-slate-600">
              {Math.round(manual.coverageScore * 100)}%
            </div>
            <div className="text-xs text-slate-500">Coverage</div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Features by Category */}
          {Object.entries(featuresByCategory).map(([category, features]) => {
            const catId = `cat-${category.toLowerCase().replace(/\s+/g, "-")}`;
            return (
            <div key={category} id={catId} data-toc-id={catId}>
            <Collapsible
              title={category}
              icon={Zap}
              defaultOpen={true}
              count={features.length}
            >
              <div className="space-y-4">
                {features.map((feature) => (
                  <div
                    key={feature.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-slate-900">
                        {feature.name}
                        <CitationLinks
                          sourceIndices={feature.sourceIndices}
                          citations={manual.citations}
                        />
                      </h4>
                      <div className="flex items-center gap-2">
                        <SectionFeedback slug={manual.slug} sectionType="feature" sectionId={feature.id} />
                        <PowerBadge level={feature.powerLevel} />
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {feature.description}
                    </p>
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-slate-700">
                        What it&apos;s for:{" "}
                      </span>
                      <span className="text-slate-600">
                        {feature.whatItsFor}
                      </span>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="font-medium text-slate-700">
                        How to access:{" "}
                      </span>
                      <span className="text-slate-600">
                        {feature.howToAccess}
                      </span>
                    </div>
                    {feature.whenToUse.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm font-medium text-slate-700">
                          When to use:
                        </span>
                        <ul className="mt-1 space-y-1">
                          {feature.whenToUse.map((w, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-slate-600"
                            >
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Collapsible>
            </div>
            );
          })}

          {/* Shortcuts */}
          {manual.shortcuts.length > 0 && (
            <div id="shortcuts" data-toc-id="shortcuts">
            <Collapsible
              title="Keyboard Shortcuts"
              icon={Keyboard}
              defaultOpen={false}
              count={manual.shortcuts.length}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-2 pr-4 font-medium">Shortcut</th>
                      <th className="pb-2 pr-4 font-medium">Action</th>
                      <th className="pb-2 pr-4 font-medium">Platform</th>
                      <th className="pb-2 pr-4 font-medium">Level</th>
                      <th className="pb-2 font-medium">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {manual.shortcuts.map((shortcut) => (
                      <tr key={shortcut.id}>
                        <td className="py-2 pr-4">
                          <kbd className="rounded border bg-slate-100 px-2 py-0.5 font-mono text-xs">
                            {shortcut.keys}
                          </kbd>
                          <CitationLinks
                            sourceIndices={shortcut.sourceIndices}
                            citations={manual.citations}
                          />
                        </td>
                        <td className="py-2 pr-4 text-slate-700">
                          {shortcut.action}
                        </td>
                        <td className="py-2 pr-4 text-slate-500">
                          {shortcut.platforms.join(", ")}
                        </td>
                        <td className="py-2">
                          <PowerBadge level={shortcut.powerLevel} />
                        </td>
                        <td className="py-2">
                          <SectionFeedback slug={manual.slug} sectionType="shortcut" sectionId={shortcut.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Collapsible>
            </div>
          )}

          {/* Workflows */}
          {manual.workflows.length > 0 && (
            <div id="workflows" data-toc-id="workflows">
            <Collapsible
              title="Workflows"
              icon={BookOpen}
              defaultOpen={false}
              count={manual.workflows.length}
            >
              <div className="space-y-6">
                {manual.workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-slate-900">
                        {workflow.name}
                        <CitationLinks
                          sourceIndices={workflow.sourceIndices}
                          citations={manual.citations}
                        />
                      </h4>
                      <div className="flex items-center gap-2">
                        <SectionFeedback slug={manual.slug} sectionType="workflow" sectionId={workflow.id} />
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          {workflow.estimatedTime}
                        </span>
                        <PowerBadge level={workflow.difficulty} />
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {workflow.description}
                    </p>
                    <ol className="mt-3 space-y-2">
                      {workflow.steps.map((step) => (
                        <li key={step.step} className="flex gap-3 text-sm">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                            {step.step}
                          </span>
                          <div>
                            <p className="font-medium text-slate-800">
                              {step.action}
                            </p>
                            {step.details && (
                              <p className="mt-0.5 text-slate-500">
                                {step.details}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </Collapsible>
            </div>
          )}

          {/* Tips */}
          {manual.tips.length > 0 && (
            <div id="tips" data-toc-id="tips">
            <Collapsible
              title="Tips & Tricks"
              icon={Lightbulb}
              defaultOpen={false}
              count={manual.tips.length}
            >
              <div className="space-y-4">
                {manual.tips.map((tip) => (
                  <div
                    key={tip.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-slate-900">
                        {tip.title}
                        <CitationLinks
                          sourceIndices={tip.sourceIndices}
                          citations={manual.citations}
                        />
                      </h4>
                      <div className="flex items-center gap-2">
                        <SectionFeedback slug={manual.slug} sectionType="tip" sectionId={tip.id} />
                        <PowerBadge level={tip.powerLevel} />
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {tip.description}
                    </p>
                    {tip.example && (
                      <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-sm text-blue-800">
                        <span className="font-medium">Example: </span>
                        {tip.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Collapsible>
            </div>
          )}

          {/* Common Mistakes */}
          {manual.commonMistakes.length > 0 && (
            <div id="mistakes" data-toc-id="mistakes">
            <Collapsible
              title="Common Mistakes"
              icon={AlertTriangle}
              defaultOpen={false}
              count={manual.commonMistakes.length}
            >
              <div className="space-y-4">
                {manual.commonMistakes.map((mistake) => (
                  <div
                    key={mistake.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-red-800">
                        ❌ {mistake.mistake}
                      </h4>
                      <div className="flex items-center gap-2">
                        <SectionFeedback slug={manual.slug} sectionType="mistake" sectionId={mistake.id} />
                        <SeverityBadge severity={mistake.severity} />
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-slate-700">
                        Why it happens:{" "}
                      </span>
                      <span className="text-slate-600">
                        {mistake.whyItHappens}
                      </span>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="font-medium text-green-700">
                        ✅ Correction:{" "}
                      </span>
                      <span className="text-slate-600">
                        {mistake.correction}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Collapsible>
            </div>
          )}

          {/* Recent Updates */}
          {manual.recentUpdates.length > 0 && (
            <div id="updates" data-toc-id="updates">
            <Collapsible
              title="Recent Updates"
              icon={ArrowUp}
              defaultOpen={false}
              count={manual.recentUpdates.length}
            >
              <div className="space-y-3">
                {manual.recentUpdates.map((update, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
                  >
                    <Star
                      className={`h-4 w-4 shrink-0 ${
                        update.impact === "major"
                          ? "text-yellow-500"
                          : "text-slate-400"
                      }`}
                    />
                    <div>
                      <span className="font-medium text-slate-900">
                        {update.feature}
                      </span>
                      <CitationLinks
                        sourceIndices={update.sourceIndices}
                        citations={manual.citations}
                      />
                      <p className="text-sm text-slate-600">
                        {update.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Collapsible>
            </div>
          )}

          {/* Citations */}
          {manual.citations.length > 0 && (
            <div id="citations" data-toc-id="citations">
            <Collapsible
              title="Sources & Citations"
              icon={ExternalLink}
              defaultOpen={false}
              count={manual.citations.length}
            >
              <ol className="space-y-2 text-sm">
                {manual.citations.map((url, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-100 text-[10px] font-medium text-blue-700">
                      {i + 1}
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-blue-600 hover:underline"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ol>
            </Collapsible>
            </div>
          )}
        </div>

        {/* Feedback */}
        <div className="mt-8 rounded-xl border bg-white p-6 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Was this manual helpful?
          </h3>
          {feedbackSent !== null ? (
            <p className="mt-2 text-sm text-slate-600">
              Thanks for your feedback!
            </p>
          ) : (
            <div className="mt-3 flex items-center justify-center gap-4">
              <button
                onClick={() => sendFeedback(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
              >
                <ThumbsUp className="h-4 w-4" />
                Yes, helpful
              </button>
              <button
                onClick={() => sendFeedback(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                <ThumbsDown className="h-4 w-4" />
                Not helpful
              </button>
            </div>
          )}
          <div className="mt-4 border-t pt-4">
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Report an issue or send detailed feedback
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-4 text-center text-xs text-slate-400">
          Generated {new Date(manual.generatedAt).toLocaleString()} ·{" "}
          {manual.citations.length} citations · Schema v{manual.schemaVersion}
        </div>
      </main>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal slug={manual.slug} onClose={() => setShowFeedbackModal(false)} />
      )}
    </div>
  );
}
