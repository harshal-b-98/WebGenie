"use client";

import { Button } from "@/components/ui/button";
import { PublishDialog } from "@/components/features/deployment";

interface PublishButtonProps {
  siteId: string;
  siteTitle: string;
  hasGeneratedContent: boolean;
  currentVersionNumber?: number;
  productionUrl?: string | null;
  lastDeployedAt?: string | null;
}

export function PublishButton({
  siteId,
  siteTitle,
  hasGeneratedContent,
  currentVersionNumber,
  productionUrl,
  lastDeployedAt,
}: PublishButtonProps) {
  return (
    <PublishDialog
      siteId={siteId}
      siteTitle={siteTitle}
      hasGeneratedContent={hasGeneratedContent}
      currentVersionNumber={currentVersionNumber}
      productionUrl={productionUrl}
      lastDeployedAt={lastDeployedAt}
    >
      <Button className="w-full" variant={productionUrl ? "outline" : "default"}>
        {productionUrl ? "Update Deployment" : "Publish to Web"}
      </Button>
    </PublishDialog>
  );
}
