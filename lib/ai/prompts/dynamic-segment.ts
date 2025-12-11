/**
 * Dynamic Segment Type Detection
 *
 * Detects the type of segment from the slug name and routes to the appropriate
 * prompt generator. This eliminates the hardcoded segment type switch that
 * caused all segments to become "features" pages.
 */

import {
  generateFeaturesPagePrompt,
  generateSolutionsPagePrompt,
  generatePlatformPagePrompt,
  generateFAQPagePrompt,
  FEATURES_PAGE_SYSTEM_PROMPT,
  SOLUTIONS_PAGE_SYSTEM_PROMPT,
  PLATFORM_PAGE_SYSTEM_PROMPT,
  FAQ_PAGE_SYSTEM_PROMPT,
} from "./pages";

import { generateGenericPagePrompt, GENERIC_PAGE_SYSTEM_PROMPT } from "./pages/generic";

/**
 * Extended segment types - includes both specific and generic
 */
export type ExtendedSegmentType =
  | "features"
  | "solutions"
  | "platform"
  | "faq"
  | "case-studies"
  | "industries"
  | "about"
  | "contact"
  | "pricing"
  | "resources"
  | "integrations"
  | "generic";

/**
 * Segment type patterns for detection
 */
const SEGMENT_TYPE_PATTERNS: Record<ExtendedSegmentType, string[]> = {
  features: ["feature", "capabilit", "benefit", "function"],
  solutions: ["solution", "offering", "service"],
  platform: ["platform", "technology", "architecture", "tech-stack", "infrastructure"],
  faq: ["faq", "question", "help", "support", "knowledge-base"],
  "case-studies": ["case-stud", "success-stor", "customer-stor", "testimonial", "review", "client"],
  industries: ["industr", "sector", "vertical", "market"],
  about: ["about", "company", "team", "who-we", "our-story", "mission", "vision", "value"],
  contact: ["contact", "get-in-touch", "reach", "location", "office"],
  pricing: ["pricing", "plan", "cost", "subscription", "tier"],
  resources: ["resource", "doc", "guide", "whitepaper", "ebook", "download", "blog", "article"],
  integrations: ["integrat", "connect", "partner", "app", "plugin", "extension"],
  generic: [],
};

/**
 * Detect segment type from slug
 */
export function detectSegmentType(segmentSlug: string): ExtendedSegmentType {
  const slug = segmentSlug.toLowerCase().replace(/[_\s]/g, "-");

  // Check each type's patterns
  for (const [type, patterns] of Object.entries(SEGMENT_TYPE_PATTERNS)) {
    if (type === "generic") continue;

    for (const pattern of patterns) {
      if (slug.includes(pattern)) {
        return type as ExtendedSegmentType;
      }
    }
  }

  return "generic";
}

/**
 * Get the appropriate system prompt for a segment type
 */
export function getSystemPromptForSegment(segmentType: ExtendedSegmentType): string {
  switch (segmentType) {
    case "features":
      return FEATURES_PAGE_SYSTEM_PROMPT;
    case "solutions":
      return SOLUTIONS_PAGE_SYSTEM_PROMPT;
    case "platform":
      return PLATFORM_PAGE_SYSTEM_PROMPT;
    case "faq":
      return FAQ_PAGE_SYSTEM_PROMPT;
    // All other types use the generic prompt which adapts to content
    default:
      return GENERIC_PAGE_SYSTEM_PROMPT;
  }
}

/**
 * Base requirements for all segment page generators
 */
export interface BaseSegmentRequirements {
  documentContent?: string;
  companyName?: string;
  logoUrl?: string | null;
  brandColors?: string;
  personaEmphasis?: string;
}

/**
 * Extended requirements that include segment info
 */
export interface DynamicSegmentRequirements extends BaseSegmentRequirements {
  segmentName: string;
  segmentSlug: string;
  availableSegments?: Array<{ name: string; slug: string }>;
  relatedSegments?: Array<{ name: string; slug: string; description: string }>;
  availableDetailPages?: string[];
}

/**
 * Generate cross-navigation section for prompts
 */
function generateCrossNavigationPrompt(
  relatedSegments?: Array<{ name: string; slug: string; description: string }>,
  availableDetailPages?: string[]
): string {
  let prompt = "\n\n--- CROSS-NAVIGATION REQUIREMENTS (Phase 4) ---\n";

  if (relatedSegments && relatedSegments.length > 0) {
    prompt += '\nRELATED SEGMENTS FOR "EXPLORE MORE" SECTION:\n';
    relatedSegments.forEach((seg) => {
      prompt += `- ${seg.name} (data-segment="${seg.slug}"): ${seg.description}\n`;
    });
    prompt += '\nInclude an "Explore More" or "Related Topics" section with these links.\n';
  }

  if (availableDetailPages && availableDetailPages.length > 0) {
    prompt += "\nAVAILABLE DETAIL PAGES (only link to these):\n";
    availableDetailPages.slice(0, 20).forEach((page) => {
      prompt += `- ${page}\n`;
    });
    prompt +=
      '\nIMPORTANT: Only create "Learn More" or detail links for items that exist in this list.\n';
    prompt += "Do NOT create buttons/links for non-existent pages.\n";
  } else {
    prompt +=
      '\nNOTE: No detail pages are available. Do NOT include "Learn More" buttons for items.\n';
    prompt += "Instead, show all information inline or use expandable sections.\n";
  }

  return prompt;
}

/**
 * Generate the appropriate prompt for any segment type
 */
export function generateDynamicSegmentPrompt(
  segmentType: ExtendedSegmentType,
  requirements: DynamicSegmentRequirements
): string {
  const baseRequirements = {
    documentContent: requirements.documentContent,
    companyName: requirements.companyName,
    logoUrl: requirements.logoUrl,
    brandColors: requirements.brandColors,
    personaEmphasis: requirements.personaEmphasis,
  };

  // Generate cross-navigation context
  const crossNavPrompt = generateCrossNavigationPrompt(
    requirements.relatedSegments,
    requirements.availableDetailPages
  );

  // Use specific prompt generators for known types
  let basePrompt: string;
  switch (segmentType) {
    case "features":
      basePrompt = generateFeaturesPagePrompt(baseRequirements);
      break;
    case "solutions":
      basePrompt = generateSolutionsPagePrompt(baseRequirements);
      break;
    case "platform":
      basePrompt = generatePlatformPagePrompt(baseRequirements);
      break;
    case "faq":
      basePrompt = generateFAQPagePrompt(baseRequirements);
      break;
    // All other types use the generic prompt which adapts
    default:
      basePrompt = generateGenericPagePrompt({
        ...baseRequirements,
        segmentName: requirements.segmentName,
        segmentSlug: requirements.segmentSlug,
        availableSegments: requirements.availableSegments,
        relatedSegments: requirements.relatedSegments,
      });
      break;
  }

  // Append cross-navigation requirements to all prompts
  return basePrompt + crossNavPrompt;
}

/**
 * Convert segment slug to display name
 */
export function formatSegmentName(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
