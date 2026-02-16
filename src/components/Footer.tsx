import Link from "next/link";
import { BookOpen, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/30 py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-heading text-base font-semibold text-foreground">
              KB Builder
            </span>
          </div>

          <p className="text-xs text-muted-foreground font-body">
            Built for serious learners. Free forever.
          </p>

          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-body hover:text-primary transition-colors duration-200"
          >
            <Heart className="w-3 h-3" />
            Support this project
          </Link>
        </div>
      </div>
    </footer>
  );
}
