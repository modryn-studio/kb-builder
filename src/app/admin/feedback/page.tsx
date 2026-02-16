"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Download,
  Trash2,
  RefreshCw,
  Star,
  MessageSquare,
  ThumbsUp,
  Lock,
  LogOut,
  Filter,
} from "lucide-react";

// ──────────────────────────────────────────────
// Types (matching API response shape)
// ──────────────────────────────────────────────

interface FeedbackEntry {
  slug: string;
  helpful: boolean;
  sectionType?: string;
  sectionId?: string;
  createdAt: string;
}

interface FeedbackStats {
  total: number;
  helpful: number;
  notHelpful: number;
  bySlug: Record<string, { helpful: number; notHelpful: number }>;
  entries: number;
}

interface RatingStats {
  average: number;
  count: number;
}

interface UserMessage {
  id: string;
  slug?: string;
  type: "feature-request" | "bug-report" | "general" | "manual-feedback";
  message: string;
  email?: string;
  sessionId?: string;
  createdAt: string;
}

interface AdminResponse {
  stats: FeedbackStats;
  ratings: Record<string, RatingStats>;
  messages: UserMessage[];
  feedback: FeedbackEntry[];
  note: string;
}

type Tab = "overview" | "feedback" | "ratings" | "messages";

// ──────────────────────────────────────────────
// Message Type Badge
// ──────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  "feature-request": "bg-primary/15 text-primary",
  "bug-report": "bg-destructive/15 text-destructive",
  "general": "bg-secondary text-muted-foreground",
  "manual-feedback": "bg-primary/15 text-primary",
};

