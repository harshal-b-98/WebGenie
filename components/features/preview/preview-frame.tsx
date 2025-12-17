"use client";

import { useEffect, useRef, useMemo, useState } from "react";

interface PreviewFrameProps {
  htmlContent: string;
  className?: string;
}

/**
 * Dark-themed skeleton that matches generated website hero sections
 * This prevents the white flash during loading
 */
function PreviewSkeleton() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 animate-pulse">
      {/* Navbar skeleton */}
      <div className="h-16 bg-white/5 flex items-center justify-between px-6">
        <div className="h-8 w-32 bg-white/10 rounded-lg" />
        <div className="hidden md:flex items-center gap-4">
          <div className="h-4 w-20 bg-white/10 rounded" />
          <div className="h-4 w-20 bg-white/10 rounded" />
          <div className="h-4 w-20 bg-white/10 rounded" />
          <div className="h-10 w-28 bg-indigo-500/30 rounded-full" />
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        {/* Badge */}
        <div className="h-8 w-48 bg-white/10 rounded-full mb-8" />
        {/* Headline */}
        <div className="h-12 w-[80%] max-w-2xl bg-white/10 rounded-lg mb-4" />
        <div className="h-12 w-[60%] max-w-xl bg-white/10 rounded-lg mb-6" />
        {/* Subtitle */}
        <div className="h-6 w-[70%] max-w-lg bg-white/5 rounded mb-8" />
        {/* CTA buttons */}
        <div className="flex gap-4 mb-12">
          <div className="h-14 w-40 bg-indigo-500/30 rounded-full" />
          <div className="h-14 w-40 bg-white/10 rounded-full" />
        </div>
        {/* Feature highlights */}
        <div className="flex gap-8">
          <div className="h-6 w-32 bg-white/5 rounded" />
          <div className="h-6 w-32 bg-white/5 rounded" />
          <div className="h-6 w-32 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * CSS fixes for common AI-generation issues:
 * 1. Hero section benefit items centering
 * 2. Navbar z-index to prevent content scrolling above
 */
const heroCenteringCSS = `
<style id="ngw-hero-fix">
  /* Fix navbar z-index - ensure it stays above all content */
  nav, header, [class*="fixed"][class*="top-0"] {
    z-index: 50 !important;
    position: fixed !important;
  }

  /* Ensure main content has proper top padding to account for fixed navbar */
  body > main:first-of-type,
  body > section:first-of-type,
  body > div:first-of-type > section:first-of-type {
    scroll-margin-top: 5rem;
  }
</style>
<style id="ngw-hero-fix-2">
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
 *
 * Features:
 * - Dark-themed skeleton that matches generated websites
 * - Smooth fade-in transition to prevent white flash
 * - Double requestAnimationFrame to ensure paint completion
 */
export function PreviewFrame({ htmlContent, className = "" }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Create blob URL synchronously during render using useMemo
  // This is safe because URL.createObjectURL is a pure function
  const blobUrl = useMemo(() => createBlobUrl(htmlContent), [htmlContent]);

  // Store previous URL for cleanup
  const previousUrlRef = useRef<string | null>(null);

  // Effect only handles cleanup - state resets automatically when iframe reloads with new blobUrl
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

  // Handle iframe load - use double RAF to ensure paint completion
  const handleLoad = () => {
    // Double requestAnimationFrame ensures the paint is complete before showing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  };

  return (
    <div className="relative w-full h-full">
      {/* Dark skeleton overlay - fades out when content is ready */}
      <div
        className={`absolute inset-0 z-10 transition-opacity duration-500 ${
          isVisible ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <PreviewSkeleton />
      </div>

      {/* Iframe - fades in when loaded, key ensures remount on content change */}
      <iframe
        key={blobUrl}
        ref={iframeRef}
        src={blobUrl || "about:blank"}
        onLoad={handleLoad}
        className={`w-full h-full border-0 bg-slate-900 transition-opacity duration-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        } ${className}`}
        title="Website Preview"
      />
    </div>
  );
}

// Export the skeleton for use in other components
export { PreviewSkeleton };
