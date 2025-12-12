"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Globe,
  ShoppingBag,
  Briefcase,
  GraduationCap,
  Building2,
  Sparkles,
  Users,
  Camera,
} from "lucide-react";
import type { OnboardingData } from "../onboarding-wizard";

const WEBSITE_TYPES = [
  {
    id: "business",
    title: "Business Website",
    description: "Professional website for your company",
    icon: Building2,
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "portfolio",
    title: "Portfolio",
    description: "Showcase your work and projects",
    icon: Camera,
    color: "bg-purple-100 text-purple-600",
  },
  {
    id: "ecommerce",
    title: "E-Commerce",
    description: "Sell products or services online",
    icon: ShoppingBag,
    color: "bg-green-100 text-green-600",
  },
  {
    id: "saas",
    title: "SaaS Product",
    description: "Software as a Service landing page",
    icon: Sparkles,
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    id: "agency",
    title: "Agency",
    description: "Marketing or creative agency website",
    icon: Briefcase,
    color: "bg-orange-100 text-orange-600",
  },
  {
    id: "nonprofit",
    title: "Non-Profit",
    description: "Organization or charity website",
    icon: Users,
    color: "bg-pink-100 text-pink-600",
  },
  {
    id: "education",
    title: "Education",
    description: "School, course, or educational platform",
    icon: GraduationCap,
    color: "bg-yellow-100 text-yellow-600",
  },
  {
    id: "other",
    title: "Other",
    description: "Custom website type",
    icon: Globe,
    color: "bg-gray-100 text-gray-600",
  },
];

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Real Estate",
  "Retail",
  "Manufacturing",
  "Education",
  "Legal",
  "Marketing",
  "Hospitality",
  "Construction",
  "Consulting",
  "Food & Beverage",
  "Entertainment",
  "Other",
];

const TARGET_AUDIENCES = [
  "B2B (Business to Business)",
  "B2C (Business to Consumer)",
  "Enterprise",
  "Small Business",
  "Startups",
  "Consumers",
  "Students",
  "Professionals",
  "Non-profit supporters",
];

const MAIN_GOALS = [
  "Generate leads",
  "Sell products/services",
  "Build brand awareness",
  "Provide information",
  "Showcase portfolio",
  "Collect donations",
  "Educate visitors",
  "Drive app downloads",
];

interface WebsiteTypeStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function WebsiteTypeStep({ data, updateData }: WebsiteTypeStepProps) {
  return (
    <div className="space-y-6">
      {/* Website Type Selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">What type of website do you need?</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {WEBSITE_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = data.websiteType === type.id;

            return (
              <button
                key={type.id}
                type="button"
                onClick={() => updateData({ websiteType: type.id })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg ${type.color} flex items-center justify-center mb-2`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-medium text-sm text-gray-900">{type.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{type.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Industry Selection */}
      <div className="space-y-2">
        <Label htmlFor="industry">What industry are you in?</Label>
        <select
          id="industry"
          value={data.industry}
          onChange={(e) => updateData({ industry: e.target.value })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Select your industry</option>
          {INDUSTRIES.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
      </div>

      {/* Target Audience */}
      <div className="space-y-2">
        <Label htmlFor="targetAudience">Who is your target audience?</Label>
        <select
          id="targetAudience"
          value={data.targetAudience}
          onChange={(e) => updateData({ targetAudience: e.target.value })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Select target audience</option>
          {TARGET_AUDIENCES.map((audience) => (
            <option key={audience} value={audience}>
              {audience}
            </option>
          ))}
        </select>
      </div>

      {/* Main Goal */}
      <div className="space-y-2">
        <Label htmlFor="mainGoal">What&apos;s the main goal of your website?</Label>
        <select
          id="mainGoal"
          value={data.mainGoal}
          onChange={(e) => updateData({ mainGoal: e.target.value })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Select main goal</option>
          {MAIN_GOALS.map((goal) => (
            <option key={goal} value={goal}>
              {goal}
            </option>
          ))}
        </select>
      </div>

      {/* Custom industry input for "Other" */}
      {data.industry === "Other" && (
        <div className="space-y-2">
          <Label htmlFor="customIndustry">Specify your industry</Label>
          <Input
            id="customIndustry"
            placeholder="Enter your industry"
            onChange={(e) => updateData({ industry: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
