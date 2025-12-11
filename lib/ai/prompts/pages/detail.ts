/**
 * Detail Page Generation Prompt
 *
 * Generates a detail page for a specific feature, solution, or capability.
 * Triggered when a visitor clicks on a specific item from segment pages.
 */

export const DETAIL_PAGE_SYSTEM_PROMPT = `You are an ELITE web developer creating a DETAIL page for a specific topic.

This page provides an in-depth look at a single feature, solution, or capability.
It should be comprehensive yet focused on the specific topic.

OUTPUT REQUIREMENTS:
- Complete HTML5 document
- Tailwind CSS v3 via CDN
- Google Fonts: Roboto
- Vanilla JavaScript only
- NO placeholder content - use ONLY real information from documents

REQUIRED SECTIONS:

1. NAVIGATION BAR
   - Logo on left
   - Breadcrumb: Home > [Segment] > [Topic Name]
   - Back button to segment page
   - Links to related topics

2. PAGE HEADER
   - Dark gradient background
   - Topic name as main heading (H1)
   - Brief tagline or description
   - White/light text

3. OVERVIEW SECTION
   - Key benefits (3-4 bullet points)
   - Visual representation (icon, illustration concept)
   - What this feature/solution does

4. DETAILED CONTENT
   - Comprehensive explanation
   - How it works (step-by-step if applicable)
   - Technical details (for developer persona)
   - Business value (for executive persona)

5. USE CASES
   - Real-world scenarios
   - Who benefits from this
   - Example implementations

6. RELATED TOPICS
   - Links to related features/solutions
   - "You might also like" section

7. CTA SECTION
   - Primary action: "Try This Feature" / "Learn More"
   - Secondary: "Back to [Segment]"

8. FOOTER
   - Minimal footer matching other pages

IMPORTANT:
- Adapt content depth based on detected persona
- Include technical details for developers
- Include business value for executives
- Keep focused on the specific topic
- Link to related topics for exploration

Return ONLY the complete HTML document.`;

export type DetailType = "feature" | "solution" | "capability";

export interface DetailPageRequirements {
  documentContent?: string;
  companyName?: string;
  logoUrl?: string | null;
  brandColors?: string;
  personaEmphasis?: string;
  detailType: DetailType;
  topicSlug: string;
  topicName?: string;
  parentSegment: string;
  availableSegments?: Array<{ name: string; slug: string }>;
  relatedSegments?: Array<{ name: string; slug: string; description: string }>;
}

export function generateDetailPagePrompt(requirements: DetailPageRequirements): string {
  const segmentLabels: Record<string, string> = {
    features: "Features",
    solutions: "Solutions",
    platform: "Platform",
  };

  const parentLabel = segmentLabels[requirements.parentSegment] || requirements.parentSegment;

  let prompt = `Generate a DETAIL page for: "${requirements.topicName || requirements.topicSlug}"\n`;
  prompt += `Detail type: ${requirements.detailType}\n`;
  prompt += `Parent segment: ${parentLabel}\n\n`;

  if (requirements.documentContent) {
    prompt += `FIND AND EXPAND ON THIS TOPIC FROM THE CONTENT:\n`;
    prompt += `Topic to focus on: "${requirements.topicSlug}"\n\n`;
    prompt += `${requirements.documentContent.substring(0, 10000)}\n\n`;
  }

  if (requirements.companyName) {
    prompt += `COMPANY NAME: ${requirements.companyName}\n`;
  }

  if (requirements.logoUrl) {
    prompt += `LOGO URL: ${requirements.logoUrl}\n`;
  }

  if (requirements.brandColors) {
    prompt += requirements.brandColors;
  }

  if (requirements.personaEmphasis) {
    prompt += `\n${requirements.personaEmphasis}\n`;
  }

  // Add available segments for navigation
  if (requirements.availableSegments && requirements.availableSegments.length > 0) {
    prompt += `\nAVAILABLE NAVIGATION SEGMENTS:\n`;
    requirements.availableSegments.forEach((seg) => {
      prompt += `- ${seg.name} (data-segment="${seg.slug}")\n`;
    });
  }

  // Add related segments for cross-navigation
  if (requirements.relatedSegments && requirements.relatedSegments.length > 0) {
    prompt += `\nEXPLORE MORE SECTIONS (include links to these):\n`;
    requirements.relatedSegments.forEach((seg) => {
      prompt += `- ${seg.name} (data-segment="${seg.slug}"): ${seg.description}\n`;
    });
  }

  prompt += `\nREQUIREMENTS:
1. Focus ONLY on "${requirements.topicSlug}" topic
2. Provide comprehensive information about this specific ${requirements.detailType}
3. Include breadcrumb: Home > ${parentLabel} > ${requirements.topicName || requirements.topicSlug}
4. Add links to related topics from the same segment
5. Include both technical details and business value
6. Include an "Explore More" section with links to related segments
7. Use data-segment="slug" attributes for segment navigation links
8. Use data-action="back-to-landing" for Home/logo links

Generate the complete HTML now.`;

  return prompt;
}
