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
- Feather Icons ONLY: <script src="https://unpkg.com/feather-icons"></script>
- Call feather.replace() at end of body
- Google Fonts: Inter
- NO placeholder content - use ONLY real technical details from documents

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

GOOD PLATFORM ICONS: cpu, layers, server, database, code, shield, lock, refresh-cw, cloud, git-branch

NEVER USE: <img> tags, placeholders, "?", emoji, external URLs, gray boxes

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
         <li class="text-gray-900 font-medium">Platform</li>
       </ol>
     </div>
   </nav>

   - H1: text-4xl md:text-5xl font-bold text-white

3. ARCHITECTURE OVERVIEW
   - Use HTML/CSS for diagrams (divs, borders, Feather icons)
   - NO images or placeholders

4. TECHNICAL CAPABILITIES
   - Cards with consistent styling:
     * bg-white rounded-2xl shadow-lg p-6 md:p-8
     * Icon container (w-12 h-12 rounded-xl gradient)
     * Title: text-xl font-semibold
     * Description: text-gray-600
   - Each card: data-topic="[slug]" data-parent-segment="platform" class="cursor-pointer"

5. INTEGRATIONS
   - Use Feather icons (link, zap, layers)
   - NO partner logos or external images

6. SECURITY & COMPLIANCE
   - Use shield, lock, check-circle icons

7. CTA SECTION
   - Primary: data-action="cta-primary" data-cta-type="demo"
   - Secondary: data-action="back-to-landing"

8. FOOTER (consistent)
   - Logo with data-action="back-to-landing"
   - Quick links with data-segment

CRITICAL: All capability cards must have data-topic and data-parent-segment="platform" attributes.

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
