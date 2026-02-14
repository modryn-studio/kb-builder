"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Search, ArrowRight, Sparkles, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1720338099381-a942574719a2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwyfHxib29rcyUyMGF0bW9zcGhlcmV8ZW58MHx8fHwxNzcxMDI2Njk5fDA&ixlib=rb-4.1.0&q=85&w=1920";

const SUGGESTIONS = [
  "Figma",
  "VS Code",
  "Notion",
  "Slack",
  "Obsidian",
  "Cursor",
  "Linear",
  "Arc Browser",
];

interface HeroSectionProps {
  onGenerate: (toolName: string) => void;
}

export function HeroSection({ onGenerate }: HeroSectionProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onGenerate(query.trim());
    }
  };

  const handleSuggestionClick = (name: string) => {
    setQuery(name);
    onGenerate(name);
  };

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
      {/* Background image with heavy overlay */}
      <div className="absolute inset-0">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          className="object-cover opacity-[0.07]"
          priority
          unoptimized
        />
        {/* Radial gradient for focused light effect */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 45%, hsl(38 58% 50% / 0.04), transparent 70%)",
          }}
        />
        <div className="absolute inset-0 bg-background/70" />
      </div>

      {/* Subtle dot pattern */}
      <div className="absolute inset-0 bg-dot-pattern opacity-[0.03]" />

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Badge variant="vault" className="mb-8 text-xs tracking-wide font-mono">
            Free forever
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.1,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground leading-tight tracking-tight mb-6"
        >
          Master any software tool.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.2,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed font-body"
        >
          AI-generated instruction manual. Every feature documented, every
          shortcut revealed, every hidden capability uncovered.
        </motion.p>

        {/* Search input */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.35,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="relative max-w-xl mx-auto mb-6"
        >
          <div
            className={`relative flex items-center rounded-xl border bg-card/80 backdrop-blur-sm transition-all duration-300 ${
              focused
                ? "border-primary/40 vault-glow-sm"
                : "border-border/60 hover:border-border"
            }`}
          >
            <Search className="absolute left-4 w-5 h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Enter any software tool..."
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground font-body text-base pl-12 pr-4 py-4 focus:outline-none"
            />
            <div className="pr-2">
              <Button
                type="submit"
                variant="vault"
                size="default"
                disabled={!query.trim()}
                className="rounded-lg"
              >
                Generate
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.form>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-2 mb-12"
        >
          <span className="text-xs text-muted-foreground font-mono mr-1 self-center">
            Try:
          </span>
          {SUGGESTIONS.slice(0, 5).map((name) => (
            <button
              key={name}
              onClick={() => handleSuggestionClick(name)}
              className="text-xs font-body text-muted-foreground hover:text-primary border border-border/40 hover:border-primary/30 rounded-md px-2.5 py-1 transition-colors duration-200 bg-transparent"
            >
              {name}
            </button>
          ))}
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex items-center justify-center gap-6 text-xs text-muted-foreground font-mono"
        >
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary/70" />
            2-min generation
          </span>
          <span className="hidden sm:flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary/70" />
            Live web research
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary/70" />
            No signup required
          </span>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
