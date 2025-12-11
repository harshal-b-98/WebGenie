"use client";

import { useEffect, useRef, useMemo } from "react";

interface PreviewFrameProps {
  htmlContent: string;
  className?: string;
}

/**
 * Process HTML content to ensure Tailwind CDN is present
 */
function processHtmlContent(htmlContent: string): string {
  if (!htmlContent) return "";

  let content = htmlContent;
  const tailwindScript = '<script src="https://cdn.tailwindcss.com"></script>';

  if (!content.includes("cdn.tailwindcss.com")) {
    if (content.includes("</head>")) {
      content = content.replace("</head>", `${tailwindScript}\n</head>`);
    } else if (content.includes("<head>")) {
      content = content.replace("<head>", `<head>\n${tailwindScript}`);
    } else if (content.includes("<html")) {
      content = content.replace(/<html[^>]*>/, `$&\n<head>${tailwindScript}</head>`);
    } else {
      content = `<!DOCTYPE html><html><head>${tailwindScript}</head><body>${content}</body></html>`;
    }
  }

  return content;
}

/**
 * Create a blob URL from HTML content
 */
function createBlobUrl(content: string): string | null {
  if (!content) return null;
  const processedContent = processHtmlContent(content);
  const blob = new Blob([processedContent], { type: "text/html" });
  return URL.createObjectURL(blob);
}

/**
 * PreviewFrame renders HTML content in an iframe using blob URLs.
 * This approach ensures external scripts (like Tailwind CDN) execute properly.
 * Blob URLs have better compatibility with external resource loading than srcdoc.
 */
export function PreviewFrame({ htmlContent, className = "" }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Create blob URL synchronously during render using useMemo
  // This is safe because URL.createObjectURL is a pure function
  const blobUrl = useMemo(() => createBlobUrl(htmlContent), [htmlContent]);

  // Store previous URL for cleanup
  const previousUrlRef = useRef<string | null>(null);

  // Effect only handles cleanup - no setState calls
  useEffect(() => {
    // Clean up previous URL when a new one is created
    const previousUrl = previousUrlRef.current;
    if (previousUrl && previousUrl !== blobUrl) {
      URL.revokeObjectURL(previousUrl);
    }
    previousUrlRef.current = blobUrl;

    // Cleanup on unmount
    return () => {
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
      }
    };
  }, [blobUrl]);

  return (
    <iframe
      ref={iframeRef}
      src={blobUrl || "about:blank"}
      className={`w-full h-full border-0 bg-white ${className}`}
      title="Website Preview"
    />
  );
}
