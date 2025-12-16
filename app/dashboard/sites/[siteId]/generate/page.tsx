"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  Circle,
  Sparkles,
  X,
  Clock,
  Zap,
  TrendingUp,
  BarChart3,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Section {
  id: string;
  label: string;
  status: "pending" | "generating" | "complete";
  estimatedSeconds?: number;
}

interface GenerationStats {
  totalGenerations: number;
  successfulGenerations: number;
  averageTimeMs: number;
  fastestTimeMs: number | null;
  successRate: number;
}

const INITIAL_SECTIONS: Section[] = [
  { id: "header", label: "Header & Navigation", status: "pending", estimatedSeconds: 3 },
  { id: "hero", label: "Hero Section", status: "pending", estimatedSeconds: 5 },
  { id: "features", label: "Features & Content", status: "pending", estimatedSeconds: 8 },
  { id: "cta", label: "Call to Action", status: "pending", estimatedSeconds: 4 },
  { id: "footer", label: "Footer", status: "pending", estimatedSeconds: 3 },
];

// Average generation time based on typical generations (can be refined with real data)
const AVERAGE_GENERATION_TIME_MS = 25000; // 25 seconds average

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
  const [isCancelling, setIsCancelling] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [streamingHtml, setStreamingHtml] = useState<string>("");
  const [showLivePreview, setShowLivePreview] = useState(true);

  // AbortController for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateSectionStatus = useCallback((sectionId: string, status: Section["status"]) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, status } : s)));
  }, []);

  const markSectionsGenerating = useCallback((progress: number) => {
    // Progressively mark sections as generating/complete based on progress
    const thresholds = [
      { progress: 25, generating: ["header"], complete: [] },
      { progress: 40, generating: ["hero"], complete: ["header"] },
      { progress: 55, generating: ["features"], complete: ["header", "hero"] },
      { progress: 70, generating: ["cta"], complete: ["header", "hero", "features"] },
      { progress: 85, generating: ["footer"], complete: ["header", "hero", "features", "cta"] },
      { progress: 95, generating: [], complete: ["header", "hero", "features", "cta", "footer"] },
    ];

    const activeThreshold = thresholds.filter((t) => progress >= t.progress).pop();
    if (activeThreshold) {
      setSections((prev) =>
        prev.map((s) => ({
          ...s,
          status: activeThreshold.complete.includes(s.id)
            ? "complete"
            : activeThreshold.generating.includes(s.id)
              ? "generating"
              : s.status === "complete"
                ? "complete"
                : "pending",
        }))
      );
    }
  }, []);

  // Update estimated time remaining based on progress
  const updateEstimatedTime = useCallback((currentProgress: number) => {
    if (currentProgress <= 0 || currentProgress >= 100) {
      setEstimatedTimeRemaining(null);
      return;
    }

    const elapsed = Date.now() - startTimeRef.current;
    // Calculate estimated total time based on current progress rate
    const estimatedTotal = (elapsed / currentProgress) * 100;
    const remaining = Math.max(0, estimatedTotal - elapsed);

    // Smooth the estimate with average time
    const smoothedRemaining =
      (remaining + AVERAGE_GENERATION_TIME_MS * (1 - currentProgress / 100)) / 2;
    setEstimatedTimeRemaining(Math.round(smoothedRemaining / 1000));
  }, []);

  // Timer for elapsed time display
  useEffect(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Fetch generation stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/sites/${siteId}/stats`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.stats) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        // Stats are optional, don't show error
        console.log("Could not fetch generation stats");
      }
    };
    fetchStats();
  }, [siteId]);

  useEffect(() => {
    generateWebsite();
    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cancel generation handler
  const handleCancel = async () => {
    setIsCancelling(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    toast.info("Cancelling generation...");
    setTimeout(() => {
      router.push(`/dashboard/sites/${siteId}/chat`);
    }, 1000);
  };

  const generateWebsite = async () => {
    // Create AbortController for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/ai/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
        signal: abortControllerRef.current.signal,
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
            // Event type line - can be used for debugging
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
      // Handle abort (cancellation)
      if (err instanceof Error && err.name === "AbortError") {
        return; // Don't show error for intentional cancellation
      }

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
      updateEstimatedTime(newProgress);
    }

    // Handle HTML streaming for live preview
    if (data.partial) {
      setStreamingHtml(data.partial as string);
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

  // Create blob URL for streaming preview
  const previewBlobUrl = useMemo(() => {
    if (!streamingHtml || streamingHtml.length < 200) return null;

    // Wrap partial HTML with Tailwind CDN for proper rendering
    let previewContent = streamingHtml;

    // If it doesn't start with DOCTYPE, wrap it
    if (!previewContent.toLowerCase().startsWith("<!doctype")) {
      // Check if it has <html> tag
      if (!previewContent.toLowerCase().includes("<html")) {
        previewContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/feather-icons"></script>
  <style>
    body { font-family: 'Roboto', sans-serif; }
  </style>
</head>
<body>
${previewContent}
<script>if(typeof feather !== 'undefined') feather.replace();</script>
</body>
</html>`;
      } else {
        // Has <html> but no DOCTYPE
        previewContent = "<!DOCTYPE html>" + previewContent;
      }
    }

    // Ensure Tailwind CDN is present
    if (!previewContent.includes("cdn.tailwindcss.com")) {
      previewContent = previewContent.replace(
        "</head>",
        '<script src="https://cdn.tailwindcss.com"></script></head>'
      );
    }

    const blob = new Blob([previewContent], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [streamingHtml]);

  // Cleanup blob URL on unmount or when it changes
  const previousBlobUrl = useRef<string | null>(null);
  useEffect(() => {
    if (previousBlobUrl.current && previousBlobUrl.current !== previewBlobUrl) {
      URL.revokeObjectURL(previousBlobUrl.current);
    }
    previousBlobUrl.current = previewBlobUrl;

    return () => {
      if (previousBlobUrl.current) {
        URL.revokeObjectURL(previousBlobUrl.current);
      }
    };
  }, [previewBlobUrl]);

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
          {/* Previous Generation Stats */}
          {stats && stats.totalGenerations > 0 && (
            <div className="mb-8 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>
                  Based on {stats.totalGenerations} previous generation
                  {stats.totalGenerations !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-white">
                    {(stats.averageTimeMs / 1000).toFixed(1)}s
                  </div>
                  <div className="text-xs text-gray-500">Avg Time</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-400">{stats.successRate}%</div>
                  <div className="text-xs text-gray-500">Success Rate</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-indigo-400">
                    {stats.fastestTimeMs ? `${(stats.fastestTimeMs / 1000).toFixed(1)}s` : "-"}
                  </div>
                  <div className="text-xs text-gray-500">Fastest</div>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 text-indigo-300 text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              AI Generation in Progress
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Building Your Website</h1>
            <p className="text-gray-400 mb-4">{currentStage}</p>

            {/* Time Stats */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4" />
                <span>
                  Elapsed: {Math.floor(elapsedTime / 60)}:
                  {(elapsedTime % 60).toString().padStart(2, "0")}
                </span>
              </div>
              {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                <div className="flex items-center gap-2 text-indigo-300">
                  <Zap className="w-4 h-4" />
                  <span>~{estimatedTimeRemaining}s remaining</span>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview / Skeleton */}
          <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50 mb-8">
            {/* Mini browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700/50 bg-gray-800">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 ml-4">
                <div className="h-6 bg-gray-700 rounded-md w-48 mx-auto flex items-center justify-center text-xs text-gray-400">
                  {previewBlobUrl ? "Live Preview" : "Generating..."}
                </div>
              </div>
              {/* Toggle preview mode */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLivePreview(!showLivePreview)}
                className="text-gray-400 hover:text-gray-200 h-7 px-2"
              >
                {showLivePreview ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 mr-1" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 mr-1" /> Show
                  </>
                )}
              </Button>
            </div>

            {/* Live Preview iframe or Skeleton */}
            {showLivePreview && previewBlobUrl ? (
              <div className="relative" style={{ height: "400px" }}>
                <iframe
                  src={previewBlobUrl}
                  className="w-full h-full border-0 bg-white"
                  title="Live Generation Preview"
                  sandbox="allow-scripts"
                />
                {/* Progress overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/80 to-transparent p-4">
                  <div className="flex items-center justify-between text-xs text-white">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating live preview...
                    </span>
                    <span className="text-gray-400">
                      {Math.round(streamingHtml.length / 1024)}KB
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4">
                {/* Header skeleton */}
                <div
                  className={`h-12 rounded-lg mb-4 transition-all duration-500 ${
                    progress >= 40
                      ? "bg-green-500/20 section-complete"
                      : progress >= 25
                        ? "skeleton-pulse section-generating"
                        : "bg-gray-700/50"
                  }`}
                />

                {/* Hero skeleton */}
                <div
                  className={`h-48 rounded-lg mb-4 transition-all duration-500 ${
                    progress >= 55
                      ? "bg-green-500/20 section-complete"
                      : progress >= 40
                        ? "skeleton-pulse section-generating"
                        : "bg-gray-700/50"
                  }`}
                />

                {/* Content grid skeleton */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div
                    className={`h-32 rounded-lg transition-all duration-500 ${
                      progress >= 70
                        ? "bg-green-500/20 section-complete"
                        : progress >= 55
                          ? "skeleton-pulse section-generating"
                          : "bg-gray-700/50"
                    }`}
                  />
                  <div
                    className={`h-32 rounded-lg transition-all duration-500 ${
                      progress >= 70
                        ? "bg-green-500/20 section-complete"
                        : progress >= 58
                          ? "skeleton-pulse section-generating"
                          : "bg-gray-700/50"
                    }`}
                  />
                  <div
                    className={`h-32 rounded-lg transition-all duration-500 ${
                      progress >= 70
                        ? "bg-green-500/20 section-complete"
                        : progress >= 62
                          ? "skeleton-pulse section-generating"
                          : "bg-gray-700/50"
                    }`}
                  />
                </div>

                {/* CTA skeleton */}
                <div
                  className={`h-24 rounded-lg mb-4 transition-all duration-500 ${
                    progress >= 85
                      ? "bg-green-500/20 section-complete"
                      : progress >= 70
                        ? "skeleton-pulse section-generating"
                        : "bg-gray-700/50"
                  }`}
                />

                {/* Footer skeleton */}
                <div
                  className={`h-16 rounded-lg transition-all duration-500 ${
                    progress >= 95
                      ? "bg-green-500/20 section-complete"
                      : progress >= 85
                        ? "skeleton-pulse section-generating"
                        : "bg-gray-700/50"
                  }`}
                />
              </div>
            )}
          </div>

          {/* Section Progress */}
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Generation Progress</h3>
            <div className="space-y-3">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                    section.status === "generating" ? "bg-indigo-500/10" : ""
                  }`}
                >
                  {section.status === "complete" ? (
                    <div className="success-check">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                  ) : section.status === "generating" ? (
                    <div className="relative">
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                      <div className="absolute inset-0 w-5 h-5 rounded-full bg-indigo-400/20 animate-ping" />
                    </div>
                  ) : (
                    <Circle className="w-5 h-5 text-gray-600" />
                  )}
                  <div className="flex-1">
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        section.status === "complete"
                          ? "text-green-400"
                          : section.status === "generating"
                            ? "text-indigo-300"
                            : "text-gray-500"
                      }`}
                    >
                      {section.label}
                    </span>
                    {section.status === "generating" && section.estimatedSeconds && (
                      <span className="text-xs text-gray-500 ml-2">
                        ~{section.estimatedSeconds}s
                      </span>
                    )}
                  </div>
                  {section.status === "complete" && (
                    <span className="text-xs text-green-400/60">Done</span>
                  )}
                </div>
              ))}
            </div>

            {/* Progress percentage */}
            <div className="mt-6 pt-4 border-t border-gray-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Overall Progress</span>
                <span className="text-white font-medium">{progress}%</span>
              </div>
              <div className="mt-2 h-2.5 bg-gray-700 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 rounded-full progress-bar-glow"
                  style={{ width: `${progress}%` }}
                />
                {progress > 0 && progress < 100 && (
                  <div
                    className="absolute top-0 h-full w-4 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"
                    style={{ left: `${Math.max(0, progress - 4)}%` }}
                  />
                )}
              </div>
            </div>

            {/* Cancel Button */}
            <div className="mt-6 pt-4 border-t border-gray-700/50 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isCancelling}
                className="text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel Generation
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                You can refine your requirements and generate again
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
