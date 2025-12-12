"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, GitCompare, Maximize2, Minimize2, RefreshCw } from "lucide-react";

interface Version {
  id: string;
  version_number: number;
  html_content: string;
  generation_type: string;
  model: string;
  generation_time_ms: number;
  created_at: string;
  change_summary: string | null;
}

export default function CompareVersionsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteId = params.siteId as string;

  const [versions, setVersions] = useState<Version[]>([]);
  const [leftVersionId, setLeftVersionId] = useState<string | null>(null);
  const [rightVersionId, setRightVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);

  // Fetch versions on mount
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await fetch(`/api/sites/${siteId}/versions`);
        if (response.ok) {
          const data = await response.json();
          if (data.versions) {
            setVersions(data.versions);

            // Set initial versions from URL params or defaults
            const leftParam = searchParams.get("left");
            const rightParam = searchParams.get("right");

            if (leftParam && data.versions.find((v: Version) => v.id === leftParam)) {
              setLeftVersionId(leftParam);
            } else if (data.versions.length >= 2) {
              setLeftVersionId(data.versions[1].id);
            }

            if (rightParam && data.versions.find((v: Version) => v.id === rightParam)) {
              setRightVersionId(rightParam);
            } else if (data.versions.length >= 1) {
              setRightVersionId(data.versions[0].id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch versions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [siteId, searchParams]);

  // Update URL when versions change
  useEffect(() => {
    if (leftVersionId && rightVersionId) {
      const newUrl = `/dashboard/sites/${siteId}/versions/compare?left=${leftVersionId}&right=${rightVersionId}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [leftVersionId, rightVersionId, siteId, router]);

  // Sync scroll between iframes
  useEffect(() => {
    if (!syncScroll) return;

    const leftIframe = document.getElementById("left-iframe") as HTMLIFrameElement;
    const rightIframe = document.getElementById("right-iframe") as HTMLIFrameElement;

    if (!leftIframe || !rightIframe) return;

    const handleLeftScroll = () => {
      const leftDoc = leftIframe.contentDocument || leftIframe.contentWindow?.document;
      const rightDoc = rightIframe.contentDocument || rightIframe.contentWindow?.document;
      if (leftDoc && rightDoc) {
        rightDoc.documentElement.scrollTop = leftDoc.documentElement.scrollTop;
        rightDoc.documentElement.scrollLeft = leftDoc.documentElement.scrollLeft;
      }
    };

    const handleRightScroll = () => {
      const leftDoc = leftIframe.contentDocument || leftIframe.contentWindow?.document;
      const rightDoc = rightIframe.contentDocument || rightIframe.contentWindow?.document;
      if (leftDoc && rightDoc) {
        leftDoc.documentElement.scrollTop = rightDoc.documentElement.scrollTop;
        leftDoc.documentElement.scrollLeft = rightDoc.documentElement.scrollLeft;
      }
    };

    // Add scroll listeners after iframes load
    leftIframe.addEventListener("load", () => {
      const leftDoc = leftIframe.contentDocument || leftIframe.contentWindow?.document;
      if (leftDoc) {
        leftDoc.addEventListener("scroll", handleLeftScroll);
      }
    });

    rightIframe.addEventListener("load", () => {
      const rightDoc = rightIframe.contentDocument || rightIframe.contentWindow?.document;
      if (rightDoc) {
        rightDoc.addEventListener("scroll", handleRightScroll);
      }
    });

    return () => {
      // Cleanup is handled by iframe reload
    };
  }, [syncScroll, leftVersionId, rightVersionId]);

  const leftVersion = versions.find((v) => v.id === leftVersionId);
  const rightVersion = versions.find((v) => v.id === rightVersionId);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const swapVersions = () => {
    const temp = leftVersionId;
    setLeftVersionId(rightVersionId);
    setRightVersionId(temp);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading versions...</p>
        </div>
      </div>
    );
  }

  if (versions.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto text-center">
          <GitCompare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Not Enough Versions</h1>
          <p className="text-gray-600 mb-6">
            You need at least 2 versions to compare. Generate more versions to use this feature.
          </p>
          <Button asChild>
            <Link href={`/dashboard/sites/${siteId}/versions`}>Back to Versions</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gray-100 flex flex-col ${isFullscreen ? "fixed inset-0 z-50" : ""}`}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/sites/${siteId}/versions`}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Versions
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <GitCompare className="w-5 h-5" />
              Compare Versions
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSyncScroll(!syncScroll)}
              className={syncScroll ? "bg-indigo-50 border-indigo-300" : ""}
            >
              {syncScroll ? "Sync Scroll: On" : "Sync Scroll: Off"}
            </Button>
            <Button variant="outline" size="sm" onClick={swapVersions}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Swap
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 mr-2" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Fullscreen
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Version Selectors */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="grid grid-cols-2 gap-8">
          {/* Left Version Selector */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                value={leftVersionId || ""}
                onValueChange={(value) => setLeftVersionId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id} disabled={v.id === rightVersionId}>
                      Version {v.version_number} - {formatDate(v.created_at)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {leftVersion && (
              <div className="text-sm text-gray-500">
                <span className="text-gray-400">{leftVersion.model}</span>
                {leftVersion.change_summary && (
                  <span className="ml-2 text-gray-600">{leftVersion.change_summary}</span>
                )}
              </div>
            )}
          </div>

          {/* Right Version Selector */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                value={rightVersionId || ""}
                onValueChange={(value) => setRightVersionId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id} disabled={v.id === leftVersionId}>
                      Version {v.version_number} - {formatDate(v.created_at)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {rightVersion && (
              <div className="text-sm text-gray-500">
                <span className="text-gray-400">{rightVersion.model}</span>
                {rightVersion.change_summary && (
                  <span className="ml-2 text-gray-600">{rightVersion.change_summary}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison View */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-gray-300">
        {/* Left Preview */}
        <div className="relative bg-white">
          <div className="absolute top-2 left-2 z-10 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
            Version {leftVersion?.version_number || "?"}
          </div>
          {leftVersion && (
            <iframe
              id="left-iframe"
              srcDoc={leftVersion.html_content}
              className="w-full h-full border-0"
              title={`Version ${leftVersion.version_number}`}
              sandbox="allow-scripts"
            />
          )}
        </div>

        {/* Right Preview */}
        <div className="relative bg-white">
          <div className="absolute top-2 right-2 z-10 bg-indigo-600/90 text-white text-xs px-2 py-1 rounded">
            Version {rightVersion?.version_number || "?"} (newer)
          </div>
          {rightVersion && (
            <iframe
              id="right-iframe"
              srcDoc={rightVersion.html_content}
              className="w-full h-full border-0"
              title={`Version ${rightVersion.version_number}`}
              sandbox="allow-scripts"
            />
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="grid grid-cols-2 gap-8 text-sm text-gray-500">
          <div>
            {leftVersion && (
              <span>
                Generated in {(leftVersion.generation_time_ms / 1000).toFixed(1)}s •{" "}
                {leftVersion.generation_type}
              </span>
            )}
          </div>
          <div>
            {rightVersion && (
              <span>
                Generated in {(rightVersion.generation_time_ms / 1000).toFixed(1)}s •{" "}
                {rightVersion.generation_type}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
