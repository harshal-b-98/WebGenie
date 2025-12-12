"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Link2, Link2Off } from "lucide-react";
import { toast } from "sonner";

interface VercelConnectionStatus {
  connected: boolean;
  email?: string;
  username?: string;
  teamId?: string;
  teamSlug?: string;
  connectedAt?: string;
}

export function VercelConnectionCard() {
  const [status, setStatus] = useState<VercelConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/vercel/status");
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch {
      setStatus({ connected: false });
    } finally {
      setIsLoading(false);
    }
  }

  function handleConnect() {
    window.location.href = "/api/auth/vercel";
  }

  async function handleDisconnect() {
    setIsDisconnecting(true);
    try {
      const response = await fetch("/api/auth/vercel", {
        method: "DELETE",
      });

      if (response.ok) {
        setStatus({ connected: false });
        toast.success("Vercel account disconnected");
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch {
      toast.error("Failed to disconnect Vercel account");
    } finally {
      setIsDisconnecting(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vercel Integration</CardTitle>
          <CardDescription>Connect your Vercel account to deploy your websites.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            className="h-5 w-5"
            viewBox="0 0 76 65"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
          </svg>
          Vercel Integration
        </CardTitle>
        <CardDescription>
          Connect your Vercel account to deploy your websites with one click.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-800">Connected</p>
                <p className="text-sm text-green-700">
                  {status.username || status.email}
                  {status.teamSlug && ` (Team: ${status.teamSlug})`}
                </p>
              </div>
            </div>

            {status.connectedAt && (
              <p className="text-sm text-muted-foreground">
                Connected on {new Date(status.connectedAt).toLocaleDateString()}
              </p>
            )}

            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full"
            >
              {isDisconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2Off className="mr-2 h-4 w-4" />
              )}
              Disconnect Vercel
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">
                Connect your Vercel account to enable one-click deployment of your generated
                websites. Your sites will be deployed to Vercel&apos;s global edge network.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">What you&apos;ll get:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Automatic SSL certificates</li>
                <li>- Global CDN distribution</li>
                <li>- Custom domain support</li>
                <li>- Instant deployments</li>
              </ul>
            </div>

            <Button onClick={handleConnect} className="w-full">
              <Link2 className="mr-2 h-4 w-4" />
              Connect Vercel Account
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
