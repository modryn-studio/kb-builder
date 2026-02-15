"use client";

import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error("Job page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="mx-auto max-w-xl px-6 pt-32 pb-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Something went wrong
        </h1>
        
        <p className="mt-3 text-sm text-muted-foreground">
          An unexpected error occurred while loading this job. Please try again.
        </p>
        
        {error.message && (
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            {error.message}
          </p>
        )}
        
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="vault" onClick={reset}>
            Try again
          </Button>
          <Button variant="vault-outline" onClick={() => window.location.href = "/"}>
            Go home
          </Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
