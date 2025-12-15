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
- Feather Icons ONLY: <script src="https://unpkg.com/feather-icons"></script>
- Call feather.replace() at end of body
- Google Fonts: Inter
- NO placeholder content - use ONLY real features from documents

================================================================================
ICON RULES (STRICTLY ENFORCED - NO EXCEPTIONS)
================================================================================

USE FEATHER ICONS ONLY:
- CDN: <script src="https://unpkg.com/feather-icons"></script>
- Syntax: <i data-feather="icon-name" class="w-6 h-6"></i>
- ALWAYS call feather.replace() before </body>

ICON CONTAINERS (for feature cards):
<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
  <i data-feather="icon-name" class="w-6 h-6 text-white"></i>
</div>

GOOD FEATURE ICONS: zap, cpu, shield, target, layers, refresh-cw, bar-chart-2, lock, users, globe, code, database

NEVER USE:
- <img> tags for icons
- Image placeholders
- "?" or broken icons
- Emoji as icons
- External image URLs
- SVG paths inline

================================================================================
REQUIRED SECTIONS
================================================================================

1. NAVIGATION BAR
   - Fixed position: fixed top-0 left-0 right-0 z-50
   - Background: bg-white/95 backdrop-blur-md shadow-sm
   - Height: h-16 (64px)
   - Structure (LEFT TO RIGHT):
     * Logo on LEFT (clickable, data-action="back-to-landing")
     * Navigation links in CENTER-LEFT: Home, Solutions, Platform, FAQ with data-segment attributes
     * "Get Started" CTA on RIGHT with data-action="cta-primary" data-cta-type="demo"
   - Navigation LEFT-ALIGNED, not centered

2. PAGE HEADER WITH BREADCRUMB
   - Dark gradient background (from-slate-900 via-gray-900 to-slate-800)
   - Padding: py-16 md:py-24

   EXACT BREADCRUMB HTML (copy this pattern):
   <nav class="bg-gray-50 border-b">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
       <ol class="flex items-center space-x-2 text-sm">
         <li>
           <a href="#" data-action="back-to-landing" class="text-gray-500 hover:text-indigo-600 transition-colors">Home</a>
         </li>
         <li><i data-feather="chevron-right" class="w-4 h-4 text-gray-400"></i></li>
         <li class="text-gray-900 font-medium">Features</li>
       </ol>
     </div>
   </nav>

   - "Features" as main heading (H1): text-4xl md:text-5xl font-bold text-white
   - Brief intro paragraph: text-xl text-gray-300

3. FEATURE GRID
   - 6-12 feature cards in responsive grid
   - Each card MUST have:
     * data-topic="[feature-slug]" data-parent-segment="features"
     * class="cursor-pointer"
     * hover:shadow-xl hover:-translate-y-1 transition-all
   - Card styling (CONSISTENT):
     * bg-white rounded-2xl shadow-lg p-6 md:p-8
     * Icon container at top (w-12 h-12 rounded-xl with gradient)
     * Title: text-xl font-semibold text-gray-900
     * Description: text-gray-600
   - Grid: 1 col mobile, 2 cols tablet, 3 cols desktop

4. FEATURE HIGHLIGHTS
   - 2-3 key features with more detail
   - Each has data-topic and data-parent-segment attributes
   - Use Feather icons for bullet points (check-circle)

5. EXPLORE OTHER SECTIONS
   - Links to other segments with data-segment attributes
   - Use Feather icons (arrow-right)

6. CTA SECTION
   - Primary: data-action="cta-primary" data-cta-type="demo"
   - Secondary: data-action="back-to-landing"

7. FOOTER (consistent with other pages)
   - Logo with data-action="back-to-landing"
   - Quick links with data-segment attributes
   - Copyright

================================================================================
CRITICAL DATA ATTRIBUTES
================================================================================

- Feature cards: data-topic="[feature-slug]" data-parent-segment="features" class="cursor-pointer"
- Navigation: data-segment="[segment-slug]"
- Home/Logo: data-action="back-to-landing"
- CTA: data-action="cta-primary" data-cta-type="demo|contact|signup"

NEVER USE PLAIN HREF LINKS - always use data attributes.

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
