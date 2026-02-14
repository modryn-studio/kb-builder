"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolName: string;
  isGenerating?: boolean;
  errorMessage?: string;
}

export function GenerationModal({
  open,
  onOpenChange,
  toolName,
  isGenerating = false,
  errorMessage = "",
}: GenerationModalProps) {
  const handleRetry = () => {
    onOpenChange(false);
  };

  // Loading state - validating tool
  if (isGenerating && !errorMessage) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-foreground">
              Starting Generation
            </DialogTitle>
            <DialogDescription className="font-body text-sm text-muted-foreground">
              Validating {toolName}...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state
  if (errorMessage) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Unable to Generate Manual
            </DialogTitle>
            <DialogDescription className="font-body text-sm text-muted-foreground">
              {toolName && `For: ${toolName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
              <p className="text-sm font-body text-foreground">{errorMessage}</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="vault-outline"
                className="flex-1"
                onClick={handleRetry}
              >
                Try Another Tool
              </Button>
              <Button
                variant="vault"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Make sure you're entering a real tool or website name.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Default/closed state
  return null;
}
