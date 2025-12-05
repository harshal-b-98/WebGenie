"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function InstantDemoPage() {
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    if (!companyName.trim() || !description.trim()) return;
    setLoading(true);

    // Simulate generation delay
    setTimeout(() => {
      setLoading(false);
      // For now, redirect to onboarding as we don't have a preview engine yet
      // In the future, this would redirect to a generated preview URL
      router.push("/onboarding?demo=true");
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 pt-20">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Instant Demo</CardTitle>
          <CardDescription>See what NextGenWeb can build for you in seconds.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="company-name" className="text-sm font-medium">
                Company Name
              </label>
              <Input
                id="company-name"
                placeholder="Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                What does your company do?
              </label>
              <Input
                id="description"
                placeholder="We sell organic coffee beans..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={!companyName.trim() || !description.trim() || loading}
            >
              {loading ? "Generating Preview..." : "Generate Website"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
