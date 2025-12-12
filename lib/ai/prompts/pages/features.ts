/**
 * Features Segment Page Generation Prompt
 *
 * Generates a comprehensive Features Overview page with:
 * - Page header with breadcrumb navigation
 * - Grid of all features (6-12 cards)
 * - Feature highlights section
 * - CTA to try features
 * - Navigation to other segments
 */

export const FEATURES_PAGE_SYSTEM_PROMPT = `You are an ELITE web developer creating a FEATURES OVERVIEW page.

This page is generated dynamically when a visitor clicks "Features".
It should comprehensively showcase all features extracted from the business documents.

OUTPUT REQUIREMENTS:
- Complete HTML5 document
- Tailwind CSS v3 via CDN
- Google Fonts: Roboto
- Vanilla JavaScript only
- NO placeholder content - use ONLY real features from documents

REQUIRED SECTIONS:

1. NAVIGATION BAR
   - Logo on left (clickable, data-action="back-to-landing")
   - Navigation links: Home (data-action="back-to-landing"), Solutions (data-segment="solutions"), Platform (data-segment="platform"), FAQ (data-segment="faq")
   - Current page "Features" highlighted
   - "Get Started" button on right
   - Sticky on scroll

2. PAGE HEADER
   - Dark gradient background
   - Breadcrumb: Home > Features (Home is clickable with data-action="back-to-landing")
   - "Features" as main heading (H1)
   - Brief intro paragraph about what makes these features special
   - White/light text on dark background

3. FEATURE GRID
   - 6-12 feature cards in responsive grid
   - Each card MUST have these attributes:
     * data-topic="[feature-slug]" data-parent-segment="features" (e.g., data-topic="ai-analytics")
     * class="cursor-pointer" for pointer cursor
     * hover:shadow-lg hover:scale-105 transition for interactivity
   - Card content:
     * Icon (SVG)
     * Feature title (bold)
     * Description (100 words max)
     * "Learn More →" text
   - Grid: 1 col mobile, 2 cols tablet, 3 cols desktop

4. FEATURE HIGHLIGHTS
   - 2-3 key features expanded with more detail
   - Each highlight card also has data-topic and data-parent-segment attributes
   - Alternating layout
   - Bullet points for benefits

5. EXPLORE OTHER SECTIONS
   - Section with links to other pages:
     * "View Solutions" button (data-segment="solutions")
     * "Platform Overview" button (data-segment="platform")
     * "Frequently Asked Questions" button (data-segment="faq")

6. CTA SECTION
   - "Get Started" primary button
   - "Back to Home" secondary button (data-action="back-to-landing")

7. FOOTER
   - Logo (data-action="back-to-landing")
   - Quick links with data-segment attributes
   - Copyright

CRITICAL DATA ATTRIBUTES (MANDATORY FOR ALL CLICKABLE ELEMENTS):
- Feature cards: data-topic="[feature-slug]" data-parent-segment="features"
- Navigation to other segments: data-segment="[segment-slug]"
- Back to landing page: data-action="back-to-landing"
- CTA buttons: data-action="cta-primary" data-cta-type="demo|contact|signup"

NEVER USE PLAIN HREF LINKS:
- WRONG: <a href="#">Link</a>
- WRONG: <a href="javascript:void(0)">Link</a>
- RIGHT: <a href="#" data-segment="solutions">View Solutions</a>
- RIGHT: <div data-topic="ai-analytics" data-parent-segment="features" class="cursor-pointer">Feature Card</div>

Return ONLY the complete HTML document.`;

export interface FeaturesPageRequirements {
  documentContent?: string;
  companyName?: string;
  logoUrl?: string | null;
  brandColors?: string;
  personaEmphasis?: string;
}

export function generateFeaturesPagePrompt(requirements: FeaturesPageRequirements): string {
  let prompt = `Generate a comprehensive FEATURES OVERVIEW page.\n\n`;

  if (requirements.documentContent) {
    prompt += `EXTRACT ALL FEATURES FROM THIS CONTENT:\n`;
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

  prompt += `\n
--- CRITICAL NAVIGATION REQUIREMENTS ---
MANDATORY: ALL clickable elements MUST have proper data attributes. NEVER use plain href="#" links.

CORRECT PATTERNS:
- Feature cards: data-topic="feature-slug" data-parent-segment="features" class="cursor-pointer"
- Segment links: data-segment="solutions"
- Home/Logo: data-action="back-to-landing"
- CTA buttons: data-action="cta-primary" data-cta-type="demo"

REQUIREMENTS:
1. Extract and display ALL features from the documents
2. Each feature card MUST have data-topic="[slug]" data-parent-segment="features" for detail navigation
3. Include breadcrumb navigation: Home > Features (Home clickable with data-action="back-to-landing")
4. Add navigation links to other segments (Solutions, Platform, FAQ) with data-segment attributes
5. Use consistent styling with dark header, light content sections

Generate the complete HTML now.`;

  return prompt;
}
