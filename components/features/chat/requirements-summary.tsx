"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Requirement {
  label: string;
  value: string;
}

interface RequirementsSummaryProps {
  requirements: Requirement[];
  onEdit?: () => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export function RequirementsSummary({
  requirements,
  onEdit,
  onGenerate,
  isGenerating = false,
}: RequirementsSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Website Requirements</CardTitle>
        <CardDescription>
          Review what we&apos;ve gathered. You can edit or proceed to generate your website.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {requirements.map((req, index) => (
            <div key={index} className="border-l-4 border-blue-600 bg-blue-50 p-4 rounded-r-lg">
              <dt className="text-sm font-semibold text-gray-700">{req.label}</dt>
              <dd className="mt-1 text-base text-gray-900">{req.value}</dd>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4">
          {onEdit && (
            <Button variant="outline" onClick={onEdit} className="flex-1">
              Edit Requirements
            </Button>
          )}
          {onGenerate && (
            <Button onClick={onGenerate} disabled={isGenerating} className="flex-1">
              {isGenerating ? "Generating..." : "Generate Website"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
