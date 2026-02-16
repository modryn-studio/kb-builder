"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, BookOpen, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRESETS = [
  { amount: 5, label: "Covers 5 manuals" },
  { amount: 10, label: "Covers 10 manuals" },
  { amount: 25, label: "Covers 25 manuals" },
];

export default function SupportPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const effectiveAmount = selected ?? (custom ? parseFloat(custom) : null);
  const isValid =
    effectiveAmount !== null &&
    Number.isFinite(effectiveAmount) &&
    effectiveAmount >= 1 &&
    effectiveAmount <= 500;

  const handlePreset = (amount: number) => {
    setSelected(amount);
    setCustom("");
    setError("");
  };

  const handleCustomChange = (value: string) => {
    // Allow only numbers and one decimal
    if (value && !/^\d*\.?\d{0,2}$/.test(value)) return;
    setCustom(value);
    setSelected(null);
    setError("");
  };

  const handleCheckout = async () => {
    if (!isValid || !effectiveAmount) return;
    setLoading(true);
    setError("");

    try {
      let sessionId: string | undefined;
      try {
        sessionId = localStorage.getItem("kb_session_id") || undefined;
      } catch {
        // localStorage unavailable
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: effectiveAmount, sessionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch {
      setError("Network error — please try again");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <nav className="border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <span className="font-heading text-xl font-semibold text-foreground tracking-tight">
              KB Builder
            </span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="flex items-center justify-center px-6 py-24">
        <div className="w-full max-w-lg">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </Link>

          {/* Card */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-vault p-10 sm:p-12">
            {/* Icon + heading */}
            <div className="mb-10">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Heart className="w-7 h-7 text-primary" />
              </div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-3">
                Support KB Builder
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Every manual costs about <span className="text-foreground font-medium">$1.05</span> in
                AI API fees. Your support keeps this tool free for everyone.
              </p>
            </div>

            {/* Amount selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-foreground mb-4">
                Choose an amount
              </label>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {PRESETS.map(({ amount, label }) => (
                  <button
                    key={amount}
                    onClick={() => handlePreset(amount)}
                    className={`rounded-xl border-2 p-4 text-center transition-all duration-150 cursor-pointer ${
                      selected === amount
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <span className="block font-heading text-2xl font-bold text-foreground">
                      ${amount}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-1">
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Custom amount"
                  value={custom}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  onFocus={() => setSelected(null)}
                  className={`w-full rounded-xl border-2 bg-background pl-8 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors ${
                    custom && !selected
                      ? "border-primary bg-primary/5"
                      : "border-border focus:border-primary/50"
                  }`}
                />
              </div>

              {custom && parseFloat(custom) > 0 && parseFloat(custom) < 1 && (
                <p className="text-xs text-destructive mt-2">Minimum donation is $1</p>
              )}
              {custom && parseFloat(custom) > 500 && (
                <p className="text-xs text-destructive mt-2">Maximum donation is $500</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive mb-6">
                {error}
              </div>
            )}

            {/* CTA */}
            <Button
              variant="vault"
              size="lg"
              className="w-full text-base py-6 cursor-pointer"
              disabled={!isValid || loading}
              onClick={handleCheckout}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Redirecting to Stripe…
                </>
              ) : isValid ? (
                `Donate $${effectiveAmount!.toFixed(2)}`
              ) : (
                "Select an amount"
              )}
            </Button>

            {/* Fine print */}
            <p className="text-xs text-muted-foreground/60 text-center mt-6 leading-relaxed">
              One-time payment processed securely by Stripe.
              <br />
              No account required. No refunds.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
