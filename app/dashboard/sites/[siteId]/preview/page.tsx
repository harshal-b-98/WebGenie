"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PreviewFrame } from "@/components/features/preview/preview-frame";
import { CodePreview } from "@/components/features/preview/code-preview";
import { DeviceToggle } from "@/components/features/preview/device-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { toast } from "sonner";

type DeviceType = "desktop" | "tablet" | "mobile";
type ViewMode = "preview" | "code";

export default function PreviewPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [htmlContent, setHtmlContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");

  useEffect(() => {
    loadWebsite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const loadWebsite = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sites/${siteId}/preview`);
      if (!response.ok) throw new Error("Failed to load website");

      const data = await response.json();
      setHtmlContent(data.htmlContent || "<p>No content generated yet</p>");
    } catch {
      toast.error("Failed to load website");
    } finally {
      setIsLoading(false);
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

            {/* Publish Button */}
            <Button asChild>
              <Link href={`/dashboard/sites/${siteId}/publish`}>Publish</Link>
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="h-[calc(100vh-12rem)] rounded-lg border border-gray-200 bg-gray-100 p-4">
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
    </DashboardLayout>
  );
}
