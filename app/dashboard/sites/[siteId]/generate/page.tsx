"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Circle, Sparkles } from "lucide-react";

interface Section {
  id: string;
  label: string;
  status: "pending" | "generating" | "complete";
}

const INITIAL_SECTIONS: Section[] = [
  { id: "header", label: "Header & Navigation", status: "pending" },
  { id: "hero", label: "Hero Section", status: "pending" },
  { id: "features", label: "Features & Content", status: "pending" },
  { id: "cta", label: "Call to Action", status: "pending" },
  { id: "footer", label: "Footer", status: "pending" },
];

export default function GeneratePage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;

  const [sections, setSections] = useState<Section[]>(INITIAL_SECTIONS);
  const [currentStage, setCurrentStage] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [generationTime, setGenerationTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const updateSectionStatus = useCallback((sectionId: string, status: Section["status"]) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, status } : s)));
  }, []);

  const markSectionsGenerating = useCallback((progress: number) => {
    // Progressively mark sections as generating based on progress
    const thresholds = [
      { progress: 25, sections: ["header"] },
      { progress: 40, sections: ["header", "hero"] },
      { progress: 55, sections: ["header", "hero", "features"] },
      { progress: 70, sections: ["header", "hero", "features", "cta"] },
      { progress: 85, sections: ["header", "hero", "features", "cta", "footer"] },
    ];

    const activeThreshold = thresholds.filter((t) => progress >= t.progress).pop();
    if (activeThreshold) {
      setSections((prev) =>
        prev.map((s) => ({
          ...s,
          status: activeThreshold.sections.includes(s.id) ? "generating" : s.status,
        }))
      );
    }
  }, []);

  useEffect(() => {
    generateWebsite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateWebsite = async () => {
    try {
      const response = await fetch("/api/ai/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Generation failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to get stream reader");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7);
            continue;
          }

          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              handleStreamEvent(data);
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate website";
      setError(message);
      toast.error(message);
      console.error("Generation error:", err);

      // Redirect back after delay
      setTimeout(() => {
        router.push(`/dashboard/sites/${siteId}/chat`);
      }, 3000);
    }
  };

  const handleStreamEvent = (data: Record<string, unknown>) => {
    // Handle different event types
    if (data.message) {
      setCurrentStage(data.message as string);
    }

    if (data.progress !== undefined) {
      const newProgress = data.progress as number;
      setProgress(newProgress);
      markSectionsGenerating(newProgress);
    }

    if (data.stage === "complete" || data.success === true) {
      // Mark all sections as complete
      setSections((prev) => prev.map((s) => ({ ...s, status: "complete" })));
      setProgress(100);
      setCurrentStage("Complete!");

      if (data.generationTime) {
        setGenerationTime(data.generationTime as number);
      }

      // Show success for 2 seconds then redirect
      setTimeout(() => {
        setIsComplete(true);
        router.push(`/dashboard/sites/${siteId}/preview`);
      }, 2000);
    }

    if (data.error || data.message?.toString().toLowerCase().includes("error")) {
      setError((data.message as string) || "Generation failed");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-400 text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Generation Failed</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <p className="text-gray-500 text-sm">Redirecting back...</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center section-reveal">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 section-reveal">Website Generated!</h2>
          <p className="text-gray-400 mb-4">Generated in {(generationTime / 1000).toFixed(1)}s</p>
          <p className="text-gray-500 text-sm">Redirecting to preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex flex-col">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-800 z-50">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 text-indigo-300 text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              AI Generation in Progress
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Building Your Website</h1>
            <p className="text-gray-400">{currentStage}</p>
          </div>

          {/* Skeleton Preview */}
          <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50 mb-8">
            {/* Mini browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700/50 bg-gray-800">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 ml-4">
                <div className="h-6 bg-gray-700 rounded-md w-48 mx-auto" />
              </div>
            </div>

            {/* Skeleton sections */}
            <div className="p-4">
              {/* Header skeleton */}
              <div
                className={`h-12 rounded-lg mb-4 ${progress > 20 ? "skeleton-pulse" : "bg-gray-700/50"}`}
              />

              {/* Hero skeleton */}
              <div
                className={`h-48 rounded-lg mb-4 ${progress > 35 ? "skeleton-pulse" : "bg-gray-700/50"}`}
              />

              {/* Content grid skeleton */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div
                  className={`h-32 rounded-lg ${progress > 50 ? "skeleton-pulse" : "bg-gray-700/50"}`}
                />
                <div
                  className={`h-32 rounded-lg ${progress > 55 ? "skeleton-pulse" : "bg-gray-700/50"}`}
                />
                <div
                  className={`h-32 rounded-lg ${progress > 60 ? "skeleton-pulse" : "bg-gray-700/50"}`}
                />
              </div>

              {/* CTA skeleton */}
              <div
                className={`h-24 rounded-lg mb-4 ${progress > 70 ? "skeleton-pulse" : "bg-gray-700/50"}`}
              />

              {/* Footer skeleton */}
              <div
                className={`h-16 rounded-lg ${progress > 85 ? "skeleton-pulse" : "bg-gray-700/50"}`}
              />
            </div>
          </div>

          {/* Section Progress */}
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Generation Progress</h3>
            <div className="space-y-3">
              {sections.map((section) => (
                <div key={section.id} className="flex items-center gap-3">
                  {section.status === "complete" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : section.status === "generating" ? (
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-600" />
                  )}
                  <span
                    className={`text-sm ${
                      section.status === "complete"
                        ? "text-green-400"
                        : section.status === "generating"
                          ? "text-indigo-300"
                          : "text-gray-500"
                    }`}
                  >
                    {section.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress percentage */}
            <div className="mt-6 pt-4 border-t border-gray-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Overall Progress</span>
                <span className="text-white font-medium">{progress}%</span>
              </div>
              <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
