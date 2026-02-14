"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isManualPage = pathname.startsWith("/manual");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            {isManualPage && (
              <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
            )}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <span className="font-heading text-xl font-semibold text-foreground tracking-tight">
                KB Builder
              </span>
            </div>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {!isManualPage && (
              <a
                href="#manuals"
                className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors duration-200 hidden sm:block cursor-pointer"
              >
                Browse Manuals
              </a>
            )}
            {!isManualPage && (
              <a href="#how-it-works">
                <Button variant="vault-outline" size="sm">
                  How It Works
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
