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

1. NAVIGATION BAR (RESPONSIVE)
   - Fixed position: fixed top-0 left-0 right-0 z-50
   - Background: bg-white/95 backdrop-blur-md shadow-sm
   - Height: h-16

   DESKTOP NAV: class="hidden md:flex items-center gap-6"
   MOBILE HAMBURGER: <button id="mobile-menu-btn" class="md:hidden p-2"><i data-feather="menu" class="w-6 h-6"></i></button>
   MOBILE MENU:
   <div id="mobile-menu" class="fixed inset-0 bg-white z-50 transform translate-x-full transition-transform duration-300 md:hidden">
     <div class="flex justify-between items-center p-4 border-b">
       <span class="font-bold text-lg">Menu</span>
       <button id="mobile-menu-close" class="p-2"><i data-feather="x" class="w-6 h-6"></i></button>
     </div>
     <nav class="p-6 space-y-6"><!-- Nav links with py-3 --></nav>
   </div>

2. PAGE HEADER WITH BREADCRUMB (RESPONSIVE - VISUALLY IMPRESSIVE)
   - Dark gradient: from-slate-900 via-gray-900 to-slate-800
   - RESPONSIVE PADDING: py-16 sm:py-20 lg:py-28 px-4 sm:px-6 lg:px-8
   - MUST include visual enhancements like landing page

   RESPONSIVE BREADCRUMB HTML:
   <nav class="bg-gray-50 border-b">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
       <ol class="flex items-center space-x-2 text-xs sm:text-sm">
         <li>
           <a href="#" data-action="back-to-landing" class="text-gray-500 hover:text-indigo-600 transition-colors">Home</a>
         </li>
         <li><i data-feather="chevron-right" class="w-4 h-4 text-gray-400"></i></li>
         <li class="text-gray-900 font-medium">Features</li>
       </ol>
     </div>
   </nav>

   HERO SECTION STRUCTURE (MANDATORY - MUST MATCH LANDING PAGE QUALITY):
   <section class="relative bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 py-16 sm:py-20 lg:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
     <!-- Decorative gradient orbs (REQUIRED for visual richness) -->
     <div class="absolute top-20 right-10 sm:right-20 w-48 sm:w-64 h-48 sm:h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
     <div class="absolute bottom-10 left-10 sm:left-20 w-32 sm:w-48 h-32 sm:h-48 bg-purple-500/20 rounded-full blur-3xl"></div>

     <div class="max-w-4xl mx-auto text-center relative z-10">
       <!-- Badge/pill at top (REQUIRED) -->
       <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm text-gray-300 mb-6">
         <i data-feather="zap" class="w-4 h-4"></i>
         <span>Powerful Capabilities</span>
       </div>

       <!-- Main heading -->
       <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
         Features That Power Your Success
       </h1>

       <!-- Intro paragraph -->
       <p class="text-base sm:text-lg lg:text-xl text-gray-300 mt-4 sm:mt-6 max-w-2xl mx-auto">
         Discover the comprehensive suite of features designed to transform your workflow and drive results.
       </p>

       <!-- Feature highlights row (REQUIRED - 3 key benefits) -->
       <div class="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 sm:gap-8 max-w-3xl mx-auto">
         <span class="flex items-center gap-2 text-gray-300 text-sm sm:text-base">
           <i data-feather="check-circle" class="w-5 h-5 text-indigo-400"></i>
           <span>Enterprise-grade security</span>
         </span>
         <span class="flex items-center gap-2 text-gray-300 text-sm sm:text-base">
           <i data-feather="check-circle" class="w-5 h-5 text-indigo-400"></i>
           <span>Seamless integrations</span>
         </span>
         <span class="flex items-center gap-2 text-gray-300 text-sm sm:text-base">
           <i data-feather="check-circle" class="w-5 h-5 text-indigo-400"></i>
           <span>24/7 support</span>
         </span>
       </div>
     </div>
   </section>

   SELF-CHECK: □ Gradient orbs present □ Badge present □ 3+ feature highlights

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

6. CTA SECTION (RESPONSIVE)
   - Gradient background: bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700
   - Full width with py-16 sm:py-20 px-4 sm:px-6 lg:px-8
   - Single primary button: data-action="cta-primary" data-cta-type="demo"
   - NO chat button (chat widget injected separately as floating bubble)

7. FOOTER (EXACT STRUCTURE - Match landing page)
   ⚠️  CRITICAL: Use bg-gray-900 (NOT gray-800)
   ⚠️  CRITICAL: DO NOT include Quick Links with segment navigation
   ⚠️  CRITICAL: Use responsive grid: grid-cols-1 sm:grid-cols-2

   STRUCTURE:
   - Column 1: Logo (data-action="back-to-landing") + tagline + copyright
   - Column 2: Quick Actions (Request Demo, Chat, Back to Home)
   - Footer bottom: Privacy Policy | Terms | Support links
   - End with: <script>if (typeof feather !== 'undefined') { feather.replace(); }</script>

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
