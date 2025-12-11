/**
 * FAQ Segment Page Generation Prompt
 *
 * Generates an FAQ page with:
 * - Accordion-style Q&A
 * - Categorized questions
 * - Search functionality (optional)
 * - Contact CTA for unanswered questions
 */

export const FAQ_PAGE_SYSTEM_PROMPT = `You are an ELITE web developer creating an FAQ page.

This page is generated when a visitor clicks "FAQ" from the segment explorer.
It should answer common questions extracted from the business documents.

OUTPUT REQUIREMENTS:
- Complete HTML5 document
- Tailwind CSS v3 via CDN
- Google Fonts: Roboto
- Vanilla JavaScript for accordion functionality
- NO placeholder content - use ONLY real Q&A from documents

REQUIRED SECTIONS:

1. NAVIGATION BAR
   - Logo on left (clickable, data-action="back-to-landing")
   - Navigation links: Home (data-action="back-to-landing"), Features (data-segment="features"), Solutions (data-segment="solutions"), Platform (data-segment="platform")
   - Current page "FAQ" highlighted
   - "Get Started" button on right
   - Sticky on scroll

2. PAGE HEADER
   - Dark gradient background
   - Breadcrumb: Home > FAQ (Home is clickable with data-action="back-to-landing")
   - "Frequently Asked Questions" as main heading (H1)
   - Subheading: "Find answers to common questions"
   - White/light text

3. FAQ CATEGORIES (if enough questions)
   - Group by topic: General, Pricing, Technical, Getting Started, etc.
   - Category tabs or anchor links

4. FAQ ACCORDION
   - Questions as clickable headers
   - Answers expand/collapse on click
   - Smooth animation transitions
   - Plus/minus or chevron icons
   - Multiple can be open simultaneously

5. EXPLORE OTHER SECTIONS
   - Section with links to other pages:
     * "View Features" button (data-segment="features")
     * "View Solutions" button (data-segment="solutions")
     * "Platform Overview" button (data-segment="platform")

6. STILL HAVE QUESTIONS?
   - CTA section at bottom
   - "Contact Us" button
   - "Back to Home" button (data-action="back-to-landing")

7. FOOTER
   - Logo (data-action="back-to-landing")
   - Quick links with data-segment attributes
   - Copyright

CRITICAL DATA ATTRIBUTES:
- Navigation to other segments: data-segment="[segment-name]"
- Back to landing page: data-action="back-to-landing"

JAVASCRIPT REQUIREMENTS:
Include this accordion functionality:
- Click question to toggle answer visibility
- Smooth height animation
- Icon rotation on open/close
- Accessible: keyboard navigable, ARIA attributes

IMPORTANT:
- Extract REAL questions and answers from documents
- If no explicit Q&A exists, generate common questions based on content
- Keep answers concise but complete
- Include "Learn More" links where relevant

Return ONLY the complete HTML document.`;

export interface FAQPageRequirements {
  documentContent?: string;
  companyName?: string;
  logoUrl?: string | null;
  brandColors?: string;
  personaEmphasis?: string;
}

export function generateFAQPagePrompt(requirements: FAQPageRequirements): string {
  let prompt = `Generate a comprehensive FAQ page with accordion functionality.\n\n`;

  if (requirements.documentContent) {
    prompt += `EXTRACT Q&A FROM THIS CONTENT (or generate common questions based on it):\n`;
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
1. Extract explicit Q&A from documents OR generate common questions
2. Implement working accordion with smooth animations
3. Group questions by category if there are many
4. Include "Contact Us" CTA for unanswered questions
5. Include breadcrumb navigation: Home > FAQ
6. Make accordion keyboard accessible with ARIA attributes

Generate the complete HTML now with working JavaScript accordion.`;

  return prompt;
}
