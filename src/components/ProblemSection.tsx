"use client";

import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Search, FileText } from "lucide-react";

export function ProblemSection() {
  return (
    <section className="py-24 lg:py-32 border-t border-border/30">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left — The Stat */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-8">
              <span className="font-heading text-7xl sm:text-8xl lg:text-9xl font-bold gradient-gold-text leading-none">
                80%
              </span>
              <p className="text-lg sm:text-xl font-heading text-foreground mt-4 leading-snug">
                of tool capabilities go undiscovered.
              </p>
            </div>

            {/* Problem illustration */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card/60 border border-border/40">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body text-muted-foreground truncate">
                    &ldquo;how to set up Supabase auth&rdquo;
                  </p>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  AI: deprecated method
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card/60 border border-border/40">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body text-muted-foreground truncate">
                    &ldquo;Vercel deployment config&rdquo;
                  </p>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  Outdated 2024 guide
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card/60 border border-border/40">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body text-muted-foreground truncate">
                    &ldquo;Stripe checkout integration&rdquo;
                  </p>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  Legacy API response
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right — The Solution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono text-primary tracking-wide uppercase">
                The problem
              </span>
            </div>

            <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-foreground mb-6 leading-snug">
              ChatGPT is months behind. Google shows you 2023.
            </h2>

            <div className="space-y-4 mb-8">
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                You ask an AI assistant how to set up Stripe, configure Vercel,
                or use Supabase&apos;s latest features. It gives you confident
                instructions — for a version that no longer exists. Deprecated
                APIs, replaced dashboards, legacy workflows. The training data
                is months behind, and you won&apos;t know until you&apos;re stuck.
              </p>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                KB Builder does live web research — official docs, GitHub
                releases, Reddit threads, changelogs from today — and
                synthesizes everything into one structured, current manual.
                Not last year. Not last month. Today.
              </p>
            </div>

            {/* Solution preview */}
            <div className="rounded-xl border border-primary/20 bg-accent/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-heading font-semibold text-foreground">
                  One complete manual
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Every feature documented",
                  "Hidden shortcuts revealed",
                  "Current as of today",
                  "Community wisdom included",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-xs font-body text-secondary-foreground">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
