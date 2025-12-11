"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Link from "next/link";

interface BrandAssets {
  logo?: {
    url: string;
    dominantColors?: string[];
    style?: string;
    colorScheme?: string;
  };
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
}

interface ChatWidgetConfig {
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
  welcomeMessage?: string;
}

interface PersonaDetectionConfig {
  personaTypes?: string[];
  trackingEnabled?: boolean;
  adaptiveContent?: boolean;
  confidenceThreshold?: number;
}

interface SiteSettings {
  id: string;
  title: string;
  description: string;
  brand_assets: BrandAssets;
  chat_widget_enabled: boolean;
  chat_widget_config: ChatWidgetConfig;
  dynamic_pages_enabled: boolean;
  persona_detection_enabled: boolean;
  persona_detection_config: PersonaDetectionConfig;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenerateOption, setShowRegenerateOption] = useState(false);

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Website description state
  const [websiteDescription, setWebsiteDescription] = useState("");

  // Form state
  const [socialMedia, setSocialMedia] = useState({
    linkedin: "",
    twitter: "",
    facebook: "",
    instagram: "",
    youtube: "",
  });

  const [widgetEnabled, setWidgetEnabled] = useState(true);
  const [widgetConfig, setWidgetConfig] = useState<ChatWidgetConfig>({
    position: "bottom-right",
    primaryColor: "#667eea",
    welcomeMessage: "Hi! How can I help you today?",
  });

  // Dynamic pages and persona settings
  const [dynamicPagesEnabled, setDynamicPagesEnabled] = useState(true);
  const [personaEnabled, setPersonaEnabled] = useState(false);
  const [personaConfig, setPersonaConfig] = useState<PersonaDetectionConfig>({
    personaTypes: ["developer", "executive", "buyer", "end_user", "general"],
    trackingEnabled: true,
    adaptiveContent: true,
    confidenceThreshold: 0.3,
  });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/sites/${siteId}/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);

        // Initialize form state from fetched data
        if (data.description) {
          setWebsiteDescription(data.description);
        }
        if (data.brand_assets?.logo?.url) {
          setLogoPreview(data.brand_assets.logo.url);
        }
        if (data.brand_assets?.socialMedia) {
          setSocialMedia((prev) => ({
            ...prev,
            ...data.brand_assets.socialMedia,
          }));
        }
        setWidgetEnabled(data.chat_widget_enabled ?? true);
        if (data.chat_widget_config) {
          setWidgetConfig((prev) => ({
            ...prev,
            ...data.chat_widget_config,
          }));
        }
        // Load dynamic pages and persona settings
        setDynamicPagesEnabled(data.dynamic_pages_enabled ?? true);
        setPersonaEnabled(data.persona_detection_enabled ?? false);
        if (data.persona_detection_config) {
          setPersonaConfig((prev) => ({
            ...prev,
            ...data.persona_detection_config,
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/svg+xml", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPEG, PNG, SVG, or WebP.");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/sites/${siteId}/logo`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Upload failed");
      }

      const data = await res.json();
      setLogoPreview(data.url);
      toast.success("Logo uploaded successfully!");

      // Refresh settings and show regenerate option
      fetchSettings();
      setShowRegenerateOption(true);
    } catch (error) {
      console.error("Logo upload failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const res = await fetch(`/api/sites/${siteId}/logo`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to remove logo");
      }

      setLogoPreview(null);
      toast.success("Logo removed");
      fetchSettings();
    } catch (error) {
      console.error("Failed to remove logo:", error);
      toast.error("Failed to remove logo");
    }
  };

  const handleSaveSocialMedia = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_assets: {
            ...settings?.brand_assets,
            socialMedia: socialMedia,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save social media links");
      }

      toast.success("Social media links saved!");
      fetchSettings();
      setShowRegenerateOption(true);
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save social media links");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDescription = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: websiteDescription,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save description");
      }

      toast.success("Website description saved!");
      fetchSettings();
      setShowRegenerateOption(true);
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save description");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWidgetConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_widget_enabled: widgetEnabled,
          chat_widget_config: widgetConfig,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save widget settings");
      }

      toast.success("Chat widget settings saved!");
      fetchSettings();
      setShowRegenerateOption(true);
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save widget settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersonaSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dynamic_pages_enabled: dynamicPagesEnabled,
          persona_detection_enabled: personaEnabled,
          persona_detection_config: personaConfig,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save persona settings");
      }

      toast.success("Dynamic UI settings saved!");
      fetchSettings();
      setShowRegenerateOption(true);
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save persona settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateWebsite = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Failed to regenerate website");
      }

      const data = await res.json();
      toast.success("Website regenerated with new settings!");

      // Navigate to preview the new version
      router.push(`/dashboard/sites/${siteId}/preview?version=${data.versionId}`);
    } catch (error) {
      console.error("Regeneration failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to regenerate website");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/dashboard/sites/${siteId}`}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Project
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure your brand assets and website settings
            </p>
          </div>
          <Button
            onClick={handleRegenerateWebsite}
            disabled={regenerating}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {regenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Regenerating...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Regenerate Website
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue="description" className="space-y-6">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="description">Website Description</TabsTrigger>
            <TabsTrigger value="brand">Brand Assets</TabsTrigger>
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="widget">Chat Widget</TabsTrigger>
            <TabsTrigger value="persona">Dynamic UI</TabsTrigger>
          </TabsList>

          {/* Website Description Tab */}
          <TabsContent value="description">
            <Card>
              <CardHeader>
                <CardTitle>Website Description</CardTitle>
                <CardDescription>
                  Describe what you want your website to achieve. This will guide the AI in
                  generating content that matches your vision.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="websiteDescription">Your Website Vision</Label>
                    <textarea
                      id="websiteDescription"
                      rows={8}
                      className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Describe your ideal website in detail. For example:

- What is the main purpose of your website?
- What tone and style do you want? (Professional, playful, modern, classic)
- What key messages should visitors understand?
- What actions do you want visitors to take?
- Any specific design preferences (colors, layout, imagery)?
- Who is your target audience?
- What makes your business unique?"
                      value={websiteDescription}
                      onChange={(e) => setWebsiteDescription(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Be as specific as possible. The AI will use this description to tailor the
                      generated website to your needs.
                    </p>
                  </div>

                  {/* Example prompts */}
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Example descriptions:</h4>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li>
                        <strong>SaaS Product:</strong> &quot;I want a modern, tech-focused landing
                        page that emphasizes our AI capabilities. The tone should be professional
                        but approachable. Key message: Save 10+ hours per week with automation.
                        Target audience: Marketing teams at mid-size companies.&quot;
                      </li>
                      <li>
                        <strong>Local Business:</strong> &quot;Create a warm, welcoming website for
                        our family bakery. Highlight our 50-year tradition and artisan quality. Use
                        warm colors and appetizing imagery. Goal: Get customers to visit our store
                        or place orders.&quot;
                      </li>
                      <li>
                        <strong>Consulting Firm:</strong> &quot;Professional and authoritative
                        website showcasing our expertise in digital transformation. Target: C-level
                        executives. Emphasize case studies and ROI metrics. Clean, minimal design
                        with a blue/gray color scheme.&quot;
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveDescription} disabled={saving}>
                    {saving ? "Saving..." : "Save Description"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brand Assets Tab */}
          <TabsContent value="brand">
            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
                <CardDescription>
                  Upload your company logo. It will be used in website generation and displayed in
                  the header.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Preview */}
                <div className="flex items-center gap-6">
                  <div className="relative h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="object-contain p-2 w-full h-full"
                      />
                    ) : (
                      <svg
                        className="h-8 w-8 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <div className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        {uploading ? (
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
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg
                              className="mr-2 h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                              />
                            </svg>
                            Upload Logo
                          </>
                        )}
                      </div>
                    </Label>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                    />
                    <p className="text-xs text-gray-500">JPEG, PNG, SVG, or WebP. Max 5MB.</p>
                    {logoPreview && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleRemoveLogo}
                      >
                        Remove Logo
                      </Button>
                    )}
                  </div>
                </div>

                {/* Color Info */}
                {settings?.brand_assets?.logo?.dominantColors && (
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium">Detected Brand Colors</Label>
                    <div className="flex gap-2 mt-2">
                      {settings.brand_assets.logo.dominantColors.map((color, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social">
            <Card>
              <CardHeader>
                <CardTitle>Social Media Links</CardTitle>
                <CardDescription>
                  Add your social media profiles. These will be included in your generated
                  website&apos;s footer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <div className="flex gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </div>
                      <Input
                        id="linkedin"
                        placeholder="https://linkedin.com/company/..."
                        value={socialMedia.linkedin}
                        onChange={(e) =>
                          setSocialMedia((prev) => ({ ...prev, linkedin: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="twitter">Twitter / X</Label>
                    <div className="flex gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-900">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </div>
                      <Input
                        id="twitter"
                        placeholder="https://twitter.com/..."
                        value={socialMedia.twitter}
                        onChange={(e) =>
                          setSocialMedia((prev) => ({ ...prev, twitter: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <div className="flex gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </div>
                      <Input
                        id="facebook"
                        placeholder="https://facebook.com/..."
                        value={socialMedia.facebook}
                        onChange={(e) =>
                          setSocialMedia((prev) => ({ ...prev, facebook: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <div className="flex gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                      </div>
                      <Input
                        id="instagram"
                        placeholder="https://instagram.com/..."
                        value={socialMedia.instagram}
                        onChange={(e) =>
                          setSocialMedia((prev) => ({ ...prev, instagram: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="youtube">YouTube</Label>
                    <div className="flex gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-100 text-red-600">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      </div>
                      <Input
                        id="youtube"
                        placeholder="https://youtube.com/..."
                        value={socialMedia.youtube}
                        onChange={(e) =>
                          setSocialMedia((prev) => ({ ...prev, youtube: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveSocialMedia} disabled={saving}>
                    {saving ? "Saving..." : "Save Social Media Links"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Widget Tab */}
          <TabsContent value="widget">
            <Card>
              <CardHeader>
                <CardTitle>Chat Widget</CardTitle>
                <CardDescription>
                  Configure the AI-powered chat widget that appears on your generated website.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Chat Widget</Label>
                    <p className="text-sm text-gray-500">
                      Show AI chat widget on your generated website
                    </p>
                  </div>
                  <Switch checked={widgetEnabled} onCheckedChange={setWidgetEnabled} />
                </div>

                {widgetEnabled && (
                  <>
                    <div className="border-t pt-6 space-y-4">
                      {/* Position */}
                      <div className="grid gap-2">
                        <Label>Position</Label>
                        <div className="flex gap-4">
                          <Button
                            variant={
                              widgetConfig.position === "bottom-right" ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              setWidgetConfig((prev) => ({ ...prev, position: "bottom-right" }))
                            }
                          >
                            Bottom Right
                          </Button>
                          <Button
                            variant={
                              widgetConfig.position === "bottom-left" ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              setWidgetConfig((prev) => ({ ...prev, position: "bottom-left" }))
                            }
                          >
                            Bottom Left
                          </Button>
                        </div>
                      </div>

                      {/* Primary Color */}
                      <div className="grid gap-2">
                        <Label htmlFor="primaryColor">Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="primaryColor"
                            type="color"
                            value={widgetConfig.primaryColor}
                            onChange={(e) =>
                              setWidgetConfig((prev) => ({ ...prev, primaryColor: e.target.value }))
                            }
                            className="w-14 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={widgetConfig.primaryColor}
                            onChange={(e) =>
                              setWidgetConfig((prev) => ({ ...prev, primaryColor: e.target.value }))
                            }
                            placeholder="#667eea"
                            className="flex-1"
                          />
                        </div>
                      </div>

                      {/* Welcome Message */}
                      <div className="grid gap-2">
                        <Label htmlFor="welcomeMessage">Welcome Message</Label>
                        <Input
                          id="welcomeMessage"
                          placeholder="Hi! How can I help you today?"
                          value={widgetConfig.welcomeMessage}
                          onChange={(e) =>
                            setWidgetConfig((prev) => ({ ...prev, welcomeMessage: e.target.value }))
                          }
                        />
                        <p className="text-xs text-gray-500">
                          This message will be shown when visitors first open the chat.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveWidgetConfig} disabled={saving}>
                    {saving ? "Saving..." : "Save Widget Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dynamic UI / Persona Detection Tab */}
          <TabsContent value="persona">
            <div className="space-y-6">
              {/* Dynamic Pages Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Progressive Page Generation</CardTitle>
                  <CardDescription>
                    Generate minimal landing pages with on-demand segment exploration. When enabled,
                    visitors can explore Features, Solutions, Platform, and FAQ dynamically.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Dynamic Pages</Label>
                      <p className="text-sm text-gray-500">
                        Generate minimal landing page with &quot;Explore&quot; functionality
                      </p>
                    </div>
                    <Switch
                      checked={dynamicPagesEnabled}
                      onCheckedChange={setDynamicPagesEnabled}
                    />
                  </div>

                  {dynamicPagesEnabled && (
                    <div className="border-t pt-4">
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                        <h4 className="font-medium text-blue-900">How it works:</h4>
                        <ul className="mt-2 text-sm text-blue-800 space-y-1">
                          <li>1. Landing page shows hero + brief description + CTAs</li>
                          <li>2. &quot;Explore&quot; button opens segment selector</li>
                          <li>3. Clicking a segment generates that page with AI</li>
                          <li>4. Clicking items generates detailed pages on-demand</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Persona Detection Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Persona Detection</CardTitle>
                  <CardDescription>
                    AI adapts generated content based on visitor behavior patterns. Identifies if
                    visitor is a Developer, Executive, Buyer, or End User.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Persona Detection</Label>
                      <p className="text-sm text-gray-500">
                        Track visitor behavior to personalize content
                      </p>
                    </div>
                    <Switch
                      checked={personaEnabled}
                      onCheckedChange={setPersonaEnabled}
                      disabled={!dynamicPagesEnabled}
                    />
                  </div>

                  {!dynamicPagesEnabled && (
                    <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                      Enable Dynamic Pages first to use Persona Detection
                    </p>
                  )}

                  {dynamicPagesEnabled && personaEnabled && (
                    <div className="border-t pt-4 space-y-4">
                      {/* Persona Types */}
                      <div>
                        <Label className="text-sm font-medium">Detected Persona Types</Label>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                          {[
                            { id: "developer", label: "Developer", desc: "Technical users" },
                            { id: "executive", label: "Executive", desc: "Decision makers" },
                            { id: "buyer", label: "Buyer", desc: "Procurement focus" },
                            { id: "end_user", label: "End User", desc: "Daily users" },
                            { id: "general", label: "General", desc: "Default persona" },
                          ].map((persona) => (
                            <div
                              key={persona.id}
                              className="flex items-center space-x-2 p-2 rounded-lg border bg-white"
                            >
                              <input
                                type="checkbox"
                                id={`persona-${persona.id}`}
                                checked={personaConfig.personaTypes?.includes(persona.id) ?? true}
                                onChange={(e) => {
                                  setPersonaConfig((prev) => ({
                                    ...prev,
                                    personaTypes: e.target.checked
                                      ? [...(prev.personaTypes || []), persona.id]
                                      : (prev.personaTypes || []).filter((p) => p !== persona.id),
                                  }));
                                }}
                                className="rounded border-gray-300"
                              />
                              <label htmlFor={`persona-${persona.id}`} className="text-sm">
                                <span className="font-medium">{persona.label}</span>
                                <span className="text-gray-500 block text-xs">{persona.desc}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Behavior Tracking */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Behavior Tracking</Label>
                          <p className="text-sm text-gray-500">
                            Track page visits, clicks, and scroll depth
                          </p>
                        </div>
                        <Switch
                          checked={personaConfig.trackingEnabled ?? true}
                          onCheckedChange={(checked) =>
                            setPersonaConfig((prev) => ({ ...prev, trackingEnabled: checked }))
                          }
                        />
                      </div>

                      {/* Adaptive Content */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Adaptive Content</Label>
                          <p className="text-sm text-gray-500">
                            Adjust generated content tone and CTAs for persona
                          </p>
                        </div>
                        <Switch
                          checked={personaConfig.adaptiveContent ?? true}
                          onCheckedChange={(checked) =>
                            setPersonaConfig((prev) => ({ ...prev, adaptiveContent: checked }))
                          }
                        />
                      </div>

                      {/* Confidence Threshold */}
                      <div className="space-y-2">
                        <Label>Confidence Threshold</Label>
                        <p className="text-sm text-gray-500">
                          Minimum confidence to switch from &quot;General&quot; persona (0-100%)
                        </p>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={(personaConfig.confidenceThreshold ?? 0.3) * 100}
                            onChange={(e) =>
                              setPersonaConfig((prev) => ({
                                ...prev,
                                confidenceThreshold: parseInt(e.target.value) / 100,
                              }))
                            }
                            className="flex-1"
                          />
                          <span className="text-sm font-medium w-12">
                            {Math.round((personaConfig.confidenceThreshold ?? 0.3) * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Info Box */}
                      <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
                        <h4 className="font-medium text-purple-900">Content Adaptation</h4>
                        <ul className="mt-2 text-sm text-purple-800 space-y-1">
                          <li>
                            <strong>Developer:</strong> API docs, code examples, technical details
                          </li>
                          <li>
                            <strong>Executive:</strong> ROI, case studies, business value
                          </li>
                          <li>
                            <strong>Buyer:</strong> Pricing, comparisons, compliance
                          </li>
                          <li>
                            <strong>End User:</strong> Tutorials, ease of use, workflows
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSavePersonaSettings} disabled={saving}>
                      {saving ? "Saving..." : "Save Dynamic UI Settings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Regenerate Website Card */}
        {showRegenerateOption && (
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Settings Updated</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Your settings have been saved. Would you like to regenerate your website to
                    apply these changes? This will create a new version with your logo and social
                    media links.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <Button onClick={handleRegenerateWebsite} disabled={regenerating}>
                      {regenerating ? (
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
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          Regenerate Website
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowRegenerateOption(false)}
                      disabled={regenerating}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
