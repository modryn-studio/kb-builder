"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  FileText,
  BookOpen,
  MessageSquare,
  Layers,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MANUALS } from "@/data/manuals";

const STEPS = [
  { label: "Scanning official documentation", icon: FileText },
  { label: "Reading community tutorials", icon: BookOpen },
  { label: "Analyzing Reddit & forum threads", icon: MessageSquare },
  { label: "Structuring knowledge base", icon: Layers },
];

interface GenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolName: string;
}

export function GenerationModal({
  open,
  onOpenChange,
  toolName,
}: GenerationModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [matchedManual, setMatchedManual] = useState<
    (typeof MANUALS)[number] | null
  >(null);

  const reset = useCallback(() => {
    setCurrentStep(-1);
    setProgress(0);
    setCompleted(false);
    setMatchedManual(null);
  }, []);

  useEffect(() => {
    if (!open || !toolName) {
      reset();
      return;
    }

    // Find matching manual
    const match =
      MANUALS.find(
        (m) => m.name.toLowerCase() === toolName.toLowerCase()
      ) || MANUALS[0];
    setMatchedManual(match);

    // Animate through steps
    const stepDuration = 1500;
    const totalDuration = stepDuration * STEPS.length;
    let startTime = Date.now();
    let animFrame: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(pct);

      const step = Math.min(
        Math.floor(elapsed / stepDuration),
        STEPS.length - 1
      );
      setCurrentStep(step);

      if (elapsed >= totalDuration) {
        setCompleted(true);
        return;
      }

      animFrame = requestAnimationFrame(animate);
    };

    // Small delay before starting
    const timeout = setTimeout(() => {
      setCurrentStep(0);
      startTime = Date.now();
      animFrame = requestAnimationFrame(animate);
    }, 400);

    return () => {
      clearTimeout(timeout);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [open, toolName, reset]);

  const handleOpenManual = () => {
    if (matchedManual) {
      onOpenChange(false);
      router.push(`/manual/${matchedManual.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground">
            {completed ? "Manual Ready" : "Generating Manual"}
          </DialogTitle>
          <DialogDescription className="font-body text-sm text-muted-foreground">
            {completed
              ? `Your manual for ${toolName} is ready to read.`
              : `Researching ${toolName} across the web...`}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Progress bar */}
          <Progress value={progress} className="h-1" />

          {/* Steps */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {STEPS.map(
                (step, i) =>
                  currentStep >= i && (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-3 py-2"
                    >
                      {currentStep > i || completed ? (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-muted-foreground shrink-0 animate-spin" />
                      )}
                      <step.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span
                        className={`text-sm font-body ${
                          currentStep > i || completed
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                    </motion.div>
                  )
              )}
            </AnimatePresence>
          </div>

          {/* Completion state */}
          {completed && matchedManual && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="pt-4 border-t border-border/30"
            >
              <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground mb-4">
                <span>{matchedManual.sections} sections</span>
                <span>{matchedManual.sources} sources synthesized</span>
              </div>
              <Button
                variant="vault"
                className="w-full"
                onClick={handleOpenManual}
              >
                Open Manual
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
