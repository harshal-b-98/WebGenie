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
- Feather Icons ONLY: <script src="https://unpkg.com/feather-icons"></script>
- Call feather.replace() at end of body
- Google Fonts: Inter
- NO placeholder content - use ONLY real solutions from documents

================================================================================
ICON RULES (STRICTLY ENFORCED - NO EXCEPTIONS)
================================================================================

USE FEATHER ICONS ONLY:
- Syntax: <i data-feather="icon-name" class="w-6 h-6"></i>
- Call feather.replace() before </body>

ICON CONTAINERS:
<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
  <i data-feather="icon-name" class="w-6 h-6 text-white"></i>
</div>

GOOD SOLUTION ICONS: target, briefcase, users, trending-up, shield, globe, layers, zap

NEVER USE: <img> tags, placeholders, "?", emoji, external URLs

================================================================================
REQUIRED SECTIONS
================================================================================

1. NAVIGATION BAR
   - Fixed: fixed top-0 left-0 right-0 z-50
   - Background: bg-white/95 backdrop-blur-md shadow-sm
   - Height: h-16
   - Structure: Logo LEFT, nav links CENTER-LEFT, CTA RIGHT
   - Navigation LEFT-ALIGNED

2. PAGE HEADER WITH BREADCRUMB
   - Dark gradient: from-slate-900 via-gray-900 to-slate-800
   - Padding: py-16 md:py-24

   EXACT BREADCRUMB HTML (copy this pattern):
   <nav class="bg-gray-50 border-b">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
       <ol class="flex items-center space-x-2 text-sm">
         <li>
           <a href="#" data-action="back-to-landing" class="text-gray-500 hover:text-indigo-600 transition-colors">Home</a>
         </li>
         <li><i data-feather="chevron-right" class="w-4 h-4 text-gray-400"></i></li>
         <li class="text-gray-900 font-medium">Solutions</li>
       </ol>
     </div>
   </nav>

   - H1: text-4xl md:text-5xl font-bold text-white

3. SOLUTIONS BY USE CASE
   - Cards with consistent styling:
     * bg-white rounded-2xl shadow-lg p-6 md:p-8
     * Icon container (w-12 h-12 rounded-xl gradient)
     * Title: text-xl font-semibold
     * Description: text-gray-600
   - Each card: data-topic="[slug]" data-parent-segment="solutions" class="cursor-pointer"
   - Hover: hover:shadow-xl hover:-translate-y-1

4. SOLUTIONS BY INDUSTRY (if applicable)
   - Same card styling as above
   - Use Feather icons per industry

5. CASE STUDIES
   - Quotes, metrics, results from documents
   - Use check-circle icons for bullet points

6. EXPLORE OTHER SECTIONS
   - Links with data-segment attributes

7. CTA SECTION
   - Primary: data-action="cta-primary" data-cta-type="demo"
   - Secondary: data-action="back-to-landing"

8. FOOTER (consistent)
   - Logo with data-action="back-to-landing"
   - Quick links with data-segment

CRITICAL: All solution cards must have data-topic and data-parent-segment="solutions" attributes.

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
