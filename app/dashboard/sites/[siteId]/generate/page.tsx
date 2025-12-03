"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GenerationLoading } from "@/components/features/generation/generation-loading";
import { GenerationSuccess } from "@/components/features/generation/generation-success";
import { toast } from "sonner";

const GENERATION_STAGES = [
  "Analyzing your requirements...",
  "Designing the layout...",
  "Creating content sections...",
  "Adding visual elements...",
  "Optimizing for mobile...",
  "Finalizing your website...",
];

export default function GeneratePage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;

  const [stage, setStage] = useState(GENERATION_STAGES[0]);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [generationTime, setGenerationTime] = useState(0);

  useEffect(() => {
    generateWebsite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateWebsite = async () => {
    const startTime = Date.now();

    try {
      // Simulate progress through stages
      const stageInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(stageInterval);
            return 90;
          }
          return prev + 15;
        });

        setStage((prev) => {
          const currentIndex = GENERATION_STAGES.indexOf(prev);
          if (currentIndex < GENERATION_STAGES.length - 1) {
            return GENERATION_STAGES[currentIndex + 1];
          }
          return prev;
        });
      }, 5000);

      // Actually generate the website
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });

      clearInterval(stageInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Generation failed");
      }

      await response.json();
      const endTime = Date.now();

      setProgress(100);
      setStage("Complete!");
      setGenerationTime(endTime - startTime);

      // Show success for 2 seconds
      setTimeout(() => {
        setIsComplete(true);
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate website");
      console.error("Generation error:", error);

      // Redirect back to chat
      setTimeout(() => {
        router.push(`/dashboard/sites/${siteId}/chat`);
      }, 2000);
    }
  };

  if (isComplete) {
    return <GenerationSuccess siteId={siteId} generationTime={generationTime} />;
  }

  return <GenerationLoading stage={stage} progress={progress} />;
}
