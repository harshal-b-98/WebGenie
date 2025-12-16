"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { WebsiteTypeStep } from "./steps/website-type-step";
import { BrandSetupStep } from "./steps/brand-setup-step";
import { ContentInputStep } from "./steps/content-input-step";
import { ReviewStep } from "./steps/review-step";
import { ProgressIndicator } from "./progress-indicator";

export interface OnboardingData {
  // Step 1: Website Type
  websiteType: string;
  industry: string;
  targetAudience: string;
  mainGoal: string;

  // Step 2: Brand Setup
  projectName: string;
  description: string;
  logo: File | null;
  logoPreview: string | null;
  primaryColor: string;
  socialMedia: {
    linkedin: string;
    twitter: string;
    facebook: string;
    instagram: string;
    youtube: string;
  };

  // Step 3: Content Input
  contentMethod: "text" | "document" | "both";
  textContent: string;
  documents: File[];
}

const initialData: OnboardingData = {
  websiteType: "",
  industry: "",
  targetAudience: "",
  mainGoal: "",
  projectName: "",
  description: "",
  logo: null,
  logoPreview: null,
  primaryColor: "#667eea",
  socialMedia: {
    linkedin: "",
    twitter: "",
    facebook: "",
    instagram: "",
    youtube: "",
  },
  contentMethod: "text",
  textContent: "",
  documents: [],
};

const STEPS = [
  { id: 1, title: "Website Type", description: "Choose your website purpose" },
  { id: 2, title: "Brand Setup", description: "Configure your brand" },
  { id: 3, title: "Content", description: "Add your content" },
  { id: 4, title: "Review", description: "Review and create" },
];

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OnboardingWizard({ open, onOpenChange, onSuccess }: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isCreating, setIsCreating] = useState(false);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    // Skip to simple creation
    handleQuickCreate();
  };

  const handleQuickCreate = async () => {
    if (!data.projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.projectName,
          description: data.description,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to create workspace");
      }

      toast.success("Project created successfully!");
      handleClose();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreate = async () => {
    if (!data.projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setIsCreating(true);
    try {
      // Step 1: Create workspace
      const workspaceResponse = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.projectName,
          description: data.description,
        }),
      });

      if (!workspaceResponse.ok) {
        const error = await workspaceResponse.json();
        throw new Error(error.error?.message || "Failed to create workspace");
      }

      const { workspace } = await workspaceResponse.json();
      const siteId = workspace.id;

      // Step 2: Upload logo if provided
      if (data.logo) {
        const logoFormData = new FormData();
        logoFormData.append("file", data.logo);

        const logoResponse = await fetch(`/api/sites/${siteId}/logo`, {
          method: "POST",
          body: logoFormData,
        });

        if (!logoResponse.ok) {
          const error = await logoResponse.json().catch(() => ({}));
          console.error("Logo upload failed:", error);
          // Continue anyway - logo is optional
        }
      }

      // Step 3: Save brand settings
      const settingsResponse = await fetch(`/api/sites/${siteId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: buildWebsiteDescription(data),
          brand_assets: {
            socialMedia: data.socialMedia,
          },
          chat_widget_config: {
            primaryColor: data.primaryColor,
          },
        }),
      });

      if (!settingsResponse.ok) {
        const error = await settingsResponse.json().catch(() => ({}));
        throw new Error(error.error?.message || "Failed to save brand settings");
      }

      // Step 4: Upload documents if provided (use correct endpoint)
      if (data.documents.length > 0) {
        for (const doc of data.documents) {
          const docFormData = new FormData();
          docFormData.append("file", doc);
          docFormData.append("siteId", siteId);

          const docResponse = await fetch(`/api/documents/upload`, {
            method: "POST",
            body: docFormData,
          });

          if (!docResponse.ok) {
            const error = await docResponse.json().catch(() => ({}));
            console.error("Document upload failed:", error);
            // Continue with other documents
          }
        }
      }

      // Step 5: Save text content as a document if provided
      if (data.textContent.trim()) {
        const textResponse = await fetch(`/api/sites/${siteId}/documents/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: data.textContent,
            title: "Business Information",
          }),
        });

        if (!textResponse.ok) {
          const error = await textResponse.json().catch(() => ({}));
          console.error("Text content save failed:", error);
          // Continue anyway
        }
      }

      // Step 6: Mark onboarding as complete
      const onboardingResponse = await fetch(`/api/sites/${siteId}/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: true,
          websiteType: data.websiteType,
          industry: data.industry,
          targetAudience: data.targetAudience,
          mainGoal: data.mainGoal,
        }),
      });

      if (!onboardingResponse.ok) {
        const error = await onboardingResponse.json().catch(() => ({}));
        throw new Error(error.error?.message || "Failed to complete onboarding");
      }

      toast.success("Project created! Redirecting to generation...");
      handleClose();
      onSuccess();

      // Navigate to the generate page
      router.push(`/dashboard/sites/${siteId}/generate`);
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setData(initialData);
    onOpenChange(false);
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!data.websiteType;
      case 2:
        return !!data.projectName.trim();
      case 3:
        return data.contentMethod === "text"
          ? !!data.textContent.trim()
          : data.documents.length > 0 || !!data.textContent.trim();
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Your Website</DialogTitle>
          <DialogDescription>
            Let&apos;s set up your AI-powered website in a few simple steps.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <ProgressIndicator steps={STEPS} currentStep={currentStep} />

        {/* Step Content */}
        <div className="min-h-[400px] py-4">
          {currentStep === 1 && <WebsiteTypeStep data={data} updateData={updateData} />}
          {currentStep === 2 && <BrandSetupStep data={data} updateData={updateData} />}
          {currentStep === 3 && <ContentInputStep data={data} updateData={updateData} />}
          {currentStep === 4 && <ReviewStep data={data} onEditStep={setCurrentStep} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {currentStep === 1 && (
              <Button variant="ghost" onClick={handleSkip} disabled={isCreating}>
                Skip Setup (Experienced User)
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={isCreating}>
                Back
              </Button>
            )}
            {currentStep < 4 ? (
              <Button onClick={handleNext} disabled={!canProceed() || isCreating}>
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={!canProceed() || isCreating}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {isCreating ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating...
                  </>
                ) : (
                  "Create & Generate Website"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to build website description from onboarding data
function buildWebsiteDescription(data: OnboardingData): string {
  const parts: string[] = [];

  if (data.websiteType) {
    parts.push(`Website Type: ${data.websiteType}`);
  }
  if (data.industry) {
    parts.push(`Industry: ${data.industry}`);
  }
  if (data.targetAudience) {
    parts.push(`Target Audience: ${data.targetAudience}`);
  }
  if (data.mainGoal) {
    parts.push(`Main Goal: ${data.mainGoal}`);
  }
  if (data.description) {
    parts.push(`\nDescription: ${data.description}`);
  }

  return parts.join("\n");
}
