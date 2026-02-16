"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SupportSuccessPage() {
  const [amount, setAmount] = useState<string | null>(null);

  // Try to read amount from the Stripe session (best-effort, not required)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    // Optionally fetch session details — for now just show generic thanks
    // Could add GET /api/stripe/session?id=... later if you want to show amount
    void sessionId;
  }, []);

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
      <main className="flex items-center justify-center px-6 py-32">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>

          <h1 className="font-heading text-4xl font-bold text-foreground mb-4">
            Thank you!
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Your donation helps keep KB Builder free for everyone.
            We genuinely appreciate your support.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="vault" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
            <Button variant="vault-outline" asChild>
              <Link href="/manuals">Browse Manuals</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
