"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket, ExternalLink, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PublishDialogProps {
  siteId: string;
  siteTitle: string;
  hasGeneratedContent: boolean;
  currentVersionNumber?: number;
  productionUrl?: string | null;
  lastDeployedAt?: string | null;
  children?: React.ReactNode;
}

interface DeploymentStatus {
  deploymentId: string;
  vercelDeploymentId: string;
  status: "pending" | "building" | "ready" | "error" | "canceled";
  previewUrl?: string;
  productionUrl?: string;
  errorMessage?: string;
}

interface VercelConnectionStatus {
  connected: boolean;
  email?: string;
  username?: string;
}

export function PublishDialog({
  siteId,
  siteTitle,
  hasGeneratedContent,
  currentVersionNumber,
  productionUrl,
  lastDeployedAt,
  children,
}: PublishDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [vercelStatus, setVercelStatus] = useState<VercelConnectionStatus | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);

  // Check Vercel connection status when dialog opens
  useEffect(() => {
    if (open) {
      checkVercelConnection();
    }
  }, [open]);

  // Poll deployment status when deploying
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (
      deploymentStatus &&
      (deploymentStatus.status === "pending" || deploymentStatus.status === "building")
    ) {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/sites/${siteId}/deployments/${deploymentStatus.deploymentId}`
          );
          if (response.ok) {
            const data = await response.json();
            setDeploymentStatus((prev) => ({
              ...prev!,
              status: data.status,
              productionUrl: data.productionUrl,
              previewUrl: data.previewUrl,
              errorMessage: data.errorMessage,
            }));

            if (data.status === "ready" || data.status === "error" || data.status === "canceled") {
              setIsDeploying(false);
              if (data.status === "ready") {
                toast.success("Site published successfully!");
              } else if (data.status === "error") {
                toast.error(`Deployment failed: ${data.errorMessage}`);
              }
            }
          }
        } catch {
          // Ignore polling errors
        }
      }, 3000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [deploymentStatus, siteId]);

  async function checkVercelConnection() {
    setIsCheckingConnection(true);
    try {
      const response = await fetch("/api/auth/vercel/status");
      if (response.ok) {
        const data = await response.json();
        setVercelStatus(data);
      }
    } catch {
      setVercelStatus({ connected: false });
    } finally {
      setIsCheckingConnection(false);
    }
  }

  async function handleDeploy() {
    setIsDeploying(true);
    setDeploymentStatus(null);

    try {
      const response = await fetch(`/api/sites/${siteId}/deploy`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Deployment failed");
      }

      setDeploymentStatus({
        deploymentId: data.deploymentId,
        vercelDeploymentId: data.vercelDeploymentId,
        status: data.status,
        previewUrl: data.previewUrl,
      });

      toast.success("Deployment started!");
    } catch (error) {
      setIsDeploying(false);
      toast.error(error instanceof Error ? error.message : "Failed to start deployment");
    }
  }

  function handleConnectVercel() {
    window.location.href = "/api/auth/vercel";
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="default">
            <Rocket className="mr-2 h-4 w-4" />
            Publish
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish to Web</DialogTitle>
          <DialogDescription>
            Deploy your website to make it live on the internet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Site Info */}
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="font-medium">{siteTitle}</h4>
            {currentVersionNumber && (
              <p className="text-sm text-muted-foreground">Version {currentVersionNumber}</p>
            )}
            {productionUrl && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600">Live at:</span>
                <a
                  href={productionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  {new URL(productionUrl).hostname}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {lastDeployedAt && (
              <p className="text-xs text-muted-foreground">
                Last deployed: {new Date(lastDeployedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Vercel Connection Status */}
          {isCheckingConnection ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !vercelStatus?.connected ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Connect Vercel Account</span>
              </div>
              <p className="text-sm text-yellow-700">
                Connect your Vercel account to deploy your website.
              </p>
              <Button onClick={handleConnectVercel} variant="outline" className="w-full">
                Connect Vercel
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Vercel Connected</span>
                </div>
                <span className="text-sm text-green-700">
                  {vercelStatus.username || vercelStatus.email}
                </span>
              </div>
            </div>
          )}

          {/* Deployment Status */}
          {deploymentStatus && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                {deploymentStatus.status === "pending" || deploymentStatus.status === "building" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <span className="font-medium">
                      {deploymentStatus.status === "pending" ? "Preparing..." : "Building..."}
                    </span>
                  </>
                ) : deploymentStatus.status === "ready" ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Published!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800">Failed</span>
                  </>
                )}
              </div>

              {deploymentStatus.previewUrl && (
                <a
                  href={deploymentStatus.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  Preview deployment
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {deploymentStatus.productionUrl && deploymentStatus.status === "ready" && (
                <a
                  href={deploymentStatus.productionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  View live site
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {deploymentStatus.errorMessage && (
                <p className="text-sm text-red-600">{deploymentStatus.errorMessage}</p>
              )}
            </div>
          )}

          {/* Deploy Button */}
          {vercelStatus?.connected &&
            !isDeploying &&
            (!deploymentStatus ||
              deploymentStatus.status === "ready" ||
              deploymentStatus.status === "error" ||
              deploymentStatus.status === "canceled") && (
              <Button onClick={handleDeploy} disabled={!hasGeneratedContent} className="w-full">
                <Rocket className="mr-2 h-4 w-4" />
                {productionUrl ? "Update Deployment" : "Deploy to Vercel"}
              </Button>
            )}

          {!hasGeneratedContent && (
            <p className="text-sm text-center text-muted-foreground">
              Generate your website first before publishing.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
