"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ArrowLeft, LinkIcon, Download, History, MessageSquare, Check, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ManualActions {
  onCopyLink: () => void;
  onExport: () => void;
  onVersions: () => void;
  onFeedback: () => void;
  copied: boolean;
  loadingVersions: boolean;
}

interface NavbarProps {
  manualActions?: ManualActions;
}

export function Navbar({ manualActions }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isSpecificManualPage = pathname.startsWith("/manual/"); // Only specific manuals, not /manuals

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

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
          {/* Left side: Back button (specific manual pages only) + Logo */}
          <div className="flex items-center gap-3">
            {isSpecificManualPage && (
              <Link
                href="/manuals"
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Library</span>
              </Link>
            )}
            
            {/* Logo - always goes home */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <span className="font-heading text-xl font-semibold text-foreground tracking-tight">
                KB Builder
              </span>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {manualActions ? (
              // Manual page actions
              <>
                <button
                  onClick={manualActions.onCopyLink}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy link to this manual"
                >
                  {manualActions.copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-success" />
                      <span className="hidden md:inline">Copied</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Copy Link</span>
                    </>
                  )}
                </button>
                <button
                  onClick={manualActions.onExport}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  title="Export as Markdown"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Export</span>
                </button>
                <button
                  onClick={manualActions.onVersions}
                  disabled={manualActions.loadingVersions}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                  title="View version history"
                >
                  <History className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{manualActions.loadingVersions ? "Loading..." : "Versions"}</span>
                </button>
                <Button 
                  variant="vault-outline" 
                  size="sm" 
                  onClick={manualActions.onFeedback}
                >
                  <MessageSquare className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Feedback</span>
                </Button>
                
              </>
            ) : (
              // Homepage/library navigation
              <>
                <a
                  href="/manuals"
                  className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors duration-200 hidden sm:block cursor-pointer"
                >
                  Browse Manuals
                </a>
                {/* Menu Dropdown */}
                <div className="relative" ref={menuRef}>
                  <Button 
                    variant="vault-outline" 
                    size="sm" 
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="cursor-pointer"
                  >
                    {menuOpen ? <X className="h-4 w-4 sm:mr-1.5" /> : <Menu className="h-4 w-4 sm:mr-1.5" />}
                    <span className="hidden sm:inline">Menu</span>
                  </Button>
                  
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-vault overflow-hidden z-50">
                      <div className="py-2">
                        <Link
                          href="/manuals"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                        >
                          <div className="font-medium">Browse Manuals</div>
                          <div className="text-xs text-muted-foreground">Explore instruction manuals</div>
                        </Link>
                        <div className="my-1 border-t border-border" />
                        <Link
                          href="/about"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                        >
                          <div className="font-medium">About</div>
                          <div className="text-xs text-muted-foreground">Learn about KB Builder</div>
                        </Link>
                        <Link
                          href="/pending"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                        >
                          <div className="font-medium">Pending Jobs</div>
                          <div className="text-xs text-muted-foreground">View generation queue</div>
                        </Link>
                        <div className="my-1 border-t border-border" />
                        <Link
                          href="/support"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                        >
                          <div className="font-medium">Support</div>
                          <div className="text-xs text-muted-foreground">Help keep KB Builder free</div>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
