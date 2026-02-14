"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ManualBrowser } from "@/components/ManualBrowser";
import { ProblemSection } from "@/components/ProblemSection";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";
import { GenerationModal } from "@/components/GenerationModal";
import { getOrCreateSessionId } from "@/lib/session";

export default function Home() {
  const router = useRouter();
  const [generationOpen, setGenerationOpen] = useState(false);
  const [generationTool, setGenerationTool] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleGenerate = async (toolName: string) => {
    setIsGenerating(true);
    setErrorMessage("");
    setGenerationTool(toolName);

    try {
      const sessionId = getOrCreateSessionId();
      
      const response = await fetch("/api/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: toolName.trim(),
          sessionId,
          forceRefresh: false,
        }),
      });

      const data = await response.json();

      // Handle error responses
      if (!response.ok) {
        if (response.status === 422) {
          // Validation error
          setErrorMessage(data.error || `"${toolName}" doesn't appear to be a recognized tool or website.`);
          setGenerationOpen(true);
          setIsGenerating(false);
          return;
        } else if (response.status === 429) {
          // Rate limit
          setErrorMessage("Rate limit exceeded. Please wait a moment before generating another manual.");
          setGenerationOpen(true);
          setIsGenerating(false);
          return;
        } else {
          // Generic error
          setErrorMessage(data.error || "Something went wrong. Please try again.");
          setGenerationOpen(true);
          setIsGenerating(false);
          return;
        }
      }

      // Cache hit - instant redirect to manual
      if (data.cached) {
        router.push(data.shareableUrl);
        return;
      }

      // New job created - redirect to pending page
      if (data.id && data.status === "queued") {
        router.push("/pending");
        return;
      }

      // Unexpected response
      setErrorMessage("Unexpected response from server. Please try again.");
      setGenerationOpen(true);
      setIsGenerating(false);
    } catch (error) {
      console.error("Generation error:", error);
      setErrorMessage("Network error. Please check your connection and try again.");
      setGenerationOpen(true);
      setIsGenerating(false);
    }
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
        isGenerating={isGenerating}
        errorMessage={errorMessage}
      />
    </div>
  );
}
