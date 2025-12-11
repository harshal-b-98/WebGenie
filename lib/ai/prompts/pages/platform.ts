/**
 * Platform Segment Page Generation Prompt
 *
 * Generates a Platform/Technical Overview page with:
 * - Architecture overview
 * - Technical capabilities
 * - Integration options
 * - Security and compliance
 * - API/SDK information
 */

export const PLATFORM_PAGE_SYSTEM_PROMPT = `You are an ELITE web developer creating a PLATFORM OVERVIEW page.

This page is generated when a visitor clicks "Platform" from the segment explorer.
It should provide technical details for developers and technical evaluators.

OUTPUT REQUIREMENTS:
- Complete HTML5 document
- Tailwind CSS v3 via CDN
- Google Fonts: Roboto
- Vanilla JavaScript only
- NO placeholder content - use ONLY real technical details from documents

REQUIRED SECTIONS:

1. NAVIGATION BAR
   - Logo on left (clickable, data-action="back-to-landing")
   - Navigation links: Home (data-action="back-to-landing"), Features (data-segment="features"), Solutions (data-segment="solutions"), FAQ (data-segment="faq")
   - Current page "Platform" highlighted
   - "Get Started" button on right
   - Sticky on scroll

2. PAGE HEADER
   - Dark gradient background
   - Breadcrumb: Home > Platform (Home is clickable with data-action="back-to-landing")
   - "Platform" or "Under the Hood" as main heading (H1)
   - Tagline about technical excellence
   - White/light text

3. ARCHITECTURE OVERVIEW
   - Visual representation (simplified diagram in HTML/CSS)
   - Key components explained
   - How parts work together

4. TECHNICAL CAPABILITIES
   - Grid of technical features
   - Performance metrics if available
   - Scalability information
   - Each capability clickable if detail exists: data-capability-id="[slug]"

5. INTEGRATIONS
   - Available integrations
   - API capabilities
   - SDK information
   - Code snippets if appropriate (basic examples)

6. SECURITY & COMPLIANCE
   - Security features
   - Compliance certifications (only if mentioned in documents)
   - Data handling practices

7. DEVELOPER RESOURCES
   - Links to documentation (placeholder)
   - API reference (placeholder)
   - Getting started guide summary

8. EXPLORE OTHER SECTIONS
   - Section with links to other pages:
     * "View Features" button (data-segment="features")
     * "View Solutions" button (data-segment="solutions")
     * "Frequently Asked Questions" button (data-segment="faq")

9. CTA SECTION
   - "Get Started" primary button
   - "Back to Home" secondary button (data-action="back-to-landing")

10. FOOTER
   - Logo (data-action="back-to-landing")
   - Quick links with data-segment attributes
   - Copyright

CRITICAL DATA ATTRIBUTES:
- All clickable capability cards: data-capability-id="[slug]"
- Navigation to other segments: data-segment="[segment-name]"
- Back to landing page: data-action="back-to-landing"
- This page targets TECHNICAL audiences

Return ONLY the complete HTML document.`;

export interface PlatformPageRequirements {
  documentContent?: string;
  companyName?: string;
  logoUrl?: string | null;
  brandColors?: string;
  personaEmphasis?: string;
}

export function generatePlatformPagePrompt(requirements: PlatformPageRequirements): string {
  let prompt = `Generate a comprehensive PLATFORM/TECHNICAL OVERVIEW page.\n\n`;

  if (requirements.documentContent) {
    prompt += `EXTRACT ALL TECHNICAL DETAILS FROM THIS CONTENT:\n`;
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

  prompt += `\nREQUIREMENTS:
1. Extract architecture, API, integration, and security information
2. Each capability card should have data-capability-id="[slug]" for detail navigation
3. Include technical diagrams using HTML/CSS (boxes, arrows)
4. Add code snippet examples where relevant
5. Include breadcrumb navigation: Home > Platform
6. Target technical audiences (developers, architects, CTOs)

Generate the complete HTML now.`;

  return prompt;
}
