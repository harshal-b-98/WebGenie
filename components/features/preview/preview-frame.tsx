"use client";

import { useEffect, useRef } from "react";

interface PreviewFrameProps {
  htmlContent: string;
  className?: string;
}

export function PreviewFrame({ htmlContent, className = "" }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;

      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
      }
    }
  }, [htmlContent]);

  return (
    <iframe
      ref={iframeRef}
      className={`w-full h-full border-0 bg-white ${className}`}
      sandbox="allow-scripts allow-same-origin"
      title="Website Preview"
    />
  );
}