const TYPE_LABELS: Record<string, string> = {
  "feature-request": "Feature Request",
  "bug-report": "Bug Report",
  "general": "General",
  "manual-feedback": "Manual Feedback",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type] || "bg-secondary text-muted-foreground"}`}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}

// ──────────────────────────────────────────────
// Star display
// ──────────────────────────────────────────────

function StarDisplay({ average, count }: { average: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-4 w-4 ${
              s <= Math.round(average)
                ? "fill-primary text-primary"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-foreground">{average.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export default function AdminFeedbackPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [data, setData] = useState<AdminResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [slugFilter, setSlugFilter] = useState("");
  const [messageTypeFilter, setMessageTypeFilter] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Persist key in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem("admin_key");
    if (saved) {
      setAdminKey(saved);
      setAuthenticated(true);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!adminKey) return;
    try {
      const url = slugFilter
        ? `/api/admin/feedback?key=${encodeURIComponent(adminKey)}&slug=${encodeURIComponent(slugFilter)}`
        : `/api/admin/feedback?key=${encodeURIComponent(adminKey)}`;
      const res = await fetch(url);

      if (res.status === 401) {
        setAuthError("Invalid admin key");
        setAuthenticated(false);
        sessionStorage.removeItem("admin_key");
        return;
      }

      const json = await res.json();
      setData(json);
      setAuthenticated(true);
      setAuthError("");
      sessionStorage.setItem("admin_key", adminKey);
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  }, [adminKey, slugFilter]);

  useEffect(() => {
    if (authenticated && adminKey) {
      setLoading(true);
      fetchData();
    }
  }, [authenticated, adminKey, fetchData]);

  useEffect(() => {
    if (!autoRefresh || !authenticated) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, authenticated, fetchData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) return;
    setAuthenticated(true);
    setLoading(true);
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setAdminKey("");
    setData(null);
    sessionStorage.removeItem("admin_key");
  };

  const downloadCSV = () => {
    const url = slugFilter
      ? `/api/admin/feedback?key=${encodeURIComponent(adminKey)}&format=csv&slug=${encodeURIComponent(slugFilter)}`
      : `/api/admin/feedback?key=${encodeURIComponent(adminKey)}&format=csv`;
    window.open(url, "_blank");
  };

  const clearFeedback = async () => {
    if (!confirm("Clear ALL feedback entries? This cannot be undone.")) return;
    try {
      await fetch(`/api/admin/feedback?key=${encodeURIComponent(adminKey)}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Failed to clear:", error);
    }
  };

  // ── Auth screen ──
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-xl border border-border shadow-vault p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                <Lock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-foreground text-center mb-2">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">Enter your admin secret to continue</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Admin secret key"
                autoFocus
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {authError && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{authError}</div>
              )}
              <button
                type="submit"
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive">Failed to load data</div>
      </div>
    );
  }

  const { stats, feedback, ratings, messages } = data;

  const totalRatings = Object.values(ratings).reduce((acc, r) => acc + r.count, 0);
  const overallAvg = totalRatings > 0
    ? Object.values(ratings).reduce((acc, r) => acc + r.average * r.count, 0) / totalRatings
    : 0;

  const filteredMessages = messageTypeFilter === "all"
    ? messages
    : messages.filter((m) => m.type === messageTypeFilter);

  const tabs: { id: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", count: 0, icon: <ThumbsUp className="h-4 w-4" /> },
    { id: "feedback", label: "Thumbs", count: stats.total, icon: <CheckCircle className="h-4 w-4" /> },
    { id: "ratings", label: "Ratings", count: totalRatings, icon: <Star className="h-4 w-4" /> },
    { id: "messages", label: "Messages", count: messages.length, icon: <MessageSquare className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Feedback Dashboard</h1>
            <p className="text-sm text-muted-foreground">{data.note}</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-muted-foreground">Auto-refresh</span>
            </label>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-secondary p-1" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Overview Tab ─── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <div className="text-sm text-muted-foreground mb-1">Thumbs Feedback</div>
                <div className="text-3xl font-bold text-foreground">{stats.total}</div>
                <div className="mt-2 flex gap-3 text-sm">
                  <span className="text-success">👍 {stats.helpful}</span>
                  <span className="text-destructive">👎 {stats.notHelpful}</span>
                </div>
                {stats.total > 0 && (
                  <div className="mt-2 h-2 rounded-full bg-destructive/20 overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full"
                      style={{ width: `${(stats.helpful / stats.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <div className="text-sm text-muted-foreground mb-1">Star Ratings</div>
                <div className="text-3xl font-bold text-foreground">{totalRatings}</div>
                {totalRatings > 0 && (
                  <div className="mt-2">
                    <StarDisplay average={Math.round(overallAvg * 10) / 10} count={totalRatings} />
                  </div>
                )}
              </div>

              <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <div className="text-sm text-muted-foreground mb-1">User Messages</div>
                <div className="text-3xl font-bold text-foreground">{messages.length}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {["bug-report", "feature-request", "manual-feedback", "general"].map((t) => {
                    const c = messages.filter((m) => m.type === t).length;
                    return c > 0 ? (
                      <span key={t} className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TYPE_COLORS[t]}`}>
                        {c} {TYPE_LABELS[t]}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <div className="text-sm text-muted-foreground mb-1">Manuals Tracked</div>
                <div className="text-3xl font-bold text-foreground">
                  {new Set([
                    ...Object.keys(stats.bySlug),
                    ...Object.keys(ratings),
                    ...messages.filter((m) => m.slug).map((m) => m.slug!),
                  ]).size}
                </div>
              </div>
            </div>

            {/* Per-Manual Breakdown */}
            {Object.keys(stats.bySlug).length > 0 && (
              <div className="bg-card rounded-xl shadow-sm border border-border">
                <div className="p-4 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">Feedback by Manual</h2>
                </div>
                <div className="divide-y">
                  {Object.entries(stats.bySlug)
                    .sort((a, b) => (b[1].helpful + b[1].notHelpful) - (a[1].helpful + a[1].notHelpful))
                    .map(([slug, counts]) => (
                      <div key={slug} className="p-4 flex items-center gap-4 hover:bg-secondary">
                        <div className="flex-1 min-w-0">
                          <a
                            href={`/manual/${slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            {slug}
                          </a>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-success">👍 {counts.helpful}</span>
                          <span className="text-destructive">👎 {counts.notHelpful}</span>
                          {ratings[slug] && (
                            <StarDisplay average={ratings[slug].average} count={ratings[slug].count} />
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex flex-wrap gap-3">
              <button
                onClick={downloadCSV}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </button>
              <button
                onClick={clearFeedback}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:brightness-110"
              >
                <Trash2 className="h-4 w-4" />
                Clear All Feedback
              </button>
            </div>
          </div>
        )}

        {/* ─── Feedback (Thumbs) Tab ─── */}
        {activeTab === "feedback" && (
          <div className="space-y-4">
            {/* Slug filter */}
            <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={slugFilter}
                onChange={(e) => setSlugFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              >
                <option value="">All manuals</option>
                {Object.keys(stats.bySlug).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {slugFilter && (
                <button onClick={() => setSlugFilter("")} className="text-sm text-primary hover:brightness-110">
                  Clear
                </button>
              )}
            </div>

            {/* Feedback list */}
            <div className="bg-card rounded-xl shadow-sm border border-border">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  Thumbs Feedback ({feedback.length})
                </h2>
              </div>
              {feedback.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No feedback entries yet.</div>
              ) : (
                <div className="divide-y">
                  {feedback.map((entry, idx) => (
                    <div key={idx} className="p-4 flex items-start gap-3 hover:bg-secondary">
                      {entry.helpful ? (
                        <CheckCircle className="text-success shrink-0 mt-0.5" size={18} />
                      ) : (
                        <XCircle className="text-destructive shrink-0 mt-0.5" size={18} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <a
                            href={`/manual/${entry.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline text-sm"
                          >
                            {entry.slug}
                          </a>
                          {entry.sectionType && (
                            <span className="text-xs px-2 py-0.5 bg-secondary text-muted-foreground rounded-full">
                              {entry.sectionType}
                            </span>
                          )}
                        </div>
                        {entry.sectionId && (
                          <div className="text-xs text-muted-foreground">Section: {entry.sectionId}</div>
                        )}
                        <div className="text-xs text-muted-foreground/70 mt-0.5">
                          {new Date(entry.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Ratings Tab ─── */}
        {activeTab === "ratings" && (
          <div className="space-y-4">
            {Object.keys(ratings).length === 0 ? (
              <div className="bg-card rounded-xl p-8 shadow-sm border border-border text-center text-muted-foreground">
                No star ratings yet.
              </div>
            ) : (
              <div className="bg-card rounded-xl shadow-sm border border-border">
                <div className="p-4 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">
                    Star Ratings by Manual ({Object.keys(ratings).length} manuals)
                  </h2>
                </div>
                <div className="divide-y">
                  {Object.entries(ratings)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([slug, r]) => (
                      <div key={slug} className="p-4 flex items-center justify-between hover:bg-secondary">
                        <a
                          href={`/manual/${slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          {slug}
                        </a>
                        <StarDisplay average={r.average} count={r.count} />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Messages Tab ─── */}
        {activeTab === "messages" && (
          <div className="space-y-4">
            {/* Type filter */}
            <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={messageTypeFilter}
                onChange={(e) => setMessageTypeFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              >
                <option value="all">All types</option>
                <option value="bug-report">Bug Reports</option>
                <option value="feature-request">Feature Requests</option>
                <option value="manual-feedback">Manual Feedback</option>
                <option value="general">General</option>
              </select>
              <span className="text-sm text-muted-foreground">{filteredMessages.length} messages</span>
            </div>

            {/* Messages list */}
            {filteredMessages.length === 0 ? (
              <div className="bg-card rounded-xl p-8 shadow-sm border border-border text-center text-muted-foreground">
                No messages yet.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMessages.map((msg) => (
                  <div key={msg.id} className="bg-card rounded-xl p-5 shadow-sm border border-border hover:shadow-vault transition">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <TypeBadge type={msg.type} />
                        {msg.slug && (
                          <a
                            href={`/manual/${msg.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {msg.slug}
                          </a>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground/70 whitespace-nowrap">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                    {msg.email && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        📧 <a href={`mailto:${msg.email}`} className="text-primary hover:underline">{msg.email}</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
