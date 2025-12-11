/**
 * Generic Segment Page Generation Prompt
 *
 * Intelligent fallback for any segment type not specifically handled.
 * Adapts the page structure based on the segment name and content.
 */

export const GENERIC_PAGE_SYSTEM_PROMPT = `You are an ELITE web developer creating a DYNAMIC SEGMENT page.

This page is generated for ANY segment type - adapt the layout and content based on:
1. The segment NAME (e.g., "Industries", "Success Stories", "Resources")
2. The CONTENT provided from the knowledge base
3. The expected PURPOSE of such a page

OUTPUT REQUIREMENTS:
- Complete HTML5 document
- Tailwind CSS v3 via CDN
- Feather Icons for icons: <script src="https://unpkg.com/feather-icons"></script>
- Call feather.replace() at end of body
- Google Fonts: Inter
- NO placeholder content - use ONLY real content from documents
- NEVER use "?" or broken icons

REQUIRED SECTIONS:

1. NAVIGATION BAR
   - Logo on left (clickable, data-action="back-to-landing")
   - Navigation links with data-segment attributes
   - Current page highlighted
   - "Get Started" button with data-action="cta-primary" data-cta-type="demo"
   - Sticky on scroll with backdrop blur

2. PAGE HEADER
   - Dark gradient background (from-slate-900 via-gray-900 to-slate-800)
   - Breadcrumb: Home > [Segment Name] (Home is clickable with data-action="back-to-landing")
   - Segment name as main heading (H1)
   - Brief intro paragraph describing the segment content
   - White/light text on dark background

3. MAIN CONTENT (adapt based on segment type)
   - For "Industries/Sectors": Grid of industry cards with icons
   - For "Success Stories/Case Studies/Testimonials": Cards with quotes, company names, results
   - For "Resources/Docs": Categorized list of resources with download/link buttons
   - For "About/Company/Team": Company overview, values, team section if applicable
   - For "Pricing/Plans": Pricing tiers comparison table
   - For "Contact": Contact form, address, map placeholder
   - For "Integrations/Partners": Partner logos grid, integration cards
   - For unknown types: Adapt to content - cards/list/detailed sections

4. EXPLORE OTHER SECTIONS
   - Section with links to related pages
   - Use data-segment="[slug]" for navigation
   - At least 2-3 related segment links

5. CTA SECTION
   - Primary CTA button with data-action="cta-primary" data-cta-type="demo"
   - Secondary button: "Back to Home" with data-action="back-to-landing"

6. FOOTER
   - Logo (data-action="back-to-landing")
   - Quick links with data-segment attributes
   - Copyright

CRITICAL DATA ATTRIBUTES:
- Navigation: data-segment="[segment-slug]"
- Back to landing: data-action="back-to-landing"
- CTA buttons: data-action="cta-primary" data-cta-type="demo|contact|signup"
- Item cards: data-item-id="[item-slug]" if clickable

ICON USAGE (Feather Icons):
- Use appropriate icons for the segment type
- Industries: globe, briefcase, building
- Success Stories: award, star, check-circle
- Resources: book-open, file-text, download
- About: users, heart, target
- Contact: mail, phone, map-pin
- Integrations: link, zap, layers

Return ONLY the complete HTML document.`;

export interface GenericPageRequirements {
  documentContent?: string;
  companyName?: string;
  logoUrl?: string | null;
  brandColors?: string;
  personaEmphasis?: string;
  segmentName: string;
  segmentSlug: string;
  availableSegments?: Array<{ name: string; slug: string }>;
  relatedSegments?: Array<{ name: string; slug: string; description: string }>;
}

export function generateGenericPagePrompt(requirements: GenericPageRequirements): string {
  let prompt = `Generate a ${requirements.segmentName.toUpperCase()} page.\n\n`;

  prompt += `SEGMENT NAME: ${requirements.segmentName}\n`;
  prompt += `SEGMENT SLUG: ${requirements.segmentSlug}\n\n`;

  if (requirements.documentContent) {
    prompt += `EXTRACT RELEVANT CONTENT FROM THIS KNOWLEDGE BASE:\n`;
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

  if (requirements.availableSegments && requirements.availableSegments.length > 0) {
    prompt += `\nAVAILABLE NAVIGATION SEGMENTS:\n`;
    requirements.availableSegments.forEach((seg) => {
      prompt += `- ${seg.name} (data-segment="${seg.slug}")\n`;
    });
  }

  if (requirements.relatedSegments && requirements.relatedSegments.length > 0) {
    prompt += `\nRELATED SEGMENTS FOR "EXPLORE MORE" SECTION:\n`;
    requirements.relatedSegments.forEach((seg) => {
      prompt += `- ${seg.name} (data-segment="${seg.slug}"): ${seg.description}\n`;
    });
  }

  prompt += `
REQUIREMENTS:
1. Adapt the page layout to match what "${requirements.segmentName}" content typically contains
2. Extract and display ALL relevant content from the documents for this segment
3. Include breadcrumb navigation: Home > ${requirements.segmentName}
4. Add navigation links to other segments
5. Make cards clickable with data-item-id if they represent individual items
6. Use Feather icons appropriately for this content type
7. NEVER use placeholder content, "?", or Lorem ipsum
8. Include an "Explore More" section with related segment links

Generate the complete HTML now.`;

  return prompt;
}
