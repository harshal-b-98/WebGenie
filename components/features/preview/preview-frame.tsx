"use client";

import { useEffect, useRef, useMemo } from "react";

interface PreviewFrameProps {
  htmlContent: string;
  className?: string;
}

/**
 * CSS fix for hero section benefit items centering
 * This ensures AI-generated benefit rows are properly centered
 */
const heroCenteringCSS = `
<style id="ngw-hero-fix">
  /* Fix hero benefit items centering */
  section[class*="from-slate"] .flex.items-center.gap-3,
  section[class*="from-gray"] .flex.items-center.gap-3,
  section[class*="bg-gradient"] .flex.items-center.gap-3 {
    /* Individual benefit items - no change needed */
  }

  /* Target the parent container of benefit items */
  section[class*="from-slate"] > div > div:last-child,
  section[class*="from-gray"] > div > div:last-child,
  section[class*="bg-gradient"] > div > div:last-child {
    display: flex !important;
    justify-content: center !important;
    flex-wrap: wrap !important;
    gap: 2rem !important;
    width: 100% !important;
  }

  /* Target mt-16 containers (common pattern for benefit rows) */
  section div[class*="mt-16"],
  section div[class*="mt-12"],
  section div[class*="mt-8"] {
    display: flex !important;
    justify-content: center !important;
    flex-wrap: wrap !important;
    gap: 2rem !important;
    width: 100% !important;
  }

  /* Target any div with multiple text-gray-300 children in hero sections */
  section[class*="from-slate"] div,
  section[class*="from-gray"] div,
  section[class*="bg-gradient"] div {
    /* Use has selector for browsers that support it */
  }

  /* Fallback: Target divs that contain spans with feather icons */
  section .text-gray-300 {
    /* Ensure items are inline-flex for proper alignment */
  }
</style>
`;

/**
 * Process HTML content to ensure Tailwind CDN is present and apply fixes
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

  // Inject hero centering CSS fix
  if (!content.includes("ngw-hero-fix")) {
    if (content.includes("</head>")) {
      content = content.replace("</head>", `${heroCenteringCSS}\n</head>`);
    } else if (content.includes("<head>")) {
      content = content.replace("<head>", `<head>\n${heroCenteringCSS}`);
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
