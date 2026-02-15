"use client";

import { Navbar } from "@/components/Navbar";
import { ProblemSection } from "@/components/ProblemSection";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Spacer for fixed navbar */}
      <div className="pt-24" />

      <ProblemSection />
      <HowItWorks />
      <Footer />
    </div>
  );
}
