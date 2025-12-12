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
  availableDetailPages?: string[],
  currentSegment?: string
): string {
  let prompt = "\n\n--- CRITICAL NAVIGATION REQUIREMENTS ---\n";

  prompt += `
MANDATORY: ALL clickable elements MUST have proper data attributes. NEVER use plain href="#" links.

CORRECT DATA ATTRIBUTE PATTERNS:
1. Segment navigation: <a href="#" data-segment="segment-slug">Segment Name</a>
2. Topic/Item detail: <button data-topic="topic-slug" data-parent-segment="${currentSegment || "general"}">Topic Name</button>
3. Back to home: <a href="#" data-action="back-to-landing">Home</a>
4. CTA buttons: <button data-action="cta-primary" data-cta-type="demo">Schedule Demo</button>

WRONG (causes navigation to break):
- <a href="#">Link</a>  ← NEVER DO THIS
- <a href="#section">Link</a>  ← Only for same-page anchors

FOR CARDS/ITEMS that should open detail pages:
<div data-topic="item-slug" data-parent-segment="${currentSegment || "general"}" class="cursor-pointer ...">
  <h3>Item Title</h3>
  <p>Description</p>
</div>
`;

  if (relatedSegments && relatedSegments.length > 0) {
    prompt += '\n\nRELATED SEGMENTS FOR "EXPLORE MORE" SECTION:\n';
    relatedSegments.forEach((seg) => {
      prompt += `- <a href="#" data-segment="${seg.slug}" class="...">${seg.name}</a> - ${seg.description}\n`;
    });
    prompt +=
      "\nYou MUST include an 'Explore More' or 'Related Topics' section with these clickable links.\n";
  }

  if (availableDetailPages && availableDetailPages.length > 0) {
    prompt += "\nAVAILABLE TOPICS (create detail links for these):\n";
    availableDetailPages.slice(0, 15).forEach((page) => {
      const parts = page.split("/");
      const topicSlug = parts[parts.length - 1];
      const parentSeg = parts.length > 1 ? parts[0] : currentSegment || "general";
      prompt += `- <button data-topic="${topicSlug}" data-parent-segment="${parentSeg}">${formatSlugToTitle(topicSlug)}</button>\n`;
    });
  } else {
    prompt += "\nNo specific topic pages available. For 'Learn More' actions, use CTA form:\n";
    prompt += '<button data-action="cta-primary" data-cta-type="contact">Learn More</button>\n';
  }

  return prompt;
}

/**
 * Convert slug to readable title
 */
function formatSlugToTitle(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

  // Generate cross-navigation context with current segment for proper linking
  const crossNavPrompt = generateCrossNavigationPrompt(
    requirements.relatedSegments,
    requirements.availableDetailPages,
    requirements.segmentSlug
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
