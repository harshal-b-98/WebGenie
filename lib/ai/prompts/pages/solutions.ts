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
RESPONSIVE DESIGN (CRITICAL - MOBILE-FIRST)
================================================================================

ALL SECTIONS MUST BE FULLY RESPONSIVE:
- Typography: text-2xl sm:text-3xl md:text-4xl lg:text-5xl for headings
- Grids: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Buttons: w-full sm:w-auto, flex-col sm:flex-row
- Touch targets: minimum py-4 on mobile
- Section padding: py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8

================================================================================
REQUIRED SECTIONS
================================================================================

1. NAVIGATION BAR - ADAPTIVE (NO OVERLAP):

   <header class="fixed top-0 w-full bg-white/95 backdrop-blur-md z-50 shadow-sm border-b">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       <div class="flex items-center justify-between h-16 gap-4">
         <a href="#" data-action="back-to-landing" class="flex-shrink-0 max-w-[180px] sm:max-w-[200px]">[LOGO]</a>
         <nav class="hidden md:flex items-center gap-4 lg:gap-6 flex-1 justify-center">[LINKS]</nav>
         <div class="flex items-center gap-3 flex-shrink-0">[CTA+MENU]</div>
       </div>
     </div>
   </header>

   MOBILE MENU:
   <div id="mobile-menu" class="fixed inset-0 bg-white z-50 transform translate-x-full transition-transform duration-300 md:hidden">
     <div class="flex justify-between items-center p-4 border-b">
       <span class="font-bold text-lg">Menu</span>
       <button id="mobile-menu-close" class="p-2"><i data-feather="x" class="w-6 h-6"></i></button>
     </div>
     <nav class="p-6 space-y-6"><!-- Nav links with py-3 --></nav>
   </div>

2. PAGE HEADER WITH BREADCRUMB (RESPONSIVE)
   - Dark gradient: from-slate-900 via-gray-900 to-slate-800
   - RESPONSIVE PADDING: py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8

   RESPONSIVE BREADCRUMB HTML:
   <nav class="bg-gray-50 border-b">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
       <ol class="flex items-center space-x-2 text-xs sm:text-sm">
         <li>
           <a href="#" data-action="back-to-landing" class="text-gray-500 hover:text-indigo-600 transition-colors">Home</a>
         </li>
         <li><i data-feather="chevron-right" class="w-4 h-4 text-gray-400"></i></li>
         <li class="text-gray-900 font-medium">Solutions</li>
       </ol>
     </div>
   </nav>

   - RESPONSIVE H1: class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white"

3. SOLUTIONS BY USE CASE (RESPONSIVE)
   - RESPONSIVE GRID: class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
   - RESPONSIVE CARDS: class="bg-white rounded-xl sm:rounded-2xl shadow-lg p-5 sm:p-6 lg:p-8"
   - RESPONSIVE Icon: class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl"
   - Title: class="text-lg sm:text-xl font-semibold"
   - Description: class="text-gray-600 text-sm sm:text-base"
   - Each card: data-topic="[slug]" data-parent-segment="solutions" class="cursor-pointer"
   - Hover: hover:shadow-xl hover:-translate-y-1

4. SOLUTIONS BY INDUSTRY (RESPONSIVE - if applicable)
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

  // Logo handling - graceful fallback to text logo
  if (requirements.logoUrl) {
    prompt += `LOGO: Use image - <img src="${requirements.logoUrl}" alt="${requirements.companyName || "Logo"}" class="h-8 md:h-10 w-auto">\n`;
  } else {
    prompt += `LOGO (NO IMAGE - USE TEXT LOGO):\n`;
    prompt += `- No logo image provided. Use "${requirements.companyName || "Company"}" as a stylish TEXT-BASED LOGO.\n`;
    prompt += `- Example: <span class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">${requirements.companyName || "Company"}</span>\n`;
    prompt += `- NEVER use placeholder images or "[LOGO]" text.\n`;
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
