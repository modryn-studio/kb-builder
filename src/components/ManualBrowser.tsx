"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Layers, Globe, ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MANUALS, type MockManual } from "@/data/manuals";

function ManualCard({ manual, index }: { manual: MockManual; index: number }) {
  const router = useRouter();

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      onClick={() => router.push(`/manual/${manual.id}`)}
      className="group flex flex-col text-left w-full rounded-xl border border-border/50 bg-card/60 hover:bg-card hover:border-primary/20 p-5 transition-all duration-300 hover:shadow-vault"
    >
      {/* Header */}
      <div className="flex items-start gap-3.5 mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-heading font-semibold shrink-0"
          style={{
            backgroundColor: `${manual.color.replace(")", " / 0.12)")}`,
            color: manual.color,
          }}
        >
          {manual.initial}
        </div>
        <div className="min-w-0">
          <h3 className="font-heading text-lg font-semibold text-card-foreground group-hover:text-foreground transition-colors duration-200 leading-snug">
            {manual.name}
          </h3>
          <p className="text-xs text-muted-foreground font-body mt-0.5">
            {manual.tagline}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4 line-clamp-2">
        {manual.description}
      </p>

      {/* Topics */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {manual.topics.slice(0, 3).map((topic) => (
          <Badge
            key={topic}
            variant="vault-muted"
            className="text-[10px] font-mono"
          >
            {topic}
          </Badge>
        ))}
        {manual.topics.length > 3 && (
          <Badge variant="vault-muted" className="text-[10px] font-mono">
            +{manual.topics.length - 3}
          </Badge>
        )}
      </div>

      {/* Footer with mt-auto for alignment */}
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/30">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {manual.sections}
          </span>
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {manual.sources}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {manual.readTime}
          </span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
      </div>
    </motion.button>
  );
}

export function ManualBrowser() {
  return (
    <section id="manuals" className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-foreground">
              Knowledge Base
            </h2>
            <Badge variant="vault" className="text-[10px] font-mono">
              {MANUALS.length} manuals
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-body max-w-lg">
            Browse existing manuals or generate a new one for any tool. Each
            manual is synthesized from official docs, tutorials, Reddit, and
            community resources.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MANUALS.map((manual, i) => (
            <ManualCard key={manual.id} manual={manual} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
