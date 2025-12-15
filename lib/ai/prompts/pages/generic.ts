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
- Feather Icons ONLY: <script src="https://unpkg.com/feather-icons"></script>
- Call feather.replace() at end of body
- Google Fonts: Inter
- NO placeholder content - use ONLY real content from documents

================================================================================
ICON RULES (STRICTLY ENFORCED - NO EXCEPTIONS)
================================================================================

USE FEATHER ICONS ONLY:
- CDN: <script src="https://unpkg.com/feather-icons"></script>
- Syntax: <i data-feather="icon-name" class="w-6 h-6"></i>
- ALWAYS call feather.replace() before </body>

ICON SIZES:
- Inline with text: w-5 h-5 (20px)
- Card icons: w-6 h-6 (24px)
- Hero icons: w-8 h-8 to w-12 h-12

ICON CONTAINERS (for visual emphasis):
<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
  <i data-feather="icon-name" class="w-6 h-6 text-white"></i>
</div>

NEVER USE:
- <img> tags for icons or visual elements (except company logo)
- Image placeholders or placeholder URLs
- "?" or broken icon symbols
- Emoji as icons
- Unicode symbols
- External image URLs
- SVG paths pasted inline (use Feather instead)
- Gray boxes or rectangles as placeholders

GOOD ICONS BY CONTEXT:
- Features: zap, star, shield, check-circle, award, cpu
- Industries: globe, briefcase, building, truck, heart, shopping-cart
- Success Stories: award, star, check-circle, trending-up
- Resources: book-open, file-text, download, folder
- About: users, heart, target, compass
- Contact: mail, phone, map-pin
- Integrations: link, zap, layers, refresh-cw
- Analytics: bar-chart-2, trending-up, pie-chart
- Security: shield, lock, key

================================================================================
RESPONSIVE DESIGN (CRITICAL - MOBILE-FIRST)
================================================================================

ALL SECTIONS MUST BE FULLY RESPONSIVE:
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Write mobile styles first, add sm:/md:/lg: for larger screens
- Typography: text-2xl sm:text-3xl md:text-4xl lg:text-5xl for headings
- Grids: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Buttons: w-full sm:w-auto, stack vertically on mobile (flex-col sm:flex-row)
- Touch targets: minimum 44px height on mobile (py-4)
- Section padding: py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8

================================================================================
REQUIRED SECTIONS:
================================================================================

1. NAVIGATION BAR (RESPONSIVE)
   - Fixed position: fixed top-0 left-0 right-0 z-50
   - Background: bg-white/95 backdrop-blur-md shadow-sm
   - Height: h-16 (64px)

   DESKTOP NAV (hidden on mobile):
   - Container: class="hidden md:flex items-center gap-6"
   - Logo on LEFT (clickable, data-action="back-to-landing")
   - Navigation links with data-segment attributes
   - "Get Started" CTA button on RIGHT

   MOBILE HAMBURGER MENU (REQUIRED):
   - Hamburger button: <button id="mobile-menu-btn" class="md:hidden p-2" aria-label="Menu"><i data-feather="menu" class="w-6 h-6"></i></button>
   - Mobile menu overlay:
     <div id="mobile-menu" class="fixed inset-0 bg-white z-50 transform translate-x-full transition-transform duration-300 md:hidden">
       <div class="flex justify-between items-center p-4 border-b">
         <span class="font-bold text-lg">Menu</span>
         <button id="mobile-menu-close" class="p-2"><i data-feather="x" class="w-6 h-6"></i></button>
       </div>
       <nav class="p-6 space-y-6">
         <!-- Nav links with py-3 for touch targets -->
       </nav>
     </div>

2. PAGE HEADER WITH BREADCRUMB (RESPONSIVE)
   - Dark gradient background (from-slate-900 via-gray-900 to-slate-800)
   - RESPONSIVE PADDING: py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8

   RESPONSIVE BREADCRUMB HTML:
   <nav class="bg-gray-50 border-b">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
       <ol class="flex items-center space-x-2 text-xs sm:text-sm">
         <li>
           <a href="#" data-action="back-to-landing" class="text-gray-500 hover:text-indigo-600 transition-colors">Home</a>
         </li>
         <li><i data-feather="chevron-right" class="w-4 h-4 text-gray-400"></i></li>
         <li class="text-gray-900 font-medium truncate max-w-[150px] sm:max-w-none">[Segment Name]</li>
       </ol>
     </div>
   </nav>

   - RESPONSIVE H1: class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white"
   - RESPONSIVE intro: class="text-base sm:text-lg lg:text-xl text-gray-300 mt-3 sm:mt-4"

