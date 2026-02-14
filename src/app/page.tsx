"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ManualBrowser } from "@/components/ManualBrowser";
import { ProblemSection } from "@/components/ProblemSection";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";
import { GenerationModal } from "@/components/GenerationModal";

export default function Home() {
  const [generationOpen, setGenerationOpen] = useState(false);
  const [generationTool, setGenerationTool] = useState("");

  const handleGenerate = (toolName: string) => {
    setGenerationTool(toolName);
    setGenerationOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection onGenerate={handleGenerate} />
      <ManualBrowser />
      <ProblemSection />
      <HowItWorks />
      <Footer />
      <GenerationModal
        open={generationOpen}
        onOpenChange={setGenerationOpen}
        toolName={generationTool}
      />
    </div>
  );
}
