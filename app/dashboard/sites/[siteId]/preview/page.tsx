"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PreviewFrame } from "@/components/features/preview/preview-frame";
import { CodePreview } from "@/components/features/preview/code-preview";
import { DeviceToggle } from "@/components/features/preview/device-toggle";
import { RefinementSidebar } from "@/components/features/refinement/refinement-sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

type DeviceType = "desktop" | "tablet" | "mobile";
type ViewMode = "preview" | "code";

export default function PreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const siteId = params.siteId as string;
  const versionId = searchParams.get("version");

  const [htmlContent, setHtmlContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);

  useEffect(() => {
    loadWebsite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, versionId]);

  const loadWebsite = async (forceCurrentVersion = false) => {
    setIsLoading(true);
    try {
      // If forceCurrentVersion is true, always load the current version (ignore versionId param)
      const url =
        !forceCurrentVersion && versionId
          ? `/api/sites/${siteId}/preview?version=${versionId}`
          : `/api/sites/${siteId}/preview`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load website");

      const data = await response.json();
      setHtmlContent(data.htmlContent || "<p>No content generated yet</p>");

      // Fetch current version ID
      const siteResponse = await fetch(`/api/sites/${siteId}`);
      if (siteResponse.ok) {
        const siteData = await siteResponse.json();
        setCurrentVersionId(siteData.current_version_id || null);
      }
    } catch {
      toast.error("Failed to load website");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChanges = async (newVersionId: string) => {
    try {
      // Set as current version
      const response = await fetch(`/api/sites/${siteId}/versions/${newVersionId}/set-current`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to set current version");

      // Reload preview with the NEW current version (force reload, ignore URL param)
      await loadWebsite(true);

      // Show success (don't close sidebar)
      toast.success("Changes applied! Preview updated.");
    } catch (error) {
      toast.error("Failed to apply changes");
      console.error("Apply changes error:", error);
    }
  };

  const deviceSizes = {
    desktop: "w-full",
    tablet: "w-[768px]",
    mobile: "w-[375px]",
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/dashboard/sites/${siteId}`}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Website Preview</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-200 bg-white p-1">
              <Button
                variant={viewMode === "preview" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("preview")}
              >
                Preview
              </Button>
              <Button
                variant={viewMode === "code" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("code")}
              >
                Code
              </Button>
            </div>

            {/* Device Toggle (only in preview mode) */}
            {viewMode === "preview" && (
              <DeviceToggle currentDevice={device} onDeviceChange={setDevice} />
            )}

            {/* Refine Button */}
            <Button
              variant="outline"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isSidebarOpen ? "Hide Chat" : "Refine"}
            </Button>

            {/* Publish Button */}
            <Button asChild>
              <Link href={`/dashboard/sites/${siteId}/publish`}>Publish</Link>
            </Button>
          </div>
        </div>

        {/* Split-screen Layout */}
        <div className="flex h-[calc(100vh-12rem)] gap-4">
          {/* Refinement Sidebar - Left side (smaller) */}
          {isSidebarOpen && currentVersionId && (
            <div className="w-1/3">
              <RefinementSidebar
                siteId={siteId}
                currentVersionId={currentVersionId}
                onApplyChanges={handleApplyChanges}
                onClose={() => setIsSidebarOpen(false)}
              />
            </div>
          )}

          {/* Preview Area - Right side (bigger), dynamic width based on sidebar state */}
          <div
            className={`transition-all duration-300 ${
              isSidebarOpen ? "w-2/3" : "w-full"
            } rounded-lg border border-gray-200 bg-gray-100 p-4`}
          >
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : viewMode === "preview" ? (
              <div className="flex h-full justify-center overflow-auto">
                <div className={`h-full transition-all duration-300 ${deviceSizes[device]}`}>
                  <PreviewFrame htmlContent={htmlContent} className="rounded-lg shadow-xl" />
                </div>
              </div>
            ) : (
              <CodePreview code={htmlContent} />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
