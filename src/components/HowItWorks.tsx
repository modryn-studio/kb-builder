"use client";

import { motion } from "framer-motion";
import { Type, Globe, BookOpen } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Type,
    title: "Name your tool",
    description:
      "Enter any software tool — from mainstream apps to niche developer utilities. No account needed.",
  },
  {
    number: "02",
    icon: Globe,
    title: "AI researches today's internet",
    description:
      "Live web research — not months-old training data. Official docs, GitHub releases, Reddit threads, and today's changelogs. Current as of right now.",
  },
  {
    number: "03",
    icon: BookOpen,
    title: "Manual delivered",
    description:
      "A structured, comprehensive manual with chapters, sections, shortcuts, and hidden features. Ready in under 2 minutes.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 border-t border-border/30">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 lg:mb-20"
        >
          <span className="text-xs font-mono text-primary tracking-wide uppercase mb-3 block">
            How it works
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-foreground">
            Three steps. Two minutes.
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative flex flex-col"
            >
              {/* Connecting line (desktop only) */}
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(50%+32px)] right-[calc(-50%+32px)] h-px bg-border/40" />
              )}

              <div className="text-center">
                {/* Number */}
                <span className="inline-block font-mono text-[11px] text-primary tracking-widest mb-4">
                  {step.number}
                </span>

                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-secondary border border-border/50 flex items-center justify-center mx-auto mb-5">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>

                {/* Title */}
                <h3 className="font-heading text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
