"use client";

import { Button } from "@/components/ui/button";
import {
  Globe,
  Building2,
  Users,
  Target,
  Palette,
  FileText,
  Image,
  Share2,
  Edit2,
  Mail,
  Phone,
  MapPin,
  BookOpen,
} from "lucide-react";
import type { OnboardingData } from "../onboarding-wizard";

interface ReviewStepProps {
  data: OnboardingData;
  onEditStep: (step: number) => void;
}

export function ReviewStep({ data, onEditStep }: ReviewStepProps) {
  const hasSocialLinks = Object.values(data.socialMedia).some((v) => v.trim());
  const hasContactInfo =
    data.contactInfo.email.trim() ||
    data.contactInfo.phone.trim() ||
    data.contactInfo.address.trim();
  const hasAboutInfo =
    data.aboutInfo.companyHistory.trim() ||
    data.aboutInfo.missionStatement.trim() ||
    data.aboutInfo.visionStatement.trim() ||
    data.aboutInfo.companyValues.trim();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Review Your Setup</h3>
        <p className="text-sm text-gray-500">
          Make sure everything looks good before creating your website
        </p>
      </div>

      {/* Website Type Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Website Type
          </h4>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(1)}>
            <Edit2 className="w-3 h-3 mr-1" />
            Edit
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Type:</span>
            <span className="ml-2 font-medium capitalize">
              {data.websiteType || "Not selected"}
            </span>
          </div>
          {data.industry && (
            <div className="flex items-center gap-1">
              <Building2 className="w-3 h-3 text-gray-400" />
              <span className="text-gray-500">Industry:</span>
              <span className="ml-1 font-medium">{data.industry}</span>
            </div>
          )}
          {data.targetAudience && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-gray-400" />
              <span className="text-gray-500">Audience:</span>
              <span className="ml-1 font-medium">{data.targetAudience}</span>
            </div>
          )}
          {data.mainGoal && (
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3 text-gray-400" />
              <span className="text-gray-500">Goal:</span>
              <span className="ml-1 font-medium">{data.mainGoal}</span>
            </div>
          )}
        </div>
      </div>

      {/* Brand Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Brand Setup
          </h4>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(2)}>
            <Edit2 className="w-3 h-3 mr-1" />
            Edit
          </Button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-sm text-gray-500">Project Name:</span>
              <span className="ml-2 font-medium">{data.projectName || "Not set"}</span>
            </div>
          </div>

          {data.description && (
            <div>
              <span className="text-sm text-gray-500">Description:</span>
              <p className="text-sm mt-1 text-gray-700">{data.description}</p>
            </div>
          )}

          <div className="flex items-center gap-4">
            {/* Logo Preview */}
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <span className="text-sm text-gray-500">Logo:</span>
              {data.logoPreview ? (
                <div className="w-8 h-8 rounded border overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.logoPreview} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <span className="text-sm text-gray-400">Not uploaded</span>
              )}
            </div>

            {/* Color Preview */}
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Color:</span>
              <div
                className="w-6 h-6 rounded-full border"
                style={{ backgroundColor: data.primaryColor }}
              />
              <span className="text-xs text-gray-500">{data.primaryColor}</span>
            </div>
          </div>

          {/* Social Links */}
          {hasSocialLinks && (
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Social:</span>
              <div className="flex gap-2">
                {data.socialMedia.linkedin && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    LinkedIn
                  </span>
                )}
                {data.socialMedia.twitter && (
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    Twitter
                  </span>
                )}
                {data.socialMedia.facebook && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Facebook
                  </span>
                )}
                {data.socialMedia.instagram && (
                  <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded">
                    Instagram
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information Section */}
      {(hasContactInfo || data.contactInfo.includeContactPage) && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contact Information
              {data.contactInfo.includeContactPage && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  Contact Page Enabled
                </span>
              )}
            </h4>
            <Button variant="ghost" size="sm" onClick={() => onEditStep(2)}>
              <Edit2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            {data.contactInfo.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500">Email:</span>
                <span className="font-medium">{data.contactInfo.email}</span>
              </div>
            )}
            {data.contactInfo.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500">Phone:</span>
                <span className="font-medium">{data.contactInfo.phone}</span>
              </div>
            )}
            {data.contactInfo.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500">Address:</span>
                <span className="font-medium">{data.contactInfo.address}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* About Information Section */}
      {(hasAboutInfo || data.aboutInfo.includeAboutPage) && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              About Information
              {data.aboutInfo.includeAboutPage && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  About Page Enabled
                </span>
              )}
            </h4>
            <Button variant="ghost" size="sm" onClick={() => onEditStep(2)}>
              <Edit2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            {data.aboutInfo.companyHistory && (
              <div>
                <span className="text-gray-500">Company History:</span>
                <p className="text-sm mt-1 text-gray-700 line-clamp-2">
                  {data.aboutInfo.companyHistory}
                </p>
              </div>
            )}
            {data.aboutInfo.missionStatement && (
              <div>
                <span className="text-gray-500">Mission:</span>
                <p className="text-sm mt-1 text-gray-700 line-clamp-2">
                  {data.aboutInfo.missionStatement}
                </p>
              </div>
            )}
            {data.aboutInfo.visionStatement && (
              <div>
                <span className="text-gray-500">Vision:</span>
                <p className="text-sm mt-1 text-gray-700 line-clamp-2">
                  {data.aboutInfo.visionStatement}
                </p>
              </div>
            )}
            {data.aboutInfo.companyValues && (
              <div>
                <span className="text-gray-500">Values:</span>
                <p className="text-sm mt-1 text-gray-700 line-clamp-2">
                  {data.aboutInfo.companyValues}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Content
          </h4>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(3)}>
            <Edit2 className="w-3 h-3 mr-1" />
            Edit
          </Button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Method:</span>
            <span className="font-medium capitalize">{data.contentMethod}</span>
          </div>

          {data.textContent && (
            <div>
              <span className="text-gray-500">Text content:</span>
              <span className="ml-2">
                {data.textContent.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
          )}

          {data.documents.length > 0 && (
            <div>
              <span className="text-gray-500">Documents:</span>
              <span className="ml-2">{data.documents.length} file(s)</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {data.documents.map((doc, i) => (
                  <span key={i} className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                    {doc.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ready Message */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 text-center">
        <h4 className="font-semibold text-indigo-900">Ready to create your website!</h4>
        <p className="text-sm text-indigo-700 mt-1">
          Click &quot;Create & Generate Website&quot; to start the AI generation process.
        </p>
      </div>
    </div>
  );
}
