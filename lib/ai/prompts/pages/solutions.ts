/**
 * Solutions Segment Page Generation Prompt
 *
 * Generates a Solutions Overview page with:
 * - Use cases and industries served
 * - Problem-solution format
 * - Industry-specific solutions
 * - Case studies or success stories
 */

export const SOLUTIONS_PAGE_SYSTEM_PROMPT = `You are an ELITE web developer creating a SOLUTIONS OVERVIEW page.

This page is generated dynamically when a visitor clicks "Solutions".
It should showcase how the product/service solves real problems for different audiences.

OUTPUT REQUIREMENTS:
- Complete HTML5 document
- Tailwind CSS v3 via CDN
- Google Fonts: Roboto
- Vanilla JavaScript only
- NO placeholder content - use ONLY real solutions from documents

REQUIRED SECTIONS:

1. NAVIGATION BAR
   - Logo on left (clickable, data-action="back-to-landing")
   - Navigation links: Home (data-action="back-to-landing"), Features (data-segment="features"), Platform (data-segment="platform"), FAQ (data-segment="faq")
   - Current page "Solutions" highlighted
   - "Get Started" button on right
   - Sticky on scroll

2. PAGE HEADER
   - Dark gradient background
   - Breadcrumb: Home > Solutions (Home is clickable with data-action="back-to-landing")
   - "Solutions" as main heading (H1)
   - Tagline about solving real problems
   - White/light text

3. SOLUTIONS BY USE CASE
   - Cards for each use case/problem solved
   - Problem → Solution format
   - Each card MUST have: data-solution-id="[slug]" and cursor-pointer class
   - Hover effects: hover:shadow-lg hover:scale-105 transition
   - Icons representing each use case

4. SOLUTIONS BY INDUSTRY (if applicable)
   - Industry-specific solutions with data-solution-id attributes
   - Tailored messaging per industry
   - Grid or list format

5. CASE STUDIES / SUCCESS STORIES
   - Real examples from documents
   - Metrics and results if available
   - Customer quotes if provided

6. EXPLORE OTHER SECTIONS
   - Section with links to other pages:
     * "View Features" button (data-segment="features")
     * "Platform Overview" button (data-segment="platform")
     * "Frequently Asked Questions" button (data-segment="faq")

7. CTA SECTION
   - "Get Started" primary button
   - "Back to Home" secondary button (data-action="back-to-landing")

8. FOOTER
   - Logo (data-action="back-to-landing")
   - Quick links with data-segment attributes
   - Copyright

CRITICAL DATA ATTRIBUTES:
- All clickable solution cards: data-solution-id="[slug]"
- Navigation to other segments: data-segment="[segment-name]"
- Back to landing page: data-action="back-to-landing"

Return ONLY the complete HTML document.`;

export interface SolutionsPageRequirements {
  documentContent?: string;
  companyName?: string;
  logoUrl?: string | null;
  brandColors?: string;
  personaEmphasis?: string;
}

export function generateSolutionsPagePrompt(requirements: SolutionsPageRequirements): string {
  let prompt = `Generate a comprehensive SOLUTIONS OVERVIEW page.\n\n`;

  if (requirements.documentContent) {
    prompt += `EXTRACT ALL USE CASES AND SOLUTIONS FROM THIS CONTENT:\n`;
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
1. Identify use cases, problems solved, and industries served
2. Each solution card must have data-solution-id="[slug]" for detail navigation
3. Focus on outcomes and value delivered
4. Include real metrics or results if available in documents
5. Include breadcrumb navigation: Home > Solutions

Generate the complete HTML now.`;

  return prompt;
}
