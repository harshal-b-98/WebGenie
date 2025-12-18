"use client";

import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Upload,
  X,
  Palette,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  Building,
} from "lucide-react";
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
  const [contactExpanded, setContactExpanded] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);

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

      {/* Contact Information - Collapsible */}
      <div className="space-y-3 border rounded-lg">
        <button
          type="button"
          onClick={() => setContactExpanded(!contactExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-gray-900">Contact Information</span>
              <span className="text-xs text-gray-500 ml-2">(Optional)</span>
              {(data.contactInfo.email || data.contactInfo.phone || data.contactInfo.address) && (
                <p className="text-xs text-green-600 mt-0.5">
                  {[
                    data.contactInfo.email && "Email",
                    data.contactInfo.phone && "Phone",
                    data.contactInfo.address && "Address",
                  ]
                    .filter(Boolean)
                    .join(", ")}{" "}
                  added
                </p>
              )}
            </div>
          </div>
          {contactExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {contactExpanded && (
          <div className="px-4 pb-4 space-y-4">
            <p className="text-sm text-gray-500">
              Add your contact details to generate a Contact Us page for your website.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="contactEmail" className="text-xs flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email Address
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="contact@yourcompany.com"
                  value={data.contactInfo.email}
                  onChange={(e) =>
                    updateData({
                      contactInfo: { ...data.contactInfo, email: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contactPhone" className="text-xs flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone Number
                </Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={data.contactInfo.phone}
                  onChange={(e) =>
                    updateData({
                      contactInfo: { ...data.contactInfo, phone: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactAddress" className="text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Address
              </Label>
              <textarea
                id="contactAddress"
                placeholder="123 Main Street, City, State 12345"
                value={data.contactInfo.address}
                onChange={(e) =>
                  updateData({
                    contactInfo: { ...data.contactInfo, address: e.target.value },
                  })
                }
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border">
              <div>
                <Label htmlFor="includeContactPage" className="font-medium text-sm cursor-pointer">
                  Add Contact Us page to website
                </Label>
                <p className="text-xs text-gray-500">
                  Show this information on a dedicated Contact page
                </p>
              </div>
              <Switch
                id="includeContactPage"
                checked={data.contactInfo.includeContactPage}
                onCheckedChange={(checked) =>
                  updateData({
                    contactInfo: { ...data.contactInfo, includeContactPage: checked },
                  })
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* About Us - Collapsible */}
      <div className="space-y-3 border rounded-lg">
        <button
          type="button"
          onClick={() => setAboutExpanded(!aboutExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Building className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-gray-900">Company Story</span>
              <span className="text-xs text-gray-500 ml-2">(Optional)</span>
              {(data.aboutInfo.missionStatement || data.aboutInfo.companyHistory) && (
                <p className="text-xs text-amber-600 mt-0.5">
                  {[
                    data.aboutInfo.companyHistory && "History",
                    data.aboutInfo.missionStatement && "Mission",
                  ]
                    .filter(Boolean)
                    .join(", ")}{" "}
                  added
                </p>
              )}
            </div>
          </div>
          {aboutExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {aboutExpanded && (
          <div className="px-4 pb-4 space-y-4">
            <p className="text-sm text-gray-500">
              Tell your company story to generate an About Us page for your website.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="companyHistory" className="text-xs">
                  Company History
                </Label>
                <textarea
                  id="companyHistory"
                  placeholder="Founded in 2020, our company started with a simple mission..."
                  value={data.aboutInfo.companyHistory}
                  onChange={(e) =>
                    updateData({
                      aboutInfo: { ...data.aboutInfo, companyHistory: e.target.value },
                    })
                  }
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="missionStatement" className="text-xs">
                    Mission Statement
                  </Label>
                  <textarea
                    id="missionStatement"
                    placeholder="Our mission is to..."
                    value={data.aboutInfo.missionStatement}
                    onChange={(e) =>
                      updateData({
                        aboutInfo: { ...data.aboutInfo, missionStatement: e.target.value },
                      })
                    }
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="visionStatement" className="text-xs">
                    Vision Statement
                  </Label>
                  <textarea
                    id="visionStatement"
                    placeholder="We envision a world where..."
                    value={data.aboutInfo.visionStatement}
                    onChange={(e) =>
                      updateData({
                        aboutInfo: { ...data.aboutInfo, visionStatement: e.target.value },
                      })
                    }
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="companyValues" className="text-xs">
                  Company Values
                </Label>
                <Input
                  id="companyValues"
                  placeholder="Innovation, Integrity, Excellence, Customer Focus"
                  value={data.aboutInfo.companyValues}
                  onChange={(e) =>
                    updateData({
                      aboutInfo: { ...data.aboutInfo, companyValues: e.target.value },
                    })
                  }
                />
                <p className="text-xs text-gray-400">Separate values with commas</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border">
              <div>
                <Label htmlFor="includeAboutPage" className="font-medium text-sm cursor-pointer">
                  Add About Us page to website
                </Label>
                <p className="text-xs text-gray-500">
                  Show this information on a dedicated About page
                </p>
              </div>
              <Switch
                id="includeAboutPage"
                checked={data.aboutInfo.includeAboutPage}
                onCheckedChange={(checked) =>
                  updateData({
                    aboutInfo: { ...data.aboutInfo, includeAboutPage: checked },
                  })
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Feature Settings */}
      <div className="space-y-4 pt-4 border-t">
        <Label className="text-base font-semibold">Feature Settings</Label>
        <p className="text-sm text-gray-500">
          Choose which AI-powered features to enable for your website
        </p>

        {/* Dynamic Page Generation Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50/50">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dynamicPages" className="font-medium cursor-pointer">
                Dynamic Page Generation
              </Label>
              <p className="text-xs text-gray-500">
                Automatically generate new pages when visitors ask questions not covered by existing
                content
              </p>
            </div>
          </div>
          <Switch
            id="dynamicPages"
            checked={data.dynamicPagesEnabled}
            onCheckedChange={(checked) => updateData({ dynamicPagesEnabled: checked })}
          />
        </div>

        {/* Chat Widget Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50/50">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="chatWidget" className="font-medium cursor-pointer">
                AI Chat Widget
              </Label>
              <p className="text-xs text-gray-500">
                Enable an AI-powered chat assistant to help visitors find information on your
                website
              </p>
            </div>
          </div>
          <Switch
            id="chatWidget"
            checked={data.chatWidgetEnabled}
            onCheckedChange={(checked) => updateData({ chatWidgetEnabled: checked })}
          />
        </div>
      </div>
    </div>
  );
}
