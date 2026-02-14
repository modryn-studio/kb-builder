"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1720338099381-a942574719a2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwyfHxib29rcyUyMGF0bW9zcGhlcmV8ZW58MHx8fHwxNzcxMDI2Njk5fDA&ixlib=rb-4.1.0&q=85&w=1920";

const TYPEWRITER_EXAMPLES = [
  "Notion",
  "Figma",
  "YouTube",
  "VS Code",
  "Reddit",
  "Slack",
  "Blender",
  "GitHub",
];

interface HeroSectionProps {
  onGenerate: (toolName: string) => void;
}

export function HeroSection({ onGenerate }: HeroSectionProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [typewriterText, setTypewriterText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Typewriter animation — cycles through examples in the search bar
  useEffect(() => {
    if (focused || query) {
      setTypewriterText("");
      if (animationRef.current) clearTimeout(animationRef.current);
      return;
    }

    let wordIndex = 0;
    let charIndex = 0;
    let phase: "typing" | "pausing" | "deleting" = "typing";
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const word = TYPEWRITER_EXAMPLES[wordIndex];

      if (phase === "typing") {
        charIndex++;
        setTypewriterText(word.slice(0, charIndex));
        if (charIndex >= word.length) {
          phase = "pausing";
          animationRef.current = setTimeout(tick, 3000);
        } else {
          animationRef.current = setTimeout(tick, 55 + Math.random() * 35);
        }
      } else if (phase === "pausing") {
        phase = "deleting";
        animationRef.current = setTimeout(tick, 40);
      } else if (phase === "deleting") {
        charIndex--;
        setTypewriterText(word.slice(0, charIndex));
        if (charIndex <= 0) {
          phase = "typing";
          wordIndex = (wordIndex + 1) % TYPEWRITER_EXAMPLES.length;
          animationRef.current = setTimeout(tick, 500);
        } else {
          animationRef.current = setTimeout(tick, 35);
        }
      }
    }

    animationRef.current = setTimeout(tick, 800);
    return () => {
      cancelled = true;
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [focused, query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onGenerate(query.trim());
    }
  };

  return (
    <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden">
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
          The best instruction manual for{" "}
          <span className="gradient-gold-text">any tool or website</span>{" "}
          on the internet.
        </motion.h1>

        {/* Search input */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.2,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="relative max-w-xl mx-auto mt-12 mb-4"
        >
          <div
            className={`relative flex items-center rounded-xl border bg-card/80 backdrop-blur-sm transition-all duration-300 ${
              focused
                ? "border-primary/40 vault-glow-sm"
                : "border-border/60"
            }`}
          >
            <Search className="absolute left-4 w-5 h-5 text-muted-foreground" />

            {/* Typewriter overlay */}
            {!query && !focused && typewriterText && (
              <span className="absolute left-12 top-1/2 -translate-y-1/2 text-base font-body text-foreground/70 pointer-events-none select-none">
                {typewriterText}
                <span className="animate-pulse ml-px text-primary/60">|</span>
              </span>
            )}

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={focused ? "Type any tool or website..." : ""}
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

        {/* Free forever badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground border-border/40">
            Free forever · No signup required
          </Badge>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