3. MAIN CONTENT (RESPONSIVE - adapt based on segment type)
   - RESPONSIVE GRID: class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
   - RESPONSIVE CARDS: class="p-5 sm:p-6 lg:p-8 rounded-xl"
   - For "Industries/Sectors": Grid of industry cards with Feather icons
   - For "Success Stories/Case Studies": Cards with quotes, company names, results
   - For "Resources/Docs": Categorized list with download/link buttons
   - For "About/Company": Company overview, values section (use Feather icons)
   - For "Pricing/Plans": Pricing tiers table (use Feather icons for checkmarks)
   - For "Contact": Contact info with icons (mail, phone, map-pin)
   - For "Integrations/Partners": Integration cards with Feather icons
   - For unknown types: Adapt to content with appropriate Feather icons

   CARD STYLING (must be consistent across all pages):
   - Background: bg-white
   - Shadow: shadow-lg hover:shadow-xl
   - Border radius: rounded-2xl
   - Padding: p-6 md:p-8
   - Icon container at top: w-12 h-12 rounded-xl with gradient background
   - Title: text-xl font-semibold text-gray-900
   - Description: text-gray-600
   - Hover: transform hover:-translate-y-1 transition-all

4. EXPLORE OTHER SECTIONS
   - Section with links to related pages
   - Use data-segment="[slug]" for navigation
   - At least 2-3 related segment links with Feather icons

5. CTA SECTION
   - Primary: data-action="cta-primary" data-cta-type="demo"
   - Secondary: data-action="back-to-landing"

6. FOOTER (consistent with other pages)
   - Logo with data-action="back-to-landing"
   - Quick links with data-segment attributes
   - Copyright

================================================================================
CRITICAL DATA ATTRIBUTES (MANDATORY)
================================================================================

- Navigation: data-segment="[segment-slug]"
- Back to landing: data-action="back-to-landing"
- CTA buttons: data-action="cta-primary" data-cta-type="demo|contact|signup"
- Topic/Item cards: data-topic="[item-slug]" data-parent-segment="[current-segment-slug]" class="cursor-pointer"

NEVER USE PLAIN HREF LINKS:
- WRONG: <a href="#">Link</a>
- WRONG: <a href="javascript:void(0)">Link</a>
- RIGHT: <a href="#" data-segment="slug">Link</a>
- RIGHT: <div data-topic="slug" data-parent-segment="current" class="cursor-pointer">Item</div>

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

--- CRITICAL NAVIGATION REQUIREMENTS ---
MANDATORY: ALL clickable elements MUST have proper data attributes. NEVER use plain href="#" links.

CORRECT PATTERNS:
1. Segment links: <a href="#" data-segment="segment-slug">Segment Name</a>
2. Topic cards: <div data-topic="item-slug" data-parent-segment="${requirements.segmentSlug}" class="cursor-pointer">Item</div>
3. Home/Logo: <a href="#" data-action="back-to-landing">Home</a>
4. CTA: <button data-action="cta-primary" data-cta-type="demo">Get Demo</button>

REQUIREMENTS:
1. Adapt the page layout to match what "${requirements.segmentName}" content typically contains
2. Extract and display ALL relevant content from the documents for this segment
3. Include breadcrumb navigation: Home > ${requirements.segmentName} (Home clickable with data-action="back-to-landing")
4. Add navigation links to other segments with data-segment attributes
5. Make cards clickable with data-topic and data-parent-segment="${requirements.segmentSlug}" attributes
6. Use Feather icons appropriately for this content type
7. NEVER use placeholder content, "?", or Lorem ipsum
8. Include an "Explore More" section with related segment links
9. If no topics to link to, include CTA: <button data-action="cta-primary" data-cta-type="contact">Contact Us</button>

Generate the complete HTML now.`;

  return prompt;
}
