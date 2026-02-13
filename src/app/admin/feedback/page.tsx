"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Download, Trash2, RefreshCw } from "lucide-react";

interface FeedbackEntry {
  slug: string;
  helpful: boolean;
  sectionType?: string;
  sectionId?: string;
  ip: string;
  createdAt: string;
}

interface FeedbackStats {
  total: number;
  helpful: number;
  notHelpful: number;
  bySlug: Record<string, { helpful: number; notHelpful: number }>;
  entries: number;
}

interface FeedbackResponse {
  stats: FeedbackStats;
  feedback: FeedbackEntry[];
  note: string;
}

export default function AdminFeedbackPage() {
  const [data, setData] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchFeedback = useCallback(async () => {
    try {
      const url = filter 
        ? `/api/admin/feedback?slug=${encodeURIComponent(filter)}`
        : "/api/admin/feedback";
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to fetch feedback:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchFeedback, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [autoRefresh, fetchFeedback]);

  const downloadCSV = async () => {
    const url = filter
      ? `/api/admin/feedback?format=csv&slug=${encodeURIComponent(filter)}`
      : "/api/admin/feedback?format=csv";
    window.open(url, "_blank");
  };

  const clearFeedback = async () => {
    if (!confirm("Clear all feedback entries? This cannot be undone.")) return;
    
    try {
      await fetch("/api/admin/feedback", { method: "DELETE" });
      fetchFeedback();
    } catch (error) {
      console.error("Failed to clear feedback:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading feedback...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-red-600">Failed to load feedback</div>
      </div>
    );
  }

  const { stats, feedback, note } = data;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Feedback Dashboard
          </h1>
          <p className="text-slate-600">{note}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="text-sm text-slate-600 mb-1">Total Feedback</div>
            <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="text-sm text-slate-600 mb-1">Helpful 👍</div>
            <div className="text-3xl font-bold text-green-600">{stats.helpful}</div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.total > 0 ? Math.round((stats.helpful / stats.total) * 100) : 0}%
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="text-sm text-slate-600 mb-1">Not Helpful 👎</div>
            <div className="text-3xl font-bold text-red-600">{stats.notHelpful}</div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.total > 0 ? Math.round((stats.notHelpful / stats.total) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* By Manual Stats */}
        {Object.keys(stats.bySlug).length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Feedback by Manual
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.bySlug).map(([slug, counts]) => (
                <button
                  key={slug}
                  onClick={() => setFilter(filter === slug ? "" : slug)}
                  className={`text-left p-4 rounded-lg border-2 transition ${
                    filter === slug
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="font-semibold text-slate-900 mb-2">{slug}</div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">👍 {counts.helpful}</span>
                    <span className="text-red-600">👎 {counts.notHelpful}</span>
                  </div>
                </button>
              ))}
            </div>
            {filter && (
              <button
                onClick={() => setFilter("")}
                className="mt-4 text-sm text-purple-600 hover:text-purple-700"
              >
                Clear filter
              </button>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={fetchFeedback}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            
            <button
              onClick={downloadCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
            >
              <Download size={16} />
              Download CSV
            </button>

            <button
              onClick={clearFeedback}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <Trash2 size={16} />
              Clear All
            </button>

            <label className="flex items-center gap-2 ml-auto">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-slate-600">Auto-refresh (5s)</span>
            </label>
          </div>
        </div>

        {/* Feedback List */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Feedback ({feedback.length})
            </h2>
          </div>

          {feedback.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No feedback yet. Generate a manual and submit feedback to see it here.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {feedback.map((entry, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-start gap-3">
                    {entry.helpful ? (
                      <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={20} />
                    ) : (
                      <XCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">
                          {entry.slug}
                        </span>
                        {entry.sectionType && (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {entry.sectionType}
                          </span>
                        )}
                      </div>
                      
                      {entry.sectionId && (
                        <div className="text-sm text-slate-600 mb-1">
                          Section: {entry.sectionId}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{new Date(entry.createdAt).toLocaleString()}</span>
                        <span>IP: {entry.ip.replace(/:\d+$/, "")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
