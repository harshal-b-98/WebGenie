/**
 * Dynamic Page Generation Prompts
 *
 * Exports all page-specific prompts for the progressive UI generation system.
 */

// Import for local use
import { LANDING_PAGE_SYSTEM_PROMPT as LandingPrompt } from "./landing";
import { FEATURES_PAGE_SYSTEM_PROMPT as FeaturesPrompt } from "./features";
import { SOLUTIONS_PAGE_SYSTEM_PROMPT as SolutionsPrompt } from "./solutions";
import { PLATFORM_PAGE_SYSTEM_PROMPT as PlatformPrompt } from "./platform";
import { FAQ_PAGE_SYSTEM_PROMPT as FaqPrompt } from "./faq";
import { DETAIL_PAGE_SYSTEM_PROMPT as DetailPrompt } from "./detail";
import { GENERIC_PAGE_SYSTEM_PROMPT as GenericPrompt } from "./generic";

// Landing page (minimal, focused)
export {
  LANDING_PAGE_SYSTEM_PROMPT,
  generateLandingPagePrompt,
  type LandingPageRequirements,
} from "./landing";

// Segment pages
export {
  FEATURES_PAGE_SYSTEM_PROMPT,
  generateFeaturesPagePrompt,
  type FeaturesPageRequirements,
} from "./features";

export {
  SOLUTIONS_PAGE_SYSTEM_PROMPT,
  generateSolutionsPagePrompt,
  type SolutionsPageRequirements,
} from "./solutions";

export {
  PLATFORM_PAGE_SYSTEM_PROMPT,
  generatePlatformPagePrompt,
  type PlatformPageRequirements,
} from "./platform";

export { FAQ_PAGE_SYSTEM_PROMPT, generateFAQPagePrompt, type FAQPageRequirements } from "./faq";

// Detail pages
export {
  DETAIL_PAGE_SYSTEM_PROMPT,
  generateDetailPagePrompt,
  type DetailPageRequirements,
  type DetailType,
} from "./detail";

// Generic fallback page (for any segment type)
export {
  GENERIC_PAGE_SYSTEM_PROMPT,
  generateGenericPagePrompt,
  type GenericPageRequirements,
} from "./generic";

// Page types
export type PageType = "landing" | "segment" | "detail";
export type SegmentType = "features" | "solutions" | "platform" | "faq";

// Helper to get the correct system prompt based on page type
export function getSystemPromptForPage(pageType: PageType, segmentType?: SegmentType): string {
  if (pageType === "landing") {
    return LandingPrompt;
  }

  if (pageType === "detail") {
    return DetailPrompt;
  }

  // Segment pages
  switch (segmentType) {
    case "features":
      return FeaturesPrompt;
    case "solutions":
      return SolutionsPrompt;
    case "platform":
      return PlatformPrompt;
    case "faq":
      return FaqPrompt;
    default:
      return GenericPrompt; // Use generic prompt for unknown segment types
  }
}
