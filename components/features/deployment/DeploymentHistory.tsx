"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Deployment {
  id: string;
  status: "pending" | "building" | "ready" | "error" | "canceled";
  versionNumber?: number;
  deploymentUrl?: string;
  productionUrl?: string;
  previewUrl?: string;
  buildDurationMs?: number;
  errorMessage?: string;
  createdAt: string;
  buildCompletedAt?: string;
}

interface DeploymentHistoryProps {
  siteId: string;
}

export function DeploymentHistory({ siteId }: DeploymentHistoryProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeployments();
  }, [siteId]);

  async function fetchDeployments() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sites/${siteId}/deployments?limit=10`);
      if (!response.ok) {
        throw new Error("Failed to fetch deployments");
      }
      const data = await response.json();
      setDeployments(data.deployments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  function getStatusBadge(status: Deployment["status"]) {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "building":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Building
          </Badge>
        );
      case "ready":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Ready
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        );
      case "canceled":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <AlertCircle className="mr-1 h-3 w-3" />
            Canceled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
          <CardDescription>Recent deployments for this site</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
          <CardDescription>Recent deployments for this site</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>{error}</p>
            <Button variant="ghost" onClick={fetchDeployments} className="mt-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Deployment History</CardTitle>
          <CardDescription>Recent deployments for this site</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchDeployments}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {deployments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No deployments yet</p>
            <p className="text-sm mt-1">Deploy your site to see the history here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deployments.map((deployment) => (
              <div
                key={deployment.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(deployment.status)}
                    {deployment.versionNumber && (
                      <span className="text-sm text-muted-foreground">
                        Version {deployment.versionNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true })}
                    </span>
                    {deployment.buildDurationMs && (
                      <span>Build: {formatDuration(deployment.buildDurationMs)}</span>
                    )}
                  </div>
                  {deployment.errorMessage && (
                    <p className="text-sm text-red-600">{deployment.errorMessage}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {deployment.productionUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={deployment.productionUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
