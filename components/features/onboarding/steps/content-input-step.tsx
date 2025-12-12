"use client";

import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, Upload, X, FileUp, Type } from "lucide-react";
import type { OnboardingData } from "../onboarding-wizard";

interface ContentInputStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function ContentInputStep({ data, updateData }: ContentInputStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
    ];

    const validFiles = files.filter((file) => {
      if (!validTypes.includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Please upload PDF, DOC, DOCX, TXT, or MD files.`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`File too large: ${file.name}. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    updateData({ documents: [...data.documents, ...validFiles] });
  };

  const removeDocument = (index: number) => {
    const newDocuments = [...data.documents];
    newDocuments.splice(index, 1);
    updateData({ documents: newDocuments });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-6">
      {/* Content Method Selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">How would you like to provide content?</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => updateData({ contentMethod: "text" })}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              data.contentMethod === "text"
                ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Type className="w-6 h-6 text-indigo-600 mb-2" />
            <h3 className="font-medium text-sm">Type Content</h3>
            <p className="text-xs text-gray-500 mt-1">Enter your business information manually</p>
          </button>

          <button
            type="button"
            onClick={() => updateData({ contentMethod: "document" })}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              data.contentMethod === "document"
                ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <FileUp className="w-6 h-6 text-indigo-600 mb-2" />
            <h3 className="font-medium text-sm">Upload Documents</h3>
            <p className="text-xs text-gray-500 mt-1">Upload existing documents (PDF, DOC, etc.)</p>
          </button>

          <button
            type="button"
            onClick={() => updateData({ contentMethod: "both" })}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              data.contentMethod === "both"
                ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex gap-1 mb-2">
              <Type className="w-5 h-5 text-indigo-600" />
              <span className="text-indigo-600">+</span>
              <FileUp className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-medium text-sm">Both</h3>
            <p className="text-xs text-gray-500 mt-1">Type content and upload documents</p>
          </button>
        </div>
      </div>

      {/* Text Content Input */}
      {(data.contentMethod === "text" || data.contentMethod === "both") && (
        <div className="space-y-2">
          <Label htmlFor="textContent" className="text-base font-semibold">
            Business Information
          </Label>
          <p className="text-sm text-gray-500">
            Tell us about your business. Include services, products, unique value propositions, team
            info, testimonials, FAQs, etc.
          </p>
          <textarea
            id="textContent"
            placeholder={`Example content:

ABOUT US
We are a leading provider of AI-powered solutions for small businesses. Founded in 2020, our mission is to make enterprise technology accessible to everyone.

OUR SERVICES
- Website Development
- Digital Marketing
- SEO Optimization
- Brand Strategy

TESTIMONIALS
"Amazing service! They transformed our online presence." - John D., CEO

CONTACT
Email: hello@example.com
Phone: (555) 123-4567
Address: 123 Main St, City, ST 12345`}
            value={data.textContent}
            onChange={(e) => updateData({ textContent: e.target.value })}
            rows={12}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
          />
          <p className="text-xs text-gray-500">
            {data.textContent.length} characters •{" "}
            {data.textContent.split(/\s+/).filter(Boolean).length} words
          </p>
        </div>
      )}

      {/* Document Upload */}
      {(data.contentMethod === "document" || data.contentMethod === "both") && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">Upload Documents</Label>
          <p className="text-sm text-gray-500">
            Upload documents containing your business information (brochures, about pages, service
            descriptions, etc.)
          </p>

          {/* Upload Area */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-1">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-xs text-gray-400">PDF, DOC, DOCX, TXT, MD • Max 10MB per file</p>
          </div>

          {/* Uploaded Files List */}
          {data.documents.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Uploaded Documents ({data.documents.length})</Label>
              <div className="space-y-2">
                {data.documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{doc.name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(doc.size)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <h4 className="font-medium text-blue-900 mb-2">Tips for great results:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Include your unique value proposition</li>
          <li>Add specific services or products with descriptions</li>
          <li>Include real customer testimonials if available</li>
          <li>Add contact information and business hours</li>
          <li>Mention any awards, certifications, or partnerships</li>
        </ul>
      </div>
    </div>
  );
}
