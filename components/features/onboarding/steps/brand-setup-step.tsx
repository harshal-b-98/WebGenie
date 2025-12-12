"use client";

import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X, Palette } from "lucide-react";
import type { OnboardingData } from "../onboarding-wizard";

const PRESET_COLORS = [
  { name: "Indigo", color: "#667eea" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Purple", color: "#8b5cf6" },
  { name: "Pink", color: "#ec4899" },
  { name: "Red", color: "#ef4444" },
  { name: "Orange", color: "#f97316" },
  { name: "Green", color: "#22c55e" },
  { name: "Teal", color: "#14b8a6" },
  { name: "Gray", color: "#6b7280" },
];

interface BrandSetupStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function BrandSetupStep({ data, updateData }: BrandSetupStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/svg+xml", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Invalid file type. Please upload JPEG, PNG, SVG, or WebP.");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum size is 5MB.");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      updateData({
        logo: file,
        logoPreview: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    updateData({ logo: null, logoPreview: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Name */}
      <div className="space-y-2">
        <Label htmlFor="projectName" className="text-base font-semibold">
          Project Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="projectName"
          placeholder="My Awesome Website"
          value={data.projectName}
          onChange={(e) => updateData({ projectName: e.target.value })}
        />
        <p className="text-xs text-gray-500">
          This will be the name of your project in the dashboard
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Brief Description (optional)</Label>
        <textarea
          id="description"
          placeholder="A brief description of what your website is about..."
          value={data.description}
          onChange={(e) => updateData({ description: e.target.value })}
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Logo (optional)</Label>
        <div className="flex items-start gap-4">
          <div className="relative h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
            {data.logoPreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.logoPreview}
                  alt="Logo preview"
                  className="object-contain p-2 w-full h-full"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <Upload className="h-8 w-8 text-gray-400" />
            )}
          </div>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleLogoSelect}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Logo
            </Button>
            <p className="text-xs text-gray-500">JPEG, PNG, SVG, or WebP. Max 5MB.</p>
          </div>
        </div>
      </div>

      {/* Primary Color */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Brand Color
        </Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.color}
              type="button"
              onClick={() => updateData({ primaryColor: preset.color })}
              className={`w-10 h-10 rounded-full border-2 transition-all ${
                data.primaryColor === preset.color
                  ? "border-gray-900 ring-2 ring-offset-2 ring-gray-400"
                  : "border-transparent hover:border-gray-300"
              }`}
              style={{ backgroundColor: preset.color }}
              title={preset.name}
            />
          ))}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={data.primaryColor}
              onChange={(e) => updateData({ primaryColor: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer border-2 border-gray-300"
            />
            <span className="text-sm text-gray-500">{data.primaryColor}</span>
          </div>
        </div>
      </div>

      {/* Social Media Links */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Social Media Links (optional)</Label>
        <p className="text-sm text-gray-500">
          Add your social profiles to include them in your website footer
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="linkedin" className="text-xs">
              LinkedIn
            </Label>
            <Input
              id="linkedin"
              placeholder="https://linkedin.com/company/..."
              value={data.socialMedia.linkedin}
              onChange={(e) =>
                updateData({
                  socialMedia: { ...data.socialMedia, linkedin: e.target.value },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="twitter" className="text-xs">
              Twitter / X
            </Label>
            <Input
              id="twitter"
              placeholder="https://twitter.com/..."
              value={data.socialMedia.twitter}
              onChange={(e) =>
                updateData({
                  socialMedia: { ...data.socialMedia, twitter: e.target.value },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="facebook" className="text-xs">
              Facebook
            </Label>
            <Input
              id="facebook"
              placeholder="https://facebook.com/..."
              value={data.socialMedia.facebook}
              onChange={(e) =>
                updateData({
                  socialMedia: { ...data.socialMedia, facebook: e.target.value },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="instagram" className="text-xs">
              Instagram
            </Label>
            <Input
              id="instagram"
              placeholder="https://instagram.com/..."
              value={data.socialMedia.instagram}
              onChange={(e) =>
                updateData({
                  socialMedia: { ...data.socialMedia, instagram: e.target.value },
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
