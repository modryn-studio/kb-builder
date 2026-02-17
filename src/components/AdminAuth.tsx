"use client";

import { useState, ReactNode } from "react";
import { Lock, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/contexts/AdminContext";

interface AdminAuthProps {
  children: ReactNode;
}

export function AdminAuth({ children }: AdminAuthProps) {
  const { isAuthenticated, isChecking, authenticate, logout } = useAdmin();
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey.trim()) {
      setIsValidating(true);
      setError("");
      const success = await authenticate(adminKey.trim());
      setIsValidating(false);
      if (!success) {
        setError("Invalid admin key");
      }
    }
  };

  const handleLogout = () => {
    logout();
    setAdminKey("");
    setError("");
  };

  // Checking state
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-border bg-card p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="rounded-full bg-primary/10 p-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>

            <h1 className="font-heading text-2xl font-bold text-center text-foreground mb-2">
              Admin Access Required
            </h1>
            <p className="text-center text-sm text-muted-foreground mb-6">
              Enter your admin secret to continue
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="adminKey" className="block text-sm font-medium text-foreground mb-2">
                  Admin Secret
                </label>
                <input
                  id="adminKey"
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter ADMIN_SECRET"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="vault"
                className="w-full"
                disabled={!adminKey.trim() || isValidating}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Authenticate"
                )}
              </Button>
            </form>

            <div className="mt-6 p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> This is the value of{" "}
                <code className="px-1 py-0.5 rounded bg-background">ADMIN_SECRET</code>{" "}
                from your environment variables.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - render children with logout option
  return (
    <>
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          variant="vault-outline"
          size="sm"
          onClick={handleLogout}
          className="gap-2 shadow-lg"
          title="Logout from admin dashboard"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
      {children}
    </>
  );
}
